/**
 * FriBidi WASM Interactive Demo
 * Professional demonstration following zlib.wasm standards
 * 
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying GNU FriBidi project (LGPL 2.1+)
 */

import FriBidi, { formatSpeed, formatSize } from './ts/index.js'

interface DemoResult {
  name: string
  text: string
  processingTime: number
  throughput: number
  result: any
}

class FriBidiDemo {
  private fribidi: FriBidi
  private results: DemoResult[] = []

  constructor() {
    this.fribidi = new FriBidi({ debug: false })
  }

  async initialize(): Promise<void> {
    console.log('🌍 FriBidi WASM Professional Demo')
    console.log('==================================')
    
    await this.fribidi.initialize()
    
    const capabilities = this.fribidi.getCapabilities()
    console.log(`📦 Module: ${capabilities.name}`)
    console.log(`🔢 Version: ${capabilities.version}`)
    console.log(`🌐 Unicode: ${capabilities.unicodeVersion}`)
    console.log(`⚡ SIMD: ${capabilities.simdSupported ? '✅ Available' : '❌ Not Available'}`)
    console.log('')
  }

  /**
   * Run a demo test with metrics
   */
  private async runDemo(name: string, text: string, operation: () => Promise<any>): Promise<DemoResult> {
    const startTime = performance.now()
    const result = await operation()
    const endTime = performance.now()
    
    const processingTime = endTime - startTime
    const throughput = text.length / (processingTime / 1000)
    
    const demoResult = {
      name,
      text,
      processingTime,
      throughput,
      result
    }
    
    this.results.push(demoResult)
    return demoResult
  }

  /**
   * Basic text processing demonstration
   */
  async demoBasicProcessing(): Promise<void> {
    console.log('📝 Basic Text Processing Demo')
    console.log('-----------------------------')

    const testCases = [
      {
        name: 'English Text (LTR)',
        text: 'Hello World! This is left-to-right text.',
        description: 'Simple left-to-right English text'
      },
      {
        name: 'Hebrew Text (RTL)',
        text: 'שלום עולם! זה טקסט מימין לשמאל.',
        description: 'Hebrew text - right-to-left script'
      },
      {
        name: 'Arabic Text (RTL)',
        text: 'مرحبا بالعالم! هذا نص من اليمين إلى اليسار.',
        description: 'Arabic text with potential shaping needs'
      },
      {
        name: 'Mixed Bidirectional',
        text: 'Hello שלום World عالم!',
        description: 'Complex mixed LTR/RTL requiring bidirectional processing'
      }
    ]

    for (const testCase of testCases) {
      const demo = await this.runDemo(testCase.name, testCase.text, async () => {
        return this.fribidi.processText(testCase.text, {
          includePositionMaps: true,
          includeEmbeddingLevels: true
        })
      })

      console.log(`\n🔍 ${demo.name}:`)
      console.log(`📖 Description: ${testCase.description}`)
      console.log(`📄 Input: "${demo.text}"`)
      console.log(`📄 Output: "${demo.result.visualText}"`)
      console.log(`🧭 Direction: ${demo.result.baseDirection.toUpperCase()}`)
      console.log(`📊 Max Level: ${demo.result.maxLevel}`)
      console.log(`🔄 Bidirectional: ${demo.result.hasBidirectionalContent ? 'Yes' : 'No'}`)
      console.log(`⏱️  Time: ${demo.processingTime.toFixed(2)}ms`)
      console.log(`📈 Speed: ${formatSpeed(demo.throughput)}`)
    }
  }

  /**
   * Performance benchmarking demonstration
   */
  async demoPerformanceBenchmark(): Promise<void> {
    console.log('\n\n⚡ Performance Benchmark Demo')
    console.log('-----------------------------')

    const testSizes = [
      { size: 100, name: 'Small Text' },
      { size: 1000, name: 'Medium Text' },
      { size: 10000, name: 'Large Text' }
    ]

    for (const { size, name } of testSizes) {
      const pattern = 'Performance test עברית مرحبا mixed. '
      const repetitions = Math.ceil(size / pattern.length)
      const testText = pattern.repeat(repetitions).slice(0, size)
      
      console.log(`\n📊 ${name} (${formatSize(testText.length)}):`);

      // Warm-up
      await this.fribidi.processText(testText)
      
      // Benchmark
      const iterations = Math.max(1, Math.floor(10000 / testText.length))
      const times: number[] = []
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await this.fribidi.processText(testText)
        const end = performance.now()
        times.push(end - start)
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length
      const throughput = (testText.length * iterations) / (times.reduce((a, b) => a + b) / 1000)
      const stdDev = Math.sqrt(times.reduce((acc, t) => acc + Math.pow(t - avgTime, 2), 0) / times.length)
      
      console.log(`   🔄 Iterations: ${iterations}`)
      console.log(`   ⏱️  Average: ${avgTime.toFixed(3)}ms`)
      console.log(`   📊 Std Dev: ${stdDev.toFixed(3)}ms`)
      console.log(`   📈 Throughput: ${formatSpeed(throughput)}`)
      console.log(`   🎯 Consistency: ${((1 - stdDev/avgTime) * 100).toFixed(1)}%`)
    }
  }

