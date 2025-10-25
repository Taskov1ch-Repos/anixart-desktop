use serde::Serialize;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, fetch_badge_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
