import { clampNumber } from "@/lib/utils";
import { EditContext, EditTool } from "./edit-context";
import { canvasInfoStore } from "./canvas-info";

function clampToCropBox(
  pos: { x: number; y: number },
  cropBox: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: clampNumber(pos.x, cropBox.x, cropBox.x + cropBox.width),
    y: clampNumber(pos.y, cropBox.y, cropBox.y + cropBox.height),
  };
}

interface ToolData {
  // the positions here are in original image coordinates
  startPos?: { x: number; y: number };
  endPos?: { x: number; y: number };

  eventSubscribers: { [key: string]: (e: any) => void };
}

export class SelectTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor = "crosshair";

    const onMouseDown = (_: MouseEvent) => {
      if (!ctx.mousePos || !ctx.data) return;
      toolData.startPos = void 0;
      toolData.endPos = void 0;

      toolData.startPos = clampToCropBox(
        ctx.data.toOriginalPos(ctx.mousePos.x, ctx.mousePos.y),
        ctx.data.cropBox
      );
    };

    const onMouseMove = (_: MouseEvent) => {
      if (!ctx.isDragging || !ctx.mousePos || !ctx.data || !toolData.startPos)
        return;
      toolData.endPos = clampToCropBox(
        ctx.data.toOriginalPos(ctx.mousePos.x, ctx.mousePos.y),
        ctx.data.cropBox
      );

      canvasInfoStore.trigger.setSelection({
        selection: {
          x: toolData.startPos.x,
          y: toolData.startPos.y,
          width: toolData.endPos.x - toolData.startPos.x,
          height: toolData.endPos.y - toolData.startPos.y,
        },
      });
    };

    ctx.subscribe("mousedown", onMouseDown);
    ctx.subscribe("mousemove", onMouseMove);

    toolData.eventSubscribers = {
      mousedown: onMouseDown,
      mousemove: onMouseMove,
    };
  }

  draw(ctx: EditContext, toolData: ToolData): void {
    if (
      !ctx.data ||
      !ctx.data.cropBox ||
      !toolData.startPos ||
      !toolData.endPos ||
      (toolData.startPos.x === toolData.endPos.x &&
        toolData.startPos.y === toolData.endPos.y)
    )
      return;

    const { x, y } = toolData.startPos;
    const width = toolData.endPos.x - x;
    const height = toolData.endPos.y - y;

    // draw dashed rect
    ctx.invariantCtx.strokeStyle = "black";
    ctx.invariantCtx.lineWidth = 1;
    ctx.invariantCtx.setLineDash([5, 5]);
    ctx.invariantCtx.strokeRect(x, y, width, height);
  }

  onMessage(ctx: EditContext, toolData: any, message?: string): void {
    if (!ctx.data || !toolData.startPos || !toolData.endPos || !message) return;

    if (message === "copy") {
      ctx.data.drawToCanvas(ctx.invariantCtx);

      const { x, y } = toolData.startPos;
      const width = toolData.endPos.x - x;
      const height = toolData.endPos.y - y;
      ctx.clipboardCanvas.width = width;
      ctx.clipboardCanvas.height = height;
      ctx.clipboardCtx.drawImage(
        ctx.invariantCanvas,
        x,
        y,
        width,
        height,
        0,
        0,
        ctx.clipboardCanvas.width,
        ctx.clipboardCanvas.height
      );

      ctx.clipboardCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const clipboardItem = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([clipboardItem]);
      });
    }
  }

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor = "default";

    for (const key in toolData.eventSubscribers) {
      ctx.unsubscribe(key, toolData.eventSubscribers[key]);
    }
  }
}
