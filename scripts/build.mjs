import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const photosDir = path.join(publicDir, 'photos');
const musicDir = path.join(publicDir, 'music');

const photoExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const audioExt = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac']);

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

for (const file of ['index.html', 'styles.css', 'app.js']) {
  await fs.copyFile(path.join(srcDir, file), path.join(distDir, file));
}

async function listFiles(dir, allowed) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && allowed.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  } catch {
    return [];
  }
}

const photos = await listFiles(photosDir, photoExt);
const musicFiles = await listFiles(musicDir, audioExt);

await fs.mkdir(path.join(distDir, 'photos'), { recursive: true });
for (const file of photos) {
  await fs.copyFile(path.join(photosDir, file), path.join(distDir, 'photos', file));
}

let music = null;
if (musicFiles.length) {
  await fs.mkdir(path.join(distDir, 'music'), { recursive: true });
  for (const file of musicFiles) {
    await fs.copyFile(path.join(musicDir, file), path.join(distDir, 'music', file));
  }
  const preferred = musicFiles.find((name) => /лагер|saluki|friendly/i.test(name)) || musicFiles[0];
  music = { name: preferred, url: `/music/${encodeURIComponent(preferred)}` };
}

const photoData = photos.map((name) => ({
  name,
  url: `/photos/${encodeURIComponent(name)}`
}));

let zipUrl = null;
if (photos.length) {
  const zipPath = path.join(distDir, 'photos.zip');
  await buildStoredZip(photos.map((name) => ({ name, source: path.join(photosDir, name) })), zipPath);
  zipUrl = '/photos.zip';
}

await fs.writeFile(
  path.join(distDir, 'content.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), photos: photoData, music, zip: zipUrl }, null, 2)
);

console.log(`Built ${photos.length} photo(s), music: ${music?.name || 'none'}, zip: ${zipUrl ? 'yes' : 'no'}`);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const d = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: d };
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }

async function buildStoredZip(files, outPath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dt = dosDateTime();

  for (const file of files) {
    const data = await fs.readFile(file.source);
    const name = Buffer.from(file.name, 'utf8');
    const crc = crc32(data);
    const flags = 0x0800; // UTF-8 names

    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(0), u16(dt.time), u16(dt.date),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data
    ]);
    localParts.push(local);

    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(0), u16(dt.time), u16(dt.date),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name
    ]);
    centralParts.push(central);
    offset += local.length;
  }

  const centralStart = offset;
  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(centralStart), u16(0)
  ]);
  await fs.writeFile(outPath, Buffer.concat([...localParts, central, end]));
}
