import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";

import {
	loadAppZoom,
	applyAppZoom,
	loadThemePreference,
	applyTheme,
	listenToSystemThemeChanges
} from "./utils/settingsStore";

const startApp = async () => {
	const zoom = await loadAppZoom();
	applyAppZoom(zoom);

	const themePreference = await loadThemePreference();
	applyTheme(themePreference);
	listenToSystemThemeChanges(themePreference);

	ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
		<React.StrictMode>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</React.StrictMode>
	);
};

window.addEventListener("DOMContentLoaded", () => {
	startApp();
});