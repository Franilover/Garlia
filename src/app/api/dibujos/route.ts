

import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

const DIBUJOS_DIR = path.join(process.cwd(), "public", "dibujos");
const IMG_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

interface FileEntry {
  name: string;
  url: string;       
  type: "image";
}

interface FolderEntry {
  name: string;
  type: "folder";
  children: (FileEntry | FolderEntry)[];
}

function readDir(dir: string, base: string): (FileEntry | FolderEntry)[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: (FileEntry | FolderEntry)[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; 

    const fullPath = path.join(dir, entry.name);
    const publicPath = `${base}/${entry.name}`;

    if (entry.isDirectory()) {
      const children = readDir(fullPath, publicPath);
      result.push({ name: entry.name, type: "folder", children });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMG_EXTS.has(ext)) {
        result.push({ name: entry.name, url: publicPath, type: "image" });
      }
    }
  }

  
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export async function GET() {
  try {
    const tree = readDir(DIBUJOS_DIR, "/dibujos");
    return NextResponse.json({ ok: true, tree });
  } catch (err) {
    console.error("[dibujos API]", err);
    return NextResponse.json({ ok: false, tree: [], error: String(err) }, { status: 500 });
  }
}