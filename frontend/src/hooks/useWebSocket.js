/**
 * Custom Hook for WebSocket Connection
 * Manages real-time job updates via Socket.IO
 */

import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:2000'

export const useWebSocket = (callbacks = {}) => {
  const { token } = useAuth()
  const socketRef = useRef(null)
  const callbacksRef = useRef(callbacks)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  // Update callbacks ref without triggering reconnect
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  // Initialize WebSocket connection (only once when token changes)
  useEffect(() => {
    if (!token) {
      return
    }

    console.log('🔌 Initializing WebSocket connection...')

    // Initialize Socket.IO connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    // Connection handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected')
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error('⚠️ WebSocket connection error:', err.message)
      setError(err.message)
      setIsConnected(false)
    })

    // Job event handlers - use callbacksRef to get latest callbacks
    socket.on('job:created', (job) => {
      console.log('📥 Job created:', job)
      callbacksRef.current.onJobCreated?.(job)
    })

    socket.on('job:status:updated', (data) => {
      console.log('🔄 Job status updated:', data)
      callbacksRef.current.onJobStatusUpdated?.(data)
    })

    socket.on('job:completed', (job) => {
      console.log('✅ Job completed:', job)
      callbacksRef.current.onJobCompleted?.(job)
    })

    socket.on('job:dlq', (job) => {
      console.log('❌ Job moved to DLQ:', job)
      callbacksRef.current.onJobMovedToDLQ?.(job)
    })

    socket.on('stats:update', (stats) => {
      console.log('📊 Stats updated:', stats)
      callbacksRef.current.onStatsUpdate?.(stats)
    })

    // Cleanup on unmount or token change
    return () => {
      console.log('🔌 Disconnecting WebSocket...')
      socket.off() // Remove all listeners
      socket.disconnect()
    }
  }, [token]) // Only reconnect when token changes!

  // Request stats update
  const requestStats = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request:stats')
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    error,
    requestStats,
  }
}

