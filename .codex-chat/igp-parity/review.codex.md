Warning: Skill descriptions were shortened to fit the 2% skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.

Warning: Skill descriptions were shortened to fit the 2% skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.

Looks good overall and already well-grounded in the vendored IGP classes.

Two precision fixes to make it fully accurate:

1. `Dependency-package loading + canonical resolution` is a two-part baseline:
   - loader behavior is from `PublisherLoader`
   - canonical URL → path map is from `SpecMapManager` (`other/spec.internals`)
   - in fcc terms, implement both parts together as one “dependency bootstrap” substrate.

2. Your sequencing is correct, but #1 is a hard prerequisite for #2, #8, and #10.

Recommended refined top 10 (same order, cleaner grain mapping):

1. Dependency bootstrap (Loader + SpecMap)
- fcc grain: new `$loader` for `.tgz`/cache, extend `ctx` with package resources tagged internal-use, add `ctx.specMaps` and `$resolve_*` URL resolvers.

2. HTML link/anchor/image QA (`HTMLInspector`)
- fcc grain: `validator.linkCheck()` over generated routes; route/anchor/image validation against `ctx.byUrl`, `ctx.canonicals`, and spec maps.

3. Full QA + suppression (`ValidationPresenter` + `SuppressedMessageInformation`)
- fcc grain: upgrade `renderErrors` to grouped reports and per-file stats; add wildcard suppression config and filtered `ctx.issues` flow; emit `qa.txt` + OO.

4. OperationDefinition rendering
- fcc grain: `site_capability` sections or `site_operation` plugin pages.

5. Cross-view aggregate pages (`CrossViewRenderer`)
- fcc grain: `site_artifacts` aggregate generators (`$page_*`) over `ctx.byType` and canonical indexes.

6. Status/maturity rendering
- fcc grain: `site_core` status badge view + optional aggregate table page.

7. JSON/XML dual serialization with token linking
- fcc grain: add XML renderer/sidecar + linkified type/canonical token rendering in both JSON and XML tabs.

8. Dependency table page (`DependencyRenderer`)
- fcc grain: aggregate page from IG `dependsOn` + loaded package metadata and realms/fhir-version/version warnings.

9. History + publish-box statement (`HistoryGenerator` + `PublishBoxStatementGenerator`)
- fcc grain: load `package-list.json` plus injected banner in layout and generated `history` page.

10. Previous-version comparator + deprecation surfacing
- fcc grain: reuse dependency bootstrap to load prior package, diff snapshots/resources, render change/deprecation pages.

What to keep in mind while implementing:
- #1 and #2 are highest leverage on immediate QA.
- #3 and #6 are mostly `ctx`/render upgrades, relatively cheap.
- #10 is the heaviest and should come last.
