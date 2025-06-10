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
  originalImageData!: ImageData;
  originalWidth!: number;
  originalHeight!: number;

  // relative to original image
  cropBox!: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  drawings: Drawing[] = [];

  undoStack: UndoableAction[] = [];
  redoStack: UndoableAction[] = [];

  init(imageData: ImageData, width: number, height: number) {
    this.originalImageData = imageData;
    this.originalWidth = width;
    this.originalHeight = height;

    this.cropBox = {
      x: 0,
      y: 0,
      width,
      height,
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
