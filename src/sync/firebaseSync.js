import { getApp, getApps, initializeApp } from "firebase/app";
import {
	deleteDoc,
	doc,
	getDoc,
	getFirestore,
	onSnapshot,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";
import { storage } from "../utils/storage";

const SYNC_COLLECTION = "pm_user_data";
const SECTIONS_SUBCOLLECTION = "sections";
const ARRAY_ITEMS_SUBCOLLECTION = "items";
const ITEM_CHUNKS_SUBCOLLECTION = "chunks";
const SYNC_SCHEMA_VERSION = 3;
const SYNC_RETRY_MS = 60000;
const SCHEDULED_PUSH_DELAY_MS = 20000;
const MAX_DOC_BYTES = 900 * 1024;
const MAX_INLINE_ITEM_BYTES = 700 * 1024;
const ITEM_CHUNK_BYTES = 240 * 1024;

const FIREBASE_CONFIG = {
	apiKey: "AIzaSyAikRl0YHSLtE_U0ZPGiSlFisWqj3LtcAs",
	authDomain: "personal-manager-773f8.firebaseapp.com",
	projectId: "personal-manager-773f8",
	storageBucket: "personal-manager-773f8.firebasestorage.app",
	messagingSenderId: "781821792144",
	appId: "1:781821792144:web:b9df67be87e4d6df772d15",
};

const CLOUD_SECTIONS = [
	"todos",
	"passwords",
	"apis",
	"cards",
	"videos",
	"books",
	"notes",
	"events",
	"aiAnalysis",
	"prioritizedTodos",
	"securityHealth",
	"dailyBriefing",
];

const ARRAY_SECTIONS = new Set([
	"todos",
	"passwords",
	"apis",
	"cards",
	"videos",
	"books",
	"notes",
	"events",
]);

let _db = null;
let _deviceId = null;
let _syncUnsubscribe = null;
let _syncRetryTimer = null;
let _scheduledPushTimer = null;
let _scheduledPushPayload = null;
let _isConfigured = true;

export const refreshSyncConfig = async () => {
	_isConfigured = true;
	return _isConfigured;
};

export const isSyncConfigured = () => _isConfigured;

const getFirestoreDb = async () => {
	if (!_db) {
		const app = getApps().length
			? getApp()
			: initializeApp(FIREBASE_CONFIG);
		_db = getFirestore(app);
	}

	return _db;
};

const getCurrentUser = async () => storage.loadUser();

const SYNC_DOC_PATH = (uid) => `${SYNC_COLLECTION}/${uid}`;

const logPermissionHint = async (op, error, extras = {}) => {
	const user = await getCurrentUser();
	const uid = user?.uid || "unknown_uid";
	const code = error?.code || "unknown_code";
	const message = error?.message || String(error);

	console.warn(
		`[Sync] ${op} failed`,
		JSON.stringify({
			code,
			message,
			projectId: FIREBASE_CONFIG.projectId,
			docPath: SYNC_DOC_PATH(uid),
			uid,
			...extras,
		}),
	);

	if (
		code === "permission-denied" ||
		message.includes("Missing or insufficient permissions")
	) {
		console.warn(
			"[Sync] Firestore rule hint: allow read, write on pm_user_data/{userId} and nested subcollections for development.",
		);
	}
};

const getRootDocRef = async () => {
	const user = await getCurrentUser();
	if (!user?.uid) return null;

	const db = await getFirestoreDb();
	if (!db) return null;

	return doc(db, SYNC_COLLECTION, user.uid);
};

const getSectionDocRef = async (section) => {
	const user = await getCurrentUser();
	if (!user?.uid) return null;

	const db = await getFirestoreDb();
	if (!db) return null;

	return doc(db, SYNC_COLLECTION, user.uid, SECTIONS_SUBCOLLECTION, section);
};

const getArrayItemDocRef = async (section, itemId) => {
	const user = await getCurrentUser();
	if (!user?.uid) return null;

	const db = await getFirestoreDb();
	if (!db) return null;

	return doc(
		db,
		SYNC_COLLECTION,
		user.uid,
		SECTIONS_SUBCOLLECTION,
		section,
		ARRAY_ITEMS_SUBCOLLECTION,
		encodeURIComponent(itemId),
	);
};

const getArrayItemChunkDocRef = async (section, itemId, chunkIndex) => {
	const user = await getCurrentUser();
	if (!user?.uid) return null;

	const db = await getFirestoreDb();
	if (!db) return null;

	return doc(
		db,
		SYNC_COLLECTION,
		user.uid,
		SECTIONS_SUBCOLLECTION,
		section,
		ARRAY_ITEMS_SUBCOLLECTION,
		encodeURIComponent(itemId),
		ITEM_CHUNKS_SUBCOLLECTION,
		`chunk_${String(chunkIndex).padStart(5, "0")}`,
	);
};

const defaultForSection = (section) =>
	ARRAY_SECTIONS.has(section) ? [] : null;

const makeEntityId = (item) =>
	String(item?.id ?? item?._id ?? hashString(JSON.stringify(item)));

const normalizeSnapshot = (data) => {
	const source = data && typeof data === "object" ? data : {};
	const normalized = {};

	CLOUD_SECTIONS.forEach((section) => {
		if (Object.prototype.hasOwnProperty.call(source, section)) {
			normalized[section] = source[section];
			return;
		}
		normalized[section] = defaultForSection(section);
	});

	return normalized;
};

const hashString = (text) => {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash << 5) - hash + text.charCodeAt(i);
		hash |= 0;
	}
	return `h${Math.abs(hash).toString(36)}_${text.length}`;
};

