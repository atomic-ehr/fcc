// Cross-cutting, ctx-free helpers shared across plugins — imported as `fcc`
// (the only project import the flat-ns hard-rule permits). Pure bytes in /
// bytes out: no Context, no ctx.fns dispatch.

export type ZipEntry = { name: string; bytes: Uint8Array };

// Minimal ZIP (PKZIP) writer — deflate (method 8) by default, store (0) on
// request. Hand-rolled like the npm plugin's tar(); validated byte-for-byte
// against system `unzip`. Two Bun primitives make this exact: Bun.deflateSync
// emits RAW deflate (what ZIP method 8 expects, not zlib-wrapped) and
// Bun.hash.crc32 is the standard PKZIP CRC-32. A fixed 1980-01-01 timestamp
// keeps archives byte-reproducible (stable content across rebuilds). Single
// disk, no ZIP64 — fine for IG-scale artifact sets (< 4 GB / < 65535 entries).
export function zip(entries: ZipEntry[], opts: { store?: boolean } = {}): Uint8Array {
    const method = opts.store ? 0 : 8;
    const time = 0, date = 0x0021;                     // 1980-01-01 00:00 (DOS epoch)
    const enc = new TextEncoder();

    const chunks: Uint8Array[] = [];                   // local headers + file data
    const central: Uint8Array[] = [];                  // central directory headers
    let offset = 0;

    for (const e of entries) {
        const nameBytes = enc.encode(e.name);
        const crc = Bun.hash.crc32(e.bytes) >>> 0;
        const usize = e.bytes.length;
        const comp = method === 0 ? e.bytes : (Bun.deflateSync(e.bytes) as Uint8Array);

        // Mark UTF-8 names via general-purpose bit 11 (EFS) — otherwise a
        // spec-strict decoder interprets the name as CP437 and mojibakes any
        // non-ASCII byte. ASCII names keep flags=0 (byte-identical fast path).
        const flags = nameBytes.some(b => b >= 0x80) ? 0x0800 : 0;

        // No ZIP64: the u32 size/offset fields below silently wrap (mod 2^32)
        // past 4 GB. Throw rather than emit a silently-corrupt archive.
        if (usize > 0xffffffff || comp.length > 0xffffffff || offset > 0xffffffff)
            throw new Error("zip(): entry size or offset exceeds 4 GB (ZIP64 not implemented)");

        // Local file header (30 bytes + name) immediately followed by file data.
        const lfh = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(lfh.buffer);
        lv.setUint32(0, 0x04034b50, true);             // signature PK\x03\x04
        lv.setUint16(4, 20, true);                     // version needed (2.0)
        lv.setUint16(6, flags, true);                  // general-purpose flags (bit 11 = UTF-8 name)
        lv.setUint16(8, method, true);                 // compression method
        lv.setUint16(10, time, true);
        lv.setUint16(12, date, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, comp.length, true);           // compressed size
        lv.setUint32(22, usize, true);                 // uncompressed size
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);                     // extra-field length
        lfh.set(nameBytes, 30);
        chunks.push(lfh, comp);

        // Central directory header (46 bytes + name).
        const cdh = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(cdh.buffer);
        cv.setUint32(0, 0x02014b50, true);             // signature PK\x01\x02
        cv.setUint16(4, 20, true);                     // version made by
        cv.setUint16(6, 20, true);                     // version needed
        cv.setUint16(8, flags, true);                  // general-purpose flags (bit 11 = UTF-8 name)
        cv.setUint16(10, method, true);
        cv.setUint16(12, time, true);
        cv.setUint16(14, date, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, comp.length, true);
        cv.setUint32(24, usize, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);                     // extra-field length
        cv.setUint16(32, 0, true);                     // comment length
        cv.setUint16(34, 0, true);                     // disk number start
        cv.setUint16(36, 0, true);                     // internal attributes
        cv.setUint32(38, 0, true);                     // external attributes
        cv.setUint32(42, offset, true);                // offset of local header
        cdh.set(nameBytes, 46);
        central.push(cdh);

        offset += lfh.length + comp.length;
    }

    const cdStart = offset;
    let cdSize = 0;
    for (const c of central) cdSize += c.length;

    // EOCD entry counts are u16; its central-dir size/offset are u32. Past those
    // limits the fields wrap and the archive reads as truncated/empty — throw.
    if (entries.length > 0xffff || cdStart > 0xffffffff || cdSize > 0xffffffff)
        throw new Error("zip(): >65535 entries or central directory exceeds 4 GB (ZIP64 not implemented)");

    // End of central directory record (22 bytes, no comment).
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);                 // signature PK\x05\x06
    ev.setUint16(4, 0, true);                          // this disk number
    ev.setUint16(6, 0, true);                          // disk with central dir
    ev.setUint16(8, entries.length, true);             // entries on this disk
    ev.setUint16(10, entries.length, true);            // total entries
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdStart, true);
    ev.setUint16(20, 0, true);                         // comment length

    const all = [...chunks, ...central, eocd];
    let total = 0;
    for (const c of all) total += c.length;
    const out = new Uint8Array(total);
    let p = 0;
    for (const c of all) { out.set(c, p); p += c.length; }
    return out;
}

