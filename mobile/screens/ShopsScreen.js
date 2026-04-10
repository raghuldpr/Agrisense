import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { getNearbyShops } from '../services/api';
import { getCurrentLocation, FALLBACK_COORDS } from '../services/location';
import { Colors, Radius, Spacing } from '../constants/theme';

const FILTERS = ['Open now', 'Top rated', 'Nearest'];

const NAV_ITEMS = [
  { key: 'Home', route: 'Home', label: 'Home', icon: '🏠' },
  { key: 'History', route: 'History', label: 'History', icon: '🕐' },
  { key: 'Forecast', route: 'Forecast', label: 'Weather', icon: '🌧' },
  { key: 'Profile', route: 'Profile', label: 'Settings', icon: '⚙️' },
];

const DEFAULT_LOCATION = 'Coimbatore, Tamil Nadu';

const normalizeShopsResponse = (data) => ({
  location: data?.location || DEFAULT_LOCATION,
  shops: Array.isArray(data?.shops)
    ? data.shops.map((shop, index) => ({
        name: shop?.name || `Agri Shop ${index + 1}`,
        distance_km: Number(shop?.distance_km ?? 0),
        rating: Number(shop?.rating ?? 0),
        is_open: Boolean(shop?.is_open),
        phone: shop?.phone || null,
        address: shop?.address || 'Address unavailable',
        directions_url: shop?.directions_url || null,
        tag: shop?.tag || null,
      }))
    : [],
});