const sortRecord = (record) =>
	Object.keys(record || {})
		.sort()
		.reduce((acc, key) => {
			acc[key] = record[key];
			return acc;
		}, {});

const stableStringifyRecord = (record) => JSON.stringify(sortRecord(record));

const normalizeArrayIndex = (index) => ({
	items: sortRecord(index?.items || {}),
	deleted: sortRecord(index?.deleted || {}),
});

const byteLength = (text) => {
	try {
		return new TextEncoder().encode(text).length;
	} catch {
		return unescape(encodeURIComponent(text)).length;
	}
};

const splitTextByByteLength = (text, maxBytes) => {
	const source = typeof text === "string" ? text : String(text || "");
	if (!source) return [""];

	const chunks = [];
	let current = "";
	let currentBytes = 0;

	for (const char of source) {
		const charBytes = byteLength(char);

		if (current && currentBytes + charBytes > maxBytes) {
			chunks.push(current);
			current = char;
			currentBytes = charBytes;
			continue;
		}

		current += char;
		currentBytes += charBytes;
	}

	if (current || chunks.length === 0) {
		chunks.push(current);
	}

	return chunks;
};

const rehydrateLegacyInlineItem = (itemData) => {
	if (itemData?.content == null && Array.isArray(itemData?.contentChunks)) {
		const restored = {
			...itemData,
			content: itemData.contentChunks.join(""),
		};
		delete restored.contentChunks;
		return restored;
	}

	return itemData;
};

const makeTombstoneVersion = (itemId) =>
	`d_${Date.now().toString(36)}_${hashString(itemId)}`;

const buildScalarSectionState = (sectionData) => {
	const payloadString = JSON.stringify(sectionData);
	return {
		version: hashString(payloadString),
		payloadString,
		payloadBytes: byteLength(payloadString),
		data: sectionData,
	};
};

