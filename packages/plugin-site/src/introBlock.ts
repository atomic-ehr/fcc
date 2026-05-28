export default function introBlock(_ctx: Context, opts: { html: string | undefined }): string {
    if (!opts.html) return "";
    return `<article class="prose prose-slate mt-6 max-w-3xl">${opts.html}</article>`;
}
