import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { Colors, Radius, Spacing } from '../constants/theme';
import { getForecast } from '../services/api';
import { getCurrentLocation, FALLBACK_COORDS } from '../services/location';
import { useSettings } from '../constants/SettingsContext';

const NAV_ITEMS = [
  { key: 'Home', route: 'Home', label: 'Home', icon: '🏠' },
  { key: 'History', route: 'History', label: 'History', icon: '🕐' },
  { key: 'Forecast', route: 'Forecast', label: 'Weather', icon: '🌧' },
  { key: 'Profile', route: 'Profile', label: 'Settings', icon: '⚙️' },
];

const getRiskMeta = (risk) => {
  switch (risk) {
    case 'high':
      return { label: 'High', color: Colors.riskHigh, soft: '#FDE8E8' };
    case 'medium':
      return { label: 'Medium', color: Colors.riskMedium, soft: '#FEF3C7' };
    default:
      return { label: 'Low', color: Colors.riskLow, soft: '#E8F5EE' };
  }
};

const FALLBACK_LOCATION = 'Coimbatore, Tamil Nadu';

const toTitle = (value) => {
  if (!value) return '';
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const normalizeRisk = (risk, humidity = 0) => {
  const normalized = String(risk || '').toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  if (humidity >= 85) return 'high';
  if (humidity >= 72) return 'medium';
  return 'low';
};

const dayLabelFromValue = (value, index) => {
  if (!value) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `Day ${index + 1}`;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  return String(value).slice(0, 3);
};

const normalizeForecastResponse = (data) => {
  const rawDays = data?.forecast || data?.days || data?.daily || data?.forecast_days || [];

  const days = rawDays.slice(0, 7).map((item, index) => {
    const humidity = Number(
      item?.humidity ??
      item?.relative_humidity ??
      item?.avg_humidity ??
      item?.humidity_percent ??
      0
    );
    const temperature = Number(
      item?.temperature ??
      item?.temp ??
      item?.temperature_2m ??
      item?.avg_temp ??
      0
    );
    const rawScore = Number(
      item?.score ??
      item?.risk_score ??
      item?.risk_percent ??
      item?.probability ??
      (normalizeRisk(item?.risk_level || item?.risk, humidity) === 'high'
        ? 85
        : normalizeRisk(item?.risk_level || item?.risk, humidity) === 'medium'
          ? 58
          : 28)
    );
    const risk = normalizeRisk(item?.risk_level || item?.risk, humidity);

    return {
      day: dayLabelFromValue(item?.day || item?.date, index),
      temperature,
      humidity,
      risk,
      score: Math.max(0, Math.min(100, Number.isFinite(rawScore) ? rawScore : 0)),
    };
  });

  const highRiskDays = days.filter((item) => item.risk === 'high').map((item) => item.day);

  return {
    location: data?.location || data?.place || data?.location_name || null,
    summaryTitle:
      data?.summary?.title ||
      data?.headline ||
      'Humidity spikes are creating a higher fungal spread window.',
    summaryText:
      data?.summary?.recommendation ||
      data?.recommendation ||
      data?.summary?.text ||
      'Prioritize field inspection before evening irrigation and keep preventive spray planning ready for the weekend.',
    highRiskLabel: highRiskDays.length
      ? `High risk days: ${highRiskDays.join(', ')}`
      : 'High risk days: None',
    advice:
      data?.advice ||
      data?.tips ||
      data?.recommendations ||
      [],
    days,
  };
};

export default function ForecastScreen({ navigation, route }) {
  const { primaryCrop } = useSettings();
  // Use route param crop first, then fall back to the saved primary crop from Settings
  const crop = route?.params?.crop || primaryCrop || 'tomato';

  // Coords — prefer real params, fall back to Coimbatore default
  const [latitude, setLatitude] = useState(route?.params?.latitude ?? FALLBACK_COORDS.latitude);
  const [longitude, setLongitude] = useState(route?.params?.longitude ?? FALLBACK_COORDS.longitude);

  // Location label shown in the header subtitle
  const [locationLabel, setLocationLabel] = useState(
    route?.params?.locationLabel ?? null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecastData, setForecastData] = useState(null);

  // If no real location was passed via params, self-heal: fetch GPS now.
  useEffect(() => {
    if (!route?.params?.locationLabel) {
      getCurrentLocation().then((loc) => {
        setLatitude(loc.latitude);
        setLongitude(loc.longitude);
        setLocationLabel(loc.label);
      });
    }
  }, []);

  useEffect(() => {
    loadForecast();
  }, [crop, latitude, longitude]);

  const loadForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getForecast({ crop, latitude, longitude });
      setForecastData(normalizeForecastResponse(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ui = useMemo(() => {
    return forecastData || {
      location: null,
      summaryTitle: 'Humidity spikes are creating a higher fungal spread window.',
      summaryText: 'Forecast data will appear here once available.',
      highRiskLabel: 'High risk days: --',
      advice: [],
      days: [],
    };
  }, [forecastData]);

  // The subtitle displayed in AppHeader:
  // 1. locationLabel from GPS/params (most accurate)
  // 2. location returned by the forecast API
  // 3. FALLBACK_LOCATION constant
  const headerSubtitle = locationLabel || ui.location || FALLBACK_LOCATION;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <AppHeader
        title="Disease Risk Forecast"
        subtitle={headerSubtitle}
        right={null}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="accent" style={styles.summaryCard}>
          <Chip label={ui.highRiskLabel} selected style={styles.summaryChip} />
          <Text style={styles.summaryTitle}>{ui.summaryTitle}</Text>
          <Text style={styles.summaryText}>{ui.summaryText}</Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7-Day Outlook</Text>
          <Button
            title="Scan crop"
            variant="secondary"
            style={styles.scanButton}
            onPress={() => navigation.navigate('Home')}
          />
        </View>

        {loading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.stateText}>Loading forecast...</Text>
          </Card>
        ) : error ? (
          <Card style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={loadForecast} style={styles.retryButton} />
          </Card>
        ) : (
          <View style={styles.list}>
            {ui.days.map((item) => {
            const riskMeta = getRiskMeta(item.risk);

            return (
              <Card key={item.day} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayLabel}>{item.day}</Text>
                    <Text style={styles.dayMeta}>{item.temperature}°C • {item.humidity}% humidity</Text>
                  </View>
                  <Chip
                    label={riskMeta.label}
                    style={[styles.riskChip, { backgroundColor: riskMeta.soft }]}
                    textStyle={[styles.riskChipText, { color: riskMeta.color }]}
                  />
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Temperature</Text>
                    <Text style={styles.metricValue}>{item.temperature}°C</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Humidity</Text>
                    <Text style={styles.metricValue}>{item.humidity}%</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Risk score</Text>
                    <Text style={[styles.metricValue, { color: riskMeta.color }]}>{item.score}%</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${item.score}%`, backgroundColor: riskMeta.color },
                    ]}
                  />
                </View>
              </Card>
            );
            })}
          </View>
        )}

        <Card style={styles.legendCard}>
          <Text style={styles.legendTitle}>Risk Legend</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.riskLow }]} />
              <Text style={styles.legendText}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.riskMedium }]} />
              <Text style={styles.legendText}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.riskHigh }]} />
              <Text style={styles.legendText}>High</Text>
            </View>
          </View>
        </Card>

        <Card variant="muted" style={styles.adviceCard}>
          <Text style={styles.adviceTitle}>
            Preventive Advice — {crop.charAt(0).toUpperCase() + crop.slice(1)}
          </Text>
          {(ui.advice.length ? ui.advice : [
            `Inspect ${toTitle(crop)} leaves early morning on higher humidity days.`,
            `Avoid overhead watering late in the day when risk is medium or high for ${toTitle(crop)}.`,
            'Keep airflow open between plants and remove visibly infected debris fast.',
            `Apply preventive fungicide spray before forecasted high-humidity periods for ${toTitle(crop)}.`,
          ]).map((item, index) => (
            <Text key={`${item}-${index}`} style={styles.adviceItem}>• {item}</Text>
          ))}
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <BottomNavBar
        items={NAV_ITEMS}
        activeKey="Forecast"
        onItemPress={(item) => {
          if (item.route && item.route !== 'Forecast') {
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
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.xl,
  },
  summaryChip: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.88)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  scanButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  list: {
    gap: Spacing.sm,
  },
  stateCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  stateText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
  dayCard: {
    padding: Spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  dayMeta: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  riskChip: {
    paddingHorizontal: 12,
  },
  riskChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  legendCard: {
    padding: Spacing.md,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  adviceCard: {
    padding: Spacing.lg,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  adviceItem: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  bottomSpacer: {
    height: 92,
  },
});
