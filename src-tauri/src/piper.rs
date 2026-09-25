//! Voces naturales sin internet con Piper (ADR-0011).
//!
//! - El motor (piper.exe y sus bibliotecas, ~22 MB) y cada voz (~60–120 MB) se descargan solo si
//!   la persona elige una voz natural. Se guardan en la carpeta de datos locales de la app.
//! - Todo se verifica con SHA-256 antes de usarse. La huella del motor está fija aquí (es un
//!   programa que se ejecuta); la de cada voz viene del catálogo `content/voices.json`.
//! - Solo se descarga de dos lugares: las voces oficiales de Piper en Hugging Face y los
//!   Releases oficiales de Piper en GitHub.
//! - Piper queda abierto con la voz cargada y recibe una frase por línea (`--json-input`), así
//!   cada versículo tarda poco. Devuelve un WAV que la interfaz reproduce.

use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::Mutex;

use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::ipc::Response;
use tauri::{AppHandle, Emitter, Manager, State};

const ALLOWED_PREFIXES: &[&str] = &[
    "https://huggingface.co/rhasspy/piper-voices/",
    "https://github.com/rhasspy/piper/releases/download/",
];

#[allow(dead_code)] // En cada sistema se usa una sola.
enum ArchiveKind {
    Zip,
    TarGz,
}

struct EngineInfo {
    url: &'static str,
    sha256: &'static str,
    kind: ArchiveKind,
    /// Ruta del ejecutable dentro de la carpeta del motor.
    exe: &'static str,
}

#[cfg(windows)]
const ENGINE: EngineInfo = EngineInfo {
    url: "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip",
    sha256: "f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea",
    kind: ArchiveKind::Zip,
    exe: "piper/piper.exe",
};

/// Solo para probar en Linux (la app se publica para Windows).
#[cfg(not(windows))]
const ENGINE: EngineInfo = EngineInfo {
    url:
        "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz",
    sha256: "a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992",
    kind: ArchiveKind::TarGz,
    exe: "piper/piper",
};

