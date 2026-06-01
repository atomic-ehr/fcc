// Faithful functional port of `PackageHacker.fixPackageUrl` from HL7 FHIR core
// (vendor/fhir-core/org.hl7.fhir.utilities/src/main/java/org/hl7/fhir/utilities/
// npm/PackageHacker.java). IG Publisher runs every dependency's published web
// location ("url" in its package.json) through this before using it as the base
// for cross-IG links, because a number of historical publishes baked in wrong
// locations (a `file://…/output` build path, a mis-versioned URL, …). The data
// is Grahame's curated workaround list; we port the URL-fixing logic only — the
// rest of PackageHacker is his internal package-editing tooling.
//
// `secure` mirrors PackageHacker.useSecureReferences: when set, http hl7.org /
// build.fhir.org URLs are upgraded to https (off by default, as in Java).

// Exact-match rewrites — "workaround for past publishing problems" (the Java
// switch). Kept verbatim, key → replacement.
const REWRITES: Record<string, string> = {
    "file://C:\\GitHub\\hl7.fhir.us.breast-radiology#0.2.0\\output":   "http://hl7.org/fhir/us/breast-radiology/2020May",
    "file://C:\\GitHub\\hl7.fhir.us.bser#1.0.0\\output":               "http://hl7.org/fhir/us/bser/STU1",
    "file://C:\\GitHub\\hl7.fhir.us.carin-bb#0.1.0\\output":           "http://hl7.org/fhir/us/carin-bb/2020Feb",
    "file://C:\\GitHub\\hl7.fhir.us.carin-rtpbc#0.1.0\\output":        "http://hl7.org/fhir/us/carin-rtpbc/2020Feb",
    "file://C:\\GitHub\\hl7.fhir.us.cqfmeasures#1.1.0\\output":        "http://hl7.org/fhir/us/cqfmeasures/2020Feb",
    "file://C:\\GitHub\\hl7.fhir.us.cqfmeasures#2.0.0\\output":        "http://hl7.org/fhir/us/cqfmeasures/STU2",
    "file://C:\\GitHub\\hl7.fhir.us.davinci-alerts#0.2.0\\output":     "http://hl7.org/fhir/us/davinci-alerts/2020Feb",
    "file://C:\\GitHub\\hl7.fhir.us.davinci-atr#0.1.0\\output":        "http://hl7.org/fhir/us/davinci-atr/2020Feb",
    "file://C:\\GitHub\\hl7.fhir.us.davinci-deqm#1.1.0\\output":       "http://hl7.org/fhir/us/davinci-deqm/2020Feb",
    "file://C:\\GitHub\\hl7.fhir.us.davinci-deqm#1.0.0\\output":       "http://hl7.org/fhir/us/davinci-deqm/STU1",
    "file://C:\\GitHub\\hl7.fhir.us.dme-orders#0.1.1\\output":         "http://hl7.org/fhir/us/dme-orders/2020May",
    "file://C:\\GitHub\\hl7.fhir.us.ecr#1.0.0\\output":                "http://hl7.org/fhir/us/ecr/STU1",
    "file://C:\\GitHub\\hl7.fhir.us.mcode#1.0.0\\output":              "http://hl7.org/fhir/us/mcode/STU1",
    "file://C:\\GitHub\\hl7.fhir.us.odh#1.0.0\\output":                "http://hl7.org/fhir/us/odh/STU1",
    "file://C:\\GitHub\\hl7.fhir.us.qicore#4.0.0\\output":             "http://hl7.org/fhir/us/qicore/STU4",
    "file://C:\\GitHub\\hl7.fhir.uv.ips#1.0.0\\output":                "http://hl7.org/fhir/uv/ips/STU1",
    "file://C:\\GitHub\\hl7.fhir.uv.mhealth-framework#0.1.0\\output":  "http://hl7.org/fhir/uv/mhealth-framework/2020May",
    "file://C:\\GitHub\\hl7.fhir.uv.security-label-ds4p#0.1.0\\output": "http://hl7.org/fhir/uv/security-label-ds4p/2020May",
    "file://C:\\GitHub\\hl7.fhir.uv.shorthand#0.12.0\\output":         "http://hl7.org/fhir/uv/shorthand/2020May",
    "http://build.fhir.org/branches/R4B//":                           "http://hl7.org/fhir/2021Mar",
};

export default function fixPackageUrl(webref: string | null | undefined, opts: { secure?: boolean } = {}): string | null {
    if (webref == null) return null;

    // 1. exact-match workarounds for past publishing problems.
    const exact = REWRITES[webref];
    if (exact !== undefined) return exact;

    // 2. https://github.com/HL7/fhir-ig-publisher/issues/295
    if (webref.includes("hl7.org/fhir/us/core/STU4.0.0")) {
        return webref.replace("hl7.org/fhir/us/core/STU4.0.0", "hl7.org/fhir/us/core/STU4");
    }
    if (webref === "http://hl7.org/fhir/us/core/v311") {
        return "https://hl7.org/fhir/us/core/STU3.1.1";
    }
    // cross-version package base with the redundant package name in the path.
    if (webref.includes("hl7.org/fhir/uv/hl7.fhir.uv.xver")) {
        webref = webref.replace("hl7.org/fhir/uv/hl7.fhir.uv.xver", "hl7.org/fhir/uv/xver");
    }

    // 3. optional http → https upgrade (PackageHacker.useSecureReferences).
    if (opts.secure) {
        return webref.replace("http://hl7.org/fhir", "https://hl7.org/fhir").replace("http://build.fhir.org", "https://build.fhir.org");
    }
    return webref;
}
