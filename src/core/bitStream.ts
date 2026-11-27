import { STEGO_MAGIC, HEADER_BYTE_LENGTH, BitDepthMode } from './protocol';

export function framePayloadToBits(encryptedBytes: Uint8Array, bitDepth: BitDepthMode = 1): number[] {
  const totalBytes = HEADER_BYTE_LENGTH + encryptedBytes.length;
  const framedBuffer = new Uint8Array(totalBytes);

  framedBuffer.set(STEGO_MAGIC, 0);
  framedBuffer.set([bitDepth], 3);

  const view = new DataView(framedBuffer.buffer);
  view.setUint32(4, encryptedBytes.length, false);

  framedBuffer.set(encryptedBytes, HEADER_BYTE_LENGTH);

  const bits: number[] = new Array(totalBytes * 8);
  let bitIdx = 0;

  for (let byteIdx = 0; byteIdx < totalBytes; byteIdx++) {
    const byte = framedBuffer[byteIdx];
    for (let bitPos = 7; bitPos >= 0; bitPos--) {
      bits[bitIdx++] = (byte >> bitPos) & 1;
    }
  }

  return bits;
}

export function bitsToBytes(bits: number[]): Uint8Array {
  const byteCount = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < byteCount; i++) {
    let val = 0;
    for (let bit = 0; bit < 8; bit++) {
      val = (val << 1) | (bits[i * 8 + bit] & 1);
    }
    bytes[i] = val;
  }

  return bytes;
}
