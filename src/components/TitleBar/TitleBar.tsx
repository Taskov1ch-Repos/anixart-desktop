import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './TitleBar.css';

// Вы можете использовать иконки (например, из lucide-react)
// import { X, Minimize, Square } from 'lucide-react';

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
					{/* <Minimize size={14} /> */}
					&#x2014; {/* (—) Em dash */}
				</button>
				<button className="titlebar-button" id="titlebar-maximize" onClick={handleToggleMaximize}>
					{/* <Square size={14} /> */}
					&#x2610; {/* (☐) Ballot box */}
				</button>
				<button className="titlebar-button" id="titlebar-close" onClick={handleClose}>
					{/* <X size={14} /> */}
					&#x2715; {/* (✕) Multiplication X */}
				</button>
			</div>
		</div>
	);
};