import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { useAppTheme } from '../theme';
import {
  uuid,
  formatDate,
  showConfirm,
  getNotePreview,
  getRenderedNoteText,
  stripRichText,
} from '../utils/helpers';

const NOTE_COLORS = ['#fbbf24', '#f87171', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'];

export default function NotesScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, cardStyle } = theme;

  const notes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const summarizeNote = useStore((s) => s.summarizeNote);

  const [showEditor, setShowEditor] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [search, setSearch] = useState('');
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const titleText = String(note?.title || '').toLowerCase();
      const contentText = getRenderedNoteText(note).toLowerCase();
      const categoryText = String(note?.category || '').toLowerCase();
      return titleText.includes(query) || contentText.includes(query) || categoryText.includes(query);
    });
  }, [notes, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
    [filtered]
  );

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('');
    setColor(NOTE_COLORS[0]);
    setIsMarkdown(false);
  };

  const openAdd = () => {
    resetEditor();
    setShowEditor(true);
  };

  const openView = (note) => {
    setActiveNoteId(note.id);
  };

  const openEdit = (note) => {
    setEditingId(note.id);
    setTitle(note.title || '');
    setContent(stripRichText(note.content || ''));
    setCategory(note.category || '');
    setColor(note.color || NOTE_COLORS[0]);
    setIsMarkdown(Boolean(note.isMarkdown));
    setShowEditor(true);
    setActiveNoteId(null);
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      color,
      isMarkdown,
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      updateNote(editingId, payload);
    } else {
      addNote({
        id: uuid(),
        ...payload,
        pinned: false,
        createdAt: new Date().toISOString(),
      });
    }

    setShowEditor(false);
    resetEditor();
  };

  const togglePin = (id) => {
    const note = notes.find((entry) => entry.id === id);
    if (note) updateNote(id, { pinned: !note.pinned });
  };

  const runSummary = async () => {
    if (!activeNote) return;
    setSummarizing(true);
    await summarizeNote(activeNote.id);
    setSummarizing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noteCard, { backgroundColor: `${item.color || NOTE_COLORS[0]}22`, borderColor: `${item.color || NOTE_COLORS[0]}44` }]}
            onPress={() => openView(item)}
            onLongPress={() => openEdit(item)}
            activeOpacity={0.82}
          >
            <View style={styles.noteTop}>
              <Text style={styles.noteTitle} numberOfLines={2}>
                {item.pinned ? '📌 ' : ''}{item.title || 'Untitled'}
              </Text>
              <TouchableOpacity onPress={() => togglePin(item.id)}>
                <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={14} color={item.color || NOTE_COLORS[0]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.noteContent} numberOfLines={5}>
              {getNotePreview(item, 170) || 'No content yet'}
            </Text>

            <View style={styles.noteFoot}>
              <Text style={styles.noteDate}>{formatDate(item.updatedAt || item.createdAt)}</Text>
              {!!item.category && <Text style={styles.categoryPill}>{item.category}</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📒</Text>
            <Text style={styles.emptyText}>No notes yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={!!activeNote} transparent animationType="fade">
        <Pressable style={styles.viewerOverlay} onPress={() => setActiveNoteId(null)}>
          <Pressable style={styles.viewerCard} onPress={(event) => event.stopPropagation()}>
            {activeNote && (
              <>
                <View style={styles.viewerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.viewerTitle}>{activeNote.title || 'Untitled'}</Text>
                    <Text style={styles.viewerMeta}>
                      {formatDate(activeNote.updatedAt || activeNote.createdAt)}
                      {activeNote.category ? ` · ${activeNote.category}` : ''}
                      {activeNote.isMarkdown ? ' · Markdown' : ''}
                    </Text>
                  </View>
                  <View style={styles.iconRow}>
                    <TouchableOpacity onPress={runSummary}>
                      <Ionicons name={summarizing ? 'sync-outline' : 'sparkles-outline'} size={18} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEdit(activeNote)}>
                      <Ionicons name="create-outline" size={18} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveNoteId(null)}>
                      <Ionicons name="close" size={20} color={colors.textSoft} />
                    </TouchableOpacity>
                  </View>
                </View>

                {!!activeNote.aiSummary && (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>AI Summary</Text>
                    <Text style={styles.summaryText}>{activeNote.aiSummary}</Text>
                  </View>
                )}

                <ScrollView style={styles.viewerScroll} contentContainerStyle={{ paddingBottom: spacing.lg }}>
                  <Text style={styles.viewerBody}>{getRenderedNoteText(activeNote) || 'No content yet.'}</Text>
                </ScrollView>

                <View style={styles.viewerActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => togglePin(activeNote.id)}>
                    <Text style={styles.secondaryBtnText}>{activeNote.pinned ? 'Unpin' : 'Pin'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => showConfirm('Delete note?', activeNote.title || 'This note', () => {
                      deleteNote(activeNote.id);
                      setActiveNoteId(null);
                    })}
                  >
                    <Text style={styles.dangerBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showEditor} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowEditor(false)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.colorRow}>
                {NOTE_COLORS.map((tone) => (
                  <TouchableOpacity
                    key={tone}
                    style={[styles.colorDot, { backgroundColor: tone }, color === tone && styles.colorDotActive]}
                    onPress={() => setColor(tone)}
                  />
                ))}
              </View>

              <TextInput
                style={styles.titleInput}
                placeholder="Title"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <TextInput
                style={styles.categoryInput}
                placeholder="Category"
                placeholderTextColor={colors.muted}
                value={category}
                onChangeText={setCategory}
              />

              <TouchableOpacity style={styles.markdownToggle} onPress={() => setIsMarkdown((value) => !value)}>
                <Ionicons name={isMarkdown ? 'checkbox' : 'square-outline'} size={18} color={isMarkdown ? colors.accent : colors.textSoft} />
                <Text style={styles.markdownToggleText}>Render as Markdown</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.contentInput}
                placeholder={isMarkdown ? 'Write markdown here...' : 'Write your note...'}
                placeholderTextColor={colors.muted}
                value={content}
                onChangeText={setContent}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditor(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Note'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    searchIcon: { marginRight: spacing.sm },
    searchInput: { flex: 1, color: colors.text, fontSize: font.sm, paddingVertical: spacing.md },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
    row: { justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
    noteCard: {
      flex: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.md,
      minHeight: 150,
    },
    noteTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs, gap: spacing.sm },
    noteTitle: { flex: 1, fontSize: font.sm, fontWeight: font.semibold, color: colors.text },
    noteContent: { fontSize: font.xs, color: colors.textSoft, lineHeight: 18, flex: 1 },
    noteFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    noteDate: { fontSize: 10, color: colors.muted },
    categoryPill: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: font.semibold,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 40, marginBottom: spacing.md },
    emptyText: { fontSize: font.sm, color: colors.muted },
    fab: {
      position: 'absolute',
      bottom: spacing.xl,
      right: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.md,
    },
    viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg },
    viewerCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '88%',
      padding: spacing.xl,
      ...shadow.md,
    },
    viewerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
    viewerTitle: { color: colors.text, fontSize: font.xl, fontWeight: font.heavy, marginBottom: spacing.xs },
    viewerMeta: { color: colors.textSoft, fontSize: font.xs },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    summaryBox: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    summaryLabel: { color: colors.accent, fontSize: font.xs, fontWeight: font.bold, textTransform: 'uppercase', marginBottom: spacing.xs },
    summaryText: { color: colors.text, fontSize: font.sm, lineHeight: 20 },
    viewerScroll: { flexGrow: 0 },
    viewerBody: { color: colors.text, fontSize: font.md, lineHeight: 24 },
    viewerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    secondaryBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    secondaryBtnText: { color: colors.textSoft, fontWeight: font.semibold },
    dangerBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.redSoft,
      borderWidth: 1,
      borderColor: colors.red,
    },
    dangerBtnText: { color: colors.red, fontWeight: font.bold },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modal: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      maxHeight: '92%',
    },
    colorRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    colorDot: { width: 24, height: 24, borderRadius: 12 },
    colorDotActive: { borderWidth: 3, borderColor: '#fff' },
    titleInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: spacing.lg,
      fontSize: font.lg,
      fontWeight: font.semibold,
      marginBottom: spacing.sm,
    },
    categoryInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: spacing.lg,
      fontSize: font.sm,
      marginBottom: spacing.sm,
    },
    markdownToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    markdownToggleText: { color: colors.textSoft, fontSize: font.sm, fontWeight: font.medium },
    contentInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: spacing.lg,
      fontSize: font.md,
      minHeight: 180,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
    },
    modalActions: { flexDirection: 'row', gap: spacing.sm },
    cancelBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelBtnText: { color: colors.textSoft, fontWeight: font.semibold },
    saveBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.accent,
    },
    saveBtnText: { color: '#fff', fontWeight: font.bold },
  });
