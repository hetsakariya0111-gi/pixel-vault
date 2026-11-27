import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { usePreventScreenCapture } from 'expo-screen-capture';
import Aptabase from '@aptabase/react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { ImageDropzone, SelectedImageInfo } from '../../src/components/ImageDropzone';
import { PinField } from '../../src/components/PinField';
import { readImageAsBase64, exportRecoveredFile } from '../../src/core/fileHelper';
import { extractPayloadFromImage } from '../../src/core/lsbDecoder';
import { decryptUniversalPayload, DecryptedPayload } from '../../src/core/cryptoEngine';

const Icon = Ionicons as any;

export default function RevealSecretScreen() {
  usePreventScreenCapture();

  const [stegoImage, setStegoImage] = useState<SelectedImageInfo | null>(null);
  const [masterPin, setMasterPin] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [revealedPayload, setRevealedPayload] = useState<DecryptedPayload | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExtractSecret = async () => {
    if (!stegoImage) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing PNG', 'Please select a Stego-PNG image to inspect.');
      return;
    }
    if (masterPin.length < 4 || masterPin.length > 8) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid PIN', 'Master PIN must be between 4 and 8 digits.');
      return;
    }

    try {
      setIsDecrypting(true);
      setRevealedPayload(null);
      setCopied(false);

      const base64Png = await readImageAsBase64(stegoImage.uri, stegoImage.base64);

      const encryptedBytes = extractPayloadFromImage(base64Png);
      const decoded = await decryptUniversalPayload(encryptedBytes, masterPin);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Aptabase.trackEvent('secret_revealed', { kind: decoded.kind });

      setStegoImage(null);
      setMasterPin('');
      setRevealedPayload(decoded);
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Extraction Failed',
        error?.message || 'Wrong PIN, corrupted image, or JPEG compression stripped the LSB data.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopyText = async () => {
    if (revealedPayload?.kind !== 'text') return;
    await Clipboard.setStringAsync(revealedPayload.text);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <ImageDropzone
          mode="stego"
          imageInfo={stegoImage}
          title="Tap to Select Stego-PNG Image"
          onImagePicked={(info) => {
            setStegoImage(info);
            setRevealedPayload(null);
          }}
        />

        <PinField
          label="Decryption Master PIN (4–8 Digits)"
          value={masterPin}
          onChangeText={setMasterPin}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, isDecrypting && styles.disabledBtn]}
          onPress={handleExtractSecret}
          disabled={isDecrypting}
        >
          {isDecrypting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Icon name="key" size={20} color={COLORS.background} />
              <Text style={styles.primaryBtnText}>Extract & Decrypt Secret</Text>
            </>
          )}
        </TouchableOpacity>

        {revealedPayload !== null && (
          <View style={styles.secretBox}>
            <View style={styles.secretHeader}>
              <View style={styles.secretTitleRow}>
                <Icon name="lock-open-outline" size={18} color={COLORS.primary} />
                <Text style={styles.secretTitle}>
                  {revealedPayload.kind === 'text' ? 'Decrypted Text' : 'Recovered Secret File'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {revealedPayload.kind === 'text' && (
                  <TouchableOpacity onPress={handleCopyText} style={styles.smallBtn}>
                    <Icon
                      name={copied ? 'checkmark-outline' : 'copy-outline'}
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.smallBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setRevealedPayload(null)}
                  style={[styles.smallBtn, styles.clearBtn]}
                >
                  <Icon name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={[styles.smallBtnText, { color: COLORS.danger }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {revealedPayload.kind === 'text' ? (
              <Text selectable style={styles.secretOutput}>
                {revealedPayload.text}
              </Text>
            ) : (
              <View style={styles.fileCard}>
                <Icon name="document-text-outline" size={38} color={COLORS.primary} />
                <Text style={styles.fileNameText}>{revealedPayload.fileName}</Text>
                <Text style={styles.fileSizeText}>
                  Size: {(revealedPayload.fileBytes.length / 1024).toFixed(1)} KB
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { width: '100%' }]}
                  onPress={() =>
                    exportRecoveredFile(revealedPayload.fileName, revealedPayload.fileBytes)
                  }
                >
                  <Icon name="download-outline" size={20} color={COLORS.background} />
                  <Text style={styles.primaryBtnText}>Save / Open Recovered File</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 48 },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: COLORS.background, fontSize: 16, fontWeight: '800' },
  secretBox: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  secretHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  secretTitleRow: { flexDirection: 'row', alignItems: 'center' },
  secretTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginLeft: 6 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  clearBtn: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  smallBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  secretOutput: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 22 },
  fileCard: { alignItems: 'center', paddingVertical: 8 },
  fileNameText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 8 },
  fileSizeText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 14 },
});
