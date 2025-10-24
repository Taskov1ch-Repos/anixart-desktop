import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pingServer } from "../../utils/pingServer";
import { updateAnixartClient, getAnixartClient } from "../../client";
import { Anixart } from "anixartjs";
import "./InitScreen.css";

type InitStatus = "finding_endpoint" | "pinging" | "error" | "success";

export const InitScreen: React.FC = () => {
	const [status, setStatus] = useState<InitStatus>("finding_endpoint");
	const [message, setMessage] = useState("Поиск доступного сервера...");
	const navigate = useNavigate();

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
					setTimeout(() => navigate("/home"), 500);
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

	useEffect(() => {
		setTimeout(findAndSetEndpoint, 100);
	}, []);

	const handleRetry = () => {
		if (status === "error") {
			findAndSetEndpoint();
		}
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (status === "error" && event.code === "Space") {
				event.preventDefault();
				handleRetry();
			}
		};

		if (status === "error") {
			window.addEventListener("keydown", handleKeyDown);
			window.addEventListener("click", handleRetry);
		}

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("click", handleRetry);
		};
	}, [status]);

	return (
		<motion.div
			className={`route-wrapper init-screen-wrapper ${status === "error" ? "is-retryable" : ""}`}
			initial={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.5 }}
		>
			<div className="splash-bg"></div>

			<motion.div
				className="splash-content"
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.7, ease: "easeOut" }}
			>
				<div className="logo init-logo"></div>
				<h1 className="logo-title">Anixart Desktop</h1>

				<AnimatePresence mode="wait">
					{(status === "finding_endpoint" || status === "pinging") && (
						<motion.div
							key="loading"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="status-indicator"
						>
							<div className="spinner"></div>
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