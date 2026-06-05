import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { startCheckout, TRIAL_DAYS } from '@/lib/stripe'
import { db, doc, updateDoc } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

const PLAN_OPTIONS = [
  { id: 'trial',   name: '14-Day Free Trial', price: '$0',  sub: 'Full access for 14 days', isTrial: true },
  { id: 'starter', name: 'Starter', price: '$19', sub: '10 seats' },
  { id: 'pro',     name: 'Pro',     price: '$49', sub: '50 seats' },
]

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState('trial')
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const { user, org, loading, setOrg } = useAuth()
  const navigate = useNavigate()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  async function handleCheckout() {
    setLoadingCheckout(true)
    
    if (selectedPlan === 'trial') {
      try {
        await updateDoc(doc(db, 'organisations', org.id), {
          plan: 'trial',
          subscriptionStatus: 'trialing',
          seats: 10,
          trialEndsAt: Date.now() + TRIAL_DAYS * 86400000,
        })
        if (setOrg) {
          setOrg({ ...org, plan: 'trial', subscriptionStatus: 'trialing', seats: 10, trialEndsAt: Date.now() + TRIAL_DAYS * 86400000 })
        }
        toast.success('Trial activated! Welcome to Focus Flow.')
        navigate('/dashboard')
      } catch (err) {
        toast.error('Could not activate trial. Please try again.')
        setLoadingCheckout(false)
      }
      return
    }

    // Pass the custom success URL directing to the dashboard
    const successUrl = `${window.location.origin}/dashboard?upgraded=${selectedPlan}`
    const res = await startCheckout(selectedPlan, org?.id, user?.email, successUrl)
    if (!res.ok) {
      toast.error(res.reason || 'Checkout unavailable')
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 h-60 w-60 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Choose your plan</CardTitle>
            <CardDescription>Select a plan for {org?.name || 'your team'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PLAN_OPTIONS.map((p) => {
                const active = selectedPlan === p.id
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`relative rounded-xl border p-4 text-left transition-all overflow-hidden ${
                      active
                        ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(99,102,241,.4)]'
                        : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                    }`}
                  >
                    {p.isTrial && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        RECOMMENDED
                      </div>
                    )}
                    {active && !p.isTrial && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    <p className="text-sm font-semibold text-foreground mt-2">{p.name}</p>
                    <p className="text-xl font-bold text-foreground mt-1">{p.price}<span className="text-xs font-normal text-muted-foreground">{p.price !== '$0' ? '/mo' : ''}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">{p.sub}</p>
                  </button>
                )
              })}
            </div>
            
            <Button onClick={handleCheckout} className="w-full mt-4" disabled={loadingCheckout || !org?.id}>
              {loadingCheckout && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedPlan === 'trial' ? 'Start Free Trial' : 'Proceed to Checkout'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
