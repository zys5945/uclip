import { canvasInfoStore } from "./image-editor/canvas-info";
import { TOOL_NAMES, ToolbarHandle } from "./image-editor/toolbar";

const copyInfoPanel = () => {
  const canvasInfo = canvasInfoStore.getSnapshot().context;

  if (!canvasInfo.mousePos || !canvasInfo.color) return;

  navigator.clipboard.writeText(
    `((${canvasInfo.mousePos.x.toFixed(0)}, ${canvasInfo.mousePos.y.toFixed(
      0
    )}), (${canvasInfo.color[0]}, ${canvasInfo.color[1]}, ${
      canvasInfo.color[2]
    }))`
  );
};

const copySelection = (toolbarHandle: ToolbarHandle) => {
  toolbarHandle.messageTool("copy");
};

export const handleShortcuts = (
  e: KeyboardEvent,
  toolbarHandle: ToolbarHandle | null
) => {
  if (!toolbarHandle) return;

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
