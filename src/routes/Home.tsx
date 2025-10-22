import React from "react";
import { motion } from "framer-motion";
import "./Home.css";

export const Home: React.FC = () => {
	return (
		<motion.div
			className="home-screen"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5, delay: 0.3 }}
		>
			<h1>Добро пожаловать в Anixart Desktop</h1>
			<p>Главная страница</p>
		</motion.div>
	);
};