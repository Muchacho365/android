import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme';
import { storage } from '../utils/storage';
import useStore from '../store';

const emailToUid = (email) => {
  let hash = 0;
  for (let index = 0; index < email.length; index++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(index);
    hash |= 0;
  }
  return `uid_${Math.abs(hash).toString(36)}_${email.split('@')[0]}`;
};

export default function LoginScreen({ onLogin }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setUser = useStore((state) => state.setUser);

  const handleLogin = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = { email: trimmed, uid: emailToUid(trimmed) };
      await storage.saveUser(user);
      await storage.clearSyncSectionHashes();
      await storage.clearSyncArrayIndexes();
      await storage.clearPendingSync();
      setUser(user);
      onLogin(user);
    } catch (err) {
      setError('Could not start your session. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <Text style={styles.logo}>📋</Text>
            <Text style={styles.title}>Personal Manager</Text>
            <Text style={styles.subtitle}>
              Use the same email on Android and Windows. Your local data stays offline-first and syncs when the cloud is available.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What this login does</Text>
            <Text style={styles.infoText}>It creates a stable local identity from your email, then uses that same identity for cloud sync. No password server is involved yet.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle, inputStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.lg,
    },
    heroCard: {
      ...cardStyle,
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    logo: { fontSize: 56, marginBottom: spacing.md },
    title: { color: colors.text, fontSize: font.xxxl, fontWeight: font.heavy, marginBottom: spacing.sm },
    subtitle: {
      color: colors.textSoft,
      fontSize: font.sm,
      textAlign: 'center',
      lineHeight: 20,
    },
    formCard: { ...cardStyle },
    label: { color: colors.textSoft, fontSize: font.sm, fontWeight: font.medium, marginBottom: spacing.sm },
    input: { ...inputStyle, marginBottom: spacing.sm },
    inputError: { borderColor: colors.red },
    error: { color: colors.red, fontSize: font.xs, marginBottom: spacing.md },
    button: {
      minHeight: 50,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: font.md, fontWeight: font.bold },
    infoCard: {
      ...cardStyle,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    infoTitle: { color: colors.text, fontSize: font.sm, fontWeight: font.bold, marginBottom: spacing.xs },
    infoText: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18 },
  });
