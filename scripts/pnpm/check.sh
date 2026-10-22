#!/usr/bin/env bash
set -euo pipefail

if (($# != 0)); then
    echo 'Usage: pnpm run check' >&2
    exit 2
fi
factory-files check
nix flake check .
check-git-hooks
check-nixfmt
check-deadnix
check-statix
check-editorconfig
check-shellcheck . ':(exclude,glob).pi/skills/**'
check-shfmt . ':(exclude,glob).pi/skills/**'
check-markdown '*.md' ':(exclude,glob).pi/memory/**' ':(exclude,glob).pi/skills/**' ':(exclude)AGENTS.md'
check-actionlint
check-semgrep
check-trivy
check-typos
check-vale README.md
check-yamllint
check-taplo
check-taplo-format
check-terraform-nonempty tf
TF_DIR=tf check-terraform-format
TF_DIR=tf check-terraform
TF_DIR=tf check-tflint
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec biome check .
pnpm exec next typegen
pnpm exec tsc --noEmit --incremental false
pnpm exec knip
node scripts/pnpm/assets.ts --check
