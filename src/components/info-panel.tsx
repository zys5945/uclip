import convert from "color-convert";

import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Car } from "lucide-react";

export interface InfoPanelProps {
  mousePos?: { x: number; y: number };
  color?: Uint8ClampedArray;
}

export function InfoPanel({ mousePos, color }: InfoPanelProps) {
  const sections: JSX.Element[] = [];

  if (mousePos) {
    sections.push(
      <Card>
        <CardHeader>
          <CardTitle>Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span>X</span>
              <span>{mousePos.x}</span>
            </div>
            <div className="flex justify-between">
              <span>Y</span>
              <span>{mousePos.y}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (color) {
    const rgb: [r: number, g: number, b: number] = [
      color[0],
      color[1],
      color[2],
    ];
    const cmyk = convert.rgb.cmyk(rgb);
    const hsl = convert.rgb.hsl(rgb);

    sections.push(
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex flex-row justify-between items-center">
              Color
              <div
                className="size-6 rounded-full"
                style={{ backgroundColor: `rgb(${rgb})` }}
              ></div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span>RGBA</span>
              <span>{color.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span>CMYK</span>
              <span>{cmyk.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span>HSL</span>
              <span>{hsl.join(", ")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 justify-center">
      {...sections}
    </div>
  );
}
