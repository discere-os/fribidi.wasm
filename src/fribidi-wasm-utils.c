/*
 * FriBidi WASM Utilities
 * Helper functions and utilities for WASM build
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

/*
 * Memory pool for improved performance
 */
#define MEMORY_POOL_SIZE 32768
static char memory_pool[MEMORY_POOL_SIZE];
static size_t memory_pool_offset = 0;
static int use_memory_pool = 1;

/*
 * Fast memory allocation from pool
 */
FRIBIDI_WASM_EXPORT void* fribidi_pool_alloc(size_t size) {
    if (!use_memory_pool || size > (MEMORY_POOL_SIZE - memory_pool_offset)) {
        return malloc(size);
    }
    
    void* ptr = memory_pool + memory_pool_offset;
    memory_pool_offset += (size + 7) & ~7; /* Align to 8 bytes */
    return ptr;
}

/*
 * Reset memory pool
 */
FRIBIDI_WASM_EXPORT void fribidi_pool_reset(void) {
    memory_pool_offset = 0;
}

/*
 * Enable/disable memory pool usage
 */
FRIBIDI_WASM_EXPORT void fribidi_pool_enable(int enable) {
    use_memory_pool = enable;
    if (enable) {
        fribidi_pool_reset();
    }
}

/*
 * Array manipulation helpers for JavaScript interface
 */
FRIBIDI_WASM_EXPORT FriBidiChar* fribidi_alloc_char_array(FriBidiStrIndex length) {
    if (length <= 0 || length > FRIBIDI_WASM_MAX_STRING_LENGTH) {
        return NULL;
    }
    return (FriBidiChar*)fribidi_pool_alloc(length * sizeof(FriBidiChar));
}

FRIBIDI_WASM_EXPORT FriBidiCharType* fribidi_alloc_type_array(FriBidiStrIndex length) {
    if (length <= 0 || length > FRIBIDI_WASM_MAX_STRING_LENGTH) {
        return NULL;
    }
    return (FriBidiCharType*)fribidi_pool_alloc(length * sizeof(FriBidiCharType));
}

FRIBIDI_WASM_EXPORT FriBidiLevel* fribidi_alloc_level_array(FriBidiStrIndex length) {
    if (length <= 0 || length > FRIBIDI_WASM_MAX_STRING_LENGTH) {
        return NULL;
    }
    return (FriBidiLevel*)fribidi_pool_alloc(length * sizeof(FriBidiLevel));
}

FRIBIDI_WASM_EXPORT FriBidiStrIndex* fribidi_alloc_index_array(FriBidiStrIndex length) {
    if (length <= 0 || length > FRIBIDI_WASM_MAX_STRING_LENGTH) {
        return NULL;
    }
    return (FriBidiStrIndex*)fribidi_pool_alloc(length * sizeof(FriBidiStrIndex));
}

/*
 * String conversion utilities
 */
FRIBIDI_WASM_EXPORT int fribidi_utf16_to_utf32_simple(
    const uint16_t* utf16_str,
    int utf16_length,
    FriBidiChar* utf32_str,
    int utf32_max_length
) {
    if (!utf16_str || !utf32_str || utf16_length <= 0 || utf32_max_length <= 0) {
        return -1;
    }

    int utf32_length = 0;
    int i = 0;

    while (i < utf16_length && utf32_length < utf32_max_length) {
        uint16_t ch = utf16_str[i];
        
        if (ch < 0xD800 || ch > 0xDFFF) {
            /* Basic Multilingual Plane character */
            utf32_str[utf32_length] = (FriBidiChar)ch;
            utf32_length++;
            i++;
        } else if (ch >= 0xD800 && ch <= 0xDBFF) {
            /* High surrogate */
            if (i + 1 < utf16_length) {
                uint16_t low = utf16_str[i + 1];
                if (low >= 0xDC00 && low <= 0xDFFF) {
                    /* Valid surrogate pair */
                    FriBidiChar codepoint = 0x10000 + ((ch & 0x3FF) << 10) + (low & 0x3FF);
                    utf32_str[utf32_length] = codepoint;
                    utf32_length++;
                    i += 2;
                } else {
                    /* Invalid surrogate pair */
                    utf32_str[utf32_length] = 0xFFFD; /* Replacement character */
                    utf32_length++;
                    i++;
                }
            } else {
                /* Incomplete surrogate pair at end */
                utf32_str[utf32_length] = 0xFFFD;
                utf32_length++;
                i++;
            }
        } else {
            /* Unexpected low surrogate */
            utf32_str[utf32_length] = 0xFFFD;
            utf32_length++;
            i++;
        }
    }

    return utf32_length;
}

