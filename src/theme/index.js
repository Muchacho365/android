import { createContext, useContext } from 'react';

const darkColors = {
  bg: '#0a0c12',
  surface: '#0f1219',
  card: '#141824',
  hover: '#1a2035',
  dim: '#1e2438',
  text: '#d4dbe8',
  textSoft: '#8899aa',
  muted: '#5d6b84',
  accent: '#4d9fff',
  accentSoft: 'rgba(77,159,255,0.15)',
  green: '#34d399',
  greenSoft: 'rgba(52,211,153,0.15)',
  orange: '#fb923c',
  orangeSoft: 'rgba(251,146,60,0.15)',
  red: '#f87171',
  redSoft: 'rgba(248,113,113,0.15)',
  purple: '#a78bfa',
  purpleSoft: 'rgba(167,139,250,0.15)',
  yellow: '#fbbf24',
  border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.14)',
  priorityHigh: '#f87171',
  priorityMedium: '#fb923c',
  priorityLow: '#34d399',
  todo: '#4d9fff',
  inProgress: '#fb923c',
  done: '#34d399',
};

const lightColors = {
  bg: '#f3f7fb',
  surface: '#ffffff',
  card: '#ffffff',
  hover: '#eef4fb',
  dim: '#dfe8f3',
  text: '#102033',
  textSoft: '#4e647d',
  muted: '#8093a8',
  accent: '#1d72d8',
  accentSoft: 'rgba(29,114,216,0.12)',
  green: '#0f9f6e',
  greenSoft: 'rgba(15,159,110,0.12)',
  orange: '#de7a1d',
  orangeSoft: 'rgba(222,122,29,0.12)',
  red: '#d94b5c',
  redSoft: 'rgba(217,75,92,0.12)',
  purple: '#6f56d9',
  purpleSoft: 'rgba(111,86,217,0.12)',
  yellow: '#d7a00e',
  border: 'rgba(16,32,51,0.10)',
  borderHi: 'rgba(16,32,51,0.18)',
  priorityHigh: '#d94b5c',
  priorityMedium: '#de7a1d',
  priorityLow: '#0f9f6e',
  todo: '#1d72d8',
  inProgress: '#de7a1d',
  done: '#0f9f6e',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const font = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const getTheme = (mode = 'dark') => {
  const colors = mode === 'light' ? lightColors : darkColors;
  return {
    mode,
    colors,
    spacing,
    radius,
    font,
    shadow,
    cardStyle: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      ...shadow.sm,
    },
    inputStyle: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: font.md,
      minHeight: 44,
    },
  };
};

export const ThemeContext = createContext(getTheme('dark'));
export const useAppTheme = () => useContext(ThemeContext);

// Legacy exports for untouched screens.
export const colors = darkColors;
export const cardStyle = getTheme('dark').cardStyle;
export const inputStyle = getTheme('dark').inputStyle;
