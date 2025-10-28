import { SocketIOManager } from '@/lib/socket'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SocketContextType {
  connected: boolean
  socketId?: string
  connecting: boolean
  error?: string
  socketManager: SocketIOManager | null
}

const SocketContext = createContext<SocketContextType>({
  connected: false,
  connecting: false,
  socketManager: null,
})

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { t } = useTranslation()
  const [connected, setConnected] = useState(false)
  const [socketId, setSocketId] = useState<string>()
  const [connecting, setConnecting] = useState(false)  // 改為 false，Socket.IO 是可選的
  const [error, setError] = useState<string>()

  // Use useRef to maintain socket manager instance across re-renders
  const socketManagerRef = useRef<SocketIOManager | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeSocket = async () => {
      try {
        setConnecting(true)
        setError(undefined)

        // Create socket manager instance if not exists
        if (!socketManagerRef.current) {
          socketManagerRef.current = new SocketIOManager({
            serverUrl: process.env.NODE_ENV === 'development'
              ? 'http://localhost:57988'
              : window.location.origin,
            autoConnect: false
          })
        }

        const socketManager = socketManagerRef.current
        
        // 嘗試連接，但不阻塞應用運行
        try {
          await socketManager.connect()
          
          if (mounted) {
            setConnected(true)
            setSocketId(socketManager.getSocketId())
            setConnecting(false)
            console.log('🚀 Socket.IO initialized successfully')

            const socket = socketManager.getSocket()
            if (socket) {
              const handleConnect = () => {
                if (mounted) {
                  setConnected(true)
                  setSocketId(socketManager.getSocketId())
                  setConnecting(false)
                  setError(undefined)
                }
              }

              const handleDisconnect = () => {
                if (mounted) {
                  setConnected(false)
                  setSocketId(undefined)
                  setConnecting(false)
                }
              }

              const handleConnectError = (error: Error) => {
                if (mounted) {
                  // Socket.IO 連接失敗不應該阻塞應用
                  console.warn('⚠️ Socket.IO connection error (non-critical):', error.message)
                  setConnected(false)
                  setConnecting(false)
                }
              }

              socket.on('connect', handleConnect)
              socket.on('disconnect', handleDisconnect)
              socket.on('connect_error', handleConnectError)

              return () => {
                socket.off('connect', handleConnect)
                socket.off('disconnect', handleDisconnect)
                socket.off('connect_error', handleConnectError)
              }
            }
          }
        } catch (connectError) {
          // Socket.IO 連接失敗，但應用仍可繼續運行
          console.warn('⚠️ Socket.IO unavailable (app will continue without real-time features):', connectError)
          if (mounted) {
            setConnected(false)
            setConnecting(false)
            // 不設置 error，因為這不是致命錯誤
          }
        }
      } catch (err) {
        if (mounted) {
          // 只記錄警告，不顯示錯誤給用戶
          console.warn('⚠️ Socket.IO initialization failed (non-critical):', err)
          setConnected(false)
          setConnecting(false)
        }
      }
    }

    initializeSocket()

    return () => {
      mounted = false
      // Clean up socket connection when component unmounts
      if (socketManagerRef.current) {
        socketManagerRef.current.disconnect()
        socketManagerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    console.log('📢 Notification manager initialized')
  }, [])

  const value: SocketContextType = {
    connected,
    socketId,
    connecting,
    error,
    socketManager: socketManagerRef.current,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}

      {/* Socket.IO 錯誤不再顯示，因為它是可選功能 */}
      {/* 如果需要實時功能，請確保後端 Socket.IO 服務器正在運行 */}
    </SocketContext.Provider>
  )
}
