export interface EditTool {
  /**
   * @param toolData will be a blank object that gets persisted across draw calls, but gets recycled after deactivate
   */
  activate(ctx: EditContext, toolData: any): void;

  /**
   * all draws should be made to invariantCanvas, which will be copied over to the main canvas
   */
  draw(ctx: EditContext, toolData: any): void;

  deactivate(ctx: EditContext, toolData: any): void;
}

/**
 * all coords stored here are in canvas coordinate system
 * all data stored here will be erased when application exits. persistent data should be put in EditData
 */
export class EditContext {
  initialized: boolean = false;

  rulerSize: number = 30;
  canvas!: HTMLCanvasElement;
  invariantCanvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  invariantCtx!: CanvasRenderingContext2D;

  data!: EditData;

  isDragging: boolean = false;
  mousePos?: { x: number; y: number };
  lastMousePos?: { x: number; y: number };
  mousePosPx?: { x: number; y: number };
  lastMousePosPx?: { x: number; y: number };

  currentTool: EditTool | null = null;
  currentToolData: any = {};

  translation: { x: number; y: number } = { x: 0, y: 0 };

  scaleSensitivity: number = 0.005;
  minLogScale: number = Math.log(0.02);
  maxLogScale: number = Math.log(128);
  scaleStepSize: number = 0.5;
  _logScale: number = 0;
  get logScale() {
    return this._logScale;
  }
  set logScale(value: number) {
    this._logScale = Math.min(
      this.maxLogScale,
      Math.max(this.minLogScale, value)
    );
  }
  get scale() {
    return Math.exp(this.logScale);
  }

  animationFrameId?: number;

  listeners: { [key: string]: ((e: any) => void)[] } = {};

  // cache inverted transform computation for better performance
  _invertedTransformParams: { x: number; y: number; scale: number } = {
    x: 0,
    y: 0,
    scale: 1,
  };
  _invertedTransform?: DOMMatrix;
  get invertedTransform() {
    if (
      !this._invertedTransform ||
      this.translation.x !== this._invertedTransformParams.x ||
      this.translation.y !== this._invertedTransformParams.y ||
      this.scale !== this._invertedTransformParams.scale
    ) {
      this.ctx.save();
      this.ctx.translate(this.translation.x, this.translation.y);
      this.ctx.scale(this.scale, this.scale);
      this._invertedTransform = this.ctx.getTransform().inverse();
      this.ctx.restore();

      this._invertedTransformParams = {
        x: this.translation.x,
        y: this.translation.y,
        scale: this.scale,
      };
    }
    return this._invertedTransform;
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.invariantCanvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    const invariantCtx = this.invariantCanvas.getContext("2d")!;
    if (!ctx || !invariantCtx) {
      throw new Error("Failed to get canvas context");
    }
    this.ctx = ctx;
    this.invariantCtx = invariantCtx;

    this.ctx.imageSmoothingEnabled = false;

    this._attachListeners();

    this.initialized = true;
  }

  setImage(image: HTMLImageElement) {
    this.cancelAnimationFrame();

    this.invariantCanvas.width = image.width;
    this.invariantCanvas.height = image.height;
    this.invariantCtx.drawImage(image, 0, 0);

    this.translation = {
      x: this.canvas.width / 2 - image.width / 2,
      y: this.canvas.height / 2 - image.height / 2,
    };

    return this.invariantCtx.getImageData(0, 0, image.width, image.height);
  }

  _onEvent = (e: any) => {
    const listeners = this.listeners[e.type];
    if (listeners) {
      for (const listener of listeners) {
        listener(e);
      }
    }
  };

  _attachListeners() {
    this.canvas.addEventListener("mousedown", this._onEvent);
    this.canvas.addEventListener("mousemove", this._onEvent);
    this.canvas.addEventListener("mouseup", this._onEvent);
    this.canvas.addEventListener("mouseleave", this._onEvent);

    this.subscribe("mousedown", (e: MouseEvent) => {
      this.isDragging = true;
      this.mousePos = this._applyTransform(
        { x: e.offsetX, y: e.offsetY },
        this.invertedTransform
      );
      this.mousePosPx = { x: e.offsetX, y: e.offsetY };
    });

    this.subscribe("mousemove", (e: MouseEvent) => {
      this.lastMousePos = this.mousePos;
      this.lastMousePosPx = this.mousePosPx;

      this.mousePos = this._applyTransform(
        { x: e.offsetX, y: e.offsetY },
        this.invertedTransform
      );
      this.mousePosPx = { x: e.offsetX, y: e.offsetY };
    });

    this.subscribe("mouseup", () => {
      this.isDragging = false;
    });

    this.subscribe("mouseleave", () => {
      this.isDragging = false;

      this.mousePos = undefined;
      this.lastMousePos = undefined;

      this.mousePosPx = undefined;
      this.lastMousePosPx = undefined;
    });
  }

