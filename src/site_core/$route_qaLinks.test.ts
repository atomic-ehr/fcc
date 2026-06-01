import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";
import $route_qaLinks from "./$route_qaLinks.ts";

const mk = () => {
    const c: any = { state: {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} };
    loadAll(c); c.fns.site_core.enable(c, { opts: {} });
    c.fns.site_core.layout = (_c: any, o: any) => o.content;   // echo content (skip chrome)
    return c;
};
const page = (slug: string, md: string) => ({ resourceType: "Page", id: `Page/${slug}`, data: { resourceType: "Page", id: slug, slug, role: "page", md } });

test("$route_qaLinks: null when there are no unresolved references", () => {
    const c = mk();
    c.resources.set("Page/clean", page("clean", "all good, no broken refs"));
    expect($route_qaLinks(c, { pluginCtx: {} as any })).toBeNull();
});

test("$route_qaLinks: lists each broken ref + its pages", () => {
    const c = mk();
    c.resources.set("Page/g", page("g", "see [BrokenRef] here"));
    const route = $route_qaLinks(c, { pluginCtx: {} as any })!;
    expect(route).not.toBeNull();
    expect(route.path).toBe("qa-links.html");
    const html = route.render() as string;
    expect(html).toContain("Unresolved references");
    expect(html).toContain("[BrokenRef]");
    expect(html).toContain("g.html");
    expect(html).toContain("1 reference-shaped");
});
