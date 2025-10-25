import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pingServer } from "../../utils/pingServer";
import { updateAnixartClient, getAnixartClient } from "../../client";
import { Anixart } from "anixartjs";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./InitScreen.css";

type InitStatus = "finding_endpoint" | "pinging" | "error" | "success";

const ANIXART_STATUS = "https://anixart-app.com/status";

export const InitScreen: React.FC = () => {
	const [status, setStatus] = useState<InitStatus>("finding_endpoint");
	const [message, setMessage] = useState("Поиск доступного сервера...");
	const navigate = useNavigate();
	const location = useLocation();

	const isErrorState = location.state?.isNetworkError === true;
	const previousPath = location.state?.from || "/home";

	const findAndSetEndpoint = async () => {
		setStatus("finding_endpoint");
		setMessage("Получение списка серверов...");
		try {
			const endpoints = await Anixart.getEndpointUrls();
			const urlsToTry = Object.values(endpoints)
				.map(e => e.api_url)
				.concat(getAnixartClient().baseUrl.toString());

			const uniqueUrls = [...new Set(urlsToTry)];

			console.log("URLs to try:", uniqueUrls);
			setStatus("pinging");

			for (const url of uniqueUrls) {
				setMessage(`Проверка ${url}...`);
				const isOnline = await pingServer(url);

				if (isOnline) {
					setMessage(`Сервер ${url} доступен!`);
					updateAnixartClient(url);
					setStatus("success");
					setTimeout(() => navigate(previousPath, { replace: true, state: {} }), 500);
					return;
				}
				setMessage(`Сервер ${url} недоступен.`);
			}

			setMessage("Не удалось подключиться ни к одному серверу.");
			setStatus("error");

		} catch (error) {
			console.error("Failed to get endpoint URLs or ping servers:", error);
			setMessage("Ошибка при получении списка серверов.");
			setStatus("error");
		}
	};

	const handleRetry = useCallback(() => {
		if (!isErrorState) {
			findAndSetEndpoint();
		} else {
			navigate(previousPath, { replace: true, state: {} });
		}
	}, [navigate, previousPath, isErrorState]);

	const openStatusPage = useCallback(() => {
		openUrl(ANIXART_STATUS).catch(err => console.error("Failed to open status URL:", err));
	}, []);

	useEffect(() => {
		if (isErrorState) {
			setStatus("error");
			setMessage("Не удалось связаться с сервером");
		} else {
			setTimeout(findAndSetEndpoint, 100);
		}
	}, [isErrorState]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (status !== "error") return;

			if (event.code === "Space") {
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					openStatusPage();
				} else if (!event.shiftKey && !event.altKey) {
					event.preventDefault();
					handleRetry();
				}
			}
		};

		if (status === 'error') {
			window.addEventListener("keydown", handleKeyDown);
		}

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [status, handleRetry, openStatusPage]);

	return (
		<motion.div
			className={`route-wrapper init-screen-wrapper ${status === "error" ? "is-retryable" : ""}`}
			initial={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.5 }}
			onClick={status === 'error' ? handleRetry : undefined}
		>
			<div className="splash-bg"></div> { }

			<motion.div
				className="splash-content"
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.7, ease: "easeOut" }}
			>
				<div className="logo init-logo"></div> {/* */}
				<h1 className="logo-title">Anixart Desktop</h1> {/* */}

				<AnimatePresence mode="wait">
					{(status === "finding_endpoint" || status === "pinging") && (
						<motion.div
							key="loading"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="status-indicator"
						>
							<div className="spinner"></div> {/* */}
							<span>{message}</span>
						</motion.div>
					)}

					{status === "error" && (
						<motion.div
							key="error"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className="status-indicator error"
						>
							<p>{message}</p>
							<motion.span
								className="retry-prompt"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5 }}
							>
								Нажмите [Пробел] или кликните для повтора
							</motion.span>
							<motion.span
								className="retry-prompt"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.7 }}
								style={{ marginTop: '0.5rem' }}
							>
								Нажмите [CTRL + Пробел] чтобы посмотреть состояние серверов
							</motion.span>
						</motion.div>
					)}
					{status === "success" && (
						<motion.div
							key="success"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="status-indicator"
						>
							<span>{message}</span>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</motion.div>
	);
};
