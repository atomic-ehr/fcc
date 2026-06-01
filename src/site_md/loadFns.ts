// Auto-assembled: imports every md fn and registers ctx.fns.site_md.
// The only file in this namespace allowed to import siblings.
import applyBlocks from "./applyBlocks.ts";
import anchorHeadings from "./anchorHeadings.ts";
import sanitizeHtml from "./sanitizeHtml.ts";
import blockDefaults from "./blockDefaults.ts";
import expandIncludes from "./expandIncludes.ts";
import highlightBlocks from "./highlightBlocks.ts";
import highlightCode from "./highlightCode.ts";
import injectRefLinks from "./injectRefLinks.ts";
import resolveLink from "./resolveLink.ts";
import collectUnresolvedRefs from "./collectUnresolvedRefs.ts";
import lrefMap from "./lrefMap.ts";
import lrefResource from "./lrefResource.ts";
import lrefDependency from "./lrefDependency.ts";
import lrefFhirPath from "./lrefFhirPath.ts";
import mdInline from "./mdInline.ts";
import mdToHtml from "./mdToHtml.ts";
import parseIal from "./parseIal.ts";
import sdListTable from "./sdListTable.ts";
import stripUnrenderedLiquid from "./stripUnrenderedLiquid.ts";
import warmHighlighter from "./warmHighlighter.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).site_md = { sanitizeHtml, anchorHeadings, applyBlocks, blockDefaults, expandIncludes, highlightBlocks, highlightCode, injectRefLinks, resolveLink, collectUnresolvedRefs, lrefMap, lrefResource, lrefDependency, lrefFhirPath, mdInline, mdToHtml, parseIal, sdListTable, stripUnrenderedLiquid, warmHighlighter };
}
