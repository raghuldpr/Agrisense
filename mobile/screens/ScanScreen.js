import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated, Easing, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius } from '../constants/theme';
import { useLanguage } from '../constants/LanguageContext';

const CROP_EMOJI = {
  tomato: '🍅', potato: '🥔', pepper: '🫑',
  rice: '🌾', corn: '🌽', wheat: '🌿', sugarcane: '🎋',
};

export default function ScanScreen({ navigation, route }) {
  const { t } = useLanguage();
  const crop = route?.params?.crop || 'tomato';
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1, duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0, duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scanLineY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow gallery access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      navigation.navigate('Result', {
        imageUri: result.assets[0].uri,
        crop,
      });
    }
  };

  const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      navigation.navigate('Result', {
        imageUri: result.assets[0].uri,
        crop,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.scanTitle}</Text>
        <TouchableOpacity style={styles.helpBtn}>
          <Text style={styles.helpIcon}>?</Text>
        </TouchableOpacity>
      </View>

      {/* Crop Badge */}
      <View style={styles.cropBadgeWrap}>
        <View style={styles.cropBadge}>
          <Text style={styles.cropBadgeEmoji}>{CROP_EMOJI[crop]}</Text>
          <Text style={styles.cropBadgeText}>{crop.toUpperCase()}</Text>
        </View>
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinderWrap}>
        <View style={styles.viewfinder}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Scanning line */}
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
          />
        </View>
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>{t.positionLeaf}</Text>
      <View style={styles.dotRow}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <Text style={styles.tipIcon}>💡</Text>
        </View>
        <Text style={styles.tipText}>{t.tip}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={styles.uploadText}>{t.upload}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={captureImage} activeOpacity={0.8}>
          <Text style={styles.captureIcon}>📷</Text>
        </TouchableOpacity>

        <View style={styles.actionPlaceholder}>
          <Text style={styles.uploadText}>{t.capture}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
  },

  // Header
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  backIcon: { color: '#4ade80', fontSize: 22, fontWeight: '300' },
  headerTitle: {
    color: '#4ade80',
    fontSize: 14, fontWeight: '700',
    letterSpacing: 3,
  },
  helpBtn: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#4ade80',
    alignItems: 'center', justifyContent: 'center',
  },
  helpIcon: { color: '#4ade80', fontSize: 14, fontWeight: '700' },

  // Crop badge
  cropBadgeWrap: { marginBottom: Spacing.lg },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: Radius.full,
    paddingVertical: 8, paddingHorizontal: 20,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  cropBadgeEmoji: { fontSize: 16 },
  cropBadgeText: {
    color: '#4ade80',
    fontSize: 14, fontWeight: '700',
    letterSpacing: 2,
  },

  // Viewfinder
  viewfinderWrap: {
    width: 300, height: 300,
    marginBottom: Spacing.lg,
  },
  viewfinder: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(74,222,128,0.05)',
    overflow: 'hidden',
    position: 'relative',
  },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: 30, height: 30,
    borderColor: '#4ade80',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderTopLeftRadius: Radius.sm,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 2, borderRightWidth: 2,
    borderTopRightRadius: Radius.sm,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderBottomLeftRadius: Radius.sm,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderBottomRightRadius: Radius.sm,
  },

  // Scan line
  scanLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 2,
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // Instructions
  instructions: {
    color: '#4ade80',
    fontSize: 11, fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(74,222,128,0.3)',
  },
  dotActive: { backgroundColor: '#4ade80' },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    width: '90%',
  },
  tipIconWrap: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  tipIcon: { fontSize: 18 },
  tipText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13, lineHeight: 18,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  uploadBtn: {
    alignItems: 'center',
    gap: 4,
  },
  uploadIcon: { fontSize: 24, color: '#ffffff' },
  uploadText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5,
  },
  captureBtn: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#4ade80',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  captureIcon: { fontSize: 28 },
  actionPlaceholder: { alignItems: 'center', width: 60 },
});
