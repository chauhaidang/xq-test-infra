const request = require('supertest')
const app = require('../../src/app')
const dbConnection = require('../shared/database')

// Mock database connection
jest.mock('../shared/database')

describe('Todo Write Service Integration Tests', () => {
  let mockPool

  beforeAll(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    }

    dbConnection.connect.mockResolvedValue(mockPool)
    dbConnection.getPool.mockReturnValue(mockPool)
    dbConnection.healthCheck.mockResolvedValue({ healthy: true, timestamp: new Date() })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /health', () => {
    it('should return 200 when service is healthy', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.service).toBe('todo-write-service')
    })

    it('should return 503 when database is unhealthy', async () => {
      dbConnection.healthCheck.mockResolvedValue({ healthy: false, error: 'Connection failed' })

      const response = await request(app).get('/health')

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/todos', () => {
    const validTodoData = {
      title: 'Test Todo',
      description: 'Test Description',
      priority: 'high',
      due_date: '2024-12-31T23:59:59.000Z'
    }

    const createdTodo = {
      id: 1,
      ...validTodoData,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    it('should create todo with valid data', async () => {
      mockPool.query.mockResolvedValue({ rows: [createdTodo] })

      const response = await request(app)
        .post('/api/todos')
        .send(validTodoData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Todo created successfully')
      expect(response.body.data).toEqual(createdTodo)
    })

    it('should create todo with minimal data', async () => {
      const minimalTodo = { title: 'Minimal Todo' }
      const createdMinimalTodo = {
        id: 2,
        title: 'Minimal Todo',
        description: null,
        priority: 'medium',
        due_date: null,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockPool.query.mockResolvedValue({ rows: [createdMinimalTodo] })

      const response = await request(app)
        .post('/api/todos')
        .send(minimalTodo)

      expect(response.status).toBe(201)
      expect(response.body.data).toEqual(createdMinimalTodo)
    })

    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ description: 'No title' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should return 400 for invalid priority', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Test', priority: 'invalid' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should return 400 for invalid due_date', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Test', due_date: 'invalid-date' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/todos')
        .send(validTodoData)

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Failed to create todo')
    })
  })

  describe('PUT /api/todos/:id', () => {
    const existingTodo = {
      id: 1,
      title: 'Existing Todo',
      description: 'Existing Description',
      completed: false,
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    beforeEach(() => {
      mockPool.query.mockResolvedValueOnce({ rows: [existingTodo] }) // getTodoById
    })

    it('should update todo with valid data', async () => {
      const updateData = { title: 'Updated Todo', completed: true }
      const updatedTodo = { ...existingTodo, ...updateData }

      mockPool.query.mockResolvedValueOnce({ rows: [updatedTodo] }) // updateTodo

      const response = await request(app)
        .put('/api/todos/1')
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Todo updated successfully')
      expect(response.body.data).toEqual(updatedTodo)
    })

    it('should return 404 when todo not found', async () => {
      mockPool.query.mockReset()
      mockPool.query.mockResolvedValue({ rows: [] }) // getTodoById returns empty

      const response = await request(app)
        .put('/api/todos/999')
        .send({ title: 'Updated' })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Todo not found')
    })

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .put('/api/todos/invalid')
        .send({ title: 'Updated' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should return 400 for empty title', async () => {
      const response = await request(app)
        .put('/api/todos/1')
        .send({ title: '' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('DELETE /api/todos/:id', () => {
    const deletedTodo = {
      id: 1,
      title: 'Deleted Todo',
      description: 'Deleted Description',
      completed: false,
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    it('should delete existing todo', async () => {
      mockPool.query.mockResolvedValue({ rows: [deletedTodo] })

      const response = await request(app).delete('/api/todos/1')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Todo deleted successfully')
      expect(response.body.data).toEqual(deletedTodo)
    })

    it('should return 404 when todo not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).delete('/api/todos/999')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Todo not found')
    })

    it('should return 400 for invalid ID', async () => {
      const response = await request(app).delete('/api/todos/invalid')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('PATCH /api/todos/bulk-status', () => {
    const updatedTodos = [
      { id: 1, title: 'Todo 1', completed: true },
      { id: 2, title: 'Todo 2', completed: true }
    ]

    it('should bulk update todo status', async () => {
      mockPool.query.mockResolvedValue({ rows: updatedTodos })

      const response = await request(app)
        .patch('/api/todos/bulk-status')
        .send({ ids: [1, 2], completed: true })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Todos marked as completed successfully')
      expect(response.body.data).toEqual(updatedTodos)
      expect(response.body.meta).toEqual({
        requestedCount: 2,
        updatedCount: 2
      })
    })

    it('should return 400 for empty IDs array', async () => {
      const response = await request(app)
        .patch('/api/todos/bulk-status')
        .send({ ids: [], completed: true })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should return 400 for invalid IDs', async () => {
      const response = await request(app)
        .patch('/api/todos/bulk-status')
        .send({ ids: ['invalid'], completed: true })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('should return 400 for invalid completed value', async () => {
      const response = await request(app)
        .patch('/api/todos/bulk-status')
        .send({ ids: [1, 2], completed: 'invalid' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('DELETE /api/todos/completed', () => {
    const deletedTodos = [
      { id: 1, title: 'Completed Todo 1', completed: true },
      { id: 2, title: 'Completed Todo 2', completed: true }
    ]

    it('should delete all completed todos', async () => {
      mockPool.query.mockResolvedValue({ rows: deletedTodos })

      const response = await request(app).delete('/api/todos/completed')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Completed todos deleted successfully')
      expect(response.body.data).toEqual(deletedTodos)
      expect(response.body.meta).toEqual({
        deletedCount: 2
      })
    })

    it('should handle when no completed todos exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const response = await request(app).delete('/api/todos/completed')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual([])
      expect(response.body.meta.deletedCount).toBe(0)
    })
  })

  describe('404 Not Found', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/unknown')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Endpoint not found')
    })
  })
})