import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const Icon = Ionicons as any;

interface PinFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function PinField({
  label,
  value,
  onChangeText,
  placeholder = 'Enter 4-8 digit PIN',
}: PinFieldProps) {
  const [isHidden, setIsHidden] = useState(true);

  const handleNumericChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 8);
    onChangeText(digitsOnly);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.counter}>{value.length}/8</Text>
      </View>

      <View style={styles.inputRow}>
        <Icon name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleNumericChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={isHidden}
          keyboardType="number-pad"
          maxLength={8}
        />
        <TouchableOpacity onPress={() => setIsHidden(!isHidden)} style={styles.eyeBtn}>
          <Icon
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
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  counter: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
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
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: 14,
    letterSpacing: 2,
  },
  eyeBtn: { padding: 6 },
});
