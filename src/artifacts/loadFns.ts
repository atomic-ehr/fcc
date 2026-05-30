// Auto-assembled: imports every artifacts fn and registers ctx.fns.artifacts.
// The only file in this namespace allowed to import siblings.
import artifactTable from "./artifactTable.ts";
import loadPagecontent from "./loadPagecontent.ts";
import pageToc from "./pageToc.ts";
import renderArtifacts from "./renderArtifacts.ts";
import renderIndex from "./renderIndex.ts";
import renderLanding from "./renderLanding.ts";
import renderPage from "./renderPage.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).artifacts = { artifactTable, loadPagecontent, pageToc, renderArtifacts, renderIndex, renderLanding, renderPage };
}
