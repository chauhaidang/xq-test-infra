const axios = require('axios')

// Read Service Client (port 3001)
const readClient = axios.create({
  baseURL: process.env.READ_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Write Service Client (port 3002)
const writeClient = axios.create({
  baseURL: process.env.WRITE_SERVICE_URL || 'http://localhost:3002',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response interceptors for better error handling
const setupResponseInterceptor = (client, serviceName) => {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`${serviceName} is not running or not accessible`)
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error(`${serviceName} hostname not found`)
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`${serviceName} request timed out`)
      }
      throw error
    }
  )
}

setupResponseInterceptor(readClient, 'Read Service')
setupResponseInterceptor(writeClient, 'Write Service')

// Request interceptors for logging in verbose mode
if (process.env.VERBOSE_HTTP === 'true') {
  const setupRequestInterceptor = (client, serviceName) => {
    client.interceptors.request.use((config) => {
      console.log(`🌐 ${serviceName}: ${config.method?.toUpperCase()} ${config.url}`)
      if (config.data) {
        console.log('   📦 Body:', JSON.stringify(config.data, null, 2))
      }
      return config
    })
  }

  setupRequestInterceptor(readClient, 'READ')
  setupRequestInterceptor(writeClient, 'WRITE')
}

module.exports = {
  readClient,
  writeClient
}