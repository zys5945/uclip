import { createStore } from "@xstate/store";

export const canvasInfoStore = createStore({
  context: {
    mousePos: { x: 0, y: 0 },
    color: new Uint8ClampedArray(4),
  },
  on: {
    set(
      context,
      event: { mousePos: { x: number; y: number }; color: Uint8ClampedArray }
    ) {
      {
        context.mousePos = event.mousePos;
        context.color = event.color;
      }
    },
  },
});
