import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'hi';

type TranslationKey =
  | 'welcome'
  | 'logout'
  | 'dashboard'
  | 'dashboardSubtitle'
  | 'emiManagement'
  | 'creditHealth'
  | 'openEmiManagement'
  | 'openCreditHealth'
  | 'financialSnapshot'
  | 'monthlyIncome'
  | 'fixedExpenses'
  | 'totalEmi'
  | 'availableSurplus'
  | 'language'
  | 'manualEntry'
  | 'addData'
  | 'enterFinancialDetails'
  | 'monthlyExpenses'
  | 'existingDebt'
  | 'monthlySavings'
  | 'missedPayments'
  | 'cancel'
  | 'generateScore';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    welcome: 'Welcome',
    logout: 'Logout',
    dashboard: 'Dashboard',
    dashboardSubtitle: 'Your complete financial picture at a glance',
    emiManagement: 'EMI Management',
    creditHealth: 'Credit Health',
    openEmiManagement: 'Open EMI Management',
    openCreditHealth: 'Open Credit Health',
    financialSnapshot: 'Your Financial Snapshot',
    monthlyIncome: 'Monthly Income',
    fixedExpenses: 'Fixed Expenses',
    totalEmi: 'Total EMI',
    availableSurplus: 'Available Surplus',
    language: 'Language',
    manualEntry: 'Manual Entry',
    addData: 'Add Data',
    enterFinancialDetails: 'Enter Financial Details',
    monthlyExpenses: 'Monthly expenses',
    existingDebt: 'Existing debt',
    monthlySavings: 'Monthly savings',
    missedPayments: 'Missed payments (12 months)',
    cancel: 'Cancel',
    generateScore: 'Generate Score',
  },
  hi: {
    welcome: 'स्वागत है',
    logout: 'लॉग आउट',
    dashboard: 'डैशबोर्ड',
    dashboardSubtitle: 'आपकी पूरी वित्तीय जानकारी एक नज़र में',
    emiManagement: 'ईएमआई प्रबंधन',
    creditHealth: 'क्रेडिट स्वास्थ्य',
    openEmiManagement: 'ईएमआई प्रबंधन खोलें',
    openCreditHealth: 'क्रेडिट स्वास्थ्य खोलें',
    financialSnapshot: 'आपकी वित्तीय स्थिति',
    monthlyIncome: 'मासिक आय',
    fixedExpenses: 'निश्चित खर्च',
    totalEmi: 'कुल ईएमआई',
    availableSurplus: 'उपलब्ध बचत',
    language: 'भाषा',
    manualEntry: 'मैन्युअल प्रविष्टि',
    addData: 'डेटा जोड़ें',
    enterFinancialDetails: 'वित्तीय विवरण दर्ज करें',
    monthlyExpenses: 'मासिक खर्च',
    existingDebt: 'मौजूदा कर्ज़',
    monthlySavings: 'मासिक बचत',
    missedPayments: 'छूटी हुई किश्तें (12 महीने)',
    cancel: 'रद्द करें',
    generateScore: 'स्कोर बनाएं',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return localStorage.getItem('credimerge_language') === 'hi' ? 'hi' : 'en';
  });

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('credimerge_language', nextLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: (key) => translations[language][key] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be inside LanguageProvider');
  return context;
}