FRIBIDI_WASM_EXPORT int fribidi_utf32_to_utf16_simple(
    const FriBidiChar* utf32_str,
    int utf32_length,
    uint16_t* utf16_str,
    int utf16_max_length
) {
    if (!utf32_str || !utf16_str || utf32_length <= 0 || utf16_max_length <= 0) {
        return -1;
    }

    int utf16_length = 0;

    for (int i = 0; i < utf32_length && utf16_length < utf16_max_length; i++) {
        FriBidiChar ch = utf32_str[i];
        
        if (ch <= 0xFFFF) {
            if (ch >= 0xD800 && ch <= 0xDFFF) {
                /* Invalid surrogate range in UTF-32 */
                utf16_str[utf16_length] = 0xFFFD;
                utf16_length++;
            } else {
                utf16_str[utf16_length] = (uint16_t)ch;
                utf16_length++;
            }
        } else if (ch <= 0x10FFFF) {
            /* Needs surrogate pair */
            if (utf16_length + 1 >= utf16_max_length) {
                break; /* Not enough space for surrogate pair */
            }
            
            ch -= 0x10000;
            utf16_str[utf16_length] = 0xD800 + (uint16_t)(ch >> 10);
            utf16_str[utf16_length + 1] = 0xDC00 + (uint16_t)(ch & 0x3FF);
            utf16_length += 2;
        } else {
            /* Invalid Unicode code point */
            utf16_str[utf16_length] = 0xFFFD;
            utf16_length++;
        }
    }

    return utf16_length;
}

/*
 * Bulk character property lookup for performance
 */
FRIBIDI_WASM_EXPORT void fribidi_get_bidi_types_bulk(
    const FriBidiChar* chars,
    FriBidiCharType* types,
    FriBidiStrIndex length
) {
    if (!chars || !types || length <= 0) {
        return;
    }

    /* Use the standard FriBidi function - it's already optimized */
    fribidi_get_bidi_types(chars, length, types);
}

FRIBIDI_WASM_EXPORT void fribidi_get_joining_types_bulk(
    const FriBidiChar* chars,
    FriBidiJoiningType* types,
    FriBidiStrIndex length
) {
    if (!chars || !types || length <= 0) {
        return;
    }

    for (FriBidiStrIndex i = 0; i < length; i++) {
        types[i] = fribidi_get_joining_type(chars[i]);
    }
}

/*
 * String analysis helpers
 */