// --- tar -------------------------------------------------------------------

export type TarEntry = { path: string; bytes: Uint8Array; mtime?: number };

const enc = new TextEncoder();
const TAR_BLOCK = 512;

function tarByteLen(s: string): number { return enc.encode(s).length; }

// USTAR stores a path as name (≤100 bytes) + an optional directory prefix
// (≤155 bytes); the extractor rejoins them as `prefix/name`. Split at the last
// "/" so a long full path (e.g. package/example/<long>.json) still fits without
// pax extensions. Throws only when a single path component itself exceeds 100 B.
function splitTarPath(path: string): { name: string; prefix: string } {
    if (tarByteLen(path) <= 100) return { name: path, prefix: "" };
    const idx = path.lastIndexOf("/");
    if (idx > 0) {
        const name = path.slice(idx + 1), prefix = path.slice(0, idx);
        if (tarByteLen(name) <= 100 && tarByteLen(prefix) <= 155) return { name, prefix };
    }
    throw new Error(`tar(): path too long for USTAR even with prefix (name>100 or prefix>155): ${path}`);
}

// Minimal USTAR tar writer — pure bytes in / bytes out, like zip(). Default
// mtime 0 → reproducible archives. Spec:
// https://www.gnu.org/software/tar/manual/html_node/Standard.html
export function tar(entries: TarEntry[]): Uint8Array {
    const chunks: Uint8Array[] = [];
    for (const e of entries) {
        chunks.push(tarHeader(e));
        chunks.push(e.bytes);
        const pad = TAR_BLOCK - (e.bytes.length % TAR_BLOCK || TAR_BLOCK);
        if (pad < TAR_BLOCK) chunks.push(new Uint8Array(pad));
    }
    chunks.push(new Uint8Array(TAR_BLOCK), new Uint8Array(TAR_BLOCK));   // two empty end blocks

    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
}

function tarHeader(e: TarEntry): Uint8Array {
    const buf = new Uint8Array(TAR_BLOCK);
    const { name, prefix } = splitTarPath(e.path);
    tarStr(buf, 0,   100, name);
    tarStr(buf, 100,   8, "0000644");           // mode
    tarStr(buf, 108,   8, "0000000");           // uid
    tarStr(buf, 116,   8, "0000000");           // gid
    tarOct(buf, 124,  12, e.bytes.length);      // size
    tarOct(buf, 136,  12, e.mtime ?? 0);        // default mtime 0 → reproducible
    tarStr(buf, 148,   8, "        ");          // checksum placeholder
    buf[156] = 0x30;                            // typeflag '0' = regular file
    tarStr(buf, 257,   6, "ustar");
    tarStr(buf, 263,   2, "00");
    tarStr(buf, 265,  32, "fcc");               // uname
    tarStr(buf, 297,  32, "fcc");               // gname
    if (prefix) tarStr(buf, 345, 155, prefix);  // USTAR path prefix for paths > 100 bytes

    let sum = 0;
    for (let i = 0; i < TAR_BLOCK; i++) sum += buf[i]!;
    tarOct(buf, 148, 7, sum);
    buf[155] = 0x20;
    return buf;
}

function tarStr(buf: Uint8Array, off: number, len: number, s: string) {
    const bytes = enc.encode(s);
    for (let i = 0; i < Math.min(bytes.length, len); i++) buf[off + i] = bytes[i]!;
}

function tarOct(buf: Uint8Array, off: number, len: number, n: number) {
    tarStr(buf, off, len - 1, n.toString(8).padStart(len - 1, "0"));
    buf[off + len - 1] = 0;
}
