const { Pool } = require('pg')
const { logger } = require('@chauhaidang/xq-js-common-kit')

class DatabaseConnection {
  constructor() {
    this.pool = null
    this.isConnected = false
  }

  async connect() {
    if (this.isConnected) {
      return this.pool
    }

    const config = {
      user: process.env.DB_USER || 'todouser',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'todoapp',
      password: process.env.DB_PASSWORD || 'todopass',
      port: process.env.DB_PORT || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

    try {
      this.pool = new Pool(config)

      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err)
      })

      await this.pool.connect()
      this.isConnected = true
      logger.info('Database connected successfully')

      return this.pool
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end()
      this.isConnected = false
      logger.info('Database connection closed')
    }
  }

  getPool() {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.pool
  }

  async healthCheck() {
    try {
      const client = await this.pool.connect()
      const result = await client.query('SELECT NOW()')
      client.release()
      return { healthy: true, timestamp: result.rows[0].now }
    } catch (error) {
      logger.error('Database health check failed:', error)
      return { healthy: false, error: error.message }
    }
  }
}

const dbConnection = new DatabaseConnection()

module.exports = dbConnection