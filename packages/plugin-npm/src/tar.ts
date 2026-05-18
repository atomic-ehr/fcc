// Minimal USTAR tar writer.
// Spec: https://www.gnu.org/software/tar/manual/html_node/Standard.html

type Entry = { path: string; bytes: Uint8Array; mtime?: number };

const BLOCK = 512;

export function tar(entries: Entry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const e of entries) {
    chunks.push(header(e));
    chunks.push(e.bytes);
    const pad = BLOCK - (e.bytes.length % BLOCK || BLOCK);
    if (pad < BLOCK) chunks.push(new Uint8Array(pad));
  }
  // Two empty blocks at end-of-archive
  chunks.push(new Uint8Array(BLOCK));
  chunks.push(new Uint8Array(BLOCK));
  return concat(chunks);
}

function header(e: Entry): Uint8Array {
  const buf = new Uint8Array(BLOCK);

  const path = e.path;
  if (path.length > 100) {
    throw new Error(`tar: path too long for USTAR (max 100): ${path}`);
  }
  writeStr(buf, 0,   100, path);
  writeStr(buf, 100,   8, "0000644");           // mode
  writeStr(buf, 108,   8, "0000000");           // uid
  writeStr(buf, 116,   8, "0000000");           // gid
  writeOct(buf, 124,  12, e.bytes.length);      // size
  writeOct(buf, 136,  12, e.mtime ?? Math.floor(Date.now() / 1000));
  writeStr(buf, 148,   8, "        ");          // checksum placeholder
  buf[156] = 0x30;                              // typeflag '0' = regular file
  writeStr(buf, 257,   6, "ustar");
  writeStr(buf, 263,   2, "00");
  writeStr(buf, 265,  32, "fcc");               // uname
  writeStr(buf, 297,  32, "fcc");               // gname

  // checksum: sum of all bytes treating field as spaces
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += buf[i]!;
  writeOct(buf, 148, 7, sum);
  buf[155] = 0x20;
  return buf;
}

function writeStr(buf: Uint8Array, off: number, len: number, s: string) {
  const bytes = new TextEncoder().encode(s);
  for (let i = 0; i < Math.min(bytes.length, len); i++) buf[off + i] = bytes[i]!;
}

function writeOct(buf: Uint8Array, off: number, len: number, n: number) {
  const s = n.toString(8).padStart(len - 1, "0");
  writeStr(buf, off, len - 1, s);
  buf[off + len - 1] = 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
