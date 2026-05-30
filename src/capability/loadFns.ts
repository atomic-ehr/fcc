// Auto-assembled: imports every capability fn and registers ctx.fns.capability.
// The only file in this namespace allowed to import siblings.
import $section_capabilityGrid from "./$section_capabilityGrid.ts";
import $section_searchParamDetail from "./$section_searchParamDetail.ts";
import expectationOf from "./expectationOf.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).capability = { $section_capabilityGrid, $section_searchParamDetail, expectationOf };
}
