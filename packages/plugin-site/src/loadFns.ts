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
import tabHashScript from "./tabHashScript.ts";
import sdHrefs from "./sdHrefs.ts";
import sdCompanionPages from "./sdCompanionPages.ts";
import renderDefinitionsPage from "./renderDefinitionsPage.ts";
import renderMappingsPage from "./renderMappingsPage.ts";
import renderExamplesPage from "./renderExamplesPage.ts";
import renderProfileJsonPage from "./renderProfileJsonPage.ts";
import tabLinks from "./tabLinks.ts";
import conceptTable from "./conceptTable.ts";
import vsCld from "./vsCld.ts";
import vsExpand from "./vsExpand.ts";
import renderValueSetJsonPage from "./renderValueSetJsonPage.ts";
import vsCompanionPages from "./vsCompanionPages.ts";
import companionPages from "./companionPages.ts";
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
import canonicalMeta from "./canonicalMeta.ts";
import sectionDefaults from "./sectionDefaults.ts";
import sectionsFor from "./sectionsFor.ts";
import renderCanonical from "./renderCanonical.ts";
import $section_description from "./$section_description.ts";
import $section_notes from "./$section_notes.ts";
import $section_meta from "./$section_meta.ts";
import $section_narrative from "./$section_narrative.ts";
import $section_formalViews from "./$section_formalViews.ts";
import $section_usages from "./$section_usages.ts";
import $section_quickStart from "./$section_quickStart.ts";
import $section_cld from "./$section_cld.ts";
import $section_expansion from "./$section_expansion.ts";
import $section_vsReferences from "./$section_vsReferences.ts";
import $section_concepts from "./$section_concepts.ts";
import $section_csReferences from "./$section_csReferences.ts";
import $section_capabilityGrid from "./$section_capabilityGrid.ts";
import $section_searchParamDetail from "./$section_searchParamDetail.ts";
import expectationOf from "./expectationOf.ts";
import bundleNarrative from "./bundleNarrative.ts";
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
import codeSystemUsage from "./codeSystemUsage.ts";
import valueSetUsage from "./valueSetUsage.ts";
import fhirValue from "./fhirValue.ts";
import generateNarrative from "./generateNarrative.ts";
import displayFor from "./displayFor.ts";
import linkType from "./linkType.ts";
import flagLegend from "./flagLegend.ts";
import searchParamsFor from "./searchParamsFor.ts";
import quickStartTable from "./quickStartTable.ts";
import formatChips from "./formatChips.ts";
import renderResourceJsonPage from "./renderResourceJsonPage.ts";
import enable from "./enable.ts";
import tabDefaults from "./tabDefaults.ts";
import blockDefaults from "./blockDefaults.ts";
import mergeTabs from "./mergeTabs.ts";
import $avail_notExample from "./$avail_notExample.ts";
import tabsFor from "./tabsFor.ts";
import canonicalTabStrip from "./canonicalTabStrip.ts";
import canonicalResource from "./canonicalResource.ts";
import parseIal from "./parseIal.ts";
import applyBlocks from "./applyBlocks.ts";
import injectRefLinks from "./injectRefLinks.ts";
import mdToHtml from "./mdToHtml.ts";
import mdInline from "./mdInline.ts";
import warmHighlighter from "./warmHighlighter.ts";
import highlightBlocks from "./highlightBlocks.ts";
import expandIncludes from "./expandIncludes.ts";
import sdListTable from "./sdListTable.ts";
import featureOn from "./featureOn.ts";
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
        canonicalMeta, sectionDefaults, sectionsFor, renderCanonical,
        $section_description, $section_notes, $section_meta, $section_narrative,
        $section_formalViews, $section_usages, $section_quickStart,
        $section_cld, $section_expansion, $section_vsReferences,
        $section_concepts, $section_csReferences,
        $section_capabilityGrid, $section_searchParamDetail,
        expectationOf, bundleNarrative,
        writeBundle, handleHotUpdate, watchPaths,
        buildInfoBanner, urlVersionStrip, profileTabs, flagsCell, treeIndent, sectionHeader,
        examplesForProfile, elementRow, elementTable, bindingsTable,
        constraintsTable, detailTable, usagesOf, codeSystemUsage, valueSetUsage,
        fhirValue, generateNarrative, displayFor, linkType, flagLegend,
        searchParamsFor, quickStartTable, navActiveScript, tabHashScript, formatChips,
        sdHrefs, sdCompanionPages, renderDefinitionsPage, renderMappingsPage,
        renderExamplesPage, renderProfileJsonPage,
        tabLinks, conceptTable, vsCld, vsExpand, renderValueSetJsonPage,
        vsCompanionPages, companionPages, renderResourceJsonPage,
        enable, tabDefaults, blockDefaults, mergeTabs, $avail_notExample,
        tabsFor, canonicalTabStrip, canonicalResource,
        parseIal, applyBlocks, injectRefLinks, mdToHtml, mdInline,
        warmHighlighter, highlightBlocks, expandIncludes, sdListTable, featureOn,
        renderPage, loadPagecontent,
    };
}
