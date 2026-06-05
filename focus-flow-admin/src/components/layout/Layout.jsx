import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import PaymentRequired from '@/pages/PaymentRequired'
import { useAuth } from '@/hooks/useAuth'
import { Toaster } from 'sonner'

export default function Layout() {
  const { org, subStatus } = useAuth()
  const loc = useLocation()
  const onBilling = loc.pathname === '/billing'

  // Gate: a locked org (trial expired, not subscribed) blocks everyone —
  // EXCEPT /billing, so a returning Stripe payment can render & be processed.
  if (org && subStatus?.expired && !onBilling) {
    return <PaymentRequired />
  }

  // Pending users must complete payment before accessing the dashboard
  if (org && subStatus?.pending && !onBilling && loc.pathname !== '/pricing') {
    return <Navigate to="/billing" replace />
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Atmospheric background — same depth as login page */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 rounded-full bg-violet-600/6 blur-[100px]" />
        <div className="absolute bottom-20 right-1/3 w-72 h-72 rounded-full bg-cyan-600/5 blur-[90px]" />
      </div>

      <Sidebar />
      <main className="flex-1 ml-56 overflow-y-auto">
        <div className="min-h-full p-6 max-w-5xl">
          {/* Trial banner */}
          {subStatus?.trialing && (
            <div className="mb-5 rounded-lg px-4 py-2.5 bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 flex items-center justify-between">
              <p className="text-sm text-amber-200">
                <strong>{subStatus.daysLeft} day{subStatus.daysLeft !== 1 ? 's' : ''} left</strong> in your free trial.
              </p>
              <Link to="/billing" className="text-sm font-semibold text-amber-300 hover:underline whitespace-nowrap ml-4">
                Subscribe now →
              </Link>
            </div>
          )}
          <Outlet />
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'bg-card border border-border text-foreground',
            title: 'text-foreground',
            description: 'text-muted-foreground',
          },
        }}
      />
    </div>
  )
}
