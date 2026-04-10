/**
 * HistoryScreen — Live Scan History
 *
 * Reads from HistoryContext (backed by AsyncStorage).
 * Populated by ResultScreen after every successful scan.
 */

import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { useHistory } from '../constants/HistoryContext';
import { Colors, Radius, Spacing } from '../constants/theme';

const NAV_ITEMS = [
  { key: 'Home', route: 'Home', label: 'Home', icon: '🏠' },
  { key: 'History', route: 'History', label: 'History', icon: '🕐' },
  { key: 'Forecast', route: 'Forecast', label: 'Weather', icon: '🌧' },
  { key: 'Profile', route: 'Profile', label: 'Settings', icon: '⚙️' },
];

const RISK_META = {
  high:    { color: Colors.riskHigh,   bg: '#FDE8E8', label: 'HIGH RISK' },
  medium:  { color: Colors.riskMedium, bg: '#FEF3C7', label: 'MED RISK' },
  low:     { color: Colors.riskLow,    bg: '#E8F5EE', label: 'LOW RISK' },
  healthy: { color: Colors.riskNone,   bg: '#F0F0F0', label: 'HEALTHY' },
};

function getRiskMeta(level) {
  return RISK_META[String(level).toLowerCase()] || RISK_META.healthy;
}

const CROP_EMOJI = {
  tomato: '🍅', potato: '🥔', pepper: '🫑',
  rice: '🌾', corn: '🌽', wheat: '🌿', sugarcane: '🎋',
};

export default function HistoryScreen({ navigation }) {
  const { scanHistory, clearHistory } = useHistory();

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all scan records.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Scan History"
        subtitle={`${scanHistory.length} scan${scanHistory.length !== 1 ? 's' : ''} recorded`}
        right={null}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <Chip label="Recent scans" selected />
          <View style={styles.summaryActions}>
            {scanHistory.length > 0 && (
              <Button
                title="Clear"
                variant="secondary"
                style={styles.clearBtn}
                onPress={handleClear}
              />
            )}
            <Button
              title="Scan new"
              variant="secondary"
              style={styles.summaryButton}
              onPress={() => navigation.navigate('Home')}
            />
          </View>
        </View>

        {scanHistory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyText}>
              Your scan history will appear here after you scan a crop leaf.
            </Text>
            <Button
              title="Scan a crop now"
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Home')}
            />
          </Card>
        ) : (
          scanHistory.map((item) => {
            const riskMeta = getRiskMeta(item.risk_level);
            const emoji = CROP_EMOJI[item.crop?.toLowerCase()] || '🌱';
            return (
              <Card key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  {/* Crop icon */}
                  <View style={styles.cropIcon}>
                    <Text style={styles.cropEmoji}>{emoji}</Text>
                  </View>

                  {/* Main info */}
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle}>
                      {item.crop
                        ? item.crop.charAt(0).toUpperCase() + item.crop.slice(1)
                        : 'Unknown crop'}
                    </Text>
                    <Text style={styles.cardResult}>{item.disease_name}</Text>
                  </View>

                  {/* Confidence chip */}
                  <Chip label={`${item.confidence}%`} style={styles.confChip} />
                </View>

                <View style={styles.cardBottomRow}>
                  <Text style={styles.cardMeta}>{item.date}</Text>
                  <View style={[styles.riskBadge, { backgroundColor: riskMeta.bg }]}>
                    <Text style={[styles.riskBadgeText, { color: riskMeta.color }]}>
                      {riskMeta.label}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <BottomNavBar
        items={NAV_ITEMS}
        activeKey="History"
        onItemPress={(item) => {
          if (item.route && item.route !== 'History') {
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  // Empty state
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: Spacing.sm,
    minWidth: 180,
  },

  // History cards
  card: {
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cropIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropEmoji: {
    fontSize: 20,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardResult: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  confChip: {
    paddingHorizontal: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
  },
  riskBadge: {
    borderRadius: Radius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 92,
  },
});
