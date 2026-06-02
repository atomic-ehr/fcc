import { test, expect } from "bun:test";
import loadAll from "../site/loadAll.ts";
import $route_dependencies from "./$route_dependencies.ts";

const mk = (deps?: any) => {
    const c: any = { state: deps ? { deps } : {}, fns: {}, resources: new Map(), byCanonical: new Map(), config: {} };
    loadAll(c); c.fns.site_core.enable(c, { opts: {} });
    c.fns.site_core.layout = (_c: any, o: any) => o.content;
    return c;
};
const pctx = (deps: Record<string, string>) => ({ config: { deps } } as any);

test("$route_dependencies: null when the IG declares no dependencies", () => {
    expect($route_dependencies(mk(), { pluginCtx: pctx({}) })).toBeNull();
});

test("$route_dependencies: lists declared deps with cached status + FHIR version from the index", () => {
    const index = { packages: [{ id: "hl7.fhir.r4.core", version: "4.0.1", base: "http://hl7.org/fhir/R4", fhirVersion: "4.0.1" }] };
    const route = $route_dependencies(mk(index), { pluginCtx: pctx({ "hl7.fhir.r4.core": "4.0.1", "hl7.fhir.us.core": "6.1.0" }) })!;
    expect(route.path).toBe("dependencies.html");
    const html = route.render() as string;
    expect(html).toContain("hl7.fhir.r4.core");
    expect(html).toContain("4.0.1");
    expect(html).toContain("cached");                       // r4.core is in the index
    expect(html).toContain("hl7.fhir.us.core");
    expect(html).toContain("not in cache");                 // us.core declared but not indexed
    expect(html).toContain("2 declared dependencies");
});
