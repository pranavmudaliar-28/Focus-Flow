import { Link } from 'react-router-dom'
import {
  Zap, Timer, Shield, Music2, Flame, Users, BarChart3,
  Check, ArrowRight, Globe, Building2, Bell, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// Replace with actual Globe Web Store URL after publishing
const CWS_URL = 'https://chrome.google.com/webstore'

const FEATURES = [
  {
    icon: Timer,
    title: 'Focus Timer',
    desc: 'Pomodoro-style countdown with a smooth SVG ring. Globe Alarms API keeps it running even after the popup closes.',
    color: 'text-indigo-400 bg-indigo-500/10',
  },
  {
    icon: Shield,
    title: 'Site Blocker',
    desc: 'Block Twitter, Reddit, TikTok and more during sessions. Admin-set policies push to your whole team automatically.',
    color: 'text-violet-400 bg-violet-500/10',
  },
  {
    icon: Music2,
    title: 'Ambient Sounds',
    desc: '9 procedural soundscapes — Rain, Forest, Café, Ocean, Brown Noise and more. Plays in a pinned tab after popup closes.',
    color: 'text-cyan-400 bg-cyan-500/10',
  },
  {
    icon: Flame,
    title: 'Streaks & Stats',
    desc: 'Daily streaks, 7-day activity heatmap, and full session history. Stay consistent and watch your habits build.',
    color: 'text-orange-400 bg-orange-500/10',
  },
  {
    icon: Users,
    title: 'Org Mode',
    desc: 'Join your team with a 6-char code. Admin policies sync automatically — locked blocklist, announcements, and schedule.',
    color: 'text-green-400 bg-green-500/10',
  },
  {
    icon: BarChart3,
    title: 'Team Analytics',
    desc: 'Admins see focus hours, compliance rates, and a leaderboard for the whole team. Export to CSV anytime.',
    color: 'text-yellow-400 bg-yellow-500/10',
  },
]

const HOW = [
  {
    step: '01',
    title: 'Install the extension',
    desc: 'Add Focus Flow to Chrome from the Web Store. Free, no credit card.',
  },
  {
    step: '02',
    title: 'Start a focus session',
    desc: 'Pick a task, set a duration, hit Start. Distracting sites are blocked automatically.',
  },
  {
    step: '03',
    title: 'Connect to your team',
    desc: 'Enter your org code (from your admin) to sync team policies, announcements, and session data.',
  },
]

const PLANS = [
  {
    name: 'Individual',
    price: 'Free',
    period: 'forever',
    desc: 'Perfect for solo focus',
    features: ['Unlimited sessions', 'All 9 ambient sounds', 'Site blocker', 'Streaks & stats', 'Local data — no account'],
    cta: 'Install free',
    ctaAction: () => window.open(CWS_URL, '_blank'),
    highlight: false,
  },
  {
    name: 'Starter Team',
    price: '$19',
    period: '/month',
    desc: 'For small teams · 14-day free trial',
    features: ['Everything in Individual', '10 team members', 'Global blocklist', 'Team announcements', 'Basic analytics'],
    cta: 'Start free trial',
    ctaTo: '/signup',
    highlight: false,
  },
  {
    name: 'Pro Team',
    price: '$49',
    period: '/month',
    desc: 'For growing teams · 14-day free trial',
    features: ['Everything in Starter', '50 team members', 'Advanced analytics', 'CSV export', 'Focus schedule enforcement', 'Priority support'],
    cta: 'Start free trial',
    ctaTo: '/signup',
    highlight: true,
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Background orbs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-indigo-600/8 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-[300px] w-[300px] rounded-full bg-cyan-600/6 blur-3xl" />
      </div>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm tracking-tight">Focus Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Get started free <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <Badge variant="outline" className="mb-6 text-xs px-3 py-1 border-indigo-500/30 text-indigo-300">
          Free for individuals · Team plans from $19/mo
        </Badge>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Deep work made simple,{' '}
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            for individuals and teams.
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          A Globe extension that combines a Pomodoro timer, ambient sounds, site blocking,
          and team org mode — so you and your team can do your best work, every day.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Button size="lg" className="h-11 px-7 text-base gap-2" onClick={() => window.open(CWS_URL, '_blank')}>
            <Globe className="h-4 w-4" />
            Install free on Chrome
          </Button>
          <Button size="lg" variant="outline" className="h-11 px-7 text-base" asChild>
            <Link to="/signup">
              Set up for your team <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Social proof strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
          {['No account needed for individuals', '9 ambient soundscapes', 'Team policy sync', '100% free to start'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-400" />{item}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Everything you need to focus</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for individuals who want to build deep work habits, and teams who need consistent, measurable productivity.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <Card key={title} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── For Teams ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4 text-xs border-green-500/30 text-green-400">
              Team feature
            </Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4 leading-tight">
              Manage focus across{' '}
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                your whole team
              </span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Admins control what their team sees and blocks. Employees just enter an org code and everything syncs automatically.
            </p>
            <div className="space-y-5">
              {[
                { icon: Lock, title: 'Admin-locked blocklist', desc: 'Push a site blocklist that employees cannot override. Twitter, Reddit, TikTok — all blocked during sessions.' },
                { icon: Bell, title: 'Team announcements', desc: 'Send messages that appear as banners inside every employee\'s extension.' },
                { icon: Timer, title: 'Focus schedule', desc: 'Set work hours (e.g. 9am–5pm Mon–Fri). Sites are blocked automatically — no active session required.' },
                { icon: BarChart3, title: 'Compliance analytics', desc: 'See who\'s focusing, for how long, and at what completion rate. Export to CSV.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-8" asChild>
              <Link to="/signup">Create your organisation <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
          </div>

          {/* Org code card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl blur-xl" />
            <Card className="relative border-primary/20 bg-card/80 backdrop-blur">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Focus Flow · Org Mode</span>
                  <Badge variant="success" className="ml-auto text-xs">Connected</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Organisation</p>
                  <p className="font-bold text-foreground">Acme Engineering Team</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono bg-secondary px-2 py-1 rounded text-primary tracking-widest">AB12CD</code>
                    <span className="text-xs text-muted-foreground">← share this code with your team</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Admin-locked blocklist</p>
                  <div className="space-y-1.5">
                    {['twitter.com', 'reddit.com', 'instagram.com', 'tiktok.com'].map((d) => (
                      <div key={d} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-indigo-500/5 border border-indigo-500/15">
                        <span className="text-xs font-mono text-muted-foreground">{d}</span>
                        <Lock className="h-3 w-3 text-indigo-400" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-md bg-primary/8 border border-primary/20 text-xs text-indigo-300">
                  📢 Team stand-up at 3pm today — stay focused until then!
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Up and running in 60 seconds</h2>
          <p className="text-muted-foreground">No configuration required for individuals. Team setup takes under 5 minutes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {HOW.map(({ step, title, desc }, i) => (
            <div key={step} className="relative text-center">
              {i < HOW.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-1/2 w-full h-px bg-gradient-to-r from-border to-transparent" />
              )}
              <div className="relative inline-flex h-10 w-10 rounded-full bg-primary/15 border border-primary/30 items-center justify-center mb-4 font-mono text-sm font-bold text-primary">
                {step}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Simple, transparent pricing</h2>
          <p className="text-muted-foreground">Free for individuals. Affordable for teams.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${plan.highlight ? 'border-primary/50 shadow-lg shadow-primary/10' : ''}`}
            >
              {plan.highlight && (
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
                  <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                {plan.ctaTo ? (
                  <Button
                    size="sm"
                    variant={plan.highlight ? 'default' : 'outline'}
                    className="w-full"
                    asChild
                  >
                    <Link to={plan.ctaTo}>{plan.cta}</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={plan.ctaAction}
                  >
                    <Globe className="h-3.5 w-3.5" />{plan.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-violet-500/5 to-transparent p-12 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <h2 className="text-3xl font-bold text-foreground mb-3">Ready to do your best work?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of individuals and teams who've made deep work a daily habit with Focus Flow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-7 gap-2" onClick={() => window.open(CWS_URL, '_blank')}>
              <Globe className="h-4 w-4" />Install for free
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-7" asChild>
              <Link to="/signup">
                <Building2 className="h-4 w-4 mr-2" />Set up for your team
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">Focus Flow</span>
            <span>· by Slasheasy</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://slasheasy.com/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="https://slasheasy.com/support" className="hover:text-foreground transition-colors">Support</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Admin login</Link>
          </div>
          <p>© 2025 Slasheasy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