const buildArraySectionState = (sectionItems, previousIndex) => {
	const prior = normalizeArrayIndex(previousIndex);
	const nextItems = {};
	const nextDeleted = { ...prior.deleted };
	const upsertItems = [];
	const currentIds = new Set();

	(Array.isArray(sectionItems) ? sectionItems : []).forEach((item) => {
		const itemId = makeEntityId(item);
		const payloadString = JSON.stringify(item);
		const payloadBytes = byteLength(payloadString);
		const version = hashString(payloadString);
		const chunkPayloads =
			payloadBytes > MAX_INLINE_ITEM_BYTES
				? splitTextByByteLength(payloadString, ITEM_CHUNK_BYTES)
				: null;

		nextItems[itemId] = version;
		currentIds.add(itemId);
		delete nextDeleted[itemId];

		if (prior.items[itemId] !== version || prior.deleted[itemId]) {
			upsertItems.push({
				itemId,
				item,
				version,
				payloadString,
				payloadBytes,
				chunkPayloads,
			});
		}
	});

	Object.keys(prior.items).forEach((itemId) => {
		if (!currentIds.has(itemId) && !nextDeleted[itemId]) {
			nextDeleted[itemId] = makeTombstoneVersion(itemId);
		}
	});

	const removedIds = Object.keys(nextDeleted).filter(
		(itemId) => prior.deleted[itemId] !== nextDeleted[itemId],
	);

	const nextIndex = normalizeArrayIndex({
		items: nextItems,
		deleted: nextDeleted,
	});

	return {
		version: hashString(
			JSON.stringify({
				items: stableStringifyRecord(nextIndex.items),
				deleted: stableStringifyRecord(nextIndex.deleted),
			}),
		),
		nextIndex,
		upsertItems,
		removedIds,
	};
};

const extractLegacyPayload = (remote) => {
	if (!remote) return null;
	if (remote.data) return remote.data;

	if (typeof remote.payloadString === "string") {
		try {
			return JSON.parse(remote.payloadString);
		} catch {
			return null;
		}
	}

	return null;
};

const extractScalarSectionPayload = (remote, section) => {
	if (!remote) return defaultForSection(section);

	if (typeof remote.payloadString === "string") {
		try {
			return JSON.parse(remote.payloadString);
		} catch {
			return defaultForSection(section);
		}
	}

	if (Object.prototype.hasOwnProperty.call(remote, "data")) {
		return remote.data;
	}

	return defaultForSection(section);
};

const extractArrayManifestPayload = (remote) => ({
	kind: remote?.kind || "",
	itemVersions: sortRecord(remote?.itemVersions || {}),
	deletedItemVersions: sortRecord(remote?.deletedItemVersions || {}),
	updatedAtClient: remote?.updatedAtClient || "",
	deviceId: remote?.deviceId || "",
});

const extractArrayItemPayload = (remote, fallbackItemId) => {
	if (!remote) return null;

	if (typeof remote.payloadString === "string") {
		try {
			return {
				itemId: remote.itemId || fallbackItemId,
				data: rehydrateLegacyInlineItem(JSON.parse(remote.payloadString)),
				version: remote.version || "",
				chunkCount: 0,
				isChunked: false,
			};
		} catch {
			return null;
		}
	}

	if (remote.isChunked === true || Number(remote.chunkCount || 0) > 0) {
		return {
			itemId: remote.itemId || fallbackItemId,
			data: null,
			version: remote.version || "",
			chunkCount: Number(remote.chunkCount || 0),
			isChunked: true,
		};
	}

	if (Object.prototype.hasOwnProperty.call(remote, "data")) {
		return {
			itemId: remote.itemId || fallbackItemId,
			data: rehydrateLegacyInlineItem(remote.data),
			version: remote.version || "",
			chunkCount: Number(remote.chunkCount || 0),
			isChunked: remote.isChunked === true,
		};
	}

	return null;
};

const buildScalarSectionPayload = (sectionData, version) => ({
	payloadString: JSON.stringify(sectionData),
	version,
	updatedAtClient: new Date().toISOString(),
	deviceId: _deviceId,
	updatedAtServer: serverTimestamp(),
});

