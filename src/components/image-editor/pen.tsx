import { EditTool, EditContext, DrawnStroke } from "./edit-context";

interface ToolData {
  strokeColor: string;
  strokeWidth: number;

  eventSubscribers: { [key: string]: (e: any) => void };
}

export class PenTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    toolData.strokeColor = "red";
    toolData.strokeWidth = 5;

    const onMouseDown = () => {
      const stroke: DrawnStroke = {
        type: "stroke",
        color: toolData.strokeColor,
        width: toolData.strokeWidth,
        points: [],
      };

      ctx.data.drawings.push(stroke);
    };

    const onMouseMove = () => {
      if (!ctx.isDragging || !ctx.mousePos || !ctx.lastMousePos) {
        return;
      }

      console.log(ctx.mousePos, ctx.lastMousePos);

      const stroke = ctx.data.drawings[
        ctx.data.drawings.length - 1
      ] as DrawnStroke;
      stroke.points.push({
        x: ctx.mousePos.x,
        y: ctx.mousePos.y,
      });

      console.log(ctx.data.drawings);
    };

    toolData.eventSubscribers = {};
    toolData.eventSubscribers.mousedown = onMouseDown;
    toolData.eventSubscribers.mousemove = onMouseMove;
    ctx.subscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.subscribe("mousemove", toolData.eventSubscribers.mousemove);
  }

  draw(): void {}
  onMessage(): void {}

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.unsubscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.unsubscribe("mousemove", toolData.eventSubscribers.mousemove);
  }
}
