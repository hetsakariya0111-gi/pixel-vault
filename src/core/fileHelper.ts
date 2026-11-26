import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Reads any local image URI into a Base64 string for Skia decoding
 */
export async function readImageAsBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Writes encoded Base64 PNG to disk as a lossless .png file and opens native Share sheet
 */
export async function saveAndShareStegoPng(base64Png: string): Promise<string> {
  const fileName = `pixel_vault_${Date.now()}.png`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64Png, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Lossless Stego PNG (Send as Document to preserve pixels)',
      UTI: 'public.png',
    });
  }

  return fileUri;
}
