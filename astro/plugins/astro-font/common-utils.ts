import { join } from 'node:path';

// Check if file system can be accessed
export async function getFS(): Promise<typeof import('node:fs') | undefined> {
  let fs;
  try {
    fs = await import('node:fs');
    return fs;
  } catch {
    // NOP
  }
}

// Check if writing is permitted by the file system
export async function ifFSOSWrites(dir: string): Promise<string | undefined> {
  try {
    const fs = await getFS();
    if (fs) {
      const testDir = join(dir, '.astro_font');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      fs.rmSync(testDir, { recursive: true, force: true });
      return dir;
    }
  } catch {
    // NOP
  }
}

// Get the font whether remote or local buffer
export async function getFontBuffer(path: string): Promise<Buffer | undefined> {
  const fs = await getFS();

  if (path.includes('https:') || path.includes('http:')) {
    const tmp = await fetch(path);
    return Buffer.from(await tmp.arrayBuffer());
  } else {
    // If the file system has the access to the *local* font
    if (fs && fs.existsSync(path)) {
      return fs.readFileSync(path);
    }
  }
}
