import { useState, useEffect } from 'react'
import { Users, Copy, UserPlus, Loader2, MoreVertical, Trash2, ShieldCheck } from 'lucide-react'
import { db, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, orderBy, query } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { getInitials, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const ROLE_COLORS = {
  admin: 'default',
  manager: 'warning',
  employee: 'secondary',
}

export default function Team() {
  const { org } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (!org?.id) { setLoading(false); return }
    const unsub = onSnapshot(
      query(collection(db, 'organisations', org.id, 'members'), orderBy('joinedAt', 'desc')),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }
    )
    return unsub
  }, [org])

  async function changeRole(memberId, role) {
    try {
      // Both writes must succeed — write new first, then index
      await updateDoc(doc(db, 'organisations', org.id, 'members', memberId), { role })
      await setDoc(doc(db, 'userOrgMap', memberId), {
        orgId: org.id, orgName: org.name || '', role,
      }, { merge: true })
      toast.success(`Role updated to ${role}.`)
    } catch {
      toast.error('Failed to update role. Please try again.')
    }
  }

  async function removeMember(memberId) {
    try {
      await deleteDoc(doc(db, 'organisations', org.id, 'members', memberId))
      // Keep UI in sync (onSnapshot will also update, this is instant feedback)
      toast.success('Member removed.')
    } catch {
      toast.error('Failed to remove member.')
    }
  }

  function copyCode() {
    if (!org?.orgCode) { toast.error('Org code not available yet.'); return }
    navigator.clipboard.writeText(org.orgCode)
    toast.success('Org code copied!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage members, roles, and invitations
          </p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </div>

      {/* Seat summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total members</p>
            <p className="text-2xl font-bold text-foreground mt-1">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Seats available</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {Math.max(0, (org?.seats || 10) - members.length)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Org code</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-base font-bold font-mono text-primary">{org?.orgCode}</code>
              <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Members</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : `${members.length} of ${org?.seats || 10} seats used`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No members yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Share the org code <strong className="text-primary">{org?.orgCode}</strong> with your team.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{getInitials(m.name || m.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{formatDate(m.joinedAt)}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeMember(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team members</DialogTitle>
            <DialogDescription>
              Share your organisation code with team members. They'll enter it when setting up the extension.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4 gap-3">
              <p className="text-sm text-muted-foreground">Organisation code</p>
              <div className="flex items-center gap-3">
                <code className="text-4xl font-bold font-mono tracking-widest text-primary">
                  {org?.orgCode}
                </code>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                Team member installs the Focus Flow extension
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                Opens the extension and goes to the Team tab
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                Enters the code <strong className="text-primary font-mono">{org?.orgCode}</strong> to join
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {Math.max(0, (org?.seats || 10) - members.length)} seat{
                Math.max(0, (org?.seats || 10) - members.length) !== 1 ? 's' : ''
              } remaining
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
