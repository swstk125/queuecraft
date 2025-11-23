import api from './api'

// Mock data for fallback when backend is unavailable
const mockJobs = [
  {
    _id: '1',
    name: 'Data Processing Job',
    ownerId: 'user-123',
    status: 'pending',
    retryCount: 0,
    con: new Date(Date.now() - 3600000).toISOString(),
    mon: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: '2',
    name: 'Email Campaign',
    ownerId: 'user-123',
    status: 'running',
    retryCount: 0,
    con: new Date(Date.now() - 7200000).toISOString(),
    mon: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    _id: '3',
    name: 'Report Generation',
    ownerId: 'user-123',
    status: 'completed',
    retryCount: 0,
    con: new Date(Date.now() - 86400000).toISOString(),
    mon: new Date(Date.now() - 82800000).toISOString(),
  },
  {
    _id: '4',
    name: 'Failed Import Job',
    ownerId: 'user-123',
    status: 'dlq',
    retryCount: 3,
    con: new Date(Date.now() - 172800000).toISOString(),
    mon: new Date(Date.now() - 169200000).toISOString(),
  },
  {
    _id: '5',
    name: 'Image Processing',
    ownerId: 'user-123',
    status: 'completed',
    retryCount: 1,
    con: new Date(Date.now() - 259200000).toISOString(),
    mon: new Date(Date.now() - 255600000).toISOString(),
  },
]

const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

/**
 * Fetch all jobs with optional filters
 * @param {Object} filters - Query parameters (status, etc.)
 * @returns {Promise<Array>} List of jobs
 */
export const getJobs = async (filters = {}) => {
  try {
    const response = await api.get('/job', { params: filters })
    return response.data.jobs || []
  } catch (error) {
    console.error('Error fetching jobs:', error)
    if (useMockData || error.code === 'ERR_NETWORK') {
      console.log('Using mock data for jobs')
      // Filter mock data based on status if provided
      if (filters.status) {
        return mockJobs.filter(job => job.status === filters.status)
      }
      return mockJobs
    }
    throw error
  }
}

/**
 * Get job statistics by status
 * @returns {Promise<Object>} Job counts by status
 */
export const getJobStats = async () => {
  try {
    const jobs = await getJobs()
    const stats = {
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'dlq').length,
      total: jobs.length,
    }
    return stats
  } catch (error) {
    console.error('Error fetching job stats:', error)
    if (useMockData || error.code === 'ERR_NETWORK') {
      return {
        pending: 1,
        running: 1,
        completed: 2,
        failed: 1,
        total: 5,
      }
    }
    throw error
  }
}

/**
 * Create a new job
 * @param {Object} jobData - Job creation payload
 * @returns {Promise<Object>} Created job
 */
export const createJob = async (jobData) => {
  try {
    const response = await api.post('/job/create', jobData)
    return response.data.job
  } catch (error) {
    console.error('Error creating job:', error)
    if (error.response?.status === 429) {
      throw new Error(error.response.data.error || 'Rate limit exceeded')
    }
    throw error
  }
}

/**
 * Get DLQ (Dead Letter Queue) jobs
 * @returns {Promise<Array>} List of failed jobs
 */
export const getDLQJobs = async () => {
  try {
    const response = await api.get('/job', { params: { status: 'dlq' } })
    return response.data.jobs || []
  } catch (error) {
    console.error('Error fetching DLQ jobs:', error)
    if (useMockData || error.code === 'ERR_NETWORK') {
      console.log('Using mock data for DLQ jobs')
      return mockJobs.filter(job => job.status === 'dlq')
    }
    throw error
  }
}

/**
 * Get a single job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job details
 */
export const getJobById = async (jobId) => {
  try {
    const jobs = await getJobs()
    const job = jobs.find(j => j._id === jobId)
    if (!job) {
      throw new Error('Job not found')
    }
    return job
  } catch (error) {
    console.error('Error fetching job:', error)
    if (useMockData || error.code === 'ERR_NETWORK') {
      const job = mockJobs.find(j => j._id === jobId)
      if (job) return job
    }
    throw error
  }
}

