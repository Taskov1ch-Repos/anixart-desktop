export interface RpcButton {
	label: string;
	url: string;
}

export interface RpcAssets {
	large_image?: string;
	large_text?: string;
	small_image?: string;
	small_text?: string;
}

export interface RpcActivity {
	state?: string;
	details?: string;
	start_timestamp?: number;
	assets?: RpcAssets;
	buttons?: RpcButton[];
}