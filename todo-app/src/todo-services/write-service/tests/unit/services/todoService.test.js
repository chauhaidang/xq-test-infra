const TodoService = require('../../../src/services/todoService')
const TodoRepository = require('../../../src/repositories/todoRepository')

// Mock the repository
jest.mock('../../../src/repositories/todoRepository')

describe('TodoService', () => {
  let todoService
  let mockTodoRepository

  beforeEach(() => {
    mockTodoRepository = {
      createTodo: jest.fn(),
      updateTodo: jest.fn(),
      deleteTodo: jest.fn(),
      getTodoById: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      deleteCompletedTodos: jest.fn()
    }
    TodoRepository.mockImplementation(() => mockTodoRepository)
    todoService = new TodoService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createTodo', () => {
    it('should create todo with valid data', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        priority: 'high'
      }
      const createdTodo = { id: 1, ...todoData }

      mockTodoRepository.createTodo.mockResolvedValue(createdTodo)

      const result = await todoService.createTodo(todoData)

      expect(result).toEqual({ data: createdTodo })
      expect(mockTodoRepository.createTodo).toHaveBeenCalledWith({
        title: 'Test Todo',
        description: 'Test Description',
        priority: 'high',
        due_date: null,
        completed: false
      })
    })

    it('should throw error for missing title', async () => {
      const todoData = { description: 'Test Description' }

      await expect(todoService.createTodo(todoData)).rejects.toThrow('Title is required and must be a non-empty string')
    })

    it('should throw error for invalid priority', async () => {
      const todoData = { title: 'Test', priority: 'invalid' }

      await expect(todoService.createTodo(todoData)).rejects.toThrow('Priority must be one of: low, medium, high')
    })

    it('should throw error for invalid due_date', async () => {
      const todoData = { title: 'Test', due_date: 'invalid-date' }

      await expect(todoService.createTodo(todoData)).rejects.toThrow('Due date must be a valid date')
    })

    it('should sanitize input data', async () => {
      const todoData = {
        title: '  Test Todo  ',
        description: '  Test Description  ',
        completed: 'true'
      }
      const createdTodo = { id: 1, title: 'Test Todo', description: 'Test Description', completed: true }

      mockTodoRepository.createTodo.mockResolvedValue(createdTodo)

      await todoService.createTodo(todoData)

      expect(mockTodoRepository.createTodo).toHaveBeenCalledWith({
        title: 'Test Todo',
        description: 'Test Description',
        priority: 'medium',
        due_date: null,
        completed: true
      })
    })
  })

  describe('updateTodo', () => {
    const existingTodo = { id: 1, title: 'Existing Todo', completed: false }

    beforeEach(() => {
      mockTodoRepository.getTodoById.mockResolvedValue(existingTodo)
    })

    it('should update todo with valid data', async () => {
      const updateData = { title: 'Updated Todo', completed: true }
      const updatedTodo = { ...existingTodo, ...updateData }

      mockTodoRepository.updateTodo.mockResolvedValue(updatedTodo)

      const result = await todoService.updateTodo('1', updateData)

      expect(result).toEqual({ data: updatedTodo })
      expect(mockTodoRepository.updateTodo).toHaveBeenCalledWith(1, {
        title: 'Updated Todo',
        completed: true
      })
    })

    it('should throw error for invalid ID', async () => {
      await expect(todoService.updateTodo('invalid', {})).rejects.toThrow('Invalid todo ID provided')
    })

    it('should throw error when todo not found', async () => {
      mockTodoRepository.getTodoById.mockResolvedValue(null)

      await expect(todoService.updateTodo('999', { title: 'Test' })).rejects.toThrow('Todo not found')
    })

    it('should throw error for empty title', async () => {
      await expect(todoService.updateTodo('1', { title: '' })).rejects.toThrow('Title must be a non-empty string')
    })

    it('should throw error when no fields to update', async () => {
      await expect(todoService.updateTodo('1', {})).rejects.toThrow('No valid fields provided for update')
    })

    it('should handle due_date updates', async () => {
      const updateData = { due_date: '2024-12-31T23:59:59.000Z' }
      mockTodoRepository.updateTodo.mockResolvedValue(existingTodo)

      await todoService.updateTodo('1', updateData)

      expect(mockTodoRepository.updateTodo).toHaveBeenCalledWith(1, {
        due_date: '2024-12-31T23:59:59.000Z'
      })
    })

    it('should handle clearing due_date', async () => {
      const updateData = { due_date: null }
      mockTodoRepository.updateTodo.mockResolvedValue(existingTodo)

      await todoService.updateTodo('1', updateData)

      expect(mockTodoRepository.updateTodo).toHaveBeenCalledWith(1, {
        due_date: null
      })
    })
  })

  describe('deleteTodo', () => {
    it('should delete existing todo', async () => {
      const deletedTodo = { id: 1, title: 'Deleted Todo' }
      mockTodoRepository.deleteTodo.mockResolvedValue(deletedTodo)

      const result = await todoService.deleteTodo('1')

      expect(result).toEqual({ data: deletedTodo })
      expect(mockTodoRepository.deleteTodo).toHaveBeenCalledWith(1)
    })

    it('should throw error for invalid ID', async () => {
      await expect(todoService.deleteTodo('invalid')).rejects.toThrow('Invalid todo ID provided')
    })

    it('should throw error when todo not found', async () => {
      mockTodoRepository.deleteTodo.mockResolvedValue(null)

      await expect(todoService.deleteTodo('999')).rejects.toThrow('Todo not found')
    })
  })

  describe('bulkUpdateStatus', () => {
    it('should update multiple todos status', async () => {
      const ids = [1, 2, 3]
      const completed = true
      const updatedTodos = [
        { id: 1, title: 'Todo 1', completed: true },
        { id: 2, title: 'Todo 2', completed: true }
      ]

      mockTodoRepository.bulkUpdateStatus.mockResolvedValue(updatedTodos)

      const result = await todoService.bulkUpdateStatus(ids, completed)

      expect(result).toEqual({
        data: updatedTodos,
        meta: {
          requestedCount: 3,
          updatedCount: 2
        }
      })
      expect(mockTodoRepository.bulkUpdateStatus).toHaveBeenCalledWith([1, 2, 3], true)
    })

    it('should throw error for empty IDs array', async () => {
      await expect(todoService.bulkUpdateStatus([], true)).rejects.toThrow('IDs must be a non-empty array')
    })

    it('should throw error for invalid IDs', async () => {
      await expect(todoService.bulkUpdateStatus(['invalid', 1], true)).rejects.toThrow('All IDs must be valid integers')
    })

    it('should throw error for invalid completed status', async () => {
      await expect(todoService.bulkUpdateStatus([1, 2], 'invalid')).rejects.toThrow('Completed status must be a boolean')
    })
  })

  describe('deleteCompletedTodos', () => {
    it('should delete all completed todos', async () => {
      const deletedTodos = [
        { id: 1, title: 'Completed Todo 1', completed: true },
        { id: 2, title: 'Completed Todo 2', completed: true }
      ]

      mockTodoRepository.deleteCompletedTodos.mockResolvedValue(deletedTodos)

      const result = await todoService.deleteCompletedTodos()

      expect(result).toEqual({
        data: deletedTodos,
        meta: {
          deletedCount: 2
        }
      })
      expect(mockTodoRepository.deleteCompletedTodos).toHaveBeenCalled()
    })

    it('should handle when no completed todos exist', async () => {
      mockTodoRepository.deleteCompletedTodos.mockResolvedValue([])

      const result = await todoService.deleteCompletedTodos()

      expect(result).toEqual({
        data: [],
        meta: {
          deletedCount: 0
        }
      })
    })
  })
})