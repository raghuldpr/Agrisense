import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Animated,
} from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';
import { useLanguage } from '../constants/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi',    native: 'हिंदी',    flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil',    native: 'தமிழ்',    flag: '🇮🇳' },
];

export default function OnboardingScreen({ navigation }) {
  const { setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState('en');

  const handleContinue = () => {
    setLanguage(selected);
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.outerRing}>
          <View style={styles.innerRing}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🌿</Text>
            </View>
          </View>
        </View>
        <Text style={styles.appName}>AgriSense</Text>
        <Text style={styles.tagline}>Your Smart Farming Assistant</Text>
      </View>

      {/* Language selection */}
      <View style={styles.selectionSection}>
        <Text style={styles.selectLabel}>{t.selectLanguage}</Text>

        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langCard, selected === lang.code && styles.langCardSelected]}
            onPress={() => setSelected(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <View style={styles.langText}>
              <Text style={[styles.langNative, selected === lang.code && styles.langNativeSelected]}>
                {lang.native}
              </Text>
              <Text style={styles.langSubtitle}>{lang.label}</Text>
            </View>
            <View style={[styles.radio, selected === lang.code && styles.radioSelected]}>
              {selected === lang.code && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Continue button */}
      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
        <Text style={styles.continueBtnText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  outerRing: {
    width: 120, height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  innerRing: {
    width: 96, height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoCircle: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 32 },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },
  selectionSection: {
    flex: 1,
  },
  selectLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  langCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  langFlag: { fontSize: 28, marginRight: Spacing.md },
  langText:  { flex: 1 },
  langNative: {
    fontSize: 18, fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  langNativeSelected: { color: '#ffffff' },
  langSubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#ffffff' },
  radioDot: {
    width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#ffffff',
  },
  continueBtn: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  continueBtnText: {
    color: Colors.primary,
    fontSize: 16, fontWeight: '700',
    letterSpacing: 0.5,
  },
});
