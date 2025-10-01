const TodoRepository = require('../repositories/todoRepository')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class TodoService {
  constructor() {
    this.todoRepository = new TodoRepository()
  }

  async createTodo(todoData) {
    try {
      // Validate required fields
      if (!todoData.title || typeof todoData.title !== 'string' || todoData.title.trim().length === 0) {
        const error = new Error('Title is required and must be a non-empty string')
        error.statusCode = 400
        throw error
      }

      // Validate priority if provided
      if (todoData.priority && !['low', 'medium', 'high'].includes(todoData.priority)) {
        const error = new Error('Priority must be one of: low, medium, high')
        error.statusCode = 400
        throw error
      }

      // Validate due_date if provided
      if (todoData.due_date) {
        const dueDate = new Date(todoData.due_date)
        if (isNaN(dueDate.getTime())) {
          const error = new Error('Due date must be a valid date')
          error.statusCode = 400
          throw error
        }
        todoData.due_date = dueDate.toISOString()
      }

      // Sanitize input
      const sanitizedData = {
        title: todoData.title.trim(),
        description: todoData.description ? todoData.description.trim() : null,
        priority: todoData.priority || 'medium',
        due_date: todoData.due_date || null,
        completed: Boolean(todoData.completed)
      }

      const todo = await this.todoRepository.createTodo(sanitizedData)

      return { data: todo }
    } catch (error) {
      logger.error('TodoService: Error creating todo:', error)
      throw error
    }
  }

  async updateTodo(id, todoData) {
    try {
      if (!id || isNaN(parseInt(id))) {
        const error = new Error('Invalid todo ID provided')
        error.statusCode = 400
        throw error
      }

      // Check if todo exists
      const existingTodo = await this.todoRepository.getTodoById(parseInt(id))
      if (!existingTodo) {
        const error = new Error('Todo not found')
        error.statusCode = 404
        throw error
      }

      // Validate fields if provided
      const updateData = {}

      if (todoData.title !== undefined) {
        if (typeof todoData.title !== 'string' || todoData.title.trim().length === 0) {
          const error = new Error('Title must be a non-empty string')
          error.statusCode = 400
          throw error
        }
        updateData.title = todoData.title.trim()
      }

      if (todoData.description !== undefined) {
        updateData.description = todoData.description ? todoData.description.trim() : null
      }

      if (todoData.priority !== undefined) {
        if (!['low', 'medium', 'high'].includes(todoData.priority)) {
          const error = new Error('Priority must be one of: low, medium, high')
          error.statusCode = 400
          throw error
        }
        updateData.priority = todoData.priority
      }

      if (todoData.due_date !== undefined) {
        if (todoData.due_date) {
          const dueDate = new Date(todoData.due_date)
          if (isNaN(dueDate.getTime())) {
            const error = new Error('Due date must be a valid date')
            error.statusCode = 400
            throw error
          }
          updateData.due_date = dueDate.toISOString()
        } else {
          updateData.due_date = null
        }
      }

      if (todoData.completed !== undefined) {
        updateData.completed = Boolean(todoData.completed)
      }

      if (Object.keys(updateData).length === 0) {
        const error = new Error('No valid fields provided for update')
        error.statusCode = 400
        throw error
      }

      const updatedTodo = await this.todoRepository.updateTodo(parseInt(id), updateData)

      return { data: updatedTodo }
    } catch (error) {
      logger.error(`TodoService: Error updating todo with id ${id}:`, error)
      throw error
    }
  }

  async deleteTodo(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        const error = new Error('Invalid todo ID provided')
        error.statusCode = 400
        throw error
      }

      const deletedTodo = await this.todoRepository.deleteTodo(parseInt(id))

      if (!deletedTodo) {
        const error = new Error('Todo not found')
        error.statusCode = 404
        throw error
      }

      return { data: deletedTodo }
    } catch (error) {
      logger.error(`TodoService: Error deleting todo with id ${id}:`, error)
      throw error
    }
  }

  async bulkUpdateStatus(ids, completed) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        const error = new Error('IDs must be a non-empty array')
        error.statusCode = 400
        throw error
      }

      // Validate all IDs are integers
      const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id))
      if (validIds.length !== ids.length) {
        const error = new Error('All IDs must be valid integers')
        error.statusCode = 400
        throw error
      }

      if (typeof completed !== 'boolean') {
        const error = new Error('Completed status must be a boolean')
        error.statusCode = 400
        throw error
      }

      const updatedTodos = await this.todoRepository.bulkUpdateStatus(validIds, completed)

      return {
        data: updatedTodos,
        meta: {
          requestedCount: validIds.length,
          updatedCount: updatedTodos.length
        }
      }
    } catch (error) {
      logger.error('TodoService: Error bulk updating todo status:', error)
      throw error
    }
  }

  async deleteCompletedTodos() {
    try {
      const deletedTodos = await this.todoRepository.deleteCompletedTodos()

      return {
        data: deletedTodos,
        meta: {
          deletedCount: deletedTodos.length
        }
      }
    } catch (error) {
      logger.error('TodoService: Error deleting completed todos:', error)
      throw error
    }
  }
}

module.exports = TodoService