import { getSession } from "next-auth/react";

type DirectUploadResult = { url: string; sourceId: number; isUpdate?: boolean };

const apiRequest = async <T>(path: string, body: unknown): Promise<T> => {
  const session = await getSession();
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.user.backendTokens.at
        ? { Authorization: `Bearer ${session.user.backendTokens.at}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "Upload request failed");
  return response.json();
};

const putWithProgress = (url: string, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
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
  const session = await apiRequest<{ uploadId: string; uploadUrl: string }>(
    "/api/v1/uploads/company-file/direct-session",
    { fileName: file.name, mimeType: file.type, size: file.size, ...metadata },
  );
  await putWithProgress(session.uploadUrl, file, onProgress);
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
  const sessions = await Promise.all(files.map((item) => apiRequest<{ uploadId: string; uploadUrl: string }>(
    "/api/v1/uploads/company-file/direct-session",
    { fileName: item.file.name, mimeType: item.file.type, size: item.file.size, ...metadata },
  )));
  let completed = 0;
  const uploadOne = async (index: number) => {
    await putWithProgress(sessions[index].uploadUrl, files[index].file, undefined, signal);
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
  return apiRequest("/api/v1/uploads/company-file/direct-slideshow-finalize", {
    uploadIds: sessions.map((session) => session.uploadId),
    ...metadata,
    itemsMetadata: files.map(({ order, mediaType, expiresAt, durationSeconds }) => ({ order, mediaType, expiresAt, durationSeconds })),
  });
}
