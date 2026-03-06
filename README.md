# Personal Manager (Expo + Firebase Offline-First Sync)

This app now uses:
- `AsyncStorage` for local/offline data (always-first write)
- `Firebase Firestore` for cloud sync between devices

## How Sync Works

1. Any change in app state is saved locally first (`AsyncStorage`).
2. The app tries to push the latest snapshot to Firestore.
3. If internet is unavailable, the payload is queued locally.
4. A retry loop pushes queued changes when connection returns.
5. A Firestore live listener pulls updates from other devices.

Result: offline-first behavior with cross-device sync when online.

## Current Architecture

- Local data store: `src/utils/storage.js`
- Sync engine: `src/sync/firebaseSync.js`
- Global state: `src/store/index.js` (Zustand)
- Startup + listener wiring: `App.js`
- Sync controls + Firebase config UI: `src/screens/SettingsScreen.js`

## 1. Firebase Project Setup

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Add a **Web app** to the project
4. Copy the Firebase config object (`apiKey`, `authDomain`, `projectId`, `appId`, etc.)
5. In Firebase Console, enable **Firestore Database** (Production or Test mode)

## 2. Firestore Security Rules

Because this app currently uses deterministic UID from email (no Firebase Auth yet), use a controlled rule for development first:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pm_user_data/{userId} {
      allow read, write: if true;
    }
  }
}
```

Important: this is open for development only. Lock it down once Firebase Auth is added.

## 3. Install / Run

```bash
npm install
npx expo start -c --android
```

## 4. Configure Firebase in the App

1. Open **Settings**
2. Tap **Configure Firebase**
3. Paste your Firebase web config JSON
4. Tap **Save Config**

Example:

```json
{
  "apiKey": "AIza...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef"
}
```

## 5. Cross-Device Sync Test

1. Device A: login with email `you@example.com`
2. Device B: login with same email
3. Add or edit a todo/note/book/video on A
4. B should receive update via Firestore snapshot listener
5. Turn off internet on A, make changes, then reconnect: queued snapshot syncs automatically

## Notes / Limits

- Current sync is snapshot-based (latest full state wins).
- Conflict handling is last-write-wins.
- For stronger conflict resolution, move to per-entity docs with revisioning.
- The old PouchDB/CouchDB sync module remains in the repo but is no longer used.
