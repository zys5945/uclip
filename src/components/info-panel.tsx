import convert from "color-convert";

import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Car } from "lucide-react";

export function InfoPanel() {
  const mouse = { x: 300, y: 300 };

  const color = [255, 255, 255, 1];

  const rgb: [r: number, g: number, b: number] = [color[0], color[1], color[2]];
  const cmyk = convert.rgb.cmyk(rgb);
  const hsl = convert.rgb.hsl(rgb);

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span>X</span>
              <span>{mouse.x}</span>
            </div>
            <div className="flex justify-between">
              <span>Y</span>
              <span>{mouse.y}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Color</CardTitle>
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
    </div>
  );
}
