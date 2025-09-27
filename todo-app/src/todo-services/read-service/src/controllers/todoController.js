const TodoService = require('../services/todoService')
const { query, param } = require('express-validator')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class TodoController {
    constructor() {
        this.todoService = new TodoService()
    }

    // Validation middleware
    static getValidationRules() {
        return {
            getAllTodos: [
                query('completed').optional().isBoolean().withMessage('completed must be a boolean'),
                query('priority').optional().isIn(['low', 'medium', 'high']).withMessage('priority must be low, medium, or high'),
                query('search').optional().isString().isLength({ min: 1, max: 100 }).withMessage('search must be a string between 1-100 characters'),
                query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
                query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
            ],
            getTodoById: [
                param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')
            ]
        }
    }

    async getAllTodos(req, res) {
        try {
            const result = await this.todoService.getAllTodos(req.query)

            res.status(200).json({
                success: true,
                message: 'Todos retrieved successfully',
                ...result
            })
        } catch (error) {
            logger.error('TodoController: Error in getAllTodos:', error)

            res.status(500).json({
                success: false,
                message: 'Failed to retrieve todos',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            })
        }
    }

    async getTodoById(req, res) {
        try {
            const result = await this.todoService.getTodoById(req.params.id)

            res.status(200).json({
                success: true,
                message: 'Todo retrieved successfully',
                ...result
            })
        } catch (error) {
            logger.error(`TodoController: Error in getTodoById for id ${req.params.id}:`, error)

            const statusCode = error.statusCode || 500
            const message = error.statusCode === 404 ? error.message : 'Failed to retrieve todo'

            res.status(statusCode).json({
                success: false,
                message,
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            })
        }
    }

    async getTodoStatistics(req, res) {
        try {
            const result = await this.todoService.getTodoStatistics()

            res.status(200).json({
                success: true,
                message: 'Todo statistics retrieved successfully',
                ...result
            })
        } catch (error) {
            logger.error('TodoController: Error in getTodoStatistics:', error)

            res.status(500).json({
                success: false,
                message: 'Failed to retrieve todo statistics',
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
                    service: 'todo-read-service',
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