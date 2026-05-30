// Defence-in-depth HTML sanitizer for author/resource-controlled content that
// reaches the page as raw HTML (markdown output, FHIR text.div). Strips active
// content — <script>/<style>/<iframe>/<object>/<embed> (with bodies), other
// risky tags, on*= event-handler attributes, and javascript:/vbscript: URLs.
// Regex-based (no DOM at build time): not a substitute for a real sanitizer
// against a determined attacker, but neutralizes the obvious injection vectors.
export default function sanitizeHtml(_ctx: Context, opts: { html: string }): string {
    let h = opts.html;
    // 1) Drop dangerous elements together with their contents.
    h = h.replace(/<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "");
    // 2) Drop remaining risky / unmatched tags (open or close).
    h = h.replace(/<\/?(script|style|iframe|object|embed|svg|math|link|meta|base|form|input|button|textarea)\b[^>]*>/gi, "");
    // 3) Strip inline event handlers (onclick=, onerror=, …).
    h = h.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    // 4) Neutralize javascript:/vbscript:/data: in URL attributes.
    h = h.replace(/\s(href|src|xlink:href)\s*=\s*("|')\s*(?:javascript|vbscript|data):[^"']*\2/gi, ' $1="#"');
    return h;
}
