/*
 * FriBidi WASM Main Module
 * Core WASM module initialization and utilities
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

#include "fribidi-wasm.h"
#include <stdlib.h>
#include <string.h>

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif

/* Module initialization flag */
static int fribidi_wasm_initialized = 0;

/*
 * Initialize the WASM module
 */
FRIBIDI_WASM_EXPORT int fribidi_wasm_init(void) {
    if (fribidi_wasm_initialized) {
        return FRIBIDI_WASM_SUCCESS;
    }

    /* Initialize FriBidi library - no special initialization needed for core FriBidi */
    
    /* Set up any WASM-specific configurations */
#ifdef FRIBIDI_WASM_SIMD
    /* SIMD functionality currently disabled in this build */
#endif

    fribidi_wasm_initialized = 1;
    return FRIBIDI_WASM_SUCCESS;
}

/*
 * Clean up the WASM module
 */
FRIBIDI_WASM_EXPORT void fribidi_wasm_cleanup(void) {
    /* No special cleanup needed for FriBidi core */
    fribidi_wasm_initialized = 0;
}

/*
 * SIMD availability check (stub - SIMD disabled in this build)
 */
FRIBIDI_WASM_EXPORT int fribidi_simd_available(void) {
    return 0; /* SIMD not available in this build */
}

/*
 * Get module capabilities
 */
FRIBIDI_WASM_EXPORT FriBidiWASMCapabilities fribidi_wasm_get_capabilities(void) {
    FriBidiWASMCapabilities caps;
    
    caps.name = "GNU FriBidi WASM";
    caps.version = FRIBIDI_WASM_VERSION_STRING;
    caps.unicode_version = fribidi_unicode_version;
    
#ifdef FRIBIDI_WASM_SIMD
    caps.simd_enabled = 1;
#else
    caps.simd_enabled = 0;
#endif

#ifdef DEBUG
    caps.debug_enabled = 1;
#else
    caps.debug_enabled = 0;
#endif

    return caps;
}

/*
 * Simple text direction detection helper
 */
FRIBIDI_WASM_EXPORT FriBidiParType fribidi_detect_base_direction(
    const FriBidiChar* text,
    FriBidiStrIndex length
) {
    if (!text || length <= 0) {
        return FRIBIDI_PAR_ON; /* Neutral */
    }

    /* Use FriBidi's built-in base direction detection */
    FriBidiParType base_dir = FRIBIDI_PAR_ON;
    
    /* Allocate temporary array for character types */
    FriBidiCharType* types = (FriBidiCharType*)malloc(length * sizeof(FriBidiCharType));
    if (!types) {
        return FRIBIDI_PAR_ON;
    }

    /* Get character types */
    fribidi_get_bidi_types(text, length, types);

    /* Find the base direction */
    for (FriBidiStrIndex i = 0; i < length; i++) {
        FriBidiCharType type = types[i];
        if (FRIBIDI_IS_STRONG(type)) {
            if (FRIBIDI_IS_RTL(type)) {
                base_dir = FRIBIDI_PAR_RTL;
                break;
            } else if (FRIBIDI_IS_LTR_LETTER(type)) {
                base_dir = FRIBIDI_PAR_LTR;
                break;
            }
        }
    }

    free(types);
    return base_dir;
}

/*
 * Simplified paragraph processing function
 */
FRIBIDI_WASM_EXPORT FriBidiWASMResult fribidi_process_text(
    const FriBidiChar* input_text,
    FriBidiStrIndex input_length,
    FriBidiParType base_direction,
    FriBidiChar* output_buffer,
    FriBidiStrIndex output_buffer_size
) {
    FriBidiWASMResult result;
    result.text = NULL;
    result.length = 0;
    result.base_direction = base_direction;
    result.max_level = 0;
    result.success = 0;

    if (!input_text || input_length <= 0 || !output_buffer || output_buffer_size < input_length) {
        return result;
    }

    /* Auto-detect base direction if needed */
    FriBidiParType pbase_dir = base_direction;
    if (pbase_dir == FRIBIDI_PAR_ON) {
        pbase_dir = fribidi_detect_base_direction(input_text, input_length);
    }

    /* Process the text */
    FriBidiLevel max_level = fribidi_log2vis(
        input_text, input_length, &pbase_dir,
        output_buffer, NULL, NULL, NULL
    );

    if (max_level > 0) {
        result.text = output_buffer;
        result.length = input_length;
        result.base_direction = pbase_dir;
        result.max_level = max_level;
        result.success = 1;
    }

    return result;
}

