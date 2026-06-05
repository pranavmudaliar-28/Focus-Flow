// Stripe checkout via a Firebase Cloud Function (createCheckoutSession) — the
// function creates a hosted Checkout Session server-side; a webhook confirms payment.

import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export const TRIAL_DAYS = 14

const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export const STRIPE_PLANS = {
  trial:   { id: 'trial',   name: '14-Day Free Trial', price: '$0', period: '/14 days', seats: 10 },
  starter: { id: 'starter', name: 'Starter', price: '$19', period: '/month', seats: 10 },
  pro:     { id: 'pro',     name: 'Pro',     price: '$49', period: '/month', seats: 50 },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 'Custom', period: 'pricing', seats: null,
    paymentLink: 'mailto:team@slasheasy.com?subject=Focus Flow Enterprise',
  },
}

export const PLAN_SEATS = { trial: 10, starter: 10, pro: 50, enterprise: 999 }

// Derive subscription state from an org document
export function getSubStatus(org) {
  if (!org) return { active: false, trialing: false, expired: false, daysLeft: 0 }
  if (org.subscriptionStatus === 'active') {
    return { active: true, trialing: false, expired: false, daysLeft: 0 }
  }
  // Legacy orgs created before subscriptions existed have no status → never block them
  if (!org.subscriptionStatus) {
    return { active: true, trialing: false, expired: false, daysLeft: 0 }
  }
  const end = org.trialEndsAt || 0
  const msLeft = end - Date.now()
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000))
  const trialing = org.subscriptionStatus === 'trialing' && msLeft > 0
  const pending = org.subscriptionStatus === 'pending'
  return { active: false, trialing, pending, expired: !trialing && !pending, daysLeft }
}

// Start subscription checkout. Calls Stripe API directly from the frontend (TEST ONLY).
// Redirects to Stripe's hosted page. Returns { ok, reason } on failure.
export async function startCheckout(plan, orgId, email, successUrl) {
  if (plan === 'enterprise') {
    window.open(STRIPE_PLANS.enterprise.paymentLink, '_blank')
    return { ok: true }
  }
  
  try {
    const PRICE_IDS = {
      starter: 'price_1TeZ4cCeRBK66yLJTsz5n7W6',
      pro:     'price_1TeZ5VCeRBK66yLJwnSb0iln',
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) return { ok: false, reason: 'invalid_plan' }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': 1,
        'success_url': successUrl || `${window.location.origin}/billing?upgraded=${plan}`,
        'cancel_url': `${window.location.origin}/billing?fallback_trial=true`,
        'client_reference_id': orgId,
        ...(email ? { 'customer_email': email } : {})
      })
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('Stripe error:', errorData)
      return { ok: false, reason: errorData.error?.message || 'checkout_failed' }
    }

    const data = await res.json()
    if (data?.url) {
      window.location.href = data.url
      return { ok: true }
    }
    
    return { ok: false, reason: 'no_url' }
  } catch (e) {
    return { ok: false, reason: e?.message || 'checkout_failed' }
  }
}
