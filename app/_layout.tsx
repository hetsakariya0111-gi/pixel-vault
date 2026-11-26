import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme/colors';

export default function RootLayout() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const authenticate = async () => {
    setAuthError(null);
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      // જો Emulator માં ફિંગરપ્રિન્ટ સેન્સર ન હોય તો સીધું અનલોક થશે
      setIsUnlocked(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Pixel Steganography Vault',
      fallbackLabel: 'Use Device Passcode',
    });

    if (result.success) {
      setIsUnlocked(true);
    } else {
      setAuthError('Authentication failed. Tap below to try again.');
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  if (!isUnlocked) {
    return (
      <View style={styles.lockContainer}>
        <Ionicons name="shield-checkmark" size={72} color={COLORS.primary} />
        <Text style={styles.title}>Pixel Vault Locked</Text>
        <Text style={styles.subtitle}>Zero-Knowledge Hardware Biometric Gate</Text>
        {authError && <Text style={styles.error}>{authError}</Text>}
        <TouchableOpacity style={styles.unlockBtn} onPress={authenticate}>
          <Text style={styles.unlockBtnText}>Unlock with Biometrics</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 16 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 24 },
  error: { color: COLORS.danger, marginBottom: 16, textAlign: 'center' },
  unlockBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unlockBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 16 },
});
