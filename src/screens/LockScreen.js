import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import { hashText } from '../utils/helpers';

export default function LockScreen({ email, expectedHash, onUnlock }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, shadow } = theme;

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const unlock = () => {
    if (hashText(pin) !== expectedHash) {
      setError('Wrong PIN. Try again.');
      return;
    }

    setError('');
    setPin('');
    onUnlock();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.subtitle}>Enter your PIN to unlock {email || 'Personal Manager'}.</Text>

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={(value) => {
            setPin(value.replace(/[^0-9]/g, '').slice(0, 8));
            setError('');
          }}
          placeholder="PIN"
          placeholderTextColor={colors.muted}
          secureTextEntry
          keyboardType="number-pad"
          autoFocus
          onSubmitEditing={unlock}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={unlock}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow }) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      borderRadius: radius.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xxl,
      alignItems: 'center',
      ...shadow.md,
    },
    icon: { fontSize: 44, marginBottom: spacing.md },
    title: { color: colors.text, fontSize: font.xxl, fontWeight: font.heavy, marginBottom: spacing.xs },
    subtitle: { color: colors.textSoft, fontSize: font.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
    input: {
      width: '100%',
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: font.lg,
      textAlign: 'center',
      letterSpacing: 6,
      marginBottom: spacing.md,
    },
    error: { color: colors.red, fontSize: font.xs, marginBottom: spacing.md },
    button: {
      width: '100%',
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: font.md, fontWeight: font.bold },
  });
