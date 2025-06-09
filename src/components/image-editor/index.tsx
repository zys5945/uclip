import { Toggle } from "@/components/ui/toggle";
import { useEffect, useMemo, useRef, useState } from "react";

import { MoveIcon, CropIcon, PencilIcon } from "lucide-react";

import { CropTool } from "./crop";
import { EditContext, EditData } from "./edit-context";

export interface ImageEditorProps {
  image?: string;
}

export function ImageEditor({ image }: ImageEditorProps) {
  const [imageLoading, setImageLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  let editContext = useMemo(() => new EditContext(), []);
  let editData = useMemo(() => new EditData(), [image]);

  const imageElement = useMemo(() => new Image(), []);
  imageElement.onload = () => {
    if (!canvasRef.current) return;

    if (!editContext.initialized) {
      editContext.init(canvasRef.current);
    }
    const imageData = editContext.setImage(imageElement);

    editData.init(imageData, imageElement.width, imageElement.height);

    editContext.data = editData;
    editContext.currentTool = new CropTool();
    editContext.activateTool();

    editContext.draw();

    setImageLoading(false);
  };

  useEffect(() => {
    if (image) {
      imageElement.src = image;
      setImageLoading(true);
    }
  }, [image]);

  return image ? (
    <div className="w-full h-full p-8">
      <div className="absolute top-0 w-full flex justify-center p-2 z-10">
        <div className="flex space-x-2 p-2 bg-gray-600 rounded-md">
          <Toggle>
            <MoveIcon />
          </Toggle>
          <Toggle>
            <CropIcon />
          </Toggle>
          <Toggle>
            <PencilIcon />
          </Toggle>
        </div>
      </div>
      <canvas ref={canvasRef} width={1920} height={1080} />
    </div>
  ) : (
    <h2 className="text-xl font-semibold">No image selected</h2>
  );
}
