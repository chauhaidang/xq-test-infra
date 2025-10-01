const TodoService = require('../services/todoService')
const { body, param } = require('express-validator')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class TodoController {
  constructor() {
    this.todoService = new TodoService()
  }

  // Validation middleware
  static getValidationRules() {
    return {
      createTodo: [
        body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be 1-255 characters'),
        body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('Description must be a string up to 1000 characters'),
        body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
        body('due_date').optional().isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
        body('completed').optional().isBoolean().withMessage('Completed must be a boolean')
      ],
      updateTodo: [
        param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
        body('title').optional().isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title must be 1-255 characters'),
        body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('Description must be a string up to 1000 characters'),
        body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
        body('due_date').optional().isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
        body('completed').optional().isBoolean().withMessage('Completed must be a boolean')
      ],
      deleteTodo: [
        param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
      ],
      bulkUpdateStatus: [
        body('ids').isArray({ min: 1, max: 100 }).withMessage('IDs must be an array with 1-100 items'),
        body('ids.*').isInt({ min: 1 }).withMessage('Each ID must be a positive integer'),
        body('completed').isBoolean().withMessage('Completed must be a boolean')
      ]
    }
  }

  async createTodo(req, res) {
    try {
      const result = await this.todoService.createTodo(req.body)

      res.status(201).json({
        success: true,
        message: 'Todo created successfully',
        ...result
      })
    } catch (error) {
      logger.error('TodoController: Error in createTodo:', error)

      const statusCode = error.statusCode || 500
      const message = error.statusCode ? error.message : 'Failed to create todo'

      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  }

  async updateTodo(req, res) {
    try {
      const result = await this.todoService.updateTodo(req.params.id, req.body)

      res.status(200).json({
        success: true,
        message: 'Todo updated successfully',
        ...result
      })
    } catch (error) {
      logger.error(`TodoController: Error in updateTodo for id ${req.params.id}:`, error)

      const statusCode = error.statusCode || 500
      const message = error.statusCode ? error.message : 'Failed to update todo'

      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  }

  async deleteTodo(req, res) {
    try {
      const result = await this.todoService.deleteTodo(req.params.id)

      res.status(200).json({
        success: true,
        message: 'Todo deleted successfully',
        ...result
      })
    } catch (error) {
      logger.error(`TodoController: Error in deleteTodo for id ${req.params.id}:`, error)

      const statusCode = error.statusCode || 500
      const message = error.statusCode ? error.message : 'Failed to delete todo'

      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  }

  async bulkUpdateStatus(req, res) {
    try {
      const { ids, completed } = req.body
      const result = await this.todoService.bulkUpdateStatus(ids, completed)

      res.status(200).json({
        success: true,
        message: `Todos ${completed ? 'marked as completed' : 'marked as pending'} successfully`,
        ...result
      })
    } catch (error) {
      logger.error('TodoController: Error in bulkUpdateStatus:', error)

      const statusCode = error.statusCode || 500
      const message = error.statusCode ? error.message : 'Failed to bulk update todos'

      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  }

  async deleteCompletedTodos(req, res) {
    try {
      const result = await this.todoService.deleteCompletedTodos()

      res.status(200).json({
        success: true,
        message: 'Completed todos deleted successfully',
        ...result
      })
    } catch (error) {
      logger.error('TodoController: Error in deleteCompletedTodos:', error)

      res.status(500).json({
        success: false,
        message: 'Failed to delete completed todos',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    }
  }

  async healthCheck(req, res) {
    try {
      const dbConnection = require('../../shared/database')
      const health = await dbConnection.healthCheck()

      res.status(health.healthy ? 200 : 503).json({
        success: health.healthy,
        message: health.healthy ? 'Service is healthy' : 'Service is unhealthy',
        data: {
          service: 'todo-write-service',
          database: health,
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }
      })
    } catch (error) {
      logger.error('TodoController: Error in healthCheck:', error)

      res.status(503).json({
        success: false,
        message: 'Health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
      })
    }
  }
}

module.exports = TodoController