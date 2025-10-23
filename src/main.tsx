import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";

import { loadAppZoom, applyAppZoom } from "./utils/settingsStore";

const startApp = async () => {
	const zoom = await loadAppZoom();

	applyAppZoom(zoom);

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