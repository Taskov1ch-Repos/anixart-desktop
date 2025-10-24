import { LazyStore } from "@tauri-apps/plugin-store";

const isTauri = !!(window as any).__TAURI__;

export type Theme = "system" | "light" | "dark";
const THEME_KEY = "appTheme";

const APP_ZOOM_KEY = "appZoom";

let tauriStore: LazyStore | null = null;

const getTauriStore = (): LazyStore | null => {
	if (!isTauri) {
		return null;
	}
	if (tauriStore === null) {
		try {
			tauriStore = new LazyStore("settings.json");
		} catch (e) {
			console.error("Failed to initialize Tauri Store:", e);
			return null;
		}
	}
	return tauriStore;
};

export const loadAppZoom = async (): Promise<number> => {
	let zoomLevel: number | undefined = undefined;
	try {
		if (isTauri) {
			const store = getTauriStore();
			zoomLevel = await store?.get<number>(APP_ZOOM_KEY);
		} else {
			const zoomStr = localStorage.getItem(APP_ZOOM_KEY);
			if (zoomStr) { zoomLevel = parseInt(zoomStr, 10); }
		}
	} catch (error) {
		console.error("Failed to load zoom settings, using default.", error);
	}
	return zoomLevel || 100;
};

export const applyAppZoom = (zoomLevel: number) => {
	document.documentElement.style.fontSize = `${zoomLevel}%`;
};

export const saveAppZoom = async (zoomLevel: number) => {
	try {
		if (isTauri) {
			const store = getTauriStore();
			if (store) {
				await store.set(APP_ZOOM_KEY, zoomLevel);
				await store.save();
			} else { console.error("Tauri store is not available to save zoom."); }
		} else {
			localStorage.setItem(APP_ZOOM_KEY, zoomLevel.toString());
		}
	} catch (error) {
		console.error("Failed to save zoom settings.", error);
	}
};

export const loadThemePreference = async (): Promise<Theme> => {
	let theme: Theme | undefined | null = undefined;

	try {
		if (isTauri) {
			const store = getTauriStore();
			theme = await store?.get<Theme>(THEME_KEY);
		} else {
			theme = localStorage.getItem(THEME_KEY) as Theme | null;
		}
	} catch (error) {
		console.error("Failed to load theme preference, using default.", error);
	}

	return theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
};

export const saveThemePreference = async (theme: Theme) => {
	try {
		if (isTauri) {
			const store = getTauriStore();
			if (store) {
				await store.set(THEME_KEY, theme);
				await store.save();
			} else { console.error("Tauri store is not available to save theme."); }
		} else {
			localStorage.setItem(THEME_KEY, theme);
		}
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

	if (systemThemeListener && mediaQuery.removeEventListener) {
		try { mediaQuery.removeEventListener("change", systemThemeListener); } catch (e) { }
	} else if (systemThemeListener && (mediaQuery as any).removeListener) {
		try { (mediaQuery as any).removeListener(systemThemeListener); } catch (e) { }
	}


	if (currentPreference === "system") {
		systemThemeListener = (_) => {
			applyTheme("system");
		};

		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", systemThemeListener);
		} else if ((mediaQuery as any).addListener) {
			(mediaQuery as any).addListener(systemThemeListener);
		}

	} else {
		systemThemeListener = null;
	}
};