/*
 * Character classification helpers
 */
FRIBIDI_WASM_EXPORT int fribidi_is_rtl_char(FriBidiChar ch) {
    FriBidiCharType type = fribidi_get_bidi_type(ch);
    return FRIBIDI_IS_RTL(type) ? 1 : 0;
}

FRIBIDI_WASM_EXPORT int fribidi_is_ltr_char(FriBidiChar ch) {
    FriBidiCharType type = fribidi_get_bidi_type(ch);
    return FRIBIDI_IS_LTR_LETTER(type) ? 1 : 0;
}

FRIBIDI_WASM_EXPORT int fribidi_is_neutral_char(FriBidiChar ch) {
    FriBidiCharType type = fribidi_get_bidi_type(ch);
    return FRIBIDI_IS_NEUTRAL(type) ? 1 : 0;
}

FRIBIDI_WASM_EXPORT int fribidi_is_arabic_char(FriBidiChar ch) {
    FriBidiJoiningType joining_type = fribidi_get_joining_type(ch);
    return (joining_type != FRIBIDI_JOINING_TYPE_U) ? 1 : 0;
}

/*
 * String utility functions
 */
FRIBIDI_WASM_EXPORT int fribidi_string_has_rtl(
    const FriBidiChar* text,
    FriBidiStrIndex length
) {
    if (!text || length <= 0) {
        return 0;
    }

    for (FriBidiStrIndex i = 0; i < length; i++) {
        if (fribidi_is_rtl_char(text[i])) {
            return 1;
        }
    }
    return 0;
}

FRIBIDI_WASM_EXPORT int fribidi_string_needs_bidi(
    const FriBidiChar* text,
    FriBidiStrIndex length
) {
    if (!text || length <= 0) {
        return 0;
    }

    int has_ltr = 0;
    int has_rtl = 0;

    for (FriBidiStrIndex i = 0; i < length; i++) {
        FriBidiCharType type = fribidi_get_bidi_type(text[i]);
        if (FRIBIDI_IS_LTR_LETTER(type)) {
            has_ltr = 1;
        } else if (FRIBIDI_IS_RTL(type)) {
            has_rtl = 1;
        }
        
        /* If we have both LTR and RTL, bidirectional processing is needed */
        if (has_ltr && has_rtl) {
            return 1;
        }
    }

    /* Return 1 if we have any RTL characters, even without mixed direction */
    return has_rtl ? 1 : 0;
}

/*
 * Performance measurement helpers
 */
#ifdef EMSCRIPTEN
static double get_time_ms(void) {
    return emscripten_get_now();
}
#else
#include <time.h>
static double get_time_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000.0 + ts.tv_nsec / 1000000.0;
}
#endif

FRIBIDI_WASM_EXPORT double fribidi_benchmark_processing(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    int iterations
) {
    if (!text || length <= 0 || iterations <= 0) {
        return -1.0;
    }

    FriBidiChar* output = (FriBidiChar*)malloc(length * sizeof(FriBidiChar));
    if (!output) {
        return -1.0;
    }

    double start_time = get_time_ms();
    
    for (int i = 0; i < iterations; i++) {
        FriBidiParType base_dir = FRIBIDI_PAR_ON;
        fribidi_log2vis(text, length, &base_dir, output, NULL, NULL, NULL);
    }
    
    double end_time = get_time_ms();
    double total_time = end_time - start_time;
    
    free(output);
    return total_time / iterations; /* Average time per iteration in ms */
}

/*
 * Error handling and debugging
 */
static char error_message[256] = {0};

FRIBIDI_WASM_EXPORT const char* fribidi_get_last_error(void) {
    return error_message[0] ? error_message : "No error";
}

FRIBIDI_WASM_EXPORT void fribidi_set_error(const char* message) {
    if (message) {
        strncpy(error_message, message, sizeof(error_message) - 1);
        error_message[sizeof(error_message) - 1] = '\0';
    }
}

FRIBIDI_WASM_EXPORT void fribidi_clear_error(void) {
    error_message[0] = '\0';
}