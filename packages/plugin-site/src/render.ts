import type { Bundle, Resource, ResolvedConfig, Target } from "fcc";

const enc = new TextEncoder();
export const bytes = (s: string) => enc.encode(s);

export function htmlEscape(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

export type RenderCtx = {
  cfg: ResolvedConfig;
  target: Target;
  bundle: Bundle;
};

export function layout(ctx: RenderCtx, title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${htmlEscape(title)} — ${htmlEscape(ctx.cfg.title ?? ctx.cfg.id)}</title>
<link rel="stylesheet" href="${rel(ctx)}style.css">
</head>
<body>
<div class="layout">
${sidebar(ctx)}
<main>
${content}
<footer>Built by <a href="https://github.com/HealthSamurai/fcc">fcc</a> · target <code>${htmlEscape(ctx.target.name)}</code> (FHIR ${htmlEscape(ctx.target.fhir)}) · ${new Date().toISOString().slice(0, 10)}</footer>
</main>
</div>
</body>
</html>`;
}

function rel(_ctx: RenderCtx): string {
  // all pages are flat in the same dir, so no relative prefix needed
  return "";
}

function sidebar(ctx: RenderCtx): string {
  const groups: Record<string, Resource[]> = {};
  for (const r of ctx.bundle.resources.values()) {
    const k = r.resourceType;
    (groups[k] ||= []).push(r);
  }

  const sections: string[] = [
    `<a href="index.html" class="ig-title">${htmlEscape(ctx.cfg.title ?? ctx.cfg.id)}</a>`,
    `<span class="ig-version">v${htmlEscape(ctx.cfg.version)} · ${htmlEscape(ctx.target.name)}</span>`,
    `<a href="artifacts.html">All artefacts</a>`,
  ];

  for (const [type, list] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    if (type === "ImplementationGuide") continue;
    sections.push(`<h2>${htmlEscape(humanType(type))}</h2>`);
    for (const r of list.sort((a, b) => idOf(a).localeCompare(idOf(b)))) {
      sections.push(
        `<a href="${pageHref(r)}">${htmlEscape(titleOf(r))}</a>`,
      );
    }
  }
  return `<nav class="side">${sections.join("\n")}</nav>`;
}

function humanType(t: string): string {
  return ({
    StructureDefinition: "Profiles",
    ValueSet:            "Value Sets",
    CodeSystem:          "Code Systems",
    CapabilityStatement: "Capabilities",
    Patient:             "Examples (Patient)",
    Observation:         "Examples (Observation)",
    Condition:           "Examples (Condition)",
  } as Record<string, string>)[t] ?? t;
}

export function pageHref(r: Resource): string {
  return `${r.resourceType}-${idOf(r)}.html`;
}

function idOf(r: Resource): string {
  return (r.data.id as string) ?? r.id.split("/").pop()!;
}

function titleOf(r: Resource): string {
  const d = r.data as Record<string, unknown>;
  if (typeof d.title === "string" && d.title) return d.title;
  if (typeof d.name  === "string" && d.name)  return d.name;
  // Patient.name is HumanName[]
  if (Array.isArray(d.name)) {
    const first = d.name[0] as { family?: string; given?: string[] } | undefined;
    if (first) {
      const parts = [first.given?.join(" "), first.family].filter(Boolean).join(" ");
      if (parts) return `${r.resourceType} · ${parts}`;
    }
  }
  return `${r.resourceType} · ${idOf(r)}`;
}

// ---------------------------------------------------------------------------
// resource pages

export function renderIndex(ctx: RenderCtx, landingHtml: string): string {
  const ig = ctx.bundle.ig.data as Record<string, unknown>;
  const dependencies = (ig.dependsOn as Array<{ packageId: string; version: string }> | undefined) ?? [];
  const head = `
    <h1>${htmlEscape((ctx.cfg.title ?? ctx.cfg.id))}</h1>
    <p class="meta">
      <span class="target-pill">${htmlEscape(ctx.target.name)}</span>
      <code>${htmlEscape(ctx.cfg.id)}</code> · v${htmlEscape(ctx.cfg.version)} · FHIR ${htmlEscape(ctx.target.fhir)} · status ${htmlEscape(ctx.cfg.status ?? "draft")}
    </p>
    ${dependencies.length
      ? `<dl class="kv"><dt>Depends on</dt><dd>${dependencies.map(d => `<code>${htmlEscape(d.packageId)}@${htmlEscape(d.version)}</code>`).join(", ")}</dd></dl>`
      : ""}
  `;
  return layout(ctx, "Home", head + landingHtml);
}

export function renderArtifacts(ctx: RenderCtx): string {
  const groups: Record<string, Resource[]> = {};
  for (const r of ctx.bundle.resources.values()) {
    if (r.resourceType === "ImplementationGuide") continue;
    (groups[r.resourceType] ||= []).push(r);
  }
  const blocks = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([type, list]) => `
    <h2>${htmlEscape(humanType(type))}</h2>
    <table>
      <thead><tr><th>Name</th><th>Id</th><th>Canonical</th></tr></thead>
      <tbody>
      ${list.sort((a, b) => idOf(a).localeCompare(idOf(b))).map(r => `
        <tr>
          <td><a href="${pageHref(r)}">${htmlEscape(titleOf(r))}</a></td>
          <td><code>${htmlEscape(idOf(r))}</code></td>
          <td>${r.url ? `<code>${htmlEscape(r.url)}</code>` : "<span class='muted'>—</span>"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  `).join("");
  return layout(ctx, "Artefacts", `<h1>Artefacts</h1>${blocks}`);
}

export function renderResource(ctx: RenderCtx, r: Resource): string {
  switch (r.resourceType) {
    case "StructureDefinition": return renderProfile(ctx, r);
    case "ValueSet":            return renderValueSet(ctx, r);
    case "CodeSystem":          return renderCodeSystem(ctx, r);
    default:                    return renderGeneric(ctx, r);
  }
}

function renderProfile(ctx: RenderCtx, r: Resource): string {
  const d = r.data as Record<string, unknown>;
  const elements = ((d.differential as { element?: Array<Record<string, unknown>> } | undefined)?.element) ?? [];
  const rows = elements.map(e => {
    const card = formatCard(e.min, e.max);
    const ms = e.mustSupport ? `<span class="tag ms">MS</span>` : "";
    const binding = e.binding as { strength?: string; valueSet?: string } | undefined;
    const bindingHtml = binding
      ? `<span class="muted">binding</span> <span class="tag req">${htmlEscape(binding.strength ?? "")}</span> ${linkCanonical(ctx, binding.valueSet)}`
      : "";
    const types = (e.type as Array<{ code: string }> | undefined)?.map(t => htmlEscape(t.code)).join(" | ");
    return `
      <tr>
        <td class="path">${htmlEscape(String(e.path))}</td>
        <td>${htmlEscape(card)}</td>
        <td>${ms}</td>
        <td>${types ?? ""}</td>
        <td>${bindingHtml}</td>
      </tr>`;
  }).join("");

  const head = `
    <h1>${htmlEscape((d.title as string) ?? (d.id as string))}<span class="target-pill">${htmlEscape(ctx.target.name)}</span></h1>
    <p class="meta"><span class="tag">profile</span> <code>${htmlEscape(d.id as string)}</code></p>
    <dl class="kv">
      <dt>Canonical</dt><dd><code>${htmlEscape(d.url as string)}</code></dd>
      <dt>Base</dt><dd>${linkCanonical(ctx, d.baseDefinition as string)}</dd>
      <dt>Type</dt><dd><code>${htmlEscape(d.type as string)}</code></dd>
      <dt>Description</dt><dd>${htmlEscape((d.description as string) ?? "—")}</dd>
    </dl>
    <h2>Differential</h2>
    <table>
      <thead><tr><th>Path</th><th>Card</th><th></th><th>Type</th><th>Binding</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Source JSON</h2>
    <pre><code>${htmlEscape(JSON.stringify(d, null, 2))}</code></pre>
  `;
  return layout(ctx, (d.title as string) ?? (d.id as string), head);
}

function renderValueSet(ctx: RenderCtx, r: Resource): string {
  const d = r.data as Record<string, unknown>;
  const compose = d.compose as { include?: Array<Record<string, unknown>> } | undefined;
  const includes = compose?.include ?? [];
  const rows = includes.map(inc => {
    const sys = inc.system as string | undefined;
    const concepts = (inc.concept as Array<{ code: string; display?: string }> | undefined) ?? [];
    return `
      <h3>${sys ? `From <code>${htmlEscape(sys)}</code>` : `From ValueSet`}</h3>
      ${concepts.length
        ? `<ul class="codes">${concepts.map(c => `<li><code>${htmlEscape(c.code)}</code>${c.display ? ` — ${htmlEscape(c.display)}` : ""}</li>`).join("")}</ul>`
        : `<p class="muted">All codes from system.</p>`}
    `;
  }).join("");

  return layout(ctx, (d.title as string) ?? (d.id as string), `
    <h1>${htmlEscape((d.title as string) ?? (d.id as string))}<span class="target-pill">${htmlEscape(ctx.target.name)}</span></h1>
    <p class="meta"><span class="tag">value set</span> <code>${htmlEscape(d.id as string)}</code></p>
    <dl class="kv">
      <dt>Canonical</dt><dd><code>${htmlEscape(d.url as string)}</code></dd>
      <dt>Description</dt><dd>${htmlEscape((d.description as string) ?? "—")}</dd>
    </dl>
    <h2>Compose</h2>
    ${rows}
    <h2>Source JSON</h2>
    <pre><code>${htmlEscape(JSON.stringify(d, null, 2))}</code></pre>
  `);
}

function renderCodeSystem(ctx: RenderCtx, r: Resource): string {
  const d = r.data as Record<string, unknown>;
  const concepts = (d.concept as Array<{ code: string; display?: string; definition?: string }> | undefined) ?? [];
  const rows = concepts.map(c => `
    <tr>
      <td><code>${htmlEscape(c.code)}</code></td>
      <td>${htmlEscape(c.display ?? "")}</td>
      <td>${htmlEscape(c.definition ?? "")}</td>
    </tr>`).join("");
  return layout(ctx, (d.title as string) ?? (d.id as string), `
    <h1>${htmlEscape((d.title as string) ?? (d.id as string))}<span class="target-pill">${htmlEscape(ctx.target.name)}</span></h1>
    <p class="meta"><span class="tag">code system</span> <code>${htmlEscape(d.id as string)}</code></p>
    <dl class="kv">
      <dt>Canonical</dt><dd><code>${htmlEscape(d.url as string)}</code></dd>
      <dt>Description</dt><dd>${htmlEscape((d.description as string) ?? "—")}</dd>
      <dt>Concepts</dt><dd>${concepts.length}</dd>
    </dl>
    <h2>Concepts</h2>
    <table>
      <thead><tr><th>Code</th><th>Display</th><th>Definition</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

function renderGeneric(ctx: RenderCtx, r: Resource): string {
  const d = r.data as Record<string, unknown>;
  const profile = ((d.meta as { profile?: string[] } | undefined)?.profile ?? [])[0];
  return layout(ctx, (d.id as string), `
    <h1>${htmlEscape(r.resourceType)} / ${htmlEscape(d.id as string)}<span class="target-pill">${htmlEscape(ctx.target.name)}</span></h1>
    <dl class="kv">
      ${profile ? `<dt>Profile</dt><dd>${linkCanonical(ctx, profile)}</dd>` : ""}
      <dt>Resource type</dt><dd><code>${htmlEscape(r.resourceType)}</code></dd>
      <dt>Id</dt><dd><code>${htmlEscape(d.id as string)}</code></dd>
    </dl>
    <h2>JSON</h2>
    <pre><code>${htmlEscape(JSON.stringify(d, null, 2))}</code></pre>
  `);
}

function formatCard(min: unknown, max: unknown): string {
  if (min === undefined && max === undefined) return "";
  return `${min ?? "0"}..${max ?? "*"}`;
}

function linkCanonical(ctx: RenderCtx, url: string | undefined): string {
  if (!url) return "<span class='muted'>—</span>";
  const r = ctx.bundle.byCanonical.get(url);
  if (r) {
    const target = ctx.bundle.resources.get(r);
    if (target) return `<a href="${pageHref(target)}"><code>${htmlEscape(url)}</code></a>`;
  }
  return `<code>${htmlEscape(url)}</code>`;
}