  /**
   * Real-world use cases demonstration
   */
  async demoRealWorldUseCases(): Promise<void> {
    console.log('\n\n🌍 Real-World Use Cases Demo')
    console.log('-----------------------------')

    const useCases = [
      {
        name: 'User Interface',
        text: 'Welcome שלום مرحبا to our app!',
        description: 'International UI text'
      },
      {
        name: 'E-commerce',
        text: 'iPhone 15 Pro - מחיר: $999 - متوفر الآن',
        description: 'Product info in multiple languages'
      },
      {
        name: 'Social Media',
        text: 'Amazing photo! תמונה מדהימה #photography #تصوير',
        description: 'Social post with hashtags'
      },
      {
        name: 'Email Address',
        text: 'Contact: info@company.com for שירות support',
        description: 'Mixed content with email'
      }
    ]

    for (const useCase of useCases) {
      const demo = await this.runDemo(useCase.name, useCase.text, async () => {
        const [result, analysis] = await Promise.all([
          this.fribidi.processText(useCase.text, { includePositionMaps: true }),
          this.fribidi.analyzeText(useCase.text)
        ])
        return { result, analysis }
      })

      console.log(`\n🎯 ${demo.name}:`)
      console.log(`   📖 Description: ${useCase.description}`)
      console.log(`   📝 Input: "${demo.text}"`)
      console.log(`   📄 Output: "${demo.result.result.visualText}"`)
      console.log(`   🧭 Direction: ${demo.result.result.baseDirection.toUpperCase()}`)
      console.log(`   📊 Analysis: ${demo.result.analysis.hasLTR ? 'LTR ' : ''}${demo.result.analysis.hasRTL ? 'RTL ' : ''}${demo.result.analysis.hasArabic ? 'Arabic ' : ''}${demo.result.analysis.hasHebrew ? 'Hebrew' : ''}`)
      console.log(`   ⏱️  Time: ${demo.processingTime.toFixed(2)}ms`)
      console.log(`   📈 Speed: ${formatSpeed(demo.throughput)}`)
    }
  }

  /**
   * Algorithm correctness demonstration
   */
  async demoAlgorithmCorrectness(): Promise<void> {
    console.log('\n\n🔍 Algorithm Correctness Demo')
    console.log('-----------------------------')

    // Test complex bidirectional scenarios
    const complexText = 'English שלום CAPS עברית 123 mixed'
    const result = await this.fribidi.processText(complexText, {
      includeEmbeddingLevels: true,
      includePositionMaps: true
    })

    console.log(`\n📝 Complex Text Analysis:`)
    console.log(`   Input: "${complexText}"`)
    console.log(`   Output: "${result.visualText}"`)
    console.log(`   Levels: [${result.embeddingLevels!.join(', ')}]`)
    
    // Character-by-character analysis
    console.log(`\n📋 Character Breakdown:`)
    for (let i = 0; i < Math.min(complexText.length, 20); i++) {
      const char = complexText[i]!
      const info = await this.fribidi.getCharacterInfo(char.codePointAt(0)!)
      const level = result.embeddingLevels![i]!
      const visualPos = result.logicalToVisualMap![i]!
      
      console.log(`   ${i.toString().padStart(2)}: '${char}' → ${info.bidiType.padEnd(3)} → Level ${level} → Pos ${visualPos}`)
    }
  }

  /**
   * Print overall summary
   */
  printSummary(): void {
    console.log('\n\n🎯 Demo Summary')
    console.log('===============')
    
    const totalOperations = this.results.length
    const totalChars = this.results.reduce((sum, r) => sum + r.text.length, 0)
    const totalTime = this.results.reduce((sum, r) => sum + r.processingTime, 0)
    const avgThroughput = totalChars / (totalTime / 1000)
    
    console.log(`Total operations: ${totalOperations}`)
    console.log(`Total characters processed: ${formatSize(totalChars)}`)
    console.log(`Total processing time: ${totalTime.toFixed(2)}ms`)
    console.log(`Average throughput: ${formatSpeed(avgThroughput)}`)
    
    const metrics = this.fribidi.getPerformanceMetrics()
    console.log(`\nFinal Performance Metrics:`)
    console.log(`- Operations: ${metrics.operationCount}`)
    console.log(`- Characters: ${formatSize(metrics.totalCharactersProcessed)}`)
    console.log(`- Avg time: ${metrics.averageProcessingTime.toFixed(3)}ms`)
    console.log(`- Throughput: ${formatSpeed(metrics.throughput)}`)
    console.log(`- SIMD: ${metrics.simdEnabled ? '✅' : '❌'}`)
    
    console.log('\n🎉 Demo completed successfully!')
    console.log('Ready for production use in:')
    console.log('✅ Multilingual web applications')
    console.log('✅ Text editors with RTL support')
    console.log('✅ International user interfaces')
    console.log('✅ Document processing systems')
    console.log('✅ Social media platforms')
  }

  /**
   * Run all demonstrations
   */
  async runAll(): Promise<void> {
    await this.initialize()
    await this.demoBasicProcessing()
    await this.demoPerformanceBenchmark()
    await this.demoRealWorldUseCases()
    await this.demoAlgorithmCorrectness()
    this.printSummary()
  }

  dispose(): void {
    this.fribidi.dispose()
  }
}

// Export for use as a library
export { FriBidiDemo }

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new FriBidiDemo()
  
  demo.runAll()
    .then(() => {
      demo.dispose()
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error)
      demo.dispose()
      process.exit(1)
    })
}