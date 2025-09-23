const TodoRepository = require('../repositories/todoRepository')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class TodoService {
    constructor() {
        this.todoRepository = new TodoRepository()
    }

    async getAllTodos(queryParams = {}) {
        try {
            const filters = this._buildFilters(queryParams)
            const todos = await this.todoRepository.getAllTodos(filters)

            if (queryParams.page && queryParams.limit) {
                const totalCount = await this.todoRepository.getTodoCount(filters)
                const totalPages = Math.ceil(totalCount / parseInt(queryParams.limit))

                return {
                    data: todos,
                    pagination: {
                        page: parseInt(queryParams.page),
                        limit: parseInt(queryParams.limit),
                        total: totalCount,
                        totalPages,
                        hasNext: parseInt(queryParams.page) < totalPages,
                        hasPrev: parseInt(queryParams.page) > 1
                    }
                }
            }

            return { data: todos }
        } catch (error) {
            logger.error('TodoService: Error getting all todos:', error)
            throw error
        }
    }

    async getTodoById(id) {
        try {
            if (!id || isNaN(parseInt(id))) {
                throw new Error('Invalid todo ID provided')
            }

            const todo = await this.todoRepository.getTodoById(parseInt(id))

            if (!todo) {
                const error = new Error('Todo not found')
                error.statusCode = 404
                throw error
            }

            return { data: todo }
        } catch (error) {
            logger.error(`TodoService: Error getting todo with id ${id}:`, error)
            throw error
        }
    }

    async getTodoStatistics() {
        try {
            const [totalCount, completedCount, priorityStats] = await Promise.all([
                this.todoRepository.getTodoCount(),
                this.todoRepository.getTodoCount({ completed: true }),
                this.todoRepository.getTodosByPriority()
            ])

            const pendingCount = totalCount - completedCount
            const completionRate = totalCount > 0 ? (completedCount / totalCount * 100).toFixed(2) : 0

            return {
                data: {
                    total: totalCount,
                    completed: completedCount,
                    pending: pendingCount,
                    completionRate: parseFloat(completionRate),
                    priorityBreakdown: priorityStats
                }
            }
        } catch (error) {
            logger.error('TodoService: Error getting todo statistics:', error)
            throw error
        }
    }

    _buildFilters(queryParams) {
        const filters = {}

        if (queryParams.completed !== undefined) {
            filters.completed = queryParams.completed === 'true'
        }

        if (queryParams.priority && ['low', 'medium', 'high'].includes(queryParams.priority)) {
            filters.priority = queryParams.priority
        }

        if (queryParams.search && typeof queryParams.search === 'string') {
            filters.search = queryParams.search.trim()
        }

        if (queryParams.limit && !isNaN(parseInt(queryParams.limit))) {
            filters.limit = Math.min(parseInt(queryParams.limit), 100) // Max 100 items per request
        }

        if (queryParams.page && !isNaN(parseInt(queryParams.page)) && filters.limit) {
            const page = Math.max(1, parseInt(queryParams.page))
            filters.offset = (page - 1) * filters.limit
        }

        return filters
    }
}

module.exports = TodoService