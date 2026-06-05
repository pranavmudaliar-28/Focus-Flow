import { Zap, Check, LogOut, Lock, Mail } from 'lucide-react'
import { auth, signOut } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { STRIPE_PLANS, startCheckout } from '@/lib/stripe'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PLANS = [
  { id: 'starter', features: ['10 team members', 'Global blocklist', 'Announcements', 'Basic analytics'] },
  { id: 'pro',     features: ['50 team members', 'Advanced analytics', 'CSV export', 'Focus schedule', 'Priority support'], highlight: true },
  { id: 'enterprise', features: ['Unlimited members', 'SSO / SAML', 'Dedicated manager', 'SLA guarantee'] },
]

export default function PaymentRequired() {
  const { org, user, userRole } = useAuth()

  async function subscribe(planId) {
    const res = await startCheckout(planId, org?.id, user?.email)
    if (!res.ok) toast.error('Checkout unavailable — check Stripe configuration.')
  }

  // Non-admins can't pay — tell them to contact their admin
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
        </div>
        <Card className="relative w-full max-w-md animate-fade-in">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Subscription ended</h1>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{org?.name}</strong>'s subscription has ended.
              Please ask your organisation admin to renew it to regain access.
            </p>
            <Button variant="outline" className="w-full gap-2" onClick={() => signOut(auth)}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      <div className="relative max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Your free trial has ended
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Subscribe to continue managing <strong className="text-foreground">{org?.name}</strong>. Pick a plan to unlock your dashboard again.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const plan = STRIPE_PLANS[p.id]
            return (
              <Card key={p.id} className={`relative flex flex-col ${p.highlight ? 'border-primary/50 shadow-[0_0_24px_rgba(99,102,241,.18)]' : ''}`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs shadow">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                  {p.id === 'enterprise' ? (
                    <Button variant="outline" className="w-full gap-1.5" onClick={() => subscribe('enterprise')}>
                      <Mail className="h-3.5 w-3.5" /> Contact us
                    </Button>
                  ) : (
                    <Button variant={p.highlight ? 'default' : 'outline'} className="w-full" onClick={() => subscribe(p.id)}>
                      Subscribe to {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-6">
          <button onClick={() => signOut(auth)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
