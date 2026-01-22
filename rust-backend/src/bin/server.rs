use axum::{
    extract::{Query, State, WebSocketUpgrade},
    http::{header, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use fontra_backend_rust::{
    error::Result,
    fontra_backend::FontraBackend,
    project_manager::FileSystemProjectManager,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::services::ServeDir;
use tracing::{info, warn};

/// Server state shared across all handlers
#[derive(Clone)]
struct AppState {
    project_manager: Arc<RwLock<FileSystemProjectManager>>,
    host: String,
    port: u16,
}

/// Query parameters for project selection
#[derive(Deserialize)]
struct ProjectQuery {
    project: Option<String>,
}

/// Server information response
#[derive(Serialize)]
struct ServerInfo {
    #[serde(rename = "Fontra version")]
    fontra_version: String,
    #[serde(rename = "Rust version")]
    rust_version: String,
    #[serde(rename = "Startup time")]
    startup_time: String,
    #[serde(rename = "Project manager")]
    project_manager: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    // Parse command line arguments
    let args: Vec<String> = std::env::args().collect();
    
    // Default values
    let host = "localhost".to_string();
    let port = 8000u16;
    let path = if args.len() > 1 {
        Some(args[1].clone())
    } else {
        None
    };

    // Create project manager
    let project_manager = FileSystemProjectManager::new(path, 3, false)?;
    
    let state = AppState {
        project_manager: Arc::new(RwLock::new(project_manager)),
        host: host.clone(),
        port,
    };

    // Build router
    let app = Router::new()
        .route("/", get(root_handler))
        .route("/websocket", get(websocket_handler))
        .route("/projectlist", get(project_list_handler))
        .route("/serverinfo", get(server_info_handler))
        .route("/api/:function", post(api_handler))
        // Serve static files from the Python client directory for now
        // This will need to be updated to point to built JavaScript assets
        .fallback(static_handler)
        .with_state(state.clone());

    // Bind and serve
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    
    print_banner(&host, port);
    
    info!("Starting Fontra Rust server on {}:{}", host, port);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn print_banner(host: &str, port: u16) {
    let pad = " ".repeat(22 - port.to_string().len() - host.len());
    println!("+---------------------------------------------------+");
    println!("|                                                   |");
    println!("|      Fontra! (Rust Edition)                       |");
    println!("|                                                   |");
    println!("|      Navigate to:                                 |");
    println!("|      http://{}:{}/ {}              |", host, port, pad);
    println!("|                                                   |");
    println!("+---------------------------------------------------+");
}

/// Root handler - serves landing page
async fn root_handler(State(state): State<AppState>) -> Response {
    // For now, return a simple HTML page
    // In production, this would serve the actual Fontra landing page
    let html = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Fontra - Rust Edition</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-top: 0;
        }
        .status {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        a {
            color: #1976d2;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .endpoints {
            margin-top: 30px;
        }
        .endpoint {
            margin: 10px 0;
            padding: 10px;
            background: #f9f9f9;
            border-left: 3px solid #1976d2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🦀 Fontra - Rust Edition</h1>
        <div class="status">
            <strong>Status:</strong> Server running successfully!<br>
            <strong>Implementation:</strong> Pure Rust - No Python required
        </div>
        
        <p>
            This is a pure Rust implementation of the Fontra font editor backend,
            using the fontations crate ecosystem for font operations.
        </p>
        
        <div class="endpoints">
            <h2>Available Endpoints:</h2>
            <div class="endpoint">
                <strong>GET <a href="/projectlist">/projectlist</a></strong><br>
                List all available font projects
            </div>
            <div class="endpoint">
                <strong>GET <a href="/serverinfo">/serverinfo</a></strong><br>
                Server information and status
            </div>
            <div class="endpoint">
                <strong>GET /websocket?project=&lt;path&gt;</strong><br>
                WebSocket connection for real-time editing
            </div>
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
            <strong>Note:</strong> The full JavaScript frontend integration is in progress.
            This server currently provides the backend API endpoints.
        </p>
    </div>
</body>
</html>
    "#;
    
    Html(html).into_response()
}

/// WebSocket handler for real-time communication
async fn websocket_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<ProjectQuery>,
    State(state): State<AppState>,
) -> Response {
    let project_id = match params.project {
        Some(p) => p,
        None => {
            return (StatusCode::BAD_REQUEST, "Missing project parameter").into_response();
        }
    };

    info!("WebSocket connection requested for project: {}", project_id);

    ws.on_upgrade(move |socket| handle_websocket(socket, project_id, state))
}

/// Handle WebSocket connection
async fn handle_websocket(
    socket: axum::extract::ws::WebSocket,
    project_id: String,
    state: AppState,
) {
    info!("WebSocket connected for project: {}", project_id);
    
    // TODO: Implement RemoteObject protocol
    // For now, just accept the connection and close it
    // This will be implemented in a future commit
    
    warn!("WebSocket handler not yet fully implemented");
}

/// Project list handler
async fn project_list_handler(State(state): State<AppState>) -> Response {
    let pm = state.project_manager.read().await;
    
    match pm.get_project_list("token".to_string()) {
        Ok(projects) => Json(projects).into_response(),
        Err(e) => {
            warn!("Error getting project list: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Error: {:?}", e)).into_response()
        }
    }
}

/// Server info handler
async fn server_info_handler(State(state): State<AppState>) -> Response {
    let startup_time = chrono::Utc::now().to_rfc3339();
    
    let info = ServerInfo {
        fontra_version: env!("CARGO_PKG_VERSION").to_string(),
        rust_version: "1.70+".to_string(),
        startup_time,
        project_manager: "FileSystemProjectManager (Rust)".to_string(),
    };
    
    Json(info).into_response()
}

/// API handler for various functions
async fn api_handler() -> Response {
    // TODO: Implement API functions
    (StatusCode::NOT_IMPLEMENTED, "API handler not yet implemented").into_response()
}

/// Static file handler
async fn static_handler(uri: Uri) -> Response {
    // For now, return 404 for static files
    // This will be implemented to serve the JavaScript frontend
    (StatusCode::NOT_FOUND, "Static file serving not yet implemented").into_response()
}
