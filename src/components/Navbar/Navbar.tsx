import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/logo.svg";

import {
	FaCompass,
	FaBookmark,
	FaRss,
	FaUser,
	FaCog,
	FaDownload,
} from "react-icons/fa";

interface NavbarProps {
	updateAvailable?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ updateAvailable = false }) => {
	const getNavLinkClass = ({ isActive }: { isActive: boolean }): string => {
		return isActive ? "nav-item active" : "nav-item";
	};

	return (
		<nav className="navbar">
			<div className="nav-group-top">
				<NavLink to="/home" className={getNavLinkClass}>
					<img src={logo} alt="Home" className="nav-logo-icon" />
					<span className="nav-tooltip">Главный</span>
				</NavLink>

				<NavLink to="/discover" className={getNavLinkClass}>
					<FaCompass size="1.5rem" />
					<span className="nav-tooltip">Обзор</span>
				</NavLink>

				<NavLink to="/bookmarks" className={getNavLinkClass}>
					<FaBookmark size="1.375rem" />
					<span className="nav-tooltip">Закладки</span>
				</NavLink>

				<NavLink to="/feed" className={getNavLinkClass}>
					<FaRss size="1.375rem" />
					<span className="nav-tooltip">Лента</span>
				</NavLink>

				<NavLink to="/profile" className={getNavLinkClass}>
					<FaUser size="1.375rem" />
					<span className="nav-tooltip">Профиль</span>
				</NavLink>
			</div>

			<div className="nav-group-bottom">
				<NavLink to="/update" className={getNavLinkClass}>
					<FaDownload size="1.5rem" />
					{updateAvailable && <span className="update-indicator"></span>}
					<span className="nav-tooltip">Обновление</span>
				</NavLink>

				<NavLink to="/settings" className={getNavLinkClass}>
					<FaCog size="1.5rem" />
					<span className="nav-tooltip">Настройки</span>
				</NavLink>
			</div>
		</nav>
	);
};