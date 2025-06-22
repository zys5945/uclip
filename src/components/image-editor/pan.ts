import { EditTool, EditContext } from "./edit-context";

interface ToolData {
  eventHandler?: (e: any) => void;
}

export const PANNING_SPEED = 1;

export const pan = (ctx: EditContext): void => {
  if (!ctx.isDragging || !ctx.mousePosPx || !ctx.lastMousePosPx) {
    return;
  }

  const deltaX = ctx.mousePosPx.x - ctx.lastMousePosPx.x;
  const deltaY = ctx.mousePosPx.y - ctx.lastMousePosPx.y;

  ctx.translation.x += deltaX * PANNING_SPEED;
  ctx.translation.y += deltaY * PANNING_SPEED;
};

export class PanTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData): void {
    ctx.canvas.style.cursor = "grab";

    /**
     * directly using pixel coords here instead of canvas coords
     * because translation occurs before scaling. thus it's 1:1
     */
    const onMouseMove = (_: MouseEvent) => {
      pan(ctx);
    };

    toolData.eventHandler = onMouseMove;
    ctx.subscribe("mousemove", onMouseMove);
  }

  draw(): void {}

  onMessage(): void {}

  deactivate(ctx: EditContext, toolData: ToolData): void {
    ctx.canvas.style.cursor = "default";
    ctx.unsubscribe("mousemove", toolData.eventHandler!);
  }
}
