import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { RPCProvider } from "./contexts/RPCContext";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<BrowserRouter>
			<RPCProvider>
				<App />
			</RPCProvider>
		</BrowserRouter>
	</React.StrictMode>
);