const buildArrayManifestPayload = (arrayIndex) => ({
	kind: "items",
	itemVersions: arrayIndex.items,
	deletedItemVersions: arrayIndex.deleted,
	updatedAtClient: new Date().toISOString(),
	deviceId: _deviceId,
	updatedAtServer: serverTimestamp(),
});

const buildArrayItemPayload = (itemState) => ({
	itemId: itemState.itemId,
	version: itemState.version,
	chunkCount: itemState.chunkPayloads?.length || 0,
	isChunked: Boolean(itemState.chunkPayloads),
	...(itemState.chunkPayloads
		? {}
		: { payloadString: itemState.payloadString }),
	updatedAtClient: new Date().toISOString(),
	deviceId: _deviceId,
	updatedAtServer: serverTimestamp(),
});

const buildArrayItemChunkPayload = (payloadSegment, index) => ({
	index,
	payloadSegment,
	updatedAtClient: new Date().toISOString(),
	deviceId: _deviceId,
	updatedAtServer: serverTimestamp(),
});

const loadChunkedArrayItem = async (section, itemMeta) => {
	if (!itemMeta?.isChunked || itemMeta.chunkCount <= 0) {
		return { ok: false, reason: "corrupt_chunked_item" };
	}

	let payloadString = "";

	for (let index = 0; index < itemMeta.chunkCount; index++) {
		const chunkRef = await getArrayItemChunkDocRef(section, itemMeta.itemId, index);
		if (!chunkRef) {
			return { ok: false, reason: "missing_email" };
		}

		const chunkSnap = await getDoc(chunkRef);
		if (!chunkSnap.exists()) {
			return {
				ok: false,
				reason: "corrupt_chunked_item",
				detail: `Missing chunk ${index} for ${section}/${itemMeta.itemId}`,
			};
		}

		const chunkData = chunkSnap.data();
		if (typeof chunkData?.payloadSegment !== "string") {
			return {
				ok: false,
				reason: "corrupt_chunked_item",
				detail: `Invalid chunk ${index} for ${section}/${itemMeta.itemId}`,
			};
		}

		payloadString += chunkData.payloadSegment;
	}

	try {
		return {
			ok: true,
			data: rehydrateLegacyInlineItem(JSON.parse(payloadString)),
		};
	} catch {
		return {
			ok: false,
			reason: "corrupt_chunked_item",
			detail: `Invalid JSON for ${section}/${itemMeta.itemId}`,
		};
	}
};

const buildRootManifestPayload = (sectionVersions) => ({
	schemaVersion: SYNC_SCHEMA_VERSION,
	sectionVersions,
	updatedAtClient: new Date().toISOString(),
	deviceId: _deviceId,
	updatedAtServer: serverTimestamp(),
});

const readStoredSectionVersions = async () =>
	(await storage.loadSyncSectionHashes()) || {};

const storeSectionVersions = async (versions) => {
	await storage.saveSyncSectionHashes(versions || {});
};

const readStoredArrayIndexes = async () => {
	const raw = (await storage.loadSyncArrayIndexes()) || {};
	const normalized = {};

	Object.entries(raw).forEach(([section, index]) => {
		normalized[section] = normalizeArrayIndex(index);
	});

	return normalized;
};

const storeArrayIndexes = async (indexes) => {
	const normalized = {};
	Object.entries(indexes || {}).forEach(([section, index]) => {
		normalized[section] = normalizeArrayIndex(index);
	});
	await storage.saveSyncArrayIndexes(normalized);
};

const pullSectionsFromManifestV2 = async (manifest) => {
	const remoteVersions = manifest?.sectionVersions || {};
	const localVersions = await readStoredSectionVersions();

	const changedSections = CLOUD_SECTIONS.filter((section) => {
		const remote = remoteVersions[section];
		return remote && localVersions[section] !== remote;
	});

	if (changedSections.length === 0) {
		return null;
	}

	const partial = {};

	for (const section of changedSections) {
		const sectionRef = await getSectionDocRef(section);
		if (!sectionRef) continue;

		const snap = await getDoc(sectionRef);
		if (!snap.exists()) {
			partial[section] = defaultForSection(section);
			continue;
		}

		partial[section] = extractScalarSectionPayload(snap.data(), section);
	}

	await storeSectionVersions({ ...localVersions, ...remoteVersions });
	return partial;
};

