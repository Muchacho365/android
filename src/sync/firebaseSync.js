import { getApp, getApps, initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { storage } from "../utils/storage";

const SYNC_COLLECTION = "pm_user_data";
const SYNC_RETRY_MS = 15000;

let _db = null;
let _deviceId = null;
let _syncUnsubscribe = null;
let _syncRetryTimer = null;
let _isConfigured = false;

const hasRequiredConfig = (config) =>
  Boolean(
    config &&
      config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
  );

export const refreshSyncConfig = async () => {
  const config = await storage.loadFirebaseConfig();
  _isConfigured = hasRequiredConfig(config);
  return _isConfigured;
};

export const isSyncConfigured = () => _isConfigured;

const getFirestoreDb = async () => {
  const config = await storage.loadFirebaseConfig();
  if (!hasRequiredConfig(config)) {
    _isConfigured = false;
    return null;
  }

  _isConfigured = true;

  if (!_db) {
    const app = getApps().length ? getApp() : initializeApp(config);
    _db = getFirestore(app);
  }

  return _db;
};

const getUserDocRef = async () => {
  const user = await storage.loadUser();
  if (!user?.uid) return null;

  const db = await getFirestoreDb();
  if (!db) return null;

  return doc(db, SYNC_COLLECTION, user.uid);
};

const buildPayload = (data) => ({
  data,
  updatedAtClient: new Date().toISOString(),
  deviceId: _deviceId,
  updatedAtServer: serverTimestamp(),
});

const flushPendingSync = async () => {
  const pending = await storage.loadPendingSync();
  if (!pending?.data) return;

  const ref = await getUserDocRef();
  if (!ref) return;

  await setDoc(ref, pending, { merge: true });
  await storage.clearPendingSync();
};

export const pushToCloud = async (data) => {
  const ref = await getUserDocRef();
  if (!ref) return;

  _deviceId = _deviceId || (await storage.getDeviceId());
  const payload = buildPayload(data);

  try {
    await setDoc(ref, payload, { merge: true });
    await storage.clearPendingSync();
  } catch (e) {
    await storage.savePendingSync(payload);
    throw e;
  }
};

export const pullFromCloud = async () => {
  const ref = await getUserDocRef();
  if (!ref) return null;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const remote = snap.data();
    return remote?.data || null;
  } catch (e) {
    console.warn("[Sync] Pull failed:", e?.message || e);
    return null;
  }
};

export const startLiveSync = async (onRemoteChange) => {
  _deviceId = _deviceId || (await storage.getDeviceId());

  const ref = await getUserDocRef();
  if (!ref) return;

  stopLiveSync();

  _syncUnsubscribe = onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const remote = snapshot.data();
      if (!remote?.data) return;
      if (remote.deviceId && remote.deviceId === _deviceId) return;
      onRemoteChange(remote.data);
    },
    (error) => {
      console.warn("[Sync] Live sync listener error:", error?.message || error);
    }
  );

  flushPendingSync().catch(() => {});
  _syncRetryTimer = setInterval(() => {
    flushPendingSync().catch(() => {});
  }, SYNC_RETRY_MS);
};

export const stopLiveSync = () => {
  if (_syncUnsubscribe) {
    _syncUnsubscribe();
    _syncUnsubscribe = null;
  }
  if (_syncRetryTimer) {
    clearInterval(_syncRetryTimer);
    _syncRetryTimer = null;
  }
};
