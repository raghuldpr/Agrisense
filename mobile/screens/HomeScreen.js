import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Alert } from 'react-native';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { useLanguage } from '../constants/LanguageContext';
import { Colors, Radius, Spacing } from '../constants/theme';
import { getCurrentLocation, FALLBACK_COORDS } from '../services/location';

const CROPS = [
  { key: 'tomato', emoji: '🍅', bg: '#FDE8E8' },
  { key: 'potato', emoji: '🥔', bg: '#FEF3E2' },
  { key: 'pepper', emoji: '🫑', bg: '#E8F5EE' },
  { key: 'rice', emoji: '🌾', bg: '#FFFDE8' },
  { key: 'corn', emoji: '🌽', bg: '#FFF8E1' },
  { key: 'wheat', emoji: '🌿', bg: '#F1F8E9' },
  { key: 'sugarcane', emoji: '🎋', bg: '#E8F5E9' },
];

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
];

const NAV_ITEMS = [
  { key: 'Home', route: 'Home', label: 'Home', icon: '🏠' },
  { key: 'History', route: 'History', label: 'History', icon: '🕐' },
  { key: 'Chat', route: 'Chat', label: 'AI Chat', icon: '💬' },
  { key: 'Forecast', route: 'Forecast', label: 'Weather', icon: '🌧' },
  { key: 'Profile', route: 'Profile', label: 'Settings', icon: '⚙️' },
];

