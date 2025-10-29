import { Anixart } from "anixartjs";

let anixartInstance = new Anixart({});

export const updateAnixartClient = (newBaseUrl: string) => {
	anixartInstance = new Anixart({ baseUrl: newBaseUrl });
};

export const getAnixartClient = (): Anixart => anixartInstance;