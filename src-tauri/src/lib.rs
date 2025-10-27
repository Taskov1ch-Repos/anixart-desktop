use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// --- Added imports ---
use mime_guess;
use sha2::{Digest, Sha256};
use std::fs; // Use the standard library fs
use std::io::{Read, Write};
use std::path::{Path, PathBuf}; // Import both Path and PathBuf
use tauri::Manager; // Import the mime_guess crate
                    // --- End of added imports ---

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

// --- CODE ДЛЯ КЕШИРОВАНИЯ ---

#[derive(Debug, Serialize)]
struct CacheResponse {
    local_path: String,
    content_type: Option<String>,
}

// Хелпер для получения папки кеша
fn get_cache_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let cache_base_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить папку данных приложения: {}", e))?;

    let media_cache_dir = cache_base_dir.join("media_cache");

    if !media_cache_dir.exists() {
        fs::create_dir_all(&media_cache_dir) // Now fs is in scope
            .map_err(|e| format!("Не удалось создать папку кеша: {}", e))?;
    }
    Ok(media_cache_dir)
}

// Хелпер для генерации имени файла из URL
fn url_to_filename(url: &str) -> String {
    let mut hasher = Sha256::new(); // Now Sha256 is in scope
    hasher.update(url.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[tauri::command]
async fn cache_media(
    url: String,
    app_handle: tauri::AppHandle,
) -> Result<CacheResponse, FetchError> {
    println!("Rust: cache_media called with URL: {}", url);

    let cache_dir = match get_cache_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Err(FetchError::Other(e)),
    };

    let filename_base = url_to_filename(&url); // Get base filename without extension first
    let temp_cache_path = cache_dir.join(&filename_base); // Initial path guess

    // 1. Check if ANY file starting with the hash exists (could have different extensions)
    if let Ok(entries) = fs::read_dir(&cache_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with(&filename_base) {
                    let existing_path = entry.path();
                    println!("Rust: Media found in cache: {:?}", existing_path);
                    return Ok(CacheResponse {
                        local_path: existing_path.to_string_lossy().to_string(),
                        content_type: None, // Could try to guess from existing extension here too
                    });
                }
            }
        }
    }

    println!("Rust: Media not in cache. Fetching from URL: {}", url);
    // 2. If not, download
    match reqwest::get(&url).await {
        Ok(response) => {
            println!("Rust: Request status: {}", response.status());
            if response.status().is_success() {
                let content_type = response
                    .headers()
                    .get(reqwest::header::CONTENT_TYPE)
                    .and_then(|value| value.to_str().ok())
                    .map(|s| s.to_string());

                // Try to get extension from Content-Type or URL
                let extension = content_type
                    .as_deref()
                    .and_then(|ct| mime_guess::get_mime_extensions_str(ct)) // Now mime_guess is in scope
                    .and_then(|exts| exts.first().copied())
                    .or_else(|| {
                        Path::new(&url) // Now Path is in scope
                            .extension()
                            .and_then(|os_str| os_str.to_str())
                    });

                // Use filename_base and add extension if found
                let final_filename = if let Some(ext) = extension {
                    format!("{}.{}", filename_base, ext)
                } else {
                    filename_base // Keep base name if no extension found
                };
                let final_cache_path = cache_dir.join(&final_filename);

                match response.bytes().await {
                    Ok(bytes) => {
                        println!("Rust: Successfully fetched {} bytes", bytes.len());
                        // 3. Save to cache
                        match fs::File::create(&final_cache_path) {
                            // Now fs::File is in scope
                            Ok(mut file) => {
                                if let Err(e) = file.write_all(&bytes) {
                                    eprintln!("Rust: Failed to write to cache file: {}", e);
                                    // Remove partially written file
                                    let _ = fs::remove_file(&final_cache_path); // Now fs::remove_file is in scope
                                    return Err(FetchError::Other(format!(
                                        "Failed to write cache file: {}",
                                        e
                                    )));
                                }
                                println!("Rust: Media saved to cache: {:?}", final_cache_path);
                                Ok(CacheResponse {
                                    local_path: final_cache_path.to_string_lossy().to_string(),
                                    content_type: content_type,
                                })
                            }
                            Err(e) => {
                                eprintln!("Rust: Failed to create cache file: {}", e);
                                Err(FetchError::Other(format!(
                                    "Failed to create cache file: {}",
                                    e
                                )))
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Rust: Failed to read response bytes: {}", e);
                        Err(FetchError::Other(format!(
                            "Failed to read response bytes: {}",
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

#[tauri::command]
async fn read_cached_media(path: String) -> Result<String, String> {
    println!("Rust: read_cached_media called with path: {}", path);
    match fs::File::open(&path) {
        Ok(mut file) => {
            // file is std::fs::File
            let mut content = String::new();
            // Now read_to_string should be available because std::io::Read is in scope
            match file.read_to_string(&mut content) {
                Ok(_) => {
                    println!(
                        "Rust: Successfully read {} bytes from cache file",
                        content.len()
                    );
                    Ok(content)
                }
                Err(e) => {
                    eprintln!("Rust: Failed to read cache file content: {}", e);
                    Err(format!("Не удалось прочитать файл кеша: {}", e))
                }
            }
        }
        Err(e) => {
            eprintln!("Rust: Failed to open cache file: {}", e);
            Err(format!("Не удалось открыть файл кеша: {}", e))
        }
    }
}

// --- КОНЕЦ КОДА КЕШИРОВАНИЯ ---

// --- RPC КОД ---
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
        println!("RPC: Already connected.");
        return;
    }

    let client_id = "1431984176097132726"; // Replace with your actual client ID

    match DiscordIpcClient::new(client_id) {
        Ok(mut client) => {
            if let Err(e) = client.connect() {
                println!("RPC: Failed to connect to Discord: {:?}", e);
                return;
            }
            *RPC_CLIENT.lock().unwrap() = Some(client);
            println!("RPC: Successfully connected to Discord.");
        }
        Err(e) => {
            println!("RPC: Failed to create client: {:?}", e);
        }
    }
}

#[tauri::command]
fn rpc_disconnect() {
    if let Some(mut client) = RPC_CLIENT.lock().unwrap().take() {
        if let Err(e) = client.clear_activity() {
            println!(
                "RPC: Failed to clear activity before disconnecting: {:?}",
                e
            );
        } else {
            println!("RPC: Activity cleared before disconnecting.");
        }

        if let Err(e) = client.close() {
            println!("RPC: Failed to close connection to Discord: {:?}", e);
        } else {
            println!("RPC: Connection to Discord closed.");
        }
    } else {
        println!("RPC: No active connection to close.");
    }
}

#[tauri::command]
fn rpc_clear_activity() {
    if let Some(client) = &mut *RPC_CLIENT.lock().unwrap() {
        if let Err(e) = client.clear_activity() {
            println!("RPC: Failed to clear activity: {:?}", e);
        } else {
            println!("RPC: Activity cleared.");
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
                // Added small image handling
                activity_assets = activity_assets.small_image(small_image);
            }
            if let Some(small_text) = &assets.small_text {
                // Added small text handling
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
                // Check if buttons vec is not empty
                let activity_buttons: Vec<_> = buttons // Specify type for clarity
                    .iter()
                    .map(|btn| activity::Button::new(&btn.label, &btn.url))
                    .collect();
                activity_base = activity_base.buttons(activity_buttons);
            }
        }

        if let Err(e) = client.set_activity(activity_base) {
            println!("RPC: Failed to set activity: {:?}", e);
        } else {
            //println!("RPC: Activity updated: {:?}", activity_payload); // More detailed log if needed
            println!("RPC: Activity updated.");
        }
    } else {
        println!("RPC: Client not connected, cannot set activity.");
    }
}
// --- КОНЕЦ RPC КОДА ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_badge_data,
            cache_media, // Added new command
            read_cached_media,
            rpc_connect,
            rpc_disconnect,
            rpc_clear_activity,
            rpc_set_activity
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
