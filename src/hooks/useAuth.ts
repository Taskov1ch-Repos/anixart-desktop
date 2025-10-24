import { useState, useEffect, useCallback } from "react";
import { LazyStore } from "@tauri-apps/plugin-store";
import { getAnixartClient } from "../client";
import { useNavigate } from "react-router-dom";

const AUTH_STORE_FILE = "auth.json";
const TOKEN_KEY = "authToken";
const USER_ID_KEY = "userId";

let authStore: LazyStore | null = null;

const getAuthStore = (): LazyStore | null => {
	// @ts-expect-error __TAURI__ is injected globally
	if (!window.__TAURI__) {
		console.warn("Tauri API not available, using localStorage for auth.");
		return null;
	}
	if (authStore === null) {
		try {
			authStore = new LazyStore(AUTH_STORE_FILE);
		} catch (e) {
			console.error("Failed to initialize Tauri Auth Store:", e);
			return null;
		}
	}
	return authStore;
};

interface AuthState {
	userId: number | null;
	token: string | null;
	isLoading: boolean;
}

export const useAuth = () => {
	const [authState, setAuthState] = useState<AuthState>({
		userId: null,
		token: null,
		isLoading: true,
	});
	const navigate = useNavigate();

	const loadAuthData = useCallback(async () => {
		let tokenFromStore: string | undefined | null = undefined;
		let finalToken: string | null = null;
		let userIdFromStore: number | undefined | null = undefined;
		let finalUserId: number | null = null;

		try {
			const store = getAuthStore();
			if (store) {
				tokenFromStore = await store.get<string>(TOKEN_KEY);
				userIdFromStore = await store.get<number>(USER_ID_KEY);

				finalToken = tokenFromStore === undefined ? null : tokenFromStore;
				finalUserId = userIdFromStore === undefined ? null : userIdFromStore;

			} else {
				finalToken = localStorage.getItem(TOKEN_KEY);
				const userIdStr = localStorage.getItem(USER_ID_KEY);
				finalUserId = userIdStr ? parseInt(userIdStr, 10) : null;
			}

			if (typeof finalUserId !== 'number' && finalUserId !== null) {
				console.warn("Invalid userId found in storage, setting to null.");
				finalUserId = null;
				if (store) {
					await store.delete(USER_ID_KEY);
					await store.save();
				} else {
					localStorage.removeItem(USER_ID_KEY);
				}
			}

			setAuthState({ userId: finalUserId, token: finalToken, isLoading: false });

			if (finalToken) {
				const client = getAnixartClient();
				client.token = finalToken;
				console.log("Auth token loaded and set in Anixart client.");
			}
		} catch (error) {
			console.error("Failed to load auth data:", error);
			setAuthState({ userId: null, token: null, isLoading: false });
		}
	}, []);

	useEffect(() => {
		loadAuthData();
	}, [loadAuthData]);

	const login = useCallback(
		async (username: string, password: string): Promise<boolean> => {
			try {
				const client = getAnixartClient();
				const response = await client.endpoints.auth.signIn({
					login: username,
					password,
				});

				if (response.code === 0 && response.profile && response.profileToken) {
					const { profile, profileToken } = response;
					const store = getAuthStore();
					if (store) {
						await store.set(TOKEN_KEY, profileToken.token);
						await store.set(USER_ID_KEY, profile.id);
						await store.save();
					} else {
						localStorage.setItem(TOKEN_KEY, profileToken.token);
						localStorage.setItem(USER_ID_KEY, profile.id.toString());
					}
					client.token = profileToken.token;
					setAuthState({ userId: profile.id, token: profileToken.token, isLoading: false });
					console.log("Login successful, navigating to profile.");
					navigate(`/profile/${profile.id}`);
					return true;
				} else {
					console.error("Login failed with code:", response.code);
					setAuthState({ userId: null, token: null, isLoading: false });
					return false;
				}
			} catch (error) {
				console.error("Login error:", error);
				setAuthState({ userId: null, token: null, isLoading: false });
				return false;
			}
		},
		[navigate]
	);

	const logout = useCallback(async () => {
		try {
			const store = getAuthStore();
			if (store) {
				await store.delete(TOKEN_KEY);
				await store.delete(USER_ID_KEY);
				await store.save();
			} else {
				localStorage.removeItem(TOKEN_KEY);
				localStorage.removeItem(USER_ID_KEY);
			}
			getAnixartClient().token = null;
			setAuthState({ userId: null, token: null, isLoading: false });
			console.log("Logged out.");
			navigate("/profile");
		} catch (error) {
			console.error("Logout error:", error);
		}
	}, [navigate]);

	return { ...authState, login, logout, loadAuthData };
};