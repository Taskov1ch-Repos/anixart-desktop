const MOCK_LATEST_RELEASE = {
	tag_name: "v0.2.0",
	name: "Release v0.2.0",
	body: "### Исправления:\n- Исправлена ошибка X.\n- Улучшена производительность Y.\n\n### Новые возможности:\n- Добавлена функция Z.",
	html_url: "https://github.com/Taskov1ch/anixart-desktop/releases/latest"
};

const CURRENT_APP_VERSION = "0.1.0";

export interface ReleaseInfo {
	version: string;
	name: string;
	notes: string;
	url: string;
}

export const checkForUpdates = async (): Promise<{ updateAvailable: boolean; latestRelease: ReleaseInfo | null }> => {
	try {
		// const response = await fetch("https://api.github.com/repos/Taskov1ch/anixart-desktop/releases/latest");
		// if (!response.ok) {
		//     throw new Error(`GitHub API request failed: ${response.status}`);
		// }
		// const latestRelease = await response.json();

		const latestRelease = MOCK_LATEST_RELEASE;

		const updateAvailable = latestRelease.tag_name.replace("v", "") > CURRENT_APP_VERSION;

		if (updateAvailable) {
			return {
				updateAvailable: true,
				latestRelease: {
					version: latestRelease.tag_name,
					name: latestRelease.name,
					notes: latestRelease.body,
					url: latestRelease.html_url,
				},
			};
		} else {
			return { updateAvailable: false, latestRelease: null };
		}
	} catch (error) {
		console.error("Failed to check for updates:", error);
		return { updateAvailable: false, latestRelease: null };
	}
};

export const getCurrentVersion = (): string => {
	return CURRENT_APP_VERSION;
};