import React, { useState } from "react";
import { motion } from "framer-motion";
import { applyAppZoom, saveAppZoom } from "../../utils/settingsStore";
import "./Settings.css";

const getInitialZoom = (): number => {
	const zoomStr = document.documentElement.style.fontSize;

	if (zoomStr) {
		const zoomNum = parseInt(zoomStr, 10);
		if (!isNaN(zoomNum)) {
			return zoomNum;
		}
	}
	return 100;
};


export const Settings: React.FC = () => {
	const [scale, setScale] = useState(getInitialZoom);

	const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newScale = parseInt(event.target.value, 10);

		setScale(newScale);
		applyAppZoom(newScale);
	};

	const handleScaleCommit = () => {
		saveAppZoom(scale);
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
								min="75"
								max="150"
								step="5"
								value={scale}
								onChange={handleScaleChange}
								onMouseUp={handleScaleCommit}
								onTouchEnd={handleScaleCommit}
							/>
						</div>
					</div>
				</section>

			</div>
		</motion.div>
	);
};