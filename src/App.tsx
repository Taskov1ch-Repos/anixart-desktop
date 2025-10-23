import React from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Navbar } from "./components/Navbar/Navbar";
import { InitScreen } from "./routes/InitScreen/InitScreen";
import { Home } from "./routes/Home/Home";
import { Discover } from "./routes/Discover/Discover";
import { Bookmarks } from "./routes/Bookmarks/Bookmarks";
import { Feed } from "./routes/Feed/Feed";
import { Profile } from "./routes/Profile/Profile";
import { Settings } from "./routes/Settings/Settings";
import "./App.css"

const AppRoutes = () => {
	const location = useLocation();

	const isInitScreen = location.pathname === "/";

	const element = useRoutes([
		{ path: "/", element: <InitScreen /> },
		{ path: "/home", element: <Home /> },
		{ path: "/discover", element: <Discover /> },
		{ path: "/bookmarks", element: <Bookmarks /> },
		{ path: "/feed", element: <Feed /> },
		{ path: "/profile", element: <Profile /> },
		{ path: "/settings", element: <Settings /> },
		// TODO: Добавить роут "*" для 404
	]);

	return (
		<>
			{!isInitScreen && <Navbar />}

			<AnimatePresence mode="wait">
				{React.cloneElement(element as React.ReactElement, {
					key: location.pathname,
				})}
			</AnimatePresence>
		</>
	);
};

export const App: React.FC = () => {
	return <AppRoutes />;
};