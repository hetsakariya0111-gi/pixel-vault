import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';

const Icon = Ionicons as any;

const TAB_ICONS: Record<string, string> = {
  index: 'eye-off-outline',
  reveal: 'key-outline',
  inspector: 'analytics-outline',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopColor: COLORS.border,
        },
        headerStyle: {
          backgroundColor: COLORS.cardBg,
        },
        headerTintColor: COLORS.textPrimary,
        tabBarIcon: ({ color, size }) => (
          <Icon
            name={TAB_ICONS[route.name] ?? 'ellipse-outline'}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hide',
          headerTitle: 'Embed Secret in Image',
        }}
      />
      <Tabs.Screen
        name="reveal"
        options={{
          title: 'Reveal',
          headerTitle: 'Extract Hidden Secret',
        }}
      />
      <Tabs.Screen
        name="inspector"
        options={{
          title: 'Inspector',
          headerTitle: 'LSB Pixel Inspector',
        }}
      />
    </Tabs>
  );
}
