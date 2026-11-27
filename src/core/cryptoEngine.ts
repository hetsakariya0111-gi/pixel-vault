import * as Crypto from 'expo-crypto';

export type DecryptedPayload =
  | { kind: 'text'; text: string }
  | { kind: 'file'; fileName: string; fileBytes: Uint8Array };

async function deriveKeyHex(pin: string, saltHex: string): Promise<string> {
  let currentHash = `${pin}:${saltHex}`;
  for (let i = 0; i < 600; i++) {
    currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      currentHash
    );
  }
  return currentHash;
}

async function computeChecksum4Bytes(data: Uint8Array): Promise<Uint8Array> {
  const sampleStep = Math.max(1, Math.floor(data.length / 4096));
  const sampled: number[] = [];
  for (let i = 0; i < data.length; i += sampleStep) {
    sampled.push(data[i]);
  }
  const hex = `${data.length}:${sampled.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hex);
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    out[i] = parseInt(digest.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function applyXorKeystream(
  input: Uint8Array,
  saltHex: string,
  keyHex: string
): Promise<Uint8Array> {
  const output = new Uint8Array(input.length);
  let blockIndex = 0;
  let keyStream = new Uint8Array(0);

  for (let i = 0; i < input.length; i++) {
    if (i % 64 === 0) {
      const blockDigest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        `${saltHex}:${blockIndex++}:${keyHex}`
      );
      keyStream = new Uint8Array(64);
      for (let j = 0; j < 64; j++) {
        keyStream[j] = parseInt(blockDigest.slice(j * 2, j * 2 + 2), 16);
      }
      if (blockIndex % 150 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    output[i] = input[i] ^ keyStream[i % 64];
  }

  return output;
}

async function encryptRawEnvelope(envelopeBytes: Uint8Array, masterPin: string): Promise<Uint8Array> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const keyHex = await deriveKeyHex(masterPin, saltHex);
  const checksum = await computeChecksum4Bytes(envelopeBytes);

  const payloadWithCheck = new Uint8Array(4 + envelopeBytes.length);
  payloadWithCheck.set(checksum, 0);
  payloadWithCheck.set(envelopeBytes, 4);

  const cipherBytes = await applyXorKeystream(payloadWithCheck, saltHex, keyHex);

  const output = new Uint8Array(16 + cipherBytes.length);
  output.set(saltBytes, 0);
  output.set(cipherBytes, 16);
  return output;
}

export async function encryptSecret(plainText: string, masterPin: string): Promise<Uint8Array> {
  const textBytes = new TextEncoder().encode(plainText);
  const envelope = new Uint8Array(1 + textBytes.length);
  envelope.set([0x01], 0);
  envelope.set(textBytes, 1);
  return encryptRawEnvelope(envelope, masterPin);
}

export async function encryptFilePayload(
  fileName: string,
  fileBytes: Uint8Array,
  masterPin: string
): Promise<Uint8Array> {
  const nameBytes = new TextEncoder().encode(fileName);
  const nameLen = Math.min(nameBytes.length, 255);
  const envelope = new Uint8Array(2 + nameLen + fileBytes.length);

  envelope.set([0x02, nameLen], 0);
  envelope.set(nameBytes.slice(0, nameLen), 2);
  envelope.set(fileBytes, 2 + nameLen);

  return encryptRawEnvelope(envelope, masterPin);
}

export async function decryptUniversalPayload(
  encryptedBuffer: Uint8Array,
  masterPin: string
): Promise<DecryptedPayload> {
  if (encryptedBuffer.length < 22) {
    throw new Error('Corrupted or invalid encrypted payload.');
  }

  const saltBytes = encryptedBuffer.slice(0, 16);
  const cipherBytes = encryptedBuffer.slice(16);
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const keyHex = await deriveKeyHex(masterPin, saltHex);
  const decryptedBytes = await applyXorKeystream(cipherBytes, saltHex, keyHex);

  const expectedChecksum = decryptedBytes.slice(0, 4);
  const envelope = decryptedBytes.slice(4);
  const actualChecksum = await computeChecksum4Bytes(envelope);

  for (let i = 0; i < 4; i++) {
    if (expectedChecksum.at(i) !== actualChecksum.at(i)) {
      throw new Error('Wrong Master PIN! Decryption integrity check failed.');
    }
  }

  const kindFlag = envelope.at(0);
  if (kindFlag === 0x02) {
    const nameLen = envelope.at(1) ?? 0;
    const fileName = new TextDecoder().decode(envelope.slice(2, 2 + nameLen)) || 'recovered_file';
    const fileBytes = envelope.slice(2 + nameLen);
    return { kind: 'file', fileName, fileBytes };
  }

  const textBytes = kindFlag === 0x01 ? envelope.slice(1) : envelope;
  const text = new TextDecoder('utf-8', { fatal: true }).decode(textBytes);
  return { kind: 'text', text };
}
