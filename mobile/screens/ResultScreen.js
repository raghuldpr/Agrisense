import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { useHistory } from '../constants/HistoryContext';
import { useLanguage } from '../constants/LanguageContext';
import { Colors, Radius, Spacing } from '../constants/theme';
import { getImageUrl, predictDisease } from '../services/api';

const TABS = ['symptoms', 'treatment', 'prevention'];

const getRiskColor = (risk) => {
  switch (risk?.toLowerCase()) {
    case 'high':
      return Colors.riskHigh;
    case 'medium':
      return Colors.riskMedium;
    case 'low':
      return Colors.riskLow;
    default:
      return Colors.riskNone;
  }
};

const getRiskLabel = (risk, t) => {
  switch (risk?.toLowerCase()) {
    case 'high':
      return t.highRisk;
    case 'medium':
      return t.mediumRisk;
    case 'low':
      return t.lowRisk;
    default:
      return t.healthy;
  }
};

export default function ResultScreen({ navigation, route }) {
  const { language, t } = useLanguage();
  const { addScanResult } = useHistory();
  const { imageUri, crop, latitude = 13.0827, longitude = 80.2707 } = route.params;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('symptoms');

  useEffect(() => {
    analyzeImage();
  }, []);

  const analyzeImage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictDisease({
        imageUri,
        crop,
        language,
        latitude,
        longitude,
      });
      setResult(data);
      // Persist to scan history
      addScanResult(data, crop);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    await Share.share({
      message: `AgriSense Result: ${result.disease_name} detected in ${result.crop}. Confidence: ${result.confidence}%. Risk: ${result.risk_level}.`,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primaryContainer} />
        <Text style={styles.loadingText}>{t.analyzing}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Button title="Retry" onPress={analyzeImage} style={styles.retryButton} />
      </SafeAreaView>
    );
  }

  const riskColor = getRiskColor(result?.risk_level);
  const riskLabel = getRiskLabel(result?.risk_level, t);
  const weatherRiskLevel = result?.weather?.risk_level
    ? `${result.weather.risk_level.charAt(0).toUpperCase()}${result.weather.risk_level.slice(1)}`
    : t.healthy;
  const confidenceValue = typeof result?.confidence === 'number'
    ? result.confidence.toFixed(1)
    : result?.confidence;
  const confidenceWidth = typeof result?.confidence === 'number'
    ? Math.max(0, Math.min(100, result.confidence))
    : 0;
  const tabContent = {
    symptoms: [result?.symptoms],
    treatment: result?.treatment || [],
    prevention: result?.prevention || [],
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <AppHeader
        title={t.analysisResult}
        left={(
          <View style={styles.headerLeft}>
            <Button
              title="←"
              variant="secondary"
              style={styles.headerIconButton}
              textStyle={styles.headerIconText}
              onPress={() => navigation.goBack()}
            />
            <Text style={styles.headerTitle}>{t.analysisResult}</Text>
          </View>
        )}
        right={(
          <Button
            title="↗"
            variant="secondary"
            style={styles.headerIconButton}
            textStyle={styles.headerIconText}
            onPress={handleShare}
          />
        )}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.imageCard} contentStyle={styles.imageCardContent}>
          <Image
            source={{ uri: result?.segmented_image ? getImageUrl(result.segmented_image) : imageUri }}
            style={styles.leafImage}
            resizeMode="cover"
          />
          <View style={styles.detectedBadge}>
            <View style={styles.detectedDot} />
            <Text style={styles.detectedText}>TARGET DETECTED</Text>
          </View>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Chip
              label={riskLabel}
              selected
              style={[styles.riskChip, { backgroundColor: riskColor }]}
              textStyle={styles.riskChipText}
            />
            <Chip label={result?.crop} style={styles.cropChip} textStyle={styles.cropChipText} />
          </View>

          <Text style={styles.diseaseName}>{result?.disease_name}</Text>

          <View style={styles.confidenceHeader}>
            <Text style={styles.confidenceLabel}>{t.confidence}</Text>
            <Text style={styles.confidenceValue}>{confidenceValue}%</Text>
          </View>
          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceFill, { width: `${confidenceWidth}%` }]} />
          </View>
        </Card>

        <Card variant="muted" style={styles.weatherCard}>
          <View style={styles.weatherTopRow}>
            <View style={styles.weatherIconWrap}>
              <Text style={styles.weatherIcon}>🌧</Text>
            </View>
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTitle}>{t.weatherRisk}</Text>
              <Text style={styles.weatherSubtitle}>{result?.weather?.message}</Text>
            </View>
            <Chip label={weatherRiskLevel} selected />
          </View>

          <View style={styles.statsRow}>
            <Card variant="default" style={styles.statCard}>
              <Text style={styles.statLabel}>{t.humidity}</Text>
              <Text style={styles.statValue}>{result?.weather?.humidity}%</Text>
            </Card>
            <Card variant="default" style={styles.statCard}>
              <Text style={styles.statLabel}>{t.temperature}</Text>
              <Text style={styles.statValue}>{result?.weather?.temperature}°C</Text>
            </Card>
          </View>
        </Card>

        <Card
          variant="muted"
          onPress={() => navigation.navigate('Voice', { result, language })}
          style={styles.voiceCard}
        >
          <View style={styles.voiceIconWrap}>
            <Text style={styles.voiceIcon}>🔊</Text>
          </View>
          <View style={styles.voiceInfo}>
            <Text style={styles.voiceTitle}>{t.playVoice}</Text>
            <Text style={styles.voiceSubtitle}>Hear full diagnosis in your language</Text>
          </View>
          <View style={styles.voicePlayBtn}>
            <Text style={styles.voicePlayIcon}>▶</Text>
          </View>
        </Card>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <Chip
              key={tab}
              label={t[tab]}
              selected={activeTab === tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tabChip}
              textStyle={styles.tabChipText}
            />
          ))}
        </View>

        <Card style={styles.tabContentCard}>
          {tabContent[activeTab]?.map((item, i) => (
            <View key={i} style={styles.tabItem}>
              <View style={styles.bullet} />
              <Text style={styles.tabItemText}>{item}</Text>
            </View>
          ))}
        </Card>

        <Button
          title="📞  Connect with Kisan Expert"
          style={styles.expertButton}
          onPress={() => {
            const phone = 'tel:18001801551';
            Linking.canOpenURL(phone)
              .then((supported) => {
                if (supported) {
                  Linking.openURL(phone);
                } else {
                  Alert.alert(
                    'Kisan Helpline',
                    'Toll-free: 1800-180-1551\n\nPlease dial this number from your phone to reach a crop expert.',
                    [{ text: 'OK' }]
                  );
                }
              })
              .catch(() => {
                Alert.alert('Kisan Helpline', 'Dial: 1800-180-1551');
              });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.error,
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.md,
    minWidth: 140,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerIconButton: {
    minWidth: 40,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerIconText: {
    fontSize: 20,
    color: Colors.primary,
    lineHeight: 20,
  },
  imageCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    padding: 0,
    height: 220,
  },
  imageCardContent: {
    flex: 1,
  },
  leafImage: {
    width: '100%',
    height: '100%',
  },
  detectedBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  detectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  detectedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  riskChip: {
    paddingHorizontal: 12,
  },
  riskChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cropChip: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  cropChipText: {
    color: Colors.onSurfaceVariant,
  },
  diseaseName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  confidenceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  confidenceBar: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryContainer,
  },
  weatherCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  weatherIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherIcon: {
    fontSize: 20,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  weatherSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  voiceCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#E8F5EE',
    borderColor: 'rgba(27,67,50,0.15)',
  },
  voiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  voiceSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  voicePlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabChip: {
    paddingHorizontal: 18,
  },
  tabChipText: {
    fontSize: 13,
  },
  tabContentCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: Colors.primaryContainer,
  },
  tabItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  expertButton: {
    marginHorizontal: Spacing.lg,
  },
});
