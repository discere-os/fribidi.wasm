/*
 * FriBidi WASM TypeScript Type Definitions
 * Type definitions for the WASM module and Emscripten interface
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

/**
 * Emscripten WASM module interface
 */
export interface FriBidiWASMModule {
  // Memory management
  _malloc(size: number): number;
  _free(ptr: number): void;
  
  // Memory access
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  setValue(ptr: number, value: number, type: string): void;
  getValue(ptr: number, type: string): number;
  
  // String utilities
  UTF8ToString(ptr: number): string;
  stringToUTF8(str: string, ptr: number, maxLength: number): void;
  lengthBytesUTF8(str: string): number;
  UTF32ToString(ptr: number, maxLength?: number): string;
  stringToUTF32(str: string, ptr: number, maxLength: number): void;
  
  // Function calling interface
  ccall(
    funcName: string,
    returnType: string,
    argTypes: string[],
    args: (number | string)[]
  ): any;
  
  cwrap(
    funcName: string,
    returnType: string,
    argTypes: string[]
  ): (...args: any[]) => any;
  
  // Dynamic function management
  addFunction?(func: Function, sig: string): number;
  removeFunction?(funcPtr: number): void;
  
  // Module state
  ready?: Promise<void>;
}

/**
 * FriBidi-specific WASM instance
 */
export interface FriBidiWASMInstance extends FriBidiWASMModule {
  // Core FriBidi functions (exported from C)
  _fribidi_log2vis_wrapper: (
    logical_str: number,
    length: number,
    base_dir: number,
    visual_str: number,
    ltov_positions: number,
    vtol_positions: number,
    embedding_levels: number
  ) => number;
  
  _fribidi_get_bidi_types_wrapper: (
    str: number,
    length: number,
    types: number
  ) => number;
  
  _fribidi_get_par_embedding_levels_wrapper: (
    types: number,
    length: number,
    base_dir: number,
    embedding_levels: number
  ) => number;
  
  _fribidi_reorder_line_wrapper: (
    flags: number,
    types: number,
    length: number,
    off: number,
    base_dir: number,
    embedding_levels: number,
    visual_str: number,
    map: number
  ) => number;
  
  _fribidi_remove_bidi_marks_wrapper: (
    str: number,
    length: number,
    positions_to_this: number,
    positions_from_this: number,
    embedding_levels: number
  ) => number;
  
  _fribidi_shape_arabic_wrapper: (
    flags: number,
    embedding_levels: number,
    length: number,
    ar_props: number,
    str: number
  ) => number;
  
  _fribidi_get_mirror_char_wrapper: (ch: number) => number;
  
  _fribidi_get_bracket_types_wrapper: (
    str: number,
    length: number,
    types: number,
    bracket_types: number
  ) => number;
  
  _fribidi_version_wrapper: () => number;
  _fribidi_unicode_version_wrapper: () => number;
  
  _fribidi_get_type_internal: (ch: number) => number;
  _fribidi_get_joining_type_internal: (ch: number) => number;
  
  _fribidi_process_paragraph_wrapper: (
    text: number,
    length: number,
    base_direction: number,
    visual_text: number,
    ltov_map: number,
    vtol_map: number,
    levels: number,
    types: number
  ) => number;
  
  // WASM-specific functions
  _fribidi_wasm_init: () => number;
  _fribidi_wasm_cleanup: () => void;
  
  _fribidi_process_text: (
    input_text: number,
    input_length: number,
    base_direction: number,
    output_buffer: number,
    output_buffer_size: number
  ) => number;
  
  _fribidi_detect_base_direction: (
    text: number,
    length: number
  ) => number;
  
  _fribidi_is_rtl_char: (ch: number) => number;
  _fribidi_is_ltr_char: (ch: number) => number;
  _fribidi_is_neutral_char: (ch: number) => number;
  _fribidi_is_arabic_char: (ch: number) => number;
  
  _fribidi_string_has_rtl: (
    text: number,
    length: number
  ) => number;
  
  _fribidi_string_needs_bidi: (
    text: number,
    length: number
  ) => number;
  
  _fribidi_analyze_string: (
    text: number,
    length: number,
    has_ltr: number,
    has_rtl: number,
    has_arabic: number,
    has_hebrew: number,
    needs_shaping: number
  ) => number;
  
  // Memory allocation helpers
  _fribidi_alloc_char_array: (length: number) => number;
  _fribidi_alloc_type_array: (length: number) => number;
  _fribidi_alloc_level_array: (length: number) => number;
  _fribidi_alloc_index_array: (length: number) => number;
  
  _fribidi_malloc_wrapper: (size: number) => number;
  _fribidi_free_wrapper: (ptr: number) => void;
  
  // SIMD functions (if available)
  _fribidi_simd_available?: () => number;
  _fribidi_process_bidi_simd?: (
    text: number,
    length: number,
    types: number
  ) => number;
  _fribidi_has_rtl_simd?: (
    text: number,
    length: number
  ) => number;
  _fribidi_classify_chars_simd?: (
    chars: number,
    length: number,
    classifications: number
  ) => void;
  
