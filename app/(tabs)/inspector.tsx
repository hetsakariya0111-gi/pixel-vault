import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';
import { COLORS } from '../../src/theme/colors';
import { ImageDropzone, SelectedImageInfo } from '../../src/components/ImageDropzone';
import { readImageAsBase64 } from '../../src/core/fileHelper';

interface PixelSample {
  index: number;
  r: number;
  g: number;
  b: number;
  rBin: string;
  gBin: string;
  bBin: string;
}

export default function BitInspectorScreen() {
  const [imageInfo, setImageInfo] = useState<SelectedImageInfo | null>(null);
  const [samples, setSamples] = useState<PixelSample[]>([]);
  const [hasValidSignature, setHasValidSignature] = useState<boolean | null>(null);

  const inspectImageBuffer = async (info: SelectedImageInfo) => {
    setImageInfo(info);
    try {
      const base64 = await readImageAsBase64(info.uri);
      const skData = Skia.Data.fromBase64(base64);
      const image = Skia.Image.MakeImageFromEncoded(skData);
      if (!image) throw new Error('Unable to decode image.');

      const pixels = image.readPixels(0, 0, {
        width: image.width(),
        height: image.height(),
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      });

      if (!pixels || !(pixels instanceof Uint8Array)) return;

      // Sample first 6 pixels to display raw RGBA binary representation
      const parsedSamples: PixelSample[] = [];
      for (let p = 0; p < 6 && p * 4 + 2 < pixels.length; p++) {
        const r = pixels[p * 4];
        const g = pixels[p * 4 + 1];
        const b = pixels[p * 4 + 2];
        parsedSamples.push({
          index: p,
          r,
          g,
          b,
          rBin: r.toString(2).padStart(8, '0'),
          gBin: g.toString(2).padStart(8, '0'),
          bBin: b.toString(2).padStart(8, '0'),
        });
      }
      setSamples(parsedSamples);

      // Check first 24 LSB bits for "SEC" (0x53, 0x45, 0x43)
      const bits: number[] = [];
      for (let i = 0; bits.length < 24 && i < pixels.length; i++) {
        if (i % 4 !== 3) bits.push(pixels[i] & 1);
      }
      const sigBytes = [0, 1, 2].map((bIdx) => {
        let val = 0;
        for (let bit = 0; bit < 8; bit++) {
          val = (val << 1) | bits[bIdx * 8 + bit];
        }
        return val;
      });
      setHasValidSignature(sigBytes[0] === 0x53 && sigBytes[1] === 0x45 && sigBytes[2] === 0x43);
    } catch (e: any) {
      Alert.alert('Inspector Error', e?.message || 'Could not inspect pixel buffer.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ImageDropzone
        imageInfo={imageInfo}
        title="Inspect Raw RGBA Pixel Buffer"
        onImagePicked={inspectImageBuffer}
      />

      {hasValidSignature !== null && (
        <View
          style={[
            styles.sigBanner,
            { borderColor: hasValidSignature ? COLORS.primary : COLORS.border },
          ]}
        >
          <Text style={styles.sigTitle}>
            Stego Magic Header ("SEC"): {hasValidSignature ? 'DETECTED ✅' : 'NOT FOUND ❌'}
          </Text>
          <Text style={styles.sigSub}>
            {hasValidSignature
              ? 'First 24 RGB LSBs match 0x53 0x45 0x43 protocol signature.'
              : 'Standard cover image or JPEG-compressed file.'}
          </Text>
        </View>
      )}

      {samples.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableHeading}>Raw Pixel Bit-Plane Dump (First 6 Pixels)</Text>
          <Text style={styles.tableHint}>Highlighted last bit (LSB) stores hidden payload</Text>

          {samples.map((px) => (
            <View key={px.index} style={styles.pixelRow}>
              <Text style={styles.pxLabel}>Pixel #{px.index}</Text>
              <Text style={styles.binLine}>
                R({px.r.toString().padStart(3, ' ')}): {px.rBin.slice(0, 7)}
                <Text style={styles.lsbHighlight}>{px.rBin.slice(7)}</Text>
              </Text>
              <Text style={styles.binLine}>
                G({px.g.toString().padStart(3, ' ')}): {px.gBin.slice(0, 7)}
                <Text style={styles.lsbHighlight}>{px.gBin.slice(7)}</Text>
              </Text>
              <Text style={styles.binLine}>
                B({px.b.toString().padStart(3, ' ')}): {px.bBin.slice(0, 7)}
                <Text style={styles.lsbHighlight}>{px.bBin.slice(7)}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 40 },
  sigBanner: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sigTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  sigSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  tableHeading: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  tableHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 2, marginBottom: 12 },
  pixelRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
  },
  pxLabel: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  binLine: { color: COLORS.textSecondary, fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  lsbHighlight: { color: COLORS.primary, fontWeight: '900', backgroundColor: 'rgba(16,185,129,0.2)' },
});
