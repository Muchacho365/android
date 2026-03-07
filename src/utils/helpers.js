/**
 * utils/helpers.js — Shared utility functions
 */

import 'react-native-get-random-values';
import uuidLib from 'react-native-uuid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

dayjs.extend(relativeTime);

export const uuid = () => String(uuidLib.v4());

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('MMM D');
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('MMM D, HH:mm');
};

export const formatRelative = (dateStr) => {
  if (!dateStr) return '';
  return dayjs(dateStr).fromNow();
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  return dayjs(dateStr).isBefore(dayjs().startOf('day'));
};

export const showConfirm = (title, message, onConfirm) => {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
};

export const showMessage = (title, message) => {
  Alert.alert(title, message);
};

export const encrypt = (text) => {
  try { return btoa(unescape(encodeURIComponent(text))); }
  catch { return text; }
};

export const decrypt = (text) => {
  try { return decodeURIComponent(escape(atob(text))); }
  catch { return text; }
};

export const copyToClipboard = async (value) => {
  const text = String(value || '');
  await Clipboard.setStringAsync(text);
  return text;
};

export const priorityColor = (priority, colors) => {
  switch (priority) {
    case 'high':   return colors.priorityHigh;
    case 'medium': return colors.priorityMedium;
    case 'low':    return colors.priorityLow;
    default:       return colors.muted;
  }
};

export const hashText = (text) => {
  let hash = 0;
  const source = String(text || '');
  for (let index = 0; index < source.length; index++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${source.length}`;
};

export const stripRichText = (value) =>
  String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

export const isProbablyHtml = (value) => /<[^>]+>/.test(String(value || ''));

export const getNotePlainText = (note) => stripRichText(note?.content || note?.text || '');

export const getNotePreview = (note, maxLength = 180) => {
  const text = getNotePlainText(note);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

export const renderMarkdownPreview = (value) => {
  const text = stripRichText(value)
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '• ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

  return text;
};

export const getRenderedNoteText = (note) => {
  const text = getNotePlainText(note);
  return note?.isMarkdown ? renderMarkdownPreview(text) : text;
};

export const maskMiddle = (value, visible = 4) => {
  const text = String(value || '');
  if (text.length <= visible) return text;
  const head = text.slice(0, Math.min(visible, 2));
  const tail = text.slice(-visible);
  return `${head}${'•'.repeat(Math.max(4, text.length - head.length - tail.length))}${tail}`;
};

export const generatePassword = ({
  length = 18,
  uppercase = true,
  lowercase = true,
  numbers = true,
  symbols = true,
} = {}) => {
  let chars = '';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

  const values = new Uint32Array(length);
  global.crypto.getRandomValues(values);

  return Array.from(values, (value) => chars[value % chars.length]).join('');
};
