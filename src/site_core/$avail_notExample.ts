// Tab availability predicate: a profile-only companion (Detailed Descriptions,
// Mappings, Examples, the .profile.json source) is offered only for the real
// canonical resource, not for an example instance of it.
export default function $avail_notExample(_ctx: Context, opts: { resource: types.fcc.Resource }): boolean {
    return (opts.resource.data as { __wasExample?: boolean }).__wasExample !== true;
}
