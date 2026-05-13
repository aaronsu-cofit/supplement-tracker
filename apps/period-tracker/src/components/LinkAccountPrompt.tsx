import { useCallback } from 'react'

interface LinkAccountPromptProps {
  onLinked?: () => void
}

export function LinkAccountPrompt({ onLinked: _onLinked }: LinkAccountPromptProps) {
  const handleLinkLine = useCallback(() => {
    // 準備 OAuth2 流程
    const state = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', state)
    sessionStorage.setItem('linking_mode', 'true')

    // 構建授權 URL
    const authUrl = new window.URL('/api/auth/oauth2/authorize', window.location.origin)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', 'period-tracker')
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/callback`)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', 'profile')

    // 導航到授權頁面
    window.location.href = authUrl.toString()
  }, [])

  return (
    <div
      style={{
        padding: '20px',
        margin: '20px 0',
        backgroundColor: '#f0f8ff',
        borderRadius: '8px',
        border: '1px solid #4169e1',
      }}
    >
      <h3>連結你的帳號</h3>
      <p>將你的 LINE 帳號與手機帳號連結，可以在任何地方查看經期記錄</p>
      <button
        onClick={handleLinkLine}
        style={{
          padding: '10px 20px',
          backgroundColor: '#00b900',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        連結 LINE
      </button>
    </div>
  )
}
