import { createStore } from "@xstate/store";

export class ImageData {
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

export const imageStore = createStore({
  context: {
    images: [] as ImageData[],
  },
  on: {
    add: (context, event: { image: string; name?: string }) => ({
      images: [
        ...context.images,
        {
          url: event.image,
          name: event.name,
          saveState: "unsaved",
          isSelected: false,
        } as ImageData,
      ],
    }),

    remove: (context, event: { image: ImageData }) => ({
      images: context.images.filter((iterimage) => iterimage !== event.image),
    }),

    select: (context, event: { image: ImageData }) => ({
      images: context.images.map((iterimage) =>
        iterimage === event.image
          ? { ...iterimage, isSelected: true }
          : { ...iterimage, isSelected: false }
      ),
    }),

    save: (context, event: { image: ImageData }) => ({
      images: context.images.map((iterimage) =>
        iterimage === event.image ? { ...iterimage, saved: true } : iterimage
      ),
    }),
  },
});
