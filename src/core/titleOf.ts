export default function titleOf(ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    const d = r.data as Record<string, unknown>;
    if (typeof d.title === "string" && d.title) return d.title;
    if (typeof d.name === "string" && d.name) return d.name;
    if (Array.isArray(d.name)) {
        const first = d.name[0] as { family?: string; given?: string[] } | undefined;
        if (first) {
            const parts = [first.given?.join(" "), first.family].filter(Boolean).join(" ");
            if (parts) return `${r.resourceType} · ${parts}`;
        }
    }
    return `${r.resourceType} · ${ctx.fns.core.idOf(ctx, { resource: r })}`;
}
