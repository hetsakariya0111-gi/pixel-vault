import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';
import { bitsToBytes } from './bitStream';
import { STEGO_MAGIC, HEADER_BYTE_LENGTH, CHANNELS_PER_PIXEL, BitDepthMode } from './protocol';

export function extractPayloadFromImage(stegoBase64: string): Uint8Array {
  const skData = Skia.Data.fromBase64(stegoBase64);
  const image = Skia.Image.MakeImageFromEncoded(skData);
  if (!image) {
    throw new Error('Failed to decode Stego-PNG image.');
  }

  const width = image.width();
  const height = image.height();

  const pixelBuffer = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!pixelBuffer || !(pixelBuffer instanceof Uint8Array)) {
    throw new Error('Unable to read pixel buffer from image.');
  }

  const readBitsFromBuffer = (bitDepth: BitDepthMode, targetBitCount: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < pixelBuffer.length && out.length < targetBitCount; i++) {
      if (i % 4 === 3) continue;
      for (let b = bitDepth - 1; b >= 0 && out.length < targetBitCount; b--) {
        out.push((pixelBuffer[i] >> b) & 1);
      }
    }
    return out;
  };

  const modes: BitDepthMode[] = Array.of(1, 2, 4, 8);
  let detectedMode: BitDepthMode | null = null;

  for (const mode of modes) {
    const probeBits = readBitsFromBuffer(mode, 32);
    const probeBytes = bitsToBytes(probeBits);
    const magicMatches = STEGO_MAGIC.every((byte, idx) => probeBytes[idx] === byte);

    if (magicMatches && probeBytes.at(3) === mode) {
      detectedMode = mode;
      break;
    }
  }

  if (!detectedMode) {
    throw new Error(
      'Invalid Signature: No hidden vault data found (or image was compressed via JPEG/WhatsApp).'
    );
  }

  const headerBits = readBitsFromBuffer(detectedMode, HEADER_BYTE_LENGTH * 8);
  const headerBytes = bitsToBytes(headerBits);
  const headerView = new DataView(headerBytes.buffer);
  const payloadLength = headerView.getUint32(4, false);

  const maxBytesPossible =
    Math.floor((width * height * CHANNELS_PER_PIXEL * detectedMode) / 8) - HEADER_BYTE_LENGTH;
  if (payloadLength <= 0 || payloadLength > maxBytesPossible) {
    throw new Error('Corrupted payload length header detected.');
  }

  const totalBitsNeeded = (HEADER_BYTE_LENGTH + payloadLength) * 8;
  const allBits = readBitsFromBuffer(detectedMode, totalBitsNeeded);
  const allBytes = bitsToBytes(allBits);

  return allBytes.slice(HEADER_BYTE_LENGTH);
}
