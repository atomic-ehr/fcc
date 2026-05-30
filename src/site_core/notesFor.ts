export default function notesFor(ctx: Context, opts: { resource: types.fcc.Resource }): { intro?: string; notes?: string } {
    return ctx.notes?.get(opts.resource.id) ?? {};
}
