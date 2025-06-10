import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import convert from "color-convert";

import React, { useImperativeHandle, useState } from "react";

interface InfoPanelData {
  mousePos?: { x: number; y: number };
  color?: Uint8ClampedArray;
}

export interface InfoPanelHandle {
  setData(data: InfoPanelData): void;
}

interface InfoPanelProps {
  ref: React.Ref<InfoPanelHandle>;
}

export function InfoPanel({ ref }: InfoPanelProps) {
  const sections: React.JSX.Element[] = [];

  const [mousePos, setMousePos] = useState<
    { x: number; y: number } | undefined
  >(void 0);
  const [color, setColor] = useState<Uint8ClampedArray | undefined>(void 0);

  useImperativeHandle(ref, () => ({
    setData(data: InfoPanelData) {
      setMousePos(data.mousePos);
      setColor(data.color);
    },
  }));

  if (mousePos) {
    sections.push(
      <Card key="mosePos">
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
      <Card key="color">
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
      {sections}
    </div>
  );
}
