import { useState, useEffect, useCallback } from "react";
import { LazyStore } from "@tauri-apps/plugin-store";
import { getAnixartClient } from "../client";
import { useNavigate } from "react-router-dom";

const AUTH_STORE_FILE = "auth.json";
const TOKEN_KEY = "authToken";
const USER_ID_KEY = "userId";

const authStore = new LazyStore(AUTH_STORE_FILE);

interface AuthState {
	userId: number | undefined;
	token: string | undefined;
	isLoading: boolean;
}

export const useAuth = () => {
	const [authState, setAuthState] = useState<AuthState>({
		userId: undefined,
		token: undefined,
		isLoading: true,
	});
	const navigate = useNavigate();

	const loadAuthData = useCallback(async () => {
		let token: string | undefined = undefined;
		let userId: number | undefined = undefined;

		try {
			token = await authStore.get<string>(TOKEN_KEY);
			userId = await authStore.get<number>(USER_ID_KEY);

			if (typeof userId !== 'number' && userId !== undefined) {
				console.warn("Invalid userId found in storage, setting to undefined.");
				userId = undefined;
				await authStore.delete(USER_ID_KEY);
				await authStore.save();
			}

			setAuthState({ userId: userId, token: token, isLoading: false });

			if (token) {
				const client = getAnixartClient();
				client.token = token;
				console.log("Auth token loaded and set in Anixart client.");
			}
		} catch (error) {
			console.error("Failed to load auth data:", error);
			setAuthState({ userId: undefined, token: undefined, isLoading: false });
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

					await authStore.set(TOKEN_KEY, profileToken.token);
					await authStore.set(USER_ID_KEY, profile.id);
					await authStore.save();

					client.token = profileToken.token;
					setAuthState({ userId: profile.id, token: profileToken.token, isLoading: false });

					console.log("Login successful, navigating to profile.");
					navigate(`/profile/${profile.id}`);
					return true;
				} else {
					console.error("Login failed with code:", response.code);
					setAuthState({ userId: undefined, token: undefined, isLoading: false });
					return false;
				}
			} catch (error) {
				console.error("Login error:", error);
				setAuthState({ userId: undefined, token: undefined, isLoading: false });
				return false;
			}
		},
		[navigate]
	);

	const logout = useCallback(async () => {
		try {
			await authStore.delete(TOKEN_KEY);
			await authStore.delete(USER_ID_KEY);
			await authStore.save();

			getAnixartClient().token = undefined;
			setAuthState({ userId: undefined, token: undefined, isLoading: false });

			console.log("Logged out.");
			navigate("/profile");
		} catch (error) {
			console.error("Logout error:", error);
		}
	}, [navigate]);

	return { ...authState, login, logout, loadAuthData };
};