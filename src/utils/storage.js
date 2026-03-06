/**
 * utils/storage.js — Local storage for Android
 *
 * HOW IT WORKS:
 * AsyncStorage is React Native's equivalent of localStorage.
 * It stores data as key-value pairs on the device.
 * Everything is saved as JSON string and parsed on load.
 *
 * This is the LOCAL layer — data is always saved here first,
 * before anything goes to the cloud. So the app works fully offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_DATA_KEY = 'pm_app_data';
const USER_KEY     = 'pm_user';
const DEVICE_KEY   = 'pm_device_id';
const PENDING_SYNC_KEY = 'pm_pending_sync';

export const storage = {

  // ─── Save all app data ──────────────────────────────────────────────────
  save: async (data) => {
    try {
      await AsyncStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage] Save failed:', e);
    }
  },

  // ─── Load all app data ──────────────────────────────────────────────────
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(APP_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage] Load failed:', e);
      return null;
    }
  },

  // ─── User session ───────────────────────────────────────────────────────
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
    } catch (e) {
      return null;
    }
  },

  clearUser: async () => {
    await AsyncStorage.removeItem(USER_KEY);
  },

  // ─── Pending cloud sync payload (offline queue) ────────────────────────
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
    } catch (e) {
      return null;
    }
  },

  clearPendingSync: async () => {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  },

  // ─── Device ID ──────────────────────────────────────────────────────────
  // Each device gets a unique ID so we can ignore our own sync updates
  getDeviceId: async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = 'rn_device_' + Math.random().toString(36).slice(2, 14);
        await AsyncStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) {
      return 'rn_device_unknown';
    }
  },

  // ─── Clear everything (logout / reset) ─────────────────────────────────
  clearAll: async () => {
    await AsyncStorage.multiRemove([APP_DATA_KEY, USER_KEY, PENDING_SYNC_KEY]);
  },
};
