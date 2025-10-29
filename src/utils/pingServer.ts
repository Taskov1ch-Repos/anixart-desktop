import { Anixart } from "anixartjs";

const TARGET_PROFILE_ID = 1932711;

export const pingServer = async (baseUrl: string): Promise<boolean> => {
	try {
		const tempAnixart = new Anixart({ baseUrl });

		const profile = await tempAnixart.getProfileById(TARGET_PROFILE_ID);
		const success = profile && profile.id === TARGET_PROFILE_ID;

		return success;
	} catch (error) {
		console.error(`Server ping failed for ${baseUrl}:`, error);
		return false;
	}
};