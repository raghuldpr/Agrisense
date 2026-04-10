import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

export default function Card({
  children,
  onPress,
  variant = 'default',
  style,
  contentStyle,
}) {
  const toneStyle =
    variant === 'muted'
      ? styles.muted
      : variant === 'accent'
        ? styles.accent
        : variant === 'dangerSoft'
          ? styles.dangerSoft
          : styles.default;

  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? {
            accessibilityRole: 'button',
            onPress,
            style: ({ pressed }) => [styles.base, toneStyle, style, pressed && styles.pressed],
          }
        : {
            style: [styles.base, toneStyle, style],
          })}
    >
      <View style={contentStyle}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  default: {
    backgroundColor: '#FFFFFF',
  },
  muted: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  accent: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  dangerSoft: {
    backgroundColor: '#FDE8E8',
    borderColor: '#F3C9C9',
  },
  pressed: {
    opacity: 0.88,
  },
});
