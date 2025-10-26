import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RpcActivity } from "../types/rpc";
import { loadRpcPreference, saveRpcPreference } from "../utils/settingsStore";

interface IRPCContext {
	setActivity: (activity: RpcActivity) => void;
	setDefaultActivity: () => void;
	enableRpc: () => void;
	disableRpc: () => void;
	isRpcEnabled: boolean;
}

const RPCContext = createContext<IRPCContext | null>(null);

export const RPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [startTime] = useState(Math.floor(Date.now() / 1000));
	const [isRpcEnabled, setIsRpcEnabled] = useState<boolean>(true);

	useEffect(() => {
		loadRpcPreference().then(enabled => {
			setIsRpcEnabled(enabled);
			if (enabled) {
				invoke("rpc_connect").catch(console.error);
				invokeSetActivity(defaultActivity);
			}
		});

		return () => {
			if (isRpcEnabled) {
				invoke("rpc_disconnect").catch(console.error);
			}
		};
	}, []);

	const defaultActivity = useMemo((): RpcActivity => ({
		details: "Разрабатывает дальше",
		state: "Ещё долго...",
		start_timestamp: startTime
	}), [startTime]);

	const invokeSetActivity = useCallback((activity: RpcActivity) => {
		if (isRpcEnabled) {
			invoke("rpc_set_activity", { activityPayload: activity }).catch(console.error);
		}
	}, [isRpcEnabled]);

	const setActivity = useCallback((activity: RpcActivity) => {
		invokeSetActivity(activity);
	}, [invokeSetActivity]);

	const setDefaultActivity = useCallback(() => {
		if (isRpcEnabled) {
			invokeSetActivity(defaultActivity);
		} else {
			invoke("rpc_clear_activity").catch(console.error);
		}
	}, [defaultActivity, invokeSetActivity, isRpcEnabled]);

	const enableRpc = useCallback(() => {
		if (!isRpcEnabled) {
			console.log("RPCContext: Enabling RPC");
			setIsRpcEnabled(true);
			saveRpcPreference(true);
			invoke("rpc_connect")
				.then(() => {
					invokeSetActivity(defaultActivity);
				})
				.catch(console.error);
		}
	}, [isRpcEnabled, invokeSetActivity, defaultActivity]);

	const disableRpc = useCallback(() => {
		if (isRpcEnabled) {
			console.log("RPCContext: Disabling RPC");
			setIsRpcEnabled(false);
			saveRpcPreference(false);
			invoke("rpc_disconnect").catch(console.error);
		}
	}, [isRpcEnabled]);

	return (
		<RPCContext.Provider value={{ setActivity, setDefaultActivity, enableRpc, disableRpc, isRpcEnabled }}>
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
