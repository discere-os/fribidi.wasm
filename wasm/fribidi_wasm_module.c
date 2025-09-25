#include <emscripten.h>
#include <fribidi.h>

EMSCRIPTEN_KEEPALIVE
const char* fribidi_wasm_version(void) {
  return fribidi_version_info;
}

