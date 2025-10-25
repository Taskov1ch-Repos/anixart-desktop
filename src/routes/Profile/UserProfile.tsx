import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { getAnixartClient } from "../../client";
import { FullProfile } from "anixartjs/dist/classes/FullProfile";
import { BaseProfile } from "anixartjs/dist/classes/BaseProfile";
import { Player as LottiePlayer } from "@lottiefiles/react-lottie-player";
import { invoke } from "@tauri-apps/api/core";
import {
	FaVk, FaTelegramPlane, FaInstagram, FaTiktok, FaDiscord, FaCalendarAlt, FaClock, FaEye, FaHourglassHalf, FaShieldAlt
} from "react-icons/fa";
import { IoIosStats } from "react-icons/io";
import "./UserProfile.css";

// Функция форматирования времени последней активности
const formatLastActivity = (timestamp: number): string => {
	const now = Date.now();
	const lastActivityDate = new Date(timestamp * 1000);
	const diffSeconds = Math.floor((now - lastActivityDate.getTime()) / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMinutes < 5) {
		return "Недавно";
	} else if (diffMinutes < 60) {
		return `${diffMinutes} мин. назад`;
	} else if (diffHours < 24) {
		return `${diffHours} ч. назад`;
	} else if (diffDays < 7) {
		return `${diffDays} д. назад`;
	} else {
		const day = lastActivityDate.getDate().toString().padStart(2, "0");
		const month = (lastActivityDate.getMonth() + 1).toString().padStart(2, "0");
		const year = lastActivityDate.getFullYear();
		const hours = lastActivityDate.getHours().toString().padStart(2, "0");
		const minutes = lastActivityDate.getMinutes().toString().padStart(2, "0");
		return `был(а) ${day}.${month}.${year} в ${hours}:${minutes}`;
	}
};

// Функция для получения CSS-класса в зависимости от уровня доверия
const getPrivilegeLevelClass = (level: number): string => {
	if (level > 0) return "privilege-level-positive";
	if (level < 0) return "privilege-level-negative";
	return "privilege-level-neutral";
};

// Функция форматирования времени просмотра
const formatWatchedTime = (seconds: number): string => {
	if (isNaN(seconds) || seconds < 0) return "Н/Д";
	const days = Math.floor(seconds / (3600 * 24));
	const hours = Math.floor((seconds % (3600 * 24)) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	let result = "";
	if (days > 0) result += `${days} д `;
	if (hours > 0) result += `${hours} ч `;
	if (minutes > 0 || (days === 0 && hours === 0)) result += `${minutes} м`;
	return result.trim() || "0 м";
};

// Тип ответа от Rust команды fetch_badge_data
interface FetchResponse {
	content: string;
}

// Структура ошибки от Rust команды
interface FetchError {
	Network?: string;
	Other?: string;
}

// Компонент для отображения значка профиля (Lottie или изображение)
const ProfileBadge: React.FC<{ badgeUrl: string | null; badgeName: string | null }> = ({ badgeUrl, badgeName }) => {
	const [badgeContent, setBadgeContent] = useState<string | null>(null);
	const [isLottie, setIsLottie] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!badgeUrl) {
			setBadgeContent(null);
			setError(null);
			setIsLoading(false); // Make sure loading is false if no URL
			return;
		}

		const loadBadge = async () => {
			setIsLoading(true);
			setError(null);
			setBadgeContent(null);
			const isLottieFile = badgeUrl.toLowerCase().endsWith('.json');
			setIsLottie(isLottieFile);

			try {
				const response = await invoke<FetchResponse>("fetch_badge_data", { url: badgeUrl });
				if (isLottieFile) {
					JSON.parse(response.content); // Validate JSON
					setBadgeContent(response.content);
				} else {
					setBadgeContent(badgeUrl); // Use original URL for images
				}
			} catch (err: any) {
				console.error("Failed to fetch badge data via Tauri:", err);
				let errorMessage = "Не удалось загрузить значок.";
				if (err && typeof err === 'object') {
					const fetchErr = err as FetchError;
					if (fetchErr.Network) errorMessage = `Ошибка сети: ${fetchErr.Network}`;
					else if (fetchErr.Other) errorMessage = `Ошибка: ${fetchErr.Other}`;
					else if (typeof err.message === 'string') errorMessage = err.message;
				} else if (typeof err === 'string') {
					errorMessage = err;
				}
				setError(errorMessage);
				setBadgeContent(null);
			} finally {
				setIsLoading(false);
			}
		};

		loadBadge();

	}, [badgeUrl]);

	const title = badgeName ?? "Значок профиля";

	return (
		<span className="profile-badge" title={isLoading ? "Загрузка..." : error ? error : title}>
			{isLoading && <div className="badge-shimmer"></div>}
			{!isLoading && error && <span className="badge-error">!</span>}
			{!isLoading && !error && badgeContent && (
				isLottie ? (
					<LottiePlayer
						autoplay
						loop
						src={JSON.parse(badgeContent)}
						style={{ height: '100%', width: 'auto', display: 'block' }} // Adjusted style for container
					/>
				) : (
					<img src={badgeContent} alt={title} />
				)
			)}
		</span>
	);
};