  subscribe(event: string, listener: (e: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  unsubscribe(event: string, listener: (e: any) => void) {
    const listeners = this.listeners[event];
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  _applyTransform(coords: { x: number; y: number }, transform: DOMMatrix) {
    return {
      x: coords.x * transform.a + coords.y * transform.c + transform.e,
      y: coords.x * transform.b + coords.y * transform.d + transform.f,
    };
  }

  isPointInRect = (
    point: { x: number; y: number },
    rect: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  };

  isMouseInRect = (
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean => {
    if (!this.mousePos) {
      return false;
    }
    return this.isPointInRect(this.mousePos, { x, y, width, height });
  };

  drawRulers() {
    // canvas coordinate range that is currently visible
    const canvasLeft = (-this.translation.x + this.rulerSize) / this.scale;
    const canvasTop = (-this.translation.y + this.rulerSize) / this.scale;
    const canvasRight = (this.canvas.width - this.translation.x) / this.scale;
    const canvasBottom = (this.canvas.height - this.translation.y) / this.scale;

    this.ctx.fillStyle = "#1f1f1f";
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;

    // draw horizontal ruler (top)
    this.ctx.fillRect(0, 0, this.canvas.width, this.rulerSize);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.rulerSize);
    this.ctx.lineTo(this.canvas.width, this.rulerSize);
    this.ctx.stroke();

    // draw vertical ruler (left)
    this.ctx.fillRect(0, 0, this.rulerSize, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.moveTo(this.rulerSize, 0);
    this.ctx.lineTo(this.rulerSize, this.canvas.height);
    this.ctx.stroke();

    // draw corner square
    this.ctx.fillRect(0, 0, this.rulerSize + 1, this.rulerSize + 1);

    // Calculate tick spacing based on zoom
    let tickSpacing = 3200; // Base spacing in canvas coordinates
    const scaleTickSpacing = [
      [0.03125, 1600],
      [0.0625, 800],
      [0.125, 400],
      [0.25, 150],
      [0.5, 50],
      [2, 25],
      [4, 10],
      [8, 5],
      [16, 2.5],
      [32, 1.25],
      [64, 0.625],
    ];
    for (const scaleSpacing of scaleTickSpacing) {
      if (this.scale >= scaleSpacing[0]) {
        tickSpacing = scaleSpacing[1];
      }
    }

    // draw horizontal ruler ticks and labels
    this.ctx.fillStyle = "#ccc";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const startX = Math.floor(canvasLeft / tickSpacing) * tickSpacing;
    const endX = Math.ceil(canvasRight / tickSpacing) * tickSpacing;

    for (let x = startX; x <= endX; x += tickSpacing) {
      const screenX = x * this.scale + this.translation.x;
      if (screenX >= this.rulerSize && screenX <= this.canvas.width) {
        // major tick
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, this.rulerSize - 10);
        this.ctx.lineTo(screenX, this.rulerSize);
        this.ctx.stroke();

        // label
        this.ctx.fillText(x.toString(), screenX, this.rulerSize - 15);
      }

      // minor ticks
      for (let i = 1; i < 5; i++) {
        const minorX = x + (tickSpacing * i) / 5;
        const minorScreenX = minorX * this.scale + this.translation.x;
        if (
          minorScreenX >= this.rulerSize &&
          minorScreenX <= this.canvas.width
        ) {
          this.ctx.beginPath();
          this.ctx.moveTo(minorScreenX, this.rulerSize - 5);
          this.ctx.lineTo(minorScreenX, this.rulerSize);
          this.ctx.stroke();
        }
      }
    }

    // Draw vertical ruler ticks and labels
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const startY = Math.floor(canvasTop / tickSpacing) * tickSpacing;
    const endY = Math.ceil(canvasBottom / tickSpacing) * tickSpacing;

    for (let y = startY; y <= endY; y += tickSpacing) {
      const screenY = y * this.scale + this.translation.y;
      if (screenY >= this.rulerSize && screenY <= this.canvas.height) {
        // major tick
        this.ctx.beginPath();
        this.ctx.moveTo(this.rulerSize - 10, screenY);
        this.ctx.lineTo(this.rulerSize, screenY);
        this.ctx.stroke();

        // label (rotated)
        this.ctx.save();
        this.ctx.translate(this.rulerSize - 15, screenY);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(y.toString(), 0, 0);
        this.ctx.restore();
      }

      // Minor ticks
      for (let i = 1; i < 5; i++) {
        const minorY = y + (tickSpacing * i) / 5;
        const minorScreenY = minorY * this.scale + this.translation.y;
        if (
          minorScreenY >= this.rulerSize &&
          minorScreenY <= this.canvas.height
        ) {
          this.ctx.beginPath();
          this.ctx.moveTo(this.rulerSize - 5, minorScreenY);
          this.ctx.lineTo(this.rulerSize, minorScreenY);
          this.ctx.stroke();
        }
      }
    }
  }

  drawInvariant() {
    this.invariantCtx.clearRect(
      0,
      0,
      this.invariantCanvas.width,
      this.invariantCanvas.height
    );
    this.invariantCtx.putImageData(this.data.originalImageData, 0, 0);
  }

  draw = () => {
    this.cancelAnimationFrame();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();

    this.ctx.translate(this.translation.x, this.translation.y);
    this.ctx.scale(this.scale, this.scale);

    // draw invariant
    this.drawInvariant();

    // draw tool specific things
    if (this.currentTool) {
      this.currentTool.draw(this, this.currentToolData);
    }

    // copy to canvas
    const {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    } = this.data.cropBox;
    this.ctx.drawImage(
      this.invariantCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    this.ctx.restore();

    // draw rulers un-transformed
    this.drawRulers();

    this.animationFrameId = requestAnimationFrame(this.draw);
  };

  cancelAnimationFrame() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  setTool(tool: EditTool) {
    this.currentTool = tool;
    this.currentToolData = {};
    this.currentTool.activate(this, this.currentToolData);
  }

  deactivateTool() {
    if (!this.currentTool) return;

    this.currentTool.deactivate(this, this.currentToolData);
    this.currentTool = null;
    this.currentToolData = null;
  }
}

/**
 * each edit context is unique to each image
 * will get persisted to disk
 * similar to .psd files from photoshop
 */
export class EditData {
  originalImageData!: ImageData;
  originalWidth!: number;
  originalHeight!: number;

  // relative to original image
  cropBox!: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  init(imageData: ImageData, width: number, height: number) {
    this.originalImageData = imageData;
    this.originalWidth = width;
    this.originalHeight = height;

    this.cropBox = {
      x: 0,
      y: 0,
      width,
      height,
    };
  }
}
