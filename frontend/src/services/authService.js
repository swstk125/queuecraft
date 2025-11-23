import api from './api'

/**
 * Login user and get JWT token
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} { success, jwt }
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/login', credentials)
    return response.data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Create a new user
 * @param {Object} userData - { username, email, password }
 * @returns {Promise<Object>} Created user
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/user/create', userData)
    return response.data
  } catch (error) {
    console.error('User creation error:', error)
    throw error
  }
}

/**
 * Check backend health
 * @returns {Promise<boolean>} Health status
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/sync')
    return response.status === 200
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}

