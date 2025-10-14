/**
 * Fribidi WASM Benchmarks
 */

import FribidiWASM from "../src/lib/index.ts"

Deno.bench("fribidi initialization", {
  baseline: true
}, async () => {
  const lib = new FribidiWASM()
  await lib.initialize()
})
