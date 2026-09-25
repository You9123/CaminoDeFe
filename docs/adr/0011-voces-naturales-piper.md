# ADR-0011: Voces naturales sin internet (Piper)

- **Estado:** aceptada
- **Fecha:** 2026-09-25

## Contexto

El modo escuchar (Documento Maestro §2.11, ADR-0006) usa las voces de Windows con la Web Speech API. Funcionan sin internet, pero suenan robóticas. El Documento Maestro dejaba como mejora opcional las voces neuronales de **Piper**, que son libres, corren en la propia computadora y suenan mucho más humanas. Es el Sprint 3D, el último de la V3.

## Decisión

- **Descarga a pedido, no en el instalador.** El motor (Piper 2023.11.14-2 para Windows, 22 MB) y cada voz (63–114 MB) se descargan solo si la persona elige una voz en Ajustes → Escuchar → Voces naturales. El instalador y las actualizaciones siguen igual de livianos. Se guardan en la carpeta de datos locales de la app (`%LOCALAPPDATA%\com.youfrend.caminodefe\piper\`), fuera del respaldo.
- **Catálogo** en `content/voices.json`, con 4 voces en español, primero las latinoamericanas:

  | Voz     | Id                    | Acento    | Tamaño | Licencia                  |
  | ------- | --------------------- | --------- | ------ | ------------------------- |
  | Claude  | `es_MX-claude-high`   | México    | 63 MB  | Apache 2.0                |
  | Ald     | `es_MX-ald-medium`    | México    | 63 MB  | Unlicense                 |
  | Daniela | `es_AR-daniela-high`  | Argentina | 114 MB | CC BY-SA 4.0 (OpenSLR 61) |
  | DaveFX  | `es_ES-davefx-medium` | España    | 63 MB  | CC0                       |

  Las direcciones apuntan a una **versión fija** del repositorio oficial `rhasspy/piper-voices` en Hugging Face (un commit, no `main`), así el archivo no cambia bajo nuestros pies. Las voces de varios hablantes (sharvard) y las de calidad muy baja quedaron fuera. Los créditos están en Ajustes → Acerca de.

- **Seguridad de las descargas** (`src-tauri/src/piper.rs`):
  - Rust solo descarga de `https://huggingface.co/rhasspy/piper-voices/` y `https://github.com/rhasspy/piper/releases/download/`.
  - Todo se comprueba con **SHA-256** antes de usarse. La huella del motor está fija en Rust, porque es un programa que se ejecuta; la de cada voz está en el catálogo. Se descarga a un `.part` y solo se renombra si la huella coincide.
  - Los ids de voz solo aceptan letras, números, `_` y `-`.
- **Cómo lee:** Piper queda abierto con la voz cargada (`--json-input`) y recibe un versículo por línea; devuelve un WAV que la interfaz reproduce con un `<audio>`. Mientras suena un versículo se prepara el siguiente, así casi no hay silencios. La velocidad se pasa como `--length_scale` (1 / velocidad); al cambiarla se vuelve a abrir Piper.
  - Se usan rutas **relativas** a la carpeta de Piper y solo el nombre del WAV que imprime, por precaución: piper.exe podría no abrir rutas absolutas con tildes o eñes (por ejemplo, si el usuario de Windows se llama "José").
  - En Windows se abre sin ventana de consola (`CREATE_NO_WINDOW`).
- **Elegir la voz:** la voz se guarda en el mismo ajuste de siempre (`tts_voice`) como `piper:<id>`. Si esa voz se borró, o si Piper falla (por ejemplo, si falta el componente Visual C++ de Microsoft), la app avisa una vez y **sigue con la voz de Windows**. Si no hay voces de Windows pero sí una natural, igual se puede escuchar.
- **Sin migración.** Nada nuevo en la base de datos.

## Consecuencias

- La primera vez hace falta internet y ~85 MB. Después funciona sin conexión, como el resto de la app.
- Piper consume algo de CPU mientras lee (en una PC normal prepara un versículo mucho más rápido de lo que tarda en sonar).
- Si en el futuro se quieren más voces, basta con agregarlas a `content/voices.json` con su huella; la prueba revisa el formato y que las direcciones sean de la misma versión.
- Piper original (`rhasspy/piper`) quedó archivado y el proyecto siguió en otro repositorio. La versión fijada funciona y está verificada. Si algún día deja de estar disponible en GitHub, las voces ya descargadas siguen funcionando; habría que cambiar la dirección y la huella del motor.
