import { useState, useEffect, useMemo } from 'react'
import { Loader2, Trophy, TrendingUp, Download } from 'lucide-react'
import { db, collection, onSnapshot, query, orderBy, limit } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

function exportCSV(sessions, members) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]))
  const rows = [
    ['Date', 'Time', 'Member', 'Email', 'Session Name', 'Duration (min)', 'Elapsed (min)', 'Completed'],
    ...sessions.map((s) => {
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date)
      const member = memberMap[s.userId] || {}
      return [
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        member.name || s.userEmail?.split('@')[0] || 'Unknown',
        s.userEmail || '',
        s.sessionName || 'Deep Work',
        s.duration || 0,
        s.elapsed || 0,
        s.completed ? 'Yes' : 'No',
      ]
    }),
  ]
  const csv  = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `focus-flow-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${sessions.length} sessions.`)
}

export default function Analytics() {
  const { org } = useAuth()
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org?.id) { setLoading(false); return }
    const unsubMembers = onSnapshot(
      collection(db, 'organisations', org.id, 'members'),
      (snap) => { setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
    const unsubSessions = onSnapshot(
      query(collection(db, 'organisations', org.id, 'sessions'), orderBy('date', 'desc'), limit(500)),
      (snap) => { setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
    return () => { unsubMembers(); unsubSessions() }
  }, [org])

  // Per-member stats — memoized to avoid recalculating on every render
  const memberStats = useMemo(() => members.map((m) => {
    const ms = sessions.filter((s) => s.userId === m.id)
    const totalMin = ms.reduce((a, s) => a + (s.elapsed || 0), 0)
    const completed = ms.filter((s) => s.completed).length
    const compliance = ms.length ? Math.round((completed / ms.length) * 100) : 0
    return {
      ...m,
      sessions: ms.length,
      totalMin,
      totalHrs: Math.round(totalMin / 60 * 10) / 10,
      completed,
      compliance,
    }
  }).sort((a, b) => b.totalMin - a.totalMin), [members, sessions])

  // Top 5 for bar chart
  const chartData = memberStats.slice(0, 8).map((m) => ({
    name: m.name?.split(' ')[0] || m.email?.split('@')[0] || 'User',
    hours: m.totalHrs,
  }))

  // Week compliance
  const totalSessions = sessions.length
  const completedSessions = sessions.filter((s) => s.completed).length
  const overallCompliance = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team focus hours, compliance, and performance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={sessions.length === 0}
          onClick={() => exportCSV(sessions, members)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total sessions</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Team focus hours</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {Math.round(sessions.reduce((a, s) => a + (s.elapsed || 0), 0) / 60 * 10) / 10}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overall compliance</p>
            <p className={`text-2xl font-bold mt-1 ${overallCompliance >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
              {overallCompliance}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Card className="border-l-2 border-l-indigo-500/40">
          <CardHeader>
            <CardTitle className="text-sm">Focus hours by member</CardTitle>
            <CardDescription>Total accumulated focus hours per team member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,.08)', radius: 6 }} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="url(#barGrad)" activeBar={{ fill: 'url(#barGradActive)' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard + compliance table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <CardTitle className="text-sm">Leaderboard</CardTitle>
            </div>
            <CardDescription>Top performers by focus hours</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {memberStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              memberStats.slice(0, 5).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                  <span className={`text-sm font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{getInitials(m.name || m.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name || m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.sessions} sessions</p>
                  </div>
                  <span className="text-sm font-semibold text-primary shrink-0">{m.totalHrs}h</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Compliance table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <CardTitle className="text-sm">Compliance report</CardTitle>
            </div>
            <CardDescription>Session completion rate per member</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {memberStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberStats.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                          {m.name?.split(' ')[0] || m.email?.split('@')[0] || 'User'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{m.sessions}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-secondary rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${m.compliance >= 70 ? 'bg-green-400' : 'bg-yellow-400'}`}
                              style={{ width: `${m.compliance}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{m.compliance}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
