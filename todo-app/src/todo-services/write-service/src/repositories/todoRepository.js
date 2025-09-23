const dbConnection = require('../../shared/database')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class TodoRepository {
    constructor() {
        this.db = dbConnection
    }

    async createTodo(todoData) {
        try {
            const query = `
                INSERT INTO todos (title, description, priority, due_date, completed)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `

            const values = [
                todoData.title,
                todoData.description || null,
                todoData.priority || 'medium',
                todoData.due_date || null,
                todoData.completed || false
            ]

            const pool = this.db.getPool()
            const result = await pool.query(query, values)

            return result.rows[0]
        } catch (error) {
            logger.error('Error creating todo:', error)
            throw new Error('Failed to create todo')
        }
    }

    async updateTodo(id, todoData) {
        try {
            const fields = []
            const values = []
            let paramIndex = 1

            // Build dynamic update query
            if (todoData.title !== undefined) {
                fields.push(`title = $${paramIndex++}`)
                values.push(todoData.title)
            }

            if (todoData.description !== undefined) {
                fields.push(`description = $${paramIndex++}`)
                values.push(todoData.description)
            }

            if (todoData.priority !== undefined) {
                fields.push(`priority = $${paramIndex++}`)
                values.push(todoData.priority)
            }

            if (todoData.due_date !== undefined) {
                fields.push(`due_date = $${paramIndex++}`)
                values.push(todoData.due_date)
            }

            if (todoData.completed !== undefined) {
                fields.push(`completed = $${paramIndex++}`)
                values.push(todoData.completed)
            }

            if (fields.length === 0) {
                throw new Error('No fields to update')
            }

            // Always update the updated_at timestamp
            fields.push('updated_at = CURRENT_TIMESTAMP')

            const query = `
                UPDATE todos
                SET ${fields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `

            values.push(id)

            const pool = this.db.getPool()
            const result = await pool.query(query, values)

            return result.rows[0] || null
        } catch (error) {
            logger.error(`Error updating todo with id ${id}:`, error)
            throw new Error('Failed to update todo')
        }
    }

    async deleteTodo(id) {
        try {
            const query = 'DELETE FROM todos WHERE id = $1 RETURNING *'

            const pool = this.db.getPool()
            const result = await pool.query(query, [id])

            return result.rows[0] || null
        } catch (error) {
            logger.error(`Error deleting todo with id ${id}:`, error)
            throw new Error('Failed to delete todo')
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

    async bulkUpdateStatus(ids, completed) {
        try {
            const query = `
                UPDATE todos
                SET completed = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($2::int[])
                RETURNING *
            `

            const pool = this.db.getPool()
            const result = await pool.query(query, [completed, ids])

            return result.rows
        } catch (error) {
            logger.error('Error bulk updating todo status:', error)
            throw new Error('Failed to bulk update todos')
        }
    }

    async deleteCompletedTodos() {
        try {
            const query = 'DELETE FROM todos WHERE completed = true RETURNING *'

            const pool = this.db.getPool()
            const result = await pool.query(query)

            return result.rows
        } catch (error) {
            logger.error('Error deleting completed todos:', error)
            throw new Error('Failed to delete completed todos')
        }
    }
}

module.exports = TodoRepository