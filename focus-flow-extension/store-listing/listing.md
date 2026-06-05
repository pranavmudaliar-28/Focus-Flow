# Chrome Web Store Listing — Focus Flow

## Extension name
Focus Flow – Smart Deep Work Timer

## Short description (132 chars max)
Deep work timer with ambient sounds, site blocking, streak tracking & org mode. Free for individuals, built for teams.

## Full description (max 16,000 chars)

**Focus Flow helps you do your best work by removing distractions and building deep work habits.**

Whether you're a solo developer, student, or part of a team — Focus Flow gives you a focused environment to get things done.

---

### ⏱ Pomodoro-Style Timer

Start a focus session in one click. Choose from four presets (15, 25, 45, 90 min) or set your own. A beautiful ring timer counts down, and a browser alarm fires even if you close the popup.

---

### 🎵 Procedural Ambient Sounds

Nine hand-crafted soundscapes keep you in the zone:

- 🌧️ **Rain** — gentle shower, low rumble
- ⛈️ **Storm** — heavy, chaotic rain
- 🌲 **Forest** — leaves and birdsong
- 🌊 **Ocean** — rolling waves
- 🔥 **Fireplace** — warm crackling
- ☕ **Café** — ambient chatter
- 🍃 **Wind** — gentle breeze
- 🎧 **Brown Noise** — deep concentration
- 📻 **White Noise** — masks all distractions

All sounds are generated procedurally using the Web Audio API — no audio files to download, no server calls. They play in a pinned background tab so they keep going even after you close the popup.

---

### 🔒 Distraction Blocker

Blocks sites like Twitter, Instagram, TikTok, Reddit, Netflix and Discord while a session is active. Add your own custom domains. Sites redirect to a motivational focus page that shows your remaining time.

YouTube is allowed by default — it's a learning platform and many people use it for focus music.

---

### 📊 Stats & Streak Tracking

- 7-day activity heatmap
- Session history (up to 200 sessions)
- Daily streak counter with personal best
- Focus time totals (hours and minutes)

---

### 🏢 Organisation Mode (Team Feature)

Admins manage their team via the Focus Flow admin web app:

- Push a **global blocklist** to all employees — they cannot remove admin-blocked sites
- Send **announcements** that appear as banners inside the extension
- Set a **focus schedule** (auto-block during work hours)
- View **team analytics** — focus hours, compliance rates, leaderboard

Employees join by entering a 6-character org code. Once joined, admin policies sync automatically.

---

### 🔐 Privacy First

- No telemetry, no tracking pixels, no ad networks
- All personal data stored locally on your device (`chrome.storage`)
- Optional Firebase account for cloud sync — you control your data
- Open source friendly design

---

### ✅ Free for Individuals

Everything is free for personal use:
- Unlimited sessions
- All 9 ambient sounds
- Site blocking
- Streak tracking
- Stats and history

Team features require a Focus Flow organisation account.

---

## Category
Productivity

## Language
English

## Permissions justification

| Permission | Why it's needed |
|------------|----------------|
| `tabs` | Open the ambient audio tab (pinned, inactive), detect blocked sites |
| `storage` | Save session state, history, blocklist locally |
| `alarms` | Fire the session-end alarm even when the popup is closed |
| `notifications` | Show session start/end desktop notifications |
| `activeTab` | Read the current tab URL for blocking decisions |
| `scripting` | Inject the focus bar and session-complete overlay into pages |
| `webNavigation` | Intercept navigation to blocked sites before they load |
| `identity` | Google OAuth sign-in |
| `host_permissions: <all_urls>` | Required for site blocking across all domains |

---

## Screenshots needed (Chrome Web Store requires 1280×800 or 640×400)

1. **Popup — Timer active** — ring counting down, session name, ambient sound playing
2. **Popup — Idle setup** — task input, duration selection, sound grid
3. **Blocked page** — the glassmorphism redirect page with timer
4. **Stats tab** — heatmap + session history
5. **Block tab** — domain list with admin-locked sites (org mode)
6. **Admin dashboard** — web app team analytics overview

## Promotional tile (440×280)
Dark background, indigo gradient logo, tagline: "Focus without distraction. For individuals and teams."

## Small promo tile (920×680) — optional
Same design, larger format.

---

## Store URL (requested)
`https://chrome.google.com/webstore/detail/focus-flow`

## Support URL
`https://slasheasy.com/support`

## Privacy policy URL
`https://slasheasy.com/privacy`

---

## Version history

### v3.0.0
- Organisation mode: join with org code, sync admin blocklist, view announcements
- Session data synced to org analytics dashboard
- Admin blocklist locked (employees cannot remove admin-controlled sites)

### v2.1.0
- Persistent ambient audio in pinned background tab
- 9 procedurally generated soundscapes
- Layer mix controls per sound

### v1.0.0
- Initial release: timer, site blocking, streaks, stats
