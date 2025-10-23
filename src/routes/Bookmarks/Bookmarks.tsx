import React from "react";
import { motion } from "framer-motion";

export const Bookmarks: React.FC = () => {
	return (
		<motion.div
			className="route-wrapper page-content stub-page"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<h1>Закладки</h1>
			<p>Эта страница находится в разработке.</p>
		</motion.div>
	);
};