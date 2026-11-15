#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --lib --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir web/wasm --out-name apex target/wasm32-unknown-unknown/release/apex_heritage.wasm
# A workspace may keep generated preview output in an ignored build directory.
# Recreate a relative symlink target if a clean workspace snapshot omitted it.
if [[ -L site ]]; then mkdir -p "$(readlink site)"; fi
npm run build
