import { sep } from "@tauri-apps/api/path";
import { createStore } from "@xstate/store";

export interface DrawnStroke {
  type: "stroke";
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export type Drawing = DrawnStroke;

export interface SetField {
  type: "SetField";
  fieldName: string;
  before: any;
  after: any;
}

export interface PushToField {
  type: "PushToField";
  fieldName: string;
  value: any;
}

export type EditAction = SetField | PushToField;

/**
 * each edit context is unique to each image
 * will get persisted to disk
 * similar to .psd files from photoshop
 */
export class EditData {
  filepath: string;
  directory: string[];
  filename: string;

  originalImageData: ImageData;

  // relative to original image
  cropBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  drawings: Drawing[] = [];

  // both stacks are last in first out
  undoStack: EditAction[] = [];
  redoStack: EditAction[] = [];

  constructor(filepath: string, imageData: ImageData) {
    this.filepath = filepath;
    const pathParts = filepath.split(sep());
    this.directory = pathParts.slice(0, -1);
    this.filename = pathParts[pathParts.length - 1];

    this.originalImageData = imageData;

    this.cropBox = {
      x: 0,
      y: 0,
      width: imageData.width,
      height: imageData.height,
    };
  }

  /**
   * given a point in canvas coordinates, return the canvas coordinates as if the crop box was not applied
   * i.e. if the original image was at (0, 0) in the canvas
   */
  toOriginalPos(x: number, y: number): { x: number; y: number } {
    return {
      x: x + this.cropBox.x,
      y: y + this.cropBox.y,
    };
  }

  applyAction(action: EditAction) {
    this.redo(action);
    this.redoStack = [];
  }

  pushToUndoStack(action: EditAction) {
    this.undoStack.push(action);
    this.redoStack = [];
    editDataStore.trigger.updateEditData({ data: this });
  }

  undo = () => {
    const action = this.undoStack.pop();
    if (!action) return;

    switch (action.type) {
      case "SetField":
        (this as any)[action.fieldName] = action.before;
        break;
      case "PushToField":
        (this as any)[action.fieldName].pop();
        break;
    }

    this.redoStack.push(action);
    editDataStore.trigger.updateEditData({ data: this });
  };

  redo = (argAction?: EditAction) => {
    const action = argAction ?? this.redoStack.pop();
    if (!action) return;

    switch (action.type) {
      case "SetField":
        (this as any)[action.fieldName] = action.after;
        break;
      case "PushToField":
        (this as any)[action.fieldName].push(action.value);
        break;
    }

    this.undoStack.push(action);
    editDataStore.trigger.updateEditData({ data: this });
  };

  drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawnStroke) {
    if (stroke.points.length === 0) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();

    ctx.restore();
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(
      0,
      0,
      this.originalImageData.width,
      this.originalImageData.height
    );
    ctx.putImageData(this.originalImageData, 0, 0);

    for (const drawing of this.drawings) {
      switch (drawing.type) {
        case "stroke":
          this.drawStroke(ctx, drawing);
          break;
      }
    }
  }

  cropToCanvas(source: HTMLCanvasElement, target: CanvasRenderingContext2D) {
    const {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    } = this.cropBox;

    target.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );
  }
}

function removeEditData(
  context: { editDatas: EditData[]; currentEditData: EditData | null },
  event: { data?: EditData | null },
  enq: any
) {
  const { data: eventData } = event;
  if (!eventData) return;
  const index = context.editDatas.findIndex(
    (data) => data.filepath === eventData.filepath
  );
  if (index === -1) {
    return context;
  }

  const newContext = {
    ...context,
    editDatas: context.editDatas.filter(
      (data) => data.filepath !== eventData.filepath
    ),
    currentEditData:
      context.currentEditData?.filepath === eventData.filepath
        ? null
        : context.currentEditData,
  };

  enq.emit.removed({ data: eventData });
  return newContext;
}

export const editDataStore = createStore({
  context: {
    editDatas: [] as EditData[],
    currentEditData: null as EditData | null,
  },
  on: {
    add: (context, event: { data: EditData }, enq) => {
      // dont add if already exists
      for (const data of context.editDatas) {
        if (data.filepath === event.data.filepath) {
          return context;
        }
      }

      enq.emit.added({ data: event.data });

      return {
        ...context,
        editDatas: [...context.editDatas, event.data],
        currentEditData: context.currentEditData ?? event.data,
      };
    },

    setCurrentEditData: (context, event: { data: EditData }) => ({
      ...context,
      currentEditData: event.data,
    }),

    updateEditData: (context, event: { data: EditData }, enq) => {
      const index = context.editDatas.findIndex(
        (data) => data.filepath === event.data.filepath
      );
      if (index === -1) {
        return context;
      }

      enq.emit.editDataUpdated({ data: event.data });

      return context;
    },

    removeEditData: (context, event: { data: EditData }, enq) => {
      return removeEditData(context, event, enq);
    },

    removeCurrentEditData: (context, _event, enq) => {
      return removeEditData(
        context,
        {
          data: context.currentEditData,
        },
        enq
      );
    },

    clear: (_, _event, enq) => {
      enq.emit.clear();
      return {
        editDatas: [],
        currentEditData: null,
      };
    },
  },
  emits: {
    added: (_payload: { data: EditData }) => {},
    removed: (_payload: { data: EditData }) => {},
    editDataUpdated: (_payload: { data: EditData }) => {},
    clear: () => {},
  },
});

export function getCurrentEditData(): EditData | null {
  return editDataStore.getSnapshot().context.currentEditData;
}
