import React from 'react'
import './AuthLayout.less'

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-bg" />
      <div className="auth-content">
        {children}
      </div>
    </div>
  )
}
