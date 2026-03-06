/**
 * screens/BooksScreen.js
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Modal, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { colors, spacing, radius, font, cardStyle } from '../theme';
import { uuid, showConfirm } from '../utils/helpers';

const STATUS_OPTIONS = ['reading','want-to-read','finished','paused'];
const BOOK_COLORS = ['#fbbf24','#f87171','#60a5fa','#34d399','#a78bfa','#fb923c'];

export default function BooksScreen() {
  const books      = useStore(s => s.books);
  const addBook    = useStore(s => s.addBook);
  const updateBook = useStore(s => s.updateBook);
  const deleteBook = useStore(s => s.deleteBook);

  const [selected,   setSelected]   = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [title,      setTitle]      = useState('');
  const [author,     setAuthor]     = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [bookColor,  setBookColor]  = useState(BOOK_COLORS[0]);
  const [noteText,   setNoteText]   = useState('');

  const selectedBook = selected ? books.find(b => b.id === selected) : null;

  const handleAddBook = () => {
    if (!title.trim()) return;
    addBook({
      id: uuid(), title: title.trim(), author: author.trim(),
      status: 'want-to-read', currentPage: 0,
      totalPages: parseInt(totalPages) || 0,
      color: bookColor, notes: [],
      createdAt: new Date().toISOString(),
    });
    setTitle(''); setAuthor(''); setTotalPages(''); setShowAdd(false);
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !selectedBook) return;
    const newNote = {
      id: uuid(), text: noteText.trim(),
      color: '#fbbf24', createdAt: new Date().toISOString(),
    };
    updateBook(selectedBook.id, { notes: [...(selectedBook.notes || []), newNote] });
    setNoteText('');
  };

  const updateProgress = (id, page) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    const updates = { currentPage: page };
    if (book.totalPages > 0 && page >= book.totalPages) updates.status = 'finished';
    updateBook(id, updates);
  };

  // Book detail view
  if (selectedBook) {
    const progress = selectedBook.totalPages > 0
      ? Math.round((selectedBook.currentPage / selectedBook.totalPages) * 100)
      : 0;

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelected(null)}>
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
            <Text style={styles.backText}>Library</Text>
          </TouchableOpacity>

          {/* Book info */}
          <View style={[styles.bookHeader, { borderLeftColor: selectedBook.color }]}>
            <Text style={styles.bookTitle}>{selectedBook.title}</Text>
            {selectedBook.author ? <Text style={styles.bookAuthor}>{selectedBook.author}</Text> : null}
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, selectedBook.status === s && styles.statusBtnActive]}
                  onPress={() => updateBook(selectedBook.id, { status: s })}
                >
                  <Text style={[styles.statusBtnText, selectedBook.status === s && styles.statusBtnTextActive]}>
                    {s.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Progress */}
          {selectedBook.totalPages > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPct}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: selectedBook.color }]} />
              </View>
              <Text style={styles.progressPages}>
                Page {selectedBook.currentPage} of {selectedBook.totalPages}
              </Text>
              <View style={styles.pageRow}>
                <TouchableOpacity style={styles.pageBtn} onPress={() => updateProgress(selectedBook.id, Math.max(0, (selectedBook.currentPage || 0) - 10))}>
                  <Text style={styles.pageBtnText}>-10</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pageBtn} onPress={() => updateProgress(selectedBook.id, Math.max(0, (selectedBook.currentPage || 0) - 1))}>
                  <Text style={styles.pageBtnText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pageBtn} onPress={() => updateProgress(selectedBook.id, Math.min(selectedBook.totalPages, (selectedBook.currentPage || 0) + 1))}>
                  <Text style={styles.pageBtnText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pageBtn} onPress={() => updateProgress(selectedBook.id, Math.min(selectedBook.totalPages, (selectedBook.currentPage || 0) + 10))}>
                  <Text style={styles.pageBtnText}>+10</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes ({(selectedBook.notes || []).length})</Text>

          <View style={styles.addNoteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note or highlight..."
              placeholderTextColor={colors.muted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <TouchableOpacity style={styles.noteAddBtn} onPress={handleAddNote}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {[...(selectedBook.notes || [])].reverse().map(note => (
            <View key={note.id} style={[styles.noteItem, { borderLeftColor: note.color || '#fbbf24' }]}>
              <Text style={styles.noteItemText}>{note.text}</Text>
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
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { borderLeftColor: item.color, borderLeftWidth: 3 }]}
            onPress={() => setSelected(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                {item.author ? <Text style={styles.cardAuthor}>{item.author}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => showConfirm('Delete book?', item.title, () => deleteBook(item.id))}>
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.cardFoot}>
              <View style={[styles.statusPill, { backgroundColor: item.color + '22' }]}>
                <Text style={[styles.statusPillText, { color: item.color }]}>
                  {(item.status || 'want-to-read').replace('-', ' ')}
                </Text>
              </View>
              {item.totalPages > 0 && (
                <Text style={styles.pagesText}>
                  {item.currentPage || 0}/{item.totalPages} pages
                </Text>
              )}
            </View>
            {item.totalPages > 0 && (
              <View style={styles.miniProgress}>
                <View style={[styles.miniProgressFill, {
                  width: `${Math.round(((item.currentPage||0)/item.totalPages)*100)}%`,
                  backgroundColor: item.color,
                }]} />
              </View>
            )}
          </TouchableOpacity>
        )}
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
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Book</Text>
            <TextInput style={styles.input} placeholder="Title *" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} autoFocus />
            <TextInput style={styles.input} placeholder="Author" placeholderTextColor={colors.muted} value={author} onChangeText={setAuthor} />
            <TextInput style={styles.input} placeholder="Total pages" placeholderTextColor={colors.muted} value={totalPages} onChangeText={setTotalPages} keyboardType="numeric" />
            <View style={styles.colorRow}>
              {BOOK_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, bookColor === c && styles.colorDotActive]} onPress={() => setBookColor(c)} />
              ))}
            </View>
            <TouchableOpacity style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]} onPress={handleAddBook} disabled={!title.trim()}>
              <Text style={styles.addBtnText}>Add Book</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: 100, gap: spacing.sm },

  card: { ...cardStyle, gap: spacing.sm },
  cardTop:   { flexDirection:'row', alignItems:'flex-start', gap: spacing.sm },
  cardTitle: { fontSize: font.md, fontWeight: font.semibold, color:'#fff', marginBottom:2 },
  cardAuthor:{ fontSize: font.xs, color: colors.textSoft },
  cardFoot:  { flexDirection:'row', alignItems:'center', gap: spacing.sm },
  statusPill:{ borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical:2 },
  statusPillText: { fontSize:10, fontWeight: font.semibold },
  pagesText: { fontSize: 10, color: colors.muted },
  miniProgress: { height:3, backgroundColor: colors.dim, borderRadius:2, overflow:'hidden' },
  miniProgressFill: { height:'100%', borderRadius:2 },

  empty:     { alignItems:'center', marginTop:80 },
  emptyIcon: { fontSize:40, marginBottom: spacing.md },
  emptyText: { fontSize: font.sm, color: colors.muted },

  fab: {
    position:'absolute', bottom: spacing.xl, right: spacing.xl,
    width:56, height:56, borderRadius:28, backgroundColor: colors.accent,
    alignItems:'center', justifyContent:'center', elevation:8,
  },
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
  modalTitle: { fontSize: font.lg, fontWeight: font.bold, color:'#fff', marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth:1, borderColor: colors.border, color: colors.text, padding: spacing.lg, fontSize: font.md, marginBottom: spacing.sm },
  colorRow: { flexDirection:'row', gap: spacing.sm, marginBottom: spacing.lg },
  colorDot: { width:24, height:24, borderRadius:12 },
  colorDotActive: { borderWidth:3, borderColor:'#fff' },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, alignItems:'center' },
  addBtnDisabled: { opacity:0.4 },
  addBtnText: { color:'#fff', fontWeight: font.bold, fontSize: font.md },

  // Detail view
  backBtn: { flexDirection:'row', alignItems:'center', gap: spacing.xs, marginBottom: spacing.lg },
  backText: { color: colors.accent, fontSize: font.sm, fontWeight: font.semibold },
  bookHeader: { borderLeftWidth:3, paddingLeft: spacing.md, marginBottom: spacing.lg },
  bookTitle:  { fontSize: font.xl, fontWeight: font.bold, color:'#fff', marginBottom:4 },
  bookAuthor: { fontSize: font.sm, color: colors.textSoft, marginBottom: spacing.md },
  statusRow:  { flexDirection:'row', flexWrap:'wrap', gap: spacing.xs },
  statusBtn:  { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.dim, borderWidth:1, borderColor: colors.border },
  statusBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  statusBtnText: { fontSize: font.xs, color: colors.muted, textTransform:'capitalize' },
  statusBtnTextActive: { color: colors.accent, fontWeight: font.semibold },

  progressCard: { ...cardStyle, marginBottom: spacing.lg },
  progressHeader: { flexDirection:'row', justifyContent:'space-between', marginBottom: spacing.sm },
  progressLabel:  { fontSize: font.sm, color: colors.textSoft },
  progressPct:    { fontSize: font.sm, fontWeight: font.bold, color:'#fff' },
  progressBar: { height:6, backgroundColor: colors.dim, borderRadius:3, overflow:'hidden', marginBottom: spacing.sm },
  progressFill: { height:'100%', borderRadius:3 },
  progressPages: { fontSize: font.xs, color: colors.muted, marginBottom: spacing.md },
  pageRow: { flexDirection:'row', gap: spacing.sm },
  pageBtn: { flex:1, backgroundColor: colors.dim, borderRadius: radius.sm, padding: spacing.sm, alignItems:'center' },
  pageBtnText: { color: colors.text, fontSize: font.sm, fontWeight: font.semibold },

  sectionTitle: { fontSize: font.md, fontWeight: font.bold, color:'#fff', marginBottom: spacing.md },
  addNoteRow: { flexDirection:'row', gap: spacing.sm, marginBottom: spacing.md },
  noteInput: { flex:1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth:1, borderColor: colors.border, color: colors.text, padding: spacing.md, fontSize: font.sm },
  noteAddBtn: { width:44, backgroundColor: colors.accent, borderRadius: radius.md, alignItems:'center', justifyContent:'center' },
  noteItem: { borderLeftWidth:3, paddingLeft: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  noteItemText: { fontSize: font.sm, color: colors.text, lineHeight:20 },
});
