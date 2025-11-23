import { useState } from 'react'
import { AlertCircle, Eye, X } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDistanceToNow, formatDateTime } from '../utils/dateUtils'

const DLQTable = ({ jobs, onRetry }) => {
  const [selectedJob, setSelectedJob] = useState(null)

  if (jobs.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No failed jobs in DLQ</p>
          <p className="text-gray-400 text-sm mt-2">
            Jobs that fail after 3 retries will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retry Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Failed At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {job.name || 'Unnamed Job'}
                    </div>
                    <div className="text-xs text-gray-500">ID: {job._id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={job.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">
                      {job.retryCount}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">/ 3</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDistanceToNow(job.mon)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(job.mon)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1 mr-3"
                    >
                      <Eye size={16} />
                      Details
                    </button>
                    {onRetry && (
                      <button
                        onClick={() => onRetry(job)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Job Details
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Job ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono">
                    {selectedJob._id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Job Name
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedJob.name || 'Unnamed Job'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={selectedJob.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Owner ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono">
                    {selectedJob.ownerId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Retry Count
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedJob.retryCount} / 3
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(selectedJob.con)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(selectedJob.con)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Modified
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(selectedJob.mon)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(selectedJob.mon)}
                  </p>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedJob(null)}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DLQTable

