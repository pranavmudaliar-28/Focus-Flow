// Focus Flow — Stripe checkout + webhook (Firebase Cloud Functions, Gen 2)
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const Stripe = require('stripe')

admin.initializeApp()
const db = admin.firestore()

const STRIPE_SECRET_KEY     = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')

const PRICE_IDS  = {
  starter: 'price_1TeZ4cCeRBK66yLJTsz5n7W6',
  pro:     'price_1TeZ5VCeRBK66yLJwnSb0iln',
}
const PLAN_SEATS = { starter: 10, pro: 50 }

// 1) Create a Stripe Checkout Session — called from the admin app
exports.createCheckoutSession = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const { plan, orgId, appUrl } = req.data || {}
  const price = PRICE_IDS[plan]
  if (!price || !orgId) throw new HttpsError('invalid-argument', 'Invalid plan or organisation.')

  // Only the org's admin may start checkout for that org
  const orgSnap = await db.doc(`organisations/${orgId}`).get()
  if (!orgSnap.exists || orgSnap.data().adminUid !== req.auth.uid) {
    throw new HttpsError('permission-denied', 'You are not the admin of this organisation.')
  }

  const stripe = Stripe(STRIPE_SECRET_KEY.value())
  const base = appUrl || 'http://localhost:5173'
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: `${base}/billing?upgraded=${plan}`,
    cancel_url:  `${base}/billing`,
    client_reference_id: orgId,
    customer_email: req.auth.token.email || undefined,
    metadata: { orgId, plan },
    subscription_data: { metadata: { orgId, plan } },
  })
  return { url: session.url }
})

// 2) Stripe webhook — authoritative subscription state writer
exports.stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = Stripe(STRIPE_SECRET_KEY.value())
  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET.value()
    )
  } catch (e) {
    res.status(400).send(`Webhook Error: ${e.message}`)
    return
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object
      const orgId = s.metadata?.orgId || s.client_reference_id
      const plan  = s.metadata?.plan || 'pro'
      if (orgId) {
        await db.doc(`organisations/${orgId}`).set({
          subscriptionStatus: 'active',
          plan,
          seats: PLAN_SEATS[plan] || 50,
          stripeCustomerId: s.customer || null,
          stripeSubscriptionId: s.subscription || null,
        }, { merge: true })
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const orgId = event.data.object.metadata?.orgId
      if (orgId) {
        await db.doc(`organisations/${orgId}`).set({ subscriptionStatus: 'expired' }, { merge: true })
      }
    }
    res.json({ received: true })
  } catch (e) {
    console.error('[stripeWebhook] handler error:', e)
    res.status(500).send('handler error')
  }
})
