# ⚡ Focus Flow

A comprehensive productivity ecosystem designed to help you eliminate distractions, track deep work, and build better habits. Focus Flow consists of two synchronized components: a powerful Web Dashboard and a smart Browser Extension.

## 🚀 Ecosystem Overview

### 1. Web Application (`/focus-flow-admin`)
A beautifully designed, dark-themed React dashboard built with Vite, TailwindCSS, and Firebase.
- **Secure Authentication:** Complete Firebase Auth flow (Login, Signup, Forgot Password).
- **Billing & Subscriptions:** Integrated Stripe checkout for premium plans.
- **Analytics Dashboard:** Visualizes your focus sessions, blocked distractions, and productivity trends.
- **Settings & Profile:** Manage your account, billing, and custom site blocklists.

### 2. Browser Extension (`/focus-flow-extension`)
A lightweight Chrome extension that enforces your focus sessions directly in your browser.
- **Focus Timer:** Start and stop focus sessions from the popup.
- **Site Blocking:** Automatically blocks distracting websites (e.g., social media) when a session is active.
- **Cloud Sync:** Syncs your total focus time back to your Web Application dashboard via Firebase.

---

## 🛠️ Tech Stack
- **Frontend:** React.js (Vite), TailwindCSS, Lucide Icons, Shadcn UI
- **Backend/Auth:** Firebase Authentication, Firestore Database
- **Payments:** Stripe API
- **Extension:** Chrome Manifest V3, JavaScript, HTML/CSS

---

## 💻 Getting Started

### Setting up the Web Dashboard
1. Navigate to the admin directory:
   ```bash
   cd focus-flow-admin
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Create a `.env.local` file and add your Firebase and Stripe keys.
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173` in your browser.

### Setting up the Browser Extension
1. Navigate to the extension directory:
   ```bash
   cd focus-flow-extension
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Install it in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (top right corner).
   - Click **Load unpacked** and select the `/focus-flow-extension` folder.

---

## 🧪 Testing
A comprehensive set of test cases covering both the Web App and the Extension is available in the root folder: `FocusFlow_TestCases.csv`.

---

## 🔒 Security & Privacy
Focus Flow uses Firebase Email Enumeration Protection and secure routing to ensure user data remains private. Authentication is fully handled by Google Firebase.
