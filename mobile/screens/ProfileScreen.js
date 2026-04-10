/**
 * ProfileScreen — Editable Settings
 *
 * Allows the user to change:
 *  • Preferred language (via chip row — updates LanguageContext live)
 *  • Primary crop (crop grid — persisted to SettingsContext)
 *  • Region (free text input — persisted to SettingsContext)
 *
 * All changes are persisted immediately via SettingsContext → AsyncStorage.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavBar from '../components/BottomNavBar';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { useLanguage } from '../constants/LanguageContext';
import { useSettings } from '../constants/SettingsContext';
import { Colors, Radius, Spacing } from '../constants/theme';

const NAV_ITEMS = [
  { key: 'Home', route: 'Home', label: 'Home', icon: '🏠' },
  { key: 'History', route: 'History', label: 'History', icon: '🕐' },
  { key: 'Forecast', route: 'Forecast', label: 'Weather', icon: '🌧' },
  { key: 'Profile', route: 'Profile', label: 'Settings', icon: '⚙️' },
];

const CROPS = [
  { key: 'tomato', emoji: '🍅', label: 'Tomato', bg: '#FDE8E8' },
  { key: 'potato', emoji: '🥔', label: 'Potato', bg: '#FEF3E2' },
  { key: 'pepper', emoji: '🫑', label: 'Pepper', bg: '#E8F5EE' },
  { key: 'rice',   emoji: '🌾', label: 'Rice',   bg: '#FFFDE8' },
  { key: 'corn',   emoji: '🌽', label: 'Corn',   bg: '#FFF8E1' },
  { key: 'wheat',  emoji: '🌿', label: 'Wheat',  bg: '#F1F8E9' },
  { key: 'sugarcane', emoji: '🎋', label: 'Sugarcane', bg: '#E8F5E9' },
];

const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage } = useLanguage();
  const { primaryCrop, region, setPrimaryCrop, setRegion, setLanguageSetting } = useSettings();

  const [regionDraft, setRegionDraft] = useState(region);
  const [regionSaved, setRegionSaved] = useState(true);

  const handleLanguageChange = (code) => {
    setLanguage(code);          // live UI change
    setLanguageSetting(code);   // persist to AsyncStorage
  };

  const handleCropChange = (key) => {
    setPrimaryCrop(key);
  };

  const handleSaveRegion = () => {
    const trimmed = regionDraft.trim();
    if (!trimmed) return;
    setRegion(trimmed);
    setRegionSaved(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ══════════════════════════════════
              SECTION: Preferred Language
          ══════════════════════════════════ */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🌐  Preferred Language</Text>
            <Text style={styles.sectionHint}>Changes the app language immediately</Text>
            <View style={styles.langRow}>
              {LANGS.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langBtn,
                    language === lang.code && styles.langBtnActive,
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.langBtnNative,
                      language === lang.code && styles.langBtnNativeActive,
                    ]}
                  >
                    {lang.native}
                  </Text>
                  <Text
                    style={[
                      styles.langBtnSub,
                      language === lang.code && styles.langBtnSubActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* ══════════════════════════════════
              SECTION: Primary Crop
          ══════════════════════════════════ */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🌾  Primary Crop</Text>
            <Text style={styles.sectionHint}>
              Used for disease risk forecasts and fertilizer recommendations
            </Text>
            <View style={styles.cropGrid}>
              {CROPS.map((crop) => {
                const active = primaryCrop === crop.key;
                return (
                  <TouchableOpacity
                    key={crop.key}
                    style={[
                      styles.cropCard,
                      { backgroundColor: crop.bg },
                      active && styles.cropCardActive,
                    ]}
                    onPress={() => handleCropChange(crop.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cropEmoji}>{crop.emoji}</Text>
                    <Text style={[styles.cropLabel, active && styles.cropLabelActive]}>
                      {crop.label}
                    </Text>
                    {active && (
                      <View style={styles.cropCheck}>
                        <Text style={styles.cropCheckIcon}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* ══════════════════════════════════
              SECTION: Region
          ══════════════════════════════════ */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📍  Region / Location</Text>
            <Text style={styles.sectionHint}>Your farming area (city or district)</Text>
            <View style={styles.regionRow}>
              <TextInput
                style={styles.regionInput}
                value={regionDraft}
                onChangeText={(t) => {
                  setRegionDraft(t);
                  setRegionSaved(false);
                }}
                placeholder="e.g. Chennai, Coimbatore"
                placeholderTextColor={Colors.onSurfaceVariant}
                returnKeyType="done"
                onSubmitEditing={handleSaveRegion}
              />
              <Button
                title={regionSaved ? '✓ Saved' : 'Save'}
                onPress={handleSaveRegion}
                style={[styles.saveBtn, regionSaved && styles.saveBtnDone]}
                textStyle={regionSaved ? styles.saveBtnDoneText : undefined}
                variant={regionSaved ? 'secondary' : 'primary'}
              />
            </View>
          </Card>

          {/* ── Quick link to Fertilizer Calculator ── */}
          <Card style={styles.fertCard} onPress={() => navigation.navigate('Fertilizer')}>
            <View style={styles.fertRow}>
              <View style={styles.fertIconWrap}>
                <Text style={styles.fertIcon}>🧮</Text>
              </View>
              <View style={styles.fertInfo}>
                <Text style={styles.fertTitle}>Fertilizer Calculator</Text>
                <Text style={styles.fertSub}>
                  Compute dosage for your crop & soil type
                </Text>
              </View>
              <Text style={styles.fertArrow}>›</Text>
            </View>
          </Card>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar
        items={NAV_ITEMS}
        activeKey="Profile"
        onItemPress={(item) => {
          if (item.route && item.route !== 'Profile') {
            navigation.navigate(item.route);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  // Hero
  hero: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  name: {
    color: Colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
  },

  // Section card
  sectionCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: Spacing.xs,
  },

  // Language
  langRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  langBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langBtnActive: {
    backgroundColor: '#E8F5EE',
    borderColor: Colors.primary,
  },
  langBtnNative: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  langBtnNativeActive: {
    color: Colors.primary,
  },
  langBtnSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  langBtnSubActive: {
    color: Colors.primary,
  },

  // Crop grid
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cropCard: {
    width: '30%',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 76,
    justifyContent: 'center',
  },
  cropCardActive: {
    borderColor: Colors.primary,
  },
  cropEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  cropLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cropLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  cropCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropCheckIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Region
  regionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  regionInput: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.onSurface,
  },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minWidth: 80,
  },
  saveBtnDone: {
    borderColor: Colors.primary,
  },
  saveBtnDoneText: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Fertilizer card
  fertCard: {
    padding: Spacing.md,
  },
  fertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  fertIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fertIcon: {
    fontSize: 22,
  },
  fertInfo: {
    flex: 1,
  },
  fertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  fertSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 17,
  },
  fertArrow: {
    fontSize: 22,
    color: Colors.onSurfaceVariant,
    fontWeight: '300',
  },

  bottomSpacer: {
    height: 92,
  },
});
