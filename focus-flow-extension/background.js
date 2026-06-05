// Focus Flow – background.js  v2.1
// Audio is now handled by a persistent audio.html tab.
// background.js manages: session timing, blocking, notifications,
// and opening/closing the audio tab.

'use strict';

import { db, doc, onSnapshot } from './firebase-config.js';


const AUDIO_PAGE = chrome.runtime.getURL('audio.html');

/* ════════════════════════════════════════════════════════════
   AUDIO TAB MANAGEMENT
════════════════════════════════════════════════════════════ */
async function getAudioTabId() {
  try {
    const tabs = await chrome.tabs.query({ url: AUDIO_PAGE });
    return tabs[0]?.id ?? null;
  } catch(_) { return null; }
}

async function ensureAudioTab() {
  const existing = await getAudioTabId();
  if (existing) return existing;

  // Open a small pinned tab for audio
  const tab = await chrome.tabs.create({
    url:    AUDIO_PAGE,
    active: false,  // don't steal focus
    pinned: true,   // keep it compact
  });
  return tab.id;
}

async function closeAudioTab() {
  try {
    const id = await getAudioTabId();
    if (id) await chrome.tabs.remove(id);
  } catch(_) {}
  await chrome.storage.local.set({ audioTabOpen: false });
}

/* ════════════════════════════════════════════════════════════
   REAL-TIME BLOCKLIST SYNC
════════════════════════════════════════════════════════════ */
let orgPolicyUnsub = null;

function setupOrgPolicyListener(orgId) {
  if (orgPolicyUnsub) {
    orgPolicyUnsub();
    orgPolicyUnsub = null;
  }
  if (!orgId) return;

  orgPolicyUnsub = onSnapshot(doc(db, 'organisations', orgId, 'policy', 'current'), (snap) => {
    if (!snap.exists()) return;
    const adminBlocklist = snap.data().blocklist || [];
    chrome.storage.local.set({ orgAdminBlocklist: adminBlocklist });
  }, (err) => {
    console.warn('[FF] orgPolicy listener error:', err);
  });
}

// Watch for orgId changes (login/logout/join) and enforce new blocklists on open tabs instantly
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.orgId) {
    setupOrgPolicyListener(changes.orgId.newValue);
  }

  // Handle instant blocking of open tabs if orgAdminBlocklist changes
  if (changes.orgAdminBlocklist) {
    const newBlocklist = changes.orgAdminBlocklist.newValue || [];
    chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
      for (const tab of tabs) {
        if (!tab.url) continue;
        const host = new URL(tab.url).hostname.replace(/^www\./, '');
        const isBlocked = newBlocklist.some(d => host === d || host.endsWith('.' + d));
        
        // If the site is newly blocked and we aren't already on the blocked page, redirect instantly
        if (isBlocked && !tab.url.includes(chrome.runtime.id)) {
          const params = new URLSearchParams({
            site: host,
            remaining: '0',
            session: 'Admin Policy',
          });
          chrome.tabs.update(tab.id, { url: chrome.runtime.getURL(`blocked.html?${params}`) });
        }
      }
    });
  }
});

// Initialize on service worker start
chrome.storage.local.get(['orgId'], (res) => {
  if (res.orgId) setupOrgPolicyListener(res.orgId);
});

/* ════════════════════════════════════════════════════════════
   INSTALL
════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════
   ANNOUNCEMENT NOTIFICATIONS
════════════════════════════════════════════════════════════ */
async function showAnnouncementNotification(message, orgName, annId) {
  try {
    const { settings, unreadAnnouncements = 0 } = await chrome.storage.local.get(['settings', 'unreadAnnouncements']);
    if (settings?.notificationsEnabled === false) return;

    chrome.notifications.create(`ann_${Date.now()}`, {
      type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: `📢 ${orgName || 'Team'} announcement`,
      message,
      priority: 2,
      requireInteraction: true,
    });

    const count = unreadAnnouncements + 1;
    await chrome.storage.local.set({ unreadAnnouncements: count, lastNotifiedAnnId: annId });
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  } catch(e) { console.warn('[FF] showAnnouncementNotification:', e); }
}

// Re-register alarm on browser restart (alarms are lost on restart without this)
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('checkOrgAnnouncements', { periodInMinutes: 1 });
});

