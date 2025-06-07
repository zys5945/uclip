import { createStore } from "@xstate/store";

export class Clip {
  url: string;
  name?: string;

  saveState: "unsaved" | "saving" | "saved";
  isSelected: boolean;

  timestamp: number;

  constructor(image: string, name?: string) {
    this.url = image;
    this.name = name;

    this.saveState = "unsaved";
    this.isSelected = false;

    this.timestamp = Date.now();
  }
}

export const clipStore = createStore({
  context: {
    clips: [] as Clip[],
  },
  on: {
    add: (context, event: { image: string; name?: string }) => ({
      clips: [
        ...context.clips,
        {
          url: event.image,
          name: event.name,
          saveState: "unsaved",
          isSelected: false,
        } as Clip,
      ],
    }),

    remove: (context, event: { clip: Clip }) => ({
      clips: context.clips.filter((iterClip) => iterClip !== event.clip),
    }),

    select: (context, event: { clip: Clip }) => ({
      clips: context.clips.map((iterClip) =>
        iterClip === event.clip
          ? { ...iterClip, isSelected: true }
          : { ...iterClip, isSelected: false }
      ),
    }),

    save: (context, event: { clip: Clip }) => ({
      clips: context.clips.map((iterClip) =>
        iterClip === event.clip ? { ...iterClip, saved: true } : iterClip
      ),
    }),
  },
});
