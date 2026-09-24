use std::fs;

use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Versión de bible.db. La genera `pnpm import-bible` en resources/bible.version.
const BIBLE_DB_VERSION: &str = include_str!("../resources/bible.version");

/// Migraciones de la base de datos del usuario (user.db).
/// Regla: NUNCA editar una migración ya publicada; siempre agregar una nueva.
fn user_db_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "journal",
            sql: include_str!("../migrations/0002_journal.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "verse_marks",
            sql: include_str!("../migrations/0003_verse_marks.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

/// Copia bible.db (solo lectura, viene con el instalador) a la carpeta de datos de la app,
/// donde la encuentra el plugin SQL. Solo se copia si falta o si cambió de versión.
fn install_bible_db(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let src = app
        .path()
        .resolve("resources/bible.db", BaseDirectory::Resource)?;
    let dir = app.path().app_config_dir()?;
    fs::create_dir_all(&dir)?;

    let dest = dir.join("bible.db");
    let marker = dir.join("bible.version");
    let installed = fs::read_to_string(&marker).unwrap_or_default();

    if !dest.exists() || installed.trim() != BIBLE_DB_VERSION.trim() {
        fs::copy(&src, &dest)?;
        fs::write(&marker, BIBLE_DB_VERSION.trim())?;
    }
    Ok(())
}

// ---------- Respaldo ----------
// Comandos pequeños para leer y escribir el archivo de respaldo que el usuario elige
// en el diálogo de "Guardar" / "Abrir". Solo aceptan archivos .json.

fn ensure_json(path: &str) -> Result<(), String> {
    if path.to_lowercase().ends_with(".json") {
        Ok(())
    } else {
        Err("El respaldo debe ser un archivo .json".into())
    }
}

#[tauri::command]
fn write_backup_file(path: String, contents: String) -> Result<(), String> {
    ensure_json(&path)?;
    fs::write(&path, contents).map_err(|e| format!("No se pudo guardar el respaldo: {e}"))
}

#[tauri::command]
fn read_backup_file(path: String) -> Result<String, String> {
    ensure_json(&path)?;
    fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el respaldo: {e}"))
}

/// Carpeta donde se guardan las copias automáticas (antes de importar un respaldo).
#[tauri::command]
fn auto_backups_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("respaldos");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().into_owned())
}

/// Argumento con el que Windows abre la app al iniciar sesión (si el usuario lo activó).
const AUTOSTART_ARG: &str = "--autostart";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    let builder = builder.plugin(
        tauri_plugin_autostart::Builder::new()
            .args([AUTOSTART_ARG])
            .build(),
    );

    builder
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:user.db", user_db_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            write_backup_file,
            read_backup_file,
            auto_backups_dir
        ])
        .setup(|app| {
            install_bible_db(app)?;
            // Si Windows abrió la app al iniciar sesión, empieza minimizada para no molestar.
            if std::env::args().any(|a| a == AUTOSTART_ARG) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.minimize();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Camino de Fe");
}
