import React from 'react'

interface LoginViewProps {
  onLogin: () => void
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  return (
    <div id="login-page">
      <div className="login-container">
        <div className="ob-badge">
          <img src="/assets/icons/logo icon.png" alt="Logo" />
        </div>
        <div className="login-title">歡迎回來</div>
        <div className="login-desc">請登入以繼續使用週期追蹤服務</div>
        <button className="line-login-btn" onClick={onLogin}>
          <span style={{ fontSize: '20px' }}>LINE</span> 使用 LINE 登入
        </button>
      </div>
    </div>
  )
}
