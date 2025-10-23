import { LazyStore } from "@tauri-apps/plugin-store";

const isTauri = !!(window as any).__TAURI__;

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
			zoomLevel = await store?.get<number>("appZoom");
		} else {
			const zoomStr = localStorage.getItem("appZoom");
			if (zoomStr) {
				zoomLevel = parseInt(zoomStr, 10);
			}
		}
	} catch (error) {
		console.error("Failed to load settings, using default.", error);
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
				await store.set("appZoom", zoomLevel);
				await store.save();
			} else {
				console.error("Tauri store is not available to save settings.");
			}
		} else {
			localStorage.setItem("appZoom", zoomLevel.toString());
		}
	} catch (error) {
		console.error("Failed to save settings.", error);
	}
};