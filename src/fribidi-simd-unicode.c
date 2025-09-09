/*
 * FriBidi SIMD Unicode Processing
 * SIMD-optimized Unicode property lookup and text processing
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

#include "fribidi-wasm.h"

#ifdef FRIBIDI_WASM_SIMD
#ifdef __wasm_simd128__

#include <wasm_simd128.h>

/*
 * SIMD-accelerated Unicode normalization form detection
 */
FRIBIDI_WASM_EXPORT int fribidi_needs_normalization_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length
) {
    if (!text || length <= 0) {
        return 0;
    }
    
    /* Common ranges that need normalization checking */
    v128_t combining_min = wasm_i32x4_splat(0x0300);  /* Combining Diacritical Marks */
    v128_t combining_max = wasm_i32x4_splat(0x036F);
    v128_t arabic_min = wasm_i32x4_splat(0x064B);     /* Arabic diacritics */
    v128_t arabic_max = wasm_i32x4_splat(0x065F);
    v128_t hebrew_points_min = wasm_i32x4_splat(0x05B0); /* Hebrew points */
    v128_t hebrew_points_max = wasm_i32x4_splat(0x05BD);
    
    FriBidiStrIndex i = 0;
    
    /* Process 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&text[i]);
        
        /* Check combining marks */
        v128_t comb_ge = wasm_i32x4_ge(chars, combining_min);
        v128_t comb_le = wasm_i32x4_le(chars, combining_max);
        v128_t is_combining = wasm_v128_and(comb_ge, comb_le);
        
        /* Check Arabic diacritics */
        v128_t arab_ge = wasm_i32x4_ge(chars, arabic_min);
        v128_t arab_le = wasm_i32x4_le(chars, arabic_max);
        v128_t is_arabic_diac = wasm_v128_and(arab_ge, arab_le);
        
        /* Check Hebrew points */
        v128_t heb_ge = wasm_i32x4_ge(chars, hebrew_points_min);
        v128_t heb_le = wasm_i32x4_le(chars, hebrew_points_max);
        v128_t is_hebrew_point = wasm_v128_and(heb_ge, heb_le);
        
        /* Combine all checks */
        v128_t needs_check = wasm_v128_or(is_combining, is_arabic_diac);
        needs_check = wasm_v128_or(needs_check, is_hebrew_point);
        
        if (wasm_i32x4_any_true(needs_check)) {
            return 1;
        }
    }
    
    /* Check remaining characters */
    for (; i < length; i++) {
        FriBidiChar ch = text[i];
        if ((ch >= 0x0300 && ch <= 0x036F) ||  /* Combining marks */
            (ch >= 0x064B && ch <= 0x065F) ||  /* Arabic diacritics */
            (ch >= 0x05B0 && ch <= 0x05BD)) {  /* Hebrew points */
            return 1;
        }
    }
    
    return 0;
}

/*
 * SIMD-optimized whitespace detection
 */
FRIBIDI_WASM_EXPORT void fribidi_classify_whitespace_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    uint8_t* is_whitespace  /* 1 if whitespace, 0 otherwise */
) {
    if (!text || !is_whitespace || length <= 0) {
        return;
    }
    
    /* Common whitespace characters */
    v128_t space = wasm_i32x4_splat(0x0020);      /* Space */
    v128_t tab = wasm_i32x4_splat(0x0009);        /* Tab */
    v128_t newline = wasm_i32x4_splat(0x000A);    /* Line Feed */
    v128_t cr = wasm_i32x4_splat(0x000D);         /* Carriage Return */
    v128_t nbsp = wasm_i32x4_splat(0x00A0);       /* Non-breaking space */
    
    FriBidiStrIndex i = 0;
    
    /* Process 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&text[i]);
        
        /* Check for common whitespace */
        v128_t is_space = wasm_i32x4_eq(chars, space);
        v128_t is_tab = wasm_i32x4_eq(chars, tab);
        v128_t is_newline = wasm_i32x4_eq(chars, newline);
        v128_t is_cr = wasm_i32x4_eq(chars, cr);
        v128_t is_nbsp = wasm_i32x4_eq(chars, nbsp);
        
        /* Combine all whitespace checks */
        v128_t whitespace = wasm_v128_or(is_space, is_tab);
        whitespace = wasm_v128_or(whitespace, is_newline);
        whitespace = wasm_v128_or(whitespace, is_cr);
        whitespace = wasm_v128_or(whitespace, is_nbsp);
        
        /* Extract results */
        for (int j = 0; j < 4; j++) {
            uint32_t mask = wasm_i32x4_extract_lane(whitespace, j);
            is_whitespace[i + j] = mask ? 1 : 0;
        }
    }
    
    /* Process remaining characters */
    for (; i < length; i++) {
        FriBidiChar ch = text[i];
        is_whitespace[i] = (ch == 0x0020 || ch == 0x0009 || ch == 0x000A || 
                           ch == 0x000D || ch == 0x00A0 ||
                           (ch >= 0x2000 && ch <= 0x200B) || /* Various spaces */
                           ch == 0x202F || ch == 0x205F || ch == 0x3000) ? 1 : 0;
    }
}

/*
 * SIMD-optimized digit detection
 */
