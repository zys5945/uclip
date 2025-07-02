import convert from "color-convert";
import { useSelector } from "@xstate/store/react";

import { canvasInfoStore } from "./image-editor/canvas-info";
import { Separator } from "@/components/ui/separator";
import { UndoStackDisplay } from "./undo-stack-display";

export function InfoPanel() {
  const canvasInfo = useSelector(canvasInfoStore, (state) => state.context);
  const { mousePos, color, selection } = canvasInfo;

  let rgb: [r: number, g: number, b: number] | undefined;
  let cmyk: [c: number, m: number, y: number, k: number] | undefined;
  let hsl: [h: number, s: number, l: number] | undefined;
  if (color) {
    rgb = [color[0], color[1], color[2]];
    cmyk = convert.rgb.cmyk(rgb);
    hsl = convert.rgb.hsl(rgb);
  }

  return (
    <div className="w-full h-full flex flex-col p-4 gap-2">
      <div className="font-semibold">Cursor Position</div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <span>X</span>
          <span>{mousePos && mousePos.x.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Y</span>
          <span>{mousePos && mousePos.y.toFixed(3)}</span>
        </div>
      </div>
      <Separator className="my-2" />
      <div className="font-semibold">Selection</div>
      <div className="grid grid-cols-2 gap-y-2 gap-x-8">
        <div className="flex flex-row justify-between">
          <span>X</span>
          <span>{selection && selection.x}</span>
        </div>
        <div className="flex flex-row justify-between">
          <span>Y</span>
          <span>{selection && selection.y}</span>
        </div>
        <div className="flex flex-row justify-between">
          <span>Width</span>
          <span>{selection && selection.width}</span>
        </div>
        <div className="flex flex-row justify-between">
          <span>Height</span>
          <span>{selection && selection.height}</span>
        </div>
      </div>
      <Separator className="my-2" />
      <div className="font-semibold">Cursor Color</div>
      <div className="flex flex-row justify-between items-center">
        Color
        <div
          className="size-6 rounded-full"
          style={{ backgroundColor: `rgb(${rgb})` }}
        ></div>
      </div>
      <div className="flex justify-between">
        <span>RGBA</span>
        <span>{color && color.join(", ")}</span>
      </div>
      <div className="flex justify-between">
        <span>CMYK</span>
        <span>{cmyk && cmyk.join(", ")}</span>
      </div>
      <div className="flex justify-between">
        <span>HSL</span>
        <span>{hsl && hsl.join(", ")}</span>
      </div>
      <Separator className="my-2" />
      <UndoStackDisplay />
    </div>
  );
}
