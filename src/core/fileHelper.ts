import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function readImageAsBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function saveAndShareStegoPng(base64Png: string): Promise<string> {
  const fileName = `pixel_vault_${Date.now()}.png`;

  // 1. Android માટે: સીધું ફોનના Downloads / કોઈ પણ ફોલ્ડરમાં સેવ કરવાનું ઓફિશિયલ "Save As" બોક્સ ખોલો
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

      return savedUri;
    }
  }

  // 2. Fallback (iOS અથવા જો યુઝર ફોલ્ડર કેન્સલ કરે તો)
  const fallbackUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fallbackUri, base64Png, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fallbackUri, {
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  }

  return fallbackUri;
}
