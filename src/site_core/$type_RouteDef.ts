// A code-defined route contributed by a `$route_<name>.ts` file. It is a Route
// plus the URL path it answers: chrome/resource routes get their path from the
// buildRoutes map key, but a $route_ contributor declares its own. `id`
// defaults to null (an aggregate export → always (re)built in prod, re-served
// fresh in dev). buildRoutes scans every namespace for `$route_*` fns, calls
// each with (ctx, { pluginCtx }), and merges the returned RouteDef(s).
export type RouteDef = {
    path: string;
    id?: string | null;
    contentType: string;
    render: () => string | Uint8Array | Promise<string | Uint8Array>;
};
