const dbConnection = require('../../shared/database')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class TodoRepository {
    constructor() {
        this.db = dbConnection
    }

    async getAllTodos(filters = {}) {
        try {
            let query = 'SELECT * FROM todos'
            const params = []
            const conditions = []

            if (filters.completed !== undefined) {
                conditions.push(`completed = $${params.length + 1}`)
                params.push(filters.completed)
            }

            if (filters.priority) {
                conditions.push(`priority = $${params.length + 1}`)
                params.push(filters.priority)
            }

            if (filters.search) {
                conditions.push(`(title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`)
                params.push(`%${filters.search}%`)
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ')
            }

            query += ' ORDER BY created_at DESC'

            if (filters.limit) {
                query += ` LIMIT $${params.length + 1}`
                params.push(filters.limit)
            }

            if (filters.offset) {
                query += ` OFFSET $${params.length + 1}`
                params.push(filters.offset)
            }

            const pool = this.db.getPool()
            const result = await pool.query(query, params)

            return result.rows
        } catch (error) {
            logger.error('Error fetching todos:', error)
            throw new Error('Failed to fetch todos')
        }
    }

    async getTodoById(id) {
        try {
            const pool = this.db.getPool()
            const query = 'SELECT * FROM todos WHERE id = $1'
            const result = await pool.query(query, [id])

            return result.rows[0] || null
        } catch (error) {
            logger.error(`Error fetching todo with id ${id}:`, error)
            throw new Error('Failed to fetch todo')
        }
    }

    async getTodoCount(filters = {}) {
        try {
            let query = 'SELECT COUNT(*) as total FROM todos'
            const params = []
            const conditions = []

            if (filters.completed !== undefined) {
                conditions.push(`completed = $${params.length + 1}`)
                params.push(filters.completed)
            }

            if (filters.priority) {
                conditions.push(`priority = $${params.length + 1}`)
                params.push(filters.priority)
            }

            if (filters.search) {
                conditions.push(`(title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`)
                params.push(`%${filters.search}%`)
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ')
            }

            const pool = this.db.getPool()
            const result = await pool.query(query, params)

            return parseInt(result.rows[0].total)
        } catch (error) {
            logger.error('Error counting todos:', error)
            throw new Error('Failed to count todos')
        }
    }

    async getTodosByPriority() {
        try {
            const pool = this.db.getPool()
            const query = `
                SELECT priority, COUNT(*) as count
                FROM todos
                GROUP BY priority
                ORDER BY
                    CASE priority
                        WHEN 'high' THEN 1
                        WHEN 'medium' THEN 2
                        WHEN 'low' THEN 3
                    END
            `
            const result = await pool.query(query)

            return result.rows
        } catch (error) {
            logger.error('Error fetching todos by priority:', error)
            throw new Error('Failed to fetch todos by priority')
        }
    }
}

module.exports = TodoRepository