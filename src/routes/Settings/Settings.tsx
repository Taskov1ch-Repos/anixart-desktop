import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { relaunch } from "@tauri-apps/plugin-process";
import {
	applyAppZoom,
	saveAppZoom,
	Theme,
	loadThemePreference,
	saveThemePreference,
	applyTheme,
	listenToSystemThemeChanges,
	loadRpcPreference,
	saveRpcPreference,
	loadAppZoom
} from "../../utils/settingsStore";
import "./Settings.css";

export const Settings: React.FC = () => {
	const [isLoadingSettings, setIsLoadingSettings] = useState(true);
	const [scale, setScale] = useState<number | null>(null);
	const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
	const [isRpcEnabled, setIsRpcEnabled] = useState<boolean | null>(null);
	const [showRestartPrompt, setShowRestartPrompt] = useState<boolean>(false);
	const [initialRpcState, setInitialRpcState] = useState<boolean | null>(null);

	useEffect(() => {
		const loadSettings = async () => {
			try {
				const [savedZoom, savedTheme, savedRpcPref] = await Promise.all([
					loadAppZoom(),
					loadThemePreference(),
					loadRpcPreference()
				]);

				setScale(savedZoom);
				applyAppZoom(savedZoom);
				setCurrentTheme(savedTheme);
				applyTheme(savedTheme);
				listenToSystemThemeChanges(savedTheme);
				setIsRpcEnabled(savedRpcPref);
				setInitialRpcState(savedRpcPref);

			} catch (error) {
				console.error("Failed to load settings:", error);
				setScale(100);
				setCurrentTheme("system");
				setIsRpcEnabled(true);
				setInitialRpcState(true);
				applyAppZoom(100);
				applyTheme("system");
				listenToSystemThemeChanges("system");
			} finally {
				setIsLoadingSettings(false);
			}
		};

		loadSettings();
	}, []);

	const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newScale = parseInt(event.target.value, 10);
		setScale(newScale);
		applyAppZoom(newScale);
	};

	const handleScaleCommit = () => {
		if (scale !== null) {
			saveAppZoom(scale);
		}
	};

	const handleThemeButtonClick = (newTheme: Theme) => {
		if (newTheme !== currentTheme) {
			setCurrentTheme(newTheme);
			applyTheme(newTheme);
			saveThemePreference(newTheme);
			listenToSystemThemeChanges(newTheme);
		}
	};

	const handleRpcToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newRpcState = event.target.checked;
		setIsRpcEnabled(newRpcState);
		saveRpcPreference(newRpcState);

		if (newRpcState !== initialRpcState) {
			setShowRestartPrompt(true);
		} else {
			setShowRestartPrompt(false);
		}
	};

	const handleRestart = async () => {
		try {
			await relaunch();
		} catch (error) {
			console.error("Failed to restart application:", error);
			alert("Не удалось перезапустить приложение. Пожалуйста, сделайте это вручную.");
		}
	};

	if (isLoadingSettings) {
		return (
			<motion.div
				className="route-wrapper page-content loading-centered"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
			>
				<div className="spinner"></div>
				<p>Загрузка настроек...</p>
			</motion.div>
		);
	}

	return (
		<>
			<motion.div
				className="route-wrapper page-content"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
			>
				<div className="settings-page">
					<h1 className="settings-title">Настройки</h1>

					<section className="settings-section">
						<h2 className="section-title">Внешний вид</h2>
						<div className="setting-item">
							<div className="setting-info">
								<label htmlFor="scale-slider">Масштаб интерфейса</label>
								<p>Изменяет размер всего приложения.</p>
							</div>
							<div className="setting-control">
								<span className="scale-value">{scale ?? 100}%</span>
								<input
									type="range"
									id="scale-slider"
									className="slider"
									min="75" max="150" step="5"
									value={scale ?? 100}
									onChange={handleScaleChange}
									onMouseUp={handleScaleCommit}
									onTouchEnd={handleScaleCommit}
									disabled={scale === null}
								/>
							</div>
						</div>
						<div className="setting-item">
							<div className="setting-info">
								<label>Тема оформления</label>
								<p>Выберите светлую, темную или системную тему.</p>
							</div>
							<div className="setting-control theme-buttons">
								<button
									className={`theme-button ${(currentTheme ?? "system") === "system" ? "active" : ""}`}
									onClick={() => handleThemeButtonClick("system")}
									disabled={currentTheme === null}
								>
									Системная
								</button>
								<button
									className={`theme-button ${(currentTheme ?? "system") === "light" ? "active" : ""}`}
									onClick={() => handleThemeButtonClick("light")}
									disabled={currentTheme === null}
								>
									Светлая
								</button>
								<button
									className={`theme-button ${(currentTheme ?? "system") === "dark" ? "active" : ""}`}
									onClick={() => handleThemeButtonClick("dark")}
									disabled={currentTheme === null}
								>
									Темная
								</button>
							</div>
						</div>
					</section>

					<section className="settings-section">
						<h2 className="section-title">Интеграции</h2>
						<div className="setting-item">
							<div className="setting-info">
								<label htmlFor="rpc-toggle">Discord Rich Presence</label>
								<p>Показывать вашу активность в Discord. Изменения вступят в силу после перезапуска.</p>
							</div>
							<div className="setting-control toggle-control">
								<label className="switch">
									<input
										type="checkbox"
										id="rpc-toggle"
										checked={isRpcEnabled ?? true}
										onChange={handleRpcToggleChange}
										disabled={isRpcEnabled === null}
									/>
									<span className="slider round"></span>
								</label>
							</div>
						</div>
					</section>
				</div>
			</motion.div>

			<AnimatePresence>
				{showRestartPrompt && (
					<motion.div
						className="restart-prompt-container"
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 50 }}
						transition={{ type: "spring", stiffness: 200, damping: 25 }}
					>
						<div className="restart-prompt">
							<p>Некоторые настройки требуют перезапуска приложения.</p>
							<button onClick={handleRestart} className="restart-button">
								Перезапустить
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};