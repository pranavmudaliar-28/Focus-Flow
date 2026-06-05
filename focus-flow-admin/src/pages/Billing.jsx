import { useState, useEffect } from 'react'
import { Check, CreditCard, Zap, Users, ExternalLink, Mail, Loader2, Settings } from 'lucide-react'
import { db, doc, updateDoc } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { STRIPE_PLANS, PLAN_SEATS, startCheckout, TRIAL_DAYS } from '@/lib/stripe'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Prices/seats come from STRIPE_PLANS (src/lib/stripe.js); features defined here
const PLANS = [
  {
    id: 'trial',
    ...STRIPE_PLANS.trial,
    color: 'text-foreground',
    features: ['10 team members', 'Global blocklist', 'Team announcements', 'Basic dashboard', 'Org code invite'],
  },
  {
    id: 'starter',
    ...STRIPE_PLANS.starter,
    color: 'text-foreground',
    features: ['10 team members', 'Global blocklist', 'Team announcements', 'Basic dashboard', 'Org code invite'],
  },
  {
    id: 'pro',
    ...STRIPE_PLANS.pro,
    highlight: true,
    color: 'text-primary',
    features: ['50 team members', 'Everything in Starter', 'Advanced analytics', 'CSV export', 'Focus schedule enforcement', 'Priority email support'],
  },
  {
    id: 'enterprise',
    ...STRIPE_PLANS.enterprise,
    seats: 'Unlimited',
    color: 'text-foreground',
    features: ['Unlimited members', 'Everything in Pro', 'Custom integrations', 'SSO / SAML', 'Dedicated account manager', 'SLA guarantee'],
  },
]

