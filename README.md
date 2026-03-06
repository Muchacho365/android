# Personal Manager — React Native

## Project Structure

```
PersonalManagerRN/
├── App.js                          ← Root: navigation + auth flow
├── src/
│   ├── theme/index.js              ← All colors, spacing, fonts
│   ├── store/index.js              ← Global state (Zustand)
│   ├── utils/
│   │   ├── storage.js              ← AsyncStorage (local persistence)
│   │   └── helpers.js              ← uuid, formatDate, etc.
│   ├── sync/
│   │   └── pouchSync.js            ← PouchDB ↔ CouchDB sync engine
│   └── screens/
│       ├── LoginScreen.js          ← Email identity
│       ├── TodosScreen.js          ← Kanban board
│       ├── NotesScreen.js          ← Notes grid
│       ├── BooksScreen.js          ← Reading tracker
│       ├── VideosScreen.js         ← Watch list
│       └── SettingsScreen.js       ← Sync config, export, logout
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the app
```bash
npx expo start --android
```
Scan the QR code with Expo Go app on your phone.

---

## Connect Sync with Electron App

### Step 1 — Get a CouchDB server

**Option A: IBM Cloudant (free, hosted)**
1. Go to https://cloud.ibm.com → create account
2. Search "Cloudant" → create instance (Lite plan = free)
3. Go to Service credentials → New credential → copy the URL
   Format: `https://apikey-xxx:password@accountname.cloudant.com`

**Option B: Self-hosted CouchDB**
```bash
docker run -d -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password couchdb:latest
# URL: http://admin:password@localhost:5984
```

### Step 2 — Add URL to React Native app

Open `src/sync/pouchSync.js` and replace:
```js
const COUCHDB_URL = 'YOUR_COUCHDB_URL_HERE';
```
with your actual URL.

### Step 3 — Add same URL to Electron app

In your Electron app's sync module, use the same CouchDB URL.
The Electron app uses PouchDB too — same protocol, same server.

Both apps use the same email → same uid → same database name: `pm_{uid}`

### Step 4 — Test sync

1. Open RN app → Login with email
2. Open Electron app → Login with same email
3. Add a todo in the RN app
4. Watch it appear in Electron within 1-2 seconds ✓

---

## How the sync actually works

```
RN App (Android)                Electron App (Desktop)
     │                                  │
     │  PouchDB (local)                 │  PouchDB (local)
     │      │                           │      │
     │      │ replicate                 │      │ replicate
     │      ▼                           │      ▼
     └──────────► CouchDB Server ◄──────┘
                  /pm_{uid}/
                  (your data)
```

1. You save data → stored in local PouchDB first
2. PouchDB replicates to CouchDB server (push)
3. Other device's PouchDB gets notified (live sync)
4. Other device pulls the change
5. UI updates automatically

Offline: changes queue in local PouchDB, sync when reconnected.

---

## Adding Securities screen

The Securities screen (Passwords, API Keys, Cards) follows the same
pattern as the other screens. The encryption uses react-native-encrypted-storage
for proper hardware-backed encryption on Android.

To add it: create `src/screens/SecuritiesScreen.js` following the
same pattern as `TodosScreen.js`, using the store's password/api/card actions.
