// IG-Publisher-style numbered section header with gray prefix and dark title.
//   N.M.K  Title
export default function sectionHeader(ctx: Context, opts: { num: string; title: string; id?: string }): string {
    const esc = (s: string) => ctx.fns.site.htmlEscape(ctx, { s });
    const id = opts.id ?? opts.num.replaceAll(".", "-");
    return `<h2 id="${esc(id)}" class="mt-10 scroll-mt-20 text-lg">
        <span class="mr-2 font-light text-slate-400">${esc(opts.num)}</span>
        <span class="font-semibold text-slate-900">${esc(opts.title)}</span>
    </h2>`;
}
