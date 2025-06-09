import { EditTool, EditContext } from "./edit-context";

interface ToolData {
  eventHandler?: (e: any) => void;
}

export class PanTool implements EditTool {
  panningSpeed: number = 1;

  activate(ctx: EditContext, toolData: ToolData): void {
    ctx.canvas.style.cursor = "grab";

    /**
     * directly using pixel coords here instead of canvas coords
     * because translation occurs before scaling. thus it's 1:1
     */
    const onMouseMove = (_: MouseEvent) => {
      if (!ctx.isDragging || !ctx.mousePosPx || !ctx.lastMousePosPx) {
        return;
      }
      const deltaX = ctx.mousePosPx.x - ctx.lastMousePosPx.x;
      const deltaY = ctx.mousePosPx.y - ctx.lastMousePosPx.y;

      ctx.translation.x += deltaX * this.panningSpeed;
      ctx.translation.y += deltaY * this.panningSpeed;
    };

    toolData.eventHandler = onMouseMove;
    ctx.subscribe("mousemove", onMouseMove);
  }

  draw(): void {}

  deactivate(ctx: EditContext, toolData: ToolData): void {
    ctx.canvas.style.cursor = "default";
    ctx.unsubscribe("mousemove", toolData.eventHandler!);
  }
}
