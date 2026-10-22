#!/usr/bin/env bash
set -euo pipefail

pnpm run check
test-semgrep
node scripts/pnpm/dev.ts --test "$@"
