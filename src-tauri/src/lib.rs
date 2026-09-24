use std::fs;

use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_sql::{Migration, MigrationKind};

/// Versión de bible.db. La genera `pnpm import-bible` en resources/bible.version.
const BIBLE_DB_VERSION: &str = include_str!("../resources/bible.version");

/// El SQL de una migración con saltos de línea normalizados (CRLF → LF).
/// Importante: la base de datos guarda un checksum de cada migración aplicada. Si Git en Windows
/// cambia los saltos de línea al hacer checkout, el checksum cambiaría y la app no podría iniciar.
fn sql(text: &'static str) -> &'static str {
    if text.contains('\r') {
        Box::leak(text.replace("\r\n", "\n").into_boxed_str())
    } else {
        text
    }
}

/// Base de datos del usuario.
/// En desarrollo (`pnpm tauri dev`) se usa otra, `user-dev.db`, para que las pruebas no toquen
/// el progreso real ni apliquen migraciones que la app instalada todavía no conoce.
const USER_DB: &str = if cfg!(debug_assertions) {
    "sqlite:user-dev.db"
} else {
    "sqlite:user.db"
};

/// Dirección de la base de datos del usuario (la usa el frontend para abrirla).
#[tauri::command]
fn user_db_url() -> &'static str {
    USER_DB
}

/// Migraciones de la base de datos del usuario (user.db).
/// Regla: NUNCA editar una migración ya publicada; siempre agregar una nueva.
fn user_db_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: sql(include_str!("../migrations/0001_init.sql")),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "journal",
            sql: sql(include_str!("../migrations/0002_journal.sql")),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "verse_marks",
            sql: sql(include_str!("../migrations/0003_verse_marks.sql")),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "challenges",
            sql: sql(include_str!("../migrations/0004_challenges.sql")),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "emotions",
            sql: sql(include_str!("../migrations/0005_emotions.sql")),
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

/// Guarda el diario exportado. Solo acepta archivos .md (el usuario elige la ruta en el diálogo).
#[tauri::command]
fn write_markdown_file(path: String, contents: String) -> Result<(), String> {
    if !path.to_lowercase().ends_with(".md") {
        return Err("El archivo debe terminar en .md".into());
    }
    fs::write(&path, contents).map_err(|e| format!("No se pudo guardar el archivo: {e}"))
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
    // Si algo falla de forma inesperada, avisar con una ventana en vez de cerrarse sin decir nada.
    std::panic::set_hook(Box::new(|info| {
        report_error("Camino de Fe se cerró por un error", &info.to_string());
    }));

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    let builder = builder.plugin(
        tauri_plugin_autostart::Builder::new()
            .args([AUTOSTART_ARG])
            .build(),
    );

    let result = builder
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(USER_DB, user_db_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            write_backup_file,
            read_backup_file,
            auto_backups_dir,
            user_db_url,
            write_markdown_file
        ])
        .setup(|app| {
            if let Err(err) = install_bible_db(app) {
                // Se muestra con el diálogo de Tauri (funciona en todas las plataformas) y luego se cierra.
                let message = format!("No se pudo preparar la Biblia: {err}");
                let log = write_error_log(&message);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
                let handle = app.handle().clone();
                app.dialog()
                    .message(format!(
                        "{message}\n\nEl detalle quedó guardado en:\n{}",
                        log.display()
                    ))
                    .title("Camino de Fe no pudo iniciar")
                    .kind(MessageDialogKind::Error)
                    .show(move |_| handle.exit(1));
                return Ok(());
            }
            // Si Windows abrió la app al iniciar sesión, empieza minimizada para no molestar.
            if std::env::args().any(|a| a == AUTOSTART_ARG) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.minimize();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(err) = result {
        report_error("Camino de Fe no pudo iniciar", &err.to_string());
        std::process::exit(1);
    }
}

/// Guarda el detalle de un error en `error.log`, en la carpeta de datos de la app. Devuelve la ruta.
fn write_error_log(error: &str) -> std::path::PathBuf {
    let dir = std::env::var_os("APPDATA")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("com.youfrend.caminodefe");
    let _ = fs::create_dir_all(&dir);
    let log = dir.join("error.log");
    let _ = fs::write(
        &log,
        format!("Camino de Fe {}\n{}\n", env!("CARGO_PKG_VERSION"), error),
    );
    eprintln!("{error}");
    log
}

/// Para errores fuera del ciclo normal de la app (al iniciar o inesperados):
/// en Windows muestra una ventana de error en vez de cerrarse sin avisar.
fn report_error(title: &str, error: &str) {
    let log = write_error_log(error);
    #[cfg(windows)]
    let _ = rfd::MessageDialog::new()
        .set_level(rfd::MessageLevel::Error)
        .set_title(title)
        .set_description(format!(
            "{error}\n\nEl detalle quedó guardado en:\n{}",
            log.display()
        ))
        .set_buttons(rfd::MessageButtons::Ok)
        .show();
    #[cfg(not(windows))]
    let _ = (title, log);
}
