import { createStore } from "@xstate/store";

export interface CanvasInfo {
  mousePos: { x: number; y: number } | null;
  color: Uint8ClampedArray | null;
  selection: { x: number; y: number; width: number; height: number } | null;
}

export const canvasInfoStore = createStore({
  context: {
    mousePos: null,
    color: null,
    selection: null,
  } as CanvasInfo,
  on: {
    setCursorInfo(
      context,
      event: { mousePos: { x: number; y: number }; color: Uint8ClampedArray }
    ) {
      return { ...context, mousePos: event.mousePos, color: event.color };
    },

    setSelection(
      context,
      event: {
        selection: { x: number; y: number; width: number; height: number };
      }
    ) {
      return { ...context, selection: event.selection };
    },
  },
});
