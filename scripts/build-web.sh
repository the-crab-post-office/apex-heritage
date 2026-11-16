#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --lib --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir web/wasm --out-name apex target/wasm32-unknown-unknown/release/apex_heritage.wasm
npm run build
