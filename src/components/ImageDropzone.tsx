import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export interface SelectedImageInfo {
  uri: string;
  width: number;
  height: number;
  maxCapacityKB: string;
}

interface ImageDropzoneProps {
  imageInfo: SelectedImageInfo | null;
  onImagePicked: (info: SelectedImageInfo) => void;
  title?: string;
}

export function ImageDropzone({
  imageInfo,
  onImagePicked,
  title = 'Tap to Select Cover Image',
}: ImageDropzoneProps) {
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1, // 100% original quality needed
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      // Calculate total bytes and convert to KB
      const totalBytes = Math.floor((asset.width * asset.height * 3) / 8) - 7;
      const maxCapacityKB = (totalBytes / 1024).toFixed(1);

      onImagePicked({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        maxCapacityKB,
      });
    }
  };

  return (
    <TouchableOpacity style={styles.box} onPress={handlePickImage} activeOpacity={0.8}>
      {imageInfo ? (
        <View style={styles.previewWrapper}>
          <Image source={{ uri: imageInfo.uri }} style={styles.thumbnail} resizeMode="cover" />
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>Image Loaded</Text>
            <Text style={styles.metaText}>
              Resolution: {imageInfo.width} × {imageInfo.height} px
            </Text>
            <Text style={styles.capacityText}>
              Max Secret Capacity: ~{imageInfo.maxCapacityKB} KB
            </Text>
            <Text style={styles.changeHint}>Tap to change image</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="image-outline" size={40} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptySub}>Supports PNG / JPG (Output saved as Lossless PNG)</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 10 },
  emptySub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  previewWrapper: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 84, height: 84, borderRadius: 12, backgroundColor: COLORS.background },
  meta: { flex: 1, marginLeft: 14 },
  metaTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  metaText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  capacityText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },
  changeHint: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
});
