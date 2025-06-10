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

export type UndoableAction = SetField | PushToField;

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

  undoStack: UndoableAction[] = [];
  redoStack: UndoableAction[] = [];

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

  applyUndoableAction(action: UndoableAction) {
    this.redo(action);
    this.redoStack = [];
  }

  pushToUndoStack(action: UndoableAction) {
    this.undoStack.push(action);
    this.redoStack = [];
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
  };

  redo = (argAction?: UndoableAction) => {
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
  };
}

export const editDataStore = createStore({
  context: {
    editDatas: [] as EditData[],
    dirtyEditDatas: [] as EditData[],
    currentEditData: null as EditData | null,
  },
  on: {
    add: (context, event: { data: EditData }, enq) => {
      for (const data of context.editDatas) {
        if (data.filepath === event.data.filepath) {
          return context;
        }
      }

      enq.emit.added({ data: event.data });
      return {
        ...context,
        editDatas: [...context.editDatas, event.data],
      };
    },
  },
  emits: {
    added: (_payload: { data: EditData }) => {},
  },
});
