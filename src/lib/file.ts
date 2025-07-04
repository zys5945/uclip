import { join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, writeFile } from "@tauri-apps/plugin-fs";

import {
  EditData,
  editDataStore,
  getCurrentEditData,
} from "../components/edit-data";

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

  if (path.endsWith(".json")) {
    const rawData = JSON.parse(new TextDecoder().decode(binary)) as EditData;
    const editData = new EditData(rawData.filepath, rawData.originalImageData);
    for (const key of Object.keys(rawData)) {
      (editData as any)[key] = (rawData as any)[key];
    }
    editData.originalImageData = new ImageData(
      new Uint8ClampedArray(rawData.originalImageData.data),
      rawData.originalImageData.width,
      rawData.originalImageData.height
    );
    editDataStore.trigger.add({ data: editData });
  } else {
    const imageData = await convertBinaryToImageData(path, binary);
    editDataStore.trigger.add({ data: new EditData(path, imageData) });
  }
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

export async function saveEditData(editData: EditData) {
  const path = await save({
    filters: [
      {
        name: "Json",
        extensions: ["json"],
      },
    ],
    defaultPath: editData.filename + ".json",
  });

  if (!path) {
    return;
  }

  const data = JSON.stringify(editData, (key, value) => {
    if (key === "originalImageData") {
      return {
        width: value.width,
        height: value.height,
        data: Array.from(value.data),
      };
    }
    return value;
  });
  writeFile(path, new TextEncoder().encode(data));
}

export async function saveCurrentEditData() {
  const currentEditData = getCurrentEditData();
  if (!currentEditData) {
    return;
  }
  await saveEditData(currentEditData);
}

export async function exportImage(editData: EditData) {
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = editData.originalImageData.width;
  fullCanvas.height = editData.originalImageData.height;
  const tempCtx = fullCanvas.getContext("2d");
  if (!tempCtx) return;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = editData.cropBox.width;
  croppedCanvas.height = editData.cropBox.height;
  const ctx = croppedCanvas.getContext("2d");
  if (!ctx) return;

  editData.drawToCanvas(tempCtx);
  editData.cropToCanvas(fullCanvas, ctx);

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
    const suffix = path.split(".").pop();
    const mimeType = suffix ? extensionToMimeType[suffix] : "image/png";

    croppedCanvas.toBlob(async (blob) => {
      if (!blob) return;

      const arrayBuffer = await blob.arrayBuffer();
      writeFile(path, new Uint8Array(arrayBuffer));
    }, mimeType);
  }
}

export async function exportCurrentImage() {
  const currentEditData = getCurrentEditData();
  if (!currentEditData) {
    return;
  }
  await exportImage(currentEditData);
}

export function clearAll() {
  editDataStore.trigger.clear();
}
