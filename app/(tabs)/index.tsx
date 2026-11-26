import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { ImageDropzone, SelectedImageInfo } from '../../src/components/ImageDropzone';
import { PinField } from '../../src/components/PinField';
import { BenchmarkBadge } from '../../src/components/BenchmarkBadge';
import { readImageAsBase64, saveAndShareStegoPng } from '../../src/core/fileHelper';
import { encryptSecret } from '../../src/core/cryptoEngine';
import { embedPayloadInImage, EncodeResult } from '../../src/core/lsbEncoder';

export default function HideSecretScreen() {
  const [imageInfo, setImageInfo] = useState<SelectedImageInfo | null>(null);
  const [secretText, setSecretText] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EncodeResult | null>(null);

  const handleEmbedAndExport = async () => {
    if (!imageInfo) {
      Alert.alert('Missing Image', 'Please select a cover image first.');
      return;
    }
    if (!secretText.trim()) {
      Alert.alert('Missing Secret', 'Please enter a password, seed phrase, or note to hide.');
      return;
    }
    if (masterPin.length < 4) {
      Alert.alert('Weak PIN', 'Please enter at least a 4-digit Master PIN.');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);

      // 1. Read image into Base64
      const sourceBase64 = await readImageAsBase64(imageInfo.uri);

      // 2. Encrypt plaintext with Zero-Knowledge Master PIN
      const encryptedBytes = await encryptSecret(secretText, masterPin);

      // 3. Embed encrypted bits into Skia RGBA pixel buffer
      const encodeOutput = embedPayloadInImage(sourceBase64, encryptedBytes);
      setResult(encodeOutput);

      // 4. Save as Lossless PNG & trigger native Share sheet
      await saveAndShareStegoPng(encodeOutput.base64Png);
    } catch (error: any) {
      Alert.alert('Encoding Failed', error?.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ImageDropzone
        imageInfo={imageInfo}
        onImagePicked={(info) => {
          setImageInfo(info);
          setResult(null);
        }}
      />

      <Text style={styles.label}>Secret Payload (Zero-Knowledge)</Text>
      <TextInput
        style={styles.textArea}
        value={secretText}
        onChangeText={setSecretText}
        placeholder="Enter passwords, recovery keys, or confidential notes..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <PinField
        label="Master Encryption PIN (Never Saved)"
        value={masterPin}
        onChangeText={setMasterPin}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, isProcessing && styles.disabledBtn]}
        onPress={handleEmbedAndExport}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.background} />
            <Text style={styles.primaryBtnText}>Encrypt & Embed in Pixels</Text>
          </>
        )}
      </TouchableOpacity>

      {result && (
        <BenchmarkBadge
          executionTimeMs={result.executionTimeMs}
          pixelsModified={result.pixelsModified}
          capacityUsedPercent={result.capacityUsedPercent}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 40 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  textArea: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    minHeight: 110,
    marginBottom: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
});
