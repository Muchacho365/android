/**
 * store/index.js — Global state using Zustand
 *
 * HOW IT WORKS:
 * Zustand is a tiny state manager. Think of it as a box that holds
 * all your app data. Any screen can read from it or update it.
 * When it updates, only the components using that data re-render.
 *
 * This mirrors the app data shape used for local storage and Firebase sync.
 */

import { create } from 'zustand';
import { storage } from '../utils/storage';

// ─── Data Models (same schema as Electron app) ───────────────────────────────
//
// Todo:     { id, text, status: 'todo'|'in-progress'|'done', priority, dueDate, updatedAt }
// Note:     { id, title, content, color, pinned, category, createdAt, updatedAt }
// Book:     { id, title, author, status, currentPage, totalPages, color, notes[], createdAt }
// Video:    { id, title, url, platform, watched, category, createdAt }
// Password: { id, site, username, password(encrypted), notes, updatedAt }
// ApiKey:   { id, name, key(encrypted), service, notes, updatedAt }
// Card:     { id, bank, last4, expiry, type, notes, updatedAt }
// Event:    { id, title, start, end, type, color, description, completed }

const useStore = create((set, get) => ({

  // ─── App UI state ───────────────────────────────────────────────────────
  isLoading:    true,
  saveStatus:   'saved',   // 'saved' | 'saving'
  syncStatus:   'idle',    // 'idle' | 'syncing' | 'synced' | 'error'
  isOnline:     true,
  user:         null,      // { email, uid }

  // ─── Data ───────────────────────────────────────────────────────────────
  todos:     [],
  notes:     [],
  books:     [],
  videos:    [],
  passwords: [],
  apis:      [],
  cards:     [],
  events:    [],

  // ─── AI results (cached) ────────────────────────────────────────────────
  aiAnalysis:      null,
  prioritizedTodos: null,
  securityHealth:  null,
  dailyBriefing:   null,

  // ─── Actions ────────────────────────────────────────────────────────────

  setUser: (user) => set({ user }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  // Called after loading data from local storage or cloud
  applyData: (data) => set({
    todos:      data.todos      || [],
    notes:      data.notes      || [],
    books:      data.books      || [],
    videos:     data.videos     || [],
    passwords:  data.passwords  || [],
    apis:       data.apis       || [],
    cards:      data.cards      || [],
    events:     data.events     || [],
    aiAnalysis:       data.aiAnalysis       || null,
    prioritizedTodos: data.prioritizedTodos || null,
    securityHealth:   data.securityHealth   || null,
    dailyBriefing:    data.dailyBriefing    || null,
  }),

  // Get a clean snapshot of only data (no UI state) — used for save & sync
  getSnapshot: () => {
    const s = get();
    return {
      todos:      s.todos,
      notes:      s.notes,
      books:      s.books,
      videos:     s.videos,
      passwords:  s.passwords,
      apis:       s.apis,
      cards:      s.cards,
      events:     s.events,
      aiAnalysis:       s.aiAnalysis,
      prioritizedTodos: s.prioritizedTodos,
      securityHealth:   s.securityHealth,
      dailyBriefing:    s.dailyBriefing,
    };
  },

  // ─── Save (local first, then triggers cloud sync) ───────────────────────
  save: async () => {
    set({ saveStatus: 'saving' });
    const snapshot = get().getSnapshot();
    await storage.save(snapshot);
    set({ saveStatus: 'saved' });

    // Trigger cloud sync push (imported lazily to avoid circular deps)
    const { pushToCloud } = await import('../sync/firebaseSync');
    pushToCloud(snapshot).catch(console.warn);
  },

  // ─── TODOS ──────────────────────────────────────────────────────────────
  addTodo: (todo) => {
    set(s => ({ todos: [todo, ...s.todos] }));
    get().save();
  },
  updateTodo: (id, changes) => {
    set(s => ({
      todos: s.todos.map(t => t.id === id
        ? { ...t, ...changes, updatedAt: new Date().toISOString() }
        : t
      )
    }));
    get().save();
  },
  deleteTodo: (id) => {
    set(s => ({ todos: s.todos.filter(t => t.id !== id) }));
    get().save();
  },

  // ─── NOTES ──────────────────────────────────────────────────────────────
  addNote: (note) => {
    set(s => ({ notes: [note, ...s.notes] }));
    get().save();
  },
  updateNote: (id, changes) => {
    set(s => ({
      notes: s.notes.map(n => n.id === id
        ? { ...n, ...changes, updatedAt: new Date().toISOString() }
        : n
      )
    }));
    get().save();
  },
  deleteNote: (id) => {
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
    get().save();
  },

  // ─── BOOKS ──────────────────────────────────────────────────────────────
  addBook: (book) => {
    set(s => ({ books: [book, ...s.books] }));
    get().save();
  },
  updateBook: (id, changes) => {
    set(s => ({
      books: s.books.map(b => b.id === id
        ? { ...b, ...changes, updatedAt: new Date().toISOString() }
        : b
      )
    }));
    get().save();
  },
  deleteBook: (id) => {
    set(s => ({ books: s.books.filter(b => b.id !== id) }));
    get().save();
  },

  // ─── VIDEOS ─────────────────────────────────────────────────────────────
  addVideo: (video) => {
    set(s => ({ videos: [video, ...s.videos] }));
    get().save();
  },
  updateVideo: (id, changes) => {
    set(s => ({
      videos: s.videos.map(v => v.id === id
        ? { ...v, ...changes, updatedAt: new Date().toISOString() }
        : v
      )
    }));
    get().save();
  },
  deleteVideo: (id) => {
    set(s => ({ videos: s.videos.filter(v => v.id !== id) }));
    get().save();
  },

  // ─── SECURITIES ─────────────────────────────────────────────────────────
  addPassword: (item) => {
    set(s => ({ passwords: [item, ...s.passwords] }));
    get().save();
  },
  updatePassword: (id, changes) => {
    set(s => ({
      passwords: s.passwords.map(p => p.id === id ? { ...p, ...changes } : p)
    }));
    get().save();
  },
  deletePassword: (id) => {
    set(s => ({ passwords: s.passwords.filter(p => p.id !== id) }));
    get().save();
  },

  addApi: (item) => {
    set(s => ({ apis: [item, ...s.apis] }));
    get().save();
  },
  deleteApi: (id) => {
    set(s => ({ apis: s.apis.filter(a => a.id !== id) }));
    get().save();
  },

  addCard: (item) => {
    set(s => ({ cards: [item, ...s.cards] }));
    get().save();
  },
  deleteCard: (id) => {
    set(s => ({ cards: s.cards.filter(c => c.id !== id) }));
    get().save();
  },

  // ─── EVENTS ─────────────────────────────────────────────────────────────
  addEvent: (event) => {
    set(s => ({ events: [event, ...s.events] }));
    get().save();
  },
  updateEvent: (id, changes) => {
    set(s => ({
      events: s.events.map(e => e.id === id ? { ...e, ...changes } : e)
    }));
    get().save();
  },
  deleteEvent: (id) => {
    set(s => ({ events: s.events.filter(e => e.id !== id) }));
    get().save();
  },
}));

export default useStore;
