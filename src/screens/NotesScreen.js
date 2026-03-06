/**
 * screens/NotesScreen.js
 */

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { colors, spacing, radius, font } from '../theme';
import { uuid, formatDate, showConfirm } from '../utils/helpers';

const NOTE_COLORS = ['#fbbf24','#f87171','#60a5fa','#34d399','#a78bfa','#fb923c'];

export default function NotesScreen() {
  const notes      = useStore(s => s.notes);
  const addNote    = useStore(s => s.addNote);
  const updateNote = useStore(s => s.updateNote);
  const deleteNote = useStore(s => s.deleteNote);

  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null); // note being edited
  const [title,     setTitle]     = useState('');
  const [content,   setContent]   = useState('');
  const [color,     setColor]     = useState(NOTE_COLORS[0]);
  const [search,    setSearch]    = useState('');

  const filtered = notes.filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  // Pinned first
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const openAdd = () => {
    setEditing(null); setTitle(''); setContent(''); setColor(NOTE_COLORS[0]);
    setShowModal(true);
  };

  const openEdit = (note) => {
    setEditing(note.id); setTitle(note.title || ''); setContent(note.content || '');
    setColor(note.color || NOTE_COLORS[0]);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    if (editing) {
      updateNote(editing, { title: title.trim(), content: content.trim(), color });
    } else {
      addNote({
        id: uuid(), title: title.trim(), content: content.trim(),
        color, pinned: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
    setShowModal(false);
  };

  const togglePin = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) updateNote(id, { pinned: !note.pinned });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      {/* Search */}
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
        keyExtractor={n => n.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noteCard, { backgroundColor: item.color + '22', borderColor: item.color + '44' }]}
            onPress={() => openEdit(item)}
            activeOpacity={0.8}
          >
            <View style={styles.noteTop}>
              <Text style={styles.noteTitle} numberOfLines={2}>
                {item.pinned ? '📌 ' : ''}{item.title || 'Untitled'}
              </Text>
              <TouchableOpacity onPress={() => togglePin(item.id)}>
                <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={14} color={item.color} />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
            <View style={styles.noteFoot}>
              <Text style={styles.noteDate}>{formatDate(item.updatedAt || item.createdAt)}</Text>
              <TouchableOpacity onPress={() => showConfirm('Delete note?', 'This cannot be undone.', () => deleteNote(item.id))}>
                <Ionicons name="trash-outline" size={13} color={colors.muted} />
              </TouchableOpacity>
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

      {/* Note Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>

            {/* Color picker */}
            <View style={styles.colorRow}>
              {NOTE_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
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
              style={styles.contentInput}
              placeholder="Write your note..."
              placeholderTextColor={colors.muted}
              value={content}
              onChangeText={setContent}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Note'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  searchBox: {
    flexDirection:'row', alignItems:'center',
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchIcon:  { marginRight: spacing.sm },
  searchInput: { flex:1, color: colors.text, fontSize: font.sm, paddingVertical: spacing.md },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row:  { justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },

  noteCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, minHeight: 120,
  },
  noteTop:     { flexDirection:'row', justifyContent:'space-between', marginBottom: spacing.xs },
  noteTitle:   { flex:1, fontSize: font.sm, fontWeight: font.semibold, color: '#fff', marginRight: spacing.xs },
  noteContent: { fontSize: font.xs, color: colors.textSoft, lineHeight: 17, flex:1 },
  noteFoot:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop: spacing.sm },
  noteDate:    { fontSize: 10, color: colors.muted },

  empty:     { alignItems:'center', marginTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyText: { fontSize: font.sm, color: colors.muted },

  fab: {
    position:'absolute', bottom: spacing.xl, right: spacing.xl,
    width:56, height:56, borderRadius:28, backgroundColor: colors.accent,
    alignItems:'center', justifyContent:'center',
    elevation:8, shadowColor: colors.accent,
    shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:8,
  },

  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  modal: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl,
  },
  colorRow: { flexDirection:'row', gap: spacing.sm, marginBottom: spacing.lg },
  colorDot: { width:24, height:24, borderRadius:12 },
  colorDotActive: { borderWidth:3, borderColor:'#fff' },

  titleInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth:1,
    borderColor: colors.border, color:'#fff', padding: spacing.lg,
    fontSize: font.lg, fontWeight: font.semibold, marginBottom: spacing.sm,
  },
  contentInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth:1,
    borderColor: colors.border, color: colors.text, padding: spacing.lg,
    fontSize: font.md, minHeight: 120, textAlignVertical:'top', marginBottom: spacing.lg,
  },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, alignItems:'center' },
  saveBtnText: { color:'#fff', fontWeight: font.bold, fontSize: font.md },
});
