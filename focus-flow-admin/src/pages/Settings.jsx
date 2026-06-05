import { useState, useEffect } from 'react'
import { Save, Loader2, Building2, Copy, RefreshCw, Bell, Shield } from 'lucide-react'
import { db, doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { generateOrgCode } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function Settings() {
  const { org, setOrg } = useAuth()
  const [orgName, setOrgName]               = useState('')
  const [seats, setSeats]                   = useState(10)
  const [notificationsEnabled, setNotif]    = useState(true)
  const [strictMode, setStrict]             = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [regenerating, setRegenerating]     = useState(false)

  useEffect(() => {
    if (!org) return
    setOrgName(org.name || '')
    setSeats(org.seats || 10)
    setNotif(org.notificationsEnabled !== false)
    setStrict(org.strictMode || false)
    // Backfill orgIndex only once — check if entry exists first to avoid quota waste
    if (org.id && org.orgCode) {
      getDoc(doc(db, 'orgIndex', org.orgCode)).then((snap) => {
        if (!snap.exists()) {
          setDoc(doc(db, 'orgIndex', org.orgCode), {
            orgId: org.id,
            orgName: org.name || '',
          }).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [org])

  async function save() {
    if (!org?.id) { toast.error('Organisation not loaded — please refresh.'); return }
    if (!orgName.trim()) { toast.error('Organisation name cannot be empty.'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'organisations', org.id), {
        name: orgName.trim(),
        seats: Math.max(1, parseInt(seats) || 10),
        notificationsEnabled,
        strictMode,
        updatedAt: serverTimestamp(),
      })
      setOrg((prev) => ({ ...prev, name: orgName.trim(), seats: parseInt(seats) || 10, notificationsEnabled, strictMode }))
      // Keep orgIndex orgName in sync
      if (org.orgCode && orgName.trim() !== (org.name || '').trim()) {
        setDoc(doc(db, 'orgIndex', org.orgCode), { orgId: org.id, orgName: orgName.trim() }, { merge: true }).catch(() => {})
      }
      toast.success('Settings saved.')
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function regenerateCode() {
    if (!org?.id) return
    if (!confirm('Regenerate org code? The old code will stop working immediately.')) return
    setRegenerating(true)
    try {
      const newCode = generateOrgCode()
      if (!newCode) throw new Error('Failed to generate code')
      // Write new orgIndex FIRST, then delete old — prevents orphaned code on failure
      await setDoc(doc(db, 'orgIndex', newCode), { orgId: org.id, orgName: org.name || '' })
      await updateDoc(doc(db, 'organisations', org.id), { orgCode: newCode })
      if (org.orgCode) await deleteDoc(doc(db, 'orgIndex', org.orgCode)).catch(() => {})
      setOrg((prev) => ({ ...prev, orgCode: newCode }))
      toast.success(`New code: ${newCode}`)
    } catch {
      toast.error('Failed to regenerate code.')
    } finally {
      setRegenerating(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(org?.orgCode || '')
    toast.success('Org code copied!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organisation configuration and preferences</p>
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      {/* Organisation details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Organisation</CardTitle>
          </div>
          <CardDescription>Basic details visible to your team members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organisation name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seats">Total seats</Label>
              <Input
                id="seats"
                type="number"
                value={seats}
                disabled
                className="cursor-not-allowed opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                Seat count is set by your plan.{' '}
                <a href="/billing" className="text-primary hover:underline">Upgrade</a> to increase.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Organisation code</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 h-9 flex items-center px-3 rounded-md border border-input bg-transparent text-sm font-mono tracking-widest text-primary">
                {org?.orgCode || '———'}
              </code>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={copyCode} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateCode}
                disabled={regenerating}
                title="Regenerate — old code stops working"
              >
                {regenerating
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCw className="h-4 w-4" />}
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this with employees so they can join the organisation in the extension.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Policy preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Focus policy</CardTitle>
          </div>
          <CardDescription>Behaviour settings applied to all members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Strict mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Block distraction sites for all members during work hours, even without an active session.
                Requires a focus schedule to be set in Policy.
              </p>
            </div>
            <Switch checked={strictMode} onCheckedChange={setStrict} />
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send session-complete notifications to members via the extension.
              </p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotif} />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-md border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-sm font-medium text-foreground">Delete organisation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently removes all members, policy, and data. Cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => toast.error('Contact support to delete your organisation.')}
            >
              Delete org
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
