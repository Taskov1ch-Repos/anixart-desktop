import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import "./CachedMedia.css"; // Подключаем стили

// --- Интерфейсы и базовые типы ---
interface CacheResponse {
	local_path: string;
	content_type: string | null;
}

interface FetchError {
	Network?: string;
	Other?: string;
}

interface CachedMediaBaseProps {
	src: string | null;
	alt?: string;
}

// --- Пропсы для типа "image" ---
interface CachedMediaImageProps extends CachedMediaBaseProps, Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
	type: "image";
	// Класс для плейсхолдера во время загрузки/ошибки
	placeholderClassName?: string;
	// Стиль для плейсхолдера
	placeholderStyle?: React.CSSProperties;
	// Флаг для отключения анимации появления
	disableAppearAnimation?: boolean;
}

// --- Пропсы для типа "lottie" ---
interface CachedMediaLottieProps extends CachedMediaBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
	type: "lottie";
	disableAppearAnimation?: boolean;
}

type CachedMediaProps = CachedMediaImageProps | CachedMediaLottieProps;

// --- Компонент ---
export const CachedMedia: React.FC<CachedMediaProps> = (props) => {
	const { src, alt, type } = props;

	const [localSrc, setLocalSrc] = useState<string | null>(null);
	const [lottieData, setLottieData] = useState<object | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const disableAnimation = props.disableAppearAnimation ?? false;

	useEffect(() => {
		let isMounted = true;
		setLocalSrc(null);
		setLottieData(null);
		setError(null);
		setIsLoading(true);

		if (!src) {
			setError("Источник медиа не указан.");
			setIsLoading(false);
			return;
		}

		const loadMedia = async () => {
			let cachePath: string | null = null;
			try {
				console.log(`CachedMedia: Requesting cache for ${src}`);
				const response = await invoke<CacheResponse>("cache_media", { url: src });
				cachePath = response.local_path;
				console.log(`CachedMedia: Received local path ${cachePath} for ${src}`);

				if (!isMounted) return;

				if (type === "lottie") {
					console.log(`CachedMedia: Reading Lottie content from ${cachePath}`);
					const fileContent = await invoke<string>("read_cached_media", { path: cachePath });
					if (!isMounted) return;
					try {
						const parsedData = JSON.parse(fileContent);
						setLottieData(parsedData);
						setError(null);
					} catch (e) {
						console.error("Failed to parse Lottie JSON:", e);
						setError("Не удалось разобрать данные анимации.");
						setLottieData(null);
					}
				} else { // type === 'image'
					const assetUrl = convertFileSrc(cachePath);
					console.log(`CachedMedia: Converted path ${cachePath} to asset URL ${assetUrl}`);
					// Небольшая задержка перед установкой src, чтобы анимация сработала
					// setTimeout(() => {
					//     if (isMounted) {
					setLocalSrc(assetUrl);
					setError(null);
					//     }
					// }, 10); // Увеличьте, если анимация не видна
				}
			} catch (err: any) {
				console.error(`CachedMedia: Failed to cache or load ${src}:`, err);
				if (!isMounted) return;
				let errorMessage = "Не удалось загрузить медиа.";
				if (typeof err === 'string') {
					errorMessage = err.startsWith("Не удалось") ? err : `Ошибка: ${err}`;
				} else if (err && typeof err === "object") {
					const fetchErr = err as FetchError;
					if (fetchErr.Network) errorMessage = `Ошибка сети при загрузке.`;
					else if (fetchErr.Other) errorMessage = `Ошибка кеширования: ${fetchErr.Other}`;
					else if (typeof err.message === "string") errorMessage = err.message;
				}
				setError(errorMessage);
				setLocalSrc(null);
				setLottieData(null);
			} finally {
				// Устанавливаем isLoading в false только если мы НЕ lottie (для lottie установим после парсинга)
				// или если произошла ошибка
				if (isMounted && (type !== 'lottie' || error)) {
					setIsLoading(false);
				}
				// Для lottieisLoading будет сброшен внутри блока try/catch при установке lottieData или ошибки парсинга
				if (isMounted && type === 'lottie') {
					// Задержка нужна, чтобы lottie успел отрендериться перед анимацией
					// setTimeout(() => {
					if (isMounted) setIsLoading(false);
					// }, 50);
				}
			}
		};

		loadMedia();

		return () => {
			isMounted = false;
		};
	}, [src, type]);

	// --- Логика рендеринга ---

	if (type === "image") {
		const {
			type: _t, // Исключаем 'type' из передаваемых дальше пропсов
			placeholderClassName,
			placeholderStyle,
			className,
			disableAppearAnimation, // Исключаем наш флаг
			style, // Забираем style отдельно, чтобы объединить
			alt: imgAlt, // Используем переданный alt
			...restImgProps // Все остальные пропсы для img
		} = props as CachedMediaImageProps;

		const combinedClassName = `cached-media-element ${className ?? ""}`;
		const placeholderCombinedClassName = `cached-media-placeholder ${placeholderClassName ?? ""} ${className ?? ""}`;

		if (isLoading || error || !localSrc) {
			const title = isLoading ? (alt ?? "Загрузка...") : (error || alt || "Ошибка загрузки");
			return (
				<div
					className={`${placeholderCombinedClassName} ${isLoading ? "loading" : "error"}`}
					style={{ ...style, ...placeholderStyle }} // Объединяем стили
					title={title}
					role="img" // Добавляем роль для доступности плейсхолдера
					aria-label={alt ?? title}
					{...restImgProps} // Передаем остальные атрибуты (id, data-*), но не обработчики событий img
				>
					{isLoading && <div className="cached-media-shimmer" />}
					{!isLoading && (error || !localSrc) && <div className="cached-media-error">{error ? "!" : "?"}</div>}
				</div>
			);
		}

		// Успешная загрузка
		return (
			<motion.img
				src={localSrc}
				alt={imgAlt}
				className={combinedClassName}
				style={style} // Передаем стили
				initial={disableAnimation ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				{...restImgProps} // Передаем все остальные пропсы img (onClick и т.д.)
			/>
		);

	} else if (type === "lottie") {
		const {
			type: _t,
			className,
			disableAppearAnimation: _dA, // Используем переменную disableAnimation
			style,
			alt: lottieAlt,
			...restDivProps
		} = props as CachedMediaLottieProps;

		const title = isLoading ? "Загрузка..." : error ? error : (lottieAlt ?? props.title);
		const combinedClassName = `cached-media-wrapper lottie ${className ?? ""}`;

		return (
			<motion.div
				className={`${combinedClassName} ${isLoading ? "loading" : ""} ${error ? "error" : ""}`}
				title={title}
				style={style} // Передаем стили
				initial={disableAnimation ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				{...restDivProps} // Передаем остальные пропсы div
			>
				{isLoading && <div className="cached-media-shimmer" />}
				{!isLoading && error && <div className="cached-media-error">!</div>}
				{!isLoading && !error && lottieData && (
					// <div className="cached-media-content"> {/* Обертка больше не нужна? */}
					<Lottie
						animationData={lottieData}
						loop={true}
						autoplay={true}
						// Стили Lottie лучше задавать через родительский div или className
						style={{ height: "100%", width: "100%", display: "block" }}
					/>
					// </div>
				)}
				{!isLoading && !error && !lottieData && <div className="cached-media-error">?</div>}
			</motion.div>
		);
	}

	return null;
};