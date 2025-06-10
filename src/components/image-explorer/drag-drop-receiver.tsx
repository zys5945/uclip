import { listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";

import { cn, convertBinaryToImageData } from "@/lib/utils";
import { EditData, editDataStore } from "../edit-data";

export function DragDropReceiver() {
  const [dragActive, setDragActive] = useState(false);

  // listen for drag events
  useEffect(() => {
    const unlistenDrag = listen("tauri://drag-drop", (event: any) => {
      setDragActive(false);

      const paths: string[] = event.payload.paths;

      for (const path of paths) {
        readFile(path).then(async (binary: Uint8Array) => {
          const imageData = await convertBinaryToImageData(path, binary);
          editDataStore.trigger.add({ data: new EditData(path, imageData) });
        });
      }
    });

    const unlistenDragEnter = listen("tauri://drag-enter", (_) => {
      setDragActive(true);
    });

    const unlistenDragOver = listen("tauri://drag-over", (_) => {
      setDragActive(true);
    });

    const unlistenDragLeave = listen("tauri://drag-leave", (_) => {
      setDragActive(false);
    });

    return () => {
      unlistenDrag.then((f) => f());
      unlistenDragEnter.then((f) => f());
      unlistenDragOver.then((f) => f());
      unlistenDragLeave.then((f) => f());
    };
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none top-0 left-0 transition-all ease-in-out duration-100 border-solid border-0 rounded-lg border-blue-200",
        dragActive && "border-4"
      )}
    ></div>
  );
}
