import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  onClick,
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend > 0) return <TrendingUp className="text-green-600" size={16} />
    if (trend < 0) return <TrendingDown className="text-red-600" size={16} />
    return <Minus className="text-gray-600" size={16} />
  }

  const getTrendText = () => {
    if (!trend) return null
    const absValue = Math.abs(trend)
    return (
      <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
        {trend > 0 ? '+' : ''}{absValue}%
      </span>
    )
  }

  return (
    <div
      className={`card hover:shadow-md transition-shadow duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon()}
              {getTrendText()}
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  )
}

export default SummaryCard

