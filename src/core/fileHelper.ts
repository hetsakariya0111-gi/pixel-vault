import { Alert, Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const pad = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((len * 3) / 4) - pad;
  const bytes = new Uint8Array(Math.max(byteLength, 0));

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = B64_CHARS.indexOf(clean[i]);
    const c2 = B64_CHARS.indexOf(clean[i + 1]);
    const c3 = B64_CHARS.indexOf(clean[i + 2]);
    const c4 = B64_CHARS.indexOf(clean[i + 3]);

    const triplet = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);
    if (p < bytes.length) bytes[p++] = (triplet >> 16) & 0xff;
    if (p < bytes.length) bytes[p++] = (triplet >> 8) & 0xff;
    if (p < bytes.length) bytes[p++] = triplet & 0xff;
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const triplet = (b1 << 16) | (b2 << 8) | b3;
    chunks.push(
      B64_CHARS[(triplet >> 18) & 63],
      B64_CHARS[(triplet >> 12) & 63],
      i + 1 < bytes.length ? B64_CHARS[(triplet >> 6) & 63] : '=',
      i + 2 < bytes.length ? B64_CHARS[triplet & 63] : '='
    );
  }
  return chunks.join('');
}

export async function readFileAsBytes(uri: string): Promise<Uint8Array> {
  if (!uri || typeof uri !== 'string') {
    throw new Error('No valid file selected.');
  }

  try {
    const nativeFile = new File(uri);
    return await nativeFile.bytes();
  } catch {
    try {
      const decodedFile = new File(decodeURI(uri));
      return await decodedFile.bytes();
    } catch {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64ToUint8Array(base64);
    }
  }
}

export async function readImageAsBase64(
  uri: string,
  preloadedBase64?: string | null
): Promise<string> {
  if (preloadedBase64) {
    return preloadedBase64;
  }
  if (!uri) {
    throw new Error('No file selected.');
  }

  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    const bytes = await readFileAsBytes(uri);
    return uint8ArrayToBase64(bytes);
  }
}

export async function saveAndShareStegoPng(base64Png: string): Promise<string> {
  const fileName = `pixel_vault_${Date.now()}.png`;
  const tempShareUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(tempShareUri, base64Png, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (permissions.granted) {
      const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'image/png'
      );

      await FileSystem.writeAsStringAsync(savedUri, base64Png, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert(
        'Stego-PNG Saved! ✅',
        'Saved losslessly to your selected folder. Send strictly as a Document on WhatsApp/Telegram to preserve pixels.',
        [
          { text: 'Done', style: 'cancel' },
          {
            text: 'Share as Document',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(tempShareUri, {
                  mimeType: 'image/png',
                  dialogTitle: 'Send as Document (Do not send as compressed photo)',
                  UTI: 'public.png',
                });
              }
            },
          },
        ]
      );

      return savedUri;
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(tempShareUri, {
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  }

  return tempShareUri;
}

export async function exportRecoveredFile(fileName: string, fileBytes: Uint8Array): Promise<void> {
  const base64 = uint8ArrayToBase64(fileBytes);
  const outUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(outUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(outUri, {
      dialogTitle: `Save or Open ${fileName}`,
    });
  }
}
