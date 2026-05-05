/**
 * remove-comments.mjs
 * Uso: node remove-comments.mjs
 * Sin dependencias externas — solo Node.js nativo.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT_DIRS = ["src"];
const EXTENSIONS = [".ts", ".tsx"];
const IGNORE = ["node_modules", ".next", "dist", ".git"];

function walkDir(dir, files = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
  for (const entry of entries) {
    if (IGNORE.includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkDir(full, files);
    else if (EXTENSIONS.includes(extname(entry))) files.push(full);
  }
  return files;
}

function removeComments(code) {
  let result = "";
  let i = 0;

  while (i < code.length) {
    // String comillas dobles
    if (code[i] === '"') {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '"') break;
        j++;
      }
      result += code.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // String comillas simples
    if (code[i] === "'") {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === "'") break;
        j++;
      }
      result += code.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // Template literal
    if (code[i] === "`") {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === "`") break;
        j++;
      }
      result += code.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // Comentario bloque /* ... */
    if (code[i] === "/" && code[i + 1] === "*") {
      let j = i + 2;
      while (j < code.length && !(code[j] === "*" && code[j + 1] === "/")) j++;
      i = j + 2;
      continue;
    }
    // Comentario línea // ...
    if (code[i] === "/" && code[i + 1] === "/") {
      let j = i + 2;
      while (j < code.length && code[j] !== "\n") j++;
      i = j;
      continue;
    }
    result += code[i];
    i++;
  }

  // Limpiar líneas vacías excesivas
  return result.replace(/\n{3,}/g, "\n\n");
}

const allFiles = [];
for (const dir of ROOT_DIRS) walkDir(dir, allFiles);

if (allFiles.length === 0) {
  console.log("No se encontraron archivos. Revisá las carpetas en ROOT_DIRS.");
  process.exit(0);
}

let total = 0;
for (const file of allFiles) {
  const original = readFileSync(file, "utf-8");
  const cleaned = removeComments(original);
  if (cleaned !== original) {
    writeFileSync(file, cleaned, "utf-8");
    console.log(`✅ ${file}`);
    total++;
  }
}

console.log(`\nListo — ${total} archivos modificados de ${allFiles.length} revisados.`);
