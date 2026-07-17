
import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

const SOUNDS_DIR = path.join(process.cwd(), "public", "sounds");
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a"]);

export async function GET() {
  try {
    if (!fs.existsSync(SOUNDS_DIR)) return NextResponse.json({ ok: true, tree: [] });
    
    const readDir = (dir: string, base: string): any[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.map(entry => {
        const publicPath = `${base}/${entry.name}`;
        if (entry.isDirectory()) {
          return { name: entry.name, type: "folder", children: readDir(path.join(dir, entry.name), publicPath) };
        }
        return AUDIO_EXTS.has(path.extname(entry.name).toLowerCase()) 
          ? { name: entry.name, url: publicPath, type: "audio" } : null;
      }).filter(Boolean);
    };

    return NextResponse.json({ ok: true, tree: readDir(SOUNDS_DIR, "/sounds") });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}