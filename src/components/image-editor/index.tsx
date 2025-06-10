import { useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { EditContext, EditData } from "./edit-context";
import { Toolbar, ToolbarHandle, ToolName } from "./toolbar";

export interface ImageEditorHandle {
  useTool: (toolName: ToolName) => void;
}

export interface ImageEditorProps {
  image?: string;
  ref: React.Ref<ImageEditorHandle>;
  canvasInfoChangeCallback?: (
    mousePos: { x: number; y: number },
    color: Uint8ClampedArray
  ) => void;
}

export function ImageEditor({
  image,
  ref,
  canvasInfoChangeCallback,
}: ImageEditorProps) {
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
      editContext.subscribe("mousemove", () => {
        if (
          !canvasInfoChangeCallback ||
          !editContext.mousePos ||
          !editContext.mousePosPx
        )
          return;

        const color = editContext.ctx.getImageData(
          editContext.mousePosPx.x,
          editContext.mousePosPx.y,
          1,
          1
        ).data;
        canvasInfoChangeCallback(editContext.mousePos, color);
      });
    }
    if (toolbarRef.current) {
      toolbarRef.current.useTool("pan");
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

  useImperativeHandle(
    ref,
    () => {
      return {
        useTool: (toolName: ToolName) => {
          if (toolbarRef.current) {
            toolbarRef.current.useTool(toolName);
          }
        },
      };
    },
    [toolbarRef]
  );

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