FRIBIDI_WASM_EXPORT int fribidi_analyze_string(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    int* has_ltr,
    int* has_rtl,
    int* has_arabic,
    int* has_hebrew,
    int* needs_shaping
) {
    if (!text || length <= 0) {
        return FRIBIDI_WASM_ERROR_INVALID_INPUT;
    }

    int ltr_count = 0, rtl_count = 0, arabic_count = 0, hebrew_count = 0, shaping_needed = 0;

    for (FriBidiStrIndex i = 0; i < length; i++) {
        FriBidiChar ch = text[i];
        FriBidiCharType bidi_type = fribidi_get_bidi_type(ch);
        
        if (FRIBIDI_IS_LTR_LETTER(bidi_type)) {
            ltr_count++;
        } else if (FRIBIDI_IS_RTL(bidi_type)) {
            rtl_count++;
            
            /* Check for Arabic or Hebrew */
            if (ch >= 0x0590 && ch <= 0x05FF) {
                hebrew_count++;
            } else if (ch >= 0x0600 && ch <= 0x06FF) {
                arabic_count++;
                
                /* Arabic characters may need shaping */
                FriBidiJoiningType joining_type = fribidi_get_joining_type(ch);
                if (joining_type != FRIBIDI_JOINING_TYPE_U) {
                    shaping_needed = 1;
                }
            } else if (ch >= 0x0750 && ch <= 0x077F) {
                /* Arabic Supplement */
                arabic_count++;
            } else if (ch >= 0xFB50 && ch <= 0xFDFF) {
                /* Arabic Presentation Forms-A */
                arabic_count++;
                shaping_needed = 1;
            } else if (ch >= 0xFE70 && ch <= 0xFEFF) {
                /* Arabic Presentation Forms-B */
                arabic_count++;
                shaping_needed = 1;
            }
        }
    }

    if (has_ltr) *has_ltr = ltr_count > 0;
    if (has_rtl) *has_rtl = rtl_count > 0;
    if (has_arabic) *has_arabic = arabic_count > 0;
    if (has_hebrew) *has_hebrew = hebrew_count > 0;
    if (needs_shaping) *needs_shaping = shaping_needed;

    return FRIBIDI_WASM_SUCCESS;
}

/*
 * Line breaking helpers for paragraph processing
 */
FRIBIDI_WASM_EXPORT int fribidi_find_line_breaks(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiStrIndex max_line_length,
    FriBidiStrIndex* break_positions,
    int max_breaks
) {
    if (!text || length <= 0 || !break_positions || max_breaks <= 0) {
        return -1;
    }

    int break_count = 0;
    FriBidiStrIndex current_length = 0;
    FriBidiStrIndex last_space = -1;

    for (FriBidiStrIndex i = 0; i < length && break_count < max_breaks; i++) {
        FriBidiChar ch = text[i];
        current_length++;

        /* Track space positions for word boundaries */
        if (ch == 0x0020 || ch == 0x00A0 || ch == 0x1680 || 
            (ch >= 0x2000 && ch <= 0x200B) || ch == 0x202F || 
            ch == 0x205F || ch == 0x3000) {
            last_space = i;
        }

        /* Force break on explicit line terminators */
        if (ch == 0x000A || ch == 0x000D || ch == 0x0085 || 
            ch == 0x2028 || ch == 0x2029) {
            break_positions[break_count] = i + 1;
            break_count++;
            current_length = 0;
            last_space = -1;
            continue;
        }

        /* Check if line is too long */
        if (current_length >= max_line_length) {
            if (last_space != -1 && last_space > (i - max_line_length)) {
                /* Break at last space */
                break_positions[break_count] = last_space + 1;
                break_count++;
                current_length = i - last_space;
                last_space = -1;
            } else {
                /* Force break at current position */
                break_positions[break_count] = i;
                break_count++;
                current_length = 0;
            }
        }
    }

    return break_count;
}

/*
 * Performance monitoring
 */
static struct {
    int processing_calls;
    double total_processing_time;
    FriBidiStrIndex total_characters_processed;
} performance_stats = {0, 0.0, 0};

FRIBIDI_WASM_EXPORT void fribidi_performance_reset(void) {
    performance_stats.processing_calls = 0;
    performance_stats.total_processing_time = 0.0;
    performance_stats.total_characters_processed = 0;
}

FRIBIDI_WASM_EXPORT void fribidi_performance_record(
    double processing_time_ms,
    FriBidiStrIndex characters_processed
) {
    performance_stats.processing_calls++;
    performance_stats.total_processing_time += processing_time_ms;
    performance_stats.total_characters_processed += characters_processed;
}

FRIBIDI_WASM_EXPORT double fribidi_performance_get_avg_time(void) {
    if (performance_stats.processing_calls == 0) {
        return 0.0;
    }
    return performance_stats.total_processing_time / performance_stats.processing_calls;
}

FRIBIDI_WASM_EXPORT double fribidi_performance_get_throughput(void) {
    if (performance_stats.total_processing_time == 0.0) {
        return 0.0;
    }
    /* Return characters per second */
    return (performance_stats.total_characters_processed * 1000.0) / 
           performance_stats.total_processing_time;
}