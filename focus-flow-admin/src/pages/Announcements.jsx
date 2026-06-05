import { useState, useEffect } from 'react'
import { Bell, Plus, Loader2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'

export default function Announcements() {
  const { org } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!org?.id) { setLoading(false); return }
    const snap = await getDocs(
      query(collection(db, 'organisations', org.id, 'announcements'), orderBy('createdAt', 'desc'))
    )
    setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { load() }, [org])

  async function create() {
    if (!message.trim()) { toast.error('Enter a message'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'organisations', org.id, 'announcements'), {
        message: message.trim(),
        active: true,
        target: 'all',
        createdAt: serverTimestamp(),
      })
      toast.success('Announcement pushed to all members.')
      setMessage('')
      setOpen(false)
      load()
    } catch {
      toast.error('Failed to create announcement.')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(id, current) {
    try {
      await updateDoc(doc(db, 'organisations', org.id, 'announcements', id), { active: !current })
      setAnnouncements((p) => p.map((a) => a.id === id ? { ...a, active: !current } : a))
      toast.success(current ? 'Announcement deactivated.' : 'Announcement activated.')
    } catch {
      toast.error('Failed to update announcement.')
    }
  }

  async function remove(id) {
    try {
      await deleteDoc(doc(db, 'organisations', org.id, 'announcements', id))
      setAnnouncements((p) => p.filter((a) => a.id !== id))
      toast.success('Announcement deleted.')
    } catch {
      toast.error('Failed to delete announcement.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Push messages to your team's extension banners
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New announcement
        </Button>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg px-4 py-3">
        <Bell className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Active announcements appear as a banner inside the Focus Flow extension for all members.
          Deactivate to hide without deleting.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create one to notify your team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={`border-l-4 transition-all hover:shadow-[var(--shadow-md)] ${a.active ? 'border-l-green-500/60 hover:border-l-green-500/80' : 'border-l-border'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.active ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,.6)]' : 'bg-muted-foreground/30'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{a.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={a.active ? 'success' : 'secondary'} className="text-xs">
                        {a.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => toggle(a.id, a.active)}
                      title={a.active ? 'Deactivate' : 'Activate'}
                    >
                      {a.active
                        ? <ToggleRight className="h-4 w-4 text-green-400" />
                        : <ToggleLeft className="h-4 w-4" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(a.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
            <DialogDescription>
              This message will appear in the Focus Flow extension for all team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="msg">Message</Label>
            <textarea
              id="msg"
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="🎉 Team stand-up in 10 minutes!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/200</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Push to team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
