// The QA report the fcc/validator plugin writes to ctx.shared.validate.
export type ValidationReport = {
    issues: import("./$type_ValidationIssue").ValidationIssue[];
    summary: { errors: number; warnings: number; resources: number; total: number };
};
