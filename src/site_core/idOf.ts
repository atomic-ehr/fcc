export default function idOf(_ctx: Context, opts: { resource: types.fcc.Resource }): string {
    const r = opts.resource;
    return (r.data.id as string) ?? r.id.split("/").pop()!;
}
