import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useSelector } from "@xstate/store/react";

import { imageStore } from "../image-data";
import { FileInput } from "./file-input";

import { DirectoryTreeSidebar } from "./tree-view";

export function ImageExplorer() {
  const images = useSelector(imageStore, (state) => state.context.images);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const unlistenDrag = listen("tauri://drag-drop", (event) => {
      console.log(event);
      setDragActive(false);
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

  return <DirectoryTreeSidebar />;

  //   return images.length === 0 ? (
  //     <div
  //       className={`w-full h-full hover:scale-[1.2] transition-all duration-300 ease-in-out ${
  //         dragActive && "scale-[1.2] bg-blue-900/30"
  //       }`}
  //     >
  //       <FileInput />
  //     </div>
  //   ) : (
  //     <div></div>
  //   );
}
