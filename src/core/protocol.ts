export const STEGO_PROTOCOL = {
  // 3-byte Magic Signature: "SEC" (0x53, 0x45, 0x43)
  MAGIC_BYTES: new Uint8Array([0x53, 0x45, 0x43]),
  HEADER_LENGTH_BYTES: 4, // 32-bit unsigned integer for payload byte length
  TOTAL_HEADER_BYTES: 7,  // 3 (Magic) + 4 (Length) = 7 bytes (56 bits)
  BITS_PER_PIXEL: 3,      // R, G, B channels only (Skip Alpha channel)
} as const;
