import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./DevAddressBar.css";

export const DevAddressBar: React.FC = () => {
	const [isVisible, setIsVisible] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const location = useLocation();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleShow = useCallback(() => {
		setInputValue(location.pathname);
		setIsVisible(true);
	}, [location.pathname]);

	const handleHide = useCallback(() => {
		setIsVisible(false);
	}, []);

	const handleGlobalKeyDown = useCallback((event: KeyboardEvent) => {
		if (event.key === "F10") {
			event.preventDefault();
			if (isVisible && inputRef.current) {
				inputRef.current.select();
			} else {
				handleShow();
			}
		}
		else if (event.key === "Escape" && isVisible) {
			event.preventDefault();
			handleHide();
		}
	}, [handleShow, handleHide, isVisible]);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);
	};

	const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			const path = inputValue.trim();
			if (path) {
				navigate(path);
				handleHide();
			}
		}
	};

	useEffect(() => {
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [handleGlobalKeyDown]);

	useEffect(() => {
		if (isVisible && inputRef.current) {
			const timer = setTimeout(() => {
				inputRef.current?.select();
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [isVisible]);

	if (!isVisible) {
		return null;
	}

	return (
		<div className="dev-address-bar-container">
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleInputKeyDown}
				onBlur={handleHide}
				placeholder="Введите путь и нажмите Enter (Esc для отмены)"
				className="dev-address-bar-input"
				spellCheck="false"
				autoFocus
			/>
		</div>
	);
};