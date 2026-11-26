import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';
import { bitsToBytes } from './bitStream';
import { STEGO_PROTOCOL } from './protocol';

export function extractPayloadFromImage(stegoImageBase64: string): Uint8Array {
  const skData = Skia.Data.fromBase64(stegoImageBase64);
  const image = Skia.Image.MakeImageFromEncoded(skData);
  if (!image) {
    throw new Error('Failed to decode PNG image.');
  }

  const width = image.width();
  const height = image.height();

  const pixelBytes = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixelBytes || !(pixelBytes instanceof Uint8Array)) {
    throw new Error('Unable to read pixel buffer.');
  }

  let byteIndex = 0;
  const readBits = (count: number): Uint8Array => {
    const outBits = new Uint8Array(count);
    let collected = 0;

    while (collected < count && byteIndex < pixelBytes.length) {
      if (byteIndex % 4 !== 3) {
        outBits[collected++] = pixelBytes[byteIndex] & 1;
      }
      byteIndex++;
    }

    if (collected < count) {
      throw new Error('Unexpected end of image buffer while reading hidden bits.');
    }
    return outBits;
  };

  // 1. Read 56-bit (7-byte) Header first
  const headerBits = readBits(STEGO_PROTOCOL.TOTAL_HEADER_BYTES * 8);
  const headerBytes = bitsToBytes(headerBits);

  // 2. Verify Magic Signature ("SEC")
  for (let i = 0; i < STEGO_PROTOCOL.MAGIC_BYTES.length; i++) {
    if (headerBytes[i] !== STEGO_PROTOCOL.MAGIC_BYTES[i]) {
      throw new Error('No hidden vault data found in this image (Invalid Signature).');
    }
  }

  // 3. Read 32-bit Payload Length
  const view = new DataView(headerBytes.buffer);
  const payloadLength = view.getUint32(STEGO_PROTOCOL.MAGIC_BYTES.length, false);

  // 4. Extract exact encrypted payload bits
  const payloadBits = readBits(payloadLength * 8);
  return bitsToBytes(payloadBits);
}
