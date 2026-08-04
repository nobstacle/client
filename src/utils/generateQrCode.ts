type QrCodeExporter = {
  toDataURL?: (text: string, options?: unknown) => Promise<string> | string;
  default?: QrCodeExporter;
};

function getToDataURL(mod: unknown): (text: string) => Promise<string> | string {
  let current = mod as QrCodeExporter | undefined;

  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (typeof current.toDataURL === "function") {
      return current.toDataURL.bind(current);
    }
    current = current.default;
  }

  throw new Error("QRCode toDataURL is not available");
}

export async function generateQrCodeDataUrl(content: string): Promise<string> {
  const mod = await import("qrcode");
  const toDataURL = getToDataURL(mod);
  return await toDataURL(content);
}
