import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store';
import { useAppTheme } from '../theme';

const topEntries = (record, limit = 5) =>
  Object.entries(record || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

export default function AiToolsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, cardStyle } = theme;

  const aiAnalysis = useStore((s) => s.aiAnalysis);
  const prioritizedTodos = useStore((s) => s.prioritizedTodos) || [];
  const securityHealth = useStore((s) => s.securityHealth);
  const dailyBriefing = useStore((s) => s.dailyBriefing);
  const refreshAiSnapshot = useStore((s) => s.refreshAiSnapshot);

  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    await refreshAiSnapshot();
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Command Center</Text>
            <Text style={styles.subtitle}>Priority, note insights, security health, and a daily briefing built from your local data.</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
            <Text style={styles.refreshBtnText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.briefingCard, { borderColor: colors.accent }]}> 
          <Text style={styles.sectionTitle}>Daily Briefing</Text>
          <Text style={styles.briefingText}>{dailyBriefing || 'Refresh the dashboard to generate a briefing.'}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Smart Prioritization</Text>
            {prioritizedTodos.length > 0 ? prioritizedTodos.slice(0, 4).map((todo) => (
              <View key={todo.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{todo.text}</Text>
                <Text style={styles.scoreText}>Score {Math.round(todo.aiScore || 0)}</Text>
              </View>
            )) : <Text style={styles.placeholder}>No prioritized tasks yet.</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Security Audit</Text>
            <Text style={[styles.bigValue, { color: securityHealth?.score >= 80 ? colors.green : colors.orange }]}>
              {securityHealth?.score ?? '--'}%
            </Text>
            <Text style={styles.mutedText}>Health score</Text>
            {(securityHealth?.risks || []).length > 0 ? securityHealth.risks.slice(0, 4).map((risk, index) => (
              <Text key={`${risk}_${index}`} style={styles.riskText}>• {risk}</Text>
            )) : <Text style={styles.placeholder}>No issues detected yet.</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top Keywords</Text>
          {topEntries(aiAnalysis?.indicators, 6).length > 0 ? topEntries(aiAnalysis?.indicators, 6).map(([name, count]) => (
            <View key={name} style={styles.statRow}>
              <Text style={styles.rowTitle}>{name}</Text>
              <Text style={styles.scoreText}>{count}</Text>
            </View>
          )) : <Text style={styles.placeholder}>No note analysis yet.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detected Tickers</Text>
          {topEntries(aiAnalysis?.tickers, 6).length > 0 ? (
            <View style={styles.wrapRow}>
              {topEntries(aiAnalysis?.tickers, 6).map(([ticker, count]) => (
                <View key={ticker} style={styles.pill}>
                  <Text style={styles.pillText}>{ticker} · {count}</Text>
                </View>
              ))}
            </View>
          ) : <Text style={styles.placeholder}>No uppercase tickers found in your notes.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pattern Discovery</Text>
          {topEntries(aiAnalysis?.patterns, 6).length > 0 ? topEntries(aiAnalysis?.patterns, 6).map(([name, count]) => (
            <View key={name} style={styles.statRow}>
              <Text style={styles.rowTitle}>{name}</Text>
              <Text style={styles.scoreText}>{count}</Text>
            </View>
          )) : <Text style={styles.placeholder}>No patterns detected yet.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.lg },
    title: { color: colors.text, fontSize: font.xxl, fontWeight: font.heavy, marginBottom: spacing.xs },
    subtitle: { color: colors.textSoft, fontSize: font.sm, lineHeight: 20 },
    refreshBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      ...shadow.sm,
    },
    refreshBtnText: { color: '#fff', fontWeight: font.bold },
    briefingCard: {
      ...cardStyle,
      borderWidth: 1,
      borderLeftWidth: 3,
      marginBottom: spacing.lg,
    },
    briefingText: { color: colors.text, fontSize: font.sm, lineHeight: 20 },
    grid: { gap: spacing.sm, marginBottom: spacing.sm },
    card: { ...cardStyle, marginBottom: spacing.sm },
    sectionTitle: { color: colors.text, fontSize: font.md, fontWeight: font.bold, marginBottom: spacing.sm },
    rowCard: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    rowTitle: { color: colors.text, fontSize: font.sm, fontWeight: font.medium },
    scoreText: { color: colors.accent, fontSize: font.xs, fontWeight: font.bold, marginTop: 4 },
    mutedText: { color: colors.textSoft, fontSize: font.xs, marginBottom: spacing.sm },
    bigValue: { fontSize: 34, fontWeight: font.heavy, marginBottom: spacing.xs },
    riskText: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18, marginBottom: 4 },
    placeholder: { color: colors.textSoft, fontSize: font.sm },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillText: { color: colors.accent, fontSize: font.xs, fontWeight: font.semibold },
  });
