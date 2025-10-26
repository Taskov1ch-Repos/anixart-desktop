import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
	applyAppZoom,
	saveAppZoom,
	Theme,
	loadThemePreference,
	saveThemePreference,
	applyTheme,
	listenToSystemThemeChanges,
	loadRpcPreference,
	saveRpcPreference
} from "../../utils/settingsStore";
import "./Settings.css";

const getInitialZoom = (): number => {
	const zoomStr = document.documentElement.style.fontSize;
	if (zoomStr) {
		const zoomNum = parseInt(zoomStr, 10);
		if (!isNaN(zoomNum)) return zoomNum;
	}
	return 100;
};

export const Settings: React.FC = () => {
	const [scale, setScale] = useState(getInitialZoom);
	const [currentTheme, setCurrentTheme] = useState<Theme>("system");
	const [isRpcEnabled, setIsRpcEnabled] = useState<boolean>(true);
	const [showRpcRestartWarning, setShowRpcRestartWarning] = useState<boolean>(false);

	useEffect(() => {
		loadThemePreference().then(savedTheme => {
			setCurrentTheme(savedTheme);
		});
		loadRpcPreference().then(savedRpcPref => {
			setIsRpcEnabled(savedRpcPref);
		});
	}, []);

	const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newScale = parseInt(event.target.value, 10);
		setScale(newScale);
		applyAppZoom(newScale);
	};

	const handleScaleCommit = () => {
		saveAppZoom(scale);
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
		setShowRpcRestartWarning(false);

		if (newRpcState) {
			console.log("Settings: RPC preference enabled. Restart required.");
			setShowRpcRestartWarning(true);
		} else {
			console.log("Settings: Disabling RPC");
			invoke("rpc_disconnect").catch(console.error);
		}
	};

	return (
		<motion.div
			className="route-wrapper page-content"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
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
							<span className="scale-value">{scale}%</span>
							<input
								type="range"
								id="scale-slider"
								className="slider"
								min="75" max="150" step="5"
								value={scale}
								onChange={handleScaleChange}
								onMouseUp={handleScaleCommit}
								onTouchEnd={handleScaleCommit}
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
								className={`theme-button ${currentTheme === "system" ? "active" : ""}`}
								onClick={() => handleThemeButtonClick("system")}
							>
								Системная
							</button>
							<button
								className={`theme-button ${currentTheme === "light" ? "active" : ""}`}
								onClick={() => handleThemeButtonClick("light")}
							>
								Светлая
							</button>
							<button
								className={`theme-button ${currentTheme === "dark" ? "active" : ""}`}
								onClick={() => handleThemeButtonClick("dark")}
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
							<p>Показывать вашу активность в Discord (если оно у вас установлено).</p>
							{showRpcRestartWarning && (
								<p className="setting-warning">
									⚠️ Требуется перезапуск приложения для активации Discord RPC.
								</p>
							)}
						</div>
						<div className="setting-control toggle-control">
							<label className="switch">
								<input
									type="checkbox"
									id="rpc-toggle"
									checked={isRpcEnabled}
									onChange={handleRpcToggleChange}
								/>
								<span className="slider round"></span>
							</label>
						</div>
					</div>
				</section>
			</div>
		</motion.div>
	);
};