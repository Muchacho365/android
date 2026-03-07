import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useStore from '../store';
import { useAppTheme } from '../theme';
import { showConfirm, uuid } from '../utils/helpers';

const STATUS_OPTIONS = ['reading', 'want-to-read', 'finished', 'paused'];
const BOOK_COLORS = ['#fbbf24', '#f87171', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'];

export default function BooksScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, cardStyle, inputStyle } = theme;

  const books = useStore((state) => state.books);
  const addBook = useStore((state) => state.addBook);
  const updateBook = useStore((state) => state.updateBook);
  const deleteBook = useStore((state) => state.deleteBook);

  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [bookColor, setBookColor] = useState(BOOK_COLORS[0]);
  const [noteText, setNoteText] = useState('');

  const selectedBook = selectedId ? books.find((book) => book.id === selectedId) : null;

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setTotalPages('');
    setBookColor(BOOK_COLORS[0]);
  };

  const handleAddBook = () => {
    if (!title.trim()) return;

    addBook({
      id: uuid(),
      title: title.trim(),
      author: author.trim(),
      status: 'want-to-read',
      currentPage: 0,
      totalPages: parseInt(totalPages, 10) || 0,
      color: bookColor,
      notes: [],
      createdAt: new Date().toISOString(),
    });

    resetForm();
    setShowAdd(false);
  };

  const handleAddNote = () => {
    if (!selectedBook || !noteText.trim()) return;

    const newNote = {
      id: uuid(),
      text: noteText.trim(),
      color: selectedBook.color || BOOK_COLORS[0],
      createdAt: new Date().toISOString(),
    };

    updateBook(selectedBook.id, { notes: [...(selectedBook.notes || []), newNote] });
    setNoteText('');
  };

  const updateProgress = (id, page) => {
    const book = books.find((entry) => entry.id === id);
    if (!book) return;

    const safePage = Math.max(0, page);
    const updates = { currentPage: safePage };
    if (book.totalPages > 0 && safePage >= book.totalPages) {
      updates.status = 'finished';
    }

    updateBook(id, updates);
  };

  if (selectedBook) {
    const progress = selectedBook.totalPages > 0
      ? Math.min(100, Math.round(((selectedBook.currentPage || 0) / selectedBook.totalPages) * 100))
      : 0;

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedId(null)}>
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
            <Text style={styles.backButtonText}>Library</Text>
          </TouchableOpacity>

          <View style={[styles.heroCard, { borderLeftColor: selectedBook.color || colors.accent }]}> 
            <Text style={styles.bookTitle}>{selectedBook.title}</Text>
            {!!selectedBook.author && <Text style={styles.bookAuthor}>{selectedBook.author}</Text>}

            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((status) => {
                const active = selectedBook.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      active && { backgroundColor: `${selectedBook.color || colors.accent}18`, borderColor: selectedBook.color || colors.accent },
                    ]}
                    onPress={() => updateBook(selectedBook.id, { status })}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        { color: active ? selectedBook.color || colors.accent : colors.textSoft },
                      ]}
                    >
                      {status.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedBook.totalPages > 0 ? (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Reading Progress</Text>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: selectedBook.color || colors.accent }]} />
              </View>
              <Text style={styles.progressText}>
                Page {selectedBook.currentPage || 0} of {selectedBook.totalPages}
              </Text>
              <View style={styles.pageButtonsRow}>
                {[-10, -1, 1, 10].map((step) => (
                  <TouchableOpacity
                    key={step}
                    style={styles.pageButton}
                    onPress={() => updateProgress(selectedBook.id, Math.min(selectedBook.totalPages, Math.max(0, (selectedBook.currentPage || 0) + step)))}
                  >
                    <Text style={styles.pageButtonText}>{step > 0 ? `+${step}` : step}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Reading Notes</Text>
          <View style={styles.addNoteBox}>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Add a note, quote, or highlight..."
              placeholderTextColor={colors.muted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <TouchableOpacity style={styles.noteAddButton} onPress={handleAddNote}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {(selectedBook.notes || []).slice().reverse().map((note) => (
            <View key={note.id} style={[styles.noteCard, { borderLeftColor: note.color || selectedBook.color || colors.accent }]}> 
              <Text style={styles.noteText}>{note.text}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const progress = item.totalPages > 0 ? Math.min(100, Math.round(((item.currentPage || 0) / item.totalPages) * 100)) : 0;
          return (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: item.color || colors.accent, borderLeftWidth: 3 }]}
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.84}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {!!item.author && <Text style={styles.cardAuthor}>{item.author}</Text>}
                </View>
                <TouchableOpacity onPress={() => showConfirm('Delete book?', 'This also removes its notes.', () => deleteBook(item.id))}>
                  <Ionicons name="trash-outline" size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardFoot}>
                <View style={[styles.statusPill, { backgroundColor: `${item.color || colors.accent}20` }]}> 
                  <Text style={[styles.statusPillText, { color: item.color || colors.accent }]}>{(item.status || 'want-to-read').replace('-', ' ')}</Text>
                </View>
                {item.totalPages > 0 ? <Text style={styles.pagesText}>{item.currentPage || 0}/{item.totalPages} pages</Text> : null}
              </View>

              {item.totalPages > 0 ? (
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${progress}%`, backgroundColor: item.color || colors.accent }]} />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No books yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Book</Text>
            <TextInput style={styles.input} placeholder="Title *" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} autoFocus />
            <TextInput style={styles.input} placeholder="Author" placeholderTextColor={colors.muted} value={author} onChangeText={setAuthor} />
            <TextInput style={styles.input} placeholder="Total pages" placeholderTextColor={colors.muted} value={totalPages} onChangeText={setTotalPages} keyboardType="numeric" />

            <View style={styles.colorRow}>
              {BOOK_COLORS.map((tone) => (
                <TouchableOpacity
                  key={tone}
                  style={[styles.colorDot, { backgroundColor: tone }, bookColor === tone && styles.colorDotActive]}
                  onPress={() => setBookColor(tone)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAdd(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, !title.trim() && styles.disabledButton]} onPress={handleAddBook} disabled={!title.trim()}>
                <Text style={styles.primaryButtonText}>Save Book</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle, inputStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 },
    card: { ...cardStyle, gap: spacing.sm },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    cardTitle: { color: colors.text, fontSize: font.md, fontWeight: font.bold, marginBottom: 2 },
    cardAuthor: { color: colors.textSoft, fontSize: font.xs },
    cardFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    statusPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusPillText: { fontSize: 10, fontWeight: font.semibold },
    pagesText: { color: colors.textSoft, fontSize: font.xs },
    miniProgress: { height: 4, borderRadius: radius.full, backgroundColor: colors.dim, overflow: 'hidden' },
    miniProgressFill: { height: '100%' },
    empty: { alignItems: 'center', marginTop: 84 },
    emptyIcon: { fontSize: 42, marginBottom: spacing.md },
    emptyText: { color: colors.textSoft, fontSize: font.sm },
    fab: {
      position: 'absolute',
      right: spacing.xl,
      bottom: spacing.xl,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.lg,
    },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modal: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    modalTitle: { color: colors.text, fontSize: font.xl, fontWeight: font.bold, marginBottom: spacing.lg },
    input: { ...inputStyle, marginBottom: spacing.md },
    colorRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    colorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorDotActive: { borderColor: colors.text },
    modalActions: { flexDirection: 'row', gap: spacing.sm },
    primaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: { color: '#fff', fontSize: font.sm, fontWeight: font.bold },
    secondaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: { color: colors.text, fontSize: font.sm, fontWeight: font.semibold },
    disabledButton: { opacity: 0.55 },
    detailScroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    backButtonText: { color: colors.accent, fontSize: font.sm, fontWeight: font.semibold },
    heroCard: {
      ...cardStyle,
      borderLeftWidth: 3,
      marginBottom: spacing.sm,
    },
    bookTitle: { color: colors.text, fontSize: font.xxl, fontWeight: font.heavy, marginBottom: spacing.xs },
    bookAuthor: { color: colors.textSoft, fontSize: font.sm, marginBottom: spacing.md },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statusButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusButtonText: { fontSize: font.xs, fontWeight: font.semibold },
    progressCard: { ...cardStyle, marginBottom: spacing.sm },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    progressLabel: { color: colors.text, fontSize: font.sm, fontWeight: font.bold },
    progressPercent: { color: colors.accent, fontSize: font.sm, fontWeight: font.bold },
    progressBar: { height: 10, borderRadius: radius.full, backgroundColor: colors.dim, overflow: 'hidden', marginBottom: spacing.sm },
    progressFill: { height: '100%' },
    progressText: { color: colors.textSoft, fontSize: font.xs, marginBottom: spacing.md },
    pageButtonsRow: { flexDirection: 'row', gap: spacing.sm },
    pageButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageButtonText: { color: colors.text, fontSize: font.sm, fontWeight: font.semibold },
    sectionTitle: { color: colors.text, fontSize: font.md, fontWeight: font.bold, marginTop: spacing.sm, marginBottom: spacing.sm },
    addNoteBox: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    noteInput: { flex: 1, minHeight: 84, textAlignVertical: 'top' },
    noteAddButton: {
      width: 46,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.sm,
    },
    noteCard: {
      ...cardStyle,
      borderLeftWidth: 3,
      marginBottom: spacing.sm,
    },
    noteText: { color: colors.text, fontSize: font.sm, lineHeight: 20 },
  });
