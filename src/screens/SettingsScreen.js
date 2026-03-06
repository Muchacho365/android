/**
 * screens/SettingsScreen.js
 * Sync settings, export/import, user info, logout
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Share,
  TextInput, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { colors, spacing, radius, font, cardStyle } from '../theme';
import { storage } from '../utils/storage';
import { pushToCloud, pullFromCloud, isSyncConfigured } from '../sync/pouchSync';

export default function SettingsScreen({ onLogout }) {
  const user        = useStore(s => s.user);
  const syncStatus  = useStore(s => s.syncStatus);
  const setSyncStatus = useStore(s => s.setSyncStatus);
  const getSnapshot = useStore(s => s.getSnapshot);
  const applyData   = useStore(s => s.applyData);

  const [syncing,      setSyncing]      = useState(false);
  const [showCouchDB,  setShowCouchDB]  = useState(false);
  const [couchUrl,     setCouchUrl]     = useState('');

  // ─── Manual sync ─────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!isSyncConfigured()) { setShowCouchDB(true); return; }
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await pushToCloud(getSnapshot());
      setSyncStatus('synced');
      Alert.alert('✅ Synced', 'Your data has been pushed to the cloud.');
    } catch (e) {
      setSyncStatus('error');
      Alert.alert('❌ Sync failed', e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!isSyncConfigured()) { setShowCouchDB(true); return; }
    setSyncing(true);
    try {
      const data = await pullFromCloud();
      if (data) {
        applyData(data);
        await storage.save(data);
        Alert.alert('✅ Pulled', 'Latest cloud data applied to this device.');
      } else {
        Alert.alert('No data', 'No cloud data found for your account yet.');
      }
    } catch (e) {
      Alert.alert('❌ Pull failed', e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const data    = getSnapshot();
    const json    = JSON.stringify(data, null, 2);
    const filename = `personal-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    try {
      await Share.share({ message: json, title: filename });
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Your local data stays on this device. Sign back in with the same email to resync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await storage.clearUser();
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userId}>ID: {user?.uid}</Text>
            </View>
          </View>
        </View>

        {/* Sync */}
        <Text style={styles.sectionLabel}>Sync</Text>

        {/* Sync status banner */}
        <View style={[styles.syncBanner, { borderLeftColor: syncStatus === 'synced' ? colors.green : syncStatus === 'error' ? colors.red : colors.accent }]}>
          <Text style={styles.syncBannerTitle}>
            {syncStatus === 'synced' ? '✅ Synced' : syncStatus === 'error' ? '❌ Sync error' : syncStatus === 'syncing' ? '🔄 Syncing...' : '☁️ Cloud Sync'}
          </Text>
          <Text style={styles.syncBannerDesc}>
            {isSyncConfigured()
              ? 'CouchDB configured. Same email on Electron = same data.'
              : 'Configure your CouchDB URL to enable cross-device sync with your Electron app.'}
          </Text>
        </View>

        <View style={styles.card}>
          <SettingRow
            icon="cloud-upload-outline"
            label="Push to Cloud"
            desc="Send this device's data to the cloud"
            onPress={handleSync}
            loading={syncing}
            color={colors.accent}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="cloud-download-outline"
            label="Pull from Cloud"
            desc="Get latest data from the cloud"
            onPress={handlePull}
            loading={syncing}
            color={colors.green}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="settings-outline"
            label="Configure CouchDB"
            desc={isSyncConfigured() ? 'URL configured ✓' : 'Tap to enter your CouchDB URL'}
            onPress={() => setShowCouchDB(true)}
            color={colors.orange}
          />
        </View>

        {/* How sync works */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔄 How sync works with Electron</Text>
          <Text style={styles.infoText}>
            1. Both apps connect to the same CouchDB server{'\n'}
            2. They use your email as the user ID{'\n'}
            3. Changes on either device sync in real-time{'\n'}
            4. Works offline — changes queue and sync when back online
          </Text>
        </View>

        {/* Backup */}
        <Text style={styles.sectionLabel}>Backup</Text>
        <View style={styles.card}>
          <SettingRow
            icon="share-outline"
            label="Export as JSON"
            desc="Share your data as a backup file"
            onPress={handleExport}
            color={colors.purple}
          />
        </View>

        {/* Danger */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign out"
            desc="Local data stays on device"
            onPress={handleLogout}
            color={colors.red}
          />
        </View>

        <Text style={styles.version}>Personal Manager v1.0.0</Text>

      </ScrollView>

      {/* CouchDB Modal */}
      <Modal visible={showCouchDB} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowCouchDB(false)}>
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Configure CouchDB</Text>
            <Text style={styles.modalDesc}>
              Enter your CouchDB or IBM Cloudant URL.{'\n'}
              Format: https://user:password@host.com
            </Text>
            <TextInput
              style={styles.input}
              placeholder="https://user:pass@yourserver.com"
              placeholderTextColor={colors.muted}
              value={couchUrl}
              onChangeText={setCouchUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.modalNote}>
              This URL is stored only on this device. Both your Electron app and this app need the same URL.
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, !couchUrl.trim() && { opacity:0.4 }]}
              disabled={!couchUrl.trim()}
              onPress={() => {
                // In production: save to encrypted storage
                // For now: alert the user that they need to update pouchSync.js
                Alert.alert(
                  'Almost there!',
                  `Open src/sync/pouchSync.js and replace YOUR_COUCHDB_URL_HERE with:\n\n${couchUrl.trim()}`,
                  [{ text: 'Got it', onPress: () => setShowCouchDB(false) }]
                );
              }}
            >
              <Text style={styles.saveBtnText}>Save URL</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

