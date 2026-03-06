/**
 * utils/helpers.js — Shared utility functions
 */

import 'react-native-get-random-values'; // Required for uuid on RN
import { v4 as uuidv4 } from 'react-native-uuid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Alert, Clipboard } from 'react-native';

dayjs.extend(relativeTime);

export const uuid = () => uuidv4();

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

export const copyToClipboard = async (text) => {
  Clipboard.setString(text);
};

export const showConfirm = (title, message, onConfirm) => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]
  );
};

// Simple base64 encrypt/decrypt for non-Electron platforms
// For production, use react-native-encrypted-storage for real encryption
export const encrypt = (text) => {
  try { return btoa(unescape(encodeURIComponent(text))); }
  catch { return text; }
};

export const decrypt = (text) => {
  try { return decodeURIComponent(escape(atob(text))); }
  catch { return text; }
};

export const priorityColor = (priority, colors) => {
  switch (priority) {
    case 'high':   return colors.priorityHigh;
    case 'medium': return colors.priorityMedium;
    case 'low':    return colors.priorityLow;
    default:       return colors.muted;
  }
};
