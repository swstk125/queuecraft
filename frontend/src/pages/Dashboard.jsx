import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Loader,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Filter,
} from 'lucide-react'
import SummaryCard from '../components/SummaryCard'
import JobTable from '../components/JobTable'
import StatusBadge from '../components/StatusBadge'
import { getJobs, getJobStats, createJob } from '../services/jobService'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: 0,
  })
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newJobName, setNewJobName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredJobs(jobs)
    } else {
      setFilteredJobs(jobs.filter((job) => job.status === statusFilter))
    }
  }, [statusFilter, jobs])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [jobsData, statsData] = await Promise.all([
        getJobs(),
        getJobStats(),
      ])
      setJobs(jobsData)
      setFilteredJobs(jobsData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    try {
      await createJob({ name: newJobName })
      setShowCreateModal(false)
      setNewJobName('')
      fetchData() // Refresh data
    } catch (error) {
      console.error('Error creating job:', error)
      setCreateError(error.message || 'Failed to create job')
    } finally {
      setCreating(false)
    }
  }

  const summaryCards = [
    {
      title: 'Pending Jobs',
      value: stats.pending,
      icon: Clock,
      color: 'yellow',
      status: 'pending',
    },
    {
      title: 'Running Jobs',
      value: stats.running,
      icon: Loader,
      color: 'blue',
      status: 'running',
    },
    {
      title: 'Completed Jobs',
      value: stats.completed,
      icon: CheckCircle,
      color: 'green',
      status: 'completed',
    },
    {
      title: 'Failed Jobs',
      value: stats.failed,
      icon: XCircle,
      color: 'red',
      status: 'dlq',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage your job queue
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Create Job
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.title}
            {...card}
            onClick={() => {
              if (card.status === 'dlq') {
                navigate('/dlq')
              } else {
                setStatusFilter(card.status)
              }
            }}
          />
        ))}
      </div>

      {/* Jobs Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">All Jobs</h2>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              {['pending', 'running', 'completed', 'dlq'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <StatusBadge status={status} showIcon={false} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <JobTable jobs={filteredJobs} loading={loading} onRefresh={fetchData} />
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Job
              </h3>
            </div>
            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label
                  htmlFor="jobName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Job Name
                </label>
                <input
                  type="text"
                  id="jobName"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Enter job name"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewJobName('')
                    setCreateError('')
                  }}
                  className="flex-1 btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

