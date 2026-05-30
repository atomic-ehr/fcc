#!/usr/bin/env bash
# Regenerate ctx_ns.d.ts for every site_* renderer namespace.
# `site_core` declares the shared base (Context + fcc types); the rest are
# --fragment (only augment FnsRegistry + their own types.<ns>). Run after
# adding/removing or renaming files in any namespace.
set -euo pipefail
cd "$(dirname "$0")/../.."          # → repo root
GT="src/bin/gentypes.ts"
EXT='fcc:fcc:Bundle,Resource,ResolvedConfig,Target,Plugin,PluginContext,HotUpdateContext'
bun "$GT" src/site_core --ns site_core --external "$EXT"
for ns in md profile terminology capability narrative artifacts; do
  bun "$GT" "src/site_$ns" --ns "site_$ns" --fragment
done
