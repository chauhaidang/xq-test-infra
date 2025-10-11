#!/usr/bin/env node

/**
 * Converts Jest JSON test results to markdown format
 * Usage: node test-results-to-markdown.js <path-to-json-results>
 */

const fs = require('fs')
const path = require('path')

function formatDuration(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }
  return `${(milliseconds / 1000).toFixed(2)}s`
}

function generateMarkdown(results) {
  const { numTotalTests, numPassedTests, numFailedTests, numPendingTests, testResults, success } = results

  let markdown = '# E2E Test Results\n\n'

  // Summary section
  markdown += '## Summary\n\n'
  markdown += `- **Status**: ${success ? '✅ PASSED' : '❌ FAILED'}\n`
  markdown += `- **Total Tests**: ${numTotalTests}\n`
  markdown += `- **Passed**: ${numPassedTests} ✅\n`
  markdown += `- **Failed**: ${numFailedTests} ❌\n`
  markdown += `- **Pending**: ${numPendingTests} ⏸️\n\n`

  // Test suites section
  markdown += '## Test Suites\n\n'

  testResults.forEach((suite) => {
    const suiteStatus = suite.status === 'passed' ? '✅' : '❌'
    const suiteName = path.basename(suite.name)
    const duration = formatDuration(suite.perfStats.runtime)

    markdown += `### ${suiteStatus} ${suiteName}\n`
    markdown += `**Duration**: ${duration}\n\n`

    // Group tests by status
    const passedTests = suite.testResults.filter(t => t.status === 'passed')
    const failedTests = suite.testResults.filter(t => t.status === 'failed')
    const pendingTests = suite.testResults.filter(t => t.status === 'pending' || t.status === 'skipped')

    // Show passed tests
    if (passedTests.length > 0) {
      markdown += '#### Passed Tests\n\n'
      passedTests.forEach((test) => {
        const testDuration = formatDuration(test.duration)
        markdown += `- ✅ ${test.fullName} (${testDuration})\n`
      })
      markdown += '\n'
    }

    // Show failed tests with details
    if (failedTests.length > 0) {
      markdown += '#### Failed Tests\n\n'
      failedTests.forEach((test) => {
        markdown += `- ❌ **${test.fullName}**\n`
        if (test.failureMessages && test.failureMessages.length > 0) {
          markdown += '  ```\n'
          test.failureMessages.forEach((message) => {
            // Clean up ANSI codes
            const cleanMessage = message.replace(/\u001b\[.*?m/g, '')
            markdown += `  ${cleanMessage}\n`
          })
          markdown += '  ```\n'
        }
        markdown += '\n'
      })
    }

    // Show pending tests
    if (pendingTests.length > 0) {
      markdown += '#### Pending/Skipped Tests\n\n'
      pendingTests.forEach((test) => {
        markdown += `- ⏸️ ${test.fullName}\n`
      })
      markdown += '\n'
    }
  })

  return markdown
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node test-results-to-markdown.js <path-to-json-results>')
    process.exit(1)
  }

  const jsonPath = args[0]

  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found: ${jsonPath}`)
    process.exit(1)
  }

  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8')
    const results = JSON.parse(rawData)
    const markdown = generateMarkdown(results)

    // Output to stdout so it can be captured
    console.log(markdown)

    process.exit(results.success ? 0 : 1)
  } catch (error) {
    console.error(`Error processing test results: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateMarkdown, formatDuration }
