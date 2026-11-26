import React, { useState } from 'react';
import {
  View,
  Text,
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
import { readImageAsBase64 } from '../../src/core/fileHelper';
import { extractPayloadFromImage } from '../../src/core/lsbDecoder';
import { decryptSecret } from '../../src/core/cryptoEngine';

export default function RevealSecretScreen() {
  const [stegoImage, setStegoImage] = useState<SelectedImageInfo | null>(null);
  const [masterPin, setMasterPin] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [revealedText, setRevealedText] = useState<string | null>(null);

  const handleExtractSecret = async () => {
    if (!stegoImage) {
      Alert.alert('Missing PNG', 'Please select a Stego-PNG image to inspect.');
      return;
    }
    if (masterPin.length < 4) {
      Alert.alert('Invalid PIN', 'Enter the Master PIN used when encoding this image.');
      return;
    }

    try {
      setIsDecrypting(true);
      setRevealedText(null);

      // 1. Read PNG as Base64
      const base64Png = await readImageAsBase64(stegoImage.uri);

      // 2. Extract framed binary payload from LSB pixels
      const encryptedBytes = extractPayloadFromImage(base64Png);

      // 3. Decrypt using Master PIN
      const plainText = await decryptSecret(encryptedBytes, masterPin);
      setRevealedText(plainText);
    } catch (error: any) {
      Alert.alert(
        'Extraction Failed',
        error?.message || 'Wrong PIN, corrupted image, or JPEG compression stripped the LSB data.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ImageDropzone
        imageInfo={stegoImage}
        title="Tap to Select Stego-PNG Image"
        onImagePicked={(info) => {
          setStegoImage(info);
          setRevealedText(null);
        }}
      />

      <PinField
        label="Decryption Master PIN"
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
            <Ionicons name="key" size={20} color={COLORS.background} />
            <Text style={styles.primaryBtnText}>Extract & Decrypt Secret</Text>
          </>
        )}
      </TouchableOpacity>

      {revealedText !== null && (
        <View style={styles.secretBox}>
          <View style={styles.secretHeader}>
            <Ionicons name="lock-open-outline" size={18} color={COLORS.primary} />
            <Text style={styles.secretTitle}>Decrypted Payload</Text>
          </View>
          <Text selectable style={styles.secretOutput}>
            {revealedText}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 40 },
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
  secretHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  secretTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginLeft: 6 },
  secretOutput: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 22 },
});
