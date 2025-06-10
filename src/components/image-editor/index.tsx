import { KeyboardEvent, useEffect, useMemo, useRef } from "react";

import { EditContext, EditData } from "./edit-context";
import { Toolbar, ToolbarHandle } from "./toolbar";

export interface ImageEditorProps {
  image?: string;
}

export function ImageEditor({ image }: ImageEditorProps) {
  const toolbarRef = useRef<ToolbarHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  let editContext = useMemo(() => new EditContext(), []);
  let editData = useMemo(() => new EditData(), [image]);

  const imageElement = useMemo(() => new Image(), []);
  imageElement.onload = () => {
    if (!canvasRef.current) return;

    if (!editContext.initialized) {
      editContext.init(canvasRef.current);
    }
    if (toolbarRef.current) {
      toolbarRef.current.setTool("pan");
    }

    // TODO
    const imageData = editContext.setImage(imageElement);
    editData.init(imageData, imageElement.width, imageElement.height);
    editContext.data = editData;

    editContext.draw();
  };

  // reload image on change
  useEffect(() => {
    if (image) {
      imageElement.src = image;
    }
  }, [image]);

  // update canvas size on resize
  useEffect(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!canvasContainerRef.current || !canvasRef.current) return;

      const containerBounds =
        canvasContainerRef.current.getBoundingClientRect();
      canvasRef.current.width = containerBounds.width;
      canvasRef.current.height = containerBounds.height;

      if (editContext.initialized) {
        editContext.cancelAnimationFrame();
        editContext.draw();
      }
    };

    // initial update
    updateCanvasSize();

    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [canvasRef, canvasContainerRef]);

  // const handleKeyDown = (e: KeyboardEvent) => {
  //   // deactivate current tool on escape
  //   if (e.key === "Escape") {
  //     switchTool("pan");
  //     return;
  //   }

  //   if (!e.ctrlKey) return;
  //   switch (e.key) {
  //     // ctrl + num to switch tool
  //     case "1":
  //       switchTool("pan");
  //       break;
  //     case "2":
  //       switchTool("zoom");
  //       break;
  //     case "3":
  //       switchTool("crop");
  //       break;
  //     case "4":
  //       switchTool("pen");
  //       break;
  //     case "z":
  //       if (e.shiftKey) {
  //         switchTool("redo");
  //       } else {
  //         switchTool("undo");
  //       }
  //       break;
  //   }
  // };

  return image ? (
    <div className="w-full h-full flex flex-col space-y-0">
      <Toolbar ctx={editContext} ref={toolbarRef} />

      <div className="flex-1 w-full" ref={canvasContainerRef}>
        <canvas ref={canvasRef} width={800} height={600} />
      </div>
    </div>
  ) : (
    <h2 className="text-xl font-semibold">No image selected</h2>
  );
}