function SettingRow({ icon, label, desc, onPress, loading, color }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIcon, { backgroundColor: color + '22' }]}>
        {loading
          ? <ActivityIndicator size="small" color={color} />
          : <Ionicons name={icon} size={18} color={color} />
        }
      </View>
      <View style={{ flex:1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {desc ? <Text style={styles.settingDesc}>{desc}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:   { flex:1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 60 },

  sectionLabel: { fontSize: font.xs, color: colors.muted, fontWeight: font.semibold, textTransform:'uppercase', letterSpacing:0.15, marginBottom: spacing.sm, marginTop: spacing.lg },

  card: { ...cardStyle, padding:0, overflow:'hidden', marginBottom: spacing.sm },
  row:  { flexDirection:'row', alignItems:'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width:44, height:44, borderRadius:22, backgroundColor: colors.accentSoft, alignItems:'center', justifyContent:'center' },
  avatarText: { fontSize: font.lg, fontWeight: font.bold, color: colors.accent },
  userEmail: { fontSize: font.md, fontWeight: font.semibold, color:'#fff' },
  userId: { fontSize: font.xs, color: colors.muted, marginTop:2 },

  syncBanner: { borderLeftWidth:3, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth:1, borderColor: colors.border },
  syncBannerTitle: { fontSize: font.sm, fontWeight: font.bold, color:'#fff', marginBottom:4 },
  syncBannerDesc:  { fontSize: font.xs, color: colors.textSoft, lineHeight:17 },

  settingRow: { flexDirection:'row', alignItems:'center', gap: spacing.md, padding: spacing.lg },
  settingIcon: { width:36, height:36, borderRadius: radius.sm, alignItems:'center', justifyContent:'center' },
  settingLabel: { fontSize: font.sm, fontWeight: font.medium, color:'#fff', marginBottom:2 },
  settingDesc:  { fontSize: font.xs, color: colors.muted },
  divider: { height:1, backgroundColor: colors.border, marginLeft: spacing.lg + 36 + spacing.md },

  infoBox: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth:1, borderColor: colors.border, borderLeftWidth:3, borderLeftColor: colors.accent, padding: spacing.md, marginBottom: spacing.sm },
  infoTitle: { fontSize: font.sm, fontWeight: font.semibold, color:'#fff', marginBottom: spacing.xs },
  infoText:  { fontSize: font.xs, color: colors.textSoft, lineHeight:18 },

  version: { textAlign:'center', fontSize: font.xs, color: colors.muted, marginTop: spacing.xl },

  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
  modalTitle: { fontSize: font.lg, fontWeight: font.bold, color:'#fff', marginBottom: spacing.sm },
  modalDesc:  { fontSize: font.sm, color: colors.textSoft, lineHeight:20, marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth:1, borderColor: colors.border, color: colors.text, padding: spacing.lg, fontSize: font.sm, marginBottom: spacing.sm, fontFamily:'monospace' },
  modalNote: { fontSize: font.xs, color: colors.muted, lineHeight:17, marginBottom: spacing.lg },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, alignItems:'center' },
  saveBtnText: { color:'#fff', fontWeight: font.bold, fontSize: font.md },
});
