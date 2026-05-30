// Auto-assembled: imports every narrative fn and registers ctx.fns.narrative.
// The only file in this namespace allowed to import siblings.
import $section_meta from "./$section_meta.ts";
import $section_narrative from "./$section_narrative.ts";
import bundleNarrative from "./bundleNarrative.ts";
import fhirValue from "./fhirValue.ts";
import generateNarrative from "./generateNarrative.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).narrative = { $section_meta, $section_narrative, bundleNarrative, fhirValue, generateNarrative };
}
