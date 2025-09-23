const request = require('supertest')
const app = require('../../src/app')
const dbConnection = require('../shared/database')

// Mock database connection
jest.mock('../shared/database')

describe('Todo Read Service Integration Tests', () => {
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
            expect(response.body.data.service).toBe('todo-read-service')
        })

        it('should return 503 when database is unhealthy', async () => {
            dbConnection.healthCheck.mockResolvedValue({ healthy: false, error: 'Connection failed' })

            const response = await request(app).get('/health')

            expect(response.status).toBe(503)
            expect(response.body.success).toBe(false)
        })
    })

    describe('GET /api/todos', () => {
        const mockTodos = [
            {
                id: 1,
                title: 'Test Todo 1',
                description: 'Test Description 1',
                completed: false,
                priority: 'high',
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Test Todo 2',
                description: 'Test Description 2',
                completed: true,
                priority: 'medium',
                created_at: new Date().toISOString()
            }
        ]

        it('should return all todos without pagination', async () => {
            mockPool.query.mockResolvedValue({ rows: mockTodos })

            const response = await request(app).get('/api/todos')

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data).toEqual(mockTodos)
            expect(response.body.pagination).toBeUndefined()
        })

        it('should return todos with pagination', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [mockTodos[0]] }) // todos
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '10' }] }) // count

            const response = await request(app)
                .get('/api/todos')
                .query({ page: 1, limit: 1 })

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data).toEqual([mockTodos[0]])
            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 1,
                total: 10,
                totalPages: 10,
                hasNext: true,
                hasPrev: false
            })
        })

        it('should filter todos by completed status', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockTodos[1]] })

            const response = await request(app)
                .get('/api/todos')
                .query({ completed: true })

            expect(response.status).toBe(200)
            expect(response.body.data).toEqual([mockTodos[1]])
        })

        it('should filter todos by priority', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockTodos[0]] })

            const response = await request(app)
                .get('/api/todos')
                .query({ priority: 'high' })

            expect(response.status).toBe(200)
            expect(response.body.data).toEqual([mockTodos[0]])
        })

        it('should search todos by title/description', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockTodos[0]] })

            const response = await request(app)
                .get('/api/todos')
                .query({ search: 'Test Todo 1' })

            expect(response.status).toBe(200)
            expect(response.body.data).toEqual([mockTodos[0]])
        })

        it('should return 400 for invalid query parameters', async () => {
            const response = await request(app)
                .get('/api/todos')
                .query({ completed: 'invalid', priority: 'invalid', page: -1 })

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.errors).toBeDefined()
        })

        it('should handle database errors', async () => {
            mockPool.query.mockRejectedValue(new Error('Database connection failed'))

            const response = await request(app).get('/api/todos')

            expect(response.status).toBe(500)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe('Failed to retrieve todos')
        })
    })

    describe('GET /api/todos/:id', () => {
        const mockTodo = {
            id: 1,
            title: 'Test Todo',
            description: 'Test Description',
            completed: false,
            priority: 'high',
            created_at: new Date().toISOString()
        }

        it('should return todo by ID', async () => {
            mockPool.query.mockResolvedValue({ rows: [mockTodo] })

            const response = await request(app).get('/api/todos/1')

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data).toEqual(mockTodo)
        })

        it('should return 404 when todo not found', async () => {
            mockPool.query.mockResolvedValue({ rows: [] })

            const response = await request(app).get('/api/todos/999')

            expect(response.status).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe('Todo not found')
        })

        it('should return 400 for invalid ID', async () => {
            const response = await request(app).get('/api/todos/invalid')

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.errors).toBeDefined()
        })
    })

    describe('GET /api/todos/statistics', () => {
        it('should return todo statistics', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '10' }] }) // total count
            mockPool.query.mockResolvedValueOnce({ rows: [{ total: '6' }] }) // completed count
            mockPool.query.mockResolvedValueOnce({ // priority breakdown
                rows: [
                    { priority: 'high', count: '3' },
                    { priority: 'medium', count: '5' },
                    { priority: 'low', count: '2' }
                ]
            })

            const response = await request(app).get('/api/todos/statistics')

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data).toEqual({
                total: 10,
                completed: 6,
                pending: 4,
                completionRate: 60.00,
                priorityBreakdown: [
                    { priority: 'high', count: '3' },
                    { priority: 'medium', count: '5' },
                    { priority: 'low', count: '2' }
                ]
            })
        })

        it('should handle database errors', async () => {
            mockPool.query.mockRejectedValue(new Error('Database error'))

            const response = await request(app).get('/api/todos/statistics')

            expect(response.status).toBe(500)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toBe('Failed to retrieve todo statistics')
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