export default function Billing() {
  const { org, setOrg, user, subStatus } = useAuth()
  const [upgrading, setUpgrading] = useState(null)
  const currentPlanId = org?.plan || 'pro'
  const currentPlan   = PLANS.find(p => p.id === currentPlanId) || PLANS[1]

  // Status badge text/variant
  const statusBadge = subStatus?.active
    ? { label: 'Active', variant: 'success' }
    : subStatus?.trialing
      ? { label: `Trial · ${subStatus.daysLeft}d left`, variant: 'warning' }
      : subStatus?.pending
        ? { label: 'Payment Pending', variant: 'secondary' }
        : { label: 'Expired', variant: 'destructive' }

  // Sync Stripe subscription dynamically (handles Customer Portal upgrades)
  useEffect(() => {
    if (!org?.stripeCustomerId) return

    async function syncSubscription() {
      try {
        const res = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${org.stripeCustomerId}&status=active`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}` }
        })
        const data = await res.json()
        if (data.error) {
          toast.error('Stripe API Error: ' + data.error.message)
          return
        }
        
        if (data.data && data.data.length > 0) {
          let stripePlan = null
          
          for (const sub of data.data) {
            const productId = sub.items?.data?.[0]?.price?.product
            if (productId === 'prod_UdqnbFflN617tA') { // Pro Product
              stripePlan = 'pro'
              break // Highest tier takes precedence
            } else if (productId === 'prod_UdqmGhMtNTgF26') { // Starter Product
              stripePlan = 'starter'
            }
          }

          if (stripePlan && (org.plan !== stripePlan || org.subscriptionStatus !== 'active')) {
            const newSeats = PLAN_SEATS[stripePlan]
            await updateDoc(doc(db, 'organisations', org.id), {
              plan: stripePlan,
              seats: newSeats,
              subscriptionStatus: 'active',
            })
            if (setOrg) {
              setOrg(prev => ({ ...prev, plan: stripePlan, seats: newSeats, subscriptionStatus: 'active' }))
            }
            toast.success(`Successfully synced your ${stripePlan} plan!`)
          } else if (!stripePlan) {
            toast.warning(`Found subscriptions, but products did not match known IDs. Found: ${data.data.map(s => s.items?.data?.[0]?.price?.product).join(', ')}`)
          }
        } else {
          toast.warning('No active subscriptions found in Stripe for your account.')
        }
      } catch (e) {
        console.error('Failed to sync Stripe subscription:', e)
        toast.error('Sync failed: ' + e.message)
      }
    }
    
    syncSubscription()
    
    // Also re-sync when window regains focus in case they used the browser back button
    window.addEventListener('focus', syncSubscription)
    return () => window.removeEventListener('focus', syncSubscription)
  }, [org?.id, org?.stripeCustomerId])

  // Detect Stripe redirect back
  useEffect(() => {
    if (!org?.id) return
    const params = new URLSearchParams(window.location.search)
    const upgradedTo = params.get('upgraded')
    const fallbackTrial = params.get('fallback_trial')

    if (fallbackTrial === 'true' && org.subscriptionStatus === 'pending') {
      window.history.replaceState({}, '', '/dashboard')
      updateDoc(doc(db, 'organisations', org.id), {
        plan: 'trial',
        seats: 10,
        subscriptionStatus: 'trialing',
        trialEndsAt: Date.now() + TRIAL_DAYS * 86400000,
      }).then(() => {
        if (setOrg) {
          setOrg(prev => ({ ...prev, plan: 'trial', seats: 10, subscriptionStatus: 'trialing', trialEndsAt: Date.now() + TRIAL_DAYS * 86400000 }))
        }
        toast.success('14-Day Free Trial activated automatically.')
        window.location.href = '/dashboard'
      })
      return
    }

    if (!upgradedTo || !PLAN_SEATS[upgradedTo]) return
    const newSeats = PLAN_SEATS[upgradedTo]
    window.history.replaceState({}, '', '/billing')
    updateDoc(doc(db, 'organisations', org.id), {
      plan: upgradedTo,
      seats: newSeats,
      subscriptionStatus: 'active',
    })
      .then(() => {
        setOrg(prev => ({ ...prev, plan: upgradedTo, seats: newSeats, subscriptionStatus: 'active' }))
        const name = upgradedTo.charAt(0).toUpperCase() + upgradedTo.slice(1)
        toast.success(`🎉 Subscribed to ${name}!`)
      })
      .catch(() => toast.error('Could not confirm payment — contact support.'))
  }, [org?.id, org?.subscriptionStatus])

  async function handleUpgrade(plan) {
    if (plan.id === currentPlanId && subStatus?.active) return
    if (plan.id === 'enterprise') { startCheckout('enterprise'); return }
    setUpgrading(plan.id)
    const res = await startCheckout(plan.id, org?.id, user?.email)
    if (!res.ok) {
      setUpgrading(null)
      toast.error('Checkout unavailable — check Stripe configuration.')
    }
    // on success Stripe redirects away
  }

  async function handleManageBill() {
    try {
      let customerId = org?.stripeCustomerId

      // If we don't have the customer ID saved, try to find it by email
      if (!customerId && org?.adminEmail) {
        const searchRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(org.adminEmail)}`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}` }
        })
        const searchData = await searchRes.json()
        if (searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id
          // Save it for future use
          await updateDoc(doc(db, 'organisations', org.id), { stripeCustomerId: customerId })
        }
      }

      if (!customerId) {
        toast.error('Could not find your billing profile. Please contact support.')
        return
      }

      const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'customer': customerId,
          'return_url': window.location.href,
          'configuration': 'bpc_1TeuvbCeRBK66yLJXl8cPbc4'
        })
      })
      
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to generate billing portal link.')
      }
    } catch (e) {
      toast.error('An error occurred while opening the billing portal.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your plan, seats, and payments</p>
      </div>

      {/* Current plan summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {currentPlan.name} plan
                  </h3>
                  <Badge variant={statusBadge.variant} className="rounded-sm font-medium">
                    {statusBadge.label}
                  </Badge>
                </div>
                {subStatus?.active && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={handleManageBill} className="h-8">
                      <Settings className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      Manage Bill
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Org code</p>
              <code className="text-sm font-mono font-bold text-primary">{org?.orgCode}</code>
            </div>
          </div>

          <Separator className="my-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Seats</p>
              <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{org?.seats || 10}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {subStatus?.active ? 'Active' : subStatus?.trialing ? 'Trial' : subStatus?.pending ? 'Pending' : 'Expired'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {currentPlan.price}{currentPlan.period === '/month' ? '/mo' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Choose a plan</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = (plan.id === currentPlanId && subStatus?.active) || (plan.id === currentPlanId && plan.id === 'trial' && subStatus?.trialing)
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${plan.highlight ? 'border-primary/50 shadow-md shadow-primary/10' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="text-xs shadow-sm">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-2xl font-bold ${plan.color}`}>{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {typeof plan.seats === 'number' ? `${plan.seats} seats` : plan.seats}
                    </p>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="sm"
                    className="w-full"
                    variant={isCurrent ? 'secondary' : plan.highlight ? 'default' : 'outline'}
                    disabled={isCurrent || upgrading === plan.id || plan.id === 'trial'}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {upgrading === plan.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isCurrent
                      ? 'Current plan'
                      : plan.id === 'enterprise'
                        ? (<><Mail className="h-3.5 w-3.5" /> Contact us</>)
                        : plan.id === 'trial'
                          ? 'Available on signup'
                          : (<>Subscribe <ExternalLink className="h-3.5 w-3.5 ml-1" /></>)
                    }
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Stripe + support info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Secure payments</p>
              <p className="text-xs text-muted-foreground mt-1">
                Payments are processed by <strong>Stripe</strong>. We never store card details.
                Upgrades activate within minutes of payment.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Need more seats?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Email us at{' '}
                <a href="mailto:team@slasheasy.com" className="text-primary hover:underline">
                  team@slasheasy.com
                </a>{' '}
                for custom enterprise pricing and volume discounts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
