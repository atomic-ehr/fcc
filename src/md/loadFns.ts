// Auto-assembled: imports every md fn and registers ctx.fns.md.
// The only file in this namespace allowed to import siblings.
import applyBlocks from "./applyBlocks.ts";
import sanitizeHtml from "./sanitizeHtml.ts";
import blockDefaults from "./blockDefaults.ts";
import expandIncludes from "./expandIncludes.ts";
import highlightBlocks from "./highlightBlocks.ts";
import highlightCode from "./highlightCode.ts";
import injectRefLinks from "./injectRefLinks.ts";
import mdInline from "./mdInline.ts";
import mdToHtml from "./mdToHtml.ts";
import parseIal from "./parseIal.ts";
import sdListTable from "./sdListTable.ts";
import stripUnrenderedLiquid from "./stripUnrenderedLiquid.ts";
import warmHighlighter from "./warmHighlighter.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).md = { sanitizeHtml, applyBlocks, blockDefaults, expandIncludes, highlightBlocks, highlightCode, injectRefLinks, mdInline, mdToHtml, parseIal, sdListTable, stripUnrenderedLiquid, warmHighlighter };
}
