import { useSelector } from "@xstate/store/react";
import { useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { editDataStore } from "../edit-data";
import { EditContext } from "./edit-context";
import { Toolbar, ToolbarHandle, ToolName } from "./toolbar";
import { canvasInfoStore } from "./canvas-info";

export interface ImageEditorHandle {
  useTool: (toolName: ToolName) => void;
}

export interface ImageEditorProps {
  ref: React.Ref<ImageEditorHandle>;
}

export function ImageEditor({ ref }: ImageEditorProps) {
  const currentEditData = useSelector(
    editDataStore,
    (state) => state.context.currentEditData
  );

  const toolbarRef = useRef<ToolbarHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const editContext = useRef<EditContext | null>(null);

  // edit context is 1:1 with canvas
  const canvasCallback = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
    updateCanvasSize();

    const newContext = new EditContext(canvas);

    // listeners
    newContext.subscribe("mousemove", () => {
      if (!newContext.mousePos || !newContext.mousePosPx) return;

      const color = newContext.ctx.getImageData(
        newContext.mousePosPx.x,
        newContext.mousePosPx.y,
        1,
        1
      ).data;

      canvasInfoStore.trigger.set({
        mousePos: newContext.mousePos,
        color,
      });
    });

    // start drawing if there's data
    const data = editDataStore.getSnapshot().context.currentEditData;
    if (data) {
      newContext.setData(data);
      newContext.draw();
    }

    // set context
    editContext.current = newContext;

    // tools
    if (toolbarRef.current) {
      toolbarRef.current.useTool("pan");
    }

    // when canvas unmounts, destroy context
    return () => {
      editContext.current = null;
    };
  }, []);

  // set data
  useEffect(() => {
    if (!editContext.current) return;
    editContext.current.setData(currentEditData);

    if (toolbarRef.current) {
      toolbarRef.current.useTool("pan");
    }

    editContext.current.draw();
  }, [currentEditData]);

  function updateCanvasSize() {
    if (!canvasContainerRef.current || !canvasRef.current) return;

    const containerBounds = canvasContainerRef.current.getBoundingClientRect();
    canvasRef.current.width = containerBounds.width;
    canvasRef.current.height = containerBounds.height;

    if (editContext.current) {
      editContext.current.cancelAnimationFrame();
      editContext.current.draw();
    }
  }

  // update canvas width and height on resize
  const canvasContainerCallback = useCallback(
    (canvasContainer: HTMLDivElement) => {
      canvasContainerRef.current = canvasContainer;
      const observer = new ResizeObserver(updateCanvasSize);
      observer.observe(canvasContainer);
      return () => observer.disconnect();
    },
    []
  );

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
    []
  );

  return currentEditData ? (
    <div className="w-full h-full flex flex-col space-y-0">
      <Toolbar editContextRef={editContext} ref={toolbarRef} />

      <div className="flex-1 w-full" ref={canvasContainerCallback}>
        <canvas ref={canvasCallback} width={800} height={600} />
      </div>
    </div>
  ) : (
    <div className="w-full h-full flex justify-center items-center select-none">
      <h2 className="text-xl font-semibold">No image selected</h2>
    </div>
  );
}
