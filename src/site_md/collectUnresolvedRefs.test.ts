import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";

// Real chain via loadAll + enable; add resources to drive resolution.
const mk = () => { const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} }; loadAll(c); c.fns.site_core.enable(c, { opts: {} }); return c; };
const sd = (id: string, name: string) => ({ resourceType: "StructureDefinition", id: `StructureDefinition/${id}`, data: { resourceType: "StructureDefinition", id, name, url: `http://x/${name}` } });
const page = (slug: string, md: string) => ({ resourceType: "Page", id: `Page/${slug}`, data: { resourceType: "Page", id: slug, slug, role: "page", md } });

test("collectUnresolvedRefs: flags ref-shaped labels that don't resolve, with the pages using them", () => {
    const c = mk();
    c.resources.set("StructureDefinition/my-profile", sd("my-profile", "MyProfile"));   // resolves via lrefResource
    c.resources.set("Page/guide", page("guide", "see [MyProfile] and [UnknownThing] and [note] and [1] here"));
    const u = c.fns.site_md.collectUnresolvedRefs(c);
    expect(u.has("UnknownThing")).toBe(true);
    expect(u.get("UnknownThing")).toEqual(["guide.html"]);
    expect(u.has("MyProfile")).toBe(false);     // resolves → not broken
    expect(u.has("note")).toBe(false);          // not reference-shaped (no uppercase)
    expect(u.has("1")).toBe(false);             // not reference-shaped
});

test("collectUnresolvedRefs: an author-defined [Label]: link is not flagged", () => {
    const c = mk();
    c.resources.set("Page/p", page("p", "see [SomeThing]\n\n[SomeThing]: https://example.org"));
    expect(c.fns.site_md.collectUnresolvedRefs(c).has("SomeThing")).toBe(false);
});

test("collectUnresolvedRefs: aggregates the same broken ref across multiple pages", () => {
    const c = mk();
    c.resources.set("Page/a", page("a", "uses [Broken] here"));
    c.resources.set("Page/b", page("b", "also [Broken] there"));
    const u = c.fns.site_md.collectUnresolvedRefs(c);
    expect(u.get("Broken")).toEqual(["a.html", "b.html"]);
});

test("collectUnresolvedRefs: also scans canonical resource descriptions", () => {
    const c = mk();
    c.resources.set("StructureDefinition/x", { resourceType: "StructureDefinition", id: "StructureDefinition/x",
        data: { resourceType: "StructureDefinition", id: "x", name: "X", url: "http://x/X", description: "derived from [MissingParent]" } });
    expect(c.fns.site_md.collectUnresolvedRefs(c).has("MissingParent")).toBe(true);
});
