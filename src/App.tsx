import React, { useState, useEffect } from "react";
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
import { UpdatePage } from "./routes/UpdatePage/UpdatePage";
import { checkForUpdates } from "./utils/updateChecker";
import { About } from "./routes/About/About";
import "./App.css";

const AppRoutes: React.FC = () => {
	const location = useLocation();
	const [updateAvailable, setUpdateAvailable] = useState(false);

	const isInitScreen = location.pathname === "/";

	useEffect(() => {
		const checkUpdates = async () => {
			try {
				const { updateAvailable: isAvailable } = await checkForUpdates();
				setUpdateAvailable(isAvailable);
			} catch (error) {
				console.error("Error checking for updates in App:", error);
				setUpdateAvailable(false);
			}
		};

		if (!isInitScreen) {
			checkUpdates();
		} else {
			setUpdateAvailable(false);
		}
	}, [isInitScreen, location.pathname]);

	const element = useRoutes([
		{ path: "/", element: <InitScreen /> },
		{ path: "/home", element: <Home /> },
		{ path: "/discover", element: <Discover /> },
		{ path: "/bookmarks", element: <Bookmarks /> },
		{ path: "/feed", element: <Feed /> },
		{ path: "/profile", element: <Profile /> },
		{ path: "/settings", element: <Settings /> },
		{ path: "/update", element: <UpdatePage /> },
		{ path: "/about", element: <About /> }
		// TODO: Добавить роут "*" для 404
	]);

	return (
		<>
			{!isInitScreen && <Navbar updateAvailable={updateAvailable} />}

			<AnimatePresence mode="wait">
				{element ? React.cloneElement(element as React.ReactElement, { key: location.pathname }) : null}
			</AnimatePresence>
		</>
	);
};

export const App: React.FC = () => {
	return <AppRoutes />;
};