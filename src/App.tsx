import React, { useState, useEffect } from "react";
import { useRoutes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Navbar } from "./components/Navbar/Navbar";
import { InitScreen } from "./routes/InitScreen/InitScreen";
import { Home } from "./routes/Home/Home";
import { Discover } from "./routes/Discover/Discover";
import { Bookmarks } from "./routes/Bookmarks/Bookmarks";
import { Feed } from "./routes/Feed/Feed";
import { Profile } from "./routes/Profile/Profile";
import { UserProfilePage } from "./routes/Profile/UserProfile";
import { Settings } from "./routes/Settings/Settings";
import { UpdatePage } from "./routes/UpdatePage/UpdatePage";
import { checkForUpdates } from "./utils/updateChecker";
import { About } from "./routes/About/About";
import { useAuth } from "./hooks/useAuth";
import "./App.css";
import { applyAppZoom, applyTheme, listenToSystemThemeChanges, loadAppZoom, loadThemePreference } from "./utils/settingsStore";

const AppRoutes: React.FC = () => {
	const location = useLocation();
	const [updateAvailable, setUpdateAvailable] = useState(false);
	const { isLoading: isAuthLoading } = useAuth();

	const isInitScreen = location.pathname === "/";

	useEffect(() => {
		const checkUpdates = async () => {
			if (isInitScreen || isAuthLoading) {
				setUpdateAvailable(false);
				return;
			}
			try {
				const { updateAvailable: isAvailable } = await checkForUpdates();
				setUpdateAvailable(isAvailable);
			} catch (error) {
				console.error("Error checking for updates in App:", error);
				setUpdateAvailable(false);
			}
		};

		checkUpdates();
	}, [isInitScreen, location.pathname, isAuthLoading]);

	const element = useRoutes([
		{ path: "/", element: <InitScreen /> },
		{ path: "/home", element: <Home /> },
		{ path: "/discover", element: <Discover /> },
		{ path: "/bookmarks", element: <Bookmarks /> },
		{ path: "/feed", element: <Feed /> },
		{ path: "/profile", element: <Profile /> },
		{ path: "/profile/:id", element: <UserProfilePage /> },
		{ path: "/settings", element: <Settings /> },
		{ path: "/update", element: <UpdatePage /> },
		{ path: "/about", element: <About /> },
		{ path: "*", element: <Navigate to="/home" replace /> }
	]);

	const showNavbar = !isInitScreen && !isAuthLoading;

	return (
		<>
			{showNavbar && <Navbar updateAvailable={updateAvailable} />}
			<AnimatePresence mode="wait">
				{element ? React.cloneElement(element as React.ReactElement, { key: location.pathname }) : null}
			</AnimatePresence>
		</>
	);
};

export const App: React.FC = () => {
	useEffect(() => {
		const initializeSettings = async () => {
			try {
				const savedZoom = await loadAppZoom();
				applyAppZoom(savedZoom);
				console.log(`Initial zoom applied: ${savedZoom}%`);

				const savedTheme = await loadThemePreference();
				applyTheme(savedTheme);
				listenToSystemThemeChanges(savedTheme);
				console.log(`Initial theme applied: ${savedTheme}`);

			} catch (error) {
				console.error("Failed to initialize settings:", error);
				applyAppZoom(100);
				applyTheme("system");
				listenToSystemThemeChanges("system");
			}
		};

		initializeSettings();

	}, []);

	return <AppRoutes />;
};