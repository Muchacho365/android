/**
 * App.js — Root of the React Native app
 *
 * HOW NAVIGATION WORKS:
 * React Navigation manages screens like a stack of cards.
 * Bottom tabs = always visible nav bar at the bottom.
 * Each tab has its own stack so you can go deeper (e.g. book detail)
 * and come back without losing the tab state.
 *
 * STARTUP FLOW:
 * 1. App loads
 * 2. Check AsyncStorage for saved user session
 * 3. If found → load their local data → start live sync → go to main
 * 4. If not found → show LoginScreen
 */

import { useEffect, useState } from "react";
import { StatusBar, View, Text, ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "./src/screens/LoginScreen";
import TodosScreen from "./src/screens/TodosScreen";
import NotesScreen from "./src/screens/NotesScreen";
import BooksScreen from "./src/screens/BooksScreen";
import { VideosScreen } from "./src/screens/VideosScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

import useStore from "./src/store";
import { storage } from "./src/utils/storage";
import {
	startLiveSync,
	stopLiveSync,
	pullFromCloud,
} from "./src/sync/pouchSync";
import { colors, font } from "./src/theme";

const Tab = createBottomTabNavigator();

// Dark navigation theme
const NavTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: colors.bg,
		card: colors.surface,
		border: colors.border,
		text: colors.text,
		primary: colors.accent,
	},
};

// Tab icon map
const TAB_ICONS = {
	Todos: { active: "checkmark-circle", inactive: "checkmark-circle-outline" },
	Notes: { active: "document-text", inactive: "document-text-outline" },
	Books: { active: "library", inactive: "library-outline" },
	Videos: { active: "play-circle", inactive: "play-circle-outline" },
	Settings: { active: "settings", inactive: "settings-outline" },
};

export default function App() {
	const [authState, setAuthState] = useState("loading"); // 'loading' | 'loggedOut' | 'loggedIn'

	const setUser = useStore((s) => s.setUser);
	const applyData = useStore((s) => s.applyData);
	const setSyncStatus = useStore((s) => s.setSyncStatus);

	// ─── On app start ─────────────────────────────────────────────────────────
	useEffect(() => {
		const init = async () => {
			// 1. Check for saved session
			const savedUser = await storage.loadUser();

			if (!savedUser) {
				setAuthState("loggedOut");
				return;
			}

			// 2. Load local data immediately (so app works offline)
			const localData = await storage.load();
			if (localData) applyData(localData);

			setUser(savedUser);
			setAuthState("loggedIn");

			// 3. Try to pull latest from cloud (in background, don't block UI)
			pullFromCloud()
				.then((cloudData) => {
					if (cloudData) {
						applyData(cloudData);
						storage.save(cloudData);
					}
				})
				.catch(() => {}); // Silently fail if offline

			// 4. Start live sync — listen for real-time changes from Electron
			// This is what makes both apps stay in sync automatically
			startLiveSync((remoteData) => {
				console.log("[App] Remote change received, updating UI...");
				applyData(remoteData);
				storage.save(remoteData); // Save incoming changes locally too
				setSyncStatus("synced");
			});
		};

		init();

		// Clean up live sync when app closes
		return () => stopLiveSync();
	}, []);

	// ─── Login handler ────────────────────────────────────────────────────────
	const handleLogin = async (user) => {
		const localData = await storage.load();
		if (localData) applyData(localData);

		setAuthState("loggedIn");

		// Pull from cloud after login
		pullFromCloud()
			.then((cloudData) => {
				if (cloudData) {
					applyData(cloudData);
					storage.save(cloudData);
				}
			})
			.catch(() => {});

		startLiveSync((remoteData) => {
			applyData(remoteData);
			storage.save(remoteData);
		});
	};

	// ─── Logout handler ───────────────────────────────────────────────────────
	const handleLogout = () => {
		stopLiveSync();
		setUser(null);
		setAuthState("loggedOut");
	};

	// ─── Loading splash ───────────────────────────────────────────────────────
	if (authState === "loading") {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: colors.bg,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<StatusBar
					barStyle="light-content"
					backgroundColor={colors.bg}
				/>
				<Text style={{ fontSize: 48, marginBottom: 24 }}>📋</Text>
				<ActivityIndicator color={colors.accent} size="large" />
				<Text
					style={{
						color: colors.muted,
						fontSize: font.sm,
						marginTop: 16,
					}}
				>
					Loading your data...
				</Text>
			</View>
		);
	}

	// ─── Login screen ─────────────────────────────────────────────────────────
	if (authState === "loggedOut") {
		return (
			<SafeAreaProvider>
				<StatusBar
					barStyle="light-content"
					backgroundColor={colors.bg}
				/>
				<LoginScreen onLogin={handleLogin} />
			</SafeAreaProvider>
		);
	}

	// ─── Main app with bottom tabs ────────────────────────────────────────────
	return (
		<SafeAreaProvider>
			<StatusBar barStyle="light-content" backgroundColor={colors.bg} />
			<NavigationContainer theme={NavTheme}>
				<Tab.Navigator
					screenOptions={({ route }) => ({
						headerStyle: {
							backgroundColor: colors.surface,
							elevation: 0,
							shadowOpacity: 0,
							borderBottomWidth: 1,
							borderBottomColor: colors.border,
						},
						headerTitleStyle: {
							color: "#fff",
							fontSize: font.lg,
							fontWeight: font.bold,
						},
						headerTintColor: colors.accent,

						tabBarStyle: {
							backgroundColor: colors.surface,
							borderTopColor: colors.border,
							borderTopWidth: 1,
							height: 60,
							paddingBottom: 8,
							paddingTop: 4,
						},
						tabBarActiveTintColor: colors.accent,
						tabBarInactiveTintColor: colors.muted,
						tabBarLabelStyle: {
							fontSize: 10,
							fontWeight: font.medium,
						},

						tabBarIcon: ({ focused, color, size }) => {
							const icons = TAB_ICONS[route.name];
							return (
								<Ionicons
									name={
										focused ? icons.active : icons.inactive
									}
									size={size}
									color={color}
								/>
							);
						},
					})}
				>
					<Tab.Screen
						name="Todos"
						component={TodosScreen}
						options={{ title: "Todos", tabBarLabel: "Todos" }}
					/>
					<Tab.Screen
						name="Notes"
						component={NotesScreen}
						options={{ title: "Notes", tabBarLabel: "Notes" }}
					/>
					<Tab.Screen
						name="Books"
						component={BooksScreen}
						options={{ title: "Books", tabBarLabel: "Books" }}
					/>
					<Tab.Screen
						name="Videos"
						component={VideosScreen}
						options={{ title: "Videos", tabBarLabel: "Videos" }}
					/>
					<Tab.Screen
						name="Settings"
						options={{ title: "Settings", tabBarLabel: "Settings" }}
					>
						{() => <SettingsScreen onLogout={handleLogout} />}
					</Tab.Screen>
				</Tab.Navigator>
			</NavigationContainer>
		</SafeAreaProvider>
	);
}
