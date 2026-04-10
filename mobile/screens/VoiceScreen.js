import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { useLanguage } from '../constants/LanguageContext';
import { Colors, Radius, Spacing } from '../constants/theme';
import { getAudioUrl } from '../services/api';

const SPEEDS = [0.75, 1.0, 1.5];
const LANG_PILLS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'ta', label: 'த' },
];

const LANG_LABELS = { en: 'English', hi: 'Hindi', ta: 'Tamil' };

export default function VoiceScreen({ navigation, route }) {
  const { language: ctxLang, t } = useLanguage();
  const { result } = route.params;

  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [activeLang, setActiveLang] = useState(ctxLang);

  const bars = useRef([...Array(12)].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    loadAudio();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, [activeLang]);

  useEffect(() => {
    if (isPlaying) startWaveform();
    else stopWaveform();
  }, [isPlaying]);

  const startWaveform = () => {
    bars.forEach((bar, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 200 + i * 50,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.2,
            duration: 200 + i * 50,
            easing: Easing.sin,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const stopWaveform = () => {
    bars.forEach((bar) => {
      bar.stopAnimation();
      Animated.timing(bar, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const loadAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const voiceFiles = result?.voice_files || {};
      const rawPath = voiceFiles[activeLang] || result?.voice_file;

      if (!rawPath) {
        console.log('[VoiceScreen] No audio path for lang:', activeLang);
        return;
      }

      const audioUrl = getAudioUrl(rawPath);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, rate: speed },
        onPlaybackStatus
      );
      soundRef.current = newSound;
    } catch (e) {
      console.log('Audio load error:', e);
    }
  };

  const onPlaybackStatus = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const seek = async (ms) => {
    if (!soundRef.current) return;
    const newPos = Math.max(0, Math.min(position + ms, duration));
    await soundRef.current.setPositionAsync(newPos);
  };

  const setPlaybackSpeed = async (s) => {
    setSpeed(s);
    await soundRef.current?.setRateAsync(s, true);
  };

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <AppHeader
        left={(
          <View>
            <Text style={styles.headerBrand}>AgriSense</Text>
            <Text style={styles.headerSubtitle}>{t.aiAgronomist}</Text>
          </View>
        )}
        right={(
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        containerStyle={styles.header}
      />

      <Card style={styles.heroCard}>
        <View style={styles.identityBlock}>
          <View style={styles.logoSection}>
            <View style={styles.outerRing}>
              <View style={styles.innerRing}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoLeaf}>🌿</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.playingTitle}>{t.playingDiagnosis}</Text>
          <Text style={styles.diseaseLabel}>
            {result?.disease_name} • {result?.crop}
          </Text>
          <Chip
            label={LANG_LABELS[activeLang]}
            selected
            style={styles.activeLangChip}
            textStyle={styles.activeLangChipText}
          />
        </View>

        <View style={styles.waveformCard}>
          <View style={styles.waveformHeader}>
            <Text style={styles.waveformLabel}>Live voice session</Text>
            <Text style={styles.waveformState}>{isPlaying ? 'Playing' : 'Paused'}</Text>
          </View>

          <View style={styles.waveform}>
            {bars.map((bar, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  { transform: [{ scaleY: bar }] },
                ]}
              />
            ))}
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          <Button
            title="↺ 10"
            variant="secondary"
            style={styles.controlButton}
            textStyle={styles.controlButtonText}
            onPress={() => seek(-10000)}
          />

          <Button
            title={isPlaying ? 'Pause' : 'Play'}
            style={styles.playButton}
            textStyle={styles.playButtonText}
            onPress={togglePlay}
          />

          <Button
            title="10 ↻"
            variant="secondary"
            style={styles.controlButton}
            textStyle={styles.controlButtonText}
            onPress={() => seek(10000)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.speed}</Text>
          <View style={styles.pillRow}>
            {SPEEDS.map((s) => (
              <Chip
                key={s}
                label={`${s}x`}
                selected={speed === s}
                onPress={() => setPlaybackSpeed(s)}
                style={styles.optionChip}
                textStyle={styles.optionChipText}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.switchLanguage}</Text>
          <View style={styles.pillRow}>
            {LANG_PILLS.map((lp) => (
              <Chip
                key={lp.code}
                label={lp.label}
                selected={activeLang === lp.code}
                onPress={() => setActiveLang(lp.code)}
                style={styles.optionChip}
                textStyle={styles.optionChipText}
              />
            ))}
          </View>
        </View>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerBrand: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerButtonText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
  },
  heroCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
  },
  identityBlock: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoSection: {
    marginBottom: Spacing.lg,
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLeaf: {
    fontSize: 30,
  },
  playingTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  diseaseLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  activeLangChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeLangChipText: {
    color: '#FFFFFF',
  },
  waveformCard: {
    backgroundColor: 'rgba(17,24,39,0.14)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  waveformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  waveformLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  waveformState: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 72,
    marginBottom: Spacing.md,
  },
  waveBar: {
    width: 6,
    height: 44,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  progressSection: {
    width: '100%',
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: '#A5D0B9',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  controlButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  playButton: {
    minWidth: 110,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonText: {
    color: Colors.primaryContainer,
    fontSize: 16,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  optionChipText: {
    color: '#FFFFFF',
  },
});
