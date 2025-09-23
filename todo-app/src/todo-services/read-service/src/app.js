const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const { logger } = require('@chauhaidang/xq-js-common-kit')

const TodoController = require('./controllers/todoController')
const { handleValidationErrors } = require('./middleware/validation')
const dbConnection = require('../shared/database')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    })
    next()
})

// Initialize controller
const todoController = new TodoController()

// Routes
app.get('/health', todoController.healthCheck.bind(todoController))

app.get('/api/todos',
    TodoController.getValidationRules().getAllTodos,
    handleValidationErrors,
    todoController.getAllTodos.bind(todoController)
)

app.get('/api/todos/statistics',
    todoController.getTodoStatistics.bind(todoController)
)

app.get('/api/todos/:id',
    TodoController.getValidationRules().getTodoById,
    handleValidationErrors,
    todoController.getTodoById.bind(todoController)
)

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    })
})

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error)

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`)

    global.server.close(async () => {
        logger.info('HTTP server closed')

        try {
            await dbConnection.disconnect()
            logger.info('Database connection closed')
            process.exit(0)
        } catch (error) {
            logger.error('Error during shutdown:', error)
            process.exit(1)
        }
    })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const startServer = async () => {
    try {
        await dbConnection.connect()
        logger.info('Database connected successfully')

        const server = app.listen(PORT, () => {
            logger.info(`Todo Read Service started on port ${PORT}`)
            logger.info(`Health check available at http://localhost:${PORT}/health`)
            logger.info(`API endpoints available at http://localhost:${PORT}/api/todos`)
        })

        // Make server available for graceful shutdown
        global.server = server

    } catch (error) {
        logger.error('Failed to start server:', error)
        process.exit(1)
    }
}

// Start the application
if (require.main === module) {
    startServer()
}

module.exports = app