#!/usr/bin/env bash
set -euo pipefail

if (($# != 0)); then
    echo 'Usage: pnpm run fix' >&2
    exit 2
fi
factory-files write
TF_DIR=tf fix-terraform
fix-nixfmt
fix-shfmt . ':(exclude,glob).pi/skills/**'
fix-taplo
fix-editorconfig-eof
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec biome check --write .
