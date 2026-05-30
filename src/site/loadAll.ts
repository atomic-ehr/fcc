// Assemble every namespace into ctx.fns.*. Future extension = add its folder
// + loadFns and one line here.
import loadFns_core from "../site_core/loadFns.ts";
import loadFns_md from "../site_md/loadFns.ts";
import loadFns_profile from "../site_profile/loadFns.ts";
import loadFns_terminology from "../site_terminology/loadFns.ts";
import loadFns_capability from "../site_capability/loadFns.ts";
import loadFns_narrative from "../site_narrative/loadFns.ts";
import loadFns_artifacts from "../site_artifacts/loadFns.ts";

export default function loadAll(ctx: Context): void {
    loadFns_core(ctx);
    loadFns_md(ctx);
    loadFns_profile(ctx);
    loadFns_terminology(ctx);
    loadFns_capability(ctx);
    loadFns_narrative(ctx);
    loadFns_artifacts(ctx);
}
