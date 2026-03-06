/**
 * screens/TodosScreen.js — Kanban board
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { colors, spacing, radius, font, cardStyle } from '../theme';
import { uuid, formatDate, isOverdue, showConfirm } from '../utils/helpers';

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: colors.accent   },
  { id: 'in-progress', label: 'In Progress', color: colors.orange   },
  { id: 'done',        label: 'Done',        color: colors.green    },
];

export default function TodosScreen() {
  const todos      = useStore(s => s.todos);
  const addTodo    = useStore(s => s.addTodo);
  const updateTodo = useStore(s => s.updateTodo);
  const deleteTodo = useStore(s => s.deleteTodo);

  const [showModal,  setShowModal]  = useState(false);
  const [text,       setText]       = useState('');
  const [priority,   setPriority]   = useState('medium');
  const [dueDate,    setDueDate]    = useState('');
  const [activeCol,  setActiveCol]  = useState('todo'); // which column is expanded on mobile

  const getColumnTodos = (status) =>
    todos.filter(t =>
      status === 'todo'
        ? (t.status === 'todo' || (!t.status && !t.done))
        : status === 'done'
        ? (t.status === 'done' || (!t.status && t.done))
        : t.status === status
    );

  const handleAdd = () => {
    if (!text.trim()) return;
    addTodo({
      id: uuid(),
      text: text.trim(),
      status: 'todo',
      done: false,
      priority,
      dueDate: dueDate || null,
      updatedAt: new Date().toISOString(),
    });
    setText(''); setPriority('medium'); setDueDate('');
    setShowModal(false);
  };

  const handleMove = (id, newStatus) => {
    updateTodo(id, { status: newStatus, done: newStatus === 'done' });
  };

  const handleDelete = (id) => {
    showConfirm('Delete card?', 'This cannot be undone.', () => deleteTodo(id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      {/* Column tabs */}
      <View style={styles.colTabs}>
        {COLUMNS.map(col => (
          <TouchableOpacity
            key={col.id}
            style={[styles.colTab, activeCol === col.id && { borderBottomColor: col.color, borderBottomWidth: 2 }]}
            onPress={() => setActiveCol(col.id)}
          >
            <Text style={[styles.colTabText, activeCol === col.id && { color: col.color }]}>
              {col.label}
            </Text>
            <View style={[styles.colBadge, { backgroundColor: col.color + '22' }]}>
              <Text style={[styles.colBadgeText, { color: col.color }]}>
                {getColumnTodos(col.id).length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cards */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {getColumnTodos(activeCol).map(todo => (
          <TodoCard
            key={todo.id}
            todo={todo}
            onMove={handleMove}
            onDelete={handleDelete}
            currentStatus={activeCol}
          />
        ))}
        {getColumnTodos(activeCol).length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {activeCol === 'todo' ? '📝' : activeCol === 'in-progress' ? '⚡' : '✅'}
            </Text>
            <Text style={styles.emptyText}>No cards here</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Card</Text>

            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />

            {/* Priority */}
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {['low','medium','high'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priBtn, priority === p && styles.priBtnActive]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priBtnText, priority === p && styles.priBtnTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!text.trim()}
            >
              <Text style={styles.addBtnText}>Add Card</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

function TodoCard({ todo, onMove, onDelete, currentStatus }) {
  const [showActions, setShowActions] = useState(false);

  const otherStatuses = COLUMNS
    .filter(c => c.id !== currentStatus)
    .map(c => ({ id: c.id, label: `Move to ${c.label}`, color: c.color }));

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => setShowActions(s => !s)}
      activeOpacity={0.85}
    >
      <Text style={styles.cardText}>{todo.text}</Text>

      <View style={styles.cardMeta}>
        {todo.priority && (
          <View style={[styles.badge, { backgroundColor: priorityBg(todo.priority) }]}>
            <Text style={[styles.badgeText, { color: priorityColor(todo.priority) }]}>
              {todo.priority}
            </Text>
          </View>
        )}
        {todo.dueDate && (
          <View style={[styles.badge, { backgroundColor: isOverdue(todo.dueDate) && currentStatus !== 'done' ? colors.redSoft : colors.dim }]}>
            <Text style={[styles.badgeText, { color: isOverdue(todo.dueDate) && currentStatus !== 'done' ? colors.red : colors.textSoft }]}>
              {formatDate(todo.dueDate)}
            </Text>
          </View>
        )}
      </View>

      {showActions && (
        <View style={styles.actions}>
          {otherStatuses.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.actionBtn, { borderColor: s.color }]}
              onPress={() => { onMove(todo.id, s.id); setShowActions(false); }}
            >
              <Text style={[styles.actionBtnText, { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.red }]}
            onPress={() => { onDelete(todo.id); setShowActions(false); }}
          >
            <Text style={[styles.actionBtnText, { color: colors.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const priorityColor = (p) => p === 'high' ? colors.red : p === 'medium' ? colors.orange : colors.green;
const priorityBg    = (p) => p === 'high' ? colors.redSoft : p === 'medium' ? colors.orangeSoft : colors.greenSoft;

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 },

  colTabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  colTab:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  colTabText: { fontSize: font.sm, fontWeight: font.semibold, color: colors.muted },
  colBadge:   { borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  colBadgeText: { fontSize: 10, fontWeight: font.bold },

  empty:     { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyText: { fontSize: font.sm, color: colors.muted },

  card: { ...cardStyle, marginBottom: spacing.sm },
  cardText: { fontSize: font.md, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge:    { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText:{ fontSize: font.xs, fontWeight: font.semibold },

  actions:    { marginTop: spacing.md, gap: spacing.xs },
  actionBtn:  { borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm, alignItems: 'center' },
  actionBtnText: { fontSize: font.xs, fontWeight: font.semibold },

  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: { fontSize: font.lg, fontWeight: font.bold, color: '#fff', marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, padding: spacing.lg,
    fontSize: font.md, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.lg,
  },
  fieldLabel: { fontSize: font.xs, color: colors.textSoft, marginBottom: spacing.sm, fontWeight: font.medium },
  priorityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  priBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    backgroundColor: colors.surface,
  },
  priBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  priBtnText:   { fontSize: font.sm, color: colors.muted, fontWeight: font.medium, textTransform: 'capitalize' },
  priBtnTextActive: { color: colors.accent },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: font.bold, fontSize: font.md },
});
