import { DrawnStroke } from "../edit-data";
import { EditContext, EditTool } from "./edit-context";

interface ToolData {
  strokeColor: string;
  strokeWidth: number;

  currentStroke?: DrawnStroke;

  eventSubscribers: { [key: string]: (e: any) => void };
}

export class PenTool implements EditTool {
  activate(ctx: EditContext, toolData: ToolData) {
    toolData.strokeColor = "red";
    toolData.strokeWidth = 5;

    const onMouseDown = () => {
      toolData.currentStroke = {
        type: "stroke",
        color: toolData.strokeColor,
        width: toolData.strokeWidth,
        points: [],
      };
    };

    const onMouseMove = () => {
      if (!ctx.isDragging || !ctx.mousePos || !ctx.lastMousePos || !ctx.data) {
        return;
      }

      toolData.currentStroke!.points.push(
        ctx.data.toOriginalPos(ctx.mousePos.x, ctx.mousePos.y)
      );
    };

    const onMouseUp = () => {
      if (!ctx.data || !toolData.currentStroke) return;

      ctx.data.drawings.push(toolData.currentStroke);
      ctx.data.pushToUndoStack({
        type: "PushToField",
        fieldName: "drawings",
        value: toolData.currentStroke,
      });

      toolData.currentStroke = void 0;
    };

    toolData.eventSubscribers = {};
    toolData.eventSubscribers.mousedown = onMouseDown;
    toolData.eventSubscribers.mousemove = onMouseMove;
    toolData.eventSubscribers.mouseup = onMouseUp;
    ctx.subscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.subscribe("mousemove", toolData.eventSubscribers.mousemove);
    ctx.subscribe("mouseup", toolData.eventSubscribers.mouseup);
  }

  draw(ctx: EditContext, toolData: any): void {
    if (!ctx.data || !toolData.currentStroke) return;
    ctx.data.drawStroke(ctx.invariantCtx, toolData.currentStroke);
  }
  onMessage(): void {}

  deactivate(ctx: EditContext, toolData: ToolData) {
    ctx.unsubscribe("mousedown", toolData.eventSubscribers.mousedown);
    ctx.unsubscribe("mousemove", toolData.eventSubscribers.mousemove);
    ctx.unsubscribe("mouseup", toolData.eventSubscribers.mouseup);
  }
}
