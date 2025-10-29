import React from "react";
import { motion } from "framer-motion";
import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
	message: string;
	wrapperClassName?: string;
	key?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	message,
	wrapperClassName = "route-wrapper page-content",
	key,
}) => {

	return (
		<motion.div
			key={key}
			className={wrapperClassName}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			<div className="loading-spinner-content">
				<div className="spinner"></div>
				<p>{message}</p>
			</div>
		</motion.div>
	);
};