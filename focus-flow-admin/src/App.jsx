import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Landing from '@/pages/Landing'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import Pricing from '@/pages/auth/Pricing'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Policy from '@/pages/Policy'
import Announcements from '@/pages/Announcements'
import Team from '@/pages/Team'
import Analytics from '@/pages/Analytics'
import Billing from '@/pages/Billing'
import Settings from '@/pages/Settings'
import NoAccess from '@/pages/NoAccess'

function ProtectedRoute() {
  const { user, userRole, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  // Only confirmed admins and managers may access the panel.
  // Employees AND unresolved (null) roles are sent to /no-access.
  if (userRole !== 'admin' && userRole !== 'manager') return <Navigate to="/no-access" replace />
  return <Layout />
}

// Restricts Policy, Billing, Settings to admin only — redirects managers to /dashboard
function AdminOnlyRoute() {
  const { userRole, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
  if (userRole === 'manager') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/no-access" element={<NoAccess />} />

        <Route path="/pricing" element={<Pricing />} />
        
        {/* Protected routes — all authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/team" element={<Team />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Admin-only routes — managers are redirected to /dashboard */}
          <Route element={<AdminOnlyRoute />}>
            <Route path="/policy" element={<Policy />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
