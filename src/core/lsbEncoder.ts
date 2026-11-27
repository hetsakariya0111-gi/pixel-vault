import { Skia, AlphaType, ColorType, ImageFormat } from '@shopify/react-native-skia';
import { framePayloadToBits } from './bitStream';
import { CHANNELS_PER_PIXEL, BitDepthMode } from './protocol';

export interface EncodeResult {
  base64Png: string;
  executionTimeMs: number;
  pixelsModified: number;
  capacityUsedPercent: number;
  bitDepth: BitDepthMode;
}

export function embedPayloadInImage(
  sourceBase64: string,
  encryptedBytes: Uint8Array,
  bitDepth: BitDepthMode = 1
): EncodeResult {
  const startTime = performance.now();

  const skData = Skia.Data.fromBase64(sourceBase64);
  let image = Skia.Image.MakeImageFromEncoded(skData);
  if (!image) {
    throw new Error('Failed to decode cover image via Skia.');
  }

  let width = image.width();
  let height = image.height();
  const bitsToWrite = framePayloadToBits(encryptedBytes, bitDepth);
  const bitsPerPixel = CHANNELS_PER_PIXEL * bitDepth;
  const requiredPixels = Math.ceil(bitsToWrite.length / bitsPerPixel) + 1024;

  // Auto-upscale cover image if its resolution is too small for the payload
  if (width * height < requiredPixels) {
    const scaleFactor = Math.ceil(Math.sqrt(requiredPixels / (width * height)) * 105) / 100;
    const newWidth = Math.min(Math.ceil(width * scaleFactor), 8192);
    const newHeight = Math.min(Math.ceil(height * scaleFactor), 8192);

    if (newWidth * newHeight < requiredPixels) {
      throw new Error(
        `Payload exceeds maximum safe 8K texture capacity (${Math.floor((8192 * 8192 * bitsPerPixel) / 8 / 1024 / 1024)} MB in ${bitDepth}-Bit mode).`
      );
    }

    const surface = Skia.Surface.MakeOffscreen(newWidth, newHeight);
    if (!surface) {
      throw new Error('Device memory insufficient to upscale cover image.');
    }
    const canvas = surface.getCanvas();
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, width, height),
      Skia.XYWHRect(0, 0, newWidth, newHeight),
      Skia.Paint()
    );
    image = surface.makeImageSnapshot();
    width = newWidth;
    height = newHeight;
  }

  const maxAvailableBits = width * height * bitsPerPixel;

  const pixelBuffer = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixelBuffer || !(pixelBuffer instanceof Uint8Array)) {
    throw new Error('Unable to extract raw RGBA pixel buffer.');
  }

  let bitCursor = 0;
  let channelsModified = 0;
  const mask = bitDepth === 8 ? 0x00 : (0xff << bitDepth) & 0xff;

  for (let i = 0; i < pixelBuffer.length && bitCursor < bitsToWrite.length; i++) {
    if (i % 4 === 3) continue;

    let chunkVal = 0;
    for (let b = 0; b < bitDepth; b++) {
      chunkVal = (chunkVal << 1) | (bitsToWrite[bitCursor++] ?? 0);
    }
    pixelBuffer[i] = (pixelBuffer[i] & mask) | chunkVal;
    channelsModified++;
  }

  const outData = Skia.Data.fromBytes(pixelBuffer);
  const encodedImage = Skia.Image.MakeImage(
    {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    },
    outData,
    width * 4
  );

  if (!encodedImage) {
    throw new Error('Failed to reconstruct modified pixel buffer into Skia Image.');
  }

  const base64Png = encodedImage.encodeToBase64(ImageFormat.PNG, 100);
  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
  const pixelsModified = Math.ceil(channelsModified / CHANNELS_PER_PIXEL);
  const capacityUsedPercent = Number(
    ((bitsToWrite.length / maxAvailableBits) * 100).toFixed(3)
  );

  return {
    base64Png,
    executionTimeMs,
    pixelsModified,
    capacityUsedPercent,
    bitDepth,
  };
}
