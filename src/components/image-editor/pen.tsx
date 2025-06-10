import { DrawnStroke } from "../edit-data";
import { EditContext, EditTool } from "./edit-context";

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

      ctx.data!.drawings.push(stroke);
    };

    const onMouseMove = () => {
      if (!ctx.isDragging || !ctx.mousePos || !ctx.lastMousePos) {
        return;
      }

      const stroke = ctx.data!.drawings[
        ctx.data!.drawings.length - 1
      ] as DrawnStroke;
      stroke.points.push({
        x: ctx.mousePos.x,
        y: ctx.mousePos.y,
      });
    };

    const onMouseUp = () => {
      ctx.data!.pushToUndoStack({
        type: "PushToField",
        fieldName: "drawings",
        value: ctx.data!.drawings[ctx.data!.drawings.length - 1],
      });
    };

    toolData.eventSubscribers = {};
    toolData.eventSubscribers.mousedown = onMouseDown;
    toolData.eventSubscribers.mousemove = onMouseMove;
    toolData.eventSubscribers.mouseup = onMouseUp;
    ctx.subscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.subscribe("mousemove", toolData.eventSubscribers.mousemove);
    ctx.subscribe("mouseup", toolData.eventSubscribers.mouseup);
  }

  draw(): void {}
  onMessage(): void {}

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.unsubscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.unsubscribe("mousemove", toolData.eventSubscribers.mousemove);
  }
}