export default function HomeScreen({ navigation }) {
  const { language, setLanguage, t } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState('tomato');

  // Fetch real device location once on mount; stored in a ref so it never
  // causes a re-render. Silently falls back to Coimbatore on failure.
  const locationRef = useRef(FALLBACK_COORDS);
  useEffect(() => {
    getCurrentLocation().then((loc) => {
      locationRef.current = loc;
    });
  }, []);

  const cropLabel = {
    tomato: t.tomato,
    potato: t.potato,
    pepper: t.pepper,
    rice: t.rice,
    corn: t.corn,
    wheat: t.wheat,
    sugarcane: t.sugarcane,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <AppHeader subtitle={t.tagline.split('\n').join(' ')} />

        <View style={styles.langRow}>
          {LANGS.map((lang) => (
            <Chip
              key={lang.code}
              label={lang.label}
              selected={language === lang.code}
              onPress={() => setLanguage(lang.code)}
              style={styles.langChip}
            />
          ))}
        </View>

        <Card variant="accent" style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>AI PRECISION ENGINE</Text>
          </View>
          <Text style={styles.heroTitle}>{t.tagline}</Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.selectCrop}</Text>
          <Text style={styles.viewAll}>{t.viewAll}</Text>
        </View>

        <View style={styles.cropGrid}>
          {CROPS.map((crop) => (
            <Card
              key={crop.key}
              onPress={() => setSelectedCrop(crop.key)}
              style={[styles.cropCard, selectedCrop === crop.key && styles.cropCardSelected]}
              contentStyle={styles.cropCardContent}
            >
              <View style={[styles.cropIconBg, { backgroundColor: crop.bg }]}>
                <Text style={styles.cropEmoji}>{crop.emoji}</Text>
              </View>
              <Text style={[styles.cropLabel, selectedCrop === crop.key && styles.cropLabelSelected]}>
                {cropLabel[crop.key]}
              </Text>
              {selectedCrop === crop.key ? (
                <Chip
                  label="Selected"
                  selected
                  style={styles.selectedChip}
                  textStyle={styles.selectedChipText}
                />
              ) : null}
            </Card>
          ))}
        </View>

        <Card variant="muted" style={styles.infoCard}>
          <View>
            <Text style={styles.infoLabel}>{t.weeklyHealth}</Text>
            <Text style={styles.healthValue}>84% Optimal</Text>
          </View>
          <View style={styles.infoIconBg}>
            <Text style={styles.infoIcon}>📈</Text>
          </View>
        </Card>

        <Card variant="dangerSoft" style={styles.infoCard}>
          <View>
            <Text style={[styles.infoLabel, styles.weatherLabel]}>{t.weatherAlert}</Text>
            <Text style={styles.weatherValue}>{t.humidityHigh}</Text>
          </View>
          <View style={[styles.infoIconBg, styles.weatherIconBg]}>
            <Text style={styles.infoIcon}>💧</Text>
          </View>
        </Card>

        <Card style={styles.toolCard}>
          <View style={styles.toolCopy}>
            <Text style={styles.toolEyebrow}>FIELD SUPPORT</Text>
            <Text style={styles.toolTitle}>Nearby Shops</Text>
            <Text style={styles.toolText}>
              Find agri input stores near your farming area for quick supplies, crop support, and directions.
            </Text>
          </View>
          <Button
            title="Open shops"
            variant="secondary"
            style={styles.toolButton}
            onPress={() => {
              const { latitude, longitude, label } = locationRef.current;
              navigation.navigate('Shops', {
                latitude,
                longitude,
                locationLabel: label,
              });
            }}
          />
        </Card>

        <Card style={styles.toolCard}>
          <View style={styles.toolCopy}>
            <Text style={styles.toolEyebrow}>HARDWARE INTEGRATION</Text>
            <Text style={styles.toolTitle}>Soil Station</Text>
            <Text style={styles.toolText}>
              Connect your AgriSense Soil Station hardware to unlock real-time moisture, temperature, and nutrient tracking.
            </Text>
          </View>
          <Button
            title="Connect / Enter"
            variant="secondary"
            style={styles.toolButton}
            onPress={() => {
              Alert.alert(
                "Hardware Access Gate",
                "Do you want to connect a physical AgriSense Soil Station, or proceed in Demo Mode for presentation?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Demo Mode", 
                    onPress: () => navigation.navigate('SoilDashboard', { simulate: true }) 
                  },
                  { 
                    text: "Connect Hardware", 
                    onPress: () => {
                      Alert.alert("Success", "Hardware Station Paired!");
                      navigation.navigate('SoilDashboard', { simulate: false });
                    }
                  }
                ]
              );
            }}
          />
        </Card>

        <Card style={styles.toolCard}>
          <View style={styles.toolCopy}>
            <Text style={styles.toolEyebrow}>INPUT PLANNING</Text>
            <Text style={styles.toolTitle}>Fertilizer Calculator</Text>
            <Text style={styles.toolText}>
              Calculate the exact fertilizer dosage for your crop, plot size, and soil nutrient level.
            </Text>
          </View>
          <Button
            title="Calculate dosage"
            variant="secondary"
            style={styles.toolButton}
            onPress={() => navigation.navigate('Fertilizer')}
          />
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.scanButtonContainer}>
        <Button
          style={styles.scanButton}
          leftIcon="📷"
          title={t.scanLeaf}
          onPress={() => navigation.navigate('Scan', { crop: selectedCrop })}
        />
      </View>

      <BottomNavBar
        items={NAV_ITEMS}
        activeKey="Home"
        onItemPress={(item) => {
          if (item.route && item.route !== 'Home') {
            const { latitude, longitude, label } = locationRef.current;
            navigation.navigate(item.route, {
              latitude,
              longitude,
              locationLabel: label,
              crop: selectedCrop,
            });
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
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  langChip: {
    paddingHorizontal: 20,
  },
  heroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    minHeight: 160,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    color: '#E5F3EC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cropCard: {
    width: '47%',
    padding: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cropCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  cropCardContent: {
    alignItems: 'center',
  },
  cropIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cropEmoji: {
    fontSize: 26,
  },
  cropLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cropLabelSelected: {
    color: Colors.primary,
  },
  selectedChip: {
    marginTop: Spacing.sm,
    paddingHorizontal: 10,
  },
  selectedChipText: {
    fontSize: 12,
  },
  infoCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  weatherLabel: {
    color: '#9A4242',
  },
  weatherValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C25C5C',
  },
  infoIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherIconBg: {
    backgroundColor: 'rgba(186, 26, 26, 0.15)',
  },
  infoIcon: {
    fontSize: 20,
  },
  toolCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  toolCopy: {
    marginBottom: Spacing.md,
  },
  toolEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  toolTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  toolText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.onSurfaceVariant,
  },
  toolButton: {
    paddingVertical: 12,
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  scanButton: {
    shadowOpacity: 0.3,
  },
  bottomSpacer: {
    height: 100,
  },
});
