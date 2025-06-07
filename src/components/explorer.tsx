import { cn } from "@/lib/utils";

import { Clip } from "./clip";

interface ImagePreviewProps {
  clip: Clip;
  onClick: () => void;
}

export function Explorer({ clip, onClick }: ImagePreviewProps) {
  return (
    <div
      className={cn(
        "p-2 rounded-md cursor-pointer transition-colors",
        clip.isSelected ? "bg-accent" : "hover:bg-muted"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className="relative h-16 w-16 rounded-md overflow-hidden">
          <img
            src={clip.url || "/placeholder.svg"}
            alt={clip.name}
            className="object-cover"
          />
        </div>
        <span className="text-sm truncate">{clip.name}</span>
      </div>
    </div>
  );
}
