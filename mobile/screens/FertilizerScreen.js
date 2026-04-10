/**
 * FertilizerScreen — Fertilizer Dosage Calculator
 *
 * Computes recommended fertilizer quantity based on:
 *  - Selected fertilizer type
 *  - Plot area (in acres)
 *  - Soil nutrient level (Low / Medium / High)
 *  - Primary crop (read from SettingsContext, also overridable)
 *
 * All calculations are done locally — no backend required.
 */

import React, { useState } from 'react';
import {
  Alert,
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
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { useSettings } from '../constants/SettingsContext';
import { Colors, Radius, Spacing } from '../constants/theme';

// ─── Fertilizer database ─────────────────────────────────────────────────────
// kgPerAcre[nutrientLevel] — recommended kg per acre
const FERTILIZERS = [
  {
    key: 'urea',
    label: 'Urea (46-0-0)',
    nutrient: 'Nitrogen',
    emoji: '🧪',
    color: '#E8F5EE',
    kgPerAcre: { low: 55, medium: 35, high: 18 },
  },
  {
    key: 'dap',
    label: 'DAP (18-46-0)',
    nutrient: 'Phosphorus',
    emoji: '🌿',
    color: '#FEF3C7',
    kgPerAcre: { low: 50, medium: 30, high: 15 },
  },
  {
    key: 'mop',
    label: 'MOP (0-0-60)',
    nutrient: 'Potassium',
    emoji: '💊',
    color: '#FDE8E8',
    kgPerAcre: { low: 40, medium: 25, high: 12 },
  },
  {
    key: 'npk_14_35_14',
    label: 'NPK 14-35-14',
    nutrient: 'N+P+K',
    emoji: '⚗️',
    color: '#EDE9FE',
    kgPerAcre: { low: 60, medium: 40, high: 22 },
  },
  {
    key: 'npk_19_19_19',
    label: 'NPK 19-19-19',
    nutrient: 'Balanced',
    emoji: '🔬',
    color: '#DBEAFE',
    kgPerAcre: { low: 50, medium: 32, high: 16 },
  },
  {
    key: 'ssp',
    label: 'SSP (0-16-0)',
    nutrient: 'Phosphorus',
    emoji: '🌱',
    color: '#ECFDF5',
    kgPerAcre: { low: 75, medium: 50, high: 25 },
  },
  {
    key: 'potash',
    label: 'Muriate of Potash',
    nutrient: 'Potassium',
    emoji: '🪨',
    color: '#FFF7ED',
    kgPerAcre: { low: 35, medium: 22, high: 10 },
  },
];

// Per-crop adjustment multipliers (relative to baseline)
const CROP_MULTIPLIERS = {
  tomato: 1.2,
  potato: 1.15,
  pepper: 1.0,
  rice: 1.3,
  corn: 1.25,
  wheat: 1.1,
  sugarcane: 1.4,
};

const CROP_LABELS = {
  tomato: 'Tomato 🍅',
  potato: 'Potato 🥔',
  pepper: 'Pepper 🫑',
  rice: 'Rice 🌾',
  corn: 'Corn 🌽',
  wheat: 'Wheat 🌿',
  sugarcane: 'Sugarcane 🎋',
};

const NUTRIENT_LEVELS = ['low', 'medium', 'high'];
const NUTRIENT_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const NUTRIENT_COLORS = {
  low: { chip: '#FDE8E8', text: Colors.riskHigh },
  medium: { chip: '#FEF3C7', text: Colors.riskMedium },
  high: { chip: '#E8F5EE', text: Colors.riskLow },
};

export default function FertilizerScreen({ navigation }) {
  const { primaryCrop } = useSettings();

  const [selectedFertilizer, setSelectedFertilizer] = useState(FERTILIZERS[0].key);
  const [selectedCrop, setSelectedCrop] = useState(primaryCrop || 'tomato');
  const [nutrientLevel, setNutrientLevel] = useState('medium');
  const [areaText, setAreaText] = useState('');
  const [result, setResult] = useState(null);

  const fertilizer = FERTILIZERS.find((f) => f.key === selectedFertilizer);

  const calculate = () => {
    const area = parseFloat(areaText);
    if (!area || area <= 0 || isNaN(area)) {
      Alert.alert('Invalid Area', 'Please enter a valid plot area in acres.');
      return;
    }
    if (area > 10000) {
      Alert.alert('Area too large', 'Please enter an area less than 10,000 acres.');
      return;
    }

    const base = fertilizer.kgPerAcre[nutrientLevel];
    const multiplier = CROP_MULTIPLIERS[selectedCrop] || 1.0;
    const kgPerAcre = parseFloat((base * multiplier).toFixed(1));
    const totalKg = parseFloat((kgPerAcre * area).toFixed(1));
    const bags50kg = Math.ceil(totalKg / 50);
    const bags25kg = Math.ceil(totalKg / 25);

    setResult({
      fertilizer: fertilizer.label,
      nutrient: fertilizer.nutrient,
      crop: CROP_LABELS[selectedCrop],
      area,
      nutrientLevel: NUTRIENT_LABELS[nutrientLevel],
      kgPerAcre,
      totalKg,
      bags50kg,
      bags25kg,
    });
  };

  const reset = () => {
    setResult(null);
    setAreaText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <AppHeader
        title="Fertilizer Calculator"
        subtitle="Dosage by crop & soil"
        left={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        }
        right={null}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Fertilizer picker ── */}
          <Text style={styles.sectionLabel}>Select Fertilizer</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {FERTILIZERS.map((f) => {
              const active = selectedFertilizer === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.fertCard,
                    { backgroundColor: f.color },
                    active && styles.fertCardActive,
                  ]}
                  onPress={() => {
                    setSelectedFertilizer(f.key);
                    setResult(null);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.fertEmoji}>{f.emoji}</Text>
                  <Text style={[styles.fertLabel, active && styles.fertLabelActive]}>
                    {f.label}
                  </Text>
                  <Text style={styles.fertNutrient}>{f.nutrient}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Crop selector ── */}
          <Text style={styles.sectionLabel}>Crop</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {Object.entries(CROP_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={selectedCrop === key}
                onPress={() => {
                  setSelectedCrop(key);
                  setResult(null);
                }}
                style={styles.cropChip}
              />
            ))}
          </ScrollView>

          {/* ── Soil nutrient level ── */}
          <Text style={styles.sectionLabel}>Current Soil Nutrient Level</Text>
          <View style={styles.nutrientRow}>
            {NUTRIENT_LEVELS.map((level) => {
              const active = nutrientLevel === level;
              const meta = NUTRIENT_COLORS[level];
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.nutrientBtn,
                    { backgroundColor: active ? meta.chip : Colors.surfaceContainerHigh },
                    active && { borderColor: meta.text, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    setNutrientLevel(level);
                    setResult(null);
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.nutrientBtnText,
                      { color: active ? meta.text : Colors.onSurfaceVariant },
                    ]}
                  >
                    {NUTRIENT_LABELS[level]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Plot area ── */}
          <Text style={styles.sectionLabel}>Plot Area (acres)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.areaInput}
              value={areaText}
              onChangeText={(t) => {
                setAreaText(t);
                setResult(null);
              }}
              keyboardType="decimal-pad"
              placeholder="e.g. 2.5"
              placeholderTextColor={Colors.onSurfaceVariant}
              maxLength={8}
            />
            <Text style={styles.inputUnit}>acres</Text>
          </View>

          {/* ── Calculate button ── */}
          <Button
            title="Calculate Dosage 🧮"
            onPress={calculate}
            style={styles.calcBtn}
          />

          {/* ── Result card ── */}
          {result && (
            <Card variant="accent" style={styles.resultCard}>
              <Text style={styles.resultTitle}>📊 Recommended Dosage</Text>

              <View style={styles.resultGrid}>
                <View style={styles.resultBlock}>
                  <Text style={styles.resultBigNum}>{result.kgPerAcre}</Text>
                  <Text style={styles.resultBigLabel}>kg / acre</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultBlock}>
                  <Text style={styles.resultBigNum}>{result.totalKg}</Text>
                  <Text style={styles.resultBigLabel}>total kg</Text>
                </View>
              </View>

              <View style={styles.resultMeta}>
                <ResultRow icon="🌱" label="Fertilizer" value={result.fertilizer} />
                <ResultRow icon="🌾" label="Crop" value={result.crop} />
                <ResultRow icon="📏" label="Area" value={`${result.area} acres`} />
                <ResultRow icon="🧫" label="Soil Level" value={result.nutrientLevel} />
                <ResultRow icon="🎒" label="50 kg bags" value={`${result.bags50kg} bags`} />
                <ResultRow icon="📦" label="25 kg bags" value={`${result.bags25kg} bags`} />
              </View>

              <Text style={styles.disclaimer}>
                * Dosage is indicative. Consult a field agronomist for precision recommendations.
              </Text>

              <Button
                title="Calculate Again"
                variant="secondary"
                style={styles.resetBtn}
                onPress={reset}
              />
            </Card>
          )}

          {/* Reference table */}
          {!result && (
            <Card style={styles.referenceCard}>
              <Text style={styles.refTitle}>📋 Reference: {fertilizer?.label}</Text>
              <View style={styles.refTable}>
                <View style={styles.refHeader}>
                  <Text style={[styles.refCell, styles.refHeaderCell]}>Soil Level</Text>
                  <Text style={[styles.refCell, styles.refHeaderCell]}>Base (kg/acre)</Text>
                  <Text style={[styles.refCell, styles.refHeaderCell]}>With Crop Factor</Text>
                </View>
                {NUTRIENT_LEVELS.map((level) => {
                  const base = fertilizer?.kgPerAcre[level] || 0;
                  const mult = CROP_MULTIPLIERS[selectedCrop] || 1;
                  const adjusted = (base * mult).toFixed(1);
                  return (
                    <View
                      key={level}
                      style={[
                        styles.refRow,
                        nutrientLevel === level && styles.refRowActive,
                      ]}
                    >
                      <Text style={styles.refCell}>{NUTRIENT_LABELS[level]}</Text>
                      <Text style={styles.refCell}>{base}</Text>
                      <Text style={[styles.refCell, styles.refCellBold]}>{adjusted}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.refNote}>
                Crop factor for {CROP_LABELS[selectedCrop]}: ×{CROP_MULTIPLIERS[selectedCrop] || 1}
              </Text>
            </Card>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultRow({ icon, label, value }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultRowIcon}>{icon}</Text>
      <Text style={styles.resultRowLabel}>{label}</Text>
      <Text style={styles.resultRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backBtn: {
    padding: Spacing.sm,
  },
  backIcon: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '300',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -Spacing.xs,
  },
  hList: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  // Fertilizer cards
  fertCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fertCardActive: {
    borderColor: Colors.primary,
  },
  fertEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  fertLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  fertLabelActive: {
    color: Colors.primary,
  },
  fertNutrient: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Crop chips
  cropChip: {
    paddingHorizontal: 14,
  },

  // Nutrient level
  nutrientRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  nutrientBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nutrientBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Plot area input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  areaInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onSurface,
    paddingVertical: Spacing.md,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  calcBtn: {
    marginTop: Spacing.xs,
  },

  // Result card
  resultCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.lg,
  },
  resultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  resultBlock: {
    alignItems: 'center',
  },
  resultBigNum: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  resultBigLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginTop: 2,
  },
  resultDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  resultMeta: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultRowIcon: {
    fontSize: 14,
    width: 22,
    textAlign: 'center',
  },
  resultRowLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  resultRowValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Reference table
  referenceCard: {
    padding: Spacing.md,
  },
  refTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  refTable: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  refHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  refHeaderCell: {
    fontWeight: '700',
    color: Colors.onSurface,
    fontSize: 12,
  },
  refRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  refRowActive: {
    backgroundColor: '#E8F5EE',
  },
  refCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  refCellBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  refNote: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 40,
  },
});
