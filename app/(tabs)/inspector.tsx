import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { ImageDropzone, SelectedImageInfo } from '../../src/components/ImageDropzone';
import { readImageAsBase64 } from '../../src/core/fileHelper';
import { STEGO_MAGIC, BitDepthMode } from '../../src/core/protocol';

const Icon = Ionicons as any;

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
  const [detectedMode, setDetectedMode] = useState<BitDepthMode | null>(null);
  const [inspected, setInspected] = useState(false);

  const inspectImageBuffer = async (info: SelectedImageInfo) => {
    try {
      const base64 = await readImageAsBase64(info.uri, info.base64);
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

      const probeHeader = (mode: BitDepthMode): boolean => {
        const bits: number[] = [];
        for (let i = 0; bits.length < 32 && i < pixels.length; i++) {
          if (i % 4 === 3) continue;
          for (let b = mode - 1; b >= 0 && bits.length < 32; b--) {
            bits.push((pixels[i] >> b) & 1);
          }
        }
        const bytes = new Uint8Array(4);
        for (let bIdx = 0; bIdx < 4; bIdx++) {
          let val = 0;
          for (let bit = 0; bit < 8; bit++) {
            val = (val << 1) | (bits[bIdx * 8 + bit] ?? 0);
          }
          bytes[bIdx] = val;
        }
        return (
          STEGO_MAGIC.every((m, idx) => bytes[idx] === m) && bytes.at(3) === mode
        );
      };

      const modes: BitDepthMode[] = Array.of(1, 2, 4, 8);
      const foundMode = modes.find((m) => probeHeader(m)) ?? null;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImageInfo(null);
      setSamples(parsedSamples);
      setDetectedMode(foundMode);
      setInspected(true);
    } catch (e: any) {
      setImageInfo(null);
      Alert.alert('Inspector Error', e?.message || 'Could not inspect pixel buffer.');
    }
  };

  const handleClearReport = () => {
    setImageInfo(null);
    setSamples([]);
    setDetectedMode(null);
    setInspected(false);
  };

  const highlightSplitIndex = detectedMode ? 8 - detectedMode : 7;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ImageDropzone
        mode="stego"
        imageInfo={imageInfo}
        title="Inspect Raw RGBA Pixel Buffer"
        onImagePicked={inspectImageBuffer}
      />

      {inspected && (
        <View
          style={[
            styles.sigBanner,
            { borderColor: detectedMode !== null ? COLORS.primary : COLORS.border },
          ]}
        >
          <View style={styles.sigHeaderRow}>
            <Text style={styles.sigTitle}>
              {detectedMode !== null
                ? `DETECTED ✅ (${detectedMode}-Bit Plane Mode)`
                : 'Stego Header: NOT FOUND ❌'}
            </Text>
            <TouchableOpacity onPress={handleClearReport} style={styles.clearReportBtn}>
              <Icon name="refresh-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.clearReportText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sigSub}>
            {detectedMode !== null
              ? `RGB channels match 0x53 0x45 0x43 ("SEC") protocol in ${detectedMode}-Bit plane density.`
              : 'Standard cover image or JPEG-compressed file.'}
          </Text>
        </View>
      )}

      {samples.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableHeading}>Raw Pixel Bit-Plane Dump (First 6 Pixels)</Text>
          <Text style={styles.tableHint}>
            Highlighted last {detectedMode ?? 1} bit(s) store hidden payload
          </Text>

          {samples.map((px) => (
            <View key={px.index} style={styles.pixelRow}>
              <Text style={styles.pxLabel}>Pixel #{px.index}</Text>
              <Text style={styles.binLine}>
                R({px.r.toString().padStart(3, ' ')}): {px.rBin.slice(0, highlightSplitIndex)}
                <Text style={styles.lsbHighlight}>{px.rBin.slice(highlightSplitIndex)}</Text>
              </Text>
              <Text style={styles.binLine}>
                G({px.g.toString().padStart(3, ' ')}): {px.gBin.slice(0, highlightSplitIndex)}
                <Text style={styles.lsbHighlight}>{px.gBin.slice(highlightSplitIndex)}</Text>
              </Text>
              <Text style={styles.binLine}>
                B({px.b.toString().padStart(3, ' ')}): {px.bBin.slice(0, highlightSplitIndex)}
                <Text style={styles.lsbHighlight}>{px.bBin.slice(highlightSplitIndex)}</Text>
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
  sigHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sigTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  clearReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  clearReportText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  sigSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
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
