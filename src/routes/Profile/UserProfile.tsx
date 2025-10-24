import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { getAnixartClient } from "../../client";
import { FullProfile } from "anixartjs/dist/classes/FullProfile";

export const UserProfilePage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { userId: loggedInUserId, token, isLoading: authLoading, logout } = useAuth();
	const [profileData, setProfileData] = useState<FullProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const numericId = id ? parseInt(id, 10) : null;
	const isOwnProfile = numericId === loggedInUserId;

	useEffect(() => {
		const fetchProfile = async () => {
			if (!numericId || authLoading) return;

			if (!token && isOwnProfile) {
				console.log("Not logged in, redirecting to login.");
				navigate("/profile");
				return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const client = getAnixartClient();

				if (!client.token && !isOwnProfile) {
					console.warn("Attempting to load profile without authentication token.");
				}

				const profile = await client.getProfileById(numericId);
				setProfileData(profile);
			} catch (err) {
				console.error("Failed to fetch profile:", err);
				setError("Не удалось загрузить профиль.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchProfile();
	}, [id, numericId, loggedInUserId, token, isOwnProfile, navigate, authLoading]);


	if (authLoading || isLoading) {
		return (
			<motion.div
				className="route-wrapper page-content stub-page loading-centered"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="spinner"></div>
				<p>Загрузка профиля...</p>
			</motion.div>
		);
	}

	if (error) {
		return (
			<motion.div
				className="route-wrapper page-content stub-page"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<h1>Ошибка</h1>
				<p>{error}</p>
			</motion.div>
		);
	}

	if (!profileData) {
		return (
			<motion.div
				className="route-wrapper page-content stub-page"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<h1>Профиль не найден</h1>
				<p>Возможно, профиль с ID {id} не существует.</p>
			</motion.div>
		);
	}


	return (
		<motion.div
			className="route-wrapper page-content profile-page"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<h1>Профиль {profileData.login}</h1>
			<p>ID: {profileData.id}</p>
			<p>Статус: {profileData.status || "Нет статуса"}</p>
			{profileData.avatar && <img src={profileData.avatar} alt={`${profileData.login}"s avatar`} width="100" style={{ borderRadius: "50%" }} />}

			{isOwnProfile && (
				<button onClick={logout} style={{ marginTop: "2rem" }}>
					Выйти
				</button>
			)}
		</motion.div>
	);
};