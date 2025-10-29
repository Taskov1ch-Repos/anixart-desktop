import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { getAnixartClient } from "../../client";
import { FullProfile } from "anixartjs/dist/classes/FullProfile";
import { BaseProfile } from "anixartjs/dist/classes/BaseProfile";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import {
	FaVk, FaTelegramPlane, FaInstagram, FaTiktok, FaDiscord, FaCalendarAlt,
	FaClock, FaEye, FaHourglassHalf, FaShieldAlt, FaCrown, FaUserPlus, FaUserMinus,
	FaDownload, FaListAlt, FaUserFriends, FaBookmark, FaHistory
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { IoIosStats } from "react-icons/io";
import "./UserProfile.css";
import { IChannel } from "anixartjs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FriendsContent } from "../../components/FriendsContent/FriendsContent";
import { CachedMedia } from "../../components/CachedMedia/CachedMedia";
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";
import { save } from "@tauri-apps/plugin-dialog";

interface CacheResponse {
	local_path: string;
	content_type: string | null;
	filename: string;
}

const formatLastActivity = (timestamp: number): string => {
	const now = Date.now();
	const last = new Date(timestamp * 1000);
	const diff = Math.floor((now - last.getTime()) / 1000);
	const m = Math.floor(diff / 60);
	const h = Math.floor(m / 60);
	const d = Math.floor(h / 24);
	if (m < 5) return "Недавно";
	if (m < 60) return `${m} мин. назад`;
	if (h < 24) return `${h} ч. назад`;
	if (d < 7) return `${d} д. назад`;
	return `был(а) ${last.toLocaleString()}`;
};

const getRatingScoreClass = (lvl: number): string =>
	lvl > 0 ? "privilege-level-positive" : lvl < 0 ? "privilege-level-negative" : "privilege-level-neutral";

const formatWatchedTime = (sec: number): string => {
	if (isNaN(sec) || sec < 0) return "Н/Д";
	const d = Math.floor(sec / 86400);
	const h = Math.floor((sec % 86400) / 3600);
	const m = Math.floor((sec % 3600) / 60);
	return `${d ? `${d} д ` : ""}${h ? `${h} ч ` : ""}${m ? `${m} м` : ""}`.trim() || "0 м";
};

type ProfileTab = "summary" | "friends" | "bookmarks" | "history";
type FriendAction = "send" | "cancel" | "accept" | "remove" | null;

export const UserProfilePage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { userId, token, isLoading: authLoading, logout } = useAuth();
	const [profileData, setProfileData] = useState<FullProfile | null>(null);
	const [channelData, setChannelData] = useState<IChannel | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cachedBannerUrl, setCachedBannerUrl] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<ProfileTab>("summary");
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const [showAvatarModal, setShowAvatarModal] = useState(false);
	const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [outgoingRequests, setOutgoingRequests] = useState<number[]>([]);
	const [incomingRequests, setIncomingRequests] = useState<number[]>([]);
	const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);

	const numericId = id ? parseInt(id, 10) : null;
	const isOwnProfile = numericId === userId;

	const fetchFriendRequests = useCallback(async () => {
		if (!token || isOwnProfile) {
			setOutgoingRequests([]);
			setIncomingRequests([]);
			return;
		}
		try {
			const client = getAnixartClient();
			const outPromise = client.endpoints.profile.getFriendRequests("out", 999999);
			const inPromise = client.endpoints.profile.getFriendRequests("in", 999999);
			const [out, inReq] = await Promise.all([outPromise, inPromise]);
			setOutgoingRequests(out.content.map(r => r.id));
			setIncomingRequests(inReq.content.map(r => r.id));
		} catch (err) {
			console.error("Failed to fetch friend requests:", err);
		}
	}, [token, isOwnProfile]);

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
				navigate("/profile", { replace: true });
				return;
			}
			setIsLoading(true);
			setError(null);
			setProfileData(null);
			setChannelData(null);
			setCachedBannerUrl(null);
			setActiveTab("summary");
			setIsAvatarLoaded(false);
			setOutgoingRequests([]);
			setIncomingRequests([]);

			try {
				const client = getAnixartClient();
				const profile = await client.getProfileById(numericId);
				setProfileData(profile);

				if (profile) {
					fetchFriendRequests();

					try {
						const fetchedBlog = await client.endpoints.channel.getBlog(profile.id);
						if (fetchedBlog.code === 0) setChannelData(fetchedBlog.channel);
					} catch { }
				}
			} catch (err: any) {
				if (err?.message?.includes("Network Error") || err?.message?.includes("Failed to fetch")) {
					navigate("/", { state: { isNetworkError: true, from: location.pathname }, replace: true });
				} else if (err instanceof Error && err.message.includes("404")) {
					setError(`Профиль с ID ${numericId} не найден.`);
				} else {
					setError("Не удалось загрузить профиль. Попробуйте позже.");
				}
			} finally {
				setIsLoading(false);
			}
		};
		fetchProfile();
	}, [id, numericId, userId, token, isOwnProfile, navigate, authLoading, location.pathname, fetchFriendRequests]);

	const handleDownloadAvatar = async () => {
		if (!profileData?.avatar || isDownloading) return;
		setIsDownloading(true);
		try {
			const cacheRes = await invoke<CacheResponse>("cache_media", { url: profileData.avatar });

			const destinationPath = await save({
				title: "Сохранить аватар",
				defaultPath: cacheRes.filename,
				filters: [
					{ name: "Изображения", extensions: ["png", "jpeg", "jpg", "gif", "webp"] },
					{ name: "Все файлы", extensions: ["*"] }
				]
			});

			if (destinationPath) {
				await invoke("copy_cached_file", {
					cachedPath: cacheRes.local_path,
					destinationPath: destinationPath
				});
			}

		} catch (err) {
			console.error("Не удалось сохранить аватар:", err);
		} finally {
			setIsDownloading(false);
		}
	};

	const handleFriendRequest = async () => {
		if (!profileData || !token || !friendButtonProps || !friendButtonProps.action || isFriendActionLoading) return;

		setIsFriendActionLoading(true);
		const client = getAnixartClient();
		const id = profileData.id;
		const currentAction = friendButtonProps.action;

		try {
			let newFriendStatus: number | null = profileData.friendStatus;

			switch (currentAction) {
				case "send":
					await client.endpoints.profile.sendFriendRequest(id);
					newFriendStatus = 1;
					break;
				case "cancel":
					await client.endpoints.profile.removeFriendRequest(id);
					newFriendStatus = null;
					break;
				case "accept":
					await client.endpoints.profile.sendFriendRequest(id);
					newFriendStatus = 2;
					break;
				case "remove":
					await client.endpoints.profile.removeFriendRequest(id);
					newFriendStatus = null;
					break;
				default:
					setIsFriendActionLoading(false);
					return;
			}

			setProfileData(prev => {
				if (!prev) return null;
				const updatedProfileData = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev);
				updatedProfileData.friendStatus = newFriendStatus;
				return updatedProfileData;
			});

			await fetchFriendRequests();

		} catch (err) {
			console.error("Ошибка при изменении дружбы:", err);
		} finally {
			setIsFriendActionLoading(false);
		}
	};

	const friendButtonProps = useMemo(() => {
		if (!token || isOwnProfile || !profileData) return null;

		const { id, friendStatus, isFriendRequestsDisallowed } = profileData;

		if (isFriendRequestsDisallowed && friendStatus !== 2) {
			return {
				text: "Заявки отключены",
				icon: <FaUserPlus />,
				disabled: true,
				action: null as FriendAction,
				className: "friend-button-disabled"
			};
		}

		if (friendStatus === 2) {
			return {
				text: "Удалить из друзей",
				icon: <FaUserMinus />,
				disabled: isFriendActionLoading,
				action: "remove" as FriendAction,
				className: "friend-button-remove"
			};
		}

		if (outgoingRequests.includes(id)) {
			return {
				text: "Отменить запрос",
				icon: <FaUserMinus />,
				disabled: isFriendActionLoading,
				action: "cancel" as FriendAction,
				className: "friend-button-remove"
			};
		}

		if (incomingRequests.includes(id)) {
			return {
				text: "Принять запрос",
				icon: <FaUserPlus />,
				disabled: isFriendActionLoading,
				action: "accept" as FriendAction,
				className: "friend-button-add"
			};
		}

		return {
			text: "Добавить в друзья",
			icon: <FaUserPlus />,
			disabled: isFriendActionLoading,
			action: "send" as FriendAction,
			className: "friend-button-add"
		};
	}, [token, isOwnProfile, profileData, outgoingRequests, incomingRequests, isFriendActionLoading]);

	const handleOpenUrl = async (url: string) => {
		if (!url) return;
		try { await openUrl(url); } catch { }
	};

	if (isLoading || authLoading)
		return (
			<LoadingSpinner
				message="Загрузка профиля..."
				wrapperClassName="route-wrapper"
			/>
		);

	if (error)
		return <motion.div className="profile-page-wrapper error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
			<div className="profile-main-content"><h1>Ошибка</h1><p>{error}</p></div>
		</motion.div>;

	if (!profileData)
		return <motion.div className="profile-page-wrapper error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
			<div className="profile-main-content"><h1>Профиль не найден</h1><p>Не удалось получить данные профиля.</p></div>
		</motion.div>;

	const bannerStyle: React.CSSProperties = {
		height: "7.5rem",
		marginBottom: "-2.8125rem",
		transition: "background-image 0.4s ease-in-out, background-color 0.2s ease",
		backgroundImage: cachedBannerUrl ? `url("${cachedBannerUrl}")` : "none",
		backgroundColor: cachedBannerUrl ? "transparent" : "var(--border-color)"
	};

	const renderContent = () => {
		if (activeTab === "summary") return <div className="profile-content-placeholder"><p>Сводка (в разработке)</p></div>;
		if (activeTab === "friends") return <FriendsContent profile={profileData} />;
		if (activeTab === "bookmarks") return <div className="profile-content-placeholder"><p>Закладки (в разработке)</p></div>;
		if (activeTab === "history") return <div className="profile-content-placeholder"><p>История (в разработке)</p></div>;
		return null;
	};

	return (
		<motion.div className="profile-page-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
			<aside className="profile-sidebar">
				{channelData && <CachedMedia type="image" src={channelData.cover} alt="Profile Banner" className="profile-banner" style={bannerStyle} />}
				<div className="profile-avatar-container">
					<CachedMedia
						src={profileData.avatar}
						alt={profileData.login}
						type="image"
						className={`profile-avatar ${isAvatarLoaded ? "loaded" : ""}`}
						onLoad={() => setIsAvatarLoaded(true)}
						onClick={() => isAvatarLoaded && setShowAvatarModal(true)}
					/>
					{profileData.isOnline && <div className="profile-online-indicator"></div>}
				</div>
				<div className="profile-user-info">
					<div className="profile-login-badge">
						<h1 className="profile-login">{profileData.login}</h1>
						{profileData.badgeId && <CachedMedia src={profileData.badgeUrl} alt={profileData.badgeName ?? "Значок"} type={profileData.badgeUrl?.endsWith(".json") ? "lottie" : "image"} className="profile-badge" style={{ height: "1.5rem", width: "1.5rem" }} />}
					</div>
					<div className="profile-status-indicators">
						{profileData.isVerified && <span className="profile-role profile-status-indicator"><MdVerified /> Верифицирован</span>}
						{profileData.isSponsor && <span className="profile-role profile-status-indicator"><FaCrown /> Спонсор</span>}
					</div>
					<p className="profile-status">{profileData.status || "Нет статуса"}</p>
					{/* --- ОБНОВЛЕННАЯ КНОПКА --- */}
					{friendButtonProps && (
						<button
							className={`profile-action-button ${friendButtonProps.className}`}
							onClick={handleFriendRequest}
							disabled={friendButtonProps.disabled}
						>
							{friendButtonProps.icon}
							<span>{isFriendActionLoading ? "..." : friendButtonProps.text}</span>
						</button>
					)}
				</div>

				{profileData.roles?.length > 0 && (
					<div className="profile-roles">
						{profileData.roles.map((r, i) => (
							<span key={i} className="profile-role"
								style={{
									backgroundColor: r.color ? `#${r.color}40` : "#88888840",
									border: `1px solid #${r.color ?? "888"}`,
									color: `#${r.color ?? "888"}`
								}}>
								{r.name}
							</span>
						))}
					</div>
				)}

				<div className="profile-details">
					<p><FaShieldAlt /> Уровень доверия: <span className={`profile-privilege-level-text ${getRatingScoreClass(profileData.ratingScore)}`}>{profileData.ratingScore}</span></p>
					<p><FaCalendarAlt /> Зарегистрирован: {new Date(profileData.registerDate * 1000).toLocaleDateString()}</p>
					<p><FaClock /> Активность: {profileData.isOnline ? "Онлайн" : formatLastActivity(profileData.lastActivityTime)}</p>
					{profileData.isBanned && <p>🚫 Забанен: {profileData.banReason || "Причина не указана"}</p>}
				</div>

				{!profileData.isStatsHidden && (
					<div className="profile-stats">
						<h3><IoIosStats /> Статистика</h3>
						<div className="profile-stats-grid">
							{profileData.watchedEpisodeCount !== null && <div className="profile-stats-item"><FaEye /> Просмотрено серий: {profileData.watchedEpisodeCount}</div>}
							{profileData.watchedTime !== null && <div className="profile-stats-item"><FaHourglassHalf /> Время просмотра: {formatWatchedTime(profileData.watchedTime)}</div>}
						</div>
					</div>
				)}

				{!profileData.isSocialHidden && (
					<div className="profile-socials">
						<h3><FaVk /> Социальные сети</h3>
						<div className="profile-socials-links">
							{profileData.vkPage && <a onClick={() => handleOpenUrl("https://vk.com/" + profileData.vkPage)} className="profile-social-link"><FaVk size="1.5rem" /></a>}
							{profileData.tgPage && <a onClick={() => handleOpenUrl("https://t.me/" + profileData.tgPage)} className="profile-social-link"><FaTelegramPlane size="1.5rem" /></a>}
							{profileData.instPage && <a onClick={() => handleOpenUrl("https://instagram.com/" + profileData.instPage)} className="profile-social-link"><FaInstagram size="1.5rem" /></a>}
							{profileData.ttPage && <a onClick={() => handleOpenUrl("https://www.tiktok.com/@" + profileData.ttPage)} className="profile-social-link"><FaTiktok size="1.5rem" /></a>}
							{profileData.discordPage && <span className="profile-social-link"><FaDiscord size="1.5rem" /> {profileData.discordPage}</span>}
						</div>
					</div>
				)}

				{isOwnProfile && <button onClick={() => setShowLogoutConfirm(true)} className="logout-button">Выйти</button>}
			</aside>

			<main className="profile-main-content">
				<div className="profile-content-tabs">
					<button
						className={`profile-tab ${activeTab === "summary" ? "active" : ""}`}
						onClick={() => setActiveTab("summary")}
						title="Сводка"
					>
						<FaListAlt />
						<span>Сводка</span>
					</button>
					<button
						className={`profile-tab ${activeTab === "friends" ? "active" : ""}`}
						onClick={() => setActiveTab("friends")}
						title="Друзья"
					>
						<FaUserFriends />
						<span>Друзья</span>
					</button>
					<button
						className={`profile-tab ${activeTab === "bookmarks" ? "active" : ""}`}
						onClick={() => setActiveTab("bookmarks")}
						title="Закладки"
					>
						<FaBookmark />
						<span>Закладки</span>
					</button>
					<button
						className={`profile-tab ${activeTab === "history" ? "active" : ""}`}
						onClick={() => setActiveTab("history")}
						title="История"
					>
						<FaHistory />
						<span>История</span>
					</button>
				</div>
				<div className="profile-content-body">{renderContent()}</div>
			</main>

			<AnimatePresence>
				{showLogoutConfirm && (
					<motion.div className="logout-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutConfirm(false)}>
						<motion.div className="logout-modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
							<h2>Подтверждение</h2>
							<p>Вы уверены, что хотите выйти?</p>
							<div className="logout-modal-buttons">
								<button onClick={() => setShowLogoutConfirm(false)} className="modal-button cancel">Отмена</button>
								<button onClick={logout} className="modal-button confirm">Выйти</button>
							</div>
						</motion.div>
					</motion.div>
				)}

				{showAvatarModal && (
					<motion.div
						className="avatar-modal-overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setShowAvatarModal(false)}
					>
						<motion.div
							className="avatar-modal-content"
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={e => e.stopPropagation()}
						>
							<img src={profileData.avatar} alt="Full Avatar" className="avatar-modal-image" />
							<button
								className="avatar-modal-download"
								onClick={handleDownloadAvatar}
								disabled={isDownloading}
							>
								<FaDownload />
								<span>{isDownloading ? "Сохранение..." : "Скачать"}</span>
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};