/*
 * FriBidi WASM API Wrapper
 * JavaScript-callable functions for Unicode Bidirectional Algorithm
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

#include "fribidi.h"
#include "fribidi-wasm.h"
#include <stdlib.h>
#include <string.h>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif

/* Memory management helpers for WASM */
static void* wasm_malloc(size_t size) {
    return malloc(size);
}

static void wasm_free(void* ptr) {
    if (ptr) {
        free(ptr);
    }
}

/*
 * Main bidirectional processing function wrapper
 * Returns maximum embedding level found, or -1 on error
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_log2vis_wrapper(
    const FriBidiChar* logical_str,
    FriBidiStrIndex length,
    FriBidiParType* base_dir,
    FriBidiChar* visual_str,
    FriBidiStrIndex* ltov_positions,
    FriBidiStrIndex* vtol_positions,
    FriBidiLevel* embedding_levels
) {
    if (!logical_str || length <= 0) {
        return -1;
    }

    /* Allocate temporary arrays if not provided */
    FriBidiChar* temp_visual = visual_str;
    FriBidiStrIndex* temp_ltov = ltov_positions;
    FriBidiStrIndex* temp_vtol = vtol_positions;
    FriBidiLevel* temp_levels = embedding_levels;

    if (!temp_visual) {
        temp_visual = (FriBidiChar*)wasm_malloc(length * sizeof(FriBidiChar));
        if (!temp_visual) return -1;
    }

    /* Call the main FriBidi function */
    FriBidiLevel max_level = fribidi_log2vis(
        logical_str, length, base_dir,
        temp_visual, temp_ltov, temp_vtol, temp_levels
    );

    /* Copy results back if using temporary arrays */
    if (!visual_str && temp_visual) {
        wasm_free(temp_visual);
    }

    return (int)max_level;
}

/*
 * Get bidirectional character types
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_get_bidi_types_wrapper(
    const FriBidiChar* str,
    FriBidiStrIndex length,
    FriBidiCharType* types
) {
    if (!str || !types || length <= 0) {
        return 0;
    }

    fribidi_get_bidi_types(str, length, types);
    return 1; /* Success */
}

/*
 * Get paragraph embedding levels
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_get_par_embedding_levels_wrapper(
    const FriBidiCharType* types,
    FriBidiStrIndex length,
    FriBidiParType* base_dir,
    FriBidiLevel* embedding_levels
) {
    if (!types || !embedding_levels || length <= 0) {
        return -1;
    }

    FriBidiLevel max_level = fribidi_get_par_embedding_levels_ex(
        types, NULL, length, base_dir, embedding_levels
    );

    return (int)max_level;
}

/*
 * Reorder line for visual display
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_reorder_line_wrapper(
    FriBidiFlags flags,
    const FriBidiCharType* types,
    FriBidiStrIndex length,
    FriBidiStrIndex off,
    const FriBidiParType base_dir,
    FriBidiLevel* embedding_levels,
    FriBidiChar* visual_str,
    FriBidiStrIndex* map
) {
    if (!types || !embedding_levels || length <= 0) {
        return -1;
    }

    FriBidiLevel max_level = fribidi_reorder_line(
        flags, types, length, off, base_dir,
        embedding_levels, visual_str, map
    );

    return (int)max_level;
}

/*
 * Remove bidirectional marks from string
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_remove_bidi_marks_wrapper(
    FriBidiChar* str,
    FriBidiStrIndex length,
    FriBidiStrIndex* positions_to_this,
    FriBidiStrIndex* positions_from_this,
    FriBidiLevel* embedding_levels
) {
    if (!str || length <= 0) {
        return -1;
    }

    FriBidiStrIndex new_length = fribidi_remove_bidi_marks(
        str, length, positions_to_this, positions_from_this, embedding_levels
    );

    return (int)new_length;
}

/*
 * Arabic shaping wrapper
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_shape_arabic_wrapper(
    FriBidiFlags flags,
    const FriBidiLevel* embedding_levels,
    FriBidiStrIndex length,
    FriBidiArabicProp* ar_props,
    FriBidiChar* str
) {
    if (!str || !embedding_levels || length <= 0) {
        return 0;
    }

    fribidi_shape_arabic(flags, embedding_levels, length, ar_props, str);
    return 1; /* Success */
}

