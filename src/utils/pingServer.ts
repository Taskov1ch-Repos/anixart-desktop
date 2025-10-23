import { anixart } from "../client";

const TARGET_PROFILE_ID = 1932711;

export const pingServer = async (): Promise<boolean> => {
	try {
		const profile = await anixart.getProfileById(TARGET_PROFILE_ID);
		return profile && profile.id === TARGET_PROFILE_ID;

	} catch (error) {
		console.error("Server ping failed:", error);
		return false;
	}
};