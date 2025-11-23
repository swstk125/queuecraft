import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import DLQTable from '../components/DLQTable'
import { getDLQJobs } from '../services/jobService'

const DLQViewer = () => {
  const navigate = useNavigate()
  const [dlqJobs, setDlqJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDLQJobs()
  }, [])

  const fetchDLQJobs = async () => {
    setLoading(true)
    setError('')
    try {
      const jobs = await getDLQJobs()
      setDlqJobs(jobs)
    } catch (err) {
      console.error('Error fetching DLQ jobs:', err)
      setError('Failed to load DLQ jobs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dead Letter Queue
                </h1>
                <p className="text-gray-600 mt-1">
                  Jobs that failed after 3 retry attempts
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={fetchDLQJobs}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="card bg-red-50 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">
              Total Failed Jobs
            </p>
            <p className="text-4xl font-bold text-red-600">{dlqJobs.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-red-700">
              These jobs require manual intervention
            </p>
            <p className="text-xs text-red-600 mt-1">
              Review the details to diagnose issues
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* DLQ Table */}
      {loading ? (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-gray-400" size={32} />
            <span className="ml-3 text-gray-600">Loading DLQ jobs...</span>
          </div>
        </div>
      ) : (
        <DLQTable jobs={dlqJobs} />
      )}

      {/* Info Panel */}
      {dlqJobs.length > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            About the DLQ
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              • Jobs are moved to the DLQ after failing 3 retry attempts
            </p>
            <p>
              • Review job details to identify the root cause of failures
            </p>
            <p>
              • Fix the underlying issues before retrying or recreating jobs
            </p>
            <p>
              • Consider monitoring patterns in DLQ entries to prevent future
              failures
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DLQViewer

