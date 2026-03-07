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
  encrypt,
  decrypt,
  copyToClipboard,
  generatePassword,
  hashText,
  maskMiddle,
  showConfirm,
  showMessage,
} from '../utils/helpers';

const TABS = [
  { id: 'passwords', label: 'Passwords' },
  { id: 'apis', label: 'API Keys' },
  { id: 'cards', label: 'Cards' },
];

const emptyForm = {
  title: '',
  user: '',
  pass: '',
  notes: '',
  q0: '',
  a0: '',
  q1: '',
  a1: '',
  q2: '',
  a2: '',
  name: '',
  key: '',
  secret: '',
  number: '',
  exp: '',
  cvv: '',
};

export default function SecurityScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors, spacing, radius, font, cardStyle } = theme;

  const passwords = useStore((s) => s.passwords);
  const apis = useStore((s) => s.apis);
  const cards = useStore((s) => s.cards);
  const securityHealth = useStore((s) => s.securityHealth);
  const addPassword = useStore((s) => s.addPassword);
  const updatePassword = useStore((s) => s.updatePassword);
  const deletePassword = useStore((s) => s.deletePassword);
  const addApi = useStore((s) => s.addApi);
  const updateApi = useStore((s) => s.updateApi);
  const deleteApi = useStore((s) => s.deleteApi);
  const addCard = useStore((s) => s.addCard);
  const updateCard = useStore((s) => s.updateCard);
  const deleteCard = useStore((s) => s.deleteCard);
  const refreshAiSnapshot = useStore((s) => s.refreshAiSnapshot);

  const [tab, setTab] = useState('passwords');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [visibleMap, setVisibleMap] = useState({});
  const [auditing, setAuditing] = useState(false);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleVisible = (key) => setVisibleMap((current) => ({ ...current, [key]: !current[key] }));

  const openCreate = (nextTab = tab) => {
    setTab(nextTab);
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (entry, nextTab) => {
    setTab(nextTab);
    setEditingId(entry.id);

    if (nextTab === 'passwords') {
      const qs = Array.isArray(entry.qs) ? entry.qs : [];
      setForm({
        ...emptyForm,
        title: entry.title || entry.site || '',
        user: entry.user || entry.username || '',
        pass: decrypt(entry.pass || entry.password || ''),
        notes: entry.notes || '',
        q0: qs[0]?.q || '',
        a0: decrypt(qs[0]?.a || ''),
        q1: qs[1]?.q || '',
        a1: decrypt(qs[1]?.a || ''),
        q2: qs[2]?.q || '',
        a2: decrypt(qs[2]?.a || ''),
      });
    } else if (nextTab === 'apis') {
      setForm({
        ...emptyForm,
        name: entry.name || '',
        key: decrypt(entry.key || ''),
        secret: decrypt(entry.secret || ''),
        notes: entry.notes || '',
      });
    } else {
      setForm({
        ...emptyForm,
        name: entry.name || '',
        number: decrypt(entry.number || ''),
        exp: entry.exp || '',
        cvv: decrypt(entry.cvv || ''),
        notes: entry.notes || '',
      });
    }

    setShowModal(true);
  };

  const saveEntry = () => {
    if (tab === 'passwords') {
      if (!form.title.trim() || !form.pass.trim()) return;
      const payload = {
        title: form.title.trim(),
        user: form.user.trim(),
        pass: encrypt(form.pass.trim()),
        notes: form.notes.trim(),
        qs: [0, 1, 2].map((index) => ({
          q: form[`q${index}`].trim(),
          a: form[`a${index}`].trim() ? encrypt(form[`a${index}`].trim()) : '',
        })),
        updatedAt: new Date().toISOString(),
      };

      if (editingId) updatePassword(editingId, payload);
      else addPassword({ id: uuid(), ...payload });
    }

    if (tab === 'apis') {
      if (!form.name.trim() || !form.key.trim()) return;
      const payload = {
        name: form.name.trim(),
        key: encrypt(form.key.trim()),
        secret: form.secret.trim() ? encrypt(form.secret.trim()) : '',
        notes: form.notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (editingId) updateApi(editingId, payload);
      else addApi({ id: uuid(), ...payload });
    }

    if (tab === 'cards') {
      if (!form.name.trim() || !form.number.trim() || !form.exp.trim() || !form.cvv.trim()) return;
      const cleanNumber = form.number.replace(/\s+/g, '');
      const payload = {
        name: form.name.trim(),
        number: encrypt(cleanNumber),
        last4: cleanNumber.slice(-4),
        exp: form.exp.trim(),
        cvv: encrypt(form.cvv.trim()),
        notes: form.notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (editingId) updateCard(editingId, payload);
      else addCard({ id: uuid(), ...payload });
    }

    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSecurityAudit = async () => {
    setAuditing(true);
    await refreshAiSnapshot();
    setAuditing(false);
  };

  const handleCopy = async (value, label) => {
    await copyToClipboard(value);
    showMessage('Copied', `${label} copied to clipboard.`);
  };

  const renderPasswordCard = ({ item }) => {
    const passwordValue = decrypt(item.pass || item.password || '');
    const isVisible = !!visibleMap[item.id];
    const questions = Array.isArray(item.qs) ? item.qs.filter((entry) => entry?.q) : [];

    return (
      <View style={[styles.entryCard, { borderLeftColor: colors.accent, borderLeftWidth: 3 }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title || item.site || 'Untitled'}</Text>
            {!!(item.user || item.username) && (
              <Text style={styles.cardMeta}>{item.user || item.username}</Text>
            )}
          </View>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => openEdit(item, 'passwords')}>
              <Ionicons name="create-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showConfirm('Delete password?', item.title || 'This entry', () => deletePassword(item.id))}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.secretRow}>
          <Text style={styles.secretText}>{isVisible ? passwordValue : maskMiddle(passwordValue)}</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => toggleVisible(item.id)}>
              <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSoft} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCopy(passwordValue, 'Password')}>
              <Ionicons name="copy-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {questions.map((entry, index) => (
          <View key={`${item.id}_${index}`} style={styles.questionRow}>
            <Text style={styles.questionLabel}>Q{index + 1}: {entry.q}</Text>
            {!!entry.a && (
              <Text style={styles.answerLabel}>A: {visibleMap[item.id] ? decrypt(entry.a) : '••••••'}</Text>
            )}
          </View>
        ))}

        {!!item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
      </View>
    );
  };

  const renderApiCard = ({ item }) => {
    const keyValue = decrypt(item.key || '');
    const secretValue = decrypt(item.secret || '');
    const isVisible = !!visibleMap[item.id];
    const secretVisible = !!visibleMap[`${item.id}_secret`];

    return (
      <View style={[styles.entryCard, { borderLeftColor: colors.purple, borderLeftWidth: 3 }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name || 'API Key'}</Text>
            {!!item.notes && <Text style={styles.cardMeta}>{item.notes}</Text>}
          </View>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => openEdit(item, 'apis')}>
              <Ionicons name="create-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showConfirm('Delete API key?', item.name || 'This entry', () => deleteApi(item.id))}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Key</Text>
          <View style={styles.secretRow}>
            <Text style={styles.secretText}>{isVisible ? keyValue : maskMiddle(keyValue)}</Text>
            <View style={styles.iconRow}>
              <TouchableOpacity onPress={() => toggleVisible(item.id)}>
                <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSoft} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCopy(keyValue, 'API key')}>
                <Ionicons name="copy-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!!secretValue && (
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Secret</Text>
            <View style={styles.secretRow}>
              <Text style={styles.secretText}>{secretVisible ? secretValue : maskMiddle(secretValue)}</Text>
              <View style={styles.iconRow}>
                <TouchableOpacity onPress={() => toggleVisible(`${item.id}_secret`)}>
                  <Ionicons name={secretVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSoft} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCopy(secretValue, 'API secret')}>
                  <Ionicons name="copy-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCardCard = ({ item }) => {
    const numberValue = decrypt(item.number || '');
    const cvvValue = decrypt(item.cvv || '');
    const isVisible = !!visibleMap[item.id];

    return (
      <View style={[styles.cardVault, { borderColor: colors.borderHi }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name || 'Bank Card'}</Text>
            <Text style={styles.cardMeta}>{item.exp || 'No expiry'}</Text>
          </View>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => openEdit(item, 'cards')}>
              <Ionicons name="create-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showConfirm('Delete card?', item.name || 'This card', () => deleteCard(item.id))}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.cardNumber}>{isVisible ? numberValue : `•••• •••• •••• ${item.last4 || numberValue.slice(-4)}`}</Text>
        <View style={styles.cardFooterRow}>
          <Text style={styles.cardMeta}>CVV: {isVisible ? cvvValue : '•••'}</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => toggleVisible(item.id)}>
              <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSoft} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCopy(numberValue, 'Card number')}>
              <Ionicons name="copy-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        {!!item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
      </View>
    );
  };

  const activeData = tab === 'passwords' ? passwords : tab === 'apis' ? apis : cards;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabBtn, tab === item.id && styles.tabBtnActive]}
              onPress={() => setTab(item.id)}
            >
              <Text style={[styles.tabBtnText, tab === item.id && styles.tabBtnTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.auditBtn} onPress={handleSecurityAudit}>
          {auditing ? <Text style={styles.auditBtnText}>Checking...</Text> : <Text style={styles.auditBtnText}>Security Audit</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.healthCard, { borderLeftColor: securityHealth?.score >= 80 ? colors.green : colors.orange }]}>
        <Text style={styles.healthTitle}>Security Health {securityHealth?.score ? `${securityHealth.score}%` : ''}</Text>
        <Text style={styles.healthText}>
          {securityHealth?.risks?.length
            ? securityHealth.risks.join(' | ')
            : 'Run an audit to review password reuse, short passwords, and missing fields.'}
        </Text>
      </View>

      <FlatList
        data={activeData}
        keyExtractor={(item) => item.id || hashText(JSON.stringify(item))}
        contentContainerStyle={styles.list}
        renderItem={tab === 'passwords' ? renderPasswordCard : tab === 'apis' ? renderApiCard : renderCardCard}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{tab === 'passwords' ? '🔐' : tab === 'apis' ? '🔌' : '💳'}</Text>
            <Text style={styles.emptyTitle}>No {tab} yet</Text>
            <Text style={styles.emptyText}>Add your first {tab === 'passwords' ? 'password entry' : tab === 'apis' ? 'API credential' : 'card'}.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => openCreate(tab)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? `Edit ${tab === 'passwords' ? 'Password' : tab === 'apis' ? 'API Key' : 'Card'}` : `Add ${tab === 'passwords' ? 'Password' : tab === 'apis' ? 'API Key' : 'Card'}`}
              </Text>

              {tab === 'passwords' && (
                <>
                  <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.muted} value={form.title} onChangeText={(value) => setField('title', value)} />
                  <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.muted} value={form.user} onChangeText={(value) => setField('user', value)} />
                  <View style={styles.rowInput}>
                    <TextInput style={[styles.input, styles.flexInput]} placeholder="Password" placeholderTextColor={colors.muted} value={form.pass} onChangeText={(value) => setField('pass', value)} />
                    <TouchableOpacity style={styles.inlineBtn} onPress={() => setField('pass', generatePassword({ length: 18 }))}>
                      <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                  {[0, 1, 2].map((index) => (
                    <View key={`qa_${index}`} style={styles.questionInputBlock}>
                      <TextInput style={styles.input} placeholder={`Question ${index + 1}`} placeholderTextColor={colors.muted} value={form[`q${index}`]} onChangeText={(value) => setField(`q${index}`, value)} />
                      <TextInput style={styles.input} placeholder={`Answer ${index + 1}`} placeholderTextColor={colors.muted} value={form[`a${index}`]} onChangeText={(value) => setField(`a${index}`, value)} />
                    </View>
                  ))}
                </>
              )}

              {tab === 'apis' && (
                <>
                  <TextInput style={styles.input} placeholder="Service name" placeholderTextColor={colors.muted} value={form.name} onChangeText={(value) => setField('name', value)} />
                  <TextInput style={styles.input} placeholder="API key" placeholderTextColor={colors.muted} value={form.key} onChangeText={(value) => setField('key', value)} />
                  <TextInput style={styles.input} placeholder="API secret" placeholderTextColor={colors.muted} value={form.secret} onChangeText={(value) => setField('secret', value)} />
                </>
              )}

              {tab === 'cards' && (
                <>
                  <TextInput style={styles.input} placeholder="Card name" placeholderTextColor={colors.muted} value={form.name} onChangeText={(value) => setField('name', value)} />
                  <TextInput style={styles.input} placeholder="Card number" placeholderTextColor={colors.muted} keyboardType="number-pad" value={form.number} onChangeText={(value) => setField('number', value)} />
                  <View style={styles.rowInput}>
                    <TextInput style={[styles.input, styles.flexInput]} placeholder="MM/YY" placeholderTextColor={colors.muted} value={form.exp} onChangeText={(value) => setField('exp', value)} />
                    <TextInput style={[styles.input, styles.flexInput]} placeholder="CVV" placeholderTextColor={colors.muted} keyboardType="number-pad" value={form.cvv} onChangeText={(value) => setField('cvv', value)} />
                  </View>
                </>
              )}

              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes"
                placeholderTextColor={colors.muted}
                multiline
                value={form.notes}
                onChangeText={(value) => setField('notes', value)}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Save Entry'}</Text>
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
    headerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
    tabRow: { gap: spacing.sm },
    tabBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    tabBtnText: { color: colors.muted, fontSize: font.sm, fontWeight: font.semibold },
    tabBtnTextActive: { color: colors.accent },
    auditBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    auditBtnText: { color: colors.text, fontWeight: font.semibold, fontSize: font.sm },
    healthCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      padding: spacing.lg,
    },
    healthTitle: { color: colors.text, fontSize: font.md, fontWeight: font.bold, marginBottom: spacing.xs },
    healthText: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18 },
    list: { padding: spacing.lg, paddingBottom: 100, gap: spacing.sm },
    entryCard: { ...cardStyle, gap: spacing.sm },
    cardVault: {
      ...cardStyle,
      backgroundColor: colors.surface,
      gap: spacing.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    cardTitle: { color: colors.text, fontSize: font.md, fontWeight: font.semibold },
    cardMeta: { color: colors.textSoft, fontSize: font.xs, marginTop: 2 },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    secretRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secretText: { flex: 1, color: colors.text, fontSize: font.sm, fontWeight: font.medium },
    questionRow: { gap: 2 },
    questionLabel: { color: colors.textSoft, fontSize: font.xs },
    answerLabel: { color: colors.muted, fontSize: font.xs },
    notesText: { color: colors.textSoft, fontSize: font.xs, lineHeight: 18 },
    fieldBlock: { gap: spacing.xs },
    fieldLabel: { color: colors.muted, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    cardNumber: {
      color: colors.text,
      fontSize: font.xl,
      fontWeight: font.bold,
      letterSpacing: 1.5,
      marginVertical: spacing.sm,
    },
    cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 42, marginBottom: spacing.md },
    emptyTitle: { color: colors.text, fontSize: font.md, fontWeight: font.bold, marginBottom: spacing.xs },
    emptyText: { color: colors.textSoft, fontSize: font.sm, textAlign: 'center' },
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modal: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      maxHeight: '92%',
    },
    modalTitle: { color: colors.text, fontSize: font.lg, fontWeight: font.bold, marginBottom: spacing.lg },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: font.md,
      marginBottom: spacing.sm,
    },
    rowInput: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    flexInput: { flex: 1 },
    inlineBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      marginBottom: spacing.sm,
    },
    questionInputBlock: { marginBottom: spacing.sm },
    notesInput: { minHeight: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
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
