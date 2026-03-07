/**
 * utils/storage.js — Local storage for Android
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_DATA_KEY = 'pm_app_data';
const USER_KEY = 'pm_user';
const DEVICE_KEY = 'pm_device_id';
const PENDING_SYNC_KEY = 'pm_pending_sync';
const SYNC_SECTION_HASHES_KEY = 'pm_sync_section_hashes';
const SYNC_ARRAY_INDEXES_KEY = 'pm_sync_array_indexes';
const THEME_MODE_KEY = 'pm_theme_mode';
const LOCK_PIN_HASH_KEY = 'pm_lock_pin_hash';

export const storage = {
  save: async (data) => {
    try {
      await AsyncStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage] Save failed:', e);
    }
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(APP_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage] Load failed:', e);
      return null;
    }
  },

  saveUser: async (user) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('[Storage] Save user failed:', e);
    }
  },

  loadUser: async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearUser: async () => {
    await AsyncStorage.removeItem(USER_KEY);
  },

  savePendingSync: async (payload) => {
    try {
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('[Storage] Save pending sync failed:', e);
    }
  },

  loadPendingSync: async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearPendingSync: async () => {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  },

  saveSyncSectionHashes: async (hashes) => {
    try {
      await AsyncStorage.setItem(SYNC_SECTION_HASHES_KEY, JSON.stringify(hashes || {}));
    } catch (e) {
      console.error('[Storage] Save section hashes failed:', e);
    }
  },

  loadSyncSectionHashes: async () => {
    try {
      const raw = await AsyncStorage.getItem(SYNC_SECTION_HASHES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  clearSyncSectionHashes: async () => {
    await AsyncStorage.removeItem(SYNC_SECTION_HASHES_KEY);
  },

  saveSyncArrayIndexes: async (indexes) => {
    try {
      await AsyncStorage.setItem(SYNC_ARRAY_INDEXES_KEY, JSON.stringify(indexes || {}));
    } catch (e) {
      console.error('[Storage] Save array indexes failed:', e);
    }
  },

  loadSyncArrayIndexes: async () => {
    try {
      const raw = await AsyncStorage.getItem(SYNC_ARRAY_INDEXES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  clearSyncArrayIndexes: async () => {
    await AsyncStorage.removeItem(SYNC_ARRAY_INDEXES_KEY);
  },

  saveThemeMode: async (mode) => {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode || 'dark');
    } catch (e) {
      console.error('[Storage] Save theme failed:', e);
    }
  },

  loadThemeMode: async () => {
    try {
      return (await AsyncStorage.getItem(THEME_MODE_KEY)) || 'dark';
    } catch {
      return 'dark';
    }
  },

  saveLockPinHash: async (hash) => {
    try {
      await AsyncStorage.setItem(LOCK_PIN_HASH_KEY, hash || '');
    } catch (e) {
      console.error('[Storage] Save lock pin failed:', e);
    }
  },

  loadLockPinHash: async () => {
    try {
      return (await AsyncStorage.getItem(LOCK_PIN_HASH_KEY)) || '';
    } catch {
      return '';
    }
  },

  clearLockPinHash: async () => {
    await AsyncStorage.removeItem(LOCK_PIN_HASH_KEY);
  },

  getDeviceId: async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = 'rn_device_' + Math.random().toString(36).slice(2, 14);
        await AsyncStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch {
      return 'rn_device_unknown';
    }
  },

  clearAll: async () => {
    await AsyncStorage.multiRemove([
      APP_DATA_KEY,
      USER_KEY,
      PENDING_SYNC_KEY,
      SYNC_SECTION_HASHES_KEY,
      SYNC_ARRAY_INDEXES_KEY,
      THEME_MODE_KEY,
      LOCK_PIN_HASH_KEY,
    ]);
  },
};
