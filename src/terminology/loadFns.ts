// Auto-assembled: imports every terminology fn and registers ctx.fns.terminology.
// The only file in this namespace allowed to import siblings.
import $section_cld from "./$section_cld.ts";
import $section_concepts from "./$section_concepts.ts";
import $section_csReferences from "./$section_csReferences.ts";
import $section_expansion from "./$section_expansion.ts";
import $section_vsReferences from "./$section_vsReferences.ts";
import codeSystemUsage from "./codeSystemUsage.ts";
import conceptTable from "./conceptTable.ts";
import displayFor from "./displayFor.ts";
import renderValueSetJsonPage from "./renderValueSetJsonPage.ts";
import valueSetUsage from "./valueSetUsage.ts";
import vsCld from "./vsCld.ts";
import vsCompanionPages from "./vsCompanionPages.ts";
import vsExpand from "./vsExpand.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).terminology = { $section_cld, $section_concepts, $section_csReferences, $section_expansion, $section_vsReferences, codeSystemUsage, conceptTable, displayFor, renderValueSetJsonPage, valueSetUsage, vsCld, vsCompanionPages, vsExpand };
}
