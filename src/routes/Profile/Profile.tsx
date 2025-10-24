import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LoginPage } from "../Login/Login";
import { motion } from "framer-motion";

export const Profile = () => {
	const { userId, isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading) {
			console.log("Auth check complete. User ID:", userId);
		}
	}, [isLoading, userId]);

	if (isLoading) {
		return (
			<motion.div
				className="route-wrapper page-content stub-page loading-centered"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<div className="spinner"></div>
				<p>Проверка авторизации...</p>
			</motion.div>
		);
	}

	if (userId) {
		console.log(`User logged in (ID: ${userId}). Redirecting to /profile/${userId}`);
		return <Navigate to={`/profile/${userId}`} replace />;
	} else {
		console.log("User not logged in. Showing LoginPage.");
		return <LoginPage />;
	}
};