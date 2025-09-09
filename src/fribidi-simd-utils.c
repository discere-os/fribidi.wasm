/*
 * FriBidi SIMD Utilities
 * SIMD helper functions for text processing
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

#include "fribidi-wasm.h"

#ifdef FRIBIDI_WASM_SIMD
#ifdef __wasm_simd128__

#include <wasm_simd128.h>

/*
 * SIMD-optimized string length calculation
 */
FRIBIDI_WASM_EXPORT FriBidiStrIndex fribidi_strlen_simd(const FriBidiChar* str) {
    if (!str) return 0;
    
    FriBidiStrIndex length = 0;
    v128_t zero = wasm_i32x4_splat(0);
    
    /* Process 4 characters at a time */
    while (1) {
        v128_t chars = wasm_v128_load(&str[length]);
        v128_t is_zero = wasm_i32x4_eq(chars, zero);
        
        if (wasm_i32x4_any_true(is_zero)) {
            /* Found zero, check individual positions */
            for (int i = 0; i < 4; i++) {
                if (str[length + i] == 0) {
                    return length + i;
                }
            }
        }
        length += 4;
    }
}

/*
 * SIMD-optimized character comparison
 */
FRIBIDI_WASM_EXPORT int fribidi_strcmp_simd(
    const FriBidiChar* str1, 
    const FriBidiChar* str2,
    FriBidiStrIndex length
) {
    if (!str1 || !str2) return -1;
    if (length <= 0) return 0;
    
    FriBidiStrIndex i = 0;
    
    /* Compare 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars1 = wasm_v128_load(&str1[i]);
        v128_t chars2 = wasm_v128_load(&str2[i]);
        v128_t equal = wasm_i32x4_eq(chars1, chars2);
        
        if (!wasm_i32x4_all_true(equal)) {
            /* Found difference, check individual characters */
            for (int j = 0; j < 4 && i + j < length; j++) {
                if (str1[i + j] < str2[i + j]) return -1;
                if (str1[i + j] > str2[i + j]) return 1;
            }
        }
    }
    
    /* Compare remaining characters */
    for (; i < length; i++) {
        if (str1[i] < str2[i]) return -1;
        if (str1[i] > str2[i]) return 1;
    }
    
    return 0;
}

/*
 * SIMD-optimized character search
 */
FRIBIDI_WASM_EXPORT FriBidiStrIndex fribidi_find_char_simd(
    const FriBidiChar* str,
    FriBidiStrIndex length,
    FriBidiChar target
) {
    if (!str || length <= 0) return -1;
    
    v128_t target_vec = wasm_i32x4_splat(target);
    FriBidiStrIndex i = 0;
    
    /* Search 4 characters at a time */
    for (; i + 3 < length; i += 4) {
        v128_t chars = wasm_v128_load(&str[i]);
        v128_t matches = wasm_i32x4_eq(chars, target_vec);
        
        if (wasm_i32x4_any_true(matches)) {
            /* Found match, find exact position */
            for (int j = 0; j < 4; j++) {
                if (str[i + j] == target) {
                    return i + j;
                }
            }
        }
    }
    
    /* Search remaining characters */
    for (; i < length; i++) {
        if (str[i] == target) {
            return i;
        }
    }
    
    return -1;
}

#else /* !__wasm_simd128__ */

/* Fallback implementations */
FRIBIDI_WASM_EXPORT FriBidiStrIndex fribidi_strlen_simd(const FriBidiChar* str) {
    if (!str) return 0;
    FriBidiStrIndex len = 0;
    while (str[len]) len++;
    return len;
}

FRIBIDI_WASM_EXPORT int fribidi_strcmp_simd(
    const FriBidiChar* str1, 
    const FriBidiChar* str2,
    FriBidiStrIndex length
) {
    if (!str1 || !str2) return -1;
    for (FriBidiStrIndex i = 0; i < length; i++) {
        if (str1[i] < str2[i]) return -1;
        if (str1[i] > str2[i]) return 1;
    }
    return 0;
}

#endif /* __wasm_simd128__ */

#endif /* FRIBIDI_WASM_SIMD */