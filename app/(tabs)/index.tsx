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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import Aptabase from '@aptabase/react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { ImageDropzone, SelectedImageInfo } from '../../src/components/ImageDropzone';
import { PinField } from '../../src/components/PinField';
import { BenchmarkBadge } from '../../src/components/BenchmarkBadge';
import {
  readImageAsBase64,
  readFileAsBytes,
  base64ToUint8Array,
  saveAndShareStegoPng,
} from '../../src/core/fileHelper';
import { encryptSecret, encryptFilePayload } from '../../src/core/cryptoEngine';
import { embedPayloadInImage, EncodeResult } from '../../src/core/lsbEncoder';
import { BitDepthMode } from '../../src/core/protocol';

const Icon = Ionicons as any;

export default function HideSecretScreen() {
  const [imageInfo, setImageInfo] = useState<SelectedImageInfo | null>(null);
  const [payloadType, setPayloadType] = useState<'text' | 'file'>('text');
  const [secretText, setSecretText] = useState('');
  const [secretFile, setSecretFile] = useState<{
    name: string;
    uri: string;
    size: number;
    base64?: string | null;
  } | null>(null);
  const [masterPin, setMasterPin] = useState('');
  const [bitDepth, setBitDepth] = useState<BitDepthMode>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EncodeResult | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const payloadByteCount =
    payloadType === 'text'
      ? new TextEncoder().encode(secretText).length
      : secretFile?.size ?? 0;

   const totalFramedBytes = payloadByteCount + 28;
  const maxBytesForImage = imageInfo
    ? Math.floor((8192 * 8192 * 3 * bitDepth) / 8)
    : 0;
  const usageRatio = maxBytesForImage > 0 ? totalFramedBytes / maxBytesForImage : 0;
  const isOverCapacity = imageInfo !== null && totalFramedBytes > maxBytesForImage;


  const handlePickSecretGalleryPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    const asset = res.assets?.at(0);
    if (!res.canceled && asset) {
      const approxBytes = asset.base64
        ? Math.floor((asset.base64.length * 3) / 4)
        : asset.fileSize ?? 0;
      setSecretFile({
        name: asset.fileName || `secret_photo_${Date.now()}.jpg`,
        uri: asset.uri,
        size: approxBytes,
        base64: asset.base64 ?? null,
      });
      setBitDepth(2);
    }
  };

  const handlePickSecretFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    const f = res.assets?.at(0);
    if (!res.canceled && f) {
      setSecretFile({ name: f.name, uri: f.uri, size: f.size ?? 0, base64: null });
      setBitDepth(2);
    }
  };

  const handleEmbedAndExport = async () => {
    if (!imageInfo) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing Image', 'Please select a cover image first.');
      return;
    }
    if (isOverCapacity) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Capacity Exceeded', 'Switch to 2-Bit High-Capacity mode or pick a larger photo.');
      return;
    }
    if (payloadType === 'text' && !secretText.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing Secret', 'Please enter a text secret to hide.');
      return;
    }
    if (payloadType === 'file' && !secretFile) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing File', 'Please select an Image, PDF, or Document to hide.');
      return;
    }
    if (masterPin.length < 4 || masterPin.length > 8) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid PIN', 'Master PIN must be between 4 and 8 digits.');
      return;
    }

    try {
      setIsProcessing(true);
      setResult(null);

      const sourceBase64 = await readImageAsBase64(imageInfo.uri, imageInfo.base64);

      const secretBytes =
        payloadType === 'file'
          ? secretFile!.base64
            ? base64ToUint8Array(secretFile!.base64)
            : await readFileAsBytes(secretFile!.uri)
          : new Uint8Array(0);

      const encryptedBytes =
        payloadType === 'text'
          ? await encryptSecret(secretText, masterPin)
          : await encryptFilePayload(secretFile!.name, secretBytes, masterPin);

      const encodeOutput = embedPayloadInImage(sourceBase64, encryptedBytes, bitDepth);

      await saveAndShareStegoPng(encodeOutput.base64Png);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Aptabase.trackEvent('secret_embedded', { bit_depth: bitDepth, kind: payloadType });

      setSecretText('');
      setSecretFile(null);
      setMasterPin('');
      setImageInfo(null);
      setResult(encodeOutput);
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Encoding Failed', error?.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };



      return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {showGuide && (
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <View style={styles.guideTitleRow}>
                <Icon name="information-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.guideTitle}>How Zero-Knowledge Embedding Works</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGuide(false)}>
                <Icon name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.guideStep}>1. Pick a cover photo & enter your secret + 4–8 digit PIN.</Text>
            <Text style={styles.guideStep}>2. Save the lossless Stego-PNG to your device folder.</Text>
            <Text style={styles.guideStep}>
              3. Always share strictly as a <Text style={styles.bold}>Document</Text> (never as a compressed photo).
            </Text>
          </View>
        )}

        <ImageDropzone
          mode="cover"
          imageInfo={imageInfo}
          onImagePicked={(info) => {
            setImageInfo(info);
            setResult(null);
          }}
        />

                <Text style={styles.label}>Bit-Plane Embedding Density</Text>
        <View style={styles.modeRow}>
          {([
            { mode: 1 as BitDepthMode, title: '1-Bit Stealth', sub: '1X • Invisible' },
            { mode: 2 as BitDepthMode, title: '2-Bit Dense', sub: '2X • Clean' },
            { mode: 4 as BitDepthMode, title: '4-Bit Nibble', sub: '4X • Subtle Grain' },
            { mode: 8 as BitDepthMode, title: '8-Bit Vault Art', sub: '8X • Max Storage' },
          ]).map((item) => (
            <TouchableOpacity
              key={item.mode}
              style={[styles.modeBtn, bitDepth === item.mode && styles.modeBtnActive]}
              onPress={() => setBitDepth(item.mode)}
            >
              <Text style={[styles.modeTitle, bitDepth === item.mode && styles.modeTitleActive]}>
                {item.title}
              </Text>
              <Text style={styles.modeSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>



        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, payloadType === 'text' && styles.modeBtnActive]}
            onPress={() => setPayloadType('text')}
          >
            <Text style={[styles.modeTitle, payloadType === 'text' && styles.modeTitleActive]}>
              📝 Secret Text
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, payloadType === 'file' && styles.modeBtnActive]}
            onPress={() => setPayloadType('file')}
          >
            <Text style={[styles.modeTitle, payloadType === 'file' && styles.modeTitleActive]}>
              📎 Image / PDF / File
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Secret Payload (Zero-Knowledge)</Text>
          <Text style={[styles.byteCounter, isOverCapacity && { color: COLORS.danger }]}>
            {payloadByteCount} Bytes
          </Text>
        </View>

        {payloadType === 'text' ? (
          <TextInput
            style={[styles.textArea, isOverCapacity && { borderColor: COLORS.danger }]}
            value={secretText}
            onChangeText={setSecretText}
            placeholder="Enter passwords, recovery keys, or confidential notes..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        ) : (
          <View
            style={[
              styles.textArea,
              styles.filePickBox,
              isOverCapacity && { borderColor: COLORS.danger },
            ]}
          >
            {secretFile ? (
              <>
                <Icon name="checkmark-circle" size={28} color={COLORS.primary} />
                <Text style={styles.filePickTitle}>{secretFile.name}</Text>
                <Text style={styles.filePickSub}>
                  {(secretFile.size / 1024).toFixed(1)} KB • Ready to Embed
                </Text>
              </>
            ) : (
              <Text style={styles.filePickTitle}>Choose Secret Media or Document</Text>
            )}

            <View style={styles.pickBtnRow}>
              <TouchableOpacity style={styles.smallPickBtn} onPress={handlePickSecretGalleryPhoto}>
                <Icon name="images-outline" size={16} color={COLORS.primary} />
                <Text style={styles.smallPickText}>Gallery Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.smallPickBtn} onPress={handlePickSecretFile}>
                <Icon name="document-outline" size={16} color={COLORS.primary} />
                <Text style={styles.smallPickText}>PDF / File</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {imageInfo && (
          <View style={styles.capacityCard}>
            <View style={styles.capacityLabelRow}>
              <Text style={styles.capacityLabel}>
                {isOverCapacity ? '⚠️ Payload Exceeds Image Capacity' : 'Buffer Allocation'}
              </Text>
              <Text
                style={[
                  styles.capacityPct,
                  { color: isOverCapacity ? COLORS.danger : COLORS.primary },
                ]}
              >
                {Math.min(usageRatio * 100, 100).toFixed(2)}% ({(maxBytesForImage / 1024).toFixed(1)} KB max)
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(Math.max(usageRatio * 100, 2), 100)}%`,
                    backgroundColor: isOverCapacity ? COLORS.danger : COLORS.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <PinField
          label="Master Encryption PIN (4–8 Digits)"
          value={masterPin}
          onChangeText={setMasterPin}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (isProcessing || isOverCapacity) && styles.disabledBtn]}
          onPress={handleEmbedAndExport}
          disabled={isProcessing || isOverCapacity}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Icon name="shield-checkmark" size={20} color={COLORS.background} />
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
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 48 },
  guideCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  guideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideTitle: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  guideStep: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  bold: { color: COLORS.textPrimary, fontWeight: '700' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  modeBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
  },
  modeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  modeTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  modeTitleActive: { color: COLORS.primary },
  modeSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 3 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  byteCounter: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  textArea: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    minHeight: 110,
    marginBottom: 14,
  },
  filePickBox: { justifyContent: 'center', alignItems: 'center' },
  filePickTitle: { color: COLORS.textPrimary, fontWeight: '700', marginTop: 8 },
  filePickSub: { color: COLORS.primary, fontSize: 12, marginTop: 4 },
  pickBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  smallPickText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  capacityCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  capacityLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  capacityLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  capacityPct: { fontSize: 11, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
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
  disabledBtn: { opacity: 0.5 },
  primaryBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
});
