import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pingServer } from "../../utils/pingServer";
import logo from "../../assets/logo.svg";
import "./InitScreen.css";

type InitStatus = "pinging" | "error" | "success";

export const InitScreen: React.FC = () => {
	const [status, setStatus] = useState<InitStatus>("pinging");
	const navigate = useNavigate();

	const handlePing = async () => {
		setStatus("pinging");
		const isOnline = await pingServer();

		if (isOnline) {
			setStatus("success");
			setTimeout(() => navigate("/home"), 500);
		} else {
			setStatus("error");
		}
	};

	useEffect(() => {
		setTimeout(handlePing, 100);
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (status === "error" && event.code === "Space") {
				event.preventDefault();
				handlePing();
			}
		};

		const handleClick = () => {
			if (status === "error") {
				handlePing();
			}
		};

		if (status === "error") {
			window.addEventListener("keydown", handleKeyDown);
			window.addEventListener("click", handleClick);
		}

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("click", handleClick);
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
				<img src={logo} alt="Anixart Desktop Logo" className="logo" />
				<h1 className="logo-title">Anixart Desktop</h1>

				<AnimatePresence mode="wait">
					{status === "pinging" && (
						<motion.div
							key="pinging"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="status-indicator"
						>
							<div className="spinner"></div>
							<span>Проверка серверов...</span>
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
							<p>Не удается подключиться к серверам</p>
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
				</AnimatePresence>
			</motion.div>
		</motion.div>
	);
};