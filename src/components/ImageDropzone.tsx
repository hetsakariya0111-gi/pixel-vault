import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const Icon = Ionicons as any;

export interface SelectedImageInfo {
  uri: string;
  base64?: string | null;
  width: number;
  height: number;
  maxCapacityKB: string;
}

interface ImageDropzoneProps {
  imageInfo: SelectedImageInfo | null;
  onImagePicked: (info: SelectedImageInfo) => void;
  title?: string;
  mode?: 'cover' | 'stego';
}

export function ImageDropzone({
  imageInfo,
  onImagePicked,
  title = 'Tap to Select Cover Image',
  mode = 'cover',
}: ImageDropzoneProps) {
  const handlePickGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      base64: true,
    });

    const asset = result.assets?.at(0);
    if (!result.canceled && asset) {
      const totalBytes = Math.floor((asset.width * asset.height * 3) / 8) - 8;
      onImagePicked({
        uri: asset.uri,
        base64: asset.base64 ?? null,
        width: asset.width,
        height: asset.height,
        maxCapacityKB: (totalBytes / 1024).toFixed(1),
      });
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/png', 'image/*'],
      copyToCacheDirectory: true,
    });

    const file = result.assets?.at(0);
    if (!result.canceled && file) {
      Image.getSize(file.uri, (width, height) => {
        const totalBytes = Math.floor((width * height * 3) / 8) - 8;
        onImagePicked({
          uri: file.uri,
          base64: null,
          width,
          height,
          maxCapacityKB: (totalBytes / 1024).toFixed(1),
        });
      });
    }
  };

  if (mode === 'stego') {
    return (
      <View style={styles.box}>
        {imageInfo ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: imageInfo.uri }} style={styles.thumbnail} resizeMode="cover" />
            <View style={styles.meta}>
              <Text style={styles.metaTitle}>Stego Image Loaded</Text>
              <Text style={styles.metaText}>
                Resolution: {imageInfo.width} × {imageInfo.height} px
              </Text>
              <Text style={styles.capacityText}>
                Max Capacity: ~{imageInfo.maxCapacityKB} KB
              </Text>
              <View style={styles.stegoBtnRow}>
                <TouchableOpacity style={styles.miniBtn} onPress={handlePickDocument}>
                  <Icon name="document-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.miniBtnText}>Files</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={handlePickGallery}>
                  <Icon name="images-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.miniBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="document-lock-outline" size={38} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySub}>
              Use Files / Downloads for lossless PNGs, or Gallery if saved locally
            </Text>
            <View style={styles.stegoBtnRow}>
              <TouchableOpacity style={styles.miniBtn} onPress={handlePickDocument}>
                <Icon name="document-attach-outline" size={16} color={COLORS.primary} />
                <Text style={styles.miniBtnText}>Files / Downloads</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniBtn} onPress={handlePickGallery}>
                <Icon name="images-outline" size={16} color={COLORS.primary} />
                <Text style={styles.miniBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.box} onPress={handlePickGallery} activeOpacity={0.8}>
      {imageInfo ? (
        <View style={styles.previewWrapper}>
          <Image source={{ uri: imageInfo.uri }} style={styles.thumbnail} resizeMode="cover" />
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>Cover Image Loaded</Text>
            <Text style={styles.metaText}>
              Resolution: {imageInfo.width} × {imageInfo.height} px
            </Text>
            <Text style={styles.capacityText}>
              Max Secret Capacity: ~{imageInfo.maxCapacityKB} KB
            </Text>
            <Text style={styles.changeHint}>Tap to change photo</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="image-outline" size={40} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptySub}>Pick any Gallery Photo (Exported as Lossless PNG)</Text>
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
  emptyState: { alignItems: 'center', paddingVertical: 14 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 10 },
  emptySub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  previewWrapper: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 84, height: 84, borderRadius: 12, backgroundColor: COLORS.background },
  meta: { flex: 1, marginLeft: 14 },
  metaTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  metaText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  capacityText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },
  changeHint: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  stegoBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  miniBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
});
