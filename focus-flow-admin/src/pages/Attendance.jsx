import { useState, useEffect, useMemo } from 'react'
import { Loader2, Download, Clock } from 'lucide-react'
import { db, collection, onSnapshot, query, orderBy, limit } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { getInitials, formatDate, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select'

// Hours between check-in and check-out (both Firestore Timestamps), or null.
function hoursWorked(rec) {
  if (!rec.checkInTime || !rec.checkOutTime) return null
  const inMs  = rec.checkInTime.toDate ? rec.checkInTime.toDate().getTime() : new Date(rec.checkInTime).getTime()
  const outMs = rec.checkOutTime.toDate ? rec.checkOutTime.toDate().getTime() : new Date(rec.checkOutTime).getTime()
  if (outMs <= inMs) return null
  return Math.round((outMs - inMs) / 3.6e6 * 10) / 10
}

function exportCSV(records) {
  const rows = [
    ['Date', 'Employee', 'Email', 'Check-in', 'Check-out', 'Hours', 'Status'],
    ...records.map((r) => {
      const hrs = hoursWorked(r)
      return [
        formatDate(r.checkInTime) === '—' ? r.date || '' : formatDate(r.checkInTime),
        r.name || r.userEmail?.split('@')[0] || 'Unknown',
        r.userEmail || '',
        formatTime(r.checkInTime),
        formatTime(r.checkOutTime),
        hrs == null ? '' : hrs,
        r.checkOutTime ? 'Completed' : 'Checked in',
      ]
    }),
  ]
  const csv  = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${records.length} records.`)
}

export default function Attendance() {
  const { org } = useAuth()
  const [members, setMembers] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [employee, setEmployee] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')

  useEffect(() => {
    if (!org?.id) { setLoading(false); return }
    const unsubMembers = onSnapshot(
      collection(db, 'organisations', org.id, 'members'),
      (snap) => { setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))) },
      () => {}
    )
    const unsubAttendance = onSnapshot(
      query(collection(db, 'organisations', org.id, 'attendance'), orderBy('date', 'desc'), limit(500)),
      (snap) => { setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false) },
      () => setLoading(false)
    )
    return () => { unsubMembers(); unsubAttendance() }
  }, [org])

  const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  // Resolve the display name + apply employee/date filters client-side.
  const filtered = useMemo(() => {
    return records
      .map((r) => ({
        ...r,
        name: memberMap[r.userId]?.name || r.userName || r.userEmail?.split('@')[0] || 'Unknown',
      }))
      .filter((r) => employee === 'all' || r.userId === employee)
      .filter((r) => !fromDate || (r.date && r.date >= fromDate))
      .filter((r) => !toDate || (r.date && r.date <= toDate))
  }, [records, memberMap, employee, fromDate, toDate])

  // Summary stats over the filtered set
  const totalRecords = filtered.length
  const completed    = filtered.filter((r) => r.checkOutTime).length
  const totalHours   = Math.round(
    filtered.reduce((a, r) => a + (hoursWorked(r) || 0), 0) * 10
  ) / 10

  function resetFilters() {
    setEmployee('all'); setFromDate(''); setToDate('')
  }

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
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Employee check-in / check-out records
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={filtered.length === 0}
          onClick={() => exportCSV(filtered)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalRecords}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed days</p>
            <p className="text-2xl font-bold text-foreground mt-1">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total hours</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalHours}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Employee</label>
              <Select value={employee} onValueChange={setEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">From</label>
              <Input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">To</label>
              <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-sm">Attendance records</CardTitle>
          </div>
          <CardDescription>Historical check-in and check-out times</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No attendance records match these filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const hrs = hoursWorked(r)
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">{getInitials(r.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{r.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{r.userEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(r.checkInTime) === '—' ? r.date : formatDate(r.checkInTime)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{formatTime(r.checkInTime)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{formatTime(r.checkOutTime)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{hrs == null ? '—' : `${hrs}h`}</span>
                      </TableCell>
                      <TableCell>
                        {r.checkOutTime
                          ? <Badge variant="success">Completed</Badge>
                          : <Badge variant="warning">Checked in</Badge>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
