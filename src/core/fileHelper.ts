import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

export async function readImageAsBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function saveAndShareStegoPng(base64Png: string): Promise<string> {
  const fileName = `pixel_vault_${Date.now()}.png`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  // 1. Write lossless PNG to app storage
  await FileSystem.writeAsStringAsync(fileUri, base64Png, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 2. Save directly to Phone Gallery as uncompressed PNG
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status === 'granted') {
    await MediaLibrary.saveToLibraryAsync(fileUri);
  }

  // 3. Also open Share sheet if user wants to send as Document
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share as Document (Do not send as normal WhatsApp photo)',
      UTI: 'public.png',
    });
  }

  return fileUri;
}
