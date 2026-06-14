import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from '@arco-design/web-react'
import BasicLayout from '../layouts/BasicLayout'
import AuthLayout from '../layouts/AuthLayout'
import RequireAuth from './RequireAuth'

const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Delivery = lazy(() => import('../pages/Delivery'))
const Points = lazy(() => import('../pages/Points'))
const BinManagement = lazy(() => import('../pages/BinManagement'))
const Exchange = lazy(() => import('../pages/Exchange'))
const Achievement = lazy(() => import('../pages/Achievement'))
const CommunityDashboard = lazy(() => import('../pages/CommunityDashboard'))
const Inspection = lazy(() => import('../pages/Inspection'))
const Profile = lazy(() => import('../pages/Profile'))
const GreenPassCode = lazy(() => import('../pages/GreenPassCode'))
const PassCodeVerify = lazy(() => import('../pages/PassCodeVerify'))
const NotFound = lazy(() => import('../pages/NotFound'))

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size={40} />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
        <Route path="/" element={<RequireAuth><BasicLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="bins" element={<BinManagement />} />
          <Route path="passcode" element={<GreenPassCode />} />
          <Route path="verify" element={<PassCodeVerify />} />
          <Route path="points" element={<Points />} />
          <Route path="exchange" element={<Exchange />} />
          <Route path="achievement" element={<Achievement />} />
          <Route path="community" element={<CommunityDashboard />} />
          <Route path="inspection" element={<Inspection />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}
