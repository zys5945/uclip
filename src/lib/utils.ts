import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const _canvas = document.createElement("canvas");
const _ctx = _canvas.getContext("2d");
const extensionToMimeType: { [key: string]: string } = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  tiff: "image/tiff",
};

export async function convertBinaryToImageData(
  path: string,
  binary: Uint8Array
): Promise<ImageData> {
  const extension = path.split(".").pop();
  if (
    !extension ||
    !path.endsWith("." + extension) ||
    !extensionToMimeType[extension]
  ) {
    console.error("Invalid file extension: " + extension);
  }

  const blob = new Blob([binary], {
    type: extensionToMimeType[extension!],
  });
  const bitmap = await createImageBitmap(blob);

  _canvas.width = bitmap.width;
  _canvas.height = bitmap.height;
  _ctx!.drawImage(bitmap, 0, 0);

  return _ctx!.getImageData(0, 0, bitmap.width, bitmap.height);
}
