import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is missing. Using default initialization.');
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    admin.initializeApp();
  }
}

const db = admin.firestore();

// We need the raw body to verify the Stripe webhook signature
export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

const PLAN_SEATS = { starter: 10, pro: 50 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await buffer(req);
    // If webhook secret is configured, verify signature. Otherwise, for test purpose only, construct event directly.
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // DANGEROUS: Only do this for local test projects where you haven't set up webhook secrets!
      console.warn('No STRIPE_WEBHOOK_SECRET found. Bypassing signature verification (test mode only).');
      event = JSON.parse(rawBody.toString('utf8'));
    }
  } catch (e) {
    console.error('Webhook Error:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const orgId = s.metadata?.orgId || s.client_reference_id;
      const plan  = s.metadata?.plan || 'pro';
      
      if (orgId) {
        await db.doc(`organisations/${orgId}`).set({
          subscriptionStatus: 'active',
          plan,
          seats: PLAN_SEATS[plan] || 50,
          stripeCustomerId: s.customer || null,
          stripeSubscriptionId: s.subscription || null,
        }, { merge: true });
        console.log(`Updated org ${orgId} to plan ${plan}`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const orgId = event.data.object.metadata?.orgId;
      if (orgId) {
        await db.doc(`organisations/${orgId}`).set({ subscriptionStatus: 'expired' }, { merge: true });
        console.log(`Expired org ${orgId}`);
      }
    }
    
    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('[stripeWebhook] handler error:', e);
    return res.status(500).send('handler error');
  }
}