// Основной компонент страницы профиля
export const UserProfilePage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { userId: loggedInUserId, token, isLoading: authLoading, logout } = useAuth();
	const [profileData, setProfileData] = useState<FullProfile | null>(null);
	const [friends, setFriends] = useState<BaseProfile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const numericId = id ? parseInt(id, 10) : null;
	const isOwnProfile = numericId === loggedInUserId;

	useEffect(() => {
		const fetchProfile = async () => {
			if (!numericId || authLoading) {
				if (!authLoading && !numericId) {
					setError("Неверный ID пользователя.");
					setIsLoading(false);
				}
				return;
			}
			if (isOwnProfile && !token) {
				navigate("/profile");
				return;
			}
			setIsLoading(true);
			setError(null);
			setProfileData(null);
			setFriends([]);
			try {
				const client = getAnixartClient();
				const profile = await client.getProfileById(numericId);
				setProfileData(profile);
				if (profile && !profile.isCountsHidden) {
					try {
						const fetchedFriends = await profile.getFriends(0);
						setFriends(fetchedFriends);
					} catch (friendError) {
						console.error("Failed to fetch friends:", friendError);
					}
				}
			} catch (err: any) {
				if (err instanceof Error && err.message.includes("404")) {
					setError(`Профиль с ID ${numericId} не найден.`);
				} else {
					setError("Не удалось загрузить профиль. Попробуйте позже.");
					console.error("Profile fetch error:", err);
				}
			} finally {
				setIsLoading(false);
			}
		};
		fetchProfile();
	}, [id, numericId, loggedInUserId, token, isOwnProfile, navigate, authLoading]);


	if (isLoading || authLoading) {
		return (
			<motion.div
				className="profile-page-wrapper loading"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="profile-main-content">
					<div className="spinner"></div>
					<p>Загрузка профиля...</p>
				</div>
			</motion.div>
		);
	}

	if (error) {
		return (
			<motion.div
				className="profile-page-wrapper error"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="profile-main-content">
					<h1>Ошибка</h1>
					<p>{error}</p>
				</div>
			</motion.div>
		);
	}

	if (!profileData) {
		return (
			<motion.div
				className="profile-page-wrapper error"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="profile-main-content">
					<h1>Профиль не найден</h1>
					<p>Не удалось получить данные профиля или профиль не существует.</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			className="profile-page-wrapper"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<aside className="profile-sidebar">
				<div
					className="profile-banner"
					style={{ backgroundImage: profileData.theme_background_url ? `url(${profileData.theme_background_url})` : "none" }}
				></div>
				<div className="profile-avatar-container">
					<img src={profileData.avatar} alt={`${profileData.login}'s avatar`} className="profile-avatar" />
					{profileData.isOnline && <div className="profile-online-indicator"></div>}
				</div>
				<div className="profile-user-info">
					<div className="profile-login-badge">
						<h1 className="profile-login">
							{profileData.login}
							{profileData.isVerified && <span title="Верифицирован"> ✅</span>}
							{profileData.isSponsor && <span title="Спонсор"> ✨</span>}
						</h1>
						<ProfileBadge badgeUrl={profileData.badgeUrl} badgeName={profileData.badgeName} />
					</div>
					<p className="profile-status">
						{profileData.status || "Нет статуса"}
					</p>
				</div>
				{!profileData.isCountsHidden && profileData.friendCount > 0 && (
					<div className="profile-friends-preview">
						<div className="profile-friends-avatars">
							{friends.slice(0, 3).map((friend, index) => (
								<img
									key={friend.id}
									src={friend.avatar}
									alt={friend.login}
									className="profile-friend-avatar"
									style={{ zIndex: 3 - index, marginLeft: index > 0 ? '-10px' : '0' }}
									title={friend.login}
								/>
							))}
						</div>
						<span className="profile-friends-count">{profileData.friendCount} друзeй</span>
					</div>
				)}
				{profileData.roles?.length > 0 && (
					<div className="profile-roles">
						{profileData.roles.map((role, index) => (
							<span key={index} className="profile-role" style={{ backgroundColor: role.color || "#888" }}>
								{role.name}
							</span>
						))}
					</div>
				)}
				<div className="profile-details">
					<p title="Уровень доверия">
						<FaShieldAlt /> Уровень доверия: <span className={`profile-privilege-level-text ${getPrivilegeLevelClass(profileData.privilegeLevel)}`}>
							{profileData.privilegeLevel}
						</span>
					</p>
					<p title="Дата регистрации">
						<FaCalendarAlt /> Зарегистрирован: {new Date(profileData.registerDate * 1000).toLocaleDateString()}
					</p>
					<p title="Последняя активность">
						<FaClock /> Активность: {formatLastActivity(profileData.lastActivityTime)}
					</p>
					{profileData.isBanned && (
						<p title={`Забанен до ${new Date(profileData.banExpires).toLocaleString()}`}>
							🚫 Забанен: {profileData.banReason || "Причина не указана"}
						</p>
					)}
				</div>
				{!profileData.isStatsHidden && (
					<div className="profile-stats">
						<h3><IoIosStats /> Статистика</h3>
						<div className="profile-stats-grid">
							<div className="profile-stats-item" title="Просмотрено серий">
								<FaEye /> <span>Просмотрено серий:</span> <span>{profileData.watchedEpisodeCount ?? 0}</span>
							</div>
							<div className="profile-stats-item" title="Время просмотра">
								<FaHourglassHalf /> <span>Время просмотра:</span> <span>{formatWatchedTime(profileData.watchedTime ?? 0)}</span>
							</div>
						</div>
					</div>
				)}
				{!profileData.isSocialHidden && (profileData.vkPage || profileData.tgPage || profileData.instPage || profileData.ttPage || profileData.discordPage) && (
					<div className="profile-socials">
						<h3><FaVk /> Социальные сети</h3>
						<div className="profile-socials-links">
							{profileData.vkPage && <a href={"https://vk.com/" + profileData.vkPage} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="ВКонтакте"><FaVk size="1.5rem" /></a>}
							{profileData.tgPage && <a href={profileData.tgPage} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="Telegram"><FaTelegramPlane size="1.5rem" /></a>}
							{profileData.instPage && <a href={profileData.instPage} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="Instagram"><FaInstagram size="1.5rem" /></a>}
							{profileData.ttPage && <a href={profileData.ttPage} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="TikTok"><FaTiktok size="1.5rem" /></a>}
							{profileData.discordPage && <span title={`Discord: ${profileData.discordPage}`} className="profile-social-link" style={{ cursor: "text" }}><FaDiscord size="1.5rem" /> {profileData.discordPage}</span>}
						</div>
					</div>
				)}
				{isOwnProfile && (
					<button onClick={logout} className="logout-button">
						Выйти
					</button>
				)}
			</aside>
			<main className="profile-main-content">
				<div className="profile-content-placeholder">
					<h2>Контент профиля</h2>
					<p>Здесь будут отображаться закладки, история, коллекции и другая информация пользователя.</p>
					<p>(В разработке)</p>
				</div>
			</main>
		</motion.div>
	);
};