import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./TitleBar.css";
import { BiSquare, BiX, BiMinus } from "react-icons/bi";

const appWindow = getCurrentWindow();

export const TitleBar: React.FC = () => {
	const handleMinimize = () => appWindow.minimize();
	const handleToggleMaximize = () => appWindow.toggleMaximize();
	const handleClose = () => appWindow.close();

	return (
		<div className="titlebar" data-tauri-drag-region>
			<div className="titlebar-title">Anixart Desktop</div>
			<div className="titlebar-controls">
				<button className="titlebar-button" id="titlebar-minimize" onClick={handleMinimize}>
					<BiMinus size={20} />
				</button>
				<button className="titlebar-button" id="titlebar-maximize" onClick={handleToggleMaximize}>
					<BiSquare size={15} />
				</button>
				<button className="titlebar-button" id="titlebar-close" onClick={handleClose}>
					<BiX size={20} />
				</button>
			</div>
		</div>
	);
};