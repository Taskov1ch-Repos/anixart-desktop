import { Anixart } from "anixartjs";

let anixartInstance = new Anixart({});

export const updateAnixartClient = (newBaseUrl: string) => {
	anixartInstance = new Anixart({ baseUrl: newBaseUrl });
	console.log(`Anixart client updated to use base URL: ${newBaseUrl}`);
};

export const getAnixartClient = (): Anixart => anixartInstance;