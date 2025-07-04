import { useSelector } from "@xstate/store/react";
import { useCallback, useEffect, useRef } from "react";

import { showContextMenu } from "@/lib/context-menu";
import { exportCurrentImage, saveCurrentEditData } from "@/lib/file";
import { editDataStore } from "../edit-data";
import { canvasInfoStore } from "./canvas-info";
import { EditContext } from "./edit-context";
import { TOOL_NAMES, Toolbar, ToolbarHandle } from "./toolbar";

function useEditingCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  canvasContainerRef: React.RefObject<HTMLDivElement | null>,
  toolbarRef: React.RefObject<ToolbarHandle | null>,
  editContext: React.RefObject<EditContext | null>
): [
  (canvas: HTMLCanvasElement) => void,
  (canvasContainer: HTMLDivElement) => void
] {
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

  const canvasContainerCallback = useCallback(
    (canvasContainer: HTMLDivElement) => {
      canvasContainerRef.current = canvasContainer;
      const observer = new ResizeObserver(updateCanvasSize);
      observer.observe(canvasContainer);
      return () => observer.disconnect();
    },
    []
  );

  return [canvasCallback, canvasContainerCallback];
}

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

function useShortcutsAndContextMenu(
  toolbarRef: React.RefObject<ToolbarHandle | null>
) {
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

  const handleContextMenu = (e: MouseEvent) => {
    showContextMenu(
      { x: e.clientX, y: e.clientY },
      {
        items: [
          {
            text: "Save As",
            action: () => saveCurrentEditData(),
          },
          {
            text: "Export",
            action: () => exportCurrentImage(),
          },
        ],
      }
    );
  };

  const containerCallback = useCallback((node: HTMLDivElement) => {
    if (!node) return;

    node.addEventListener("keydown", handleShortcuts);
    node.addEventListener("contextmenu", handleContextMenu);

    return () => {
      node.removeEventListener("keydown", handleShortcuts);
      node.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return containerCallback;
}

export function ImageEditor() {
  const currentEditData = useSelector(
    editDataStore,
    (state) => state.context.currentEditData
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<ToolbarHandle>(null);
  const editContext = useRef<EditContext | null>(null);

  const [canvasCallback, canvasContainerCallback] = useEditingCanvas(
    canvasRef,
    canvasContainerRef,
    toolbarRef,
    editContext
  );

  // set data when it changes
  useEffect(() => {
    if (!editContext.current) return;
    editContext.current.setData(currentEditData);

    if (toolbarRef.current) {
      toolbarRef.current.useTool("pan");
    }

    editContext.current.draw();
  }, [currentEditData]);

  // shortcuts
  const containerCallback = useShortcutsAndContextMenu(toolbarRef);

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
