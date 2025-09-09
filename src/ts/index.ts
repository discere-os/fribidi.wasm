/*
 * FriBidi WASM TypeScript API
 * Modern TypeScript interface for Unicode Bidirectional Algorithm
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

import type { FriBidiWASMModule, FriBidiWASMInstance } from './types.js';

/**
 * Configuration options for FriBidi initialization
 */
export interface FriBidiOptions {
  /** Use SIMD optimizations if available */
  simdEnabled?: boolean;
  /** Enable debug mode with detailed logging */
  debug?: boolean;
  /** Custom WASM module loader */
  wasmLoader?: () => Promise<FriBidiWASMModule>;
  /** Memory pool size for performance optimization */
  memoryPoolSize?: number;
}

/**
 * Text processing options
 */
export interface ProcessingOptions {
  /** Base text direction (auto-detect if not specified) */
  baseDirection?: 'ltr' | 'rtl' | 'auto';
  /** Enable Arabic text shaping */
  enableShaping?: boolean;
  /** Remove bidirectional marks from output */
  removeBidiMarks?: boolean;
  /** Return position mapping arrays */
  includePositionMaps?: boolean;
  /** Return embedding levels array */
  includeEmbeddingLevels?: boolean;
}

/**
 * Text processing result
 */
export interface ProcessingResult {
  /** Visually ordered text for display */
  visualText: string;
  /** Original logical text */
  logicalText: string;
  /** Detected or specified base direction */
  baseDirection: 'ltr' | 'rtl';
  /** Maximum embedding level found */
  maxLevel: number;
  /** Processing time in milliseconds */
  processingTime?: number;
  /** Logical to visual position mapping */
  logicalToVisualMap?: number[];
  /** Visual to logical position mapping */
  visualToLogicalMap?: number[];
  /** Embedding levels for each character */
  embeddingLevels?: number[];
  /** Whether the text contains bidirectional content */
  hasBidirectionalContent: boolean;
}

/**
 * Character classification result
 */
export interface CharacterInfo {
  /** Character code point */
  codePoint: number;
  /** Bidirectional character type */
  bidiType: string;
  /** Is this a right-to-left character */
  isRTL: boolean;
  /** Is this a left-to-right character */
  isLTR: boolean;
  /** Is this a neutral character */
  isNeutral: boolean;
  /** Is this an Arabic character that may need shaping */
  isArabic: boolean;
  /** Mirror character if available */
  mirrorChar?: number;
}

/**
 * Text analysis result
 */
export interface TextAnalysis {
  /** Total character count */
  length: number;
  /** Contains left-to-right text */
  hasLTR: boolean;
  /** Contains right-to-left text */
  hasRTL: boolean;
  /** Contains Arabic text */
  hasArabic: boolean;
  /** Contains Hebrew text */
  hasHebrew: boolean;
  /** Needs Arabic shaping */
  needsShaping: boolean;
  /** Needs bidirectional processing */
  needsBidi: boolean;
  /** Detected base direction */
  detectedDirection: 'ltr' | 'rtl' | 'neutral';
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Number of processing operations performed */
  operationCount: number;
  /** Average processing time per operation (ms) */
  averageProcessingTime: number;
  /** Total characters processed */
  totalCharactersProcessed: number;
  /** Processing throughput (characters per second) */
  throughput: number;
  /** SIMD acceleration status */
  simdEnabled: boolean;
}

/**
 * Module capabilities
 */
export interface ModuleCapabilities {
  /** Module name */
  name: string;
  /** Module version */
  version: string;
  /** Unicode version supported */
  unicodeVersion: string;
  /** SIMD support available */
  simdSupported: boolean;
  /** Debug mode enabled */
  debugEnabled: boolean;
}

/**
 * Format speed for display
 */
export function formatSpeed(speed: number): string {
  if (speed > 1000000) return `${(speed / 1000000).toFixed(1)}M chars/sec`;
  if (speed > 1000) return `${(speed / 1000).toFixed(1)}K chars/sec`;
  return `${speed.toFixed(0)} chars/sec`;
}

/**
 * Format size for display
 */
