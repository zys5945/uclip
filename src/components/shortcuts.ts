import { ImageEditorHandle } from "./image-editor";
import { canvasInfoStore } from "./image-editor/canvas-info";
import { TOOL_NAMES } from "./image-editor/toolbar";

const copyInfoPanel = () => {
  const canvasInfo = canvasInfoStore.getSnapshot().context;
  navigator.clipboard.writeText(
    `((${canvasInfo.mousePos.x.toFixed(0)}, ${canvasInfo.mousePos.y.toFixed(
      0
    )}), (${canvasInfo.color[0]}, ${canvasInfo.color[1]}, ${
      canvasInfo.color[2]
    }))`
  );
};

export const handleShortcuts = (
  e: KeyboardEvent,
  imageEditorRef: React.RefObject<ImageEditorHandle | null>
) => {
  if (!imageEditorRef.current) return;
  const useTool = imageEditorRef.current.useTool;

  // deactivate current tool on escape
  if (e.key === "Escape") {
    useTool("pan");
    return;
  }

  if (!e.ctrlKey) return;

  // ctrl + num to switch tool
  const num = parseInt(e.key);
  if (!isNaN(num)) {
    if (num < 1 || num > TOOL_NAMES.length) return;
    useTool(TOOL_NAMES[num - 1]);
    return;
  }

  switch (e.key) {
    case "c":
      copyInfoPanel();
      break;
    case "z":
      if (e.shiftKey) {
        useTool("redo");
      } else {
        useTool("undo");
      }
      break;
    case "Z":
      useTool("redo");
      break;
  }
};