/*
 * Get mirror character
 */
EMSCRIPTEN_KEEPALIVE
FriBidiChar fribidi_get_mirror_char_wrapper(FriBidiChar ch) {
    FriBidiChar mirrored;
    if (fribidi_get_mirror_char(ch, &mirrored)) {
        return mirrored;
    }
    return ch; /* Return original if no mirror found */
}

/*
 * Get bracket types for bracket matching
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_get_bracket_types_wrapper(
    const FriBidiChar* str,
    FriBidiStrIndex length,
    const FriBidiCharType* types,
    FriBidiBracketType* bracket_types
) {
    if (!str || !types || !bracket_types || length <= 0) {
        return 0;
    }

    fribidi_get_bracket_types(str, length, types, bracket_types);
    return 1; /* Success */
}

/*
 * Version information
 */
EMSCRIPTEN_KEEPALIVE
const char* fribidi_version_wrapper(void) {
    return FRIBIDI_VERSION;
}

EMSCRIPTEN_KEEPALIVE
const char* fribidi_unicode_version_wrapper(void) {
    return fribidi_unicode_version;
}

/*
 * Character property lookup functions - optimized for WASM
 */
// Note: fribidi_get_type_internal is provided by fribidi-deprecated.c

EMSCRIPTEN_KEEPALIVE
FriBidiJoiningType fribidi_get_joining_type_internal(FriBidiChar ch) {
    return fribidi_get_joining_type(ch);
}

/*
 * Bulk processing helpers for better performance
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_process_paragraph_wrapper(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiParType base_direction,
    FriBidiChar* visual_text,
    FriBidiStrIndex* ltov_map,
    FriBidiStrIndex* vtol_map,
    FriBidiLevel* levels,
    FriBidiCharType* types
) {
    if (!text || length <= 0) {
        return -1;
    }

    /* Allocate temporary arrays */
    FriBidiCharType* temp_types = types;
    if (!temp_types) {
        temp_types = (FriBidiCharType*)wasm_malloc(length * sizeof(FriBidiCharType));
        if (!temp_types) return -1;
    }

    /* Get bidirectional character types */
    fribidi_get_bidi_types(text, length, temp_types);

    /* Process the paragraph */
    FriBidiParType pbase_dir = base_direction;
    FriBidiLevel max_level = fribidi_log2vis(
        text, length, &pbase_dir,
        visual_text, ltov_map, vtol_map, levels
    );

    /* Clean up temporary arrays */
    if (!types && temp_types) {
        wasm_free(temp_types);
    }

    return (int)max_level;
}

/*
 * Memory allocation wrappers for JavaScript
 */
EMSCRIPTEN_KEEPALIVE
void* fribidi_malloc_wrapper(size_t size) {
    return wasm_malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void fribidi_free_wrapper(void* ptr) {
    wasm_free(ptr);
}

/*
 * Utility functions for text processing
 */
EMSCRIPTEN_KEEPALIVE
int fribidi_utf8_to_utf32_wrapper(
    const char* utf8_str,
    int utf8_length,
    FriBidiChar* utf32_str,
    int utf32_max_length
) {
    if (!utf8_str || !utf32_str || utf8_length <= 0 || utf32_max_length <= 0) {
        return -1;
    }

    /* This is a simplified conversion - in a real implementation,
     * you'd want proper UTF-8 to UTF-32 conversion */
    FriBidiStrIndex converted = fribidi_charset_to_unicode(
        FRIBIDI_CHAR_SET_UTF8, utf8_str, utf8_length, utf32_str
    );

    return (int)converted;
}

EMSCRIPTEN_KEEPALIVE
int fribidi_utf32_to_utf8_wrapper(
    const FriBidiChar* utf32_str,
    int utf32_length,
    char* utf8_str,
    int utf8_max_length
) {
    if (!utf32_str || !utf8_str || utf32_length <= 0 || utf8_max_length <= 0) {
        return -1;
    }

    /* This is a simplified conversion - in a real implementation,
     * you'd want proper UTF-32 to UTF-8 conversion */
    FriBidiStrIndex converted = fribidi_unicode_to_charset(
        FRIBIDI_CHAR_SET_UTF8, utf32_str, utf32_length, utf8_str
    );

    return (int)converted;
}