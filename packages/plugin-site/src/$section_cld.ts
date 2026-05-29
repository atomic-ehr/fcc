// "Logical Definition (CLD)" section (ValueSet): the compose rules.
export default function $section_cld(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const d = opts.resource.data as Record<string, unknown>;
    const html = ctx.fns.site.vsCld(ctx, { compose: d.compose as Record<string, unknown> | undefined });
    return { title: "Logical Definition (CLD)", id: "definition", html };
}
