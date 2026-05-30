// Assemble every namespace into ctx.fns.*. Future extension = add its folder
// + loadFns and one line here.
import loadFns_core from "./core/loadFns.ts";
import loadFns_md from "./md/loadFns.ts";
import loadFns_profile from "./profile/loadFns.ts";
import loadFns_terminology from "./terminology/loadFns.ts";
import loadFns_capability from "./capability/loadFns.ts";
import loadFns_narrative from "./narrative/loadFns.ts";
import loadFns_artifacts from "./artifacts/loadFns.ts";

export default function loadAll(ctx: Context): void {
    loadFns_core(ctx);
    loadFns_md(ctx);
    loadFns_profile(ctx);
    loadFns_terminology(ctx);
    loadFns_capability(ctx);
    loadFns_narrative(ctx);
    loadFns_artifacts(ctx);
}
