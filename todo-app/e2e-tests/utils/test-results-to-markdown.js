#!/usr/bin/env node

/**
 * Converts JUnit XML test results to markdown format
 * Usage: node test-results-to-markdown.js <path-to-junit-xml>
 */

const fs = require('fs')
const path = require('path')
const { parseStringPromise } = require('xml2js')

function formatDuration(seconds) {
  const num = parseFloat(seconds) || 0
  if (num < 1) {
    return `${Math.round(num * 1000)}ms`
  }
  return `${num.toFixed(2)}s`
}

async function parseJUnitXML(xmlContent) {
  const result = await parseStringPromise(xmlContent, {
    explicitArray: false,
    mergeAttrs: true,
  })
  return result
}

async function generateMarkdown(xmlContent) {
  const junit = await parseJUnitXML(xmlContent)
  const testsuites = junit.testsuites

  const totalTests = parseInt(testsuites.tests) || 0
  const failures = parseInt(testsuites.failures) || 0
  const errors = parseInt(testsuites.errors) || 0
  const passed = totalTests - failures - errors
  const success = failures === 0 && errors === 0

  let markdown = '# E2E Test Results\n\n'

  // Summary section
  markdown += '## Summary\n\n'
  markdown += `- **Status**: ${success ? '✅ PASSED' : '❌ FAILED'}\n`
  markdown += `- **Total Tests**: ${totalTests}\n`
  markdown += `- **Passed**: ${passed} ✅\n`
  markdown += `- **Failed**: ${failures} ❌\n`
  markdown += `- **Errors**: ${errors} ⚠️\n`
  markdown += `- **Duration**: ${formatDuration(testsuites.time)}\n\n`

  // Test suites section
  markdown += '## Test Suites\n\n'

  const suites = Array.isArray(testsuites.testsuite)
    ? testsuites.testsuite
    : [testsuites.testsuite]

  suites.forEach((suite) => {
    const suiteFailures = parseInt(suite.failures) || 0
    const suiteErrors = parseInt(suite.errors) || 0
    const suiteTests = parseInt(suite.tests) || 0
    const suiteStatus = (suiteFailures === 0 && suiteErrors === 0) ? '✅' : '❌'
    const suiteName = suite.name || 'Unknown Suite'
    const duration = formatDuration(suite.time)

    markdown += `### ${suiteStatus} ${suiteName}\n`
    markdown += `**Duration**: ${duration} | **Tests**: ${suiteTests} | **Failed**: ${suiteFailures}\n\n`

    const testcases = Array.isArray(suite.testcase)
      ? suite.testcase
      : (suite.testcase ? [suite.testcase] : [])

    // Group tests by status
    const passedTests = testcases.filter(t => !t.failure && !t.error)
    const failedTests = testcases.filter(t => t.failure || t.error)

    // Show passed tests (collapsed for brevity)
    if (passedTests.length > 0) {
      markdown += '<details>\n'
      markdown += '<summary>✅ Passed Tests (' + passedTests.length + ')</summary>\n\n'
      passedTests.forEach((test) => {
        const testDuration = formatDuration(test.time)
        markdown += `- ✅ ${test.name} (${testDuration})\n`
      })
      markdown += '\n</details>\n\n'
    }

    // Show failed tests with details (always expanded)
    if (failedTests.length > 0) {
      markdown += '#### ❌ Failed Tests\n\n'
      failedTests.forEach((test) => {
        const testDuration = formatDuration(test.time)
        markdown += `**${test.name}** (${testDuration})\n\n`

        const failureMessage = test.failure || test.error
        if (failureMessage) {
          const message = typeof failureMessage === 'string'
            ? failureMessage
            : (failureMessage._ || failureMessage.message || 'No error message')

          // Clean up message and limit length
          const cleanMessage = message
            // eslint-disable-next-line no-control-regex
            .replace(/\u001b\[.*?m/g, '') // Remove ANSI codes
            .trim()
            .split('\n')
            .slice(0, 10) // Limit to first 10 lines
            .join('\n')

          markdown += '<details>\n'
          markdown += '<summary>Error Details</summary>\n\n'
          markdown += '```\n'
          markdown += cleanMessage
          markdown += '\n```\n'
          markdown += '</details>\n\n'
        }
      })
    }
  })

  return markdown
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: node test-results-to-markdown.js <path-to-junit-xml>')
    process.exit(1)
  }

  const xmlPath = args[0]

  if (!fs.existsSync(xmlPath)) {
    console.error(`Error: File not found: ${xmlPath}`)
    process.exit(1)
  }

  try {
    const xmlContent = fs.readFileSync(xmlPath, 'utf8')
    const markdown = await generateMarkdown(xmlContent)

    // Output to stdout so it can be captured
    console.log(markdown)

    // Parse again to check success
    const junit = await parseJUnitXML(xmlContent)
    const testsuites = junit.testsuites
    const failures = parseInt(testsuites.failures) || 0
    const errors = parseInt(testsuites.errors) || 0
    const success = failures === 0 && errors === 0

    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error(`Error processing test results: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateMarkdown, formatDuration, parseJUnitXML }
