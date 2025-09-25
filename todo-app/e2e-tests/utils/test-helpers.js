const { query } = require('../setup/db-connection')

// Database helper functions
const getDbTodoCount = async () => {
  const result = await query('SELECT COUNT(*) as count FROM todos')
  return parseInt(result.rows[0].count)
}

const getDbTodoById = async (id) => {
  const result = await query('SELECT * FROM todos WHERE id = $1', [id])
  return result.rows[0] || null
}

const getDbTodosByPriority = async (priority) => {
  const result = await query('SELECT * FROM todos WHERE priority = $1 ORDER BY id', [priority])
  return result.rows
}

const getDbCompletedTodosCount = async () => {
  const result = await query('SELECT COUNT(*) as count FROM todos WHERE completed = true')
  return parseInt(result.rows[0].count)
}

const getDbTodoStatistics = async () => {
  const [totalResult, completedResult, priorityResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM todos'),
    query('SELECT COUNT(*) as count FROM todos WHERE completed = true'),
    query('SELECT priority, COUNT(*) as count FROM todos GROUP BY priority ORDER BY priority')
  ])

  const total = parseInt(totalResult.rows[0].count)
  const completed = parseInt(completedResult.rows[0].count)
  const pending = total - completed

  const priorityBreakdown = {
    high: 0,
    medium: 0,
    low: 0
  }

  priorityResult.rows.forEach(row => {
    priorityBreakdown[row.priority] = parseInt(row.count)
  })

  return {
    total,
    completed,
    pending,
    priorityBreakdown
  }
}

// Test assertion helpers
const expectTodoResponse = (response, expectedStatusCode = 200) => {
  expect(response.status).toBe(expectedStatusCode)
  expect(response.data).toHaveProperty('success')
  expect(response.data).toHaveProperty('message')

  if (expectedStatusCode >= 200 && expectedStatusCode < 300) {
    expect(response.data.success).toBe(true)
  } else {
    expect(response.data.success).toBe(false)
  }

  return response.data
}

const expectTodoData = (todo) => {
  expect(todo).toHaveProperty('id')
  expect(todo).toHaveProperty('title')
  expect(todo).toHaveProperty('priority')
  expect(todo).toHaveProperty('completed')
  expect(todo).toHaveProperty('created_at')
  expect(todo).toHaveProperty('updated_at')
  expect(typeof todo.id).toBe('number')
  expect(typeof todo.title).toBe('string')
  expect(['low', 'medium', 'high']).toContain(todo.priority)
  expect(typeof todo.completed).toBe('boolean')
}

const expectStatisticsData = (stats) => {
  expect(stats).toHaveProperty('total')
  expect(stats).toHaveProperty('completed')
  expect(stats).toHaveProperty('pending')
  expect(stats).toHaveProperty('byPriority')

  expect(typeof stats.total).toBe('number')
  expect(typeof stats.completed).toBe('number')
  expect(typeof stats.pending).toBe('number')
  expect(stats.total).toBe(stats.completed + stats.pending)

  expect(stats.byPriority).toHaveProperty('high')
  expect(stats.byPriority).toHaveProperty('medium')
  expect(stats.byPriority).toHaveProperty('low')
}

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const generateUniqueTodoData = (overrides = {}) => {
  const timestamp = Date.now()
  return {
    title: `Test Todo ${timestamp}`,
    description: `Test description ${timestamp}`,
    priority: 'medium',
    completed: false,
    due_date: null,
    ...overrides
  }
}

module.exports = {
  // Database helpers
  getDbTodoCount,
  getDbTodoById,
  getDbTodosByPriority,
  getDbCompletedTodosCount,
  getDbTodoStatistics,

  // Assertion helpers
  expectTodoResponse,
  expectTodoData,
  expectStatisticsData,

  // Utilities
  delay,
  generateUniqueTodoData
}