const pullArraySectionByManifestV3 = async (section, localIndex) => {
	const manifestRef = await getSectionDocRef(section);
	if (!manifestRef) {
		return {
			ok: true,
			delta: { upsert: [], remove: [] },
			nextIndex: normalizeArrayIndex({ items: {}, deleted: {} }),
		};
	}

	const manifestSnap = await getDoc(manifestRef);
	if (!manifestSnap.exists()) {
		return {
			ok: true,
			delta: { upsert: [], remove: Object.keys(localIndex.items || {}) },
			nextIndex: normalizeArrayIndex({ items: {}, deleted: {} }),
		};
	}

	const remoteManifest = extractArrayManifestPayload(manifestSnap.data());
	const remoteIndex = normalizeArrayIndex({
		items: remoteManifest.itemVersions,
		deleted: remoteManifest.deletedItemVersions,
	});

	const changedItemIds = Object.keys(remoteIndex.items).filter(
		(itemId) => localIndex.items[itemId] !== remoteIndex.items[itemId],
	);
	const removedIds = Object.keys(remoteIndex.deleted).filter(
		(itemId) => localIndex.deleted[itemId] !== remoteIndex.deleted[itemId],
	);

	const upsert = [];
	for (const itemId of changedItemIds) {
		const itemRef = await getArrayItemDocRef(section, itemId);
		if (!itemRef) continue;

		const itemSnap = await getDoc(itemRef);
		if (!itemSnap.exists()) {
			if (!removedIds.includes(itemId)) {
				removedIds.push(itemId);
			}
			continue;
		}

		const decodedItem = extractArrayItemPayload(itemSnap.data(), itemId);
		if (decodedItem?.data) {
			upsert.push(decodedItem.data);
			continue;
		}

		if (decodedItem?.isChunked) {
			const chunkedItem = await loadChunkedArrayItem(section, decodedItem);
			if (!chunkedItem.ok) {
				return chunkedItem;
			}
			upsert.push(chunkedItem.data);
		}
	}


	return {
		ok: true,
		delta: {
			upsert,
			remove: removedIds,
		},
		nextIndex: remoteIndex,
	};
};

const pullFromManifestV3 = async (manifest) => {
	const remoteVersions = manifest?.sectionVersions || {};
	const localVersions = await readStoredSectionVersions();
	const localArrayIndexes = await readStoredArrayIndexes();
	const nextArrayIndexes = { ...localArrayIndexes };
	const patch = {};
	const delta = {};

	const changedSections = CLOUD_SECTIONS.filter((section) => {
		const remote = remoteVersions[section];
		return remote && localVersions[section] !== remote;
	});

	if (changedSections.length === 0) {
		return null;
	}

	for (const section of changedSections) {
		if (ARRAY_SECTIONS.has(section)) {
			const localIndex = normalizeArrayIndex(localArrayIndexes[section]);
			const arrayPull = await pullArraySectionByManifestV3(
				section,
				localIndex,
			);
			if (!arrayPull.ok) return null;

			nextArrayIndexes[section] = arrayPull.nextIndex;
			if (
				arrayPull.delta &&
				(arrayPull.delta.upsert.length > 0 ||
					arrayPull.delta.remove.length > 0)
			) {
				delta[section] = arrayPull.delta;
			}
			continue;
		}

		const sectionRef = await getSectionDocRef(section);
		if (!sectionRef) continue;

		const sectionSnap = await getDoc(sectionRef);
		if (!sectionSnap.exists()) {
			patch[section] = defaultForSection(section);
			continue;
		}

		patch[section] = extractScalarSectionPayload(
			sectionSnap.data(),
			section,
		);
	}

	if (Object.keys(delta).length > 0) {
		patch.__delta = delta;
	}

	await storeSectionVersions({ ...localVersions, ...remoteVersions });
	await storeArrayIndexes(nextArrayIndexes);

	return Object.keys(patch).length > 0 ? patch : null;
};

