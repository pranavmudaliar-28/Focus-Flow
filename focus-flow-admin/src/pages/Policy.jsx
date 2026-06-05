import { useState, useEffect } from 'react'
import { Plus, X, Shield, Clock, Save, Loader2 } from 'lucide-react'
import { db, doc, getDoc, setDoc, serverTimestamp } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PRESETS = [
  'twitter.com', 'x.com', 'instagram.com', 'facebook.com',
  'tiktok.com', 'reddit.com', 'netflix.com', 'twitch.tv', 'discord.com',
]

const ICONS = {
  'twitter.com': '🐦', 'x.com': '✖️', 'facebook.com': '👤',
  'instagram.com': '📸', 'tiktok.com': '🎵', 'reddit.com': '🤖',
  'netflix.com': '🎬', 'twitch.tv': '🎮', 'discord.com': '💬',
  'youtube.com': '📺',
}

export default function Policy() {
  const { org } = useAuth()
  const [blocklist, setBlocklist] = useState([])
  const [domain, setDomain] = useState('')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleStart, setScheduleStart] = useState('09:00')
  const [scheduleEnd, setScheduleEnd] = useState('17:00')
  const [scheduleDays, setScheduleDays] = useState([1, 2, 3, 4, 5])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!org?.id) { setLoading(false); return }
    async function load() {
      const snap = await getDoc(doc(db, 'organisations', org.id, 'policy', 'current'))
      if (snap.exists()) {
        const d = snap.data()
        setBlocklist(d.blocklist || [])
        setScheduleEnabled(d.scheduleEnabled || false)
        setScheduleStart(d.scheduleStart || '09:00')
        setScheduleEnd(d.scheduleEnd || '17:00')
        setScheduleDays(d.scheduleDays || [1, 2, 3, 4, 5])
      }
      setLoading(false)
    }
    load()
  }, [org])

  function addDomain() {
    const raw = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
    // Must contain a dot AND have at least 2-char TLD (rejects "com", "org", "net" alone)
    if (!raw || !/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(raw)) {
      toast.error('Enter a valid domain (e.g. reddit.com)'); return
    }
    if (blocklist.includes(raw)) { toast.error('Domain already in the list'); return }
    setBlocklist((p) => [...p, raw])
    setDomain('')
  }

  function removeDomain(d) {
    setBlocklist((p) => p.filter((x) => x !== d))
  }

  function toggleDay(i) {
    setScheduleDays((p) => p.includes(i) ? p.filter((d) => d !== i) : [...p, i].sort())
  }

  async function save() {
    if (!org?.id) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'organisations', org.id, 'policy', 'current'), {
        blocklist,
        scheduleEnabled,
        scheduleStart,
        scheduleEnd,
        scheduleDays,
        updatedAt: serverTimestamp(),
      })
      toast.success('Policy saved — changes will sync to all members.')
    } catch {
      toast.error('Failed to save policy.')
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Policy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage global blocklist and focus schedule for your team
          </p>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      {/* Blocklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Global blocklist</CardTitle>
          </div>
          <CardDescription>
            These sites are blocked for all members during focus sessions. Employees cannot override them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add domain */}
          <div className="flex gap-2">
            <Input
              placeholder="reddit.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              className="flex-1"
            />
            <Button size="sm" onClick={addDomain} variant="outline">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {/* Quick presets */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.filter((p) => !blocklist.includes(p)).map((p) => (
                <button
                  key={p}
                  onClick={() => setBlocklist((prev) => [...prev, p])}
                  className="text-xs px-2.5 py-1 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary transition-all duration-150"
                >
                  {ICONS[p] || '🌐'} {p}
                </button>
              ))}
            </div>
          </div>

          {/* Blocklist items */}
          {blocklist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-md">
              No sites blocked. Add domains above.
            </p>
          ) : (
            <div className="space-y-1.5">
              {blocklist.map((d) => (
                <div key={d} className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/30 border border-border/50 group hover:bg-secondary/60 hover:border-border transition-all duration-150">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ICONS[d] || '🌐'}</span>
                    <span className="text-sm font-mono text-foreground">{d}</span>
                  </div>
                  <button
                    onClick={() => removeDomain(d)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-indigo-500/5 border border-indigo-500/20 rounded-md px-3 py-2">
            <Shield className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            {blocklist.length} site{blocklist.length !== 1 ? 's' : ''} blocked.
            Changes sync to all members on next extension load.
          </div>
        </CardContent>
      </Card>

      {/* Focus schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Focus schedule</CardTitle>
            </div>
            <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
          </div>
          <CardDescription>
            Automatically enforce the blocklist during set work hours, even without an active timer.
          </CardDescription>
        </CardHeader>
        {scheduleEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Active days</Label>
              <div className="flex gap-1.5">
                {DAYS.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                      scheduleDays.includes(i)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {name[0]}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