  // Performance tracking
  _fribidi_performance_reset: () => void;
  _fribidi_performance_record: (
    processing_time_ms: number,
    characters_processed: number
  ) => void;
  _fribidi_performance_get_avg_time: () => number;
  _fribidi_performance_get_throughput: () => number;
  
  // Memory pool management
  _fribidi_pool_alloc: (size: number) => number;
  _fribidi_pool_reset: () => void;
  _fribidi_pool_enable: (enable: number) => void;
  
  // Error handling
  _fribidi_get_last_error?: () => number;
  _fribidi_set_error?: (message: number) => void;
  _fribidi_clear_error?: () => void;
  
  // Benchmarking
  _fribidi_benchmark_processing: (
    text: number,
    length: number,
    iterations: number
  ) => number;
}

/**
 * Character type enumeration (from FriBidi)
 */
export enum FriBidiBidiType {
  /* Strong types */
  L = 0,      /* Left-To-Right letter */
  LRE = 1,    /* Left-to-Right Embedding */
  LRO = 2,    /* Left-to-Right Override */
  R = 3,      /* Right-To-Left letter */
  AL = 4,     /* Arabic Letter */
  RLE = 5,    /* Right-to-Left Embedding */
  RLO = 6,    /* Right-to-Left Override */
  PDF = 7,    /* Pop Directional Format */
  EN = 8,     /* European Number */
  ES = 9,     /* European Separator */
  ET = 10,    /* European Terminator */
  AN = 11,    /* Arabic Number */
  CS = 12,    /* Common Separator */
  NSM = 13,   /* Non-Spacing Mark */
  BN = 14,    /* Boundary Neutral */
  B = 15,     /* Block Separator */
  S = 16,     /* Segment Separator */
  WS = 17,    /* WhiteSpace */
  ON = 18,    /* Other Neutral */
  LRI = 19,   /* Left-to-Right Isolate */
  RLI = 20,   /* Right-to-Left Isolate */
  FSI = 21,   /* First Strong Isolate */
  PDI = 22    /* Pop Directional Isolate */
}

/**
 * Paragraph direction enumeration
 */
export enum FriBidiParType {
  ON = 0,     /* Neutral */
  LTR = 1,    /* Left-to-Right */
  RTL = 2     /* Right-to-Left */
}

/**
 * Joining type enumeration (for Arabic)
 */
export enum FriBidiJoiningType {
  U = 0,      /* Non-joining */
  R = 1,      /* Right-joining */
  L = 2,      /* Left-joining */
  D = 3,      /* Dual-joining */
  C = 4,      /* Join-Causing */
  T = 5,      /* Transparent */
  G = 6       /* Ignored */
}

/**
 * Processing flags
 */
export enum FriBidiFlags {
  SHAPE_MIRRORING = 1,
  REORDER_NSM = 2,
  SHAPE_ARAB_PRES = 4,
  SHAPE_ARAB_LIGA = 8,
  REMOVE_BIDI = 16,
  REMOVE_JOINING = 32,
  REMOVE_SPECIALS = 64
}

/**
 * Error codes
 */
export enum FriBidiErrorCode {
  SUCCESS = 0,
  INVALID_INPUT = -1,
  MEMORY_ALLOCATION = -2,
  BUFFER_TOO_SMALL = -3,
  UNSUPPORTED_OPERATION = -4
}

/**
 * Character classification result for bulk operations
 */
export interface CharacterClassification {
  /** Index in the original text */
  index: number;
  /** Character code point */
  codePoint: number;
  /** Classification type (0=other, 1=ltr, 2=rtl, 3=neutral) */
  classification: number;
  /** Is this a digit */
  isDigit: boolean;
  /** Is this whitespace */
  isWhitespace: boolean;
}

/**
 * Text processing statistics
 */
export interface ProcessingStats {
  /** Input text length */
  inputLength: number;
  /** Output text length */
  outputLength: number;
  /** Number of RTL characters */
  rtlCharacters: number;
  /** Number of LTR characters */
  ltrCharacters: number;
  /** Number of neutral characters */
  neutralCharacters: number;
  /** Processing took milliseconds */
  processingTimeMs: number;
  /** Used SIMD optimizations */
  usedSIMD: boolean;
}

/**
 * Line breaking information
 */
export interface LineBreakInfo {
  /** Possible break positions */
  breakPositions: number[];
  /** Break types (soft/hard) */
  breakTypes: number[];
  /** Recommended line lengths */
  lineLengths: number[];
}

/**
 * Module initialization options
 */
export interface WASMInitOptions {
  /** WebAssembly module bytes */
  wasmBytes?: ArrayBuffer;
  /** Custom imports for the WASM module */
  imports?: Record<string, any>;
  /** Memory configuration */
  memory?: {
    initial: number;
    maximum?: number;
  };
  /** Enable experimental features */
  experimental?: boolean;
}