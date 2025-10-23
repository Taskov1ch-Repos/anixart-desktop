import React from "react";
import { motion } from "framer-motion";

export const Home: React.FC = () => {
	return (
		<motion.div
			className="route-wrapper page-content stub-page"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<h1>Главная страница</h1>
			<p>Добро пожаловать в Anixart Desktop!</p>
		</motion.div>
	);
};