import React from 'react'
import { Outlet } from 'react-router-dom'
import './AuthLayout.less'

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-bg" />
      <div className="auth-content">
        <Outlet />
      </div>
    </div>
  )
}
