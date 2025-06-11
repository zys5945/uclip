import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { cn, readFileIntoStore } from "@/lib/utils";

export function DragDropReceiver() {
  const [dragActive, setDragActive] = useState(false);

  // listen for drag events
  useEffect(() => {
    const unlistenDrag = listen("tauri://drag-drop", (event: any) => {
      setDragActive(false);
      for (const path of event.payload.paths) {
        readFileIntoStore(path);
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
