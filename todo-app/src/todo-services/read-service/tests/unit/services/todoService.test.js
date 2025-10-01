const TodoService = require('../../../src/services/todoService')
const TodoRepository = require('../../../src/repositories/todoRepository')

// Mock the repository
jest.mock('../../../src/repositories/todoRepository')

describe('TodoService', () => {
  let todoService
  let mockTodoRepository

  beforeEach(() => {
    mockTodoRepository = {
      getAllTodos: jest.fn(),
      getTodoCount: jest.fn(),
      getTodoById: jest.fn(),
      getTodosByPriority: jest.fn()
    }
    TodoRepository.mockImplementation(() => mockTodoRepository)
    todoService = new TodoService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllTodos', () => {
    const mockTodos = [
      { id: 1, title: 'Test Todo 1', completed: false, priority: 'high' },
      { id: 2, title: 'Test Todo 2', completed: true, priority: 'medium' }
    ]

    it('should return todos without pagination', async () => {
      mockTodoRepository.getAllTodos.mockResolvedValue(mockTodos)

      const result = await todoService.getAllTodos({})

      expect(result).toEqual({ data: mockTodos })
      expect(mockTodoRepository.getAllTodos).toHaveBeenCalledWith({})
    })

    it('should return todos with pagination', async () => {
      const queryParams = { page: '1', limit: '10' }
      mockTodoRepository.getAllTodos.mockResolvedValue(mockTodos)
      mockTodoRepository.getTodoCount.mockResolvedValue(25)

      const result = await todoService.getAllTodos(queryParams)

      expect(result).toEqual({
        data: mockTodos,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      })
    })

    it('should build filters correctly', async () => {
      const queryParams = {
        completed: 'true',
        priority: 'high',
        search: 'test',
        limit: '5',
        page: '2'
      }

      mockTodoRepository.getAllTodos.mockResolvedValue([])

      await todoService.getAllTodos(queryParams)

      expect(mockTodoRepository.getAllTodos).toHaveBeenCalledWith({
        completed: true,
        priority: 'high',
        search: 'test',
        limit: 5,
        offset: 5
      })
    })

    it('should handle repository errors', async () => {
      const error = new Error('Database error')
      mockTodoRepository.getAllTodos.mockRejectedValue(error)

      await expect(todoService.getAllTodos({})).rejects.toThrow('Database error')
    })
  })

  describe('getTodoById', () => {
    it('should return todo when found', async () => {
      const mockTodo = { id: 1, title: 'Test Todo', completed: false }
      mockTodoRepository.getTodoById.mockResolvedValue(mockTodo)

      const result = await todoService.getTodoById('1')

      expect(result).toEqual({ data: mockTodo })
      expect(mockTodoRepository.getTodoById).toHaveBeenCalledWith(1)
    })

    it('should throw 404 error when todo not found', async () => {
      mockTodoRepository.getTodoById.mockResolvedValue(null)

      await expect(todoService.getTodoById('999')).rejects.toThrow('Todo not found')
    })

    it('should throw error for invalid ID', async () => {
      await expect(todoService.getTodoById('invalid')).rejects.toThrow('Invalid todo ID provided')
    })
  })

  describe('getTodoStatistics', () => {
    it('should return correct statistics', async () => {
      mockTodoRepository.getTodoCount.mockResolvedValueOnce(10) // total
      mockTodoRepository.getTodoCount.mockResolvedValueOnce(6)  // completed
      mockTodoRepository.getTodosByPriority.mockResolvedValue([
        { priority: 'high', count: '3' },
        { priority: 'medium', count: '5' },
        { priority: 'low', count: '2' }
      ])

      const result = await todoService.getTodoStatistics()

      expect(result).toEqual({
        data: {
          total: 10,
          completed: 6,
          pending: 4,
          completionRate: 60.00,
          priorityBreakdown: [
            { priority: 'high', count: '3' },
            { priority: 'medium', count: '5' },
            { priority: 'low', count: '2' }
          ]
        }
      })
    })

    it('should handle zero todos', async () => {
      mockTodoRepository.getTodoCount.mockResolvedValue(0)
      mockTodoRepository.getTodosByPriority.mockResolvedValue([])

      const result = await todoService.getTodoStatistics()

      expect(result.data.completionRate).toBe(0)
      expect(result.data.total).toBe(0)
      expect(result.data.completed).toBe(0)
      expect(result.data.pending).toBe(0)
    })
  })

  describe('_buildFilters', () => {
    it('should build filters correctly with all parameters', () => {
      const queryParams = {
        completed: 'true',
        priority: 'high',
        search: '  test search  ',
        limit: '50',
        page: '3'
      }

      const filters = todoService._buildFilters(queryParams)

      expect(filters).toEqual({
        completed: true,
        priority: 'high',
        search: 'test search',
        limit: 50,
        offset: 100
      })
    })

    it('should handle invalid priority', () => {
      const queryParams = { priority: 'invalid' }
      const filters = todoService._buildFilters(queryParams)
      expect(filters.priority).toBeUndefined()
    })

    it('should limit max items per request', () => {
      const queryParams = { limit: '200' }
      const filters = todoService._buildFilters(queryParams)
      expect(filters.limit).toBe(100)
    })

    it('should handle invalid page numbers', () => {
      const queryParams = { page: '0', limit: '10' }
      const filters = todoService._buildFilters(queryParams)
      expect(filters.offset).toBe(0) // page 1
    })
  })
})