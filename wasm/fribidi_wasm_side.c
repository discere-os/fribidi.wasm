#include <fribidi.h>

const char* fribidi_wasm_version(void) {
  return fribidi_version_info;
}