/// Piper abierto con una voz y una velocidad.
struct Running {
    voice: String,
    length_scale: String,
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl Drop for Running {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[derive(Default)]
pub struct PiperState(Mutex<Option<Running>>);

#[derive(Serialize)]
pub struct PiperStatus {
    engine: bool,
    voices: Vec<String>,
}

#[derive(Clone, Serialize)]
struct Progress<'a> {
    id: &'a str,
    downloaded: u64,
    total: Option<u64>,
}

fn base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("piper");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn engine_exe(base: &Path) -> PathBuf {
    base.join("engine").join(ENGINE.exe)
}

fn voices_dir(base: &Path) -> Result<PathBuf, String> {
    let dir = base.join("voices");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Un id de voz como "es_MX-ald-medium": solo letras, números, "_" y "-".
fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn allowed(url: &str) -> bool {
    ALLOWED_PREFIXES.iter().any(|p| url.starts_with(p)) && !url.contains("..")
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Descarga `url` a `dest` avisando el avance y comprobando la huella SHA-256.
/// Se escribe primero en un ".part": un archivo a medias nunca queda con el nombre final.
async fn download(
    app: &AppHandle,
    id: &str,
    url: &str,
    sha256: &str,
    dest: &Path,
) -> Result<(), String> {
    if !allowed(url) {
        return Err(format!("Dirección no permitida: {url}"));
    }
    let _ = rustls::crypto::ring::default_provider().install_default();
    let client = reqwest::Client::builder()
        .user_agent(concat!("CaminoDeFe/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("No se pudo descargar: {e}"))?;
    let total = resp.content_length();
    let part = dest.with_extension("part");
    let mut file = File::create(&part).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_emit: u64 = 0;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Se cortó la descarga: {e}"))?;
        hasher.update(&chunk);
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        if downloaded - last_emit >= 512 * 1024 {
            last_emit = downloaded;
            let _ = app.emit(
                "piper-progress",
                Progress {
                    id,
                    downloaded,
                    total,
                },
            );
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    drop(file);
    let got = hex(&hasher.finalize());
    if !got.eq_ignore_ascii_case(sha256) {
        let _ = fs::remove_file(&part);
        return Err("El archivo descargado no coincide con el original, así que no se usó. Inténtalo de nuevo.".into());
    }
    let _ = app.emit(
        "piper-progress",
        Progress {
            id,
            downloaded,
            total,
        },
    );
    fs::rename(&part, dest).map_err(|e| e.to_string())
}

fn extract(archive: &Path, kind: &ArchiveKind, dest: &Path) -> Result<(), String> {
    let file = File::open(archive).map_err(|e| e.to_string())?;
    match kind {
        ArchiveKind::Zip => zip::ZipArchive::new(file)
            .and_then(|mut z| z.extract(dest))
            .map_err(|e| e.to_string()),
        ArchiveKind::TarGz => tar::Archive::new(flate2::read::GzDecoder::new(file))
            .unpack(dest)
            .map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub fn piper_status(app: AppHandle) -> Result<PiperStatus, String> {
    let base = base_dir(&app)?;
    let mut voices = Vec::new();
    for entry in fs::read_dir(voices_dir(&base)?).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|e| e.to_str()) == Some("onnx")
            && path.with_extension("onnx.json").exists()
        {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                voices.push(stem.to_string());
            }
        }
    }
    voices.sort();
    Ok(PiperStatus {
        engine: engine_exe(&base).exists(),
        voices,
    })
}

/// Descarga y abre el motor (una sola vez).
#[tauri::command]
pub async fn piper_install_engine(app: AppHandle) -> Result<(), String> {
    let base = base_dir(&app)?;
    if engine_exe(&base).exists() {
        return Ok(());
    }
    let archive = base.join(match ENGINE.kind {
        ArchiveKind::Zip => "engine.zip",
        ArchiveKind::TarGz => "engine.tar.gz",
    });
    download(&app, "engine", ENGINE.url, ENGINE.sha256, &archive).await?;
    let tmp = base.join("engine.tmp");
    let _ = fs::remove_dir_all(&tmp);
    let result = extract(&archive, &ENGINE.kind, &tmp);
    let _ = fs::remove_file(&archive);
    result?;
    let final_dir = base.join("engine");
    let _ = fs::remove_dir_all(&final_dir);
    fs::rename(&tmp, &final_dir).map_err(|e| e.to_string())?;
    if !engine_exe(&base).exists() {
        return Err("El motor de voz no se instaló bien. Inténtalo de nuevo.".into());
    }
    Ok(())
}

/// Descarga una voz del catálogo: su configuración (.onnx.json) y el modelo (.onnx).
#[tauri::command]
pub async fn piper_install_voice(
    app: AppHandle,
    id: String,
    model_url: String,
    model_sha256: String,
    config_url: String,
    config_sha256: String,
) -> Result<(), String> {
    if !valid_id(&id) {
        return Err("Voz no válida".into());
    }
    let dir = voices_dir(&base_dir(&app)?)?;
    let config = dir.join(format!("{id}.onnx.json"));
    let model = dir.join(format!("{id}.onnx"));
    // Primero el modelo y después la configuración: la voz cuenta como instalada cuando están los dos.
    download(&app, &id, &model_url, &model_sha256, &model).await?;
    download(&app, &id, &config_url, &config_sha256, &config).await?;
    Ok(())
}

#[tauri::command]
pub fn piper_remove_voice(
    app: AppHandle,
    state: State<'_, PiperState>,
    id: String,
) -> Result<(), String> {
    if !valid_id(&id) {
        return Err("Voz no válida".into());
    }
    {
        let mut running = state.0.lock().map_err(|e| e.to_string())?;
        if running.as_ref().is_some_and(|r| r.voice == id) {
            *running = None;
        }
    }
    let dir = voices_dir(&base_dir(&app)?)?;
    for name in [format!("{id}.onnx"), format!("{id}.onnx.json")] {
        let path = dir.join(name);
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Cierra Piper (al detener la lectura no hace falta, pero libera memoria al quitar voces).
#[tauri::command]
pub fn piper_stop(state: State<'_, PiperState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

fn start(base: &Path, voice: &str, length_scale: &str) -> Result<Running, String> {
    let exe = engine_exe(base);
    let model = voices_dir(base)?.join(format!("{voice}.onnx"));
    if !exe.exists() || !model.exists() {
        return Err("La voz natural no está instalada.".into());
    }
    let out_dir = base.join("tmp");
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    let log = File::create(base.join("piper.log")).map_err(|e| e.to_string())?;
    // Rutas relativas a la carpeta de Piper: si el nombre de usuario de Windows tiene tildes o eñes,
    // piper.exe no sabría abrir rutas absolutas con esos caracteres.
    let rel_model = Path::new("voices").join(format!("{voice}.onnx"));
    let rel_espeak = Path::new("engine")
        .join(ENGINE.exe)
        .with_file_name("espeak-ng-data");
    let mut cmd = Command::new(&exe);
    cmd.arg("--model")
        .arg(&rel_model)
        .arg("--espeak_data")
        .arg(&rel_espeak)
        .arg("--json-input")
        .arg("--output_dir")
        .arg("tmp")
        .arg("--length_scale")
        .arg(length_scale)
        .arg("--sentence_silence")
        .arg("0.25")
        .current_dir(base)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::from(log));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("No se pudo abrir el motor de voz: {e}"))?;
    let stdin = child.stdin.take().ok_or("Sin entrada")?;
    let stdout = BufReader::new(child.stdout.take().ok_or("Sin salida")?);
    Ok(Running {
        voice: voice.to_string(),
        length_scale: length_scale.to_string(),
        child,
        stdin,
        stdout,
    })
}

/// Explica por qué terminó Piper. En Windows, 0xC0000135 = falta una DLL (Visual C++).
fn crash_message(run: &mut Running, base: &Path) -> String {
    let code = run.child.try_wait().ok().flatten().and_then(|s| s.code());
    if code == Some(0xC000_0135_u32 as i32) {
        return "Falta un componente de Windows: Microsoft Visual C++ (descárgalo de https://aka.ms/vs/17/release/vc_redist.x64.exe, instálalo y vuelve a intentar).".into();
    }
    let mut log = String::new();
    let _ = File::open(base.join("piper.log")).and_then(|mut f| f.read_to_string(&mut log));
    let last = log
        .lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .unwrap_or("");
    format!("El motor de voz se cerró inesperadamente. {last}")
}

fn synthesize(run: &mut Running, text: &str) -> Result<Option<PathBuf>, String> {
    let line = serde_json::json!({ "text": text }).to_string();
    if writeln!(run.stdin, "{line}")
        .and_then(|_| run.stdin.flush())
        .is_err()
    {
        return Ok(None);
    }
    let mut out = String::new();
    let n = run.stdout.read_line(&mut out).map_err(|e| e.to_string())?;
    if n == 0 {
        return Ok(None); // Piper se cerró
    }
    Ok(Some(PathBuf::from(out.trim())))
}

/// Lee `text` con la voz `voice` y devuelve el WAV. `rate` es la velocidad (1 = normal).
#[tauri::command]
pub async fn piper_speak(
    app: AppHandle,
    voice: String,
    text: String,
    rate: f32,
) -> Result<Response, String> {
    if !valid_id(&voice) {
        return Err("Voz no válida".into());
    }
    let text: String = text
        .chars()
        .map(|c| if c.is_control() { ' ' } else { c })
        .collect();
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("Texto vacío".into());
    }
    let rate = if rate.is_finite() {
        rate.clamp(0.5, 2.0)
    } else {
        1.0
    };
    // Piper usa "length_scale": más grande = más lento.
    let length_scale = format!("{:.2}", 1.0 / rate);
    let base = base_dir(&app)?;

    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<PiperState>();
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        for attempt in 0..2 {
            let reuse = guard
                .as_ref()
                .is_some_and(|r| r.voice == voice && r.length_scale == length_scale);
            if !reuse {
                *guard = None;
                *guard = Some(start(&base, &voice, &length_scale)?);
            }
            let run = guard.as_mut().ok_or("Sin motor")?;
            match synthesize(run, &text)? {
                Some(printed) => {
                    // Piper escribe la ruta completa; se usa solo el nombre del archivo (números),
                    // por si la ruta tiene caracteres que Windows le pasó mal.
                    let name = printed.file_name().ok_or("Piper no devolvió el audio")?;
                    let path = base.join("tmp").join(name);
                    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
                    let _ = fs::remove_file(&path);
                    return Ok(Response::new(bytes));
                }
                None if attempt == 0 => {
                    // Piper se cerró: se vuelve a abrir una vez.
                    let msg = crash_message(run, &base);
                    *guard = None;
                    if msg.contains("Visual C++") {
                        return Err(msg);
                    }
                }
                None => {
                    let msg = crash_message(run, &base);
                    *guard = None;
                    return Err(msg);
                }
            }
        }
        Err("No se pudo leer el texto.".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_y_direcciones() {
        assert!(valid_id("es_MX-ald-medium"));
        assert!(!valid_id("../x"));
        assert!(!valid_id(""));
        assert!(allowed(
            "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/x.onnx"
        ));
        assert!(!allowed("https://huggingface.co/otro/x.onnx"));
        assert!(!allowed(
            "https://huggingface.co/rhasspy/piper-voices/../../otro"
        ));
        assert!(!allowed("http://huggingface.co/rhasspy/piper-voices/x"));
    }
}
