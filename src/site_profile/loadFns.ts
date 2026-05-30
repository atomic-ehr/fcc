// Auto-assembled: imports every profile fn and registers ctx.fns.site_profile.
// The only file in this namespace allowed to import siblings.
import $section_formalViews from "./$section_formalViews.ts";
import $section_quickStart from "./$section_quickStart.ts";
import $section_usages from "./$section_usages.ts";
import bindingsTable from "./bindingsTable.ts";
import constraintsTable from "./constraintsTable.ts";
import detailTable from "./detailTable.ts";
import elementRow from "./elementRow.ts";
import elementTable from "./elementTable.ts";
import examplesForProfile from "./examplesForProfile.ts";
import flagLegend from "./flagLegend.ts";
import flagsCell from "./flagsCell.ts";
import profileTabs from "./profileTabs.ts";
import quickStartTable from "./quickStartTable.ts";
import renderDefinitionsPage from "./renderDefinitionsPage.ts";
import renderExamplesPage from "./renderExamplesPage.ts";
import renderMappingsPage from "./renderMappingsPage.ts";
import renderProfileJsonPage from "./renderProfileJsonPage.ts";
import sdHrefs from "./sdHrefs.ts";
import searchParamsFor from "./searchParamsFor.ts";
import tabHashScript from "./tabHashScript.ts";
import treeIndent from "./treeIndent.ts";
import usagesOf from "./usagesOf.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).site_profile = { $section_formalViews, $section_quickStart, $section_usages, bindingsTable, constraintsTable, detailTable, elementRow, elementTable, examplesForProfile, flagLegend, flagsCell, profileTabs, quickStartTable, renderDefinitionsPage, renderExamplesPage, renderMappingsPage, renderProfileJsonPage, sdHrefs, searchParamsFor, tabHashScript, treeIndent, usagesOf };
}
