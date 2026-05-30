import type { Plugin } from "fcc";

export default function narrative(_opts: unknown = {}): Plugin {
  return (hooks) => hooks.transform((r) => {
    const d = r.data as Record<string, unknown>;
    if (d.text) return null;
    const display =
      typeof d.title === "string" ? d.title :
      typeof d.name  === "string" ? d.name  :
      `${r.resourceType} ${(d.id as string | undefined) ?? r.id}`;
    const text = {
      status: "generated",
      div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escape(display)}</p></div>`,
    };
    r.data = { ...d, text };
    return r;
  });
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
