# ADR-0010: PIN del diario y actualizaciones automáticas

- **Estado:** aceptada
- **Fecha:** 2026-09-24

## Contexto

El Sprint 3C cierra dos pendientes: proteger el diario (Documento Maestro §2.9, "más adelante se podría proteger con PIN") y que la app se actualice sola desde GitHub Releases (§5, `tauri-plugin-updater`). El repositorio `You9123/CaminoDeFe` es público, así que sus Releases se pueden leer sin credenciales.

## Decisión

### PIN del diario

- **Qué protege:** es un **candado de la app** para miradas curiosas (otra persona que use la computadora). Pide el PIN para abrir el Diario y para exportar el respaldo (que incluye el diario). **No cifra** `user.db` ni las copias automáticas: quien tenga acceso a los archivos podría leerlos. Así se dice en Ajustes, sin prometer más de lo que hace.
- **PIN:** de 4 a 6 números. Si es muy fácil (1111, 1234, 4321…) se avisa, pero se permite.
- **Cómo se guarda:** nunca el PIN, solo su huella: PBKDF2-SHA256 con sal aleatoria de 16 bytes y 150 000 iteraciones (WebCrypto), en `settings.journal_pin` con el formato `pbkdf2-sha256$<iteraciones>$<sal>$<huella>`. La comparación es de tiempo constante.
- **Intentos fallidos:** 5 libres; después hay que esperar 30 s, 1 min, 2 min… hasta 15 min. Se guardan en `settings.journal_pin_failures` (`"cuántos|hasta cuándo"`), así que cerrar y abrir la app no reinicia la espera. Un acierto los borra.
- **PIN olvidado:** "¿Olvidaste tu PIN?" → "Pedir quitar el PIN" guarda la hora en `settings.journal_pin_reset_at`. **24 horas después** se puede quitar el PIN; las entradas no se tocan. Si mientras tanto alguien abre el diario con el PIN correcto, la solicitud se cancela y se avisa ("Se canceló la solicitud…"); también se ve y se puede cancelar en Ajustes → Privacidad. Cambiar la hora de Windows podría acortar la espera: se acepta, porque es un candado para curiosos, no una caja fuerte.
- **Cuándo se cierra:** al abrir la app, con el botón "Bloquear" del Diario, y si sales del Diario (o minimizas la app) por **10 minutos o más**.
- **Cambiar o quitar el PIN** pide el PIN actual.
- **Respaldo:** el respaldo incluye `settings`, así que lleva la huella del PIN. Al importar un respaldo con otro PIN, el diario se vuelve a cerrar.
- **Lógica pura** en `src/domain/pin.ts` (probada en `tests/v3-privacy-updates.test.ts`); estado en `src/stores/pinStore.ts`; pantallas en `src/components/PinLock.tsx` y `src/screens/settings/PrivacyFields.tsx`.

### Actualizaciones automáticas

- **Plugins:** `tauri-plugin-updater` y `tauri-plugin-process` (solo escritorio). Permisos `updater:default` y `process:allow-restart`.
- **Dónde busca:** `https://github.com/You9123/CaminoDeFe/releases/latest/download/latest.json`. Ese archivo lo genera `tauri-action` en el workflow de Release. **Solo cuenta un Release publicado**: mientras sea borrador, la app no lo ve.
- **Firma:** cada instalador se firma con una llave privada (minisign). La llave pública está en `tauri.conf.json` y la app **rechaza** cualquier descarga que no tenga una firma válida. La llave privada y su contraseña:
  - viven en la carpeta `keys/` del repositorio local (ignorada por Git) y deben guardarse también en otro lugar seguro: **si se pierden, las versiones instaladas ya no podrán actualizarse** (habría que reinstalar a mano con una llave nueva);
  - van en dos secretos del repositorio: `TAURI_SIGNING_PRIVATE_KEY` (el contenido del archivo `.key`) y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- **Solo firma el build de GitHub:** `bundle.createUpdaterArtifacts` está en `src-tauri/tauri.release.conf.json`, que el workflow pasa con `--config`. Así `pnpm tauri build` en la PC sigue funcionando sin la llave.
- **Cuándo busca:** al abrir la app, como mucho cada 6 horas, y nunca en `pnpm tauri dev`. Se puede apagar en Ajustes → Acerca de ("Buscar al abrir la app") y buscar a mano con "Buscar actualizaciones". Si no hay internet, la búsqueda automática falla en silencio.
- **Nunca se instala sola:** aparece un aviso en la barra lateral con las primeras líneas de las notas del Release. "Más tarde" lo esconde hasta el día siguiente. "Actualizar" guarda antes una **copia automática** de los datos (`antes-de-actualizar-….json`), descarga, instala con el instalador de Windows en modo `passive` (se ve una barra de progreso, sin preguntas) y la app se vuelve a abrir.
- **Privacidad:** solo se consulta GitHub. No se envía nada de los datos del usuario. Ajustes → Acerca de lo explica.
- **Primera vez:** la 2.2.0 y anteriores no tienen el actualizador, así que la **2.3.0 se instala a mano**. De ahí en adelante, cada Release publicado llega solo.

## Consecuencias

- La privacidad del diario es razonable para una computadora compartida en casa, sin la complejidad de cifrar la base de datos. Si en el futuro hace falta cifrado de verdad (por ejemplo, con cuentas en la V4), será otro ADR.
- Publicar una versión ahora tiene un paso más: revisar el borrador del Release, escribir las novedades en las primeras líneas (se ven en el aviso) y **publicarlo**.
- Perder la llave privada rompe las actualizaciones: está documentado en el README y en este ADR.
