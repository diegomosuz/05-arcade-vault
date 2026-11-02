// Mide el rendimiento de los juegos reales con Playwright (SPEC 11).
//
// Uso (con `npm run build && npm run start` corriendo; nunca contra `next dev`):
//   node scripts/measure-fps.mjs --label antes
//   node scripts/measure-fps.mjs --label despues --seconds 30
//   node scripts/measure-fps.mjs --label antes --games rocas,caida --profiles desktop --skins classic
//
// Vuelca las filas en references/performance-baseline.md. Las filas de otra
// fase (antes/despues) se conservan; las de la fase indicada se reemplazan.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "references/performance-baseline.md");

const ALL_GAMES = ["rocas", "caida", "bloque-buster", "serpentina", "ranaria"];
const ALL_SKINS = ["classic", "neon", "retro"];
const ALL_PROFILES = ["desktop", "mobile"];

// Teclas que el conductor automático alterna en cada juego para generar carga
// real (movimiento, disparos, partículas) sin depender de una IA de juego.
const DRIVER_KEYS = {
  rocas: ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"],
  caida: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
  "bloque-buster": ["ArrowLeft", "ArrowRight"],
  serpentina: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
  ranaria: ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"],
};

const WARMUP_MS = 1000;
const FRAME_LIMIT_MS = 50;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const list = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

const label = arg("label", "antes");
if (!["antes", "despues"].includes(label)) {
  console.error('--label debe ser "antes" o "despues"');
  process.exit(1);
}
const base = arg("base", "http://localhost:3000");
const seconds = Number(arg("seconds", "30"));
const games = list(arg("games", ALL_GAMES.join(",")));
const skins = list(arg("skins", ALL_SKINS.join(",")));
const profiles = list(arg("profiles", ALL_PROFILES.join(",")));

const PROFILE_OPTS = {
  desktop: {
    context: { viewport: { width: 1280, height: 800 } },
    cpuRate: 1,
  },
  mobile: {
    context: {
      ...devices["Pixel 7"],
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    },
    cpuRate: 4,
  },
};

// Corre dentro de la página: conduce el juego y mide los frames con rAF.
async function measureInPage({ keys, ms, warmup, limit }) {
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const press = (code, down) =>
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true, cancelable: true }),
    );

  let held = [];
  let restarts = 0;
  const driver = setInterval(() => {
    for (const c of held) press(c, false);
    held = [];
    const n = 1 + (rnd() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const c = keys[Math.floor(rnd() * keys.length)];
      if (!held.includes(c)) {
        held.push(c);
        press(c, true);
      }
    }
  }, 150);

  // Reinicia tras «FIN DEL JUEGO» y reanuda si algo pausó la partida.
  const keeper = setInterval(() => {
    const buttons = [...document.querySelectorAll("button")];
    const again = buttons.find((b) => b.textContent?.trim() === "JUGAR DE NUEVO");
    if (again) {
      again.click();
      restarts++;
      return;
    }
    const resume = buttons.find((b) => b.textContent?.trim() === "REANUDAR");
    if (resume) resume.click();
  }, 400);

  const frames = [];
  const t0 = performance.now();
  await new Promise((resolve) => {
    let prev = null;
    const tick = (ts) => {
      if (prev !== null && ts - t0 > warmup) frames.push(ts - prev);
      prev = ts;
      if (ts - t0 < ms + warmup) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  clearInterval(driver);
  clearInterval(keeper);
  for (const c of held) press(c, false);

  const sorted = [...frames].sort((a, b) => a - b);
  const total = frames.reduce((a, b) => a + b, 0);
  return {
    frames: frames.length,
    fps: (frames.length / total) * 1000,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    over: frames.filter((d) => d > limit).length,
    restarts,
  };
}

async function runOne(browser, game, profile, skin) {
  const opts = PROFILE_OPTS[profile];
  const context = await browser.newContext(opts.context);
  await context.addInitScript(
    ([id, s]) => {
      try {
        localStorage.setItem(`av-skin:${id}`, s);
      } catch {}
    },
    [game, skin],
  );
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  if (opts.cpuRate > 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.cpuRate });
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${base}/juegos/${game}/jugar`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(measureInPage, {
    keys: DRIVER_KEYS[game],
    ms: seconds * 1000,
    warmup: WARMUP_MS,
    limit: FRAME_LIMIT_MS,
  });
  await context.close();
  return { ...result, errors };
}

function parseRows(md) {
  return md
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Juego") && !l.startsWith("| ---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 7);
}

const fmt = (n, d = 1) => n.toFixed(d);
const phase = label === "antes" ? "antes" : "después";

const browser = await chromium.launch();
const rows = [];
for (const game of games) {
  for (const profile of profiles) {
    for (const skin of skins) {
      process.stdout.write(`${game} · ${profile} · ${skin} … `);
      try {
        const r = await runOne(browser, game, profile, skin);
        console.log(
          `${fmt(r.fps)} FPS · p95 ${fmt(r.p95)} ms · >50ms: ${r.over} · reinicios: ${r.restarts}` +
            (r.errors.length ? ` · ERRORES: ${r.errors.join("; ")}` : ""),
        );
        rows.push([game, profile, skin, fmt(r.fps), fmt(r.p95), String(r.over), phase]);
      } catch (e) {
        console.log(`FALLO: ${e.message}`);
        rows.push([game, profile, skin, "—", "—", "—", phase]);
      }
    }
  }
}
await browser.close();

const prev = existsSync(OUT) ? parseRows(readFileSync(OUT, "utf8")) : [];
const key = (c) => `${c[6]}|${c[0]}|${c[1]}|${c[2]}`;
const merged = new Map(prev.map((c) => [key(c), c]));
for (const c of rows) merged.set(key(c), c);

const order = (arr, v) => arr.indexOf(v);
const sorted = [...merged.values()].sort(
  (a, b) =>
    order(["antes", "después"], a[6]) - order(["antes", "después"], b[6]) ||
    order(ALL_GAMES, a[0]) - order(ALL_GAMES, b[0]) ||
    order(ALL_PROFILES, a[1]) - order(ALL_PROFILES, b[1]) ||
    order(ALL_SKINS, a[2]) - order(ALL_SKINS, b[2]),
);

const md = `# Rendimiento de los juegos — línea base (SPEC 11)

Generado con \`node scripts/measure-fps.mjs --label antes|despues\` contra \`next build\` + \`next start\`.

- **Partida:** ${seconds} s por combinación (se descarta el primer segundo). Un conductor automático alterna teclas con una semilla fija; si la partida termina, se reinicia.
- **Perfiles:** \`desktop\` = 1280×800 sin throttling. \`mobile\` = 390×844, \`hasTouch\`, \`isMobile\`, CPU 4× más lenta.
- **Navegador:** Chromium headless de Playwright (render por software, sin GPU): los números sirven para comparar antes/después, no como FPS absolutos de un dispositivo real.
- **Umbrales:** desktop ≥ 58 FPS medios, mobile ≥ 55 FPS medios, 0 frames > 50 ms.

| Juego | Perfil | Skin | FPS medio | p95 frame (ms) | Frames > 50 ms | Fase |
| --- | --- | --- | --- | --- | --- | --- |
${sorted.map((c) => `| ${c.join(" | ")} |`).join("\n")}
`;
writeFileSync(OUT, md);
console.log(`\nTabla escrita en ${OUT}`);
