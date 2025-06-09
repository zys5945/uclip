import { EditTool, EditContext } from "./edit-context";

interface ToolData {
  dragged?: boolean;
  eventHandlers?: { [key: string]: (e: MouseEvent) => void };
}

export class ZoomTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor = "zoom-in";

    const onMouseMove = (_: MouseEvent) => {
      if (!ctx.isDragging || !ctx.mousePosPx || !ctx.lastMousePosPx) return;
      toolData.dragged = true;
      const deltaX = ctx.mousePosPx.x - ctx.lastMousePosPx.x;
      ctx.scale += deltaX * 0.01;
    };

    const onMouseUp = (_: MouseEvent) => {
      if (toolData.dragged) {
        toolData.dragged = false;
        return;
      }
      ctx.scale += 1;
    };

    toolData.eventHandlers = {};
    toolData.eventHandlers.onMouseMove = onMouseMove;
    toolData.eventHandlers.onMouseUp = onMouseUp;
    ctx.subscribe("mousemove", onMouseMove);
    ctx.subscribe("mouseup", onMouseUp);
  }

  draw() {}

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.canvas.style.cursor = "default";
    ctx.unsubscribe("mousemove", toolData.eventHandlers!.onMouseMove);
    ctx.unsubscribe("mouseup", toolData.eventHandlers!.onMouseUp);
  }
}
