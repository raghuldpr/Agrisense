import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

export default function AppHeader({
  title,
  subtitle,
  brand = 'AgriSense',
  left,
  right,
  onPressRight,
  rightLabel,
  containerStyle,
  titleStyle,
}) {
  const rightContent = right === undefined
    ? <Text style={styles.actionText}>{rightLabel || '🔔'}</Text>
    : right;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.leftSlot}>
        {left || (
          <>
            <Text style={styles.brand}>{brand}</Text>
            {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </>
        )}
      </View>

      {rightContent ? (
        onPressRight ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPressRight}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            {rightContent}
          </Pressable>
        ) : (
          <View style={styles.actionButton}>{rightContent}</View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  leftSlot: {
    flex: 1,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  title: {
    marginTop: Spacing.xs,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  subtitle: {
    marginTop: 2,
    color: Colors.onSurfaceVariant,
    fontSize: 13,
  },
  actionButton: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  actionText: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
