import { LazyStore } from "@tauri-apps/plugin-store";

export type Theme = "system" | "light" | "dark";

const THEME_KEY = "appTheme";
const APP_ZOOM_KEY = "appZoom";
const DISCORD_RPC_ENABLED_KEY = "discordRpcEnabled";

const store = new LazyStore("settings.json");

export const loadAppZoom = async (): Promise<number> => {
	try {
		const zoomLevel = await store.get<number>(APP_ZOOM_KEY);
		return zoomLevel ?? 100;
	} catch (error) {
		console.error("Failed to load zoom settings, using default.", error);
		return 100;
	}
};

export const applyAppZoom = (zoomLevel: number) => {
	document.documentElement.style.fontSize = `${zoomLevel}%`;
};

export const saveAppZoom = async (zoomLevel: number) => {
	try {
		await store.set(APP_ZOOM_KEY, zoomLevel);
		await store.save();
	} catch (error) {
		console.error("Failed to save zoom settings.", error);
	}
};

export const loadThemePreference = async (): Promise<Theme> => {
	try {
		const theme = await store.get<Theme>(THEME_KEY);
		return theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
	} catch (error) {
		console.error("Failed to load theme preference, using default.", error);
		return "system";
	}
};

export const saveThemePreference = async (theme: Theme) => {
	try {
		await store.set(THEME_KEY, theme);
		await store.save();
	} catch (error) {
		console.error("Failed to save theme preference.", error);
	}
};

export const applyTheme = (theme: Theme) => {
	const root = document.documentElement;
	let actualTheme: "light" | "dark";

	if (theme === "system") {
		actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} else {
		actualTheme = theme;
	}

	root.setAttribute("data-theme", actualTheme);
	console.log(`Applied theme: ${actualTheme} (Preference: ${theme})`);
};

let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

export const listenToSystemThemeChanges = (currentPreference: Theme) => {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	if (systemThemeListener) {
		try {
			mediaQuery.removeEventListener("change", systemThemeListener);
		} catch (e) {
			try {
				(mediaQuery as any).removeListener(systemThemeListener);
			} catch (e2) { }
		}
	}

	if (currentPreference === "system") {
		systemThemeListener = (_) => {
			applyTheme("system");
		};

		try {
			mediaQuery.addEventListener("change", systemThemeListener);
		} catch (e) {
			try {
				(mediaQuery as any).addListener(systemThemeListener);
			} catch (e2) { }
		}
	} else {
		systemThemeListener = null;
	}
};

export const loadRpcPreference = async (): Promise<boolean> => {
	try {
		const enabled = await store.get<boolean>(DISCORD_RPC_ENABLED_KEY);
		return enabled ?? true;
	} catch (error) {
		console.error("Failed to load RPC preference, defaulting to true.", error);
		return true;
	}
};

export const saveRpcPreference = async (enabled: boolean) => {
	try {
		await store.set(DISCORD_RPC_ENABLED_KEY, enabled);
		await store.save();
	} catch (error) {
		console.error("Failed to save RPC preference.", error);
	}
};
