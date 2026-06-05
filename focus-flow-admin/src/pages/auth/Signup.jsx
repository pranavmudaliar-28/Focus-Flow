import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Mail, Lock, Building2, Loader2, Eye, EyeOff } from 'lucide-react'
import { auth, db, createUserWithEmailAndPassword, doc, getDoc, setDoc, serverTimestamp, collection } from '@/lib/firebase'
import { generateOrgCode } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { TRIAL_DAYS } from '@/lib/stripe'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Signup() {
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setOrg } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)

      const orgRef = doc(collection(db, 'organisations'))
      const orgCode = generateOrgCode()
      const orgData = {
        name: orgName.trim(),
        adminEmail: email,
        adminUid: user.uid,
        plan: 'starter',
        seats: 10,
        subscriptionStatus: 'pending',
        orgCode,
        createdAt: serverTimestamp(),
      }
      await setDoc(orgRef, orgData)
      await setDoc(doc(db, 'orgIndex', orgCode), { orgId: orgRef.id, orgName: orgName.trim() })
      await setDoc(doc(db, 'organisations', orgRef.id, 'policy', 'current'), {
        blocklist: [],
        scheduleEnabled: false,
        scheduleStart: '09:00',
        scheduleEnd: '17:00',
        scheduleDays: [1, 2, 3, 4, 5],
        updatedAt: serverTimestamp(),
      })
      // Directly update auth context so pages don't wait for onAuthStateChanged re-query
      setOrg({ id: orgRef.id, ...orgData })

      toast.success('Account created successfully!')
      navigate('/pricing')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('An account with this email already exists. If you are a team member, sign in instead of signing up.')
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 h-60 w-60 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Focus Flow</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your organisation</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Set up your team's focus management</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="orgName">Organisation name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Acme Inc."
                    className="pl-9"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Admin email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {TRIAL_DAYS}-day free trial · No charge until your trial ends · Cancel anytime
        </p>
      </div>
    </div>
  )
}
