import { SocketProvider } from '@/contexts/socket'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PostHogProvider } from 'posthog-js/react'
import '@/assets/style/index.css'

// 添加全局錯誤處理
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('runtime.lastError')) {
    console.warn('Detected runtime.lastError - this is usually caused by browser extensions and can be safely ignored')
    event.preventDefault() // 阻止錯誤冒泡
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('runtime.lastError')) {
    console.warn('Detected runtime.lastError in promise rejection - this is usually caused by browser extensions and can be safely ignored')
    event.preventDefault() // 阻止錯誤冒泡
  }
})

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY

  root.render(
    <StrictMode>
      {posthogKey ? (
        <PostHogProvider apiKey={posthogKey} options={options}>
          <SocketProvider>
            <App />
          </SocketProvider>
        </PostHogProvider>
      ) : (
        <SocketProvider>
          <App />
        </SocketProvider>
      )}
    </StrictMode>
  )
}
