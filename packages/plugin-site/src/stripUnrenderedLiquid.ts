export default function stripUnrenderedLiquid(_ctx: Context, opts: { md: string }): string {
    return opts.md
        .replace(/\{%[\s\S]*?%\}/g, "")
        .replace(/\{\{[\s\S]*?\}\}/g, "");
}
