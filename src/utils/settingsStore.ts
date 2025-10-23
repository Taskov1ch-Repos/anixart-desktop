import { Store } from "@tauri-apps/plugin-store";

const isTauri = !!(window as any).__TAURI__;

let tauriStore: Store | null = null;

const getTauriStore = (): Store | null => {
	if (tauriStore === null) {
		tauriStore = new Store("settings.dat");
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
			await store.set("appZoom", zoomLevel);
			await store.save();
		} else {
			localStorage.setItem("appZoom", zoomLevel.toString());
		}
	} catch (error) {
		console.error("Failed to save settings.", error);
	}
};