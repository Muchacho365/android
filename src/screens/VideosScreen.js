import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
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

const PLATFORMS = ['YouTube', 'Netflix', 'Prime', 'Twitch', 'Other'];

export const VideosScreen = () => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, cardStyle, inputStyle } = theme;

  const videos = useStore((state) => state.videos);
  const addVideo = useStore((state) => state.addVideo);
  const updateVideo = useStore((state) => state.updateVideo);
  const deleteVideo = useStore((state) => state.deleteVideo);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('YouTube');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return videos.filter((video) => {
      const statusMatches = filter === 'all' ? true : filter === 'watched' ? video.watched : !video.watched;
      if (!statusMatches) return false;
      if (!query) return true;

      return [video.title, video.platform, video.notes, video.season, video.episode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [videos, filter, search]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setUrl('');
    setPlatform('YouTube');
    setSeason('');
    setEpisode('');
    setTime('');
    setNotes('');
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (video) => {
    setEditingId(video.id);
    setTitle(video.title || '');
    setUrl(video.url || '');
    setPlatform(video.platform || 'YouTube');
    setSeason(video.season || '');
    setEpisode(video.episode || '');
    setTime(video.time || '');
    setNotes(video.notes || '');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      url: url.trim(),
      platform,
      season: season.trim(),
      episode: episode.trim(),
      time: time.trim(),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      updateVideo(editingId, payload);
    } else {
      addVideo({
        id: uuid(),
        ...payload,
        watched: false,
        createdAt: new Date().toISOString(),
      });
    }

    setShowModal(false);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerTools}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shows, notes, seasons..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['all', 'unwatched', 'watched'].map((value) => {
            const active = filter === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.filterButton, active && styles.filterButtonActive]}
                onPress={() => setFilter(value)}
              >
                <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>{value}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, item.watched && styles.cardWatched]}>
            <View style={styles.cardLeft}>
              <View style={styles.topRow}>
                <Text style={styles.platformTag}>{item.platform || 'Video'}</Text>
                {item.watched ? <Text style={styles.watchedTag}>Watched</Text> : null}
              </View>
              <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>

              <View style={styles.metaRow}>
                {!!item.season && <Text style={styles.metaText}>Season {item.season}</Text>}
                {!!item.episode && <Text style={styles.metaText}>Episode {item.episode}</Text>}
                {!!item.time && <Text style={styles.metaText}>⏱ {item.time}</Text>}
              </View>

              {!!item.notes && <Text style={styles.noteText} numberOfLines={3}>{item.notes}</Text>}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => updateVideo(item.id, { watched: !item.watched })}>
                <Ionicons
                  name={item.watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={22}
                  color={item.watched ? colors.green : colors.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
              {item.url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                  <Ionicons name="open-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => showConfirm('Delete video?', 'This entry will be removed.', () => deleteVideo(item.id))}>
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>No videos yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Video' : 'Add Video'}</Text>

            <TextInput style={styles.input} placeholder="Title *" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} autoFocus />
            <TextInput style={styles.input} placeholder="URL (optional)" placeholderTextColor={colors.muted} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
              {PLATFORMS.map((name) => {
                const active = platform === name;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.platformButton, active && styles.platformButtonActive]}
                    onPress={() => setPlatform(name)}
                  >
                    <Text style={[styles.platformButtonText, active && styles.platformButtonTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.row3}>
              <TextInput style={[styles.input, styles.rowInput]} placeholder="Season" placeholderTextColor={colors.muted} value={season} onChangeText={setSeason} />
              <TextInput style={[styles.input, styles.rowInput]} placeholder="Episode" placeholderTextColor={colors.muted} value={episode} onChangeText={setEpisode} />
              <TextInput style={[styles.input, styles.rowInput]} placeholder="Time" placeholderTextColor={colors.muted} value={time} onChangeText={setTime} />
            </View>

            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, !title.trim() && styles.disabledButton]} onPress={handleSave} disabled={!title.trim()}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = ({ colors, spacing, radius, font, shadow, cardStyle, inputStyle }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerTools: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    searchIcon: { marginRight: spacing.xs },
    searchInput: { flex: 1, minHeight: 42, color: colors.text, fontSize: font.sm },
    filterRow: { gap: spacing.sm, paddingBottom: spacing.sm },
    filterButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    filterButtonText: { color: colors.textSoft, fontSize: font.xs, fontWeight: font.semibold, textTransform: 'capitalize' },
    filterButtonTextActive: { color: colors.accent },
    list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 },
    card: { ...cardStyle, flexDirection: 'row', gap: spacing.md },
    cardWatched: { opacity: 0.78 },
    cardLeft: { flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    platformTag: { color: colors.accent, fontSize: font.xs, fontWeight: font.bold },
    watchedTag: { color: colors.green, fontSize: font.xs, fontWeight: font.bold },
    videoTitle: { color: colors.text, fontSize: font.md, fontWeight: font.bold, marginBottom: spacing.xs },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
    metaText: { color: colors.textSoft, fontSize: font.xs },
    noteText: { color: colors.textSoft, fontSize: font.sm, lineHeight: 20 },
    cardActions: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
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
    platformRow: { gap: spacing.sm, marginBottom: spacing.md },
    platformButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    platformButtonActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    platformButtonText: { color: colors.textSoft, fontSize: font.xs, fontWeight: font.semibold },
    platformButtonTextActive: { color: colors.accent },
    row3: { flexDirection: 'row', gap: spacing.sm },
    rowInput: { flex: 1 },
    notesInput: { minHeight: 96, textAlignVertical: 'top' },
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
