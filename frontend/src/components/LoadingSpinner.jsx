import { Loader } from 'lucide-react'

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader className="animate-spin text-primary-600 mb-3" size={sizes[size]} />
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  )
}

export default LoadingSpinner

