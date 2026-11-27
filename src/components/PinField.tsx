import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface PinFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function PinField({ label, value, onChangeText, placeholder = 'Enter 4-8 digit PIN' }: PinFieldProps) {
  // pin visibility toggle state
  const [isHidden, setIsHidden] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={isHidden} // ture then visible ....
          keyboardType="numeric"      // only number keyboard opens
          maxLength={12}
        />
        <TouchableOpacity onPress={() => setIsHidden(!isHidden)} style={styles.eyeBtn}>
          <Ionicons
            name={isHidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 16, paddingVertical: 14, letterSpacing: 2 },
  eyeBtn: { padding: 6 },
});
