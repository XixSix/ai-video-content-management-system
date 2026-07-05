#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RESET_SUMMARY=1 SCENARIO=smoke "$SCRIPT_DIR/backend-load.sh"
SCENARIO=normal "$SCRIPT_DIR/backend-load.sh"
SCENARIO=stress "$SCRIPT_DIR/backend-load.sh"
