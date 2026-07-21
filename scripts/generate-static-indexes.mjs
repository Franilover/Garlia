// scripts/generate-static-indexes.mjs
//
// Genera public/dibujos-index.json y public/sonidos-index.json
// recorriendo public/dibujos y public/sounds respectivamente.
//
// Reemplaza a las antiguas API routes /api/dibujos y /api/sonidos,
// que dependían de fs en tiempo de request (incompatible con
// `output: export`, que es lo que necesita Tauri).
//
// Correr con: node scripts/generate-static-indexes.mjs
// (agregalo a tu script "build" en package.json, ver instrucciones)

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const DIBUJOS_DIR = path.join(ROOT, "public", "dibujos");
const SOUNDS_DIR = path.join(ROOT, "public", "sounds");

const IMG_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a"]);

/**
 * Recorre un directorio recursivamente y arma el árbol de archivos.
 * @param {string} dir - path absoluto del directorio a leer
 * @param {string} base - path público base (ej. "/dibujos")
 * @param {Set<string>} exts - extensiones válidas para este tipo
 * @param {"image"|"audio"} type - tipo de archivo hoja
 */
function readDir(dir, base, exts, type) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);
    const publicPath = `${base}/${entry.name}`;

    if (entry.isDirectory()) {
      const children = readDir(fullPath, publicPath, exts, type);
      result.push({ name: entry.name, type: "folder", children });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.has(ext)) {
        result.push({ name: entry.name, url: publicPath, type });
      }
    }
  }

  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

function writeIndex(filename, tree) {
  const outPath = path.join(ROOT, "public", filename);
  fs.writeFileSync(outPath, JSON.stringify({ ok: true, tree }, null, 2));
  console.log(`✓ Generado public/${filename} (${tree.length} entradas de nivel raíz)`);
}

const dibujosTree = readDir(DIBUJOS_DIR, "/dibujos", IMG_EXTS, "image");
writeIndex("dibujos-index.json", dibujosTree);

const sonidosTree = readDir(SOUNDS_DIR, "/sounds", AUDIO_EXTS, "audio");
writeIndex("sonidos-index.json", sonidosTree);
