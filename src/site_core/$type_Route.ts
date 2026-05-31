// One entry in the site's URL map (buildRoutes). render() is lazy and may now
// return bytes (Uint8Array) as well as an HTML/text string — so a route can
// deliver a binary artifact (e.g. a .zip export) through the same machinery
// that serves pages, with no dev/prod drift.
export type Route = {
    // owning resource id, or null for chrome/aggregate pages (always (re)served).
    id: string | null;
    contentType: string;
    render: () => string | Uint8Array | Promise<string | Uint8Array>;
};