const clearOversizePending = async () => {
	await storage.clearPendingSync();
};

const flushPendingSync = async () => {
	const pending = await storage.loadPendingSync();
	if (!pending || typeof pending !== "object") return;

	try {
		await pushToCloud(pending);
		await storage.clearPendingSync();
	} catch (error) {
		if (error?.code === "payload-too-large") {
			await clearOversizePending();
		}
	}
};

export const scheduleSyncPush = (snapshot, delayMs = SCHEDULED_PUSH_DELAY_MS) => {
	_scheduledPushPayload = snapshot;

	if (_scheduledPushTimer) {
		clearTimeout(_scheduledPushTimer);
	}

	_scheduledPushTimer = setTimeout(async () => {
		const payload = _scheduledPushPayload;
		_scheduledPushPayload = null;
		_scheduledPushTimer = null;

		if (!payload) return;

		try {
			await pushToCloud(payload);
		} catch (error) {
			console.warn('[Sync] Scheduled push failed:', error?.message || error);
		}
	}, delayMs);
};

export const flushScheduledPush = async () => {
	if (_scheduledPushTimer) {
		clearTimeout(_scheduledPushTimer);
		_scheduledPushTimer = null;
	}

	const payload = _scheduledPushPayload;
	_scheduledPushPayload = null;

	if (!payload) return null;

	try {
		return await pushToCloud(payload);
	} catch (error) {
		console.warn('[Sync] Flush scheduled push failed:', error?.message || error);
		return null;
	}
};

export const pushToCloud = async (data) => {
	const rootRef = await getRootDocRef();
	if (!rootRef) return { changedSections: [] };

	_deviceId = _deviceId || (await storage.getDeviceId());

	const normalized = normalizeSnapshot(data);
	const localRootVersions = await readStoredSectionVersions();
	const localArrayIndexes = await readStoredArrayIndexes();
	const nextRootVersions = {};
	const nextArrayIndexes = { ...localArrayIndexes };
	const changedSections = [];

	try {
		for (const section of CLOUD_SECTIONS) {
			if (ARRAY_SECTIONS.has(section)) {
				const arrayState = buildArraySectionState(
					normalized[section],
					localArrayIndexes[section],
				);
				nextRootVersions[section] = arrayState.version;
				nextArrayIndexes[section] = arrayState.nextIndex;

				if (localRootVersions[section] === arrayState.version) {
					continue;
				}

				changedSections.push(section);

				for (const itemState of arrayState.upsertItems) {
					const itemRef = await getArrayItemDocRef(section, itemState.itemId);
					if (!itemRef) continue;

					await setDoc(itemRef, buildArrayItemPayload(itemState), { merge: true });

					if (itemState.chunkPayloads) {
						for (let index = 0; index < itemState.chunkPayloads.length; index++) {
							const chunkRef = await getArrayItemChunkDocRef(section, itemState.itemId, index);
							if (!chunkRef) continue;

							await setDoc(
								chunkRef,
								buildArrayItemChunkPayload(itemState.chunkPayloads[index], index),
								{ merge: true },
							);
						}
					}
				}

				for (const itemId of arrayState.removedIds) {
					const itemRef = await getArrayItemDocRef(section, itemId);
					if (!itemRef) continue;
					await deleteDoc(itemRef).catch(() => {});
				}

				const manifestRef = await getSectionDocRef(section);
				if (!manifestRef) continue;

				await setDoc(
					manifestRef,
					buildArrayManifestPayload(arrayState.nextIndex),
					{
						merge: true,
					},
				);
				continue;
			}

			const scalarState = buildScalarSectionState(normalized[section]);
			nextRootVersions[section] = scalarState.version;

			if (localRootVersions[section] === scalarState.version) {
				continue;
			}

			if (scalarState.payloadBytes > MAX_DOC_BYTES) {
				const error = new Error(
					`payload_too_large:${section}::${scalarState.payloadBytes}`,
				);
				error.code = "payload-too-large";
				error.section = section;
				throw error;
			}

			changedSections.push(section);

			const sectionRef = await getSectionDocRef(section);
			if (!sectionRef) continue;

			await setDoc(
				sectionRef,
				buildScalarSectionPayload(
					scalarState.data,
					scalarState.version,
				),
				{ merge: true },
			);
		}

		if (changedSections.length === 0) {
			return { changedSections: [] };
		}

		await setDoc(rootRef, buildRootManifestPayload(nextRootVersions), {
			merge: true,
		});
		await storeSectionVersions(nextRootVersions);
		await storeArrayIndexes(nextArrayIndexes);
		await storage.clearPendingSync();

		return { changedSections };
	} catch (e) {
		if (e?.code !== "payload-too-large") {
			await storage.savePendingSync(normalized);
		} else {
			await clearOversizePending();
		}

		await logPermissionHint("pushToCloud", e, {
			section: e?.section,
			itemId: e?.itemId,
		});
		throw e;
	}
};

