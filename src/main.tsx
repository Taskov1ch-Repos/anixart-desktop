import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DevAddressBar } from "./components/DevAddressBar/DevAddressBar";
import "./index.css";

import {
	loadAppZoom,
	applyAppZoom,
	loadThemePreference,
	applyTheme,
	listenToSystemThemeChanges
} from "./utils/settingsStore";
import { TitleBar } from "./components/TitleBar/TitleBar";

const startApp = async () => {
	const zoom = await loadAppZoom();
	applyAppZoom(zoom);

	const themePreference = await loadThemePreference();
	applyTheme(themePreference);
	listenToSystemThemeChanges(themePreference);

	const isDevelopment = import.meta.env.DEV;

	ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
		<React.StrictMode>
			<BrowserRouter>
				<div className="app-container">
					<TitleBar />
					<div className="main-content">
						{isDevelopment && <DevAddressBar />}
						<App />
					</div>
				</div>
			</BrowserRouter>
		</React.StrictMode >
	);
};

window.addEventListener("DOMContentLoaded", () => {
	startApp();
});