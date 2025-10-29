import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { getAnixartClient } from "../../client";
import { FullProfile } from "anixartjs/dist/classes/FullProfile";
import { BaseProfile } from "anixartjs/dist/classes/BaseProfile";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import {
	FaVk, FaTelegramPlane, FaInstagram, FaTiktok, FaDiscord, FaCalendarAlt,
	FaClock, FaEye, FaHourglassHalf, FaShieldAlt, FaCrown, FaUserPlus, FaUserMinus
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { IoIosStats } from "react-icons/io";
import "./UserProfile.css";
import { IChannel } from "anixartjs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FriendsContent } from "../../components/FriendsContent/FriendsContent";
import { CachedMedia } from "../../components/CachedMedia/CachedMedia";
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";

interface CacheResponse {
	local_path: string;
	content_type: string | null;
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

export const UserProfilePage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { userId, token, isLoading: authLoading, logout } = useAuth();
	const [profileData, setProfileData] = useState<FullProfile | null>(null);
	const [channelData, setChannelData] = useState<IChannel | null>(null);
	const [friends, setFriends] = useState<BaseProfile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cachedBannerUrl, setCachedBannerUrl] = useState<string | null>(null);
	const [isBannerLoading, setIsBannerLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<ProfileTab>("summary");
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	const numericId = id ? parseInt(id, 10) : null;
	const isOwnProfile = numericId === userId;

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
			setFriends([]);
			setChannelData(null);
			setCachedBannerUrl(null);
			setActiveTab("summary");

			try {
				const client = getAnixartClient();
				const profile = await client.getProfileById(numericId);
				setProfileData(profile);

				if (profile && !profile.isCountsHidden) {
					try {
						const fetchedFriends = await profile.getFriends(0);
						setFriends(fetchedFriends.slice(0, 3));
					} catch { }
				}

				if (profile) {
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
	}, [id, numericId, userId, token, isOwnProfile, navigate, authLoading, location.pathname]);

	useEffect(() => {
		let mounted = true;
		const bannerUrl = channelData?.cover?.toString() || profileData?.theme_background_url || null;
		if (bannerUrl) {
			setIsBannerLoading(true);
			setCachedBannerUrl(null);
			invoke<CacheResponse>("cache_media", { url: bannerUrl })
				.then(r => mounted && setCachedBannerUrl(convertFileSrc(r.local_path)))
				.catch(() => mounted && setCachedBannerUrl(bannerUrl))
				.finally(() => mounted && setIsBannerLoading(false));
		} else {
			setCachedBannerUrl(null);
			setIsBannerLoading(false);
		}
		return () => { mounted = false; };
	}, [channelData, profileData?.theme_background_url]);

	const handleFriendRequest = async () => {
		if (!profileData || !token) return;
		const client = getAnixartClient();
		const id = profileData.id;
		try {
			let res: { friend_status: number | null };
			if (profileData.friendStatus === null || profileData.friendStatus === 1)
				res = await client.endpoints.profile.sendFriendRequest(id);
			else res = await client.endpoints.profile.removeFriendRequest(id);

			setProfileData(prev => {
				if (!prev) return null;
				const updatedProfileData = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev);
				updatedProfileData.friendStatus = res.friend_status;
				return updatedProfileData;
			});
		} catch { }
	};

	const friendButtonProps = token && !isOwnProfile ? (() => {
		const { friendStatus, isFriendRequestsDisallowed } = profileData || {};
		if (isFriendRequestsDisallowed && friendStatus !== 2)
			return { text: "Заявки отключены", icon: <FaUserPlus />, disabled: true, className: "friend-button-disabled" };
		if (friendStatus === null)
			return { text: "Добавить в друзья", icon: <FaUserPlus />, disabled: false, className: "friend-button-add" };
		if (friendStatus === 1)
			return { text: "Принять заявку", icon: <FaUserPlus />, disabled: false, className: "friend-button-add" };
		if (friendStatus === 0)
			return { text: "Отменить заявку", icon: <FaUserMinus />, disabled: false, className: "friend-button-remove" };
		if (friendStatus === 2)
			return { text: "Удалить из друзей", icon: <FaUserMinus />, disabled: false, className: "friend-button-remove" };
		return null;
	})() : null;

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
					<CachedMedia src={profileData.avatar} alt={profileData.login} type="image" className="profile-avatar" />
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
					{friendButtonProps && (
						<button className={`profile-action-button ${friendButtonProps.className}`} onClick={handleFriendRequest} disabled={friendButtonProps.disabled}>
							{friendButtonProps.icon}<span>{friendButtonProps.text}</span>
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
					<button className={`profile-tab ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>Сводка</button>
					<button className={`profile-tab ${activeTab === "friends" ? "active" : ""}`} onClick={() => setActiveTab("friends")}>Друзья</button>
					<button className={`profile-tab ${activeTab === "bookmarks" ? "active" : ""}`} onClick={() => setActiveTab("bookmarks")}>Закладки</button>
					<button className={`profile-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>История</button>
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
			</AnimatePresence>
		</motion.div>
	);
};