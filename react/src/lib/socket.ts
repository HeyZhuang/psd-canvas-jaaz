import * as ISocket from '@/types/socket'
import { io, Socket } from 'socket.io-client'
import { eventBus } from './event'

export interface SocketConfig {
  serverUrl?: string
  autoConnect?: boolean
}

export class SocketIOManager {
  private socket: Socket | null = null
  private connected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3  // 減少重連次數
  private reconnectDelay = 2000  // 增加重連延遲
  private connectionTimeout = 10000  // 10秒連接超時

  constructor(private config: SocketConfig = {}) {
    if (config.autoConnect !== false) {
      this.connect()
    }
  }

  connect(serverUrl?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = serverUrl || this.config.serverUrl

      if (this.socket) {
        this.socket.disconnect()
      }

      // Socket.IO 連接配置 - 更保守的重連策略
      this.socket = io(url, {
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: this.connectionTimeout,
      })

      // 設置連接超時
      const connectTimeout = setTimeout(() => {
        if (!this.connected) {
          console.warn('⚠️ Socket.IO connection timeout (this is optional, app will continue)')
          reject(new Error('Connection timeout'))
        }
      }, this.connectionTimeout)

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout)
        console.log('✅ Socket.IO connected:', this.socket?.id)
        this.connected = true
        this.reconnectAttempts = 0
        resolve(true)
      })

      this.socket.on('connect_error', (error) => {
        this.connected = false
        this.reconnectAttempts++

        // 只在第一次失敗時記錄警告，避免控制台刷屏
        if (this.reconnectAttempts === 1) {
          console.warn('⚠️ Socket.IO connection error (app will continue without real-time features):', error.message)
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          clearTimeout(connectTimeout)
          // 不再顯示錯誤，因為 Socket.IO 是可選的
          reject(
            new Error(
              `Socket.IO unavailable after ${this.maxReconnectAttempts} attempts`
            )
          )
        }
      })

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason)
        this.connected = false
      })

      this.registerEventHandlers()
    })
  }

  private registerEventHandlers() {
    if (!this.socket) return

    this.socket.on('connected', (data) => {
      console.log('🔗 Socket.IO connection confirmed:', data)
    })

    this.socket.on('init_done', (data) => {
      console.log('🔗 Server initialization done:', data)
    })

    this.socket.on('session_update', (data) => {
      this.handleSessionUpdate(data)
    })

    this.socket.on('pong', (data) => {
      console.log('🔗 Pong received:', data)
    })
  }

  private handleSessionUpdate(data: ISocket.SessionUpdateEvent) {
    const { session_id, type } = data

    if (!session_id) {
      console.warn('⚠️ Session update missing session_id:', data)
      return
    }

    switch (type) {
      case ISocket.SessionEventType.Delta:
        eventBus.emit('Socket::Session::Delta', data)
        break
      case ISocket.SessionEventType.ToolCall:
        eventBus.emit('Socket::Session::ToolCall', data)
        break
      case ISocket.SessionEventType.ToolCallPendingConfirmation:
        eventBus.emit('Socket::Session::ToolCallPendingConfirmation', data)
        break
      case ISocket.SessionEventType.ToolCallConfirmed:
        eventBus.emit('Socket::Session::ToolCallConfirmed', data)
        break
      case ISocket.SessionEventType.ToolCallCancelled:
        eventBus.emit('Socket::Session::ToolCallCancelled', data)
        break
      case ISocket.SessionEventType.ToolCallArguments:
        eventBus.emit('Socket::Session::ToolCallArguments', data)
        break
      case ISocket.SessionEventType.ToolCallProgress:
        eventBus.emit('Socket::Session::ToolCallProgress', data)
        break
      case ISocket.SessionEventType.ImageGenerated:
        eventBus.emit('Socket::Session::ImageGenerated', data)
        break
      case ISocket.SessionEventType.VideoGenerated:
        eventBus.emit('Socket::Session::VideoGenerated', data)
        break
      case ISocket.SessionEventType.AllMessages:
        eventBus.emit('Socket::Session::AllMessages', data)
        break
      case ISocket.SessionEventType.Done:
        eventBus.emit('Socket::Session::Done', data)
        break
      case ISocket.SessionEventType.Error:
        eventBus.emit('Socket::Session::Error', data)
        break
      case ISocket.SessionEventType.Info:
        eventBus.emit('Socket::Session::Info', data)
        break
      case ISocket.SessionEventType.ToolCallResult:
        eventBus.emit('Socket::Session::ToolCallResult', data)
        break
      default:
        console.log('⚠️ Unknown session update type:', type)
    }
  }

  ping(data: unknown) {
    if (this.socket && this.connected) {
      this.socket.emit('ping', data)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      console.log('🔌 Socket.IO manually disconnected')
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  getSocket(): Socket | null {
    return this.socket
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }

  isMaxReconnectAttemptsReached(): boolean {
    return this.reconnectAttempts >= this.maxReconnectAttempts
  }
}
