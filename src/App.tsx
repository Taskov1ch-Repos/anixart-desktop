import React from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { InitScreen } from "./routes/InitScreen";
import { Home } from "./routes/Home";
import { AnimatePresence } from "framer-motion";
import "./App.css"

const AppRoutes = () => {
	const element = useRoutes([
		{ path: "/", element: <InitScreen /> },
		{ path: "/home", element: <Home /> },
	]);

	const location = useLocation();

	return (
		<AnimatePresence mode="wait">
			{React.cloneElement(element as React.ReactElement, { key: location.pathname })}
		</AnimatePresence>
	);
};

export const App: React.FC = () => {
	return <AppRoutes />;
};