export default function notesBlock(_ctx: Context, opts: { html: string | undefined }): string {
    if (!opts.html) return "";
    return `<section class="mt-8"><h2 class="text-lg font-semibold text-slate-900">Notes</h2><article class="prose prose-slate mt-2 max-w-3xl">${opts.html}</article></section>`;
}
