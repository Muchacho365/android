/**
 * screens/VideosScreen.js
 */
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store';
import { colors, spacing, radius, font, cardStyle } from '../theme';
import { uuid, showConfirm } from '../utils/helpers';

const PLATFORMS = ['YouTube','Netflix','Prime','Twitch','Other'];

export const VideosScreen = () => {
  const videos      = useStore(s => s.videos);
  const addVideo    = useStore(s => s.addVideo);
  const updateVideo = useStore(s => s.updateVideo);
  const deleteVideo = useStore(s => s.deleteVideo);

  const [showAdd,    setShowAdd]    = useState(false);
  const [title,      setTitle]      = useState('');
  const [url,        setUrl]        = useState('');
  const [platform,   setPlatform]   = useState('YouTube');
  const [filter,     setFilter]     = useState('all'); // all | unwatched | watched

  const filtered = videos.filter(v =>
    filter === 'all' ? true : filter === 'watched' ? v.watched : !v.watched
  );

  const handleAdd = () => {
    if (!title.trim()) return;
    addVideo({ id: uuid(), title: title.trim(), url: url.trim(), platform, watched: false, createdAt: new Date().toISOString() });
    setTitle(''); setUrl(''); setPlatform('YouTube'); setShowAdd(false);
  };

  return (
    <SafeAreaView style={vstyles.safe} edges={['bottom']}>

      <View style={vstyles.filterRow}>
        {['all','unwatched','watched'].map(f => (
          <TouchableOpacity key={f} style={[vstyles.filterBtn, filter === f && vstyles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[vstyles.filterBtnText, filter === f && vstyles.filterBtnTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={v => v.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[vstyles.card, item.watched && vstyles.cardWatched]}>
            <View style={vstyles.cardLeft}>
              <Text style={vstyles.platformTag}>{item.platform || 'Video'}</Text>
              <Text style={vstyles.videoTitle} numberOfLines={2}>{item.title}</Text>
            </View>
            <View style={vstyles.cardActions}>
              <TouchableOpacity onPress={() => updateVideo(item.id, { watched: !item.watched })}>
                <Ionicons name={item.watched ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color={item.watched ? colors.green : colors.muted} />
              </TouchableOpacity>
              {item.url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                  <Ionicons name="open-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => showConfirm('Delete video?', item.title, () => deleteVideo(item.id))}>
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={{ alignItems:'center', marginTop:80 }}><Text style={{ fontSize:40, marginBottom:12 }}>🎬</Text><Text style={{ color: colors.muted }}>No videos yet</Text></View>}
      />

      <TouchableOpacity style={vstyles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' }} onPress={() => setShowAdd(false)}>
          <Pressable style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl }} onPress={e => e.stopPropagation()}>
            <Text style={{ fontSize: font.lg, fontWeight: font.bold, color:'#fff', marginBottom: spacing.lg }}>Add Video</Text>
            <TextInput style={vstyles.input} placeholder="Title *" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} autoFocus />
            <TextInput style={vstyles.input} placeholder="URL (optional)" placeholderTextColor={colors.muted} value={url} onChangeText={setUrl} keyboardType="url" />
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
              {PLATFORMS.map(p => (
                <TouchableOpacity key={p} style={[vstyles.platBtn, platform === p && vstyles.platBtnActive]} onPress={() => setPlatform(p)}>
                  <Text style={[vstyles.platBtnText, platform === p && { color: colors.accent }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[{ backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.lg, alignItems:'center' }, !title.trim() && { opacity:0.4 }]} onPress={handleAdd} disabled={!title.trim()}>
              <Text style={{ color:'#fff', fontWeight: font.bold, fontSize: font.md }}>Add Video</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const vstyles = StyleSheet.create({
  safe: { flex:1, backgroundColor: colors.bg },
  filterRow: { flexDirection:'row', padding: spacing.lg, gap: spacing.sm },
  filterBtn: { borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderWidth:1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  filterBtnText: { fontSize: font.xs, color: colors.muted, fontWeight: font.medium, textTransform:'capitalize' },
  filterBtnTextActive: { color: colors.accent },
  card: { ...cardStyle, flexDirection:'row', alignItems:'flex-start', gap: spacing.md },
  cardWatched: { opacity: 0.55 },
  cardLeft: { flex:1 },
  platformTag: { fontSize:10, color: colors.accent, fontWeight: font.semibold, marginBottom: spacing.xs, textTransform:'uppercase', letterSpacing:0.5 },
  videoTitle: { fontSize: font.md, color:'#fff', lineHeight:20 },
  cardActions: { flexDirection:'row', alignItems:'center', gap: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth:1, borderColor: colors.border, color: colors.text, padding: spacing.lg, fontSize: font.md, marginBottom: spacing.sm },
  platBtn: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.dim, borderWidth:1, borderColor: colors.border },
  platBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  platBtnText: { fontSize: font.xs, color: colors.muted },
  fab: { position:'absolute', bottom: spacing.xl, right: spacing.xl, width:56, height:56, borderRadius:28, backgroundColor: colors.accent, alignItems:'center', justifyContent:'center', elevation:8 },
});
