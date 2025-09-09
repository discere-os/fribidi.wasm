/*
 * FriBidi SIMD-Optimized Bidirectional Processing
 * WASM SIMD optimizations for bidirectional text algorithms
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

#include "fribidi-wasm.h"

#ifdef FRIBIDI_WASM_SIMD
#ifdef __wasm_simd128__

#include <wasm_simd128.h>
#include <stdlib.h>
#include <string.h>

/*
 * Check if SIMD is available
 */
FRIBIDI_WASM_EXPORT int fribidi_simd_available(void) {
    return 1;
}

/*
 * SIMD-optimized bidirectional type classification
 * Process 4 UTF-32 characters at once using SIMD
 */
FRIBIDI_WASM_EXPORT int fribidi_process_bidi_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiCharType* types
) {
    if (!text || !types || length <= 0) {
        return 0;
    }

    FriBidiStrIndex i = 0;
    
    /* Process 4 characters at a time with SIMD */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&text[i]);
        
        /* Extract individual characters */
        uint32_t ch0 = wasm_i32x4_extract_lane(chars, 0);
        uint32_t ch1 = wasm_i32x4_extract_lane(chars, 1);
        uint32_t ch2 = wasm_i32x4_extract_lane(chars, 2);
        uint32_t ch3 = wasm_i32x4_extract_lane(chars, 3);
        
        /* Get bidirectional types (fallback to standard function for correctness) */
        types[i] = fribidi_get_bidi_type(ch0);
        types[i + 1] = fribidi_get_bidi_type(ch1);
        types[i + 2] = fribidi_get_bidi_type(ch2);
        types[i + 3] = fribidi_get_bidi_type(ch3);
    }
    
    /* Process remaining characters */
    for (; i < length; i++) {
        types[i] = fribidi_get_bidi_type(text[i]);
    }
    
    return 1;
}

/*
 * SIMD-optimized character classification
 * Fast classification of common character ranges
 */
FRIBIDI_WASM_EXPORT void fribidi_classify_chars_simd(
    const FriBidiChar* chars,
    FriBidiStrIndex length,
    uint8_t* classifications  /* 0=other, 1=ltr, 2=rtl, 3=neutral */
) {
    if (!chars || !classifications || length <= 0) {
        return;
    }
    
    FriBidiStrIndex i = 0;
    
    /* SIMD constants for character range checks */
    v128_t ascii_min = wasm_i32x4_splat(0x0020);     /* Space */
    v128_t ascii_max = wasm_i32x4_splat(0x007E);     /* Tilde */
    v128_t arabic_min = wasm_i32x4_splat(0x0600);    /* Arabic start */
    v128_t arabic_max = wasm_i32x4_splat(0x06FF);    /* Arabic end */
    v128_t hebrew_min = wasm_i32x4_splat(0x0590);    /* Hebrew start */
    v128_t hebrew_max = wasm_i32x4_splat(0x05FF);    /* Hebrew end */
    
    /* Process 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&chars[i]);
        
        /* Check for ASCII range (typically LTR) */
        v128_t ascii_ge = wasm_i32x4_ge(chars, ascii_min);
        v128_t ascii_le = wasm_i32x4_le(chars, ascii_max);
        v128_t is_ascii = wasm_v128_and(ascii_ge, ascii_le);
        
        /* Check for Arabic range (RTL) */
        v128_t arabic_ge = wasm_i32x4_ge(chars, arabic_min);
        v128_t arabic_le = wasm_i32x4_le(chars, arabic_max);
        v128_t is_arabic = wasm_v128_and(arabic_ge, arabic_le);
        
        /* Check for Hebrew range (RTL) */
        v128_t hebrew_ge = wasm_i32x4_ge(chars, hebrew_min);
        v128_t hebrew_le = wasm_i32x4_le(chars, hebrew_max);
        v128_t is_hebrew = wasm_v128_and(hebrew_ge, hebrew_le);
        
        /* Combine RTL checks */
        v128_t is_rtl = wasm_v128_or(is_arabic, is_hebrew);
        
        /* Extract results and classify */
        for (int j = 0; j < 4; j++) {
            uint32_t ch = wasm_i32x4_extract_lane(chars, j);
            uint32_t rtl_mask = wasm_i32x4_extract_lane(is_rtl, j);
            uint32_t ascii_mask = wasm_i32x4_extract_lane(is_ascii, j);
            
            if (rtl_mask) {
                classifications[i + j] = 2; /* RTL */
            } else if (ascii_mask) {
                classifications[i + j] = 1; /* LTR */
            } else {
                /* Use standard function for complex cases */
                FriBidiCharType type = fribidi_get_bidi_type(ch);
                if (FRIBIDI_IS_RTL(type)) {
                    classifications[i + j] = 2;
                } else if (FRIBIDI_IS_LTR_LETTER(type)) {
                    classifications[i + j] = 1;
                } else if (FRIBIDI_IS_NEUTRAL(type)) {
                    classifications[i + j] = 3;
                } else {
                    classifications[i + j] = 0;
                }
            }
        }
    }
    
    /* Handle remaining characters */
    for (; i < length; i++) {
        FriBidiChar ch = chars[i];
        
        if (ch >= 0x0020 && ch <= 0x007E) {
            classifications[i] = 1; /* ASCII LTR */
        } else if ((ch >= 0x0600 && ch <= 0x06FF) || (ch >= 0x0590 && ch <= 0x05FF)) {
            classifications[i] = 2; /* Arabic/Hebrew RTL */
        } else {
            FriBidiCharType type = fribidi_get_bidi_type(ch);
            if (FRIBIDI_IS_RTL(type)) {
                classifications[i] = 2;
            } else if (FRIBIDI_IS_LTR_LETTER(type)) {
                classifications[i] = 1;
            } else if (FRIBIDI_IS_NEUTRAL(type)) {
                classifications[i] = 3;
            } else {
                classifications[i] = 0;
            }
        }
    }
}

