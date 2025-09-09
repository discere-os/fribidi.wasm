/**
 * Comprehensive unit tests for FriBidi WASM core functionality
 * Type-safe testing with realistic scenarios following zlib.wasm standards
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import FriBidi, { formatSpeed, formatSize } from '../../ts/index.js'
import type { ProcessingOptions, FriBidiOptions } from '../../ts/types.js'

describe('FriBidi WASM Core Functionality', () => {
  let fribidi: FriBidi

  beforeAll(async () => {
    fribidi = new FriBidi({ debug: true })
    await fribidi.initialize()
  })

  afterAll(() => {
    fribidi.dispose()
  })

  describe('Module Initialization', () => {
    test('should initialize successfully', () => {
      expect(fribidi).toBeDefined()
    })

    test('should report module capabilities', () => {
      const capabilities = fribidi.getCapabilities()
      expect(capabilities.name).toContain('FriBidi')
      expect(capabilities.version).toMatch(/^\d+\.\d+\.\d+/)
      expect(capabilities.unicodeVersion).toBeTruthy()
      expect(typeof capabilities.simdSupported).toBe('boolean')
    })

    test('should provide performance metrics', () => {
      const metrics = fribidi.getPerformanceMetrics()
      expect(typeof metrics.operationCount).toBe('number')
      expect(typeof metrics.averageProcessingTime).toBe('number')
      expect(typeof metrics.throughput).toBe('number')
      expect(typeof metrics.simdEnabled).toBe('boolean')
    })

    test('should handle initialization errors gracefully', async () => {
      const badFribidi = new FriBidi({ 
        wasmLoader: () => Promise.reject(new Error('Mock loader error'))
      })
      
      await expect(badFribidi.initialize()).rejects.toThrow('Failed to initialize FriBidi WASM')
      expect(badFribidi.getLastError()).toContain('Mock loader error')
    })
  })

  describe('Input Validation', () => {
    test('should reject non-string input', async () => {
      await expect(fribidi.processText(null as any)).rejects.toThrow('Text must be a string')
      await expect(fribidi.processText(undefined as any)).rejects.toThrow('Text must be a string')
      await expect(fribidi.processText(123 as any)).rejects.toThrow('Text must be a string')
    })

    test('should reject excessively long text', async () => {
      const longText = 'A'.repeat(100000)
      await expect(fribidi.processText(longText)).rejects.toThrow('exceeds maximum length')
    })

    test('should handle empty string gracefully', async () => {
      const result = await fribidi.processText('')
      expect(result.visualText).toBe('')
      expect(result.logicalText).toBe('')
      expect(result.hasBidirectionalContent).toBe(false)
      expect(result.maxLevel).toBe(0)
    })

    test('should handle invalid processing options', async () => {
      const result = await fribidi.processText('Hello', {
        baseDirection: 'invalid' as any
      })
      // Should not crash, should use auto-detect
      expect(result.visualText).toBe('Hello')
    })
  })

  describe('Basic Text Processing', () => {
    const testCases = [
      {
        name: 'Pure LTR Text',
        text: 'Hello World',
        expectedDirection: 'ltr',
        expectBidi: false
      },
      {
        name: 'Pure RTL Hebrew',
        text: 'שלום עולם',
        expectedDirection: 'rtl',
        expectBidi: false
      },
      {
        name: 'Pure RTL Arabic',
        text: 'مرحبا بالعالم',
        expectedDirection: 'rtl',
        expectBidi: false
      },
      {
        name: 'Mixed Bidirectional',
        text: 'Hello שלום World',
        expectedDirection: 'ltr',
        expectBidi: true
      }
    ]

    testCases.forEach(({ name, text, expectedDirection, expectBidi }) => {
      test(`should process ${name.toLowerCase()}`, async () => {
        const result = await fribidi.processText(text)
        
        expect(result.logicalText).toBe(text)
        expect(result.visualText).toBeTruthy()
        expect(result.baseDirection).toBe(expectedDirection)
        expect(result.hasBidirectionalContent).toBe(expectBidi)
        expect(typeof result.maxLevel).toBe('number')
        expect(typeof result.processingTime).toBe('number')
        expect(result.processingTime).toBeGreaterThan(0)
      })
    })
  })

  describe('Processing Options', () => {
    const testText = 'Hello שלום World'

    test('should respect explicit base direction', async () => {
      const ltrResult = await fribidi.processText(testText, { baseDirection: 'ltr' })
      const rtlResult = await fribidi.processText(testText, { baseDirection: 'rtl' })
      
      expect(ltrResult.baseDirection).toBe('ltr')
      expect(rtlResult.baseDirection).toBe('rtl')
    })

    test('should auto-detect base direction', async () => {
      const result = await fribidi.processText(testText, { baseDirection: 'auto' })
      expect(['ltr', 'rtl']).toContain(result.baseDirection)
    })

    test('should include position maps when requested', async () => {
      const result = await fribidi.processText(testText, { 
        includePositionMaps: true 
      })
      
      expect(result.logicalToVisualMap).toBeDefined()
      expect(result.visualToLogicalMap).toBeDefined()
      expect(result.logicalToVisualMap!.length).toBe(testText.length)
      expect(result.visualToLogicalMap!.length).toBe(testText.length)
    })

    test('should include embedding levels when requested', async () => {
      const result = await fribidi.processText(testText, { 
        includeEmbeddingLevels: true 
      })
      
      expect(result.embeddingLevels).toBeDefined()
      expect(result.embeddingLevels!.length).toBe(testText.length)
      expect(result.embeddingLevels!.every(level => typeof level === 'number')).toBe(true)
    })

    test('should handle Arabic shaping', async () => {
      const arabicText = 'مرحبا بالعالم'
      const withShaping = await fribidi.processText(arabicText, { enableShaping: true })
      const withoutShaping = await fribidi.processText(arabicText, { enableShaping: false })
      
      expect(withShaping.visualText).toBeTruthy()
      expect(withoutShaping.visualText).toBeTruthy()
      // Note: Visual difference may be subtle but both should work
    })

    test('should remove bidi marks when requested', async () => {
      const textWithMarks = 'Hello\u200EWorld\u200F'
      const result = await fribidi.processText(textWithMarks, { 
        removeBidiMarks: true 
      })
      
      expect(result.visualText).toBe('HelloWorld')
      expect(result.logicalText).toBe(textWithMarks)
    })
  })

  describe('Character Information', () => {
    test('should provide correct info for Latin characters', async () => {
      const info = await fribidi.getCharacterInfo('A'.codePointAt(0)!)
      
      expect(info.codePoint).toBe(65)
      expect(info.isLTR).toBe(true)
      expect(info.isRTL).toBe(false)
      expect(info.isNeutral).toBe(false)
      expect(info.isArabic).toBe(false)
    })

    test('should provide correct info for Arabic characters', async () => {
      const info = await fribidi.getCharacterInfo('م'.codePointAt(0)!)
      
      expect(info.isRTL).toBe(true)
      expect(info.isLTR).toBe(false)
      expect(info.isArabic).toBe(true)
    })

    test('should provide correct info for Hebrew characters', async () => {
      const info = await fribidi.getCharacterInfo('ש'.codePointAt(0)!)
      
      expect(info.isRTL).toBe(true)
      expect(info.isLTR).toBe(false)
      expect(info.isArabic).toBe(false)
    })

    test('should handle mirror characters', async () => {
      const openParen = await fribidi.getCharacterInfo('('.codePointAt(0)!)
      const closeParen = await fribidi.getCharacterInfo(')'.codePointAt(0)!)
      
      expect(openParen.mirrorChar).toBe(')'.codePointAt(0))
      expect(closeParen.mirrorChar).toBe('('.codePointAt(0))
    })

    test('should handle neutral characters', async () => {
      const space = await fribidi.getCharacterInfo(' '.codePointAt(0)!)
      
      expect(space.isNeutral).toBe(true)
      expect(space.isLTR).toBe(false)
      expect(space.isRTL).toBe(false)
    })
  })

  describe('Performance and Metrics', () => {
    beforeEach(() => {
      fribidi.resetPerformanceMetrics()
    })

    test('should track performance metrics correctly', async () => {
      const text = 'Performance test text'
      
      // Perform some operations
      await fribidi.processText(text)
      await fribidi.processText(text)
      await fribidi.processText(text)
      
      const metrics = fribidi.getPerformanceMetrics()
      expect(metrics.operationCount).toBe(3)
      expect(metrics.totalCharactersProcessed).toBe(text.length * 3)
      expect(metrics.averageProcessingTime).toBeGreaterThan(0)
      expect(metrics.throughput).toBeGreaterThan(0)
    })

    test('should reset metrics correctly', () => {
      fribidi.resetPerformanceMetrics()
      const metrics = fribidi.getPerformanceMetrics()
      
      expect(metrics.operationCount).toBe(0)
      expect(metrics.totalCharactersProcessed).toBe(0)
      expect(metrics.averageProcessingTime).toBe(0)
      expect(metrics.throughput).toBe(0)
    })

    test('should handle rapid sequential processing', async () => {
      const text = 'Quick test'
      const iterations = 50
      
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        await fribidi.processText(text)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTime = totalTime / iterations
      
      expect(avgTime).toBeLessThan(50) // Should be fast
      
      const metrics = fribidi.getPerformanceMetrics()
      expect(metrics.operationCount).toBe(iterations)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle Unicode emojis', async () => {
      const text = 'Hello 👋 World 🌍'
      const result = await fribidi.processText(text)
      
      expect(result.visualText).toBeTruthy()
      expect(result.baseDirection).toBe('ltr')
    })

    test('should handle combining characters', async () => {
      const text = 'café naïve' // with combining diacritics
      const result = await fribidi.processText(text)
      
      expect(result.visualText).toBeTruthy()
    })

    test('should handle special Unicode characters', async () => {
      const text = 'Line\u2028Separator\u2029Paragraph'
      const result = await fribidi.processText(text)
      
      expect(result.visualText).toBeTruthy()
    })

    test('should handle very short strings', async () => {
      const singleChar = await fribidi.processText('A')
      expect(singleChar.visualText).toBe('A')
      
      const twoChars = await fribidi.processText('AB')
      expect(twoChars.visualText).toBe('AB')
    })
  })

  describe('Utility Functions', () => {
    test('formatSpeed should format speeds correctly', () => {
      expect(formatSpeed(500)).toBe('500 chars/sec')
      expect(formatSpeed(1500)).toBe('1.5K chars/sec')
      expect(formatSpeed(2500000)).toBe('2.5M chars/sec')
    })

    test('formatSize should format sizes correctly', () => {
      expect(formatSize(512)).toBe('512 bytes')
      expect(formatSize(1536)).toBe('1.5KB')
      expect(formatSize(2097152)).toBe('2.0MB')
    })
  })
})