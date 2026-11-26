import { STEGO_PROTOCOL } from './protocol';

export function framePayloadToBits(encryptedPayload: Uint8Array): Uint8Array {
  const totalBytes = STEGO_PROTOCOL.TOTAL_HEADER_BYTES + encryptedPayload.length;
  const framedBuffer = new Uint8Array(totalBytes);

  // 1. Write Magic Signature ("SEC")
  framedBuffer.set(STEGO_PROTOCOL.MAGIC_BYTES, 0);

  // 2. Write 32-bit Big-Endian Payload Length
  const view = new DataView(framedBuffer.buffer);
  view.setUint32(STEGO_PROTOCOL.MAGIC_BYTES.length, encryptedPayload.length, false);

  // 3. Write Encrypted Payload
  framedBuffer.set(encryptedPayload, STEGO_PROTOCOL.TOTAL_HEADER_BYTES);

  // 4. Convert Bytes -> Bits (MSB first)
  const bits = new Uint8Array(totalBytes * 8);
  let bitIdx = 0;

  for (let i = 0; i < totalBytes; i++) {
    const byte = framedBuffer[i];
    for (let bitPos = 7; bitPos >= 0; bitPos--) {
      bits[bitIdx++] = (byte >> bitPos) & 1;
    }
  }

  return bits;
}

export function bitsToBytes(bits: Uint8Array): Uint8Array {
  const byteLength = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteLength);

  for (let i = 0; i < byteLength; i++) {
    let byte = 0;
    for (let bitPos = 0; bitPos < 8; bitPos++) {
      byte = (byte << 1) | (bits[i * 8 + bitPos] & 1);
    }
    bytes[i] = byte;
  }

  return bytes;
}