// Firestore REST poll — runs even when popup is never opened
async function checkAnnouncements() {
  try {
    const { orgId, firebaseIdToken, lastNotifiedAnnId, orgName } =
      await chrome.storage.local.get(['orgId', 'firebaseIdToken', 'lastNotifiedAnnId', 'orgName']);
    if (!orgId || !firebaseIdToken) return;

    const url = `https://firestore.googleapis.com/v1/projects/focus-flow-7e11e/databases/(default)/documents/organisations/${orgId}/announcements`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${firebaseIdToken}` } });
    if (!resp.ok) return;

    const { documents = [] } = await resp.json();
    const active = documents.find(d => d.fields?.active?.booleanValue === true);
    if (!active) return;

    const annId   = active.name.split('/').pop();
    const message = active.fields?.message?.stringValue;
    if (annId !== lastNotifiedAnnId && message) {
      await showAnnouncementNotification(message, orgName, annId);
    }
  } catch(e) { console.warn('[FF] checkAnnouncements:', e); }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try { chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }); } catch(_) {}
  }
  // Register periodic announcement check (1 min = minimum Chrome allows)
  chrome.alarms.create('checkOrgAnnouncements', { periodInMinutes: 1 });

  try {
    const stored = await chrome.storage.local.get([
      'focusState','settings','history','blocklist','streaks','sound'
    ]);
    const d = {};
    if (!stored.settings)   d.settings   = { defaultDuration:25, notificationsEnabled:true };
    if (!stored.history)    d.history     = [];
    if (!stored.streaks)    d.streaks     = { current:0, best:0, lastDate:null };
    if (!stored.sound)      d.sound       = { id:null, volume:0.6 };
    if (!stored.focusState) d.focusState  = { active:false, startTime:null, endTime:null, duration:25, sessionName:'' };
    if (!stored.blocklist)  d.blocklist   = [
      'twitter.com','x.com','facebook.com','instagram.com',
      'tiktok.com','reddit.com','netflix.com','twitch.tv','discord.com',
    ];
    if (Object.keys(d).length) await chrome.storage.local.set(d);
  } catch(e) { console.error('[FF] install error:', e); }
});

/* ════════════════════════════════════════════════════════════
   MESSAGE HANDLER
════════════════════════════════════════════════════════════ */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {

        case 'START_FOCUS':
          await startFocusSession(msg.data || {});
          sendResponse({ ok:true });
          break;

        case 'STOP_FOCUS':
          await stopFocusSession(msg.completed === true);
          sendResponse({ ok:true });
          break;

        case 'GET_STATE': {
          const data = await chrome.storage.local.get([
            'focusState','settings','history','blocklist','streaks','sound','audioTabOpen'
          ]);
          sendResponse(data);
          break;
        }

        case 'UPDATE_BLOCKLIST':
          if (Array.isArray(msg.blocklist)) {
            await chrome.storage.local.set({ blocklist: msg.blocklist });
          }
          sendResponse({ ok:true });
          break;

        // Popup asks us to open the audio tab and send it a play command
        case 'PLAY_SOUND': {
          const vol = msg.volume ?? 0.6;
          await chrome.storage.local.set({
            sound:    { id: msg.soundId, volume: vol },
            audioCmd: { type:'PLAY', id: msg.soundId, volume: vol },
          });
          await ensureAudioTab();
          sendResponse({ ok:true });
          break;
        }

        case 'STOP_SOUND':
          await chrome.storage.local.set({
            sound:    { id:null, volume:0.6 },
            audioCmd: { type:'STOP' },
          });
          sendResponse({ ok:true });
          break;

        case 'SET_VOLUME': {
          const { sound } = await chrome.storage.local.get('sound');
          await chrome.storage.local.set({
            sound:    { id: sound?.id||null, volume: msg.volume },
            audioCmd: { type:'VOLUME', volume: msg.volume },
          });
          sendResponse({ ok:true });
          break;
        }

        case 'SET_LAYER':
          await chrome.storage.local.set({
            audioCmd: { type:'LAYER', index: msg.layer, volume: msg.volume },
          });
          sendResponse({ ok:true });
          break;

        case 'ANNOUNCE_NOTIFICATION':
          await showAnnouncementNotification(msg.message, msg.orgName, msg.annId);
          sendResponse({ ok: true });
          break;

        case 'UPDATE_ORG_BLOCKLIST':
          if (Array.isArray(msg.blocklist)) {
            await chrome.storage.local.set({ orgAdminBlocklist: msg.blocklist });
          }
          sendResponse({ ok: true });
          break;

        default:
          sendResponse({ error:'unknown' });
      }
    } catch(err) {
      console.error('[FF] msg error:', err);
      try { sendResponse({ error: String(err) }); } catch(_) {}
    }
  })();
  return true;
});

/* ════════════════════════════════════════════════════════════
   START SESSION
════════════════════════════════════════════════════════════ */
async function startFocusSession(data) {
  const duration = Math.max(1, parseInt(data.duration) || 25);
  const now      = Date.now();
  const state    = {
    active:      true,
    startTime:   now,
    endTime:     now + duration * 60 * 1000,
    duration,
    sessionName: (data.sessionName || 'Deep Work').slice(0, 80),
  };
  await chrome.storage.local.set({ focusState: state });
  await chrome.alarms.clear('focusEnd');
  chrome.alarms.create('focusEnd', { delayInMinutes: duration });

  try {
    const { settings } = await chrome.storage.local.get('settings');
    if (settings?.notificationsEnabled !== false) {
      chrome.notifications.create(`fs_${now}`, {
        type:'basic', iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title:'🎯 Focus Session Started',
        message:`${state.sessionName} · ${duration} min`,
        priority:1,
      });
    }
  } catch(_) {}
}

/* ════════════════════════════════════════════════════════════
   STOP SESSION
════════════════════════════════════════════════════════════ */
let _stopping = false;

async function stopFocusSession(completed) {
  if (_stopping) return;
  _stopping = true;
  try {
    const stored = await chrome.storage.local.get(['focusState','history','settings','streaks']);
    const state  = stored.focusState;
    if (!state?.active) { _stopping = false; return; }

    // Guard against null/corrupted startTime — use endTime - duration as fallback
    const startMs = state.startTime || (state.endTime ? state.endTime - (state.duration||25)*60000 : Date.now());
    const elapsed = Math.max(1, Math.round((Date.now() - startMs) / 60000));
    const entry   = {
      id: Date.now(), sessionName: state.sessionName||'Deep Work',
      duration: state.duration||25, elapsed, completed,
      date: new Date().toISOString(),
    };

    const history = stored.history || [];
    history.unshift(entry);
    if (history.length > 200) history.length = 200;

    const streaks = stored.streaks || { current:0, best:0, lastDate:null };
    const today   = new Date().toDateString();
    if (completed) {
      if (streaks.lastDate !== today) {
        streaks.current++;
        streaks.lastDate = today;
        if (streaks.current > streaks.best) streaks.best = streaks.current;
      }
    } else {
      if (streaks.lastDate !== today) streaks.current = 0;
    }

    await chrome.storage.local.set({
      focusState: { active:false, startTime:null, endTime:null, duration:25, sessionName:'' },
      history, streaks,
    });
    await chrome.alarms.clear('focusEnd');

    // Push session-complete to active tab
    try {
      const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
      const tid  = tabs.find(t => !t.url?.startsWith(chrome.runtime.getURL('')))?.id;
      if (tid) {
        chrome.tabs.sendMessage(tid, {
          type:'SESSION_COMPLETE', completed, elapsed, sessionName: entry.sessionName,
        }).catch(()=>{});
      }
    } catch(_) {}

    // Notification
    try {
      const { settings } = await chrome.storage.local.get('settings');
      if (settings?.notificationsEnabled !== false) {
        chrome.notifications.create(`fe_${Date.now()}`, {
          type:'basic', iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: completed ? '✅ Session Complete!' : '⏹ Session Ended',
          message: completed
            ? `Focused ${elapsed} min on "${entry.sessionName}". Great work!`
            : `Session ended after ${elapsed} min.`,
          priority:2,
        });
      }
    } catch(_) {}

  } catch(err) {
    console.error('[FF] stop error:', err);
  } finally { _stopping = false; }
}

/* ════════════════════════════════════════════════════════════
   ALARM
════════════════════════════════════════════════════════════ */
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'focusEnd') stopFocusSession(true);
  if (alarm.name === 'checkOrgAnnouncements') checkAnnouncements();
});

/* ════════════════════════════════════════════════════════════
   NAV BLOCKING
════════════════════════════════════════════════════════════ */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!/^https?:\/\//i.test(details.url)) return;
  try {
    const stored = await chrome.storage.local.get(['focusState', 'blocklist', 'globalBlocklist', 'orgAdminBlocklist']);
    const host   = new URL(details.url).hostname.replace(/^www\./, '');
    const orgBl  = stored.orgAdminBlocklist || [];
    const sessionActive = stored.focusState?.active;

    // Tier 1: admin-blocked sites are ALWAYS enforced — no session needed
    const adminHit = orgBl.some(d => host === d || host.endsWith('.' + d));

    // Exit early if no session and not an admin-blocked site
    if (!sessionActive && !adminHit) return;

    // Tier 2: during an active session also check personal + global lists
    let hit = adminHit;
    if (sessionActive) {
      const userBl   = stored.blocklist || [];
      const globalBl = stored.globalBlocklist || [];
      const bl = [...new Set([...userBl, ...globalBl, ...orgBl])];
      hit = bl.some(d => host === d || host.endsWith('.' + d));
    }

    if (hit) {
      const rem = sessionActive
        ? Math.max(0, Math.round((stored.focusState.endTime - Date.now()) / 60000))
        : 0;
      const params = new URLSearchParams({
        site:      host,
        remaining: String(rem),
        session:   sessionActive ? (stored.focusState.sessionName || 'Deep Work') : 'Admin Policy',
      });
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL(`blocked.html?${params}`) });
    }
  } catch(e) { console.warn('[FF] nav:', e); }
}, { url:[{ schemes:['http','https'] }] });
