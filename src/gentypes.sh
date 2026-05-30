#!/usr/bin/env bash
# Regenerate ctx_ns.d.ts for every namespace under /src.
# `core` declares the shared base (Context + fcc types); the rest are --fragment
# (only augment FnsRegistry + their own types.<ns>). Run after adding/removing
# or renaming files in any namespace.
set -euo pipefail
cd "$(dirname "$0")/.."
GT="packages/fcc/bin/gentypes.ts"
EXT='fcc:fcc:Bundle,Resource,ResolvedConfig,Target,Plugin,PluginContext,HotUpdateContext'
bun "$GT" src/core --ns core --external "$EXT"
for ns in md profile terminology capability narrative artifacts; do
  bun "$GT" "src/$ns" --ns "$ns" --fragment
done
