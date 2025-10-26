import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { getAnixartClient } from "../../client";
import { FullProfile } from "anixartjs/dist/classes/FullProfile";
import { BaseProfile } from "anixartjs/dist/classes/BaseProfile";
import Lottie from "lottie-react";
import { invoke } from "@tauri-apps/api/core";
import {
	FaVk, FaTelegramPlane, FaInstagram, FaTiktok, FaDiscord, FaCalendarAlt, FaClock, FaEye, FaHourglassHalf, FaShieldAlt, FaCrown,
	FaUserPlus, FaUserMinus
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { IoIosStats } from "react-icons/io";
import "./UserProfile.css";
import { IChannel } from "anixartjs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FriendsContent } from "../../components/FriendsContent/FriendsContent";

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

const getRatingScoreClass = (level: number): string => {
	if (level > 0) return "privilege-level-positive";
	if (level < 0) return "privilege-level-negative";
	return "privilege-level-neutral";
};

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

interface FetchResponse {
	content: string;
}

interface FetchError {
	Network?: string;
	Other?: string;
}

const ProfileBadge: React.FC<{ badgeUrl: string | null; badgeName: string | null }> = ({ badgeUrl, badgeName }) => {
	const [badgeContent, setBadgeContent] = useState<string | null>(null);
	const [lottieData, setLottieData] = useState<object | null>(null);
	const [isLottie, setIsLottie] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!badgeUrl) {
			setBadgeContent(null);
			setLottieData(null);
			setError(null);
			setIsLoading(false);
			return;
		}

		const loadBadge = async () => {
			setIsLoading(true);
			setError(null);
			setBadgeContent(null);
			setLottieData(null);
			const isLottieFile = badgeUrl.toLowerCase().endsWith(".json");
			setIsLottie(isLottieFile);

			try {
				const response = await invoke<FetchResponse>("fetch_badge_data", { url: badgeUrl });
				if (isLottieFile) {
					try {
						const parsedData = JSON.parse(response.content);
						setLottieData(parsedData);
					} catch (parseError) {
						console.error("Failed to parse Lottie JSON:", parseError);
						throw new Error("Некорректный формат Lottie JSON.");
					}
				} else {
					setBadgeContent(badgeUrl);
				}
			} catch (err: any) {
				console.error("Failed to fetch or parse badge data via Tauri:", err);
				let errorMessage = "Не удалось загрузить значок.";
				if (err && typeof err === "object") {
					const fetchErr = err as FetchError;
					if (fetchErr.Network) errorMessage = `Ошибка сети: ${fetchErr.Network}`;
					else if (fetchErr.Other) errorMessage = `Ошибка: ${fetchErr.Other}`;
					else if (typeof err.message === "string") errorMessage = err.message;
				} else if (typeof err === "string") {
					errorMessage = err;
				}
				setError(errorMessage);
				setBadgeContent(null);
				setLottieData(null);
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
			{!isLoading && !error && (badgeContent || lottieData) && (
				isLottie && lottieData ? (
					<Lottie
						animationData={lottieData}
						loop={true}
						autoplay={true}
						style={{ height: "100%", width: "auto", display: "block" }}
					/>
				) : (badgeContent && !isLottie &&
					<img src={badgeContent} alt={title} />
				)
			)}
		</span>
	);
};

export const UserProfilePage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { userId: loggedInUserId, token, isLoading: authLoading, logout } = useAuth();
	const [profileData, setProfileData] = useState<FullProfile | null>(null);
	const [channelData, setChannelData] = useState<IChannel | null>(null);
	const [friends, setFriends] = useState<BaseProfile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	type ProfileTab = "friends" | "bookmarks" | "history";
	const [activeTab, setActiveTab] = useState<ProfileTab>("friends");

	const numericId = id ? parseInt(id, 10) : null;
	const isOwnProfile = numericId === loggedInUserId;

	const handleOpenUrl = async (url: string) => {
		if (!url) return;
		try {
			await openUrl(url);
		} catch (err) {
			console.error("Failed to open URL:", err);
		}
	};

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
			setChannelData(null);
			setActiveTab("friends");

			try {
				const client = getAnixartClient();
				const profile = await client.getProfileById(numericId);
				setProfileData(profile);

				if (profile && !profile.isCountsHidden) {
					try {
						const fetchedFriends = await profile.getFriends(0);
						setFriends(fetchedFriends.slice(0, 3));
					} catch (friendError) {
						console.error("Failed to fetch friends preview:", friendError);
					}
				} else {
					setFriends([]);
				}

				if (profile) {
					try {
						const fetchedBlog = await client.endpoints.channel.getBlog(profile.id);
						if (fetchedBlog.code === 0) {
							setChannelData(fetchedBlog.channel);
						}
					} catch (blogError) {
						navigate("/", { state: { isNetworkError: true, from: location.pathname }, replace: true });
						console.error("Failed to fetch blog data:", blogError);
					}
				}

			} catch (err: any) {
				navigate("/", { state: { isNetworkError: true, from: location.pathname }, replace: true });
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
	}, [id, numericId, loggedInUserId, token, isOwnProfile, navigate, authLoading, location.pathname]);

	/**
	 * Обработчик для кнопки "Добавить/Удалить из друзей"
	 */
	const handleFriendRequest = async () => {
		if (!profileData || !token) return;

		const client = getAnixartClient();
		const targetUserId = profileData.id;

		try {
			let response: { friend_status: number | null };

			if (profileData.friendStatus === null || profileData.friendStatus === 1) {
				response = await client.endpoints.profile.sendFriendRequest(targetUserId);
			} else {
				response = await client.endpoints.profile.removeFriendRequest(targetUserId);
			}

			setProfileData(prevData => {
				if (!prevData) return null;

				const newProfileInstance = Object.assign(
					Object.create(Object.getPrototypeOf(prevData)),
					prevData
				);

				newProfileInstance.friendStatus = response.friend_status;

				return newProfileInstance;
			});

		} catch (err) {
			console.error("Failed to update friend status:", err);
		}
	};

	/**
	 * Определяет текст, иконку и состояние кнопки "В друзья"
	 */
	const getFriendButtonProps = () => {
		if (!profileData) return null;

		const { friendStatus, isFriendRequestsDisallowed } = profileData;

		if (isFriendRequestsDisallowed) {
			return {
				text: "Заявки отключены",
				icon: <FaUserPlus />,
				disabled: true,
				className: "friend-button-disabled"
			};
		}

		if (friendStatus === null || friendStatus === 1) {
			return {
				text: friendStatus === 1 ? "Принять заявку" : "Добавить в друзья",
				icon: <FaUserPlus />,
				disabled: false,
				className: "friend-button-add"
			};
		}

		if (friendStatus === 0 || friendStatus === 2) {
			return {
				text: friendStatus === 0 ? "Отменить заявку" : "Удалить из друзей",
				icon: <FaUserMinus />,
				disabled: false,
				className: "friend-button-remove"
			};
		}

		return null;
	};

	const friendButtonProps = (token && !isOwnProfile) ? getFriendButtonProps() : null;


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

	/**
	 * Рендер контента для активной вкладки
	 */
	const renderMainContent = () => {
		switch (activeTab) {
			case "friends":
				return <FriendsContent profile={profileData} />;
			case "bookmarks":
				return <div className="profile-content-placeholder"><p>Закладки (в разработке)</p></div>;
			case "history":
				return <div className="profile-content-placeholder"><p>История (в разработке)</p></div>;
			default:
				return null;
		}
	};

	return (
		<motion.div
			className="profile-page-wrapper"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<aside className="profile-sidebar">
				{channelData && <div
					className="profile-banner"
					style={{
						backgroundImage: channelData?.cover ? `url(${channelData.cover.toString()})` : (profileData.theme_background_url ? `url(${profileData.theme_background_url})` : "none"),
						height: "7.5rem",
						marginBottom: "-2.8125rem"
					}}
				></div>}
				<div className="profile-avatar-container">
					<img src={profileData.avatar} alt={`${profileData.login}"s avatar`} className="profile-avatar" />
					{profileData.isOnline && <div className="profile-online-indicator"></div>}
				</div>
				<div className="profile-user-info">
					<div className="profile-login-badge">
						<h1 className="profile-login">{profileData.login}</h1>
						{profileData.badgeId && <ProfileBadge badgeUrl={profileData.badgeUrl} badgeName={profileData.badgeName} />}
					</div>
					<div className="profile-status-indicators">
						{profileData.isVerified && (
							<span className="profile-role profile-status-indicator" title="Верифицирован">
								<MdVerified /> Верифицирован
							</span>
						)}
						{profileData.isSponsor && (
							<span className="profile-role profile-status-indicator" title="Спонсор">
								<FaCrown color="#FFD700" /> Спонсор
							</span>
						)}
					</div>
					<p className="profile-status">
						{profileData.status || "Нет статуса"}
					</p>

					{/* Кнопка "В друзья" */}
					{friendButtonProps && (
						<button
							className={`profile-action-button ${friendButtonProps.className}`}
							onClick={handleFriendRequest}
							disabled={friendButtonProps.disabled}
							title={friendButtonProps.text}
						>
							{friendButtonProps.icon}
							<span>{friendButtonProps.text}</span>
						</button>
					)}

				</div>
				{!profileData.isCountsHidden && profileData.friendCount > 0 && (
					<div className="profile-friends-preview">
						<div className="profile-friends-avatars">
							{friends.map((friend, index) => (
								<img
									key={friend.id}
									src={friend.avatar}
									alt={friend.login}
									className="profile-friend-avatar"
									style={{ zIndex: 3 - index, marginLeft: index > 0 ? "-0.625rem" : "0" }}
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
							<span
								key={index}
								className="profile-role"
								style={{
									backgroundColor: "#" + role.color ? `${"#" + role.color}40` : "#88888840",
									border: `1px solid ${"#" + role.color || "#888"}`,
									"--role-color": "#" + role.color || "#888"
								} as React.CSSProperties}
							>
								{role.name}
							</span>
						))}
					</div>
				)}
				<div className="profile-details">
					<p title="Уровень доверия">
						<FaShieldAlt /> Уровень доверия: <span className={`profile-privilege-level-text ${getRatingScoreClass(profileData.ratingScore)}`}>
							{profileData.ratingScore}
						</span>
					</p>
					<p title="Дата регистрации">
						<FaCalendarAlt /> Зарегистрирован: {new Date(profileData.registerDate * 1000).toLocaleDateString()}
					</p>
					<p title="Последняя активность">
						<FaClock /> Активность: {profileData.isOnline ? "Онлайн" : formatLastActivity(profileData.lastActivityTime)}
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

							{profileData.vkPage && (
								<a
									onClick={() => handleOpenUrl("https://vk.com/" + profileData.vkPage)}
									className="profile-social-link"
									title="ВКонтакте"
									style={{ cursor: "pointer" }}
								>
									<FaVk size="1.5rem" />
								</a>
							)}
							{profileData.tgPage && (
								<a
									onClick={() => handleOpenUrl("https://t.me/" + profileData.tgPage)}
									className="profile-social-link"
									title="Telegram"
									style={{ cursor: "pointer" }}
								>
									<FaTelegramPlane size="1.5rem" />
								</a>
							)}
							{profileData.instPage && (
								<a
									onClick={() => handleOpenUrl("https://instagram.com/" + profileData.instPage)}
									className="profile-social-link"
									title="Instagram"
									style={{ cursor: "pointer" }}
								>
									<FaInstagram size="1.5rem" />
								</a>
							)}
							{profileData.ttPage && (
								<a
									onClick={() => handleOpenUrl("https://www.tiktok.com/@" + profileData.ttPage)}
									className="profile-social-link"
									title="TikTok"
									style={{ cursor: "pointer" }}
								>
									<FaTiktok size="1.5rem" />
								</a>
							)}

							{profileData.discordPage && (
								<span
									title={`Discord: ${profileData.discordPage}`}
									className="profile-social-link"
									style={{ cursor: "text" }}
								>
									<FaDiscord size="1.5rem" /> {profileData.discordPage}
								</span>
							)}
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
				<div className="profile-content-tabs">
					<button
						className={`profile-tab ${activeTab === 'friends' ? 'active' : ''}`}
						onClick={() => setActiveTab('friends')}
					>
						Друзья
					</button>
					<button
						className={`profile-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
						onClick={() => setActiveTab('bookmarks')}
					>
						Закладки
					</button>
					<button
						className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
						onClick={() => setActiveTab('history')}
					>
						История
					</button>
				</div>
				<div className="profile-content-body">
					{renderMainContent()}
				</div>
			</main>
		</motion.div>
	);
};