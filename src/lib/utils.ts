import { join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readFile } from "@tauri-apps/plugin-fs";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { EditData, editDataStore } from "../components/edit-data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const _canvas = document.createElement("canvas");
const _ctx = _canvas.getContext("2d", { willReadFrequently: true });
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

export async function readFileIntoStore(path: string) {
  const binary = await readFile(path);
  const imageData = await convertBinaryToImageData(path, binary);
  editDataStore.trigger.add({ data: new EditData(path, imageData) });
}

export async function selectDirectory() {
  const paths = await open({
    directory: true,
    multiple: true,
  });

  if (!paths) {
    return;
  }

  while (paths.length > 0) {
    const path = paths.shift()!;

    const entries = await readDir(path);
    for (const entry of entries) {
      if (entry.isDirectory) {
        paths.push(await join(path, entry.name));
      }
      if (entry.isFile) {
        await readFileIntoStore(await join(path, entry.name));
      }
    }
  }
}
