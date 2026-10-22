#!/usr/bin/env bash
set -euo pipefail

TF_DIR=tf nix run --no-write-lock-file .#github-workflow-plan
