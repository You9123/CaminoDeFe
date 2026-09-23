# ADR-0001: Tauri 2 + React + TypeScript + SQLite

- **Estado:** aceptada
- **Fecha:** 2026-09-23

## Contexto

Camino de Fe empieza como app de escritorio para Windows y más adelante debe llegar a Android/iOS.
El desarrollador domina tecnologías web (VS Code, GitHub, servidores y bases de datos) y es su primera app de escritorio.

## Decisión

- **Tauri 2** como contenedor: instaladores de pocos MB, bajo consumo de memoria y soporte para Android/iOS con el mismo proyecto.
- **React + TypeScript + Vite + Tailwind** para la interfaz.
- **SQLite** local vía `tauri-plugin-sql`, sin servidor. Dos archivos: `bible.db` (solo lectura) y `user.db` (progreso).

## Alternativas descartadas

- **Electron:** más simple pero pesa más de 100 MB y no tiene versión móvil.
- **Flutter:** muy bueno para móvil, pero obliga a aprender Dart y no aprovecha la experiencia web.
- **.NET MAUI / WPF:** otro ecosistema (C#).

## Consecuencias

- Hay que instalar Rust y las C++ Build Tools, aunque casi no se escribe Rust.
- La lógica del juego se escribe en TypeScript puro (`src/domain/`), reutilizable en móvil.
