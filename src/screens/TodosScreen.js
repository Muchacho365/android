import React, { useMemo, useState } from 'react';
import {
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
import {
  formatDate,
  isOverdue,
  priorityColor,
  showConfirm,
  uuid,
} from '../utils/helpers';

export default function TodosScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, cardStyle, inputStyle } = theme;

  const todos = useStore((state) => state.todos);
  const prioritizedTodos = useStore((state) => state.prioritizedTodos) || [];
  const refreshAiSnapshot = useStore((state) => state.refreshAiSnapshot);
  const addTodo = useStore((state) => state.addTodo);
  const updateTodo = useStore((state) => state.updateTodo);
  const deleteTodo = useStore((state) => state.deleteTodo);

  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [activeCol, setActiveCol] = useState('todo');
  const [runningAi, setRunningAi] = useState(false);

  const columns = useMemo(
    () => [
      { id: 'todo', label: 'To Do', color: colors.todo },
      { id: 'in-progress', label: 'Doing', color: colors.inProgress },
      { id: 'done', label: 'Done', color: colors.done },
    ],
    [colors.done, colors.inProgress, colors.todo]
  );

  const aiScores = useMemo(
    () => new Map(prioritizedTodos.map((item, index) => [item.id, { rank: index, score: Math.round(item.aiScore || 0) }])),
    [prioritizedTodos]
  );

  const getColumnTodos = (status) => {
    const matches = todos.filter((todo) =>
      status === 'todo'
        ? todo.status === 'todo' || (!todo.status && !todo.done)
        : status === 'done'
        ? todo.status === 'done' || (!todo.status && todo.done)
        : todo.status === status
    );

    return matches.sort((left, right) => {
      if (status !== 'todo') {
        return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
      }

      const leftRank = aiScores.get(left.id)?.rank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = aiScores.get(right.id)?.rank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
    });
  };

  const handleAdd = () => {
    if (!text.trim()) return;

    addTodo({
      id: uuid(),
      text: text.trim(),
      status: 'todo',
      done: false,
      priority,
      dueDate: dueDate.trim() || null,
      updatedAt: new Date().toISOString(),
    });

    setText('');
    setPriority('medium');
    setDueDate('');
    setShowModal(false);
  };

  const handleMove = (id, newStatus) => {
    updateTodo(id, { status: newStatus, done: newStatus === 'done' });
  };

  const handleDelete = (id) => {
    showConfirm('Delete task?', 'This task will be removed permanently.', () => deleteTodo(id));
  };

  const handleAiPrioritize = async () => {
    setRunningAi(true);
    await refreshAiSnapshot();
    setRunningAi(false);
  };

  const visibleTodos = getColumnTodos(activeCol);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colTabs}>
          {columns.map((column) => (
            <TouchableOpacity
              key={column.id}
              style={[
                styles.colTab,
                activeCol === column.id && {
                  borderColor: column.color,
                  backgroundColor: `${column.color}16`,
                },
              ]}
              onPress={() => setActiveCol(column.id)}
            >
              <Text
                style={[
                  styles.colTabText,
                  { color: activeCol === column.id ? column.color : colors.textSoft },
                ]}
              >
                {column.label}
              </Text>
              <View style={[styles.colBadge, { backgroundColor: `${column.color}20` }]}>
                <Text style={[styles.colBadgeText, { color: column.color }]}>{getColumnTodos(column.id).length}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.aiButton} onPress={handleAiPrioritize}>
          <Ionicons name={runningAi ? 'sync-outline' : 'sparkles-outline'} size={16} color="#fff" />
          <Text style={styles.aiButtonText}>{runningAi ? 'Ranking...' : 'AI Prioritize'}</Text>
        </TouchableOpacity>
      </View>

      {activeCol === 'todo' && prioritizedTodos.length > 0 ? (
        <View style={styles.aiHintBox}>
          <Text style={styles.aiHintTitle}>AI Focus Order</Text>
          <Text style={styles.aiHintText}>Open tasks are sorted by urgency, deadlines, and your current priority flags.</Text>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {visibleTodos.map((todo) => (
          <TodoCard
            key={todo.id}
            theme={theme}
            todo={todo}
            currentStatus={activeCol}
            columns={columns}
            aiScore={aiScores.get(todo.id)?.score}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        ))}

        {visibleTodos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{activeCol === 'done' ? '✅' : activeCol === 'in-progress' ? '⚡' : '📝'}</Text>
            <Text style={styles.emptyText}>No tasks in this lane yet.</Text>
          </View>
        ) : null}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Task</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {['low', 'medium', 'high'].map((level) => {
                const active = priority === level;
                const tone = priorityColor(level, colors);
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.priorityButton,
                      active && { borderColor: tone, backgroundColor: `${tone}18` },
                    ]}
                    onPress={() => setPriority(level)}
                  >
                    <Text style={[styles.priorityButtonText, { color: active ? tone : colors.textSoft }]}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={colors.muted}
              value={dueDate}
              onChangeText={setDueDate}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, !text.trim() && styles.disabledButton]}
                onPress={handleAdd}
                disabled={!text.trim()}
              >
                <Text style={styles.primaryButtonText}>Save Task</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function TodoCard({ theme, todo, currentStatus, columns, aiScore, onMove, onDelete }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;
  const [showActions, setShowActions] = useState(false);

  const otherStatuses = columns.filter((column) => column.id !== currentStatus);
  const dueTone = todo.dueDate && isOverdue(todo.dueDate) && currentStatus !== 'done' ? colors.red : colors.textSoft;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.84}
      onLongPress={() => setShowActions((current) => !current)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardText}>{todo.text}</Text>
        {typeof aiScore === 'number' && currentStatus === 'todo' ? (
          <View style={styles.scorePill}>
            <Text style={styles.scorePillText}>AI {aiScore}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardMeta}>
        {todo.priority ? (
          <View style={[styles.badge, { backgroundColor: `${priorityColor(todo.priority, colors)}18` }]}>
            <Text style={[styles.badgeText, { color: priorityColor(todo.priority, colors) }]}>{todo.priority}</Text>
          </View>
        ) : null}
        {todo.dueDate ? (
          <View style={[styles.badge, { backgroundColor: `${dueTone}18` }]}>
            <Text style={[styles.badgeText, { color: dueTone }]}>{formatDate(todo.dueDate)}</Text>
          </View>
        ) : null}
      </View>

      {showActions ? (
        <View style={styles.actions}>
          {otherStatuses.map((status) => (
            <TouchableOpacity
              key={status.id}
              style={[styles.actionButton, { borderColor: status.color }]}
              onPress={() => {
                onMove(todo.id, status.id);
                setShowActions(false);
              }}
            >
              <Text style={[styles.actionButtonText, { color: status.color }]}>Move to {status.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.red }]}
            onPress={() => {
              onDelete(todo.id);
              setShowActions(false);
            }}
          >
            <Text style={[styles.actionButtonText, { color: colors.red }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle, inputStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerStrip: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    colTabs: { gap: spacing.sm, paddingRight: spacing.md },
    colTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    colTabText: { fontSize: font.sm, fontWeight: font.semibold },
    colBadge: { borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
    colBadgeText: { fontSize: 10, fontWeight: font.bold },
    aiButton: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      ...shadow.sm,
    },
    aiButtonText: { color: '#fff', fontSize: font.sm, fontWeight: font.bold },
    aiHintBox: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    aiHintTitle: { color: colors.text, fontSize: font.sm, fontWeight: font.bold, marginBottom: 4 },
    aiHintText: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18 },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 100 },
    empty: { alignItems: 'center', marginTop: 84 },
    emptyIcon: { fontSize: 42, marginBottom: spacing.md },
    emptyText: { color: colors.textSoft, fontSize: font.sm },
    card: { ...cardStyle, marginBottom: spacing.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    cardText: { flex: 1, color: colors.text, fontSize: font.md, lineHeight: 22 },
    scorePill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: colors.accentSoft,
    },
    scorePillText: { color: colors.accent, fontSize: 10, fontWeight: font.bold },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    badgeText: { fontSize: font.xs, fontWeight: font.semibold },
    actions: { marginTop: spacing.md, gap: spacing.xs },
    actionButton: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    actionButtonText: { fontSize: font.xs, fontWeight: font.semibold },
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
    fieldLabel: { color: colors.textSoft, fontSize: font.sm, fontWeight: font.medium, marginBottom: spacing.sm },
    input: { ...inputStyle, marginBottom: spacing.md },
    textArea: { minHeight: 96, textAlignVertical: 'top' },
    priorityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    priorityButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityButtonText: { fontSize: font.sm, fontWeight: font.semibold, textTransform: 'capitalize' },
    modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
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
  });
