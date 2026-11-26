import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface BenchmarkBadgeProps {
  executionTimeMs: number;
  pixelsModified: number;
  capacityUsedPercent: number;
}

export function BenchmarkBadge({
  executionTimeMs,
  pixelsModified,
  capacityUsedPercent,
}: BenchmarkBadgeProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
        <Text style={styles.headerText}>Skia JSI Pixel Engine Benchmarks</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{executionTimeMs} ms</Text>
          <Text style={styles.statLabel}>Encode Latency</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{pixelsModified.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Pixels Altered</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{capacityUsedPercent}%</Text>
          <Text style={styles.statLabel}>Buffer Used</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: COLORS.border },
});
