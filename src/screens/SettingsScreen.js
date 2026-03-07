import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useStore from '../store';
import { useAppTheme } from '../theme';
import { storage } from '../utils/storage';
import { pushToCloud, pullFromCloud, flushScheduledPush } from '../sync/firebaseSync';

export default function SettingsScreen({
  onLogout,
  lockConfigured,
  onSetLockPin,
  onClearLockPin,
  onLockNow,
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, font } = theme;

  const user = useStore((state) => state.user);
  const syncStatus = useStore((state) => state.syncStatus);
  const setSyncStatus = useStore((state) => state.setSyncStatus);
  const getSnapshot = useStore((state) => state.getSnapshot);
  const applyData = useStore((state) => state.applyData);
  const themeMode = useStore((state) => state.themeMode);
  const setThemeMode = useStore((state) => state.setThemeMode);

  const [syncing, setSyncing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const handlePush = async () => {
    setSyncing(true);
    setSyncStatus('syncing');

    try {
      const result = await pushToCloud(getSnapshot());
      setSyncStatus('synced');

      const changedCount = result?.changedSections?.length || 0;
      Alert.alert(
        'Sync complete',
        changedCount > 0
          ? `Pushed ${changedCount} changed section${changedCount === 1 ? '' : 's'} to Firebase.`
          : 'Nothing changed, so no cloud write was needed.'
      );
    } catch (error) {
      setSyncStatus('error');
      if (error?.code === 'payload-too-large') {
        const section = error?.section ? ` (${error.section})` : '';
        const itemId = error?.itemId ? `\nItem: ${error.itemId}` : '';
        Alert.alert('Sync failed', `Cloud payload too large${section}.${itemId}`);
      } else {
        Alert.alert('Sync failed', error?.message || 'Unknown sync error');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    setSyncing(true);
    setSyncStatus('syncing');

    try {
      const data = await pullFromCloud();
      if (!data) {
        setSyncStatus('synced');
        Alert.alert('No cloud data', 'No synced data was found for this email yet.');
        return;
      }

      applyData(data);
      await storage.save(useStore.getState().getSnapshot());
      setSyncStatus('synced');
      Alert.alert('Pull complete', 'Latest cloud changes were applied on this device.');
    } catch (error) {
      setSyncStatus('error');
      Alert.alert('Pull failed', error?.message || 'Unknown pull error');
    } finally {
      setSyncing(false);
    }
  };

  const handleFlush = async () => {
    setSyncing(true);
    setSyncStatus('syncing');

    try {
      const result = await flushScheduledPush();
      setSyncStatus('synced');
      Alert.alert(
        'Auto-sync flushed',
        result?.changedSections?.length
          ? 'Queued local changes were pushed now.'
          : 'There was no queued local change waiting to sync.'
      );
    } catch (error) {
      setSyncStatus('error');
      Alert.alert('Flush failed', error?.message || 'Unknown sync error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    const data = getSnapshot();
    const json = JSON.stringify(data, null, 2);
    const filename = `personal-manager-backup-${new Date().toISOString().split('T')[0]}.json`;

    try {
      await Share.share({ message: json, title: filename });
    } catch (error) {
      Alert.alert('Export failed', error?.message || 'Could not export backup.');
    }
  };

  const openPinModal = () => {
    setPin('');
    setConfirmPin('');
    setShowPinModal(true);
  };

  const savePin = async () => {
    const trimmedPin = pin.trim();
    const trimmedConfirm = confirmPin.trim();

    if (!/^\d{4,8}$/.test(trimmedPin)) {
      Alert.alert('Invalid PIN', 'Use a 4 to 8 digit PIN.');
      return;
    }

    if (trimmedPin !== trimmedConfirm) {
      Alert.alert('PIN mismatch', 'PIN and confirmation do not match.');
      return;
    }

    setSavingPin(true);
    try {
      await onSetLockPin(trimmedPin);
      setShowPinModal(false);
      Alert.alert('App lock enabled', 'The app will require your PIN after you background or lock it.');
    } finally {
      setSavingPin(false);
    }
  };

  const removePin = () => {
    Alert.alert(
      'Remove app lock?',
      'This will disable PIN protection on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await onClearLockPin();
            Alert.alert('App lock removed', 'PIN protection is now disabled.');
          },
        },
      ]
    );
  };

  const logout = () => {
    Alert.alert(
      'Sign out',
      'Your local data stays on this device. Signing in again with the same email will reconnect sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await flushScheduledPush().catch(() => {});
            await storage.clearUser();
            onLogout();
          },
        },
      ]
    );
  };

  const syncTone =
    syncStatus === 'synced'
      ? colors.green
      : syncStatus === 'error'
      ? colors.red
      : colors.accent;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
              <Text style={styles.userId}>Sync ID: {user?.uid || 'n/a'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Cloud Sync</Text>
        <View style={[styles.banner, { borderLeftColor: syncTone }]}> 
          <Text style={styles.bannerTitle}>
            {syncStatus === 'synced'
              ? 'Cloud sync is healthy'
              : syncStatus === 'error'
              ? 'Cloud sync needs attention'
              : syncStatus === 'syncing'
              ? 'Sync in progress'
              : 'Offline-first sync'}
          </Text>
          <Text style={styles.bannerText}>
            Local changes save instantly. Android now queues cloud writes and pushes after you pause, when you background the app, or when you sync manually.
          </Text>
        </View>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon="cloud-upload-outline"
            color={colors.accent}
            label="Sync Now"
            description="Push this device's latest state to Firebase"
            loading={syncing}
            onPress={handlePush}
          />
          <View style={styles.divider} />
          <SettingRow
            theme={theme}
            icon="download-outline"
            color={colors.green}
            label="Pull Cloud Changes"
            description="Fetch remote updates without waiting for the live listener"
            loading={syncing}
            onPress={handlePull}
          />
          <View style={styles.divider} />
          <SettingRow
            theme={theme}
            icon="time-outline"
            color={colors.orange}
            label="Flush Queued Sync"
            description="Force any queued auto-sync write to run now"
            loading={syncing}
            onPress={handleFlush}
          />
        </View>

        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme</Text>
          <View style={styles.themeRow}>
            {['dark', 'light'].map((mode) => {
              const active = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeButton,
                    active && {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accent,
                    },
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Ionicons
                    name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
                    size={16}
                    color={active ? colors.accent : colors.textSoft}
                  />
                  <Text
                    style={[
                      styles.themeButtonText,
                      { color: active ? colors.accent : colors.textSoft },
                    ]}
                  >
                    {mode === 'dark' ? 'Dark' : 'Light'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Lock</Text>
          <Text style={styles.cardDescription}>
            Protect the vault, notes, and everything else on this device with a PIN.
          </Text>
          <View style={styles.securityActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={openPinModal}>
              <Text style={styles.primaryButtonText}>{lockConfigured ? 'Change PIN' : 'Set PIN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onLockNow}>
              <Text style={styles.secondaryButtonText}>Lock Now</Text>
            </TouchableOpacity>
          </View>
          {lockConfigured ? (
            <TouchableOpacity style={styles.removeButton} onPress={removePin}>
              <Text style={styles.removeButtonText}>Remove PIN</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Backup</Text>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon="share-social-outline"
            color={colors.purple}
            label="Export JSON Backup"
            description="Share the current local snapshot as a backup"
            onPress={handleExport}
          />
        </View>

        <Text style={styles.sectionLabel}>Session</Text>
        <View style={styles.card}>
          <SettingRow
            theme={theme}
            icon="log-out-outline"
            color={colors.red}
            label="Sign Out"
            description="Local data stays on the device"
            onPress={logout}
          />
        </View>

        <Text style={styles.version}>Personal Manager Android</Text>
      </ScrollView>

      <Modal visible={showPinModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowPinModal(false)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{lockConfigured ? 'Change App PIN' : 'Set App PIN'}</Text>
            <Text style={styles.modalText}>Use a 4 to 8 digit PIN. It stays on this device only.</Text>

            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={(value) => setPin(value.replace(/[^0-9]/g, '').slice(0, 8))}
              placeholder="PIN"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={confirmPin}
              onChangeText={(value) => setConfirmPin(value.replace(/[^0-9]/g, '').slice(0, 8))}
              placeholder="Confirm PIN"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowPinModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={savePin} disabled={savingPin}>
                {savingPin ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save PIN</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SettingRow({ theme, icon, label, description, onPress, loading, color }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;

  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.settingIcon, { backgroundColor: `${color}22` }]}>
        {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={18} color={color} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle, inputStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    sectionLabel: {
      fontSize: font.xs,
      color: colors.muted,
      fontWeight: font.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    card: { ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: spacing.xs },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    avatarText: { color: colors.accent, fontSize: font.lg, fontWeight: font.bold },
    userEmail: { color: colors.text, fontSize: font.md, fontWeight: font.bold },
    userId: { color: colors.textSoft, fontSize: font.xs, marginTop: 3 },
    banner: {
      borderLeftWidth: 3,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    bannerTitle: { color: colors.text, fontSize: font.sm, fontWeight: font.bold, marginBottom: 4 },
    bannerText: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18 },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    settingIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingLabel: { color: colors.text, fontSize: font.sm, fontWeight: font.semibold, marginBottom: 2 },
    settingDescription: { color: colors.textSoft, fontSize: font.xs, lineHeight: 17 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 38 + spacing.md },
    cardTitle: { color: colors.text, fontSize: font.sm, fontWeight: font.bold, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    cardDescription: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    themeRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
    themeButton: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    themeButtonText: { fontSize: font.sm, fontWeight: font.semibold },
    securityActions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
    primaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.sm,
    },
    primaryButtonText: { color: '#fff', fontSize: font.sm, fontWeight: font.bold },
    secondaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: { color: colors.text, fontSize: font.sm, fontWeight: font.semibold },
    removeButton: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      minHeight: 42,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.red,
      backgroundColor: colors.redSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeButtonText: { color: colors.red, fontSize: font.sm, fontWeight: font.semibold },
    version: { color: colors.muted, fontSize: font.xs, textAlign: 'center', marginTop: spacing.xl },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modal: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    modalTitle: { color: colors.text, fontSize: font.xl, fontWeight: font.bold, marginBottom: spacing.xs },
    modalText: { color: colors.textSoft, fontSize: font.sm, lineHeight: 20, marginBottom: spacing.lg },
    input: { ...inputStyle, marginBottom: spacing.md },
    modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  });
