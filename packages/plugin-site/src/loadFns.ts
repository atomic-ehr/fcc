// The ONLY file in this package allowed to import siblings. It assembles
// `ctx.fns.site.*` once at plugin startup; every other file uses
// `ctx.fns.site.<fn>(ctx, opts)` to call across files.

import bytes from "./bytes.ts";
import formatCard from "./formatCard.ts";
import formatPath from "./formatPath.ts";
import htmlEscape from "./htmlEscape.ts";
import humanType from "./humanType.ts";
import idOf from "./idOf.ts";
import introBlock from "./introBlock.ts";
import jsonBlock from "./jsonBlock.ts";
import highlightCode from "./highlightCode.ts";
import layout from "./layout.ts";
import linkCanonical from "./linkCanonical.ts";
import loadIntroNotes from "./loadIntroNotes.ts";
import metaDl from "./metaDl.ts";
import notesBlock from "./notesBlock.ts";
import notesFor from "./notesFor.ts";
import order from "./order.ts";
import pageHeader from "./pageHeader.ts";
import pageHref from "./pageHref.ts";
import pillType from "./pillType.ts";
import renderBreadcrumb from "./renderBreadcrumb.ts";
import renderLanding from "./renderLanding.ts";
import renderSidebarGroup from "./renderSidebarGroup.ts";
import navActiveScript from "./navActiveScript.ts";
import shortLabel from "./shortLabel.ts";
import sidebar from "./sidebar.ts";
import stripUnrenderedLiquid from "./stripUnrenderedLiquid.ts";
import tagBindingStrength from "./tagBindingStrength.ts";
import tagMS from "./tagMS.ts";
import titleOf from "./titleOf.ts";
import topBar from "./topBar.ts";
import artifactTable from "./artifactTable.ts";
import renderArtifacts from "./renderArtifacts.ts";
import renderIndex from "./renderIndex.ts";
import renderResource from "./renderResource.ts";
import $render_StructureDefinition from "./$render_StructureDefinition.ts";
import $render_ValueSet from "./$render_ValueSet.ts";
import $render_CodeSystem from "./$render_CodeSystem.ts";
import $render_default from "./$render_default.ts";
import writeBundle from "./writeBundle.ts";
import handleHotUpdate from "./handleHotUpdate.ts";
import watchPaths from "./watchPaths.ts";
import buildInfoBanner from "./buildInfoBanner.ts";
import urlVersionStrip from "./urlVersionStrip.ts";
import profileTabs from "./profileTabs.ts";
import flagsCell from "./flagsCell.ts";
import treeIndent from "./treeIndent.ts";
import sectionHeader from "./sectionHeader.ts";
import examplesForProfile from "./examplesForProfile.ts";
import elementRow from "./elementRow.ts";
import elementTable from "./elementTable.ts";
import bindingsTable from "./bindingsTable.ts";
import constraintsTable from "./constraintsTable.ts";
import detailTable from "./detailTable.ts";
import usagesOf from "./usagesOf.ts";
import linkType from "./linkType.ts";
import flagLegend from "./flagLegend.ts";
import searchParamsFor from "./searchParamsFor.ts";
import quickStartTable from "./quickStartTable.ts";
import formatChips from "./formatChips.ts";
import renderPage from "./renderPage.ts";
import loadPagecontent from "./loadPagecontent.ts";

export default function loadFns(ctx: Context): void {
    (ctx.fns as any).site = {
        bytes, formatCard, formatPath, htmlEscape, humanType, idOf,
        introBlock, jsonBlock, highlightCode, layout, linkCanonical, loadIntroNotes,
        metaDl, notesBlock, notesFor, order, pageHeader, pageHref,
        pillType, renderBreadcrumb, renderLanding, renderSidebarGroup,
        shortLabel, sidebar, stripUnrenderedLiquid, tagBindingStrength,
        tagMS, titleOf, topBar, artifactTable, renderArtifacts,
        renderIndex, renderResource,
        $render_StructureDefinition, $render_ValueSet, $render_CodeSystem, $render_default,
        writeBundle, handleHotUpdate, watchPaths,
        buildInfoBanner, urlVersionStrip, profileTabs, flagsCell, treeIndent, sectionHeader,
        examplesForProfile, elementRow, elementTable, bindingsTable,
        constraintsTable, detailTable, usagesOf, linkType, flagLegend,
        searchParamsFor, quickStartTable, navActiveScript, formatChips,
        renderPage, loadPagecontent,
    };
}
