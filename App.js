import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import TodosScreen from './src/screens/TodosScreen';
import NotesScreen from './src/screens/NotesScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import BooksScreen from './src/screens/BooksScreen';
import { VideosScreen } from './src/screens/VideosScreen';
import AiToolsScreen from './src/screens/AiToolsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LockScreen from './src/screens/LockScreen';

import useStore from './src/store';
import { storage } from './src/utils/storage';
import {
  flushScheduledPush,
  pullFromCloud,
  refreshSyncConfig,
  startLiveSync,
  stopLiveSync,
} from './src/sync/firebaseSync';
import { getTheme, ThemeContext } from './src/theme';
import { hashText } from './src/utils/helpers';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Tasks: { icon: 'checkmark-circle', label: 'Tasks' },
  Notes: { icon: 'document-text', label: 'Notes' },
  Vault: { icon: 'shield-checkmark', label: 'Vault' },
  Books: { icon: 'library', label: 'Books' },
  Videos: { icon: 'play-circle', label: 'Videos' },
  AI: { icon: 'sparkles', label: 'AI' },
  More: { icon: 'settings', label: 'More' },
};

const createNavTheme = (theme) => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    border: theme.colors.border,
    text: theme.colors.text,
    primary: theme.colors.accent,
  },
});

export default function App() {
  const [authState, setAuthState] = useState('loading');
  const [lockPinHash, setLockPinHash] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const appStateRef = useRef(AppState.currentState);

  const themeMode = useStore((state) => state.themeMode);
  const setUser = useStore((state) => state.setUser);
  const applyData = useStore((state) => state.applyData);
  const setSyncStatus = useStore((state) => state.setSyncStatus);
  const hydrateThemeMode = useStore((state) => state.hydrateThemeMode);
  const getSnapshot = useStore((state) => state.getSnapshot);
  const user = useStore((state) => state.user);

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);
  const navTheme = useMemo(() => createNavTheme(theme), [theme]);

  const hydrateRemoteData = async () => {
    const cloudData = await pullFromCloud();
    if (!cloudData) return null;

    applyData(cloudData);
    await storage.save(useStore.getState().getSnapshot());
    setSyncStatus('synced');
    return cloudData;
  };

  const startCloudListeners = async () => {
    await startLiveSync(async (remoteData) => {
      applyData(remoteData);
      await storage.save(useStore.getState().getSnapshot());
      setSyncStatus('synced');
    });
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await refreshSyncConfig();
      await hydrateThemeMode();

      const [savedUser, localData, savedLockHash] = await Promise.all([
        storage.loadUser(),
        storage.load(),
        storage.loadLockPinHash(),
      ]);

      if (!mounted) return;

      setLockPinHash(savedLockHash || '');

      if (localData) {
        applyData(localData);
      }

      if (!savedUser) {
        setAuthState('loggedOut');
        return;
      }

      setUser(savedUser);
      setAuthState('loggedIn');
      setIsLocked(Boolean(savedLockHash));

      try {
        await hydrateRemoteData();
      } catch {
        setSyncStatus('error');
      }

      await startCloudListeners();
    };

    init();

    return () => {
      mounted = false;
      stopLiveSync();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'inactive' || nextState === 'background') {
        await flushScheduledPush();
        if (lockPinHash) {
          setIsLocked(true);
        }
        return;
      }

      if (
        previousState.match(/inactive|background/) &&
        nextState === 'active' &&
        authState === 'loggedIn' &&
        user?.uid
      ) {
        try {
          await hydrateRemoteData();
        } catch {
          setSyncStatus('error');
        }
      }
    });

    return () => subscription.remove();
  }, [authState, lockPinHash, user?.uid]);

  const handleLogin = async (nextUser) => {
    const [localData, savedLockHash] = await Promise.all([
      storage.load(),
      storage.loadLockPinHash(),
    ]);

    if (localData) {
      applyData(localData);
    }

    setUser(nextUser);
    setLockPinHash(savedLockHash || '');
    setIsLocked(false);
    setAuthState('loggedIn');

    try {
      await hydrateRemoteData();
    } catch {
      setSyncStatus('error');
    }

    await startCloudListeners();
  };

  const handleLogout = () => {
    stopLiveSync();
    setUser(null);
    setIsLocked(false);
    setAuthState('loggedOut');
  };

  const handleSetLockPin = async (pin) => {
    const nextHash = hashText(pin);
    await storage.saveLockPinHash(nextHash);
    setLockPinHash(nextHash);
    setIsLocked(false);
  };

  const handleClearLockPin = async () => {
    await storage.clearLockPinHash();
    setLockPinHash('');
    setIsLocked(false);
  };

  const handleLockNow = async () => {
    await flushScheduledPush();
    if (lockPinHash) {
      setIsLocked(true);
    }
  };

  const renderLoading = () => (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
      }}
    >
      <StatusBar
        barStyle={theme.mode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.colors.bg}
      />
      <Text style={{ fontSize: 48, marginBottom: theme.spacing.lg }}>📋</Text>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      <Text
        style={{
          color: theme.colors.textSoft,
          fontSize: theme.font.sm,
          marginTop: theme.spacing.md,
        }}
      >
        Loading your workspace...
      </Text>
    </View>
  );

  const renderApp = () => (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            color: theme.colors.text,
            fontSize: theme.font.lg,
            fontWeight: theme.font.bold,
          },
          headerTintColor: theme.colors.accent,
          sceneStyle: {
            backgroundColor: theme.colors.bg,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 66,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: theme.font.semibold,
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarIcon: ({ focused, color, size }) => {
            const config = TAB_CONFIG[route.name];
            const iconName = `${config.icon}${focused ? '' : '-outline'}`;
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          lazy: true,
        })}
      >
        <Tab.Screen name="Tasks" component={TodosScreen} />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Vault" component={SecurityScreen} />
        <Tab.Screen name="Books" component={BooksScreen} />
        <Tab.Screen name="Videos" component={VideosScreen} />
        <Tab.Screen name="AI" component={AiToolsScreen} />
        <Tab.Screen
          name="More"
          options={{ title: 'Settings' }}
        >
          {() => (
            <SettingsScreen
              onLogout={handleLogout}
              lockConfigured={Boolean(lockPinHash)}
              onSetLockPin={handleSetLockPin}
              onClearLockPin={handleClearLockPin}
              onLockNow={handleLockNow}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );

  let content = null;

  if (authState === 'loading') {
    content = renderLoading();
  } else if (authState === 'loggedOut') {
    content = <LoginScreen onLogin={handleLogin} />;
  } else if (lockPinHash && isLocked) {
    content = (
      <LockScreen
        email={user?.email}
        expectedHash={lockPinHash}
        onUnlock={() => setIsLocked(false)}
      />
    );
  } else {
    content = renderApp();
  }

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <StatusBar
          barStyle={theme.mode === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={theme.colors.bg}
        />
        {content}
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
