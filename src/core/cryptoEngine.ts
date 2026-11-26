import * as Crypto from 'expo-crypto';

async function deriveKeyBytes(pin: string, saltHex: string): Promise<Uint8Array> {
  let currentHash = `${pin}:${saltHex}`;
  for (let i = 0; i < 1000; i++) {
    currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      currentHash
    );
  }
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(currentHash.slice(i * 2, i * 2 + 2), 16);
  }
  return keyBytes;
}

export async function encryptSecret(plainText: string, masterPin: string): Promise<Uint8Array> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const keyBytes = await deriveKeyBytes(masterPin, saltHex);
  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(plainText);

  const cipherBytes = new Uint8Array(plainBytes.length);
  let blockIndex = 0;
  let keyStream = new Uint8Array(0);

  for (let i = 0; i < plainBytes.length; i++) {
    if (i % 32 === 0) {
      const blockDigest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${saltHex}:${blockIndex++}:${Array.from(keyBytes).join(',')}`
      );
      keyStream = new Uint8Array(32);
      for (let j = 0; j < 32; j++) {
        keyStream[j] = parseInt(blockDigest.slice(j * 2, j * 2 + 2), 16);
      }
    }
    cipherBytes[i] = plainBytes[i] ^ keyStream[i % 32];
  }

  const output = new Uint8Array(16 + cipherBytes.length);
  output.set(saltBytes, 0);
  output.set(cipherBytes, 16);
  return output;
}

export async function decryptSecret(encryptedBuffer: Uint8Array, masterPin: string): Promise<string> {
  if (encryptedBuffer.length < 17) {
    throw new Error('Corrupted or invalid encrypted payload.');
  }

  const saltBytes = encryptedBuffer.slice(0, 16);
  const cipherBytes = encryptedBuffer.slice(16);
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const keyBytes = await deriveKeyBytes(masterPin, saltHex);
  const plainBytes = new Uint8Array(cipherBytes.length);
  let blockIndex = 0;
  let keyStream = new Uint8Array(0);

  for (let i = 0; i < cipherBytes.length; i++) {
    if (i % 32 === 0) {
      const blockDigest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${saltHex}:${blockIndex++}:${Array.from(keyBytes).join(',')}`
      );
      keyStream = new Uint8Array(32);
      for (let j = 0; j < 32; j++) {
        keyStream[j] = parseInt(blockDigest.slice(j * 2, j * 2 + 2), 16);
      }
    }
    plainBytes[i] = cipherBytes[i] ^ keyStream[i % 32];
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  return decoder.decode(plainBytes);
}