FRIBIDI_WASM_EXPORT void fribidi_classify_digits_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length,
    uint8_t* digit_types  /* 0=not digit, 1=ASCII, 2=Arabic-Indic, 3=other */
) {
    if (!text || !digit_types || length <= 0) {
        return;
    }
    
    v128_t ascii_digit_min = wasm_i32x4_splat(0x0030);  /* '0' */
    v128_t ascii_digit_max = wasm_i32x4_splat(0x0039);  /* '9' */
    v128_t arabic_digit_min = wasm_i32x4_splat(0x0660); /* Arabic-Indic digit 0 */
    v128_t arabic_digit_max = wasm_i32x4_splat(0x0669); /* Arabic-Indic digit 9 */
    
    FriBidiStrIndex i = 0;
    
    /* Process 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&text[i]);
        
        /* Check ASCII digits */
        v128_t ascii_ge = wasm_i32x4_ge(chars, ascii_digit_min);
        v128_t ascii_le = wasm_i32x4_le(chars, ascii_digit_max);
        v128_t is_ascii_digit = wasm_v128_and(ascii_ge, ascii_le);
        
        /* Check Arabic-Indic digits */
        v128_t arabic_ge = wasm_i32x4_ge(chars, arabic_digit_min);
        v128_t arabic_le = wasm_i32x4_le(chars, arabic_digit_max);
        v128_t is_arabic_digit = wasm_v128_and(arabic_ge, arabic_le);
        
        /* Classify each character */
        for (int j = 0; j < 4; j++) {
            uint32_t ascii_mask = wasm_i32x4_extract_lane(is_ascii_digit, j);
            uint32_t arabic_mask = wasm_i32x4_extract_lane(is_arabic_digit, j);
            
            if (ascii_mask) {
                digit_types[i + j] = 1; /* ASCII digit */
            } else if (arabic_mask) {
                digit_types[i + j] = 2; /* Arabic-Indic digit */
            } else {
                /* Check for other digit types */
                FriBidiChar ch = text[i + j];
                if ((ch >= 0x06F0 && ch <= 0x06F9) ||  /* Extended Arabic-Indic */
                    (ch >= 0x07C0 && ch <= 0x07C9) ||  /* NKo digits */
                    (ch >= 0x0966 && ch <= 0x096F)) {  /* Devanagari digits */
                    digit_types[i + j] = 3; /* Other digits */
                } else {
                    digit_types[i + j] = 0; /* Not a digit */
                }
            }
        }
    }
    
    /* Process remaining characters */
    for (; i < length; i++) {
        FriBidiChar ch = text[i];
        if (ch >= 0x0030 && ch <= 0x0039) {
            digit_types[i] = 1; /* ASCII */
        } else if (ch >= 0x0660 && ch <= 0x0669) {
            digit_types[i] = 2; /* Arabic-Indic */
        } else if ((ch >= 0x06F0 && ch <= 0x06F9) ||
                   (ch >= 0x07C0 && ch <= 0x07C9) ||
                   (ch >= 0x0966 && ch <= 0x096F)) {
            digit_types[i] = 3; /* Other */
        } else {
            digit_types[i] = 0; /* Not digit */
        }
    }
}

/*
 * SIMD-optimized case conversion for basic Latin
 */
FRIBIDI_WASM_EXPORT void fribidi_to_lower_simd(
    const FriBidiChar* input,
    FriBidiChar* output,
    FriBidiStrIndex length
) {
    if (!input || !output || length <= 0) {
        return;
    }
    
    v128_t upper_a = wasm_i32x4_splat(0x0041);  /* 'A' */
    v128_t upper_z = wasm_i32x4_splat(0x005A);  /* 'Z' */
    v128_t case_diff = wasm_i32x4_splat(0x0020); /* Difference between upper and lower */
    
    FriBidiStrIndex i = 0;
    
    /* Process 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&input[i]);
        
        /* Check if characters are uppercase ASCII */
        v128_t ge_a = wasm_i32x4_ge(chars, upper_a);
        v128_t le_z = wasm_i32x4_le(chars, upper_z);
        v128_t is_upper = wasm_v128_and(ge_a, le_z);
        
        /* Convert to lowercase where applicable */
        v128_t lower_chars = wasm_i32x4_add(chars, 
            wasm_v128_and(is_upper, case_diff));
        
        /* Use original characters where not uppercase */
        v128_t result = wasm_v128_or(
            wasm_v128_and(is_upper, lower_chars),
            wasm_v128_andnot(is_upper, chars));
        
        wasm_v128_store(&output[i], result);
    }
    
    /* Process remaining characters */
    for (; i < length; i++) {
        FriBidiChar ch = input[i];
        if (ch >= 0x0041 && ch <= 0x005A) {
            output[i] = ch + 0x0020; /* Convert to lowercase */
        } else {
            output[i] = ch; /* Keep as-is */
        }
    }
}

#else /* !__wasm_simd128__ */

/* Fallback implementations when SIMD is not available */
FRIBIDI_WASM_EXPORT int fribidi_needs_normalization_simd(
    const FriBidiChar* text,
    FriBidiStrIndex length
) {
    if (!text || length <= 0) return 0;
    
    for (FriBidiStrIndex i = 0; i < length; i++) {
        FriBidiChar ch = text[i];
        if ((ch >= 0x0300 && ch <= 0x036F) ||
            (ch >= 0x064B && ch <= 0x065F) ||
            (ch >= 0x05B0 && ch <= 0x05BD)) {
            return 1;
        }
    }
    return 0;
}

#endif /* __wasm_simd128__ */

#endif /* FRIBIDI_WASM_SIMD */