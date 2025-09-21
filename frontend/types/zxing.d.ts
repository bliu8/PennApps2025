declare module '@zxing/library' {
  export class BrowserMultiFormatReader {
    constructor();
    decodeFromImageElement(imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<Result>;
    reset(): void;
    hints: any;
  }

  export class Result {
    getText(): string;
    getBarcodeFormat(): BarcodeFormat;
  }

  export class BarcodeFormat {
    toString(): string;
  }
}
