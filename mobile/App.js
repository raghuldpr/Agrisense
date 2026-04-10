import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LanguageProvider } from './constants/LanguageContext';
import { SettingsProvider, useSettings } from './constants/SettingsContext';
import { HistoryProvider } from './constants/HistoryContext';

import OnboardingScreen     from './screens/OnboardingScreen';
import HomeScreen           from './screens/HomeScreen';
import ScanScreen           from './screens/ScanScreen';
import ResultScreen         from './screens/ResultScreen';
import VoiceScreen          from './screens/VoiceScreen';
import HistoryScreen        from './screens/HistoryScreen';
import ChatScreen           from './screens/ChatScreen';
import ForecastScreen       from './screens/ForecastScreen';
import ShopsScreen          from './screens/ShopsScreen';
import ProfileScreen        from './screens/ProfileScreen';
import SoilDashboardScreen  from './screens/SoilDashboardScreen';
import FertilizerScreen     from './screens/FertilizerScreen';

import { pingBackend } from './services/api';

const Stack = createNativeStackNavigator();

/**
 * Inner component — rendered inside SettingsProvider so it can read the
 * persisted language and seed LanguageProvider with it on first render.
 */
function AppCore() {
  const { language } = useSettings();

  useEffect(() => {
    pingBackend();
  }, []);

  return (
    <LanguageProvider initialLanguage={language}>
      <HistoryProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Onboarding"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Home"       component={HomeScreen} />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="Result"     component={ResultScreen} />
            <Stack.Screen
              name="Voice"
              component={VoiceScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="History"    component={HistoryScreen} />
            <Stack.Screen name="Chat"       component={ChatScreen} />
            <Stack.Screen name="Forecast"   component={ForecastScreen} />
            <Stack.Screen name="Shops"      component={ShopsScreen} />
            <Stack.Screen name="Profile"    component={ProfileScreen} />
            <Stack.Screen name="SoilDashboard" component={SoilDashboardScreen} />
            <Stack.Screen
              name="Fertilizer"
              component={FertilizerScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </HistoryProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppCore />
    </SettingsProvider>
  );
}