export function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes} bytes`;
}

let wasmInstance: FriBidiWASMInstance | null = null;
let isInitialized = false;

/**
 * High-performance Unicode Bidirectional Algorithm implementation
 * Professional-grade implementation with comprehensive error handling
 * 
 * @example
 * ```typescript
 * import FriBidi from '@superstruct/fribidi.wasm';
 * 
 * const fribidi = new FriBidi();
 * await fribidi.initialize();
 * 
 * const result = await fribidi.processText('Hello العالم');
 * console.log('Visual text:', result.visualText);
 * console.log('Base direction:', result.baseDirection);
 * ```
 */
export class FriBidi {
  private options: Required<FriBidiOptions>;
  private metrics: PerformanceMetrics;
  private lastError: string | null = null;

  constructor(options: FriBidiOptions = {}) {
    this.options = {
      simdEnabled: true,
      debug: false,
      wasmLoader: this.defaultWasmLoader.bind(this),
      memoryPoolSize: 32768,
      ...options
    };
    this.metrics = this.createInitialMetrics();
  }

  /**
   * Create initial performance metrics
   */
  private createInitialMetrics(): PerformanceMetrics {
    return {
      operationCount: 0,
      averageProcessingTime: 0,
      totalCharactersProcessed: 0,
      throughput: 0,
      simdEnabled: false
    };
  }

  /**
   * Initialize the FriBidi WASM module with comprehensive validation
   */
  async initialize(): Promise<void> {
    if (isInitialized) {
      return;
    }

    try {
      this.validateEnvironment();
      
      const wasmModule = await this.options.wasmLoader();
      if (!wasmModule) {
        throw new Error('WASM module loader returned null');
      }
      
      wasmInstance = wasmModule as FriBidiWASMInstance;
      
      // Validate required functions exist
      this.validateWASMExports();
      
      // Initialize WASM module
      const initResult = wasmInstance!.ccall('fribidi_wasm_init', 'number', [], []);
      if (initResult !== 0) {
        throw new Error(`FriBidi initialization failed with code: ${initResult}`);
      }

      // Enable memory pool if requested
      wasmInstance!.ccall('fribidi_pool_enable', 'void', ['number'], [1]);

      // Update metrics
      this.metrics.simdEnabled = wasmInstance!.ccall('fribidi_simd_available', 'number', [], []) !== 0;

      isInitialized = true;
      this.clearError();
    } catch (error) {
      const errorMessage = `Failed to initialize FriBidi WASM: ${error instanceof Error ? error.message : String(error)}`;
      this.setError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate the runtime environment
   */
  private validateEnvironment(): void {
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this environment');
    }

    // Check for minimum required features
    if (typeof Performance === 'undefined' && typeof performance === 'undefined') {
      console.warn('Performance API not available - timing measurements disabled');
    }
  }

  /**
   * Validate required WASM exports
   */
  private validateWASMExports(): void {
    if (!wasmInstance) {
      throw new Error('WASM instance not available');
    }

    const requiredFunctions = [
      'fribidi_wasm_init',
      'fribidi_log2vis_wrapper',
      'fribidi_get_bidi_types_wrapper',
      'fribidi_process_text'
    ];

    for (const funcName of requiredFunctions) {
      if (typeof wasmInstance!.ccall !== 'function') {
        throw new Error('WASM module missing ccall function');
      }
      // Note: We can't easily validate individual function existence with ccall
    }
  }

  /**
   * Process text using the Unicode Bidirectional Algorithm
   * Professional implementation with comprehensive validation
   */
  async processText(
    text: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    // Validate inputs
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    
    if (text.length > 65536) {
      throw new Error('Text exceeds maximum length of 65536 characters');
    }

    await this.ensureInitialized();

    const startTime = this.getTime();
    
    try {
      // Convert JavaScript string to UTF-32
      const utf32Text = this.stringToUTF32(text);
      const textLength = utf32Text.length;
      
      if (textLength === 0) {
        return {
          visualText: '',
          logicalText: text,
          baseDirection: 'ltr',
          maxLevel: 0,
          hasBidirectionalContent: false
        };
      }

      // Allocate memory for input and output
      const inputPtr = this.allocateUTF32Array(utf32Text);
      const outputPtr = wasmInstance!.ccall('fribidi_alloc_char_array', 'number', ['number'], [textLength]);
      
      let ltovPtr: number | null = null;
      let vtolPtr: number | null = null;
      let levelsPtr: number | null = null;

      if (options.includePositionMaps) {
        ltovPtr = wasmInstance!.ccall('fribidi_alloc_index_array', 'number', ['number'], [textLength]);
        vtolPtr = wasmInstance!.ccall('fribidi_alloc_index_array', 'number', ['number'], [textLength]);
      }

      if (options.includeEmbeddingLevels) {
        levelsPtr = wasmInstance!.ccall('fribidi_alloc_level_array', 'number', ['number'], [textLength]);
      }

      // Determine base direction
      let baseDir = 0; // FRIBIDI_PAR_ON (auto-detect)
      if (options.baseDirection === 'ltr') {
        baseDir = 1; // FRIBIDI_PAR_LTR
      } else if (options.baseDirection === 'rtl') {
        baseDir = 2; // FRIBIDI_PAR_RTL
      }

      // Process the text
      const baseDirPtr = wasmInstance!._malloc(4);
      wasmInstance!.setValue(baseDirPtr, baseDir, 'i32');

      const maxLevel = wasmInstance!.ccall('fribidi_log2vis_wrapper', 'number', 
        ['number', 'number', 'number', 'number', 'number', 'number', 'number'],
        [inputPtr, textLength, baseDirPtr, outputPtr, ltovPtr, vtolPtr, levelsPtr]
      );

      if (maxLevel < 0) {
        throw new Error('FriBidi processing failed');
      }

      // Read results
      const finalBaseDir = wasmInstance!.getValue(baseDirPtr, 'i32');
      const visualText = this.readUTF32Array(outputPtr, textLength);
      const visualString = this.utf32ToString(visualText);

      // Apply Arabic shaping if requested
      let shapedText = visualString;
      if (options.enableShaping) {
        shapedText = await this.shapeArabicText(visualText, levelsPtr, textLength);
      }

      // Remove bidi marks if requested
      if (options.removeBidiMarks) {
        shapedText = this.removeBidiMarks(shapedText);
      }

      const processingTime = this.getTime() - startTime;
      
      // Update metrics
      this.updateMetrics(processingTime, textLength);

      const result: ProcessingResult = {
        visualText: shapedText,
        logicalText: text,
        baseDirection: finalBaseDir === 2 ? 'rtl' : 'ltr',
        maxLevel,
        processingTime,
        hasBidirectionalContent: maxLevel > 1
      };

      // Add optional arrays
      if (options.includePositionMaps && ltovPtr && vtolPtr) {
        result.logicalToVisualMap = this.readIndexArray(ltovPtr, textLength);
        result.visualToLogicalMap = this.readIndexArray(vtolPtr, textLength);
      }

      if (options.includeEmbeddingLevels && levelsPtr) {
        result.embeddingLevels = this.readLevelArray(levelsPtr, textLength);
      }

      // Cleanup
      wasmInstance!._free(baseDirPtr);
      
      return result;
    } catch (error) {
      throw new Error(`Text processing failed: ${error}`);
    }
  }

  /**
   * Analyze text properties without full bidirectional processing
   */
  async analyzeText(text: string): Promise<TextAnalysis> {
    await this.ensureInitialized();

    const utf32Text = this.stringToUTF32(text);
    const textLength = utf32Text.length;

    if (textLength === 0) {
      return {
        length: 0,
        hasLTR: false,
        hasRTL: false,
        hasArabic: false,
        hasHebrew: false,
        needsShaping: false,
        needsBidi: false,
        detectedDirection: 'neutral'
      };
    }

    // Allocate memory for analysis
    const inputPtr = this.allocateUTF32Array(utf32Text);
    const hasLtrPtr = wasmInstance!._malloc(4);
    const hasRtlPtr = wasmInstance!._malloc(4);
    const hasArabicPtr = wasmInstance!._malloc(4);
    const hasHebrewPtr = wasmInstance!._malloc(4);
    const needsShapingPtr = wasmInstance!._malloc(4);

    // Perform analysis
    wasmInstance!.ccall('fribidi_analyze_string', 'number',
      ['number', 'number', 'number', 'number', 'number', 'number', 'number'],
      [inputPtr, textLength, hasLtrPtr, hasRtlPtr, hasArabicPtr, hasHebrewPtr, needsShapingPtr]
    );

    // Read results
    const hasLTR = wasmInstance!.getValue(hasLtrPtr, 'i32') !== 0;
    const hasRTL = wasmInstance!.getValue(hasRtlPtr, 'i32') !== 0;
    const hasArabic = wasmInstance!.getValue(hasArabicPtr, 'i32') !== 0;
    const hasHebrew = wasmInstance!.getValue(hasHebrewPtr, 'i32') !== 0;
    const needsShaping = wasmInstance!.getValue(needsShapingPtr, 'i32') !== 0;

    // Detect base direction
    let detectedDirection: 'ltr' | 'rtl' | 'neutral' = 'neutral';
    const baseDir = wasmInstance!.ccall('fribidi_detect_base_direction', 'number',
      ['number', 'number'], [inputPtr, textLength]
    );
    if (baseDir === 1) detectedDirection = 'ltr';
    else if (baseDir === 2) detectedDirection = 'rtl';

    // Cleanup
    wasmInstance!._free(hasLtrPtr);
    wasmInstance!._free(hasRtlPtr);
    wasmInstance!._free(hasArabicPtr);
    wasmInstance!._free(hasHebrewPtr);
    wasmInstance!._free(needsShapingPtr);

    return {
      length: textLength,
      hasLTR,
      hasRTL,
      hasArabic,
      hasHebrew,
      needsShaping,
      needsBidi: hasLTR && hasRTL,
      detectedDirection
    };
  }

  /**
   * Get detailed information about a single character
   */
  async getCharacterInfo(codePoint: number): Promise<CharacterInfo> {
    await this.ensureInitialized();

    const bidiType = wasmInstance!.ccall('fribidi_get_type_internal', 'number', ['number'], [codePoint]);
    const joiningType = wasmInstance!.ccall('fribidi_get_joining_type_internal', 'number', ['number'], [codePoint]);
    const mirrorChar = wasmInstance!.ccall('fribidi_get_mirror_char_wrapper', 'number', ['number'], [codePoint]);

    const isRTL = wasmInstance!.ccall('fribidi_is_rtl_char', 'number', ['number'], [codePoint]) !== 0;
    const isLTR = wasmInstance!.ccall('fribidi_is_ltr_char', 'number', ['number'], [codePoint]) !== 0;
    const isNeutral = wasmInstance!.ccall('fribidi_is_neutral_char', 'number', ['number'], [codePoint]) !== 0;
    const isArabic = wasmInstance!.ccall('fribidi_is_arabic_char', 'number', ['number'], [codePoint]) !== 0;

    return {
      codePoint,
      bidiType: this.bidiTypeToString(bidiType),
      isRTL,
      isLTR,
      isNeutral,
      isArabic,
      mirrorChar: mirrorChar !== codePoint ? mirrorChar : undefined
    };
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.ensureInitializedSync();
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.ensureInitializedSync();
    this.metrics = this.createInitialMetrics();
    if (wasmInstance) {
      this.metrics.simdEnabled = wasmInstance!.ccall('fribidi_simd_available', 'number', [], []) !== 0;
      wasmInstance!.ccall('fribidi_performance_reset', 'void', [], []);
    }
  }

  /**
   * Get module capabilities
   */
  getCapabilities(): ModuleCapabilities {
    if (!wasmInstance) {
      throw new Error('FriBidi not initialized');
    }

    const namePtr = wasmInstance!.ccall('fribidi_version_wrapper', 'number', [], []);
    const unicodeVersionPtr = wasmInstance!.ccall('fribidi_unicode_version_wrapper', 'number', [], []);

    return {
      name: 'GNU FriBidi WASM',
      version: wasmInstance!.UTF8ToString(namePtr),
      unicodeVersion: wasmInstance!.UTF8ToString(unicodeVersionPtr),
      simdSupported: wasmInstance!.ccall('fribidi_simd_available', 'number', [], []) !== 0,
      debugEnabled: this.options.debug
    };
  }

  /**
   * Cleanup and release resources
   */
  dispose(): void {
    if (wasmInstance) {
      wasmInstance!.ccall('fribidi_wasm_cleanup', 'void', [], []);
      wasmInstance = null;
      isInitialized = false;
    }
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!isInitialized) {
      await this.initialize();
    }
  }

  private ensureInitializedSync(): void {
    if (!isInitialized || !wasmInstance) {
      throw new Error('FriBidi not initialized. Call initialize() first.');
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(processingTime: number, charactersProcessed: number): void {
    this.metrics.operationCount++;
    this.metrics.totalCharactersProcessed += charactersProcessed;
    
    // Calculate running average
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.operationCount - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.operationCount;
    
    // Calculate throughput (chars per second)
    if (this.metrics.averageProcessingTime > 0) {
      this.metrics.throughput = this.metrics.totalCharactersProcessed / (this.metrics.averageProcessingTime * this.metrics.operationCount / 1000);
    }
  }

  /**
   * Get current time with fallback
   */
  private getTime(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  /**
   * Set error message
   */
  private setError(message: string): void {
    this.lastError = message;
    if (this.options.debug) {
      console.error('[FriBidi]', message);
    }
  }

  /**
   * Clear error message
   */
  private clearError(): void {
    this.lastError = null;
  }

  /**
   * Get last error message
   */
  getLastError(): string | null {
    return this.lastError;
  }

  private async defaultWasmLoader(): Promise<FriBidiWASMModule> {
    // Dynamic import of the generated WASM module
    try {
      const moduleFactory = await import('../../build/fribidi-optimized.js');
      return moduleFactory.default();
    } catch (error) {
      throw new Error('WASM module not built. Run build:wasm first.');
    }
  }

  private stringToUTF32(str: string): number[] {
    const utf32: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.codePointAt(i);
      if (code !== undefined) {
        utf32.push(code);
        if (code > 0xFFFF) {
          i++; // Skip the next surrogate pair character
        }
      }
    }
    return utf32;
  }

  private utf32ToString(utf32Array: number[]): string {
    return String.fromCodePoint(...utf32Array);
  }

  private allocateUTF32Array(utf32Array: number[]): number {
    const ptr = wasmInstance!.ccall('fribidi_alloc_char_array', 'number', ['number'], [utf32Array.length]);
    for (let i = 0; i < utf32Array.length; i++) {
      wasmInstance!.setValue(ptr + i * 4, utf32Array[i]!, 'i32');
    }
    return ptr;
  }

  private readUTF32Array(ptr: number, length: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(wasmInstance!.getValue(ptr + i * 4, 'i32'));
    }
    return result;
  }

  private readIndexArray(ptr: number, length: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(wasmInstance!.getValue(ptr + i * 4, 'i32'));
    }
    return result;
  }

  private readLevelArray(ptr: number, length: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(wasmInstance!.getValue(ptr + i, 'i8'));
    }
    return result;
  }

  private async shapeArabicText(utf32Text: number[], levelsPtr: number | null, length: number): Promise<string> {
    if (!levelsPtr) {
      return this.utf32ToString(utf32Text);
    }

    const textPtr = this.allocateUTF32Array(utf32Text);
    
    wasmInstance!.ccall('fribidi_shape_arabic_wrapper', 'number',
      ['number', 'number', 'number', 'number', 'number'],
      [0, levelsPtr, length, 0, textPtr]
    );

    const shapedArray = this.readUTF32Array(textPtr, length);
    return this.utf32ToString(shapedArray);
  }

  private removeBidiMarks(text: string): string {
    // Remove common bidirectional control characters
    return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  }

  private bidiTypeToString(bidiType: number): string {
    const types = [
      'L', 'LRE', 'LRO', 'R', 'AL', 'RLE', 'RLO', 'PDF', 'EN', 'ES', 'ET',
      'AN', 'CS', 'NSM', 'BN', 'B', 'S', 'WS', 'ON', 'LRI', 'RLI', 'FSI', 'PDI'
    ];
    return types[bidiType] || 'UNKNOWN';
  }
}

// Types are already exported above as interface declarations

// Default export
export default FriBidi;