/*
 * SIMD-optimized string scanning for RTL detection
 */
FRIBIDI_WASM_EXPORT int fribidi_has_rtl_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length
) {
    if (!text || length <= 0) {
        return 0;
    }
    
    FriBidiStrIndex i = 0;
    
    /* SIMD constants for RTL ranges */
    v128_t arabic_min = wasm_i32x4_splat(0x0600);
    v128_t arabic_max = wasm_i32x4_splat(0x06FF);
    v128_t hebrew_min = wasm_i32x4_splat(0x0590);
    v128_t hebrew_max = wasm_i32x4_splat(0x05FF);
    v128_t arabic_supp_min = wasm_i32x4_splat(0x0750);
    v128_t arabic_supp_max = wasm_i32x4_splat(0x077F);
    
    /* Process 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&text[i]);
        
        /* Check Arabic range */
        v128_t arabic_ge = wasm_i32x4_ge(chars, arabic_min);
        v128_t arabic_le = wasm_i32x4_le(chars, arabic_max);
        v128_t is_arabic = wasm_v128_and(arabic_ge, arabic_le);
        
        /* Check Hebrew range */
        v128_t hebrew_ge = wasm_i32x4_ge(chars, hebrew_min);
        v128_t hebrew_le = wasm_i32x4_le(chars, hebrew_max);
        v128_t is_hebrew = wasm_v128_and(hebrew_ge, hebrew_le);
        
        /* Check Arabic Supplement */
        v128_t supp_ge = wasm_i32x4_ge(chars, arabic_supp_min);
        v128_t supp_le = wasm_i32x4_le(chars, arabic_supp_max);
        v128_t is_arabic_supp = wasm_v128_and(supp_ge, supp_le);
        
        /* Combine all RTL checks */
        v128_t is_rtl = wasm_v128_or(is_arabic, is_hebrew);
        is_rtl = wasm_v128_or(is_rtl, is_arabic_supp);
        
        /* Check if any character is RTL */
        if (wasm_i32x4_any_true(is_rtl)) {
            return 1;
        }
    }
    
    /* Check remaining characters */
    for (; i < length; i++) {
        FriBidiChar ch = text[i];
        if ((ch >= 0x0590 && ch <= 0x05FF) ||   /* Hebrew */
            (ch >= 0x0600 && ch <= 0x06FF) ||   /* Arabic */
            (ch >= 0x0750 && ch <= 0x077F)) {   /* Arabic Supplement */
            return 1;
        }
    }
    
    return 0;
}

/*
 * SIMD-optimized mirror character lookup for common cases
 */
FRIBIDI_WASM_EXPORT void fribidi_get_mirror_chars_simd(
    const FriBidiChar* input,
    FriBidiChar* output,
    FriBidiStrIndex length
) {
    if (!input || !output || length <= 0) {
        return;
    }
    
    /* Mirror character pairs for common punctuation */
    static const struct {
        FriBidiChar original;
        FriBidiChar mirrored;
    } mirror_pairs[] = {
        {0x0028, 0x0029}, /* ( ) */
        {0x0029, 0x0028}, /* ) ( */
        {0x005B, 0x005D}, /* [ ] */
        {0x005D, 0x005B}, /* ] [ */
        {0x007B, 0x007D}, /* { } */
        {0x007D, 0x007B}, /* } { */
        {0x003C, 0x003E}, /* < > */
        {0x003E, 0x003C}, /* > < */
        {0x00AB, 0x00BB}, /* « » */
        {0x00BB, 0x00AB}, /* » « */
        {0x2039, 0x203A}, /* ‹ › */
        {0x203A, 0x2039}, /* › ‹ */
    };
    const int num_pairs = sizeof(mirror_pairs) / sizeof(mirror_pairs[0]);
    
    for (FriBidiStrIndex i = 0; i < length; i++) {
        FriBidiChar ch = input[i];
        FriBidiChar mirrored = ch; /* Default to original */
        
        /* Check common mirror pairs first */
        for (int j = 0; j < num_pairs; j++) {
            if (ch == mirror_pairs[j].original) {
                mirrored = mirror_pairs[j].mirrored;
                break;
            }
        }
        
        /* If not found in common pairs, use standard function */
        if (mirrored == ch) {
            FriBidiChar std_mirror;
            if (fribidi_get_mirror_char(ch, &std_mirror)) {
                mirrored = std_mirror;
            }
        }
        
        output[i] = mirrored;
    }
}

/*
 * SIMD-accelerated memory operations for large text processing
 */
FRIBIDI_WASM_EXPORT void fribidi_copy_chars_simd(
    const FriBidiChar* src,
    FriBidiChar* dst,
    FriBidiStrIndex length
) {
    if (!src || !dst || length <= 0) {
        return;
    }
    
    FriBidiStrIndex i = 0;
    
    /* Copy 4 characters at a time with SIMD */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&src[i]);
        wasm_v128_store(&dst[i], chars);
    }
    
    /* Copy remaining characters */
    for (; i < length; i++) {
        dst[i] = src[i];
    }
}

/*
 * SIMD-optimized zero initialization
 */
FRIBIDI_WASM_EXPORT void fribidi_zero_chars_simd(
    FriBidiChar* buffer,
    FriBidiStrIndex length
) {
    if (!buffer || length <= 0) {
        return;
    }
    
    v128_t zero = wasm_i32x4_splat(0);
    FriBidiStrIndex i = 0;
    
    /* Zero 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        wasm_v128_store(&buffer[i], zero);
    }
    
    /* Zero remaining characters */
    for (; i < length; i++) {
        buffer[i] = 0;
    }
}

#else /* !__wasm_simd128__ */

/* Fallback implementations when SIMD is not available */
FRIBIDI_WASM_EXPORT int fribidi_simd_available(void) {
    return 0;
}

FRIBIDI_WASM_EXPORT int fribidi_process_bidi_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiCharType* types
) {
    /* Fallback to standard implementation */
    if (text && types && length > 0) {
        fribidi_get_bidi_types(text, length, types);
        return 1;
    }
    return 0;
}

#endif /* __wasm_simd128__ */

#else /* !FRIBIDI_WASM_SIMD */

/* SIMD disabled at compile time */
FRIBIDI_WASM_EXPORT int fribidi_simd_available(void) {
    return 0;
}

FRIBIDI_WASM_EXPORT int fribidi_process_bidi_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    FriBidiCharType* types
) {
    return 0; /* SIMD not available */
}

#endif /* FRIBIDI_WASM_SIMD */