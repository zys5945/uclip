import { join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, writeFile } from "@tauri-apps/plugin-fs";

import { EditData, editDataStore } from "../components/edit-data";

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
async function convertBinaryToImageData(
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

export async function selectFile() {
  const paths = await open({
    directory: false,
    multiple: true,
    filters: [
      {
        name: "Images",
        extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff"],
      },
    ],
  });

  if (!paths) {
    return;
  }

  for (const path of paths) {
    await readFileIntoStore(path);
  }
}

export async function saveCurrentImage() {
  const currentEditData = editDataStore.getSnapshot().context.currentEditData;
  if (!currentEditData) {
    return;
  }

  // Create a canvas to render the current image
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = currentEditData.cropBox.width;
  canvas.height = currentEditData.cropBox.height;

  // Create a temporary canvas for the full image
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  tempCanvas.width = currentEditData.originalImageData.width;
  tempCanvas.height = currentEditData.originalImageData.height;

  // Draw the full image with edits
  currentEditData.drawToCanvas(tempCtx);

  // Crop to the final canvas
  currentEditData.cropToCanvas(tempCanvas, ctx);

  // Convert to blob and save
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    const path = await save({
      filters: [
        {
          name: "PNG Image",
          extensions: ["png"],
        },
        {
          name: "JPEG Image",
          extensions: ["jpg", "jpeg"],
        },
      ],
    });

    if (path) {
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(path, new Uint8Array(arrayBuffer));
    }
  }, "image/png");
}

export async function exportCurrentImage() {
  // For now, export is the same as save
  await saveCurrentImage();
}

export function clearAll() {
  editDataStore.trigger.clear();
}
