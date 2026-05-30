import type { Plugin, PluginContext, Resource } from "fcc";

// Auto-fill Resource.text.div for resources that lack a narrative.
export default function narrative(_opts: unknown = {}): Plugin {
  return [{ hook: "transform", fn: narrativeFn }];
}

function narrativeFn(_ctx: PluginContext, _config: Record<string, unknown>, { resource: r }: { resource: Resource }): Resource | null {
  if (r.resourceType === "Page") return null;                 // not a FHIR resource
  const d = r.data as Record<string, unknown>;
  if (d.text) return null;
  const display =
    typeof d.title === "string" ? d.title :
    typeof d.name === "string" ? d.name :
    `${r.resourceType} ${(d.id as string | undefined) ?? r.id}`;
  const text = {
    status: "generated",
    div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escape(display)}</p></div>`,
  };
  r.data = { ...d, text };
  return r;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
