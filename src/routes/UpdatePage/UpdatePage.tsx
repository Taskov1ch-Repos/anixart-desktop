import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ReleaseInfo, checkForUpdates, getCurrentVersion } from "../../utils/updateChecker";
import { openUrl } from "@tauri-apps/plugin-opener";
import ReactMarkdown from "react-markdown";
import "./UpdatePage.css";

export const UpdatePage: React.FC = () => {
	const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const currentVersion = getCurrentVersion();

	useEffect(() => {
		const check = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const { updateAvailable, latestRelease: releaseData } = await checkForUpdates();
				if (updateAvailable && releaseData) {
					setLatestRelease(releaseData);
				}
			} catch (err) {
				setError("Не удалось проверить обновления.");
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		};
		check();
	}, []);

	const handleUpdateClick = () => {
		if (latestRelease?.url) {
			openUrl(latestRelease.url).catch(err => {
				console.error("Failed to openUrl URL:", err);
				setError("Не удалось открыть ссылку на обновление.");
			});
		}
	};

	return (
		<motion.div
			className="route-wrapper page-content"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<div className="update-page">
				<h1 className="update-title">Обновление приложения</h1>

				<div className="version-info">
					<p>Текущая версия: <span>v{currentVersion}</span></p>
					{isLoading && <p>Проверка обновлений...</p>}
					{error && <p className="error-message">{error}</p>}
					{!isLoading && !error && latestRelease && (
						<p>Доступна новая версия: <span className="new-version"> {latestRelease.version}</span></p>
					)}
					{!isLoading && !error && !latestRelease && (
						<p>У вас установлена последняя версия.</p>
					)}
				</div>

				{latestRelease && (
					<div className="release-details">
						<h2>{latestRelease.name}</h2>
						<div className="release-notes">
							<ReactMarkdown>{latestRelease.notes}</ReactMarkdown>
						</div>
						<button className="update-button" onClick={handleUpdateClick}>
							Перейти к загрузке
						</button>
					</div>
				)}
			</div>
		</motion.div>
	);
};