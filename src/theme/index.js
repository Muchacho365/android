/**
 * theme.js
 * Central design system for the RN app.
 * All screens import from here — never hardcode colors or spacing.
 */

export const colors = {
  // Backgrounds
  bg:        '#0a0c12',
  surface:   '#0f1219',
  card:      '#141824',
  hover:     '#1a2035',
  dim:       '#1e2438',

  // Text
  text:      '#d4dbe8',
  textSoft:  '#8899aa',
  muted:     '#3d4963',

  // Accent
  accent:    '#4d9fff',
  accentSoft:'rgba(77,159,255,0.15)',
  green:     '#34d399',
  greenSoft: 'rgba(52,211,153,0.15)',
  orange:    '#fb923c',
  orangeSoft:'rgba(251,146,60,0.15)',
  red:       '#f87171',
  redSoft:   'rgba(248,113,113,0.15)',
  purple:    '#a78bfa',
  purpleSoft:'rgba(167,139,250,0.15)',
  yellow:    '#fbbf24',

  // Borders
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',

  // Priority colors
  priorityHigh:   '#f87171',
  priorityMedium: '#fb923c',
  priorityLow:    '#34d399',

  // Status colors
  todo:       '#4d9fff',
  inProgress: '#fb923c',
  done:       '#34d399',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl:48,
};

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999,
};

export const font = {
  // Sizes
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  26,
  xxxl: 32,

  // Weights
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
};

// Reusable card style
export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  ...shadow.sm,
};

// Reusable input style
export const inputStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  fontSize: font.md,
  minHeight: 44,
};
