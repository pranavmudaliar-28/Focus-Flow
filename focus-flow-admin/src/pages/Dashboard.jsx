import { useState, useEffect } from 'react'
import { Users, Clock, Activity, TrendingUp, Timer, CheckCircle2 } from 'lucide-react'
import { db, collection, query, onSnapshot, orderBy, limit, doc, updateDoc } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { PLAN_SEATS } from '@/lib/stripe'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-indigo-500/30 bg-card/90 backdrop-blur-sm px-3 py-2.5 shadow-[0_0_20px_rgba(99,102,241,.3)]">
      <p className="text-[11px] font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-indigo-300">{payload[0].value}h focused</p>
    </div>
  )
}

function StatCard({ title, value, sub, icon: Icon, accent, borderColor }) {
  return (
    <Card className={`border-l-2 ${borderColor || 'border-l-border'} hover:shadow-[var(--shadow-md)] transition-shadow`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-sm ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="skeleton h-3 w-24 mb-3" />
            <div className="skeleton h-7 w-16" />
            <div className="skeleton h-3 w-20 mt-2" />
          </div>
          <div className="skeleton h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { org, setOrg } = useAuth()
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  // Detect Stripe redirect back with ?upgraded=<plan>
  useEffect(() => {
    if (!org?.id) return
    const params = new URLSearchParams(window.location.search)
    const upgradedTo = params.get('upgraded')
    if (!upgradedTo || !PLAN_SEATS[upgradedTo]) return
    const newSeats = PLAN_SEATS[upgradedTo]
    window.history.replaceState({}, '', '/dashboard')
    updateDoc(doc(db, 'organisations', org.id), {
      plan: upgradedTo,
      seats: newSeats,
      subscriptionStatus: 'active',
    })
      .then(() => {
        if (setOrg) {
          setOrg(prev => ({ ...prev, plan: upgradedTo, seats: newSeats, subscriptionStatus: 'active' }))
        }
        const name = upgradedTo.charAt(0).toUpperCase() + upgradedTo.slice(1)
        toast.success(`🎉 Subscribed to ${name}!`)
      })
      .catch(() => toast.error('Could not confirm payment — contact support.'))
  }, [org?.id])

  useEffect(() => {
    if (!org?.id) { setLoading(false); return }
    const unsubMembers = onSnapshot(
      collection(db, 'organisations', org.id, 'members'),
      (snap) => { setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
    const unsubSessions = onSnapshot(
      query(collection(db, 'organisations', org.id, 'sessions'), orderBy('date', 'desc'), limit(50)),
      (snap) => { setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
    return () => { unsubMembers(); unsubSessions() }
  }, [org])

  const totalFocusMin = sessions.reduce((s, x) => s + (x.elapsed || 0), 0)
  const completedSessions = sessions.filter((s) => s.completed).length
  const compliance = sessions.length ? Math.round((completedSessions / sessions.length) * 100) : 0

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' })
    const dateStr = d.toDateString()
    const mins = sessions
      .filter((s) => {
        const sd = s.date?.toDate ? s.date.toDate() : new Date(s.date)
        return sd.toDateString() === dateStr
      })
      .reduce((acc, s) => acc + (s.elapsed || 0), 0)
    return { label, mins: Math.round(mins / 60 * 10) / 10 }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gradient welcome card */}
      <div className="rounded-xl p-5 bg-gradient-to-r from-indigo-500/15 via-violet-500/8 to-transparent border border-indigo-500/25 shadow-[0_0_30px_rgba(99,102,241,.12)]">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-foreground/80 bg-clip-text text-transparent">
            Welcome back{org?.name ? `, ${org.name}` : ''}! 👋
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's happening with your team today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
        <StatCard
          title="Total members"
          value={members.length}
          sub={`of ${org?.seats || 10} seats`}
          icon={Users}
          accent="bg-indigo-500/30 text-indigo-300"
          borderColor="border-l-indigo-500/60"
        />
        <StatCard
          title="Sessions (all time)"
          value={sessions.length}
          sub={`${completedSessions} completed`}
          icon={Timer}
          accent="bg-violet-500/30 text-violet-300"
          borderColor="border-l-violet-500/60"
        />
        <StatCard
          title="Focus hours"
          value={`${Math.floor(totalFocusMin / 60)}h`}
          sub={`${totalFocusMin % 60}m total`}
          icon={Clock}
          accent="bg-cyan-500/30 text-cyan-300"
          borderColor="border-l-cyan-500/60"
        />
        <StatCard
          title="Compliance"
          value={`${compliance}%`}
          sub="completed sessions"
          icon={CheckCircle2}
          accent={compliance >= 70 ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'}
          borderColor={compliance >= 70 ? 'border-l-green-500/60' : 'border-l-yellow-500/60'}
        />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-l-2 border-l-indigo-500/40">
          <CardHeader>
            <CardTitle className="text-sm">Focus hours — last 7 days</CardTitle>
            <CardDescription>Daily team focus activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 space-y-2 pt-2">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-36 w-full rounded-md" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={last7Days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="55%"  stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#a5b4fc" stopOpacity={1} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="0" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,.08)', radius: 6 }} />
                  <Bar dataKey="mins" fill="url(#barGrad)" radius={[6, 6, 0, 0]} activeBar={{ fill: 'url(#barGradActive)' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Plan & seats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant="default" className="capitalize">{org?.plan || 'starter'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="text-sm font-medium">{members.length} / {org?.seats || 10}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, (members.length / (org?.seats || 10)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Org code</span>
              <code className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-primary">
                {org?.orgCode || '—'}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent sessions</CardTitle>
          <CardDescription>Latest activity from your team</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sessions yet. Share your org code with the team to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${s.completed ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.sessionName || 'Deep Work'}</p>
                      <p className="text-xs text-muted-foreground">{s.userEmail || 'Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground">{s.elapsed || 0} min</span>
                    <Badge variant={s.completed ? 'success' : 'warning'} className="text-xs">
                      {s.completed ? 'Done' : 'Partial'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
