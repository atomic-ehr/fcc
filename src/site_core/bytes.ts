const enc = new TextEncoder();

export default function bytes(_ctx: Context, opts: { s: string }): Uint8Array {
    return enc.encode(opts.s);
}
