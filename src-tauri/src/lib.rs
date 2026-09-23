use std::fs;

use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Versión de bible.db. La genera `pnpm import-bible` en resources/bible.version.
const BIBLE_DB_VERSION: &str = include_str!("../resources/bible.version");

/// Migraciones de la base de datos del usuario (user.db).
/// Regla: NUNCA editar una migración ya publicada; siempre agregar una nueva.
fn user_db_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }]
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:user.db", user_db_migrations())
                .build(),
        )
        .setup(|app| {
            install_bible_db(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Camino de Fe");
}
