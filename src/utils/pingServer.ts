import { Anixart } from "anixartjs";

const anixart = new Anixart({});
const TARGET_PROFILE_ID = 1932711;

/**
 * Пингует сервер Anixart, пытаясь получить конкретный профиль.
 * @returns {Promise<boolean>} true, если пинг успешен, иначе false.
 */
export const pingServer = async (): Promise<boolean> => {
	try {
		const profile = await anixart.getProfileById(TARGET_PROFILE_ID);
		return profile && profile.id === TARGET_PROFILE_ID;

	} catch (error) {
		console.error("Server ping failed:", error);
		return false;
	}
};