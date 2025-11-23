import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
  Calendar,
  RotateCw,
  AlertTriangle,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { getJobById } from '../services/jobService'
import { formatDateTime, formatDistanceToNow } from '../utils/dateUtils'

const JobDetails = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJobDetails()
  }, [jobId])

  const fetchJobDetails = async () => {
    setLoading(true)
    setError('')
    try {
      const jobData = await getJobById(jobId)
      setJob(jobData)
    } catch (err) {
      console.error('Error fetching job details:', err)
      setError('Failed to load job details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
        </div>
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-gray-400" size={32} />
            <span className="ml-3 text-gray-600">Loading job details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
        </div>
        <div className="card bg-red-50 border-red-200">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto text-red-600 mb-4" size={48} />
            <p className="text-red-700 text-lg">{error || 'Job not found'}</p>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary mt-4"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {job.name || 'Unnamed Job'}
            </h1>
            <p className="text-gray-600 mt-1 font-mono text-sm">
              ID: {job._id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} size="lg" />
          <button
            onClick={fetchJobDetails}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Warning for DLQ */}
      {job.status === 'dlq' && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-900 font-semibold mb-1">
                Job Failed After Retries
              </h3>
              <p className="text-red-700 text-sm">
                This job has failed {job.retryCount} times and has been moved to
                the Dead Letter Queue. Manual intervention may be required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                <Clock size={16} />
                Status
              </label>
              <StatusBadge status={job.status} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                <User size={16} />
                Owner ID
              </label>
              <p className="text-sm text-gray-900 font-mono">{job.ownerId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                <RotateCw size={16} />
                Retry Count
              </label>
              <p className="text-sm text-gray-900">
                {job.retryCount}{' '}
                <span className="text-gray-500">/ 3 attempts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Timestamps
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                <Calendar size={16} />
                Created At
              </label>
              <p className="text-sm text-gray-900">{formatDateTime(job.con)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(job.con)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                <Calendar size={16} />
                Last Modified
              </label>
              <p className="text-sm text-gray-900">{formatDateTime(job.mon)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(job.mon)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Job Data */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Raw Job Data
        </h2>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100 font-mono">
            {JSON.stringify(job, null, 2)}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="card bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Dashboard
          </button>
          {job.status === 'dlq' && (
            <button onClick={() => navigate('/dlq')} className="btn-secondary">
              View All DLQ Jobs
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobDetails

