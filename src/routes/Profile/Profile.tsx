import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LoginPage } from "../Login/Login";
import { motion } from "framer-motion";

export const Profile = () => {
	const { userId, isLoading } = useAuth();

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
		return <Navigate to={`/profile/${userId}`} replace />;
	} else {
		return <LoginPage />;
	}
};