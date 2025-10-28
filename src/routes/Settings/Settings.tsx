import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core"; // <--- Импортируем invoke
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

// Функция для форматирования размера
const formatBytes = (bytes: number, decimals = 2): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


export const Settings: React.FC = () => {
	const [isLoadingSettings, setIsLoadingSettings] = useState(true);
	const [scale, setScale] = useState<number | null>(null);
	const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
	const [isRpcEnabled, setIsRpcEnabled] = useState<boolean | null>(null);
	const [showRestartPrompt, setShowRestartPrompt] = useState<boolean>(false);
	const [initialRpcState, setInitialRpcState] = useState<boolean | null>(null);

	// Новые состояния для кеша
	const [cacheSize, setCacheSize] = useState<number>(0);
	const [isLoadingCacheSize, setIsLoadingCacheSize] = useState<boolean>(true);
	const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
	const [showClearCacheConfirm, setShowClearCacheConfirm] = useState<boolean>(false);
	const [clearCacheError, setClearCacheError] = useState<string | null>(null);

	const fetchCacheSize = useCallback(async () => {
		setIsLoadingCacheSize(true);
		try {
			const size = await invoke<number>("get_cache_size");
			setCacheSize(size);
		} catch (error) {
			console.error("Failed to get cache size:", error);
			setCacheSize(0); // Или можно установить -1 для индикации ошибки
		} finally {
			setIsLoadingCacheSize(false);
		}
	}, []);


	useEffect(() => {
		const loadSettings = async () => {
			setIsLoadingSettings(true); // Убедимся, что загрузка началась
			try {
				const [savedZoom, savedTheme, savedRpcPref, initialCacheSize] = await Promise.all([
					loadAppZoom(),
					loadThemePreference(),
					loadRpcPreference(),
					invoke<number>("get_cache_size") // Загружаем размер кеша сразу
				]);

				setScale(savedZoom);
				applyAppZoom(savedZoom);
				setCurrentTheme(savedTheme);
				applyTheme(savedTheme);
				listenToSystemThemeChanges(savedTheme);
				setIsRpcEnabled(savedRpcPref);
				setInitialRpcState(savedRpcPref);
				setCacheSize(initialCacheSize); // Устанавливаем размер кеша

			} catch (error) {
				console.error("Failed to load settings:", error);
				// Устанавливаем значения по умолчанию при ошибке
				setScale(100);
				setCurrentTheme("system");
				setIsRpcEnabled(true);
				setInitialRpcState(true);
				setCacheSize(0);
				applyAppZoom(100);
				applyTheme("system");
				listenToSystemThemeChanges("system");
			} finally {
				setIsLoadingSettings(false); // Загрузка завершена
				setIsLoadingCacheSize(false); // Загрузка размера кеша тоже завершена
			}
		};

		loadSettings();
	}, []); // Пустой массив зависимостей, чтобы выполнилось один раз при монтировании


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

	// Обработчики для очистки кеша
	const handleClearCacheClick = () => {
		setClearCacheError(null); // Сбрасываем ошибку перед открытием
		setShowClearCacheConfirm(true);
	};

	const handleConfirmClearCache = async () => {
		setIsClearingCache(true);
		setClearCacheError(null);
		try {
			await invoke("clear_media_cache");
			await fetchCacheSize(); // Обновляем размер кеша после очистки
		} catch (error: any) {
			console.error("Failed to clear cache:", error);
			setClearCacheError(typeof error === 'string' ? error : "Произошла ошибка при очистке кеша.");
		} finally {
			setIsClearingCache(false);
			setShowClearCacheConfirm(false); // Закрываем модальное окно в любом случае
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

					{/* Секция Внешний вид */}
					<section className="settings-section">
						<h2 className="section-title">Внешний вид</h2>
						{/* ... (Масштаб интерфейса и Тема оформления как были) */}
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

					{/* Секция Интеграции */}
					<section className="settings-section">
						<h2 className="section-title">Интеграции</h2>
						{/* ... (Discord Rich Presence как был) */}
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

					{/* Новая Секция Кеш */}
					<section className="settings-section">
						<h2 className="section-title">Кеш приложения</h2>
						<div className="setting-item">
							<div className="setting-info">
								<label>Медиа кеш</label>
								{isLoadingCacheSize ? (
									<p>Подсчет размера кеша...</p>
								) : (
									<p>Сейчас в кеше <strong>{formatBytes(cacheSize)}</strong> различных медиа файлов (обложки, аватары и т.д.).</p>
								)}
								{clearCacheError && <p className="setting-error">{clearCacheError}</p>}
							</div>
							<div className="setting-control cache-control">
								<button
									className="clear-cache-button"
									onClick={handleClearCacheClick}
									disabled={isLoadingCacheSize || isClearingCache || cacheSize === 0}
								>
									{isClearingCache ? "Очистка..." : "Очистить кеш"}
								</button>
							</div>
						</div>
					</section>
				</div>
			</motion.div>

			{/* Модальное окно подтверждения очистки кеша */}
			<AnimatePresence>
				{showClearCacheConfirm && (
					<motion.div
						className="confirm-modal-overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setShowClearCacheConfirm(false)}
					>
						<motion.div
							className="confirm-modal-content"
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={e => e.stopPropagation()}
						>
							<h2>Подтверждение</h2>
							<p>Вы уверены, что хотите очистить кеш медиа файлов? Это действие необратимо.</p>
							<div className="confirm-modal-buttons">
								<button onClick={() => setShowClearCacheConfirm(false)} className="modal-button cancel">
									Отмена
								</button>
								<button onClick={handleConfirmClearCache} className="modal-button confirm danger" disabled={isClearingCache}>
									{isClearingCache ? "Очистка..." : "Очистить"}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>


			{/* Баннер перезапуска (как был) */}
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