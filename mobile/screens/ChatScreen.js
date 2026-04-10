import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  FlatList, KeyboardAvoidingView, Platform, Pressable,
  ActivityIndicator, ScrollView, StatusBar,
  TouchableOpacity, Linking, Alert, Animated,
} from 'react-native';
import AppHeader from '../components/AppHeader';
import Chip from '../components/Chip';
import { Colors, Spacing, Radius } from '../constants/theme';
import { useLanguage } from '../constants/LanguageContext';
import { useSettings } from '../constants/SettingsContext';
import { sendChatMessage } from '../services/api';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
];

export default function ChatScreen({ route, navigation }) {
  const { language, setLanguage } = useLanguage();
  const { primaryCrop } = useSettings();

  // Prefer the crop passed via navigation params (e.g. from ResultScreen);
  // fall back to the user's saved primary crop from Settings.
  const { crop: routeCrop, disease, locationLabel } = route.params || {};
  const crop = routeCrop || primaryCrop || 'tomato';

  const cropLabel = crop.charAt(0).toUpperCase() + crop.slice(1);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExpertCard, setShowExpertCard] = useState(false);
  const flatListRef = useRef(null);
  const expertAnim = useRef(new Animated.Value(0)).current;

  const toggleExpertCard = () => {
    if (showExpertCard) {
      Animated.timing(expertAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start(() => setShowExpertCard(false));
    } else {
      setShowExpertCard(true);
      Animated.timing(expertAnim, {
        toValue: 1, duration: 220, useNativeDriver: true,
      }).start();
    }
  };

  const callKisanExpert = () => {
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
      .catch(() => Alert.alert('Kisan Helpline', 'Dial: 1800-180-1551'));
  };

  useEffect(() => {
    let initialGreeting = `Hello! I'm your AgriSense AI assistant. How can I help you with your ${crop} farm?`;
    if (disease) {
      initialGreeting = `I see your ${crop} might have ${disease.replace(/_/g, ' ')}. Do you need help treating it or understanding the risks?`;
    }
    setMessages([
      {
        id: 'initial',
        role: 'ai',
        answer: initialGreeting,
        suggested_followups: [
          'What fertilizer should I use?',
          'What are the common diseases?',
          'How often should I water my crops?'
        ]
      }
    ]);
  }, [crop, disease]);

  const sendMessage = async (overrideText = null) => {
    const textToSend = overrideText || inputText.trim();
    if (!textToSend || loading) return;

    setInputText('');
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', answer: textToSend }]);
    setLoading(true);

    try {
      const res = await sendChatMessage({
        message: textToSend,
        crop,
        preferred_language: language,
        disease,
        location: locationLabel
      });

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          answer: res.answer,
          action_steps: res.action_steps,
          suggested_followups: res.suggested_followups
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          answer: 'Sorry, I am having trouble connecting to the network right now. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAi]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi, item.isError && styles.bubbleError]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAi, item.isError && styles.messageTextError]}>
            {item.answer}
          </Text>
          
          {item.action_steps && item.action_steps.length > 0 && (
            <View style={styles.actionSteps}>
              {item.action_steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={styles.stepDot}>•</Text>
                  <Text style={[styles.messageText, styles.messageTextAi, styles.stepText]}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!isUser && item.suggested_followups && item.suggested_followups.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {item.suggested_followups.map((followup, idx) => (
              <Chip
                key={idx}
                label={followup}
                onPress={() => sendMessage(followup)}
                style={styles.followupChip}
                textStyle={styles.followupChipText}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <AppHeader
        title="AgriSense Chat"
        subtitle={`Advisor · ${cropLabel}`}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={styles.expertBtn}
            onPress={toggleExpertCard}
            activeOpacity={0.8}
          >
            <Text style={styles.expertBtnIcon}>👨‍🌾</Text>
          </TouchableOpacity>
        }
      />

      {/* Kisan Expert slide-down card */}
      {showExpertCard && (
        <Animated.View
          style={[
            styles.expertCard,
            {
              opacity: expertAnim,
              transform: [{
                translateY: expertAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.expertCardLeft}>
            <View style={styles.expertAvatar}>
              <Text style={styles.expertAvatarText}>KE</Text>
            </View>
            <View>
              <Text style={styles.expertName}>Kisan Expert</Text>
              <Text style={styles.expertRole}>Govt. Agri Helpline · Toll-free</Text>
              <Text style={styles.expertNumber}>1800-180-1551</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={callKisanExpert}
            activeOpacity={0.8}
          >
            <Text style={styles.callBtnIcon}>📞</Text>
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.langRow}>
        {LANGS.map((lang) => (
          <Pressable
            key={lang.code}
            style={[styles.langChip, language === lang.code && styles.langChipActive]}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>
              {lang.label}
            </Text>
          </Pressable>
        ))}
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Generating advice...</Text>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything about your farm..."
              placeholderTextColor={Colors.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={300}
            />
            <Pressable 
              style={({ pressed }) => [
                styles.sendBtn, 
                (!inputText.trim() || loading) && styles.sendBtnDisabled,
                pressed && { opacity: 0.7 }
              ]}
              disabled={!inputText.trim() || loading}
              onPress={() => sendMessage()}
            >
              <Text style={styles.sendIcon}>↗</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  langChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  langChipActive: {
    backgroundColor: Colors.primaryContainer,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  langTextActive: {
    color: Colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  bubbleWrapper: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubbleWrapperAi: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.md + 2,
    borderRadius: Radius.xl,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  bubbleAi: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: Radius.sm,
    minWidth: '65%',
  },
  bubbleError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageTextAi: {
    color: '#1F2937',
  },
  messageTextError: {
    color: '#991B1B',
  },
  actionSteps: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepDot: {
    fontSize: 16,
    color: Colors.primary,
    marginRight: 6,
    marginTop: -2,
  },
  stepText: {
    flexShrink: 1,
  },
  chipsContainer: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
  },
  chipsContent: {
    paddingRight: Spacing.xl,
    gap: Spacing.sm,
  },
  followupChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  followupChipText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  inputWrapper: {
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 15,
    color: Colors.onSurface,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  // ── Kisan Expert button (round, in header) ──────────────────────────────
  expertBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  expertBtnIcon: {
    fontSize: 20,
  },

  // ── Slide-down expert card ───────────────────────────────────────────────
  expertCard: {
    marginHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(27,67,50,0.1)',
  },
  expertCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  expertAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expertAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expertName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 1,
  },
  expertRole: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: 2,
  },
  expertNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },

  // ── Call button inside card ──────────────────────────────────────────────
  callBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 3,
    minWidth: 62,
  },
  callBtnIcon: {
    fontSize: 18,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

