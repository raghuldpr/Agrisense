import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    // Onboarding
    selectLanguage: 'SELECT YOUR LANGUAGE',
    // Home
    tagline: 'Detect Crop Disease\nInstantly with AI',
    selectCrop: 'Select Crop',
    viewAll: 'View All',
    weeklyHealth: 'WEEKLY HEALTH',
    weatherAlert: 'WEATHER ALERT',
    humidityHigh: 'High Humidity Risk',
    scanLeaf: 'Scan Leaf Now',
    tomato: 'Tomato',
    potato: 'Potato',
    pepper: 'Pepper',
    rice: 'Rice',
    corn: 'Corn (Maize)',
    wheat: 'Wheat',
    sugarcane: 'Sugarcane',
    // Scan
    scanTitle: 'SCAN MODE',
    positionLeaf: 'POSITION LEAF IN FRAME',
    tip: 'Ensure good lighting and hold the camera steady for the best results.',
    upload: 'UPLOAD',
    capture: 'CAPTURE',
    // Result
    analysisResult: 'Analysis Result',
    analyzing: 'Analyzing your crop...',
    confidence: 'CONFIDENCE',
    weatherRisk: 'Weather Risk',
    humidity: 'HUMIDITY',
    temperature: 'TEMPERATURE',
    playVoice: 'Play Voice Guidance',
    symptoms: 'Symptoms',
    treatment: 'Treatment',
    prevention: 'Prevention',
    expertHelp: 'Connect with Expert',
    highRisk: 'HIGH RISK',
    mediumRisk: 'MEDIUM RISK',
    lowRisk: 'LOW RISK',
    healthy: 'HEALTHY',
    // Voice
    aiAgronomist: 'AI AGRONOMIST',
    playingDiagnosis: 'Playing Diagnosis',
    speed: 'SPEED',
    switchLanguage: 'Language',
  },
  hi: {
    selectLanguage: 'अपनी भाषा चुनें',
    tagline: 'AI से फसल रोग\nतुरंत पहचानें',
    selectCrop: 'फसल चुनें',
    viewAll: 'सभी देखें',
    weeklyHealth: 'साप्ताहिक स्वास्थ्य',
    weatherAlert: 'मौसम चेतावनी',
    humidityHigh: 'उच्च आर्द्रता जोखिम',
    scanLeaf: 'पत्ती स्कैन करें',
    tomato: 'टमाटर',
    potato: 'आलू',
    pepper: 'मिर्च',
    rice: 'चावल',
    corn: 'मक्का',
    wheat: 'गेहूं',
    sugarcane: 'गन्ना',
    scanTitle: 'स्कैन मोड',
    positionLeaf: 'पत्ती को फ्रेम में रखें',
    tip: 'सर्वोत्तम परिणामों के लिए अच्छी रोशनी सुनिश्चित करें।',
    upload: 'अपलोड',
    capture: 'कैप्चर',
    analysisResult: 'विश्लेषण परिणाम',
    analyzing: 'आपकी फसल का विश्लेषण हो रहा है...',
    confidence: 'विश्वास',
    weatherRisk: 'मौसम जोखिम',
    humidity: 'आर्द्रता',
    temperature: 'तापमान',
    playVoice: 'वॉइस गाइडेंस सुनें',
    symptoms: 'लक्षण',
    treatment: 'उपचार',
    prevention: 'रोकथाम',
    expertHelp: 'विशेषज्ञ से जुड़ें',
    highRisk: 'उच्च जोखिम',
    mediumRisk: 'मध्यम जोखिम',
    lowRisk: 'कम जोखिम',
    healthy: 'स्वस्थ',
    aiAgronomist: 'AI कृषि विशेषज्ञ',
    playingDiagnosis: 'निदान सुन रहे हैं',
    speed: 'गति',
    switchLanguage: 'भाषा',
  },
  ta: {
    selectLanguage: 'உங்கள் மொழியை தேர்ந்தெடுக்கவும்',
    tagline: 'AI மூலம் பயிர் நோயை\nஉடனடியாக கண்டறியுங்கள்',
    selectCrop: 'பயிர் தேர்ந்தெடு',
    viewAll: 'அனைத்தும் காண்க',
    weeklyHealth: 'வாராந்திர ஆரோக்கியம்',
    weatherAlert: 'வானிலை எச்சரிக்கை',
    humidityHigh: 'அதிக ஈரப்பத அபாயம்',
    scanLeaf: 'இலையை ஸ்கேன் செய்',
    tomato: 'தக்காளி',
    potato: 'உருளைக்கிழங்கு',
    pepper: 'மிளகாய்',
    rice: 'அரிசி',
    corn: 'மக்காச்சோளம்',
    wheat: 'கோதுமை',
    sugarcane: 'கரும்பு',
    scanTitle: 'ஸ்கேன் முறை',
    positionLeaf: 'இலையை ஃபிரேமில் வையுங்கள்',
    tip: 'சிறந்த முடிவுகளுக்கு நல்ல வெளிச்சம் உறுதி செய்யுங்கள்.',
    upload: 'பதிவேற்று',
    capture: 'படம் எடு',
    analysisResult: 'பகுப்பாய்வு முடிவு',
    analyzing: 'உங்கள் பயிரை பகுப்பாய்வு செய்கிறோம்...',
    confidence: 'நம்பகத்தன்மை',
    weatherRisk: 'வானிலை அபாயம்',
    humidity: 'ஈரப்பதம்',
    temperature: 'வெப்பநிலை',
    playVoice: 'குரல் வழிகாட்டுதல்',
    symptoms: 'அறிகுறிகள்',
    treatment: 'சிகிச்சை',
    prevention: 'தடுப்பு',
    expertHelp: 'நிபுணரை தொடர்பு கொள்ள',
    highRisk: 'அதிக ஆபத்து',
    mediumRisk: 'நடுத்தர ஆபத்து',
    lowRisk: 'குறைந்த ஆபத்து',
    healthy: 'ஆரோக்கியமான',
    aiAgronomist: 'AI வேளாண் நிபுணர்',
    playingDiagnosis: 'நோய் கண்டறிதல் கேட்கிறோம்',
    speed: 'வேகம்',
    switchLanguage: 'மொழி',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLanguage = 'en' }) {
  const [language, setLanguage] = useState(initialLanguage);
  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
