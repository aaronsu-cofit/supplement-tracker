import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'

export function OAuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'linking' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')

        if (!code || !state) {
          setStatus('error')
          setErrorMessage('Missing authorization code or state')
          return
        }

        // 驗證 CSRF token
        const savedState = sessionStorage.getItem('oauth_state')
        if (state !== savedState) {
          setStatus('error')
          setErrorMessage('CSRF token mismatch')
          return
        }

        // Step 1: 交換 authorization code 為 access token
        const tokenResponse = await fetch('/api/auth/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            client_id: 'period-tracker',
          }),
        })

        if (!tokenResponse.ok) {
          setStatus('error')
          setErrorMessage('Failed to exchange authorization code')
          return
        }

        const { access_token: lineAccessToken } = await tokenResponse.json()

        // Step 2: 檢查是否在連結模式
        const isLinking = sessionStorage.getItem('linking_mode') === 'true'

        if (isLinking) {
          setStatus('linking')

          // 自動連結 Mobile 和 LINE 帳號
          const linkResponse = await fetch('/api/auth/auto-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiClient.getAccessToken()}`,
            },
            body: JSON.stringify({
              mobileClientId: apiClient.getClientId(),
              lineAccessToken,
            }),
          })

          if (!linkResponse.ok) {
            setStatus('error')
            setErrorMessage('Failed to link accounts')
            return
          }

          // 清除連結模式標誌
          sessionStorage.removeItem('oauth_state')
          sessionStorage.removeItem('linking_mode')
        } else {
          // 不在連結模式，直接設置新的 token
          apiClient.setToken(lineAccessToken)

          // 清除 state
          sessionStorage.removeItem('oauth_state')
        }

        // Step 3: 導向回主頁
        setTimeout(() => {
          navigate('/')
        }, 500)
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setErrorMessage('An error occurred during OAuth callback')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      {status === 'processing' && (
        <>
          <h2>授權中...</h2>
          <p>正在處理您的授權請求</p>
        </>
      )}
      {status === 'linking' && (
        <>
          <h2>連結帳號中...</h2>
          <p>正在連結您的 LINE 帳號和手機帳號</p>
        </>
      )}
      {status === 'error' && (
        <>
          <h2>錯誤</h2>
          <p>{errorMessage}</p>
          <button onClick={() => (window.location.href = '/')}>返回首頁</button>
        </>
      )}
    </div>
  )
}
