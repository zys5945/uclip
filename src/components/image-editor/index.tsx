import { useSelector } from "@xstate/store/react";
import { useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { editDataStore } from "../edit-data";
import { EditContext } from "./edit-context";
import { Toolbar, ToolbarHandle, ToolName } from "./toolbar";
import { canvasInfoStore } from "./canvas-info";

export interface ImageEditorHandle {
  useTool: (toolName: ToolName) => void;
}

export interface ImageEditorProps {
  ref: React.Ref<ImageEditorHandle>;
  canvasInfoChangeCallback?: (
    mousePos: { x: number; y: number },
    color: Uint8ClampedArray
  ) => void;
}

export function ImageEditor({ ref }: ImageEditorProps) {
  const currentEditData = useSelector(
    editDataStore,
    (state) => state.context.currentEditData
  );

  const toolbarRef = useRef<ToolbarHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  let editContext = useMemo(() => new EditContext(), []);

  const initializeContext = () => {
    if (!canvasRef.current) return;

    if (editContext.initialized) {
      return;
    }

    editContext.init(canvasRef.current);
    updateCanvasSize();

    editContext.subscribe("mousemove", () => {
      if (
        !editContext.initialized ||
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

      canvasInfoStore.trigger.set({
        mousePos: editContext.mousePos,
        color,
      });
    });
  };

  // set EditData
  useEffect(() => {
    if (!editContext.initialized) {
      initializeContext();
    }

    editContext.setData(currentEditData);

    if (toolbarRef.current) {
      toolbarRef.current.useTool("pan");
    }

    if (editContext.data) {
      editContext.draw();
    }
  }, [currentEditData]);

  function updateCanvasSize() {
    if (!canvasContainerRef.current || !canvasRef.current) return;

    const containerBounds = canvasContainerRef.current.getBoundingClientRect();
    canvasRef.current.width = containerBounds.width;
    canvasRef.current.height = containerBounds.height;

    if (editContext.initialized) {
      editContext.cancelAnimationFrame();
      editContext.draw();
    }
  }

  // update canvas size on resize
  useEffect(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return;
    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, [currentEditData]);

  // expose toolbar
  useImperativeHandle(
    ref,
    () => ({
      useTool: (toolName: ToolName) => {
        if (toolbarRef.current) {
          toolbarRef.current.useTool(toolName);
        }
      },
    }),
    [toolbarRef]
  );

  return currentEditData ? (
    <div className="w-full h-full flex flex-col space-y-0">
      <Toolbar ctx={editContext} ref={toolbarRef} />

      <div className="flex-1 w-full" ref={canvasContainerRef}>
        <canvas ref={canvasRef} width={800} height={600} />
      </div>
    </div>
  ) : (
    <div className="w-full h-full flex justify-center items-center select-none">
      <h2 className="text-xl font-semibold">No image selected</h2>
    </div>
  );
}
