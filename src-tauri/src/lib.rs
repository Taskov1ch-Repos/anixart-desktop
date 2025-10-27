use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use lazy_static::lazy_static;
use mime_guess;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

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
    match reqwest::get(&url).await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(text) => Ok(FetchResponse { content: text }),
                    Err(e) => Err(FetchError::Other(format!(
                        "Failed to read response body: {}",
                        e
                    ))),
                }
            } else {
                Err(FetchError::Network(format!(
                    "Request failed with status: {}",
                    response.status()
                )))
            }
        }
        Err(e) => Err(FetchError::Network(format!("Failed to fetch URL: {}", e))),
    }
}

#[derive(Debug, Serialize)]
struct CacheResponse {
    local_path: String,
    content_type: Option<String>,
}

fn get_cache_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let cache_base_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить папку данных приложения: {}", e))?;

    let media_cache_dir = cache_base_dir.join("media_cache");

    if !media_cache_dir.exists() {
        fs::create_dir_all(&media_cache_dir)
            .map_err(|e| format!("Не удалось создать папку кеша: {}", e))?;
    }
    Ok(media_cache_dir)
}

fn url_to_filename(url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[tauri::command]
async fn cache_media(
    url: String,
    app_handle: tauri::AppHandle,
) -> Result<CacheResponse, FetchError> {
    let cache_dir = get_cache_dir(&app_handle).map_err(FetchError::Other)?;

    let filename_base = url_to_filename(&url);

    if let Ok(entries) = fs::read_dir(&cache_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with(&filename_base) {
                    let existing_path = entry.path();
                    return Ok(CacheResponse {
                        local_path: existing_path.to_string_lossy().to_string(),
                        content_type: None,
                    });
                }
            }
        }
    }

    match reqwest::get(&url).await {
        Ok(response) => {
            if response.status().is_success() {
                let content_type = response
                    .headers()
                    .get(reqwest::header::CONTENT_TYPE)
                    .and_then(|value| value.to_str().ok())
                    .map(|s| s.to_string());

                let extension = content_type
                    .as_deref()
                    .and_then(|ct| mime_guess::get_mime_extensions_str(ct))
                    .and_then(|exts| exts.first().copied())
                    .or_else(|| {
                        Path::new(&url)
                            .extension()
                            .and_then(|os_str| os_str.to_str())
                    });

                let final_filename = extension
                    .map(|ext| format!("{}.{}", filename_base, ext))
                    .unwrap_or(filename_base);
                let final_cache_path = cache_dir.join(&final_filename);

                match response.bytes().await {
                    Ok(bytes) => match fs::File::create(&final_cache_path) {
                        Ok(mut file) => {
                            if let Err(e) = file.write_all(&bytes) {
                                let _ = fs::remove_file(&final_cache_path);
                                return Err(FetchError::Other(format!(
                                    "Failed to write cache file: {}",
                                    e
                                )));
                            }
                            Ok(CacheResponse {
                                local_path: final_cache_path.to_string_lossy().to_string(),
                                content_type: content_type,
                            })
                        }
                        Err(e) => Err(FetchError::Other(format!(
                            "Failed to create cache file: {}",
                            e
                        ))),
                    },
                    Err(e) => Err(FetchError::Other(format!(
                        "Failed to read response bytes: {}",
                        e
                    ))),
                }
            } else {
                Err(FetchError::Network(format!(
                    "Request failed with status: {}",
                    response.status()
                )))
            }
        }
        Err(e) => Err(FetchError::Network(format!("Failed to fetch URL: {}", e))),
    }
}

#[tauri::command]
async fn read_cached_media(path: String) -> Result<String, String> {
    match fs::File::open(&path) {
        Ok(mut file) => {
            let mut content = String::new();
            match file.read_to_string(&mut content) {
                Ok(_) => Ok(content),
                Err(e) => Err(format!("Не удалось прочитать файл кеша: {}", e)),
            }
        }
        Err(e) => Err(format!("Не удалось открыть файл кеша: {}", e)),
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
    if RPC_CLIENT.lock().unwrap().is_some() {
        return;
    }

    let client_id = "1431984176097132726";

    match DiscordIpcClient::new(client_id) {
        Ok(mut client) => {
            if let Err(e) = client.connect() {
                eprintln!("RPC: Failed to connect to Discord: {:?}", e);
                return;
            }
            *RPC_CLIENT.lock().unwrap() = Some(client);
            println!("RPC: Successfully connected to Discord.");
        }
        Err(e) => {
            eprintln!("RPC: Failed to create client: {:?}", e);
        }
    }
}

#[tauri::command]
fn rpc_disconnect() {
    if let Some(mut client) = RPC_CLIENT.lock().unwrap().take() {
        if let Err(e) = client.clear_activity() {
            eprintln!(
                "RPC: Failed to clear activity before disconnecting: {:?}",
                e
            );
        }

        if let Err(e) = client.close() {
            eprintln!("RPC: Failed to close connection to Discord: {:?}", e);
        } else {
            println!("RPC: Connection to Discord closed.");
        }
    }
}

#[tauri::command]
fn rpc_clear_activity() {
    if let Some(client) = &mut *RPC_CLIENT.lock().unwrap() {
        if let Err(e) = client.clear_activity() {
            eprintln!("RPC: Failed to clear activity: {:?}", e);
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
            if let Some(small_image) = &assets.small_image {
                activity_assets = activity_assets.small_image(small_image);
            }
            if let Some(small_text) = &assets.small_text {
                activity_assets = activity_assets.small_text(small_text);
            }
            activity_base = activity_base.assets(activity_assets);
        }

        if let Some(start) = activity_payload.start_timestamp {
            let mut activity_timestamps = activity::Timestamps::new();
            activity_timestamps = activity_timestamps.start(start as i64);
            activity_base = activity_base.timestamps(activity_timestamps);
        }

        if let Some(buttons) = &activity_payload.buttons {
            if !buttons.is_empty() {
                let activity_buttons: Vec<_> = buttons
                    .iter()
                    .map(|btn| activity::Button::new(&btn.label, &btn.url))
                    .collect();
                activity_base = activity_base.buttons(activity_buttons);
            }
        }

        if let Err(e) = client.set_activity(activity_base) {
            eprintln!("RPC: Failed to set activity: {:?}", e);
        }
    } else {
        eprintln!("RPC: Client not connected, cannot set activity.");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_badge_data,
            cache_media,
            read_cached_media,
            rpc_connect,
            rpc_disconnect,
            rpc_clear_activity,
            rpc_set_activity
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
