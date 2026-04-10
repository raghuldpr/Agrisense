import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, RefreshControl, StatusBar, TouchableOpacity, Switch,
} from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';
import { getLatestSoilData, getSoilAdvice } from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Returns a human-readable "X minutes ago" string from an ISO timestamp.
 */
function timeAgo(isoString) {
  if (!isoString) return null;
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return '1 hour ago';
    return `${diffHr} hours ago`;
  } catch {
    return null;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────
const DEVICE_ID = 'ESP32_AGRISENSE_01';
const DEFAULT_CROP = 'tomato';

export default function SoilDashboardScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // errorType: null | 'no_data' | 'network'
  const [errorType, setErrorType] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [data, setData] = useState(null);
  const [advice, setAdvice] = useState(null);

  // Default to LIVE (simulate=false) so real ESP32 data is shown.
  // Navigation can still pass simulate=true to force demo mode.
  const [simulate, setSimulate] = useState(route.params?.simulate ?? false);

  const loadData = useCallback(async () => {
    try {
      setErrorType(null);
      setErrorMsg(null);

      const [telemetry, adviceRes] = await Promise.all([
        getLatestSoilData({ deviceId: DEVICE_ID, simulate }),
        getSoilAdvice({ deviceId: DEVICE_ID, crop: DEFAULT_CROP, simulate }),
      ]);
      setData(telemetry);
      setAdvice(adviceRes);
    } catch (e) {
      const msg = e.message || '';

      // 404 → device has never sent data (or backend restarted before first push)
      if (msg.includes('404') || msg.toLowerCase().includes('no data')) {
        setErrorType('no_data');
      } else {
        setErrorType('network');
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [simulate]);

  // Reload whenever simulate toggle changes
  useEffect(() => {
    setLoading(true);
    setData(null);
    setAdvice(null);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {simulate ? 'Loading demo data…' : 'Connecting to Soil Station…'}
        </Text>
      </SafeAreaView>
    );
  }

  // ── Error: no data received yet ──────────────────────────────────────────
  if (errorType === 'no_data' && !simulate) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <Text style={styles.noDataIcon}>📡</Text>
        <Text style={styles.noDataTitle}>Waiting for your Soil Station</Text>
        <Text style={styles.noDataBody}>
          No readings have been received yet from{'\n'}
          <Text style={styles.noDataDevice}>{DEVICE_ID}</Text>.{'\n\n'}
          Make sure your ESP32 is:{'\n'}
          • Powered on and connected to Wi-Fi{'\n'}
          • Pointing to this backend URL{'\n'}
          • Has sent at least one reading
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadData(); }}>
          <Text style={styles.retryBtnText}>Check Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSimulate(true)} style={styles.demoLink}>
          <Text style={styles.demoLinkText}>View Demo Data Instead →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Error: network / server error ────────────────────────────────────────
  if (errorType === 'network') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <Text style={styles.errorText}>⚠️ {errorMsg || 'Failed to fetch soil data'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadData(); }}>
          <Text style={styles.retryBtnText}>Tap to Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main Dashboard ───────────────────────────────────────────────────────
  const lastUpdatedStr = data?.last_updated || data?.timestamp;
  const ageLabel = timeAgo(lastUpdatedStr);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soil Dashboard</Text>

        {/* LIVE / DEMO badge */}
        <View style={[styles.badge, simulate ? styles.badgeDemo : styles.badgeLive]}>
          <Text style={[styles.badgeText, simulate ? styles.badgeTextDemo : styles.badgeTextLive]}>
            {simulate ? 'DEMO' : '🔴 LIVE'}
          </Text>
        </View>
      </View>

      {/* ── LIVE / DEMO Toggle ── */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show Demo Data</Text>
        <Switch
          value={simulate}
          onValueChange={(val) => setSimulate(val)}
          trackColor={{ false: Colors.primary, true: Colors.riskMedium }}
          thumbColor="#fff"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Telemetry Cards ── */}
        {data && (
          <View style={styles.list}>
            <MetricRow
              title="Moisture"
              value={`${data.moisture}%`}
              note="Volumetric Water Content"
              alert={data.moisture < 30 || data.moisture > 80}
            />
            <MetricRow
              title="TDS"
              value={`${data.tds} ppm`}
              note="Total Dissolved Solids (Nutrients)"
              alert={data.tds < 300 || data.tds > 1200}
            />
            <MetricRow
              title="Temperature"
              value={`${data.temperature}°C`}
              note="Ground / Ambient Temperature"
            />
            <MetricRow
              title="Humidity"
              value={`${data.humidity}%`}
              note="Ambient Air Humidity"
            />
            <MetricRow
              title="Nutrient Status"
              value={data.nutrient_status || 'Unknown'}
              note="Derived from TDS reading"
              alert={data.nutrient_status === 'Low' || data.nutrient_status === 'High'}
            />

            {/* Last updated age */}
            {ageLabel && (
              <View style={styles.ageRow}>
                <Text style={styles.ageDot}>{simulate ? '🟡' : '🟢'}</Text>
                <Text style={styles.ageText}>
                  {simulate ? 'Simulated · ' : 'Last reading: '}
                  {ageLabel}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Advice Cards ── */}
        {advice && (
          <View style={styles.adviceContainer}>
            {/* Alert banner */}
            {advice.status === 'Attention Required' && advice.risk_flags?.length > 0 && (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>⚠️ Attention Required</Text>
                <Text style={styles.alertText}>
                  {advice.risk_flags.join(' • ')}
                </Text>
              </View>
            )}

            <View style={styles.adviceCard}>
              <Text style={styles.adviceTitle}>💧 Irrigation Advice</Text>
              <Text style={styles.adviceText}>{advice.irrigation_suggestion}</Text>
            </View>

            <View style={styles.adviceCard}>
              <Text style={styles.adviceTitle}>🌿 Nutrition Advice</Text>
              <Text style={styles.adviceText}>{advice.nutrient_suggestion}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
const MetricRow = ({ title, value, note, alert = false }) => (
  <View style={[styles.row, alert && styles.rowAlert]}>
    <View>
      <Text style={styles.metricKey}>{title}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
    <Text style={[styles.metricValue, alert && styles.metricValueAlert]}>{value}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 22, color: Colors.primary, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.onSurface },

  badge: {
    borderRadius: Radius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeDemo: { backgroundColor: Colors.tertiaryContainer },
  badgeLive: { backgroundColor: '#e8f5e9' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  badgeTextDemo: { color: Colors.riskMedium },
  badgeTextLive: { color: '#2e7d32' },

  // ── Toggle ──
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  toggleLabel: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },

  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },

  // ── Loading ──
  loadingText: { color: Colors.onSurfaceVariant, fontSize: 15, fontWeight: '500' },

  // ── No Data ──
  noDataIcon: { fontSize: 52, marginBottom: Spacing.sm },
  noDataTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  noDataBody: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  noDataDevice: {
    fontFamily: 'monospace',
    color: Colors.primary,
    fontWeight: '700',
  },

  // ── Error ──
  errorText: { color: Colors.error, fontSize: 15, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  demoLink: { marginTop: Spacing.md },
  demoLinkText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  // ── Metric Rows ──
  list: { gap: Spacing.md, marginBottom: Spacing.xl },
  row: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlert: {
    borderWidth: 1.5,
    borderColor: '#ef9a9a',
    backgroundColor: '#fff8f8',
  },
  metricKey: { color: Colors.onSurface, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  metricNote: { color: Colors.onSurfaceVariant, fontSize: 12 },
  metricValue: { color: Colors.primary, fontSize: 18, fontWeight: '800' },
  metricValueAlert: { color: '#d32f2f' },

  // ── Age row ──
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
  },
  ageDot: { fontSize: 10 },
  ageText: { fontSize: 12, color: Colors.onSurfaceVariant },

  // ── Advice ──
  adviceContainer: { gap: Spacing.md },
  adviceCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  adviceText: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },
  alertCard: {
    backgroundColor: '#ffebee',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#d32f2f',
    marginBottom: Spacing.xs,
  },
  alertText: { fontSize: 14, color: '#c62828', fontWeight: '500' },
});
