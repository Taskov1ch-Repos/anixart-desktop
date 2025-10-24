import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaGoogle, FaVk } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import "./Login.css";

export const LoginPage: React.FC = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { login } = useAuth();

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setIsLoading(true);
		const success = await login(username, password);
		setIsLoading(false);
		if (!success) {
			setError("Неверный логин или пароль.");
		}
	};

	return (
		<motion.div
			className="login-page-container"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<div className="login-form-wrapper">
				<div className="login-logo logo"></div>
				<h1 className="login-title">Вход в Anixart</h1>

				<form onSubmit={handleSubmit} className="login-form">
					<div className="input-group">
						<label htmlFor="username">Логин</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							disabled={isLoading}
						/>
					</div>
					<div className="input-group">
						<label htmlFor="password">Пароль</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={isLoading}
						/>
					</div>

					{error && <p className="login-error">{error}</p>}

					<button type="submit" className="login-button" disabled={isLoading}>
						{isLoading ? "Вход..." : "Войти"}
					</button>
				</form>

				<div className="social-login">
					<p className="social-login-divider"><span>или войдите через</span></p>
					<div className="social-buttons">
						<button
							className="social-button vk"
							disabled={true}
							title="Вход через ВКонтакте пока не реализован"
						>
							<FaVk size="1.2rem" />
							<span>ВКонтакте</span>
						</button>
						<button
							className="social-button google"
							disabled={true}
							title="Вход через Google пока не реализован"
						>
							<FaGoogle size="1.2rem" />
							<span>Google</span>
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	);
};