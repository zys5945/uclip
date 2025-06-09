import { EditTool, EditContext } from "./edit-context";

interface ToolData {
  dragged?: boolean;
  clickType: "in" | "out";
  eventHandlers?: { [key: string]: (e: MouseEvent) => void };
}

export class ZoomTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    toolData.clickType = "in";
    this.setCursorType(ctx, toolData);

    const onMouseMove = (_: MouseEvent) => {
      if (!ctx.isDragging || !ctx.mousePosPx || !ctx.lastMousePosPx) return;
      toolData.dragged = true;
      const deltaX = ctx.mousePosPx.x - ctx.lastMousePosPx.x;
      ctx.logScale += deltaX * ctx.scaleSensitivity;
    };

    const onMouseUp = (_: MouseEvent) => {
      if (toolData.dragged) {
        toolData.dragged = false;
        return;
      }
      ctx.logScale +=
        (toolData.clickType === "out" ? -1 : 1) * ctx.scaleStepSize;
    };

    toolData.eventHandlers = {};
    toolData.eventHandlers.onMouseMove = onMouseMove;
    toolData.eventHandlers.onMouseUp = onMouseUp;
    ctx.subscribe("mousemove", onMouseMove);
    ctx.subscribe("mouseup", onMouseUp);
  }

  draw() {}

  onMessage(ctx: EditContext, toolData: any, message: string): void {
    toolData.clickType = message;
    this.setCursorType(ctx, toolData);
  }

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor = "default";
    ctx.unsubscribe("mousemove", toolData.eventHandlers!.onMouseMove);
    ctx.unsubscribe("mouseup", toolData.eventHandlers!.onMouseUp);
  }

  setCursorType(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor =
      toolData.clickType === "out" ? "zoom-out" : "zoom-in";
  }
}
