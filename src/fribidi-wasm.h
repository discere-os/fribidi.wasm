/*
 * FriBidi WASM Interface Header
 * Common definitions and utilities for WASM build
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

#ifndef FRIBIDI_WASM_H
#define FRIBIDI_WASM_H

#include "../lib/fribidi.h"

#ifdef __cplusplus
extern "C" {
#endif

/* WASM-specific build configuration */
#ifdef EMSCRIPTEN
#include <emscripten.h>
#define FRIBIDI_WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define FRIBIDI_WASM_EXPORT
#endif

/* Version information */
#define FRIBIDI_WASM_VERSION_MAJOR 1
#define FRIBIDI_WASM_VERSION_MINOR 0
#define FRIBIDI_WASM_VERSION_MICRO 16
#define FRIBIDI_WASM_VERSION_STRING "1.0.16"

/* Performance optimization flags */
#ifdef FRIBIDI_WASM_SIMD
#define FRIBIDI_SIMD_ENABLED 1
#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#define FRIBIDI_HAS_WASM_SIMD 1
#endif
#endif

/* Common type definitions for WASM interface */
typedef struct {
    FriBidiChar* text;
    FriBidiStrIndex length;
    FriBidiParType base_direction;
    FriBidiLevel max_level;
    int success;
} FriBidiWASMResult;

typedef struct {
    const char* name;
    const char* version;
    const char* unicode_version;
    int simd_enabled;
    int debug_enabled;
} FriBidiWASMCapabilities;

/* Core WASM API functions */
FRIBIDI_WASM_EXPORT int fribidi_log2vis_wrapper(
    const FriBidiChar* logical_str,
    FriBidiStrIndex length,
    FriBidiParType* base_dir,
    FriBidiChar* visual_str,
    FriBidiStrIndex* ltov_positions,
    FriBidiStrIndex* vtol_positions,
    FriBidiLevel* embedding_levels
);

FRIBIDI_WASM_EXPORT int fribidi_get_bidi_types_wrapper(
    const FriBidiChar* str,
    FriBidiStrIndex length,
    FriBidiCharType* types
);

FRIBIDI_WASM_EXPORT int fribidi_get_par_embedding_levels_wrapper(
    const FriBidiCharType* types,
    FriBidiStrIndex length,
    FriBidiParType* base_dir,
    FriBidiLevel* embedding_levels
);

FRIBIDI_WASM_EXPORT int fribidi_reorder_line_wrapper(
    FriBidiFlags flags,
    const FriBidiCharType* types,
    FriBidiStrIndex length,
    FriBidiStrIndex off,
    const FriBidiParType base_dir,
    FriBidiLevel* embedding_levels,
    FriBidiChar* visual_str,
    FriBidiStrIndex* map
);

/* Arabic shaping and mirroring */
FRIBIDI_WASM_EXPORT int fribidi_shape_arabic_wrapper(
    FriBidiFlags flags,
    const FriBidiLevel* embedding_levels,
    FriBidiStrIndex length,
    FriBidiArabicProp* ar_props,
    FriBidiChar* str
);

FRIBIDI_WASM_EXPORT FriBidiChar fribidi_get_mirror_char_wrapper(FriBidiChar ch);

FRIBIDI_WASM_EXPORT int fribidi_get_bracket_types_wrapper(
    const FriBidiChar* str,
    FriBidiStrIndex length,
    const FriBidiCharType* types,
    FriBidiBracketType* bracket_types
);

/* Utility functions */
FRIBIDI_WASM_EXPORT int fribidi_remove_bidi_marks_wrapper(
    FriBidiChar* str,
    FriBidiStrIndex length,
    FriBidiStrIndex* positions_to_this,
    FriBidiStrIndex* positions_from_this,
    FriBidiLevel* embedding_levels
);

/* High-level processing functions */
FRIBIDI_WASM_EXPORT int fribidi_process_paragraph_wrapper(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiParType base_direction,
    FriBidiChar* visual_text,
    FriBidiStrIndex* ltov_map,
    FriBidiStrIndex* vtol_map,
    FriBidiLevel* levels,
    FriBidiCharType* types
);

/* Character encoding conversion helpers */
FRIBIDI_WASM_EXPORT int fribidi_utf8_to_utf32_wrapper(
    const char* utf8_str,
    int utf8_length,
    FriBidiChar* utf32_str,
    int utf32_max_length
);

FRIBIDI_WASM_EXPORT int fribidi_utf32_to_utf8_wrapper(
    const FriBidiChar* utf32_str,
    int utf32_length,
    char* utf8_str,
    int utf8_max_length
);

/* Version and capability information */
FRIBIDI_WASM_EXPORT const char* fribidi_version_wrapper(void);
FRIBIDI_WASM_EXPORT const char* fribidi_unicode_version_wrapper(void);

/* Character property lookups - optimized for WASM */
FRIBIDI_WASM_EXPORT FriBidiCharType fribidi_get_type_internal(FriBidiChar ch);
FRIBIDI_WASM_EXPORT FriBidiJoiningType fribidi_get_joining_type_internal(FriBidiChar ch);

/* Memory management for JavaScript interface */
FRIBIDI_WASM_EXPORT void* fribidi_malloc_wrapper(size_t size);
FRIBIDI_WASM_EXPORT void fribidi_free_wrapper(void* ptr);

/* Performance and optimization helpers */
#ifdef FRIBIDI_WASM_SIMD
/* SIMD-optimized functions declared in separate file */
FRIBIDI_WASM_EXPORT int fribidi_simd_available(void);
FRIBIDI_WASM_EXPORT int fribidi_process_bidi_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiCharType* types
);
#endif

/* Debugging and profiling support */
#ifdef DEBUG
FRIBIDI_WASM_EXPORT void fribidi_debug_set_level(int level);
FRIBIDI_WASM_EXPORT void fribidi_debug_print_string(
    const FriBidiChar* str,
    FriBidiStrIndex length,
    const char* label
);
#endif

/* Common constants for JavaScript interface */
#define FRIBIDI_WASM_MAX_STRING_LENGTH 65536
#define FRIBIDI_WASM_DEFAULT_BUFFER_SIZE 4096

/* Error codes */
#define FRIBIDI_WASM_SUCCESS 0
#define FRIBIDI_WASM_ERROR_INVALID_INPUT -1
#define FRIBIDI_WASM_ERROR_MEMORY_ALLOCATION -2
#define FRIBIDI_WASM_ERROR_BUFFER_TOO_SMALL -3
#define FRIBIDI_WASM_ERROR_UNSUPPORTED_OPERATION -4

#ifdef __cplusplus
}
#endif

#endif /* FRIBIDI_WASM_H */