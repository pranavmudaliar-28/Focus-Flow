import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Shield, Bell, Users, BarChart3, Zap, LogOut, CreditCard, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { auth, signOut } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ADMIN_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/policy', icon: Shield, label: 'Policy' },
  { to: '/announcements', icon: Bell, label: 'Announcements' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

const MANAGER_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/announcements', icon: Bell, label: 'Announcements' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

const ADMIN_BOTTOM = [
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 relative',
          isActive
            ? 'text-primary font-semibold bg-primary/15 border-l-2 border-primary pl-[10px] shadow-[inset_3px_0_10px_rgba(99,102,241,.2)]'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-2 border-transparent pl-[10px]'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { org, userRole } = useAuth()
  const isManager = userRole === 'manager'
  const nav = isManager ? MANAGER_NAV : ADMIN_NAV

  return (
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col border-r border-border bg-background z-30">
      {/* Top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-primary/40 via-violet-500/30 to-transparent" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div
          className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0"
          style={{ boxShadow: 'var(--shadow-glow)' }}
        >
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground tracking-tight truncate">Focus Flow</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {isManager ? 'Manager Panel' : 'Admin Panel'}
          </p>
        </div>
      </div>

      {/* Org badge */}
      {org && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-primary/8 border border-primary/20">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Organisation</p>
            {isManager && <Badge variant="warning" className="text-[9px] py-0 px-1.5">Manager</Badge>}
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{org.name || '—'}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>

      {/* Bottom nav: Admin-only */}
      {!isManager && (
        <div className="px-2 pb-1 space-y-0.5 border-t border-border pt-2">
          {ADMIN_BOTTOM.map((item) => <NavItem key={item.to} {...item} />)}
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground gap-2 text-xs"
          onClick={() => signOut(auth)}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
