// One validation issue in the QA report (shape written by the fcc/validator
// plugin to ctx.shared.validate, consumed by renderErrors).
export type ValidationIssue = {
    rid: string;
    rt: string;
    fhirId: string;
    title: string;
    href: string;
    severity: "error" | "warning" | "information";
    code: string;
    path: string;
    message?: string;
    expected?: string;
    got?: string;
    reason?: string;          // suppressed issues carry their suppression category
};
