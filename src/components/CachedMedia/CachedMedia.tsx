import React, { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import Lottie from "lottie-react";
import { motion, HTMLMotionProps } from "framer-motion";
import "./CachedMedia.css";

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

interface CachedMediaImageProps extends CachedMediaBaseProps, Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
	type: "image";
	placeholderClassName?: string;
	placeholderStyle?: React.CSSProperties;
	disableAppearAnimation?: boolean;
}

interface CachedMediaLottieProps extends CachedMediaBaseProps, Omit<HTMLMotionProps<"div">, "children"> {
	type: "lottie";
	disableAppearAnimation?: boolean;
}

type CachedMediaProps = CachedMediaImageProps | CachedMediaLottieProps;

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
				const response = await invoke<CacheResponse>("cache_media", { url: src });
				cachePath = response.local_path;

				if (!isMounted) return;

				if (type === "lottie") {
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
				} else {
					const assetUrl = convertFileSrc(cachePath);
					setLocalSrc(assetUrl);
					setError(null);
				}
			} catch (err: any) {
				console.error(`CachedMedia: Failed to cache or load ${src}:`, err);
				if (!isMounted) return;
				let errorMessage = "Не удалось загрузить медиа.";
				if (typeof err === "string") {
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
				if (isMounted && (type !== "lottie" || error)) {
					setIsLoading(false);
				}
				if (isMounted && type === "lottie") {
					if (isMounted) setIsLoading(false);
				}
			}
		};

		loadMedia();

		return () => {
			isMounted = false;
		};
	}, [src, type]);

	if (type === "image") {
		const {
			type: _t,
			placeholderClassName,
			placeholderStyle,
			className,
			disableAppearAnimation: _dA,
			style,
			alt: imgAlt,
			...restImgProps
		} = props as CachedMediaImageProps;

		const combinedClassName = `cached-media-element ${className ?? ""}`;
		const placeholderCombinedClassName = `cached-media-placeholder ${placeholderClassName ?? ""} ${className ?? ""}`;

		if (isLoading || error || !localSrc) {
			const title = isLoading ? (alt ?? "Загрузка...") : (error || alt || "Ошибка загрузки");
			return (
				<div
					className={`${placeholderCombinedClassName} ${isLoading ? "loading" : "error"}`}
					style={{ ...style, ...placeholderStyle }}
					title={title}
					role="img"
					aria-label={alt ?? title}
					{...restImgProps}
				>
					{isLoading && <div className="cached-media-shimmer" />}
					{!isLoading && (error || !localSrc) && <div className="cached-media-error">{error ? "!" : "?"}</div>}
				</div>
			);
		}

		return (
			<motion.img
				// @ts-ignore
				src={localSrc}
				alt={imgAlt}
				className={combinedClassName}
				style={style}
				initial={disableAnimation ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				{...restImgProps}
			/>
		);

	} else if (type === "lottie") {
		const {
			type: _t,
			className,
			disableAppearAnimation: _dA,
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
				style={style}
				initial={disableAnimation ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				{...restDivProps}
			>
				{isLoading && <div className="cached-media-shimmer" />}
				{!isLoading && error && <div className="cached-media-error">!</div>}
				{!isLoading && !error && lottieData && (
					<Lottie
						animationData={lottieData}
						loop={true}
						autoplay={true}
						style={{ height: "100%", width: "100%", display: "block" }}
					/>
				)}
				{!isLoading && !error && !lottieData && <div className="cached-media-error">?</div>}
			</motion.div>
		);
	}

	return null;
};