use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug, Serialize)]
enum FetchError {
    Network(String),
    Other(String),
}

#[derive(Debug, Serialize)]
struct FetchResponse {
    content: String,
}

#[tauri::command]
async fn fetch_badge_data(url: String) -> Result<FetchResponse, FetchError> {
    println!("Rust: fetch_badge_data called with URL: {}", url);
    match reqwest::get(&url).await {
        Ok(response) => {
            println!("Rust: Request status: {}", response.status());
            if response.status().is_success() {
                match response.text().await {
                    Ok(text) => {
                        println!("Rust: Successfully fetched {} bytes", text.len());
                        Ok(FetchResponse { content: text })
                    }
                    Err(e) => {
                        eprintln!("Rust: Failed to read response body: {}", e);
                        Err(FetchError::Other(format!(
                            "Failed to read response body: {}",
                            e
                        )))
                    }
                }
            } else {
                eprintln!("Rust: Request failed with status: {}", response.status());
                Err(FetchError::Network(format!(
                    "Request failed with status: {}",
                    response.status()
                )))
            }
        }
        Err(e) => {
            eprintln!("Rust: Failed to fetch URL: {}", e);
            Err(FetchError::Network(format!("Failed to fetch URL: {}", e)))
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RpcButton {
    label: String,
    url: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RpcAssets {
    large_image: Option<String>,
    large_text: Option<String>,
    small_image: Option<String>,
    small_text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RpcActivity {
    state: Option<String>,
    details: Option<String>,
    start_timestamp: Option<u64>,
    assets: Option<RpcAssets>,
    buttons: Option<Vec<RpcButton>>,
}

lazy_static! {
    static ref RPC_CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);
}

#[tauri::command]
fn rpc_connect() {
    let client_id = "1431984176097132726";

    match DiscordIpcClient::new(client_id) {
        Ok(mut client) => {
            if let Err(e) = client.connect() {
                println!("RPC: Не удалось подключиться к Discord: {:?}", e);
                return;
            }
            *RPC_CLIENT.lock().unwrap() = Some(client);
            println!("RPC: Успешно подключено к Discord.");
        }
        Err(e) => {
            println!("RPC: Не удалось создать клиент: {:?}", e);
        }
    }
}

#[tauri::command]
fn rpc_clear_activity() {
    if let Some(client) = &mut *RPC_CLIENT.lock().unwrap() {
        if let Err(e) = client.clear_activity() {
            println!("RPC: Не удалось очистить активность: {:?}", e);
        } else {
            println!("RPC: Активность очищена.");
        }
    }
}

#[tauri::command]
fn rpc_set_activity(activity_payload: RpcActivity) {
    if let Some(client) = &mut *RPC_CLIENT.lock().unwrap() {
        let mut activity_base = activity::Activity::new();

        if let Some(details) = &activity_payload.details {
            activity_base = activity_base.details(details);
        }
        if let Some(state) = &activity_payload.state {
            activity_base = activity_base.state(state);
        }

        if let Some(assets) = &activity_payload.assets {
            let mut activity_assets = activity::Assets::new();
            if let Some(large_image) = &assets.large_image {
                activity_assets = activity_assets.large_image(large_image);
            }
            if let Some(large_text) = &assets.large_text {
                activity_assets = activity_assets.large_text(large_text);
            }
            activity_base = activity_base.assets(activity_assets);
        }

        if let Some(start) = activity_payload.start_timestamp {
            let mut activity_timestamps = activity::Timestamps::new();
            activity_timestamps = activity_timestamps.start(start as i64);
            activity_base = activity_base.timestamps(activity_timestamps);
        }

        if let Some(buttons) = &activity_payload.buttons {
            let activity_buttons = buttons
                .iter()
                .map(|btn| activity::Button::new(&btn.label, &btn.url))
                .collect();
            activity_base = activity_base.buttons(activity_buttons);
        }

        if let Err(e) = client.set_activity(activity_base) {
            println!("RPC: Не удалось установить активность: {:?}", e);
        } else {
            println!("RPC: Активность обновлена.");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_badge_data,
            rpc_connect,
            rpc_clear_activity,
            rpc_set_activity
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
