import React, { useState, useEffect, useCallback } from "react";
import { BaseProfile } from "anixartjs/dist/classes/BaseProfile";
import { FullProfile } from "anixartjs/dist/classes/FullProfile";
import { Link } from "react-router-dom";
import "./FriendsContent.css";
import { MdVerified } from "react-icons/md";
import { CachedMedia } from "../CachedMedia/CachedMedia";

interface FriendsContentProps {
	profile: FullProfile;
}

const FriendCard: React.FC<{ friend: BaseProfile }> = ({ friend }) => (
	<Link to={`/profile/${friend.id}`} className="friend-card">
		<CachedMedia src={friend.avatar} alt={friend.login} className="friend-avatar" type="image" />
		<div className="friend-info">
			{friend.isVerified && <MdVerified className="verifed" title="Верифицирован" />}
			<span className="friend-login" title={friend.login}>{friend.login}</span>
			{friend.isOnline && <div className="friend-online-indicator"></div>}
		</div>
	</Link>
);

export const FriendsContent: React.FC<FriendsContentProps> = ({ profile }) => {
	const [friends, setFriends] = useState<BaseProfile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [canLoadMore, setCanLoadMore] = useState(true);

	const fetchFriends = useCallback(async (pageNum: number) => {
		if (profile.isCountsHidden || profile.friendCount === 0) {
			setIsLoading(false);
			setCanLoadMore(false);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const newFriends = await profile.getFriends(pageNum);

			if (newFriends.length === 0) {
				setCanLoadMore(false);
			} else {
				setFriends(prev => pageNum === 0 ? newFriends : [...prev, ...newFriends]);
			}
		} catch (err) {
			console.error("Failed to fetch friends:", err);
			setError("Не удалось загрузить список друзей.");
		} finally {
			setIsLoading(false);
		}
	}, [profile]);

	useEffect(() => {
		setPage(0);
		setFriends([]);
		setCanLoadMore(true);
		fetchFriends(0);
	}, [profile.id, fetchFriends]);

	const handleLoadMore = () => {
		const nextPage = page + 1;
		setPage(nextPage);
		fetchFriends(nextPage);
	};

	if (profile.isCountsHidden) {
		return (
			<div className="friends-content-placeholder">
				<p>Пользователь скрыл список друзей.</p>
			</div>
		);
	}

	if (!isLoading && friends.length === 0 && profile.friendCount === 0) {
		return (
			<div className="friends-content-placeholder">
				<p>У пользователя нет друзей.</p>
			</div>
		);
	}

	return (
		<div className="friends-content-wrapper">
			<h2 className="friends-content-title">Друзья ({profile.friendCount})</h2>
			<div className="friends-grid">
				{friends.map(friend => (
					<FriendCard key={friend.id} friend={friend} />
				))}
			</div>

			{isLoading && (
				<div className="friends-loading-spinner">
					<div className="spinner"></div>
				</div>
			)}
			{error && <p className="friends-error-message">{error}</p>}
			{!isLoading && canLoadMore && friends.length > 0 && (
				<button onClick={handleLoadMore} className="load-more-button">
					Загрузить еще
				</button>
			)}
		</div>
	);
};