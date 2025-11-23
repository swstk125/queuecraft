import { useState, useEffect } from 'react'
import { getJobs, getJobStats } from '../services/jobService'

/**
 * Custom hook for fetching and managing jobs
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRefresh - Enable auto-refresh
 * @param {number} options.refreshInterval - Refresh interval in milliseconds
 * @param {string} options.statusFilter - Filter jobs by status
 * @returns {Object} Jobs data and methods
 */
export const useJobs = (options = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    statusFilter = null,
  } = options

  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setError(null)
      const filters = statusFilter ? { status: statusFilter } : {}
      const [jobsData, statsData] = await Promise.all([
        getJobs(filters),
        getJobStats(),
      ])
      setJobs(jobsData)
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError(err.message || 'Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, statusFilter])

  return {
    jobs,
    stats,
    loading,
    error,
    refetch: fetchData,
  }
}

