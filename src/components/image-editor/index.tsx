import { useSelector } from "@xstate/store/react";
import { useCallback, useEffect, useRef } from "react";

import { exportCurrentImage, saveCurrentEditData } from "@/lib/file";
import { editDataStore } from "../edit-data";
import { canvasInfoStore } from "./canvas-info";
import { EditContext } from "./edit-context";
import { TOOL_NAMES, Toolbar, ToolbarHandle } from "./toolbar";

function copyInfoPanel() {
  const canvasInfo = canvasInfoStore.getSnapshot().context;

  if (!canvasInfo.mousePos || !canvasInfo.color) return;

  navigator.clipboard.writeText(
    `((${canvasInfo.mousePos.x.toFixed(0)}, ${canvasInfo.mousePos.y.toFixed(
      0
    )}), (${canvasInfo.color[0]}, ${canvasInfo.color[1]}, ${
      canvasInfo.color[2]
    }))`
  );
}

function copySelection(toolbarHandle: ToolbarHandle) {
  toolbarHandle.messageTool("copy");
}

export function ImageEditor() {
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

  // set data when it changes
  useEffect(() => {
    if (!editContext.current) return;
    editContext.current.setData(currentEditData);

    if (toolbarRef.current) {
      toolbarRef.current.useTool("pan");
    }

    editContext.current.draw();
  }, [currentEditData]);

  // update canvas width and height on resize
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

  const canvasContainerCallback = useCallback(
    (canvasContainer: HTMLDivElement) => {
      canvasContainerRef.current = canvasContainer;
      const observer = new ResizeObserver(updateCanvasSize);
      observer.observe(canvasContainer);
      return () => observer.disconnect();
    },
    []
  );

  // shortcuts
  const handleShortcuts = (e: KeyboardEvent) => {
    if (!toolbarRef.current) return;
    const toolbarHandle = toolbarRef.current;

    // deactivate current tool on escape
    if (e.key === "Escape") {
      toolbarHandle.useTool("pan");
      return;
    }

    if (!e.ctrlKey) return;

    // ctrl + num to switch tool
    const num = parseInt(e.key);
    if (!isNaN(num)) {
      if (num < 1 || num > TOOL_NAMES.length) return;
      toolbarHandle.useTool(TOOL_NAMES[num - 1]);
      return;
    }

    switch (e.key) {
      case "c":
        if (toolbarHandle.getCurrentToolName() === "select") {
          copySelection(toolbarHandle);
        } else {
          copyInfoPanel();
        }
        break;
      case "s":
        saveCurrentEditData();
        break;
      case "e":
        exportCurrentImage();
        break;
      case "z":
        if (e.shiftKey) {
          toolbarHandle.useTool("redo");
        } else {
          toolbarHandle.useTool("undo");
        }
        break;
      case "Z":
        toolbarHandle.useTool("redo");
        break;
    }
  };
  const containerCallback = useCallback((node: HTMLDivElement) => {
    node?.addEventListener("keydown", handleShortcuts);
    return () => {
      node?.removeEventListener("keydown", handleShortcuts);
    };
  }, []);

  return currentEditData ? (
    <div
      className="w-full h-full flex flex-col gap-0"
      tabIndex={0}
      ref={containerCallback}
    >
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
