import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RpcActivity } from "../types/rpc";

interface IRPCContext {
	setActivity: (activity: RpcActivity) => void;
	setDefaultActivity: () => void;
}

const RPCContext = createContext<IRPCContext | null>(null);

export const RPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [startTime] = useState(Math.floor(Date.now() / 1000));
	const defaultActivity = useMemo((): RpcActivity => ({
		details: "Гуляет по приложению",
		state: "Возможно ищет аниме для просмотра",
		start_timestamp: startTime
	}), [startTime]);

	const invokeSetActivity = useCallback((activity: RpcActivity) => {
		invoke("rpc_set_activity", { activityPayload: activity })
			.catch(console.error);
	}, []);

	const setActivity = useCallback((activity: RpcActivity) => {
		invokeSetActivity(activity);
	}, [invokeSetActivity]);

	const setDefaultActivity = useCallback(() => {
		invokeSetActivity(defaultActivity);
	}, [defaultActivity, invokeSetActivity]);

	useEffect(() => {
		invoke("rpc_connect").catch(console.error);
		setDefaultActivity();
		return () => {
			invoke("rpc_clear_activity").catch(console.error);
		};
	}, [setDefaultActivity]);

	return (
		<RPCContext.Provider value={{ setActivity, setDefaultActivity }}>
			{children}
		</RPCContext.Provider>
	);
};

export const useRPC = () => {
	const context = useContext(RPCContext);

	if (!context) {
		throw new Error("useRPC должен использоваться внутри RPCProvider");
	}

	return context;
};