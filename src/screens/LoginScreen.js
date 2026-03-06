/**
 * screens/LoginScreen.js
 *
 * HOW AUTH WORKS HERE:
 * 1. User enters email
 * 2. We generate a uid from the email (SHA-like hash)
 * 3. Save user to local storage
 * 4. App loads their data from CouchDB under that uid
 *
 * For production magic link: integrate with any auth provider
 * that supports email (Firebase Auth, Supabase, etc.) and
 * replace the uid generation with the real uid from that provider.
 * The rest of the sync code doesn't change at all.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { storage } from '../utils/storage';
import useStore from '../store';

// Simple deterministic uid from email (no server needed for now)
// Replace with real auth provider uid in production
const emailToUid = (email) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return 'uid_' + Math.abs(hash).toString(36) + '_' + email.split('@')[0];
};

export default function LoginScreen({ onLogin }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const setUser = useStore(s => s.setUser);

  const handleLogin = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const uid  = emailToUid(trimmed);
      const user = { email: trimmed, uid };

      // Save session locally
      await storage.saveUser(user);
      setUser(user);

      // Tell App.js we're logged in
      onLogin(user);
    } catch (e) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo / Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>📋</Text>
            <Text style={styles.title}>Personal Manager</Text>
            <Text style={styles.subtitle}>
              Your email is your identity.{'\n'}Same email on any device = same data.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Continue →</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🔄 How sync works</Text>
            <Text style={styles.infoText}>
              Use the same email on your Windows app and this phone — your todos, notes, books, and everything else will stay in sync automatically.
            </Text>
          </View>

          <Text style={styles.note}>
            No password needed. Your data is tied to your email.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },

  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo:   { fontSize: 56, marginBottom: spacing.lg },
  title:  {
    fontSize: font.xxxl, fontWeight: font.heavy,
    color: '#fff', letterSpacing: -0.5, marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: font.sm, color: colors.textSoft,
    textAlign: 'center', lineHeight: 20,
  },

  form:  { marginBottom: spacing.xl },
  label: { fontSize: font.sm, color: colors.textSoft, marginBottom: spacing.sm, fontWeight: font.medium },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: font.md,
    marginBottom: spacing.md,
  },
  inputError: { borderColor: colors.red },
  errorText:  { fontSize: font.xs, color: colors.red, marginBottom: spacing.md },

  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...require('../theme').shadow.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: font.md, fontWeight: font.bold },

  infoBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoTitle: { fontSize: font.sm, fontWeight: font.semibold, color: '#fff', marginBottom: spacing.xs },
  infoText:  { fontSize: font.xs, color: colors.textSoft, lineHeight: 18 },

  note: { fontSize: font.xs, color: colors.muted, textAlign: 'center' },
});
