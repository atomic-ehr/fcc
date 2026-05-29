// "Notes" section: authored per-resource notes (intro-notes <RT>-<id>-notes.md).
// Returns null when there are no notes (comment-only templates are already
// dropped upstream in loadIntroNotes).
export default function $section_notes(ctx: Context, opts: { resource: types.fcc.Resource }): { title: string; id: string; html: string } | null {
    const { notes } = ctx.fns.site.notesFor(ctx, { resource: opts.resource });
    return notes ? { title: "Notes", id: "notes-section", html: `<article class="prose prose-slate mt-2 max-w-3xl">${notes}</article>` } : null;
}
