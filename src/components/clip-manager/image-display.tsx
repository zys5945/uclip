import * as React from "react";
import { Clip } from "./clip";

interface ImageDisplayProps {
  clip?: Clip;
}

export function ImageDisplay({ clip }: ImageDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {clip ? (
        <React.Fragment>
          <h2 className="text-xl font-semibold">{clip.name}</h2>
          <div className="relative w-full max-w-3xl aspect-[4/3] rounded-lg overflow-hidden">
            <img
              src={clip.url || "/placeholder.svg"}
              alt={clip.name}
              className="object-contain"
            />
          </div>
        </React.Fragment>
      ) : (
        <h2 className="text-xl font-semibold">No image selected</h2>
      )}
    </div>
  );
}
