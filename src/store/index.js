import { create } from 'zustand';
import { storage } from '../utils/storage';
import { buildAiSnapshot, summarizeNote as summarizeNoteText } from '../utils/ai';

const useStore = create((set, get) => ({
  isLoading: true,
  saveStatus: 'saved',
  syncStatus: 'idle',
  isOnline: true,
  user: null,
  themeMode: 'dark',

  todos: [],
  notes: [],
  books: [],
  videos: [],
  passwords: [],
  apis: [],
  cards: [],
  events: [],

  aiAnalysis: null,
  prioritizedTodos: null,
  securityHealth: null,
  dailyBriefing: null,

  setUser: (user) => set({ user }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setThemeMode: async (themeMode) => {
    await storage.saveThemeMode(themeMode);
    set({ themeMode });
  },

  hydrateThemeMode: async () => {
    const themeMode = await storage.loadThemeMode();
    set({ themeMode: themeMode || 'dark' });
  },

  mergeArrayDelta: (currentItems, delta) => {
    const existing = Array.isArray(currentItems) ? [...currentItems] : [];
    const removeIds = new Set((delta?.remove || []).map((id) => String(id)));
    const upsertItems = Array.isArray(delta?.upsert) ? delta.upsert : [];

    const filtered = existing.filter(
      (item) => !removeIds.has(String(item?.id ?? ''))
    );
    const indexById = new Map(
      filtered.map((item, index) => [String(item?.id ?? ''), index])
    );

    upsertItems.forEach((item) => {
      const itemId = String(item?.id ?? '');
      if (!itemId) return;

      if (indexById.has(itemId)) {
        filtered[indexById.get(itemId)] = item;
        return;
      }

      filtered.unshift(item);
      indexById.set(itemId, 0);
    });

    return filtered;
  },

  applyData: (data) =>
    set((state) => {
      const patch = {};
      const mergeArray = get().mergeArrayDelta;

      if (data.__delta && typeof data.__delta === 'object') {
        if (data.__delta.todos) patch.todos = mergeArray(state.todos, data.__delta.todos);
        if (data.__delta.notes) patch.notes = mergeArray(state.notes, data.__delta.notes);
        if (data.__delta.books) patch.books = mergeArray(state.books, data.__delta.books);
        if (data.__delta.videos) patch.videos = mergeArray(state.videos, data.__delta.videos);
        if (data.__delta.passwords) patch.passwords = mergeArray(state.passwords, data.__delta.passwords);
        if (data.__delta.apis) patch.apis = mergeArray(state.apis, data.__delta.apis);
        if (data.__delta.cards) patch.cards = mergeArray(state.cards, data.__delta.cards);
        if (data.__delta.events) patch.events = mergeArray(state.events, data.__delta.events);
      }

      if (Object.prototype.hasOwnProperty.call(data, 'todos')) patch.todos = data.todos || [];
      if (Object.prototype.hasOwnProperty.call(data, 'notes')) patch.notes = data.notes || [];
      if (Object.prototype.hasOwnProperty.call(data, 'books')) patch.books = data.books || [];
      if (Object.prototype.hasOwnProperty.call(data, 'videos')) patch.videos = data.videos || [];
      if (Object.prototype.hasOwnProperty.call(data, 'passwords')) patch.passwords = data.passwords || [];
      if (Object.prototype.hasOwnProperty.call(data, 'apis')) patch.apis = data.apis || [];
      if (Object.prototype.hasOwnProperty.call(data, 'cards')) patch.cards = data.cards || [];
      if (Object.prototype.hasOwnProperty.call(data, 'events')) patch.events = data.events || [];
      if (Object.prototype.hasOwnProperty.call(data, 'aiAnalysis')) patch.aiAnalysis = data.aiAnalysis || null;
      if (Object.prototype.hasOwnProperty.call(data, 'prioritizedTodos')) patch.prioritizedTodos = data.prioritizedTodos || null;
      if (Object.prototype.hasOwnProperty.call(data, 'securityHealth')) patch.securityHealth = data.securityHealth || null;
      if (Object.prototype.hasOwnProperty.call(data, 'dailyBriefing')) patch.dailyBriefing = data.dailyBriefing || null;
      return patch;
    }),

  setAiSnapshot: (payload) => set({
    aiAnalysis: payload?.aiAnalysis || null,
    prioritizedTodos: payload?.prioritizedTodos || null,
    securityHealth: payload?.securityHealth || null,
    dailyBriefing: payload?.dailyBriefing || null,
  }),

  refreshAiSnapshot: async () => {
    const snapshot = buildAiSnapshot(get().getSnapshot());
    set({
      aiAnalysis: snapshot.aiAnalysis,
      prioritizedTodos: snapshot.prioritizedTodos,
      securityHealth: snapshot.securityHealth,
      dailyBriefing: snapshot.dailyBriefing,
    });
    await get().save();
    return snapshot;
  },

  summarizeNote: async (noteId) => {
    const note = get().notes.find((item) => item.id === noteId);
    if (!note) return null;

    const aiSummary = summarizeNoteText(note);
    set((state) => ({
      notes: state.notes.map((item) =>
        item.id === noteId ? { ...item, aiSummary, updatedAt: new Date().toISOString() } : item
      ),
    }));
    await get().save();
    return aiSummary;
  },

  getSnapshot: () => {
    const s = get();
    return {
      todos: s.todos,
      notes: s.notes,
      books: s.books,
      videos: s.videos,
      passwords: s.passwords,
      apis: s.apis,
      cards: s.cards,
      events: s.events,
      aiAnalysis: s.aiAnalysis,
      prioritizedTodos: s.prioritizedTodos,
      securityHealth: s.securityHealth,
      dailyBriefing: s.dailyBriefing,
    };
  },

  save: async () => {
    set({ saveStatus: 'saving' });
    const snapshot = get().getSnapshot();
    await storage.save(snapshot);
    set({ saveStatus: 'saved' });

    const { scheduleSyncPush } = await import('../sync/firebaseSync');
    scheduleSyncPush(snapshot);
  },

  addTodo: (todo) => {
    set((s) => ({ todos: [todo, ...s.todos] }));
    get().save();
  },
  updateTodo: (id, changes) => {
    set((s) => ({
      todos: s.todos.map((todo) =>
        todo.id === id ? { ...todo, ...changes, updatedAt: new Date().toISOString() } : todo
      ),
    }));
    get().save();
  },
  deleteTodo: (id) => {
    set((s) => ({ todos: s.todos.filter((todo) => todo.id !== id) }));
    get().save();
  },

  addNote: (note) => {
    set((s) => ({ notes: [note, ...s.notes] }));
    get().save();
  },
  updateNote: (id, changes) => {
    set((s) => ({
      notes: s.notes.map((note) =>
        note.id === id ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note
      ),
    }));
    get().save();
  },
  deleteNote: (id) => {
    set((s) => ({ notes: s.notes.filter((note) => note.id !== id) }));
    get().save();
  },

  addBook: (book) => {
    set((s) => ({ books: [book, ...s.books] }));
    get().save();
  },
  updateBook: (id, changes) => {
    set((s) => ({
      books: s.books.map((book) =>
        book.id === id ? { ...book, ...changes, updatedAt: new Date().toISOString() } : book
      ),
    }));
    get().save();
  },
  deleteBook: (id) => {
    set((s) => ({ books: s.books.filter((book) => book.id !== id) }));
    get().save();
  },

  addVideo: (video) => {
    set((s) => ({ videos: [video, ...s.videos] }));
    get().save();
  },
  updateVideo: (id, changes) => {
    set((s) => ({
      videos: s.videos.map((video) =>
        video.id === id ? { ...video, ...changes, updatedAt: new Date().toISOString() } : video
      ),
    }));
    get().save();
  },
  deleteVideo: (id) => {
    set((s) => ({ videos: s.videos.filter((video) => video.id !== id) }));
    get().save();
  },

  addPassword: (item) => {
    set((s) => ({ passwords: [item, ...s.passwords] }));
    get().save();
  },
  updatePassword: (id, changes) => {
    set((s) => ({
      passwords: s.passwords.map((item) =>
        item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item
      ),
    }));
    get().save();
  },
  deletePassword: (id) => {
    set((s) => ({ passwords: s.passwords.filter((item) => item.id !== id) }));
    get().save();
  },

  addApi: (item) => {
    set((s) => ({ apis: [item, ...s.apis] }));
    get().save();
  },
  updateApi: (id, changes) => {
    set((s) => ({
      apis: s.apis.map((item) =>
        item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item
      ),
    }));
    get().save();
  },
  deleteApi: (id) => {
    set((s) => ({ apis: s.apis.filter((item) => item.id !== id) }));
    get().save();
  },

  addCard: (item) => {
    set((s) => ({ cards: [item, ...s.cards] }));
    get().save();
  },
  updateCard: (id, changes) => {
    set((s) => ({
      cards: s.cards.map((item) =>
        item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item
      ),
    }));
    get().save();
  },
  deleteCard: (id) => {
    set((s) => ({ cards: s.cards.filter((item) => item.id !== id) }));
    get().save();
  },

  addEvent: (event) => {
    set((s) => ({ events: [event, ...s.events] }));
    get().save();
  },
  updateEvent: (id, changes) => {
    set((s) => ({
      events: s.events.map((event) =>
        event.id === id ? { ...event, ...changes, updatedAt: new Date().toISOString() } : event
      ),
    }));
    get().save();
  },
  deleteEvent: (id) => {
    set((s) => ({ events: s.events.filter((event) => event.id !== id) }));
    get().save();
  },
}));

export default useStore;
