/**
 * FriBidi WASM Professional Benchmark Suite
 * Comprehensive performance validation following zlib.wasm standards
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

import FriBidi, { formatSpeed, formatSize } from './ts/index.js'

interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  averageTime: number
  throughput: number
  charactersProcessed: number
  simdEnabled: boolean
  memoryUsage?: number
}

interface BenchmarkSuite {
  suiteName: string
  results: BenchmarkResult[]
  summary: {
    totalOperations: number
    totalTime: number
    totalCharacters: number
    overallThroughput: number
  }
}

class FriBidiBenchmark {
  private fribidi: FriBidi
  private results: BenchmarkSuite[] = []

  constructor() {
    this.fribidi = new FriBidi({ simdEnabled: true, debug: false })
  }

  async initialize(): Promise<void> {
    await this.fribidi.initialize()
    console.log('🚀 FriBidi WASM Professional Benchmark Suite')
    console.log('=============================================')
    
    const capabilities = this.fribidi.getCapabilities()
    console.log(`📦 Module: ${capabilities.name}`)
    console.log(`🔢 Version: ${capabilities.version}`)
    console.log(`🌐 Unicode: ${capabilities.unicodeVersion}`)
    console.log(`⚡ SIMD: ${capabilities.simdSupported ? '✅ Available' : '❌ Not Available'}`)
    console.log('')
  }

  /**
   * Run a single benchmark with comprehensive metrics
   */
  private async runBenchmark(
    name: string,
    testFunction: () => Promise<void>,
    iterations: number,
    charactersProcessed: number = 0
  ): Promise<BenchmarkResult> {
    // Warm-up runs
    for (let i = 0; i < 3; i++) {
      await testFunction()
    }
    
    // Reset metrics
    this.fribidi.resetPerformanceMetrics()
    
    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc()
    }
    
    const startTime = performance.now()
    const startMemory = this.getMemoryUsage()
    
    for (let i = 0; i < iterations; i++) {
      await testFunction()
    }
    
    const endTime = performance.now()
    const endMemory = this.getMemoryUsage()
    
    const totalTime = endTime - startTime
    const averageTime = totalTime / iterations
    const throughput = charactersProcessed > 0 ? (charactersProcessed * iterations) / (totalTime / 1000) : iterations / (totalTime / 1000)
    const memoryUsage = endMemory - startMemory
    
    const metrics = this.fribidi.getPerformanceMetrics()
    
    return {
      name,
      iterations,
      totalTime,
      averageTime,
      throughput,
      charactersProcessed: charactersProcessed * iterations,
      simdEnabled: metrics.simdEnabled,
      memoryUsage
    }
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    // @ts-ignore - Performance memory API
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Basic text processing benchmarks
   */
  async benchmarkBasicProcessing(): Promise<void> {
    console.log('📊 Basic Text Processing Benchmarks')
    console.log('-----------------------------------')
    
    const results: BenchmarkResult[] = []
    
    // Simple LTR text
    const ltrText = 'Hello World! This is a performance test for left-to-right text processing.'
    results.push(await this.runBenchmark(
      'Simple LTR Text (75 chars)',
      () => this.fribidi.processText(ltrText),
      10000,
      ltrText.length
    ))
    
    // Simple RTL Hebrew text
    const hebrewText = 'שלום עולם! זה בדיקת ביצועים לעיבוד טקסט מימין לשמאל בעברית.'
    results.push(await this.runBenchmark(
      'Simple RTL Hebrew (58 chars)',
      () => this.fribidi.processText(hebrewText),
      10000,
      hebrewText.length
    ))
    
    // Simple RTL Arabic text
    const arabicText = 'مرحبا بالعالم! هذا اختبار أداء لمعالجة النص من اليمين إلى اليسار بالعربية.'
    results.push(await this.runBenchmark(
      'Simple RTL Arabic (67 chars)',
      () => this.fribidi.processText(arabicText),
      10000,
      arabicText.length
    ))
    
    // Mixed bidirectional text
    const mixedText = 'English שלום Arabic مرحبا Mixed עברית text النص with numbers 123!'
    results.push(await this.runBenchmark(
      'Mixed Bidirectional (69 chars)',
      () => this.fribidi.processText(mixedText, { 
        includePositionMaps: true,
        includeEmbeddingLevels: true
      }),
      5000,
      mixedText.length
    ))
    
    this.printResults(results)
    
    this.results.push({
      suiteName: 'Basic Processing',
      results,
      summary: this.calculateSummary(results)
    })
  }

  /**
   * Large text processing benchmarks
   */
  async benchmarkLargeText(): Promise<void> {
    console.log('\n📊 Large Text Processing Benchmarks')
    console.log('-----------------------------------')
    
    const results: BenchmarkResult[] = []
    
    // 1KB mixed text
    const pattern1KB = 'Performance test עברית مرحبا mixed content. '
    const text1KB = pattern1KB.repeat(Math.ceil(1024 / pattern1KB.length)).slice(0, 1024)
    results.push(await this.runBenchmark(
      '1KB Mixed Text',
      () => this.fribidi.processText(text1KB, { includePositionMaps: true }),
      1000,
      text1KB.length
    ))
    
    // 5KB pure RTL text
    const patternRTL = 'טקסט עברית ארוך לבדיקת ביצועים עם תוכן רב ומורכב. '
    const text5KB = patternRTL.repeat(Math.ceil(5120 / patternRTL.length)).slice(0, 5120)
    results.push(await this.runBenchmark(
      '5KB Pure RTL Text',
      () => this.fribidi.processText(text5KB, { enableShaping: true }),
      200,
      text5KB.length
    ))
    
    // 10KB highly mixed text
    const patternMixed = 'English שלום Arabic مرحبا Numbers 123 Mixed. '
    const text10KB = patternMixed.repeat(Math.ceil(10240 / patternMixed.length)).slice(0, 10240)
    results.push(await this.runBenchmark(
      '10KB Highly Mixed Text',
      () => this.fribidi.processText(text10KB, { 
        includePositionMaps: true,
        includeEmbeddingLevels: true,
        enableShaping: true
      }),
      100,
      text10KB.length
    ))
    
    // 50KB stress test
    const pattern50KB = 'Stress test עברית مرحبا performance validation. '
    const text50KB = pattern50KB.repeat(Math.ceil(51200 / pattern50KB.length)).slice(0, 51200)
    results.push(await this.runBenchmark(
      '50KB Stress Test',
      () => this.fribidi.processText(text50KB),
      20,
      text50KB.length
    ))
    
    this.printResults(results)
    
    this.results.push({
      suiteName: 'Large Text Processing',
      results,
      summary: this.calculateSummary(results)
    })
  }

  /**
   * Analysis and character info benchmarks
   */
  async benchmarkAnalysis(): Promise<void> {
    console.log('\n📊 Text Analysis Benchmarks')
    console.log('---------------------------')
    
    const results: BenchmarkResult[] = []
    
    const testTexts = [
      'English text analysis',
      'עברית טקסט ניתוח',
      'تحليل النص العربي',
      'Mixed English עברית Arabic مرحبا analysis'
    ]
    
    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i]!
      const langName = i === 0 ? 'English' : i === 1 ? 'Hebrew' : i === 2 ? 'Arabic' : 'Mixed'
      
      results.push(await this.runBenchmark(
        `Analysis: ${langName}`,
        () => this.fribidi.analyzeText(text),
        20000,
        text.length
      ))
    }
    
    // Character info benchmarks
    const testChars = [
      { char: 'A', name: 'Latin A' },
      { char: 'ש', name: 'Hebrew Shin' },
      { char: 'م', name: 'Arabic Meem' },
      { char: '1', name: 'Digit 1' },
      { char: '(', name: 'Left Paren' },
      { char: ' ', name: 'Space' }
    ]
    
    for (const { char, name } of testChars) {
      results.push(await this.runBenchmark(
        `Character Info: ${name}`,
        () => this.fribidi.getCharacterInfo(char.codePointAt(0)!),
        50000,
        1
      ))
    }
    
    this.printResults(results)
    
    this.results.push({
      suiteName: 'Text Analysis',
      results,
      summary: this.calculateSummary(results)
    })
  }

  /**
   * Stress testing with complex scenarios
   */
  async benchmarkStressTests(): Promise<void> {
    console.log('\n📊 Stress Test Benchmarks')
    console.log('-------------------------')
    
    const results: BenchmarkResult[] = []
    
    // Alternating directions (worst case for bidi algorithm)
    const alternating = Array.from({ length: 100 }, (_, i) => 
      i % 2 === 0 ? 'Hello' : 'שלום'
    ).join(' ')
    
    results.push(await this.runBenchmark(
      'Alternating LTR/RTL (100 switches)',
      () => this.fribidi.processText(alternating, { 
        includePositionMaps: true,
        includeEmbeddingLevels: true 
      }),
      500,
      alternating.length
    ))
    
    // Deep nesting levels
    const nested = 'Level0 שלום Level1 CAPS עברית level2 UPPER מעורבב end'
    results.push(await this.runBenchmark(
      'Deep Embedding Levels',
      () => this.fribidi.processText(nested, { 
        includePositionMaps: true,
        includeEmbeddingLevels: true 
      }),
      2000,
      nested.length
    ))
    
    // Heavy punctuation and numbers
    const punctuated = 'Text, עברית! Numbers 123, مرحبا? Punctuation; test: end.'.repeat(10)
    results.push(await this.runBenchmark(
      'Heavy Punctuation & Numbers',
      () => this.fribidi.processText(punctuated),
      1000,
      punctuated.length
    ))
    
    // Rapid-fire small texts (memory allocation stress)
    const smallTexts = [
      'Hello שלום',
      'مرحبا World', 
      'Test עברית',
      'Mixed טקסט'
    ]
    let textIndex = 0
    results.push(await this.runBenchmark(
      'Rapid Small Texts',
      () => {
        const text = smallTexts[textIndex % smallTexts.length]!
        textIndex++
        return this.fribidi.processText(text)
      },
      10000,
      10 // Average length
    ))
    
    this.printResults(results)
    
    this.results.push({
      suiteName: 'Stress Tests',
      results,
      summary: this.calculateSummary(results)
    })
  }

  /**
   * Performance consistency validation
   */
  async benchmarkConsistency(): Promise<void> {
    console.log('\n📊 Performance Consistency Benchmarks')
    console.log('-------------------------------------')
    
    const results: BenchmarkResult[] = []
    const testText = 'Consistency test עברית مرحبا mixed content for validation.'
    
    // Run multiple batches to test consistency
    const batchSizes = [100, 500, 1000]
    
    for (const batchSize of batchSizes) {
      const measurements: number[] = []
      
      for (let batch = 0; batch < 5; batch++) {
        const startTime = performance.now()
        
        for (let i = 0; i < batchSize; i++) {
          await this.fribidi.processText(testText)
        }
        
        const endTime = performance.now()
        measurements.push((endTime - startTime) / batchSize)
      }
      
      const avgTime = measurements.reduce((a, b) => a + b) / measurements.length
      const stdDev = Math.sqrt(measurements.reduce((acc, t) => acc + Math.pow(t - avgTime, 2), 0) / measurements.length)
      const cv = stdDev / avgTime
      const throughput = testText.length / (avgTime / 1000)
      
      console.log(`\n📊 Batch Size ${batchSize}:`)
      console.log(`   Average time: ${avgTime.toFixed(3)}ms`)
      console.log(`   Std deviation: ${stdDev.toFixed(3)}ms`)
      console.log(`   Coefficient of variation: ${(cv * 100).toFixed(1)}%`)
      console.log(`   Throughput: ${formatSpeed(throughput)}`)
      console.log(`   Consistency: ${cv < 0.1 ? '✅ Excellent' : cv < 0.2 ? '👍 Good' : '⚠️  Variable'}`)
    }
  }

  /**
   * Print benchmark results
   */
  private printResults(results: BenchmarkResult[]): void {
    for (const result of results) {
      console.log(`\n${result.name}:`)
      console.log(`  Iterations: ${result.iterations.toLocaleString()}`)
      console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`)
      console.log(`  Average time: ${result.averageTime.toFixed(3)}ms`)
      console.log(`  Throughput: ${formatSpeed(result.throughput)}`)
      
      if (result.charactersProcessed > 0) {
        console.log(`  Characters: ${formatSize(result.charactersProcessed)}`)
      }
      
      if (result.memoryUsage && result.memoryUsage > 0) {
        console.log(`  Memory delta: ${formatSize(result.memoryUsage)}`)
      }
      
      console.log(`  SIMD: ${result.simdEnabled ? '✅' : '❌'}`)
    }
  }

  /**
   * Calculate suite summary
   */
  private calculateSummary(results: BenchmarkResult[]) {
    const totalOperations = results.reduce((sum, r) => sum + r.iterations, 0)
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0)
    const totalCharacters = results.reduce((sum, r) => sum + r.charactersProcessed, 0)
    const overallThroughput = totalCharacters > 0 ? totalCharacters / (totalTime / 1000) : totalOperations / (totalTime / 1000)
    
    return {
      totalOperations,
      totalTime,
      totalCharacters,
      overallThroughput
    }
  }

  /**
   * Print comprehensive summary
   */
  printSummary(): void {
    console.log('\n🎯 Comprehensive Benchmark Summary')
    console.log('==================================')
    
    let grandTotalOps = 0
    let grandTotalTime = 0
    let grandTotalChars = 0
    
    for (const suite of this.results) {
      console.log(`\n📊 ${suite.suiteName}:`)
      console.log(`   Operations: ${suite.summary.totalOperations.toLocaleString()}`)
      console.log(`   Time: ${suite.summary.totalTime.toFixed(2)}ms`)
      console.log(`   Characters: ${formatSize(suite.summary.totalCharacters)}`)
      console.log(`   Throughput: ${formatSpeed(suite.summary.overallThroughput)}`)
      
      grandTotalOps += suite.summary.totalOperations
      grandTotalTime += suite.summary.totalTime
      grandTotalChars += suite.summary.totalCharacters
    }
    
    console.log(`\n🏆 Grand Totals:`)
    console.log(`   Total operations: ${grandTotalOps.toLocaleString()}`)
    console.log(`   Total time: ${grandTotalTime.toFixed(2)}ms`)
    console.log(`   Total characters: ${formatSize(grandTotalChars)}`)
    console.log(`   Overall throughput: ${formatSpeed(grandTotalChars / (grandTotalTime / 1000))}`)
    
    const capabilities = this.fribidi.getCapabilities()
    const metrics = this.fribidi.getPerformanceMetrics()
    
    console.log(`\n📈 Performance Analysis:`)
    console.log(`   SIMD enabled: ${capabilities.simdSupported ? '✅ Yes' : '❌ No'}`)
    console.log(`   Average speed: ${formatSpeed(grandTotalChars / (grandTotalTime / 1000))}`)
    console.log(`   Performance rating: ${this.getPerformanceRating(grandTotalChars / (grandTotalTime / 1000))}`)
    console.log(`   Final metrics: ${metrics.operationCount} ops, ${formatSpeed(metrics.throughput)}`)
  }

  /**
   * Get performance rating
   */
  private getPerformanceRating(throughput: number): string {
    if (throughput > 100000) return '🚀 Outstanding'
    if (throughput > 50000) return '⚡ Excellent'
    if (throughput > 20000) return '✅ Very Good'
    if (throughput > 10000) return '👍 Good'
    if (throughput > 5000) return '👌 Acceptable'
    return '🐌 Needs Improvement'
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    await this.initialize()
    
    await this.benchmarkBasicProcessing()
    await this.benchmarkLargeText()
    await this.benchmarkAnalysis()
    await this.benchmarkStressTests()
    await this.benchmarkConsistency()
    
    this.printSummary()
  }

  dispose(): void {
    this.fribidi.dispose()
  }
}

// Export for use as a library
export { FriBidiBenchmark }

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new FriBidiBenchmark()
  
  benchmark.runAll()
    .then(() => {
      benchmark.dispose()
      console.log('\n✅ Benchmark completed successfully!')
    })
    .catch((error) => {
      console.error('❌ Benchmark failed:', error)
      benchmark.dispose()
      process.exit(1)
    })
}