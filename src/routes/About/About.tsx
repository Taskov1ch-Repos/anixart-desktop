import React from "react";
import { motion } from "framer-motion";
import { getCurrentVersion } from "../../utils/updateChecker";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FaQuestionCircle, FaBook, FaExclamationTriangle } from "react-icons/fa";
import "./About.css";

export const About: React.FC = () => {
	const currentVersion = getCurrentVersion();
	const developerUrl = "https://taskov1ch.github.io";
	const anixartUrl = "https://anixart-app.com";
	const tauriUrl = "https://tauri.app/";
	const reactUrl = "https://react.dev/";
	const typescriptUrl = "https://www.typescriptlang.org/";
	const viteUrl = "https://vitejs.dev/";
	const anixartjsUrl = "https://github.com/theDesConnet/AnixartJS";

	const faqUrl = "https://anixart-app.com/faq";
	const rulesUrl = "https://anixart-app.com/rules";
	const reportUrl = "https://github.com/Taskov1ch-Repos/anixart-desktop/issues/new";

	const handleLinkClick = (url: string) => {
		openUrl(url).catch(err => console.error("Failed to open URL:", err));
	};

	return (
		<motion.div
			className="route-wrapper page-content about-page-wrapper"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<div className="about-content">
				<div className="about-icon logo"></div>

				<h1 className="about-app-title">Anixart Desktop</h1>
				<p className="about-version">Версия {currentVersion}</p>

				<p className="about-description">
					Неофициальный десктопный клиент для{" "}
					<span className="link" onClick={() => handleLinkClick(anixartUrl)}>
						Anixart
					</span>
					.
				</p>

				<p className="about-developer">
					Разработано энтузиастом{" "}
					<span className="link" onClick={() => handleLinkClick(developerUrl)}>
						Taskov1ch
					</span>
					.
				</p>

				<div className="about-disclaimer">
					<p>
						Разработчик не имеет отношения к <strong>SwiftSoft Team</strong>. Все права на бренд Anixart принадлежат их владельцам.
					</p>
				</div>

				<p className="about-tech">
					Сделано с помощью{" "}
					<span className="link" onClick={() => handleLinkClick(tauriUrl)}>Tauri</span>,{" "}
					<span className="link" onClick={() => handleLinkClick(reactUrl)}>React</span>,{" "}
					<span className="link" onClick={() => handleLinkClick(typescriptUrl)}>TypeScript</span>,{" "}
					<span className="link" onClick={() => handleLinkClick(viteUrl)}>Vite</span>,{" "}
					<span className="link" onClick={() => handleLinkClick(anixartjsUrl)}>AnixartJS</span>.
				</p>

				<div className="about-links">
					<div className="about-link-item" onClick={() => handleLinkClick(faqUrl)}>
						<FaQuestionCircle size="1.5rem" />
						<span className="about-tooltip">ЧаВО</span>
					</div>

					<div className="about-link-item" onClick={() => handleLinkClick(rulesUrl)}>
						<FaBook size="1.5rem" />
						<span className="about-tooltip">Правила сообщества</span>
					</div>

					<div className="about-link-item" onClick={() => handleLinkClick(reportUrl)}>
						<FaExclamationTriangle size="1.5rem" />
						<span className="about-tooltip">Сообщить о проблеме</span>
					</div>
				</div>

			</div>
		</motion.div>
	);
};