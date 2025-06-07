import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageDisplay } from "./image-display";
import { ImagePreview } from "./image-preview";
import { InfoPanel } from "./info-panel";

import { useSelector } from "@xstate/store/react";
import { clipStore } from "./clip";

export function ClipManager() {
  const clips = useSelector(clipStore, (state) => state.context.clips);

  return (
    <div className="flex flex-row gap-4 w-full h-full min-w-[800px]">
      {/* Left side - Image previews */}
      <Card className="w-1/5 min-w-[200px]">
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-2 pr-3">
              {clips.map((clip) => (
                <ImagePreview
                  key={clip.timestamp}
                  clip={clip}
                  onClick={() => clipStore.trigger.select({ clip })}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Middle - Main image display */}
      <Card className="flex-1">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <ImageDisplay clip={clips.find((clip) => clip.isSelected)!} />
        </CardContent>
      </Card>

      {/* Right side - Metadata */}
      <Card className="w-1/4 min-w-[250px]">
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="pr-3">
              <InfoPanel items={[]} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
