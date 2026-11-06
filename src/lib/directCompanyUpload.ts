import { getSession } from "next-auth/react";

type DirectUploadResult = { url: string; sourceId: number; isUpdate?: boolean };

const getBackendBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
  return url.trim().replace(/\/+$/, "").replace(/\/api(\/v1)?$/i, "");
};

const apiRequest = async <T>(path: string, body: unknown): Promise<T> => {
  const session = await getSession();
  const baseUrl = getBackendBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.user.backendTokens.at
        ? { Authorization: `Bearer ${session.user.backendTokens.at}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message ?? `Upload request failed (${response.status})`);
  }
  return response.json();
};

const postFormDataWithProgress = async <T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<T> => {
  const session = await getSession();
  const baseUrl = getBackendBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const token = session?.user.backendTokens.at;

  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${baseUrl}${normalizedPath}`);
    if (token) {
      request.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Upload failed"));
    signal?.addEventListener("abort", () => {
      request.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    }, { once: true });
    request.onload = () => {
      let parsed: any = null;
      try {
        parsed = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        parsed = null;
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(parsed as T);
      } else {
        reject(new Error(parsed?.message ?? `Upload failed (${request.status})`));
      }
    };
    request.send(formData);
  });
};

const putWithProgress = (url: string, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      reject(new Error("Direct upload failed: Invalid or missing upload URL"));
      return;
    }
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Direct upload failed"));
    signal?.addEventListener("abort", () => {
      request.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    }, { once: true });
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error(`Direct upload failed (${request.status})`));
    request.send(file);
  });

export async function uploadCompanyFileDirect(
  file: File,
  metadata: { tag: string; langCode: string; defaultLangCode: string },
  onProgress?: (percent: number) => void,
): Promise<DirectUploadResult> {
  let session: { uploadId: string; uploadUrl: string } | undefined;
  try {
    session = await apiRequest<{ uploadId: string; uploadUrl: string }>(
      "/api/v1/uploads/company-file/direct-session",
      { fileName: file.name, mimeType: file.type, size: file.size, ...metadata },
    );
    if (!session?.uploadUrl || !session?.uploadId) {
      throw new Error("Direct upload failed: Server did not return a valid upload session");
    }
    await putWithProgress(session.uploadUrl, file, onProgress);
  } catch {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tag", metadata.tag);
    formData.append("langCode", metadata.langCode);
    formData.append("defaultLangCode", metadata.defaultLangCode);
    return postFormDataWithProgress<DirectUploadResult>(
      "/api/v1/uploads/company-file",
      formData,
      onProgress,
    );
  }
  return apiRequest<DirectUploadResult>("/api/v1/uploads/company-file/direct-finalize", {
    uploadId: session.uploadId,
  });
}

type SlideshowFile = { file: File; order: number; mediaType: "image" | "video"; expiresAt?: string; durationSeconds?: number };

export async function uploadSlideshowDirect(
  files: SlideshowFile[],
  metadata: { tag: string; langCode: string; defaultLangCode: string },
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  let sessions: { uploadId: string; uploadUrl: string }[] | undefined;
  try {
    sessions = await Promise.all(files.map((item) => apiRequest<{ uploadId: string; uploadUrl: string }>(
      "/api/v1/uploads/company-file/direct-session",
      { fileName: item.file.name, mimeType: item.file.type, size: item.file.size, ...metadata },
    )));
    for (const session of sessions) {
      if (!session?.uploadUrl || !session?.uploadId) {
        throw new Error("Direct upload failed: Server did not return a valid upload session");
      }
    }
    let completed = 0;
    const uploadOne = async (index: number) => {
      await putWithProgress(sessions![index].uploadUrl, files[index].file, undefined, signal);
      completed += 1;
      onProgress?.(Math.round((completed / files.length) * 100));
    };
    // Keep at most three browser→GCS transfers active to avoid saturating tablets.
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, async () => {
      while (next < files.length) {
        const index = next++;
        await uploadOne(index);
      }
    }));
  } catch (directError: any) {
    if (directError?.name === "AbortError" || signal?.aborted) {
      throw directError;
    }
    const formData = new FormData();
    files.forEach((item) => {
      formData.append("file", item.file);
    });
    formData.append("tag", metadata.tag);
    formData.append("langCode", metadata.langCode);
    formData.append("defaultLangCode", metadata.defaultLangCode);
    formData.append(
      "itemsMetadata",
      JSON.stringify(
        files.map(({ order, mediaType, expiresAt, durationSeconds }) => ({
          order,
          mediaType,
          expiresAt,
          durationSeconds,
        })),
      ),
    );
    return postFormDataWithProgress(
      "/api/v1/uploads/company-file-many",
      formData,
      onProgress,
      signal,
    );
  }
  return apiRequest("/api/v1/uploads/company-file/direct-slideshow-finalize", {
    uploadIds: sessions.map((session) => session.uploadId),
    ...metadata,
    itemsMetadata: files.map(({ order, mediaType, expiresAt, durationSeconds }) => ({ order, mediaType, expiresAt, durationSeconds })),
  });
}
