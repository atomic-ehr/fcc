// The QA report the fcc/validator plugin writes to ctx.shared.validate. `issues`
// holds the *active* (non-suppressed) issues; suppressed warnings/hints (and the
// full pattern list with use counts, for stale-suppression detection) sit under
// `suppressed` — IG-Publisher SuppressedMessageInformation parity.
export type ValidationReport = {
    issues: import("./$type_ValidationIssue").ValidationIssue[];
    summary: { errors: number; warnings: number; resources: number; total: number };
    suppressed?: {
        total: number;
        entries: { raw: string; reason: string; warnings: number; hints: number }[];
        issues: import("./$type_ValidationIssue").ValidationIssue[];
    };
};
