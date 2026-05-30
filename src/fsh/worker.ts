// FSH compile worker. Runs fsh-sushi off the main thread so a whole-tank
// recompile never blocks the dev event loop. One request → one response,
// correlated by `id`. The heavy fsh-sushi module is imported ONLY here, so the
// main thread never loads it.
import { fshToFhir } from "fsh-sushi/dist/run/FshToFhir.js";

type Req = { id: number; input: string[]; opts: Record<string, unknown> };
type Res =
    | { id: number; ok: true; fhir: Array<Record<string, unknown>>; errors: Array<{ message: string }>; warnings: Array<{ message: string }> }
    | { id: number; ok: false; error: string };

// Worker globals (avoid depending on the DOM/webworker lib in tsconfig).
const w = globalThis as unknown as { onmessage: ((e: { data: Req }) => void) | null; postMessage(m: Res): void };

const msgs = (a: Array<{ message?: unknown }> | undefined): Array<{ message: string }> =>
    (a ?? []).map(x => ({ message: String(x?.message ?? x) }));

w.onmessage = async (e) => {
    const { id, input, opts } = e.data;
    try {
        const r = await fshToFhir(input as unknown as string, opts as Record<string, unknown>);
        w.postMessage({
            id, ok: true,
            fhir: (r.fhir ?? []) as Array<Record<string, unknown>>,
            errors: msgs(r.errors), warnings: msgs(r.warnings),
        });
    } catch (err) {
        w.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
};
