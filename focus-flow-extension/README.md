# 🎯 Focus Flow – Smart Deep Work Timer

A powerful Chrome extension for deep work sessions with distraction blocking, ambient sounds, productivity insights, and streak tracking.

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Focus Sessions** | Set custom session names & durations (15, 25, 45, 60 min) |
| 🔒 **Distraction Blocker** | Auto-blocks distracting sites during focus time |
| 🌊 **Ambient Sounds** | 6 procedurally generated sounds: Rain, Forest, Café, Ocean, Fireplace, White Noise |
| 📊 **Productivity Stats** | Total sessions, focus hours, best streaks |
| 🔥 **Streak Tracking** | Daily streak motivation system |
| 📜 **Session History** | Full log of past focus sessions |
| 🔔 **Smart Notifications** | Session start/end alerts |
| 🎨 **Beautiful UI** | Animated ring timer, glassmorphism design |

## 📦 Installation

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `focus-flow-extension` folder
5. The 🎯 icon appears in your toolbar — click it to start!

## 🚀 How to Use

1. **Click the extension icon** to open Focus Flow
2. **Type your session goal** (e.g., "Write report", "Code feature")
3. **Choose duration**: 15, 25, 45, or 60 minutes
4. **Hit Start** — a glowing ring timer begins counting down
5. **Blocked sites** redirect to a motivational blocked page
6. **Ambient sounds** help you enter deep flow state

## 🔒 Blocked Sites (Default)

YouTube, Twitter/X, Facebook, Instagram, TikTok, Reddit, Netflix, Twitch, Discord

You can add/remove any domain from the **Blocklist** tab.

## 💡 What Makes This Unique

- **Procedurally generated ambient audio** — no external files needed
- **Subtle focus bar** injected into allowed sites during sessions
- **Session naming** helps you stay intentional about your work
- **Streak system** builds long-term focus habits
- Fully local — no account, no server, no data collection

## 🗂 File Structure

```
focus-flow-extension/
├── manifest.json      # Extension config
├── background.js      # Service worker (timer, blocking logic)
├── content.js         # Injected focus bar on allowed sites
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── blocked.html       # Page shown when a blocked site is visited
└── icons/             # Extension icons (16, 48, 128px)
```
