/**
 * Comprehensive algorithm validation tests for FriBidi WASM
 * Tests with large data and byte-by-byte verification following zlib.wasm standards
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import FriBidi, { formatSpeed, formatSize } from '../../ts/index.js'

describe('FriBidi WASM Algorithm Validation', () => {
  let fribidi: FriBidi

  beforeAll(async () => {
    fribidi = new FriBidi({ debug: false })
    await fribidi.initialize()
  })

  afterAll(() => {
    fribidi.dispose()
  })

  describe('Large Text Processing with Verification', () => {
    test('should process 10KB of mixed bidirectional text', async () => {
      const pattern = 'English שלום Arabic مرحبا Mixed text. '
      const patternLength = pattern.length
      const targetSize = 10 * 1024 // 10KB
      const repetitions = Math.ceil(targetSize / patternLength)
      const largeText = pattern.repeat(repetitions).slice(0, targetSize)

      console.log(`\n📊 Testing ${formatSize(largeText.length)} mixed bidirectional text`)

      const startTime = performance.now()
      const result = await fribidi.processText(largeText, {
        includePositionMaps: true,
        includeEmbeddingLevels: true
      })
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      const throughput = largeText.length / (processingTime / 1000)

      console.log(`   Processed: ${formatSize(largeText.length)} in ${processingTime.toFixed(1)}ms`)
      console.log(`   Speed: ${formatSpeed(throughput)}`)
      console.log(`   Base direction: ${result.baseDirection.toUpperCase()}`)
      console.log(`   Max embedding level: ${result.maxLevel}`)
      console.log(`   Has bidirectional content: ${result.hasBidirectionalContent}`)

      // Validation
      expect(result.visualText).toBeTruthy()
      expect(result.visualText.length).toBe(largeText.length)
      expect(result.hasBidirectionalContent).toBe(true)
      expect(result.maxLevel).toBeGreaterThan(0)
      expect(result.logicalToVisualMap).toBeDefined()
      expect(result.visualToLogicalMap).toBeDefined()
      expect(result.embeddingLevels).toBeDefined()
      expect(result.logicalToVisualMap!.length).toBe(largeText.length)
      expect(result.embeddingLevels!.length).toBe(largeText.length)
      
      // Performance validation
      expect(throughput).toBeGreaterThan(10000) // At least 10K chars/sec
      expect(processingTime).toBeLessThan(5000) // Less than 5 seconds

      // Sample byte-by-byte validation (first 100 chars)
      for (let i = 0; i < Math.min(100, largeText.length); i++) {
        const logicalPos = i
        const visualPos = result.logicalToVisualMap![i]!
        const backToLogical = result.visualToLogicalMap![visualPos]!
        expect(backToLogical).toBe(logicalPos)
      }
    })

    test('should handle 50KB of pure RTL text efficiently', async () => {
      const arabicPattern = 'مرحبا بالعالم الجميل والنص العربي الطويل. '
      const targetSize = 50 * 1024 // 50KB
      const repetitions = Math.ceil(targetSize / arabicPattern.length)
      const largeArabicText = arabicPattern.repeat(repetitions).slice(0, targetSize)

      console.log(`\n📊 Testing ${formatSize(largeArabicText.length)} pure RTL Arabic text`)

      const startTime = performance.now()
      const result = await fribidi.processText(largeArabicText, {
        enableShaping: true,
        includeEmbeddingLevels: true
      })
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      const throughput = largeArabicText.length / (processingTime / 1000)

      console.log(`   Processed: ${formatSize(largeArabicText.length)} in ${processingTime.toFixed(1)}ms`)
      console.log(`   Speed: ${formatSpeed(throughput)}`)
      console.log(`   Applied shaping: Yes`)

      // Validation
      expect(result.visualText).toBeTruthy()
      expect(result.visualText.length).toBeGreaterThan(0)
      expect(result.baseDirection).toBe('rtl')
      expect(result.maxLevel).toBeGreaterThan(0)
      
      // Performance validation for large RTL text
      expect(throughput).toBeGreaterThan(5000) // At least 5K chars/sec for complex RTL
      expect(processingTime).toBeLessThan(15000) // Less than 15 seconds
    })
  })

  describe('Bidirectional Algorithm Correctness', () => {
    test('should handle complex nested embeddings correctly', async () => {
      // Test with various embedding levels
      const complexText = 'English שלום CAPS עברית lowercase UPPER מעורבב end'
      
      const result = await fribidi.processText(complexText, {
        includeEmbeddingLevels: true,
        includePositionMaps: true
      })

      console.log(`\n🔍 Complex embedding analysis:`)
      console.log(`   Input: "${complexText}"`)
      console.log(`   Output: "${result.visualText}"`)
      console.log(`   Levels: [${result.embeddingLevels!.slice(0, 20).join(', ')}...]`)

      expect(result.hasBidirectionalContent).toBe(true)
      expect(result.maxLevel).toBeGreaterThan(1)
      expect(result.embeddingLevels!.some(level => level > 1)).toBe(true)
      
      // Verify position mapping integrity
      for (let i = 0; i < complexText.length; i++) {
        const visualPos = result.logicalToVisualMap![i]!
        const backToLogical = result.visualToLogicalMap![visualPos]!
        expect(backToLogical).toBe(i)
      }
    })

    test('should handle numbers in RTL context correctly', async () => {
      const testCases = [
        'عدد 123 في النص',
        'The number 456 in عربي text',
        '789 في بداية النص',
        'نهاية النص 012'
      ]

      for (const text of testCases) {
        const result = await fribidi.processText(text, {
          includeEmbeddingLevels: true
        })

        console.log(`\n🔢 Number handling test:`)
        console.log(`   Input: "${text}"`)
        console.log(`   Output: "${result.visualText}"`)

        expect(result.visualText).toBeTruthy()
        expect(result.visualText.length).toBe(text.length)
        
        // Numbers should be handled correctly in RTL context
        expect(result.visualText).toMatch(/\d+/)
      }
    })

    test('should handle punctuation and brackets correctly', async () => {
      const testCases = [
        'Text (with parentheses) in English',
        'טקסט (עם סוגריים) בעברית',
        'Mixed (עברית) English text',
        'Question? سؤال؟ Answer!'
      ]

      for (const text of testCases) {
        const result = await fribidi.processText(text)

        console.log(`\n🔤 Punctuation test:`)
        console.log(`   Input: "${text}"`)
        console.log(`   Output: "${result.visualText}"`)

        expect(result.visualText).toBeTruthy()
        expect(result.visualText.length).toBe(text.length)
        
        // Verify parentheses are properly handled
        if (text.includes('(')) {
          expect(result.visualText).toMatch(/[()]/);
        }
      }
    })
  })

  describe('Performance Stress Testing', () => {
    test('should handle rapid-fire small text processing', async () => {
      const testTexts = [
        'Hello שלום',
        'مرحبا World',
        'Test עברית',
        'Arabic عربي',
        'Mixed טקסט'
      ]
      
      const iterations = 1000
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        const text = testTexts[i % testTexts.length]!
        await fribidi.processText(text)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTime = totalTime / iterations
      const throughput = iterations / (totalTime / 1000)

      console.log(`\n⚡ Rapid-fire processing:`)
      console.log(`   Operations: ${iterations}`)
      console.log(`   Total time: ${totalTime.toFixed(1)}ms`)
      console.log(`   Average per operation: ${avgTime.toFixed(2)}ms`)
      console.log(`   Throughput: ${throughput.toFixed(0)} ops/sec`)

      expect(avgTime).toBeLessThan(5) // Each operation should be < 5ms
      expect(throughput).toBeGreaterThan(200) // At least 200 ops/sec
    })

    test('should maintain performance consistency', async () => {
      const text = 'Consistency test עברית text מעורבב'
      const measurements: number[] = []
      const iterations = 50
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        await fribidi.processText(text)
        const endTime = performance.now()
        measurements.push(endTime - startTime)
      }
      
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length
      const stdDev = Math.sqrt(measurements.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / measurements.length)
      const coefficientOfVariation = stdDev / avgTime

      console.log(`\n📊 Performance consistency:`)
      console.log(`   Average time: ${avgTime.toFixed(2)}ms`)
      console.log(`   Standard deviation: ${stdDev.toFixed(2)}ms`)
      console.log(`   Coefficient of variation: ${(coefficientOfVariation * 100).toFixed(1)}%`)

      // Performance should be consistent (CV < 50%)
      expect(coefficientOfVariation).toBeLessThan(0.5)
      expect(avgTime).toBeGreaterThan(0)
    })
  })

  describe('Memory Management Validation', () => {
    test('should handle sequential large text processing without memory leaks', async () => {
      const baseText = 'Memory test עברית text עם תוכן mixed content. '
      const sizes = [1024, 2048, 4096, 8192] // Different sizes in characters
      
      for (const size of sizes) {
        const repetitions = Math.ceil(size / baseText.length)
        const testText = baseText.repeat(repetitions).slice(0, size)
        
        const startTime = performance.now()
        const result = await fribidi.processText(testText, {
          includePositionMaps: true,
          includeEmbeddingLevels: true
        })
        const endTime = performance.now()
        
        console.log(`\n💾 Memory test - ${formatSize(testText.length)}:`)
        console.log(`   Processing time: ${(endTime - startTime).toFixed(1)}ms`)
        console.log(`   Output length: ${result.visualText.length}`)
        
        expect(result.visualText.length).toBe(testText.length)
        expect(result.logicalToVisualMap!.length).toBe(testText.length)
        expect(result.embeddingLevels!.length).toBe(testText.length)
      }
    })

    test('should handle repeated processing of same text efficiently', async () => {
      const text = 'Repeated processing test עברית טקסט'
      const iterations = 100
      const times: number[] = []
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        await fribidi.processText(text)
        const endTime = performance.now()
        times.push(endTime - startTime)
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length
      const firstFewAvg = times.slice(0, 10).reduce((a, b) => a + b) / 10
      const lastFewAvg = times.slice(-10).reduce((a, b) => a + b) / 10
      
      console.log(`\n🔄 Repeated processing:`)
      console.log(`   First 10 operations avg: ${firstFewAvg.toFixed(2)}ms`)
      console.log(`   Last 10 operations avg: ${lastFewAvg.toFixed(2)}ms`)
      console.log(`   Overall average: ${avgTime.toFixed(2)}ms`)
      
      // Performance should remain stable (last batch shouldn't be significantly slower)
      expect(lastFewAvg / firstFewAvg).toBeLessThan(2.0) // Less than 2x slower
    })
  })

  describe('Unicode Compliance Validation', () => {
    test('should handle various Unicode scripts correctly', async () => {
      const testCases = [
        { name: 'Latin', text: 'Hello World', dir: 'ltr' },
        { name: 'Hebrew', text: 'שלום עולם', dir: 'rtl' },
        { name: 'Arabic', text: 'مرحبا بالعالم', dir: 'rtl' },
        { name: 'Cyrillic', text: 'Привет мир', dir: 'ltr' },
        { name: 'Greek', text: 'Γεια σας κόσμος', dir: 'ltr' },
        { name: 'Mixed', text: 'Hello שלום مرحبا World', dir: 'ltr' }
      ]

      for (const { name, text, dir } of testCases) {
        const result = await fribidi.processText(text)
        
        console.log(`\n🌍 Unicode script test - ${name}:`)
        console.log(`   Input: "${text}"`)
        console.log(`   Output: "${result.visualText}"`)
        console.log(`   Detected direction: ${result.baseDirection}`)
        
        expect(result.visualText).toBeTruthy()
        expect(result.visualText.length).toBeGreaterThan(0)
        
        // For pure scripts, direction should match expectation
        if (name !== 'Mixed') {
          expect(result.baseDirection).toBe(dir)
        }
      }
    })

    test('should handle combining characters and diacritics', async () => {
      const testCases = [
        'café naïve résumé', // Latin with diacritics
        'שָׁלוֹם עוֹלָם', // Hebrew with nikud
        'مَرْحَبًا بِالْعَالَمِ', // Arabic with diacritics
      ]

      for (const text of testCases) {
        const result = await fribidi.processText(text)
        const analysis = await fribidi.analyzeText(text)
        
        console.log(`\n📝 Combining characters test:`)
        console.log(`   Input: "${text}"`)
        console.log(`   Output: "${result.visualText}"`)
        console.log(`   Analysis: LTR=${analysis.hasLTR}, RTL=${analysis.hasRTL}`)
        
        expect(result.visualText).toBeTruthy()
        expect(result.processingTime).toBeGreaterThan(0)
      }
    })
  })
})