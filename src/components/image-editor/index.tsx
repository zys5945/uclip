import { useRef, useEffect, useMemo, useState } from "react";

import { activateCrop, deactivateCrop } from "./crop";

interface ImageEditorProps {
  image?: string;
}

export function ImageEditor({ image }: ImageEditorProps) {
  const [imageLoading, setImageLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let editingContext = useMemo(() => {}, [image]);

  activateCrop();

  const imageElement = useMemo(() => new Image(), []);
  imageElement.onload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageElement, 0, 0);

    setImageLoading(false);
  };

  imageElement.loading;

  useEffect(() => {
    if (image) {
      imageElement.src = image;
      setImageLoading(true);
    }
  }, [image]);

  return image ? (
    <div className="relative flex flex-col items-center justify-center h-full">
      <div className="absolute top-0 w-full flex justify-center p-2 z-10">
        <div className="flex space-x-2 bg-white p-2 rounded-md shadow-md"></div>
      </div>
      <canvas ref={canvasRef} className="max-w-full h-auto block" />
    </div>
  ) : (
    <h2 className="text-xl font-semibold">No image selected</h2>
  );
}
