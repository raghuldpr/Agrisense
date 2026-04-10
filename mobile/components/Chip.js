import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

export default function Chip({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
}) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? {
            accessibilityRole: 'button',
            onPress,
            style: ({ pressed }) => [
              styles.base,
              selected && styles.selected,
              style,
              pressed && styles.pressed,
            ],
          }
        : {
            style: [styles.base, selected && styles.selected, style],
          })}
    >
      <Text style={[styles.text, selected && styles.selectedText, textStyle]}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignSelf: 'flex-start',
  },
  selected: {
    backgroundColor: Colors.primaryContainer,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  selectedText: {
    color: Colors.onPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
});
