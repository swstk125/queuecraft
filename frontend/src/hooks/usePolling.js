/**
 * Custom Hook for Polling
 * Simple approach to fetch updates at regular intervals
 */

import { useEffect, useRef, useState } from 'react'

/**
 * Execute a callback at regular intervals
 * @param {Function} callback - Function to call at each interval
 * @param {number} interval - Interval in milliseconds (default: 5000)
 * @param {boolean} immediate - Call immediately on mount (default: true)
 */
export const usePolling = (callback, interval = 5000, immediate = true) => {
  const savedCallback = useRef()

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current?.()
    }

    // Call immediately if specified
    if (immediate) {
      tick()
    }

    const id = setInterval(tick, interval)
    return () => clearInterval(id)
  }, [interval, immediate])
}

/**
 * Smart polling that only polls when tab is visible
 * @param {Function} callback - Function to call at each interval
 * @param {number} interval - Interval in milliseconds (default: 5000)
 */
export const useSmartPolling = (callback, interval = 5000) => {
  const savedCallback = useRef()
  const [isVisible, setIsVisible] = useState(!document.hidden)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsVisible(visible)
      
      // Call immediately when tab becomes visible
      if (visible) {
        savedCallback.current?.()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Set up polling only when visible
  useEffect(() => {
    if (!isVisible) return

    savedCallback.current?.() // Initial call

    const id = setInterval(() => {
      savedCallback.current?.()
    }, interval)

    return () => clearInterval(id)
  }, [interval, isVisible])

  return { isVisible }
}

