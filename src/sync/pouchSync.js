/**
 * sync/pouchSync.js — Cross-device sync via PouchDB + CouchDB
 *
 * ═══════════════════════════════════════════════════════════
 * HOW THIS WORKS (read this carefully, this is the key part):
 * ═══════════════════════════════════════════════════════════
 *
 * PouchDB is a JavaScript database that runs INSIDE the app (on device).
 * CouchDB is a database that runs on a SERVER (in the cloud).
 *
 * PouchDB was built specifically to sync with CouchDB.
 * They speak the same language — it's like two of the same app
 * on different machines talking to each other.
 *
 * THE FLOW:
 *
 *   [Electron App]                    [React Native App]
 *        │                                   │
 *        │ uses PouchDB locally              │ uses PouchDB locally
 *        │                                   │
 *        └──────────► [CouchDB Server] ◄─────┘
 *                      (your cloud DB)
 *                      /userdata/{uid}/
 *
 * When you save on Electron → PouchDB pushes to CouchDB
 * When RN app opens → PouchDB pulls from CouchDB
 * They can also LIVE SYNC — changes appear in real time
 *
 * BOTH APPS USE THE SAME USER ID (from email login)
 * That's how they know they're the same person's data.
 *
 * ═══════════════════════════════════════════════════════════
 * SETUP:
 * You need a CouchDB server. Options:
 *   1. IBM Cloudant (free tier) — cloudant.com
 *   2. Self-hosted CouchDB on any VPS
 *   3. couchdb.com managed hosting
 *
 * Replace COUCHDB_URL below with your server URL.
 * Format: https://username:password@your-server/
 * ═══════════════════════════════════════════════════════════
 */

import PouchDB from 'pouchdb-react-native';
import PouchDBFind from 'pouchdb-find';
import { storage } from '../utils/storage';

PouchDB.plugin(PouchDBFind);

// ─── YOUR COUCHDB SERVER URL ─────────────────────────────────────────────────
// Replace this with your actual CouchDB/Cloudant URL
// IBM Cloudant example: https://apikey:password@yourinstance.cloudant.com
const COUCHDB_URL = 'YOUR_COUCHDB_URL_HERE';

// The document ID we store app data under in CouchDB
const DOC_ID = 'appdata';

// ─── State ───────────────────────────────────────────────────────────────────
let _localDB   = null;   // PouchDB instance on this device
let _remoteDB  = null;   // CouchDB instance on server
let _syncHandler = null; // Live sync handler (to cancel it later)
let _deviceId  = null;

// ─── Get or create the local PouchDB ─────────────────────────────────────────
const getLocalDB = async (uid) => {
  if (_localDB) return _localDB;
  // Database name includes uid so each user has their own DB on device
  _localDB = new PouchDB(`pm_${uid}`);
  _deviceId = await storage.getDeviceId();
  return _localDB;
};

// ─── Get remote CouchDB reference ────────────────────────────────────────────
const getRemoteDB = (uid) => {
  if (_remoteDB) return _remoteDB;
  if (COUCHDB_URL === 'YOUR_COUCHDB_URL_HERE') {
    console.warn('[Sync] CouchDB URL not configured. Running offline only.');
    return null;
  }
  // Each user gets their own database on the server: pm_uid123
  _remoteDB = new PouchDB(`${COUCHDB_URL}/pm_${uid}`);
  return _remoteDB;
};

// ─── Push data to cloud ───────────────────────────────────────────────────────
// Called automatically after every save()
export const pushToCloud = async (data) => {
  const user = await storage.loadUser();
  if (!user?.uid) return; // Not logged in, skip

  const localDB  = await getLocalDB(user.uid);
  const remoteDB = getRemoteDB(user.uid);
  if (!remoteDB) return;

  try {
    // Try to get existing doc (we need the _rev to update it)
    let existing = null;
    try {
      existing = await localDB.get(DOC_ID);
    } catch (e) {
      // Doc doesn't exist yet — that's fine
    }

    // Save to local PouchDB first
    await localDB.put({
      _id:      DOC_ID,
      _rev:     existing?._rev,
      ...data,
      _deviceId,
      _updatedAt: new Date().toISOString(),
    });

    // Then replicate local → remote (this is the "push to cloud" step)
    // replication = copying all local changes to the server
    await localDB.replicate.to(remoteDB, {
      doc_ids: [DOC_ID],  // Only sync this one document
    });

    console.log('[Sync] Pushed to cloud ✓');
  } catch (e) {
    console.error('[Sync] Push failed:', e.message);
    throw e;
  }
};

// ─── Pull latest data from cloud ─────────────────────────────────────────────
// Called on app start to get fresh data
export const pullFromCloud = async () => {
  const user = await storage.loadUser();
  if (!user?.uid) return null;

  const localDB  = await getLocalDB(user.uid);
  const remoteDB = getRemoteDB(user.uid);
  if (!remoteDB) return null;

  try {
    // Pull = copy from server to local
    await localDB.replicate.from(remoteDB, {
      doc_ids: [DOC_ID],
    });

    // Now read the local copy
    const doc = await localDB.get(DOC_ID);
    const { _id, _rev, _deviceId, _updatedAt, ...appData } = doc;
    return appData;
  } catch (e) {
    if (e.name === 'not_found') return null; // No data yet on server
    console.error('[Sync] Pull failed:', e.message);
    return null;
  }
};

// ─── Live sync — listens for changes in real time ─────────────────────────────
// This is what makes it real-time. When Electron changes something,
// CouchDB notifies this app and we update the UI automatically.
export const startLiveSync = async (onRemoteChange) => {
  const user = await storage.loadUser();
  if (!user?.uid) return;

  const localDB  = await getLocalDB(user.uid);
  const remoteDB = getRemoteDB(user.uid);
  if (!remoteDB) return;

  // Stop any existing sync first
  stopLiveSync();

  console.log('[Sync] Starting live sync...');

  _syncHandler = localDB.sync(remoteDB, {
    live:   true,   // Keep listening forever (not just a one-time sync)
    retry:  true,   // Auto-reconnect if connection drops
    doc_ids: [DOC_ID],
  })
  .on('change', async (change) => {
    // A change came in — but is it from another device or from us?
    if (change.direction === 'pull') {
      // This came FROM the server (i.e. from Electron or another device)
      console.log('[Sync] Remote change received');
      try {
        const doc = await localDB.get(DOC_ID);
        // Skip if this change was pushed by this same device
        if (doc._deviceId === _deviceId) return;
        const { _id, _rev, _deviceId: _d, _updatedAt, ...appData } = doc;
        onRemoteChange(appData);  // Tell the store to update
      } catch (e) {
        console.warn('[Sync] Could not read updated doc:', e.message);
      }
    }
  })
  .on('active',   () => console.log('[Sync] Active'))
  .on('paused',   () => console.log('[Sync] Paused (waiting for changes)'))
  .on('error',    (e) => console.error('[Sync] Error:', e.message));
};

// ─── Stop live sync ───────────────────────────────────────────────────────────
export const stopLiveSync = () => {
  if (_syncHandler) {
    _syncHandler.cancel();
    _syncHandler = null;
    console.log('[Sync] Stopped');
  }
};

// ─── Reset (on logout) ────────────────────────────────────────────────────────
export const resetSync = () => {
  stopLiveSync();
  _localDB  = null;
  _remoteDB = null;
  _deviceId = null;
};

// ─── Is sync configured? ──────────────────────────────────────────────────────
export const isSyncConfigured = () => COUCHDB_URL !== 'YOUR_COUCHDB_URL_HERE';
