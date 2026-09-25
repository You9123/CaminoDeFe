/**
 * Sprint 3C: PIN del diario y actualizaciones automáticas (ADR-0010).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canReset,
  cleanPinInput,
  FIRST_WAIT_MS,
  hashPin,
  isEasyPin,
  isPinHash,
  lockRemaining,
  MAX_WAIT_MS,
  NO_FAILURES,
  parseFailures,
  pinProblem,
  registerFailure,
  RELOCK_AFTER_MS,
  RESET_WAIT_MS,
  resetReadyAt,
  serializeFailures,
  shouldRelock,
  verifyPin,
  waitAfter,
  waitLabel,
  type Failures,
} from "../src/domain/pin";
import {
  AUTO_CHECK_EVERY_MS,
  compareVersions,
  dismissKey,
  downloadPercent,
  formatMegabytes,
  isDismissed,
  shortNotes,
  shouldAutoCheck,
} from "../src/domain/updates";

describe("PIN: validar", () => {
  it("acepta de 4 a 6 números", () => {
    expect(pinProblem("1234")).toBeNull();
    expect(pinProblem("739105")).toBeNull();
    expect(pinProblem("123")).toMatch(/al menos 4/);
    expect(pinProblem("1234567")).toMatch(/máximo 6/);
    expect(pinProblem("12a4")).toMatch(/solo números/);
    expect(pinProblem("")).toMatch(/al menos/);
  });

  it("limpia lo que se escribe", () => {
    expect(cleanPinInput("12 3a4-5678")).toBe("123456");
    expect(cleanPinInput("")).toBe("");
  });

  it("avisa de los PIN fáciles", () => {
    for (const p of ["1111", "1234", "4321", "123456", "7890", "0000"]) expect(isEasyPin(p), p).toBe(true);
    for (const p of ["1357", "2580", "739105", "123"]) expect(isEasyPin(p), p).toBe(false);
  });
});

describe("PIN: huella", () => {
  it("nunca guarda el PIN y lo reconoce", async () => {
    const h = await hashPin("2468", 1000);
    expect(isPinHash(h)).toBe(true);
    expect(h).not.toContain("2468");
    expect(h.split("$")).toHaveLength(4);
    expect(await verifyPin("2468", h)).toBe(true);
    expect(await verifyPin("2469", h)).toBe(false);
    expect(await verifyPin("24680", h)).toBe(false);
  });

  it("usa sal: el mismo PIN da huellas distintas", async () => {
    const [a, b] = await Promise.all([hashPin("1357", 1000), hashPin("1357", 1000)]);
    expect(a).not.toBe(b);
    expect(await verifyPin("1357", a)).toBe(true);
    expect(await verifyPin("1357", b)).toBe(true);
  });

  it("una huella dañada nunca abre", async () => {
    const h = await hashPin("1357", 1000);
    for (const bad of [
      "",
      "hola",
      "pbkdf2-sha256$x$y$z",
      h.replace("pbkdf2", "md5"),
      h.slice(0, -8),
      "pbkdf2-sha256$0$AA==$AA==",
    ])
      expect(await verifyPin("1357", bad), bad).toBe(false);
    expect(isPinHash(null)).toBe(false);
  });

  it("no acepta un PIN inválido al crearlo", async () => {
    await expect(hashPin("12")).rejects.toThrow(/al menos/);
  });
});

describe("PIN: intentos fallidos", () => {
  it("5 intentos libres; después la espera crece hasta 15 minutos", () => {
    expect([1, 2, 3, 4].map(waitAfter)).toEqual([0, 0, 0, 0]);
    expect(waitAfter(5)).toBe(FIRST_WAIT_MS);
    expect(waitAfter(6)).toBe(FIRST_WAIT_MS * 2);
    expect(waitAfter(7)).toBe(FIRST_WAIT_MS * 4);
    expect(waitAfter(30)).toBe(MAX_WAIT_MS);
  });

  it("cuenta los fallos y dice cuánto falta", () => {
    let f: Failures = NO_FAILURES;
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) f = registerFailure(f, t0);
    expect(f).toEqual({ count: 4, until: null });
    expect(lockRemaining(f, t0)).toBe(0);
    f = registerFailure(f, t0);
    expect(f.count).toBe(5);
    expect(lockRemaining(f, t0)).toBe(30_000);
    expect(lockRemaining(f, t0 + 29_000)).toBe(1_000);
    expect(lockRemaining(f, t0 + 31_000)).toBe(0);
  });

  it("se guarda y se lee (y lo que no se entiende cuenta como cero)", () => {
    const f = { count: 6, until: 1727190000000 };
    expect(parseFailures(serializeFailures(f))).toEqual(f);
    expect(parseFailures(serializeFailures({ count: 2, until: null }))).toEqual({ count: 2, until: null });
    expect(parseFailures(null)).toEqual(NO_FAILURES);
    expect(parseFailures("basura")).toEqual(NO_FAILURES);
    expect(parseFailures("-3|")).toEqual(NO_FAILURES);
  });

  it("dice la espera en palabras", () => {
    expect(waitLabel(30_000)).toBe("30 segundos");
    expect(waitLabel(1_000)).toBe("1 segundo");
    expect(waitLabel(60_000)).toBe("1 minuto");
    expect(waitLabel(61_000)).toBe("2 minutos");
  });
});

describe("PIN olvidado y volver a cerrar", () => {
  it("se puede quitar recién 24 horas después de pedirlo", () => {
    const t = 5_000_000;
    expect(resetReadyAt(t)).toBe(t + RESET_WAIT_MS);
    expect(canReset(null, t + RESET_WAIT_MS * 2)).toBe(false);
    expect(canReset(t, t + RESET_WAIT_MS - 1)).toBe(false);
    expect(canReset(t, t + RESET_WAIT_MS)).toBe(true);
  });

  it("se vuelve a cerrar si saliste del diario por 10 minutos o más", () => {
    expect(shouldRelock(null, 99)).toBe(false);
    expect(shouldRelock(0, RELOCK_AFTER_MS - 1)).toBe(false);
    expect(shouldRelock(0, RELOCK_AFTER_MS)).toBe(true);
  });
});

describe("Actualizaciones", () => {
  it("busca al abrir, como mucho cada 6 horas, y nunca si lo apagaste", () => {
    const now = 100 * AUTO_CHECK_EVERY_MS;
    expect(shouldAutoCheck(true, null, now)).toBe(true);
    expect(shouldAutoCheck(true, now - AUTO_CHECK_EVERY_MS + 1, now)).toBe(false);
    expect(shouldAutoCheck(true, now - AUTO_CHECK_EVERY_MS, now)).toBe(true);
    expect(shouldAutoCheck(true, Number.NaN, now)).toBe(true);
    expect(shouldAutoCheck(false, null, now)).toBe(false);
  });

  it("'Más tarde' esconde esa versión solo por ese día", () => {
    const stored = dismissKey("2.4.0", "2026-09-24");
    expect(isDismissed(stored, "2.4.0", "2026-09-24")).toBe(true);
    expect(isDismissed(stored, "2.4.0", "2026-09-25")).toBe(false);
    expect(isDismissed(stored, "2.5.0", "2026-09-24")).toBe(false);
    expect(isDismissed(null, "2.4.0", "2026-09-24")).toBe(false);
  });

  it("compara versiones como números", () => {
    expect(compareVersions("2.10.0", "2.9.3")).toBe(1);
    expect(compareVersions("v2.3.0", "2.3.0")).toBe(0);
    expect(compareVersions("2.3.0", "2.3.1")).toBe(-1);
    expect(compareVersions("3", "2.99.99")).toBe(1);
  });

  it("muestra el avance de la descarga", () => {
    expect(downloadPercent(0, null)).toBeNull();
    expect(downloadPercent(5, 0)).toBeNull();
    expect(downloadPercent(512, 1024)).toBe(50);
    expect(downloadPercent(2048, 1024)).toBe(100);
    expect(formatMegabytes(12_400_000)).toBe("12,4 MB");
  });

  it("las notas se ven limpias y sin la línea del instalador", () => {
    const body =
      "## Novedades\n\n- **PIN** para el [diario](https://x.y)\n- Actualizaciones\n<!-- privado -->\nPara instalarla por primera vez, descarga el archivo que termina en -setup.exe.\nhttps://github.com/x";
    expect(shortNotes(body)).toEqual(["PIN para el diario", "Actualizaciones"]);
    expect(shortNotes(undefined)).toEqual([]);
    expect(shortNotes("a\nb\nc\nd\ne", 2)).toEqual(["a", "b"]);
  });
});

describe("Configuración del actualizador", () => {
  const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const release = JSON.parse(readFileSync("src-tauri/tauri.release.conf.json", "utf8"));
  const workflow = readFileSync(".github/workflows/release.yml", "utf8");
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const cargo = readFileSync("src-tauri/Cargo.toml", "utf8");

  it("busca latest.json en GitHub Releases del repositorio y tiene la llave pública", () => {
    const u = conf.plugins.updater;
    expect(u.endpoints).toEqual(["https://github.com/You9123/CaminoDeFe/releases/latest/download/latest.json"]);
    expect(atob(u.pubkey)).toMatch(/minisign public key/);
    expect(u.windows.installMode).toBe("passive");
  });

  it("solo el build de GitHub firma (en tu PC no hace falta la llave privada)", () => {
    expect(conf.bundle.createUpdaterArtifacts).toBeUndefined();
    expect(release.bundle.createUpdaterArtifacts).toBe(true);
    expect(workflow).toContain("--config src-tauri/tauri.release.conf.json");
    expect(workflow).toContain("secrets.TAURI_SIGNING_PRIVATE_KEY");
    expect(workflow).toContain("secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD");
  });

  it("la llave privada nunca se sube", () => {
    const ignore = readFileSync(".gitignore", "utf8");
    expect(ignore).toMatch(/^keys\/$/m);
    expect(ignore).toMatch(/^\*\.key$/m);
  });

  it("la versión es la misma en todas partes", () => {
    const cargoVersion = /^version = "([^"]+)"/m.exec(cargo)?.[1];
    expect(conf.version).toBe(pkg.version);
    expect(cargoVersion).toBe(pkg.version);
  });
});
