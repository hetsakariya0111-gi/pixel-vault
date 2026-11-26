import { Skia, AlphaType, ColorType, ImageFormat } from '@shopify/react-native-skia';
import { framePayloadToBits } from './bitStream';
import { STEGO_PROTOCOL } from './protocol';

export interface EncodeResult {
  base64Png: string;
  pixelsModified: number;
  capacityUsedPercent: number;
  executionTimeMs: number;
}

export function embedPayloadInImage(
  sourceImageBase64: string,
  encryptedPayload: Uint8Array
): EncodeResult {
  const startTime = performance.now();

  const skData = Skia.Data.fromBase64(sourceImageBase64);
  const image = Skia.Image.MakeImageFromEncoded(skData);
  if (!image) {
    throw new Error('Failed to decode source image via Skia.');
  }

  const width = image.width();
  const height = image.height();
  const totalPixels = width * height;

  const payloadBits = framePayloadToBits(encryptedPayload);
  const maxAvailableBits = totalPixels * STEGO_PROTOCOL.BITS_PER_PIXEL;

  if (payloadBits.length > maxAvailableBits) {
    throw new Error(
      `Payload too large! Needs ${payloadBits.length} bits, image only holds ${maxAvailableBits} bits.`
    );
  }

  const pixelBytes = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixelBytes || !(pixelBytes instanceof Uint8Array)) {
    throw new Error('Unable to read raw RGBA pixel buffer.');
  }

  let bitCursor = 0;
  const totalBitsToWrite = payloadBits.length;

  for (let i = 0; i < pixelBytes.length && bitCursor < totalBitsToWrite; i++) {
    if (i % 4 === 3) continue; // Skip Alpha channel
    pixelBytes[i] = (pixelBytes[i] & 0xfe) | payloadBits[bitCursor];
    bitCursor++;
  }

  const modifiedData = Skia.Data.fromBytes(pixelBytes);
  const encodedImage = Skia.Image.MakeImage(
    {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    },
    modifiedData,
    width * 4
  );

  if (!encodedImage) {
    throw new Error('Failed to reconstruct encoded Skia image.');
  }

  const base64Png = encodedImage.encodeToBase64(ImageFormat.PNG, 100);
  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    base64Png,
    pixelsModified: Math.ceil(totalBitsToWrite / 3),
    capacityUsedPercent: Number(((totalBitsToWrite / maxAvailableBits) * 100).toFixed(2)),
    executionTimeMs,
  };
}