export const pullFromCloud = async () => {
	const rootRef = await getRootDocRef();
	if (!rootRef) return null;

	try {
		const snap = await getDoc(rootRef);
		if (!snap.exists()) return null;

		const remote = snap.data();

		if (
			remote?.schemaVersion >= SYNC_SCHEMA_VERSION &&
			remote?.sectionVersions &&
			typeof remote.sectionVersions === "object"
		) {
			return await pullFromManifestV3(remote);
		}

		if (
			remote?.schemaVersion >= 2 &&
			remote?.sectionVersions &&
			typeof remote.sectionVersions === "object"
		) {
			return await pullSectionsFromManifestV2(remote);
		}

		return extractLegacyPayload(remote);
	} catch (e) {
		await logPermissionHint("pullFromCloud", e);
		return null;
	}
};

export const startLiveSync = async (onRemoteChange) => {
	_deviceId = _deviceId || (await storage.getDeviceId());

	const rootRef = await getRootDocRef();
	if (!rootRef) return;

	stopLiveSync();

	_syncUnsubscribe = onSnapshot(
		rootRef,
		async (snapshot) => {
			if (!snapshot.exists()) return;

			const remote = snapshot.data();
			if (!remote) return;
			if (remote.deviceId && remote.deviceId === _deviceId) return;

			if (
				remote?.schemaVersion >= SYNC_SCHEMA_VERSION &&
				remote?.sectionVersions &&
				typeof remote.sectionVersions === "object"
			) {
				try {
					const patch = await pullFromManifestV3(remote);
					if (patch && Object.keys(patch).length > 0) {
						onRemoteChange(patch);
					}
				} catch (error) {
					await logPermissionHint("liveSyncDeltaPull", error);
				}
				return;
			}

			if (
				remote?.schemaVersion >= 2 &&
				remote?.sectionVersions &&
				typeof remote.sectionVersions === "object"
			) {
				try {
					const patch = await pullSectionsFromManifestV2(remote);
					if (patch && Object.keys(patch).length > 0) {
						onRemoteChange(patch);
					}
				} catch (error) {
					await logPermissionHint("liveSyncV2Pull", error);
				}
				return;
			}

			const payload = extractLegacyPayload(remote);
			if (payload) {
				onRemoteChange(payload);
			}
		},
		(error) => {
			logPermissionHint("liveSyncListener", error);
		},
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
	if (_scheduledPushTimer) {
		clearTimeout(_scheduledPushTimer);
		_scheduledPushTimer = null;
	}
};