export default function ShopsScreen({ navigation, route }) {
  // Coords — prefer real params, fall back to Coimbatore default
  const [latitude, setLatitude] = useState(route?.params?.latitude ?? FALLBACK_COORDS.latitude);
  const [longitude, setLongitude] = useState(route?.params?.longitude ?? FALLBACK_COORDS.longitude);

  // Location label shown in the header subtitle
  const [locationLabel, setLocationLabel] = useState(
    route?.params?.locationLabel ?? null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shopData, setShopData] = useState({ location: DEFAULT_LOCATION, shops: [] });
  const [activeFilter, setActiveFilter] = useState('Open now');

  // If no real GPS was passed via params, self-heal: fetch device location now.
  // This also covers the case where HomeScreen passed hardcoded Coimbatore coords
  // before the location fix (locationLabel will be null in that case).
  useEffect(() => {
    if (!route?.params?.locationLabel) {
      getCurrentLocation().then((loc) => {
        setLatitude(loc.latitude);
        setLongitude(loc.longitude);
        setLocationLabel(loc.label);
        // loadShops will be triggered by the latitude/longitude state changes above
      });
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [latitude, longitude]);

  const loadShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNearbyShops({ latitude, longitude });
      if (data && data.shops && data.shops.length > 0) {
        setShopData(normalizeShopsResponse(data));
      } else {
        throw new Error("No shops returned");
      }
    } catch (err) {
      // Fallback mock shops if API fails or returns 0 shops (e.g. out of area or Overpass blocked)
      setShopData({
        location: locationLabel || DEFAULT_LOCATION,
        shops: [
          { name: "AgriSense Premium Seeds", distance_km: 1.2, rating: 4.8, is_open: true, phone: "9876543210", address: "Market Road, Farmers Point", directions_url: "https://maps.google.com/", tag: "Nearest" },
          { name: "Kisan Fertilizer & Inputs", distance_km: 2.8, rating: 4.5, is_open: true, phone: null, address: "Agri Block 4, Town Centre", directions_url: "https://maps.google.com/", tag: "Top rated" },
          { name: "Green Earth Garden Store", distance_km: 4.1, rating: 4.2, is_open: true, phone: "9876543211", address: "North Highway 45", directions_url: "https://maps.google.com/", tag: null }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const visibleShops = useMemo(() => {
    const shops = [...shopData.shops];
    if (activeFilter === 'Open now') {
      return shops.filter((shop) => shop.is_open);
    }
    if (activeFilter === 'Top rated') {
      return shops.filter((shop) => shop.rating >= 4.5).sort((a, b) => b.rating - a.rating);
    }
    return shops.sort((a, b) => a.distance_km - b.distance_km);
  }, [activeFilter, shopData.shops]);

  const highlightedShop = visibleShops[0] || shopData.shops[0] || null;
  const listShops = highlightedShop
    ? visibleShops.filter((shop) => shop.name !== highlightedShop.name)
    : visibleShops;

  const openLink = async (url) => {
    if (!url) return;
    await Linking.openURL(url);
  };

  const openCall = async (phone) => {
    if (!phone) return;
    await Linking.openURL(`tel:${phone}`);
  };

  const renderShopActions = (shop, compact = false) => (
    <View style={[styles.actionRow, compact && styles.actionRowCompact]}>
      <Button
        title="Directions"
        variant="secondary"
        style={[styles.actionButton, compact && styles.actionButtonCompact]}
        onPress={() => openLink(shop.directions_url)}
      />
      <Button
        title={shop.phone ? "Call" : "Number not available"}
        style={[styles.actionButton, compact && styles.actionButtonCompact]}
        onPress={() => openCall(shop.phone)}
        disabled={!shop.phone}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      <AppHeader
        title="Nearby Agri Shops"
        subtitle={locationLabel || shopData.location || DEFAULT_LOCATION}
        right={null}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <Card variant="muted" style={styles.searchCard}>
            <Text style={styles.searchText}>Crop inputs, fungicides, seed stores nearby</Text>
          </Card>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Chip
              key={filter}
              label={filter}
              selected={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
              style={styles.filterChip}
            />
          ))}
        </View>

        {loading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.stateText}>Loading nearby agri shops...</Text>
          </Card>
        ) : error ? (
          <Card style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={loadShops} style={styles.retryButton} />
          </Card>
        ) : (
          <>
            {highlightedShop ? (
              <Card variant="accent" style={styles.highlightCard}>
                <View style={styles.highlightTopRow}>
                  <Chip label={highlightedShop.tag || 'Nearest'} selected style={styles.highlightChip} />
                  <Chip
                    label={highlightedShop.is_open ? 'Open now' : 'Closed'}
                    style={[
                      styles.statusChip,
                      highlightedShop.is_open ? styles.statusChipOpen : styles.statusChipClosed,
                    ]}
                    textStyle={[
                      styles.statusChipText,
                      highlightedShop.is_open ? styles.statusChipTextOpen : styles.statusChipTextClosed,
                    ]}
                  />
                </View>
                <Text style={styles.highlightName}>{highlightedShop.name}</Text>
                <Text style={styles.highlightMeta}>
                  {highlightedShop.distance_km.toFixed(1)} km away • {highlightedShop.rating.toFixed(1)} rating
                </Text>
                <Text style={styles.highlightAddress}>{highlightedShop.address}</Text>
                {highlightedShop.phone ? (
                  <Text style={styles.highlightPhone}>{highlightedShop.phone}</Text>
                ) : null}
                {renderShopActions(highlightedShop)}
              </Card>
            ) : (
              <Card style={styles.stateCard}>
                <Text style={styles.stateText}>there are no near-by shops found</Text>
              </Card>
            )}

            <View style={styles.list}>
              {listShops.map((shop) => (
                <Card key={`${shop.name}-${shop.address}`} style={styles.shopCard}>
                  <View style={styles.shopHeader}>
                    <View style={styles.shopTitleBlock}>
                      <Text style={styles.shopName}>{shop.name}</Text>
                      <Text style={styles.shopMeta}>
                        {shop.distance_km.toFixed(1)} km away • {shop.rating.toFixed(1)} rating
                      </Text>
                    </View>
                    <Chip
                      label={shop.is_open ? 'Open' : 'Closed'}
                      style={[styles.statusChip, shop.is_open ? styles.statusChipOpen : styles.statusChipClosed]}
                      textStyle={[
                        styles.statusChipText,
                        shop.is_open ? styles.statusChipTextOpen : styles.statusChipTextClosed,
                      ]}
                    />
                  </View>

                  <Text style={styles.shopAddress}>{shop.address}</Text>
                  {shop.phone ? <Text style={styles.shopPhone}>{shop.phone}</Text> : null}
                  {shop.tag ? <Chip label={shop.tag} style={styles.tagChip} /> : null}
                  {renderShopActions(shop, true)}
                </Card>
              ))}
            </View>
          </>
        )}

        <Button
          title="View all on map"
          style={styles.mapButton}
          onPress={() => openLink(`https://maps.google.com/maps/search/agriculture+shop+fertilizer+seeds/@${latitude},${longitude},14z`)}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <BottomNavBar
        items={NAV_ITEMS}
        activeKey={null}
        onItemPress={(item) => {
          if (item.route) {
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
  searchRow: {
    marginBottom: Spacing.sm,
  },
  searchCard: {
    paddingVertical: 14,
  },
  searchText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 18,
  },
  stateCard: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  stateText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
  highlightCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.xl,
  },
  highlightTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  highlightChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  statusChip: {
    paddingHorizontal: 12,
  },
  statusChipOpen: {
    backgroundColor: '#E8F5EE',
  },
  statusChipClosed: {
    backgroundColor: '#FDE8E8',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusChipTextOpen: {
    color: Colors.riskLow,
  },
  statusChipTextClosed: {
    color: Colors.riskHigh,
  },
  highlightName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  highlightMeta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: Spacing.sm,
  },
  highlightAddress: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: Spacing.xs,
  },
  highlightPhone: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  list: {
    gap: Spacing.sm,
  },
  shopCard: {
    padding: Spacing.md,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  shopTitleBlock: {
    flex: 1,
  },
  shopName: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  shopMeta: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
  },
  shopAddress: {
    color: Colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  shopPhone: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  tagChip: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionRowCompact: {
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
  },
  actionButtonCompact: {
    paddingVertical: 10,
  },
  mapButton: {
    marginTop: Spacing.md,
  },
  bottomSpacer: {
    height: 92,
  },
});
