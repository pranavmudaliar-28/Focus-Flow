// Focus Flow – popup.js  v3.0
// Phase 3: Org Mode — team policy sync, admin blocklist, org announcements, session reporting

import {
  auth, db, doc, collection, query, where,
  getDoc, addDoc, setDoc, onSnapshot,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged,
  serverTimestamp,
} from './firebase-config.js';

let appState     = {};
let selDuration  = 25;
let timerTick    = null;
let isSignupMode = false;
let orgState     = { orgId: null, orgName: null, adminBlocklist: [] };

const SOUND_NAMES = {
  rain:'🌧️ Rain', storm:'⛈️ Storm', forest:'🌲 Forest',
  ocean:'🌊 Ocean', fire:'🔥 Fireplace', cafe:'☕ Café',
  wind:'🍃 Wind', brown:'🎧 Brown Noise', white:'📻 White Noise',
};

/* ══════════════════════════════════════════════════════════
   RUNTIME GUARD
══════════════════════════════════════════════════════════ */
function alive() {
  try { return !!(chrome?.runtime?.id); } catch(_) { return false; }
}
function safeSend(msg, cb) {
  if (!alive()) return;
  try {
    chrome.runtime.sendMessage(msg, r => {
      if (chrome.runtime.lastError) return;
      cb && cb(r);
    });
  } catch(e) { console.warn('[popup]', e); }
}

/* ══════════════════════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════════════════════ */
// Critical & Emergency are non-dismissible — the user must acknowledge them.
const ANN_PRIORITIES = {
  information: { icon: '📢', dismissible: true,  rank: 0 },
  important:   { icon: '⚠️', dismissible: true,  rank: 1 },
  critical:    { icon: '🛑', dismissible: false, rank: 2 },
  emergency:   { icon: '🚨', dismissible: false, rank: 3 },
};
const annMeta = (p) => ANN_PRIORITIES[p] || ANN_PRIORITIES.information;

async function getIdSet(key) {
  const res = await chrome.storage.local.get([key]);
  return Array.isArray(res[key]) ? res[key] : [];
}
async function addIdToSet(key, id) {
  const arr = await getIdSet(key);
  if (!arr.includes(id)) { arr.push(id); await chrome.storage.local.set({ [key]: arr }); }
}

// items: [{ id, message, priority }] — rebuilds the stacked banner list.
async function renderAnnouncements(items) {
  const list = g('announcement-list');
  if (!list) return;

  const dismissed = await getIdSet('dismissedAnnIds');
  const visible = items
    .filter((it) => it && it.id && it.message && !dismissed.includes(it.id))
    .sort((a, b) => annMeta(b.priority).rank - annMeta(a.priority).rank);

  list.innerHTML = '';
  for (const it of visible) {
    const meta  = annMeta(it.priority);
    const level = ANN_PRIORITIES[it.priority] ? it.priority : 'information';

    const row = document.createElement('div');
    row.className = `ann p-${level}`;
    row.dataset.annId = it.id;

    const ico = document.createElement('span');
    ico.className = 'ann-ico';
    ico.textContent = meta.icon;

    const msg = document.createElement('span');
    msg.className = 'ann-msg';
    msg.textContent = it.message;

    row.appendChild(ico);
    row.appendChild(msg);

    const btn = document.createElement('button');
    if (meta.dismissible) {
      btn.className = 'ann-act ann-x';
      btn.title = 'Dismiss';
      btn.textContent = '×';
    } else {
      btn.className = 'ann-act ann-ack';
      btn.title = 'Acknowledge to dismiss';
      btn.textContent = 'Acknowledge';
    }
    btn.addEventListener('click', () => dismissAnnouncement(it.id, row));
    row.appendChild(btn);

    list.appendChild(row);
  }

  // Everything visible in the popup counts as "seen" — drives the unread badge.
  for (const it of visible) await addIdToSet('seenAnnIds', it.id);
  clearBadge();
}

async function dismissAnnouncement(id, node) {
  await addIdToSet('dismissedAnnIds', id);
  if (node?.parentNode) node.parentNode.removeChild(node);
  clearBadge();
}

// Popup is open → user is actively viewing, so the unread badge is cleared.
// The background poll recomputes the real unread count once the popup closes.
function clearBadge() {
  if (chrome.action) chrome.action.setBadgeText({ text: '' });
  chrome.storage.local.set({ unreadAnnouncements: 0 });
}

/* ══════════════════════════════════════════════════════════
   INIT & AUTH
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  initAuthUI();

  // Clear badge whenever popup opens
  if (chrome.action) {
    chrome.action.setBadgeText({ text: '' });
    chrome.storage.local.set({ unreadAnnouncements: 0 });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setDisp('auth-overlay', 'none');
      setDisp('user-info-bar', 'flex');
      const emailEl = g('user-email-display'); if (emailEl) emailEl.textContent = user.email || 'User';

      // Store Firebase ID token so background.js can call Firestore REST API
      try {
        const token = await user.getIdToken();
        chrome.storage.local.set({ firebaseIdToken: token, firebaseUid: user.uid });
      } catch(_) {}

      // Restore org connection from local storage BEFORE starting global sync, so the
      // global announcement listener's `if (orgState.orgId) return` guard is reliable
      // and never clobbers org announcements with an empty render.
      const stored = await chrome.storage.local.get(['orgId', 'orgName']);
      if (stored.orgId) {
        orgState.orgId  = stored.orgId;
        orgState.orgName = stored.orgName;
      }

      startCloudSync();

      if (stored.orgId) {
        startOrgSync(stored.orgId);
      }

      await loadState();
      initNav();
      initTimer();
      initSounds();
      initBlock();
      initOrgConnect();
      initSettings();
      renderOrgUI();
      initAttendance();
    } else {
      setDisp('auth-overlay', 'flex');
      setDisp('user-info-bar', 'none');
      setDisp('org-badge', 'none');
      chrome.storage.local.remove(['firebaseIdToken', 'firebaseUid']);
    }
  });
});

function initAuthUI() {
  const btnAction = g('btn-auth-action');
  const btnGoogle = g('btn-google');
  const btnToggle = g('btn-auth-toggle');
  const btnLogout = g('btn-logout');
  const errBox    = g('auth-error');
  const loader    = g('auth-loader');
  const pwdToggle = g('auth-pwd-toggle');

  // Null-safe UI helpers — guard against any missing element (avoids null .style crashes).
  const setLoader = (on) => { if (loader) loader.style.display = on ? 'block' : 'none'; };
  const hideErr   = () => { if (errBox) errBox.style.display = 'none'; };

  if (pwdToggle) {
    pwdToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const pwdInp = g('auth-pwd');
      if (pwdInp.type === 'password') {
        pwdInp.type = 'text';
        pwdToggle.textContent = '🙈';
      } else {
        pwdInp.type = 'password';
        pwdToggle.textContent = '👁️';
      }
    });
  }

  btnToggle.addEventListener('click', () => {
    isSignupMode = !isSignupMode;
    g('auth-mode-title').textContent = isSignupMode ? 'Sign Up' : 'Log In';
    btnAction.textContent = isSignupMode ? 'Sign Up' : 'Log In';
    btnToggle.textContent = isSignupMode ? 'Already have an account? Log In' : 'Need an account? Sign Up';
    hideErr();
  });

  btnLogout.addEventListener('click', () => { signOut(auth); });

  btnAction.addEventListener('click', async () => {
    const email = g('auth-email').value.trim();
    const pwd   = g('auth-pwd').value;
    if (!email || !pwd) return showError('Please fill in both fields');
    setLoader(true);
    hideErr();
    try {
      if (isSignupMode) {
        await createUserWithEmailAndPassword(auth, email, pwd);
      } else {
        await signInWithEmailAndPassword(auth, email, pwd);
      }
    } catch(e) { showError(e.message); }
    finally { setLoader(false); }
  });

  btnGoogle.addEventListener('click', async () => {
    setLoader(true);
    hideErr();
    try {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          setLoader(false);
          return showError(chrome.runtime.lastError?.message || 'Google Auth failed');
        }
        try {
          const credential = GoogleAuthProvider.credential(null, token);
          await signInWithCredential(auth, credential);
        } catch(e) { showError(e.message); }
        finally { setLoader(false); }
      });
    } catch(e) { showError(e.message); setLoader(false); }
  });
}

function showError(msg) {
  const el = g('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

/* ══════════════════════════════════════════════════════════
   CLOUD SYNC (global settings)
══════════════════════════════════════════════════════════ */
// Track active listeners so they can be cleaned up on re-init
let _cloudUnsubs = [];

function stopCloudSync() {
  _cloudUnsubs.forEach(u => { try { u(); } catch(_) {} });
  _cloudUnsubs = [];
}

function startCloudSync() {
  stopCloudSync(); // Clean up any existing listeners before attaching new ones

  const unsubAnn = onSnapshot(doc(db, 'global_settings', 'announcements'), async (snap) => {
    if (orgState.orgId) return; // org announcements take over for org members
    if (snap.exists()) {
      const d = snap.data();
      if (d.active && d.message) {
        // Route the single global announcement through the shared renderer so it
        // gets the dismiss button too. ID embeds the message so a changed message
        // re-appears after a prior dismissal.
        await renderAnnouncements([{
          id: `global:${d.message}`,
          message: d.message,
          priority: d.priority || 'information',
        }]);
        return;
      }
    }
    await renderAnnouncements([]);
  }, () => {});

  const unsubBl = onSnapshot(doc(db, 'global_settings', 'blocklist'), (snap) => {
    if (snap.exists()) {
      chrome.storage.local.set({ globalBlocklist: snap.data().sites || [] });
    }
  }, () => {});

  _cloudUnsubs = [unsubAnn, unsubBl];
}

/* ══════════════════════════════════════════════════════════
   ORG SYNC
══════════════════════════════════════════════════════════ */
function startOrgSync(orgId) {
  // Admin policy (blocklist) sync is now handled in background.js in real-time.
  // We just read the latest state from local storage.
  chrome.storage.local.get(['orgAdminBlocklist'], (res) => {
    orgState.adminBlocklist = res.orgAdminBlocklist || [];
    renderAdminBlocklist();
  });

  // Watch for background.js updating the blocklist while the popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.orgAdminBlocklist) {
      orgState.adminBlocklist = changes.orgAdminBlocklist.newValue || [];
      renderAdminBlocklist();
    }
  });

  // Listen to active org announcements — these override global ones
  onSnapshot(
    query(
      collection(db, 'organisations', orgId, 'announcements'),
      where('active', '==', true)
    ),
    async (snap) => {
      // Render ALL active announcements (not just the first), sorted by priority.
      // OS notifications + badge are owned by the background listener (single source),
      // so the popup is display-only here — this avoids duplicate notifications.
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await renderAnnouncements(items);
    },
    () => {}
  );
}

async function connectOrg(code) {
  const errEl = g('org-connect-error');
  if (errEl) errEl.style.display = 'none';
  try {
    const indexSnap = await getDoc(doc(db, 'orgIndex', code.trim().toUpperCase()));
    if (!indexSnap.exists()) {
      if (errEl) { errEl.textContent = 'Organisation not found. Check the code and try again.'; errEl.style.display = 'block'; }
      return;
    }
    const orgId   = indexSnap.data().orgId;
    const orgName = indexSnap.data().orgName;

    // Register this device/user as a member (non-fatal — join continues if this fails)
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(
          doc(db, 'organisations', orgId, 'members', user.uid),
          {
            email:      user.email,
            name:       user.displayName || user.email,
            role:       'employee',
            joinedAt:   serverTimestamp(),
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );
        // Also write userOrgMap so managers can log into the admin panel
        await setDoc(
          doc(db, 'userOrgMap', user.uid),
          { orgId, orgName, role: 'employee' },
          { merge: true }
        );
      } catch(memberErr) {
        console.warn('[popup] member registration skipped (check Firestore rules):', memberErr.code);
      }
    }

    await chrome.storage.local.set({ orgId, orgName });
    orgState.orgId  = orgId;
    orgState.orgName = orgName;
    startOrgSync(orgId);
    renderOrgUI();
    initAttendance();
    showToast(`🏢 Joined ${orgName}`);
  } catch(e) {
    if (errEl) { errEl.textContent = 'Failed to join. Please try again.'; errEl.style.display = 'block'; }
    console.warn('[popup] connectOrg:', e);
  }
}

function renderOrgUI() {
  const badge       = g('org-badge');
  const connected   = g('org-connected');
  const connectForm = g('org-connect');

  if (orgState.orgId) {
    if (badge) badge.style.display = 'flex';
    if (g('org-badge-name')) g('org-badge-name').textContent = orgState.orgName;
    if (connected)   connected.style.display   = 'block';
    if (connectForm) connectForm.style.display  = 'none';
    if (g('org-name-badge')) g('org-name-badge').textContent = orgState.orgName;
    renderAdminBlocklist();
  } else {
    if (badge) badge.style.display = 'none';
    if (connected)   connected.style.display   = 'none';
    if (connectForm) connectForm.style.display  = 'block';
  }
}

/* ══════════════════════════════════════════════════════════
   ATTENDANCE — Check In / Check Out (one record per day)
   Mirrors the session-sync write pattern: a member writes their
   own day-record to organisations/{orgId}/attendance, staff read.
══════════════════════════════════════════════════════════ */
let attendBound = false;

// Local-time calendar day → 'YYYY-MM-DD' (doc id + queryable field).
function localDateStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Handles both Firestore Timestamps (read) and Date objects (just written).
function fmtAttendTime(t) {
  if (!t) return '';
  const d = t.toDate ? t.toDate() : new Date(t);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function attendRef() {
  const user = auth.currentUser;
  if (!user || !orgState.orgId) return null;
  return doc(db, 'organisations', orgState.orgId, 'attendance', `${user.uid}_${localDateStr()}`);
}

function renderAttend(data) {
  const status = g('attend-status');
  const txt    = g('attend-status-txt');
  const btnIn  = g('btn-check-in');
  const btnOut = g('btn-check-out');
  if (!status || !txt || !btnIn || !btnOut) return;

  status.classList.remove('in', 'done');

  if (!data || !data.checkInTime) {
    txt.textContent = 'Not checked in today';
    btnIn.style.display = '';
    btnIn.disabled = false;
    btnOut.style.display = 'none';
  } else if (!data.checkOutTime) {
    status.classList.add('in');
    txt.textContent = `Checked in ${fmtAttendTime(data.checkInTime)}`;
    btnIn.style.display = 'none';
    btnOut.style.display = '';
    btnOut.disabled = false;
  } else {
    status.classList.add('done');
    txt.textContent = `In ${fmtAttendTime(data.checkInTime)} · Out ${fmtAttendTime(data.checkOutTime)}`;
    btnIn.style.display = 'none';
    btnOut.style.display = 'none';
  }
}

async function loadAttend() {
  const ref = attendRef();
  if (!ref) return;
  try {
    const snap = await getDoc(ref);
    renderAttend(snap.exists() ? snap.data() : null);
  } catch (e) { console.warn('[attendance] load', e?.code, e?.message); }
}

async function checkIn() {
  const ref  = attendRef();
  const user = auth.currentUser;
  if (!ref || !user) return;
  const btn = g('btn-check-in');
  if (btn) btn.disabled = true;
  try {
    await setDoc(ref, {
      userId:      user.uid,
      userEmail:   user.email,
      userName:    user.displayName || user.email,
      date:        localDateStr(),
      checkInTime: new Date(),
      createdAt:   serverTimestamp(),
    }, { merge: true });
    showToast('✓ Checked in');
    await loadAttend();
  } catch (e) {
    console.warn('[attendance] check-in', e?.code, e?.message);
    if (btn) btn.disabled = false;
    showToast('Check-in failed');
  }
}

async function checkOut() {
  const ref = attendRef();
  if (!ref) return;
  const btn = g('btn-check-out');
  if (btn) btn.disabled = true;
  try {
    await setDoc(ref, {
      checkOutTime: new Date(),
      updatedAt:    serverTimestamp(),
    }, { merge: true });
    showToast('✓ Checked out');
    await loadAttend();
  } catch (e) {
    console.warn('[attendance] check-out', e?.code, e?.message);
    if (btn) btn.disabled = false;
    showToast('Check-out failed');
  }
}

function initAttendance() {
  const card = g('attend-card');
  if (!card) return;

  // Attendance requires an org connection — hide otherwise.
  if (!orgState.orgId || !auth.currentUser) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'flex';

  if (!attendBound) {
    g('btn-check-in')?.addEventListener('click', checkIn);
    g('btn-check-out')?.addEventListener('click', checkOut);
    attendBound = true;
  }

  loadAttend();
}

function renderAdminBlocklist() {
  const el = g('admin-bl-list');
  if (!el) return;
  const list = orgState.adminBlocklist;
  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:12px 0;font-size:11px;color:var(--t3)">No admin-blocked sites</div>`;
    return;
  }
  const ICO = {twitter:'🐦',x:'✖️',facebook:'👤',instagram:'📸',tiktok:'🎵',reddit:'🤖',netflix:'🎬',twitch:'🎮',discord:'💬',youtube:'📺'};
  el.innerHTML = list.map(d => `
    <div class="drow locked">
      <span class="dico">${ICO[d.split('.')[0]] || '🌐'}</span>
      <span class="dname">${esc(d)}</span>
      <span class="lock-ico" title="Admin-controlled">🔒</span>
    </div>`).join('');
}

function initOrgConnect() {
  const inp  = g('org-code-inp');
  const btn  = g('btn-join-org');
  const leave = g('btn-leave-org');

  // Auto-uppercase as user types
  inp?.addEventListener('input', () => {
    if (inp) inp.value = inp.value.toUpperCase();
  });
  inp?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && inp.value.trim()) connectOrg(inp.value);
  });
  btn?.addEventListener('click', () => {
    const code = (inp?.value || '').trim();
    if (!code) {
      const err = g('org-connect-error');
      if (err) { err.textContent = 'Enter your organisation code.'; err.style.display = 'block'; }
      return;
    }
    connectOrg(code);
  });
  leave?.addEventListener('click', async () => {
    await chrome.storage.local.remove(['orgId', 'orgName', 'orgAdminBlocklist']);
    orgState = { orgId: null, orgName: null, adminBlocklist: [] };
    renderOrgUI();
    initAttendance();
    showToast('Left organisation');
  });
}

async function syncSessionsToOrg(history) {
  if (!orgState.orgId || !auth.currentUser || !history.length) return;
  try {
    const { orgLastSync } = await chrome.storage.local.get(['orgLastSync']);
    const lastSync  = orgLastSync || 0;
    // Use >= to handle sessions with the same timestamp as lastSync (avoids skipping sessions)
    const unsynced  = history.filter(s => {
      try { return new Date(s.date).getTime() >= lastSync; } catch(_) { return false; }
    });
    if (!unsynced.length) return;

    const user = auth.currentUser;
    await Promise.all(unsynced.slice(0, 10).map(s =>
      addDoc(collection(db, 'organisations', orgState.orgId, 'sessions'), {
        userId:      user.uid,
        userEmail:   user.email,
        sessionName: s.sessionName || 'Deep Work',
        duration:    s.duration    || 25,
        elapsed:     s.elapsed     || 0,
        completed:   !!s.completed,
        date:        new Date(s.date),
      })
    ));
    await chrome.storage.local.set({ orgLastSync: Date.now() });
  } catch(_) {
    // Silent fail — retried on next popup open
  }
}

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
async function loadState() {
  return new Promise(resolve => {
    safeSend({ type:'GET_STATE' }, r => {
      appState = r || {};
      renderAll();
      resolve();
    });
    setTimeout(resolve, 3000);
  });
}

function renderAll() {
  const { focusState, history, streaks, blocklist, sound, audioTabOpen } = appState;
  g('streak-val').textContent = streaks?.current || 0;
  g('status-dot').classList.toggle('on', !!focusState?.active);

  focusState?.active ? showActive(focusState) : showIdle();
  renderStats(history || [], streaks || {});
  renderBlocklist(blocklist || []);
  restoreSoundUI(sound, audioTabOpen);

  // Sync any new sessions to the org Firestore collection
  if (orgState.orgId) syncSessionsToOrg(history || []);
}

function g(id) { return document.getElementById(id); }
// Null-safe display setter — never throws if the element is missing.
function setDisp(id, value) { const el = g(id); if (el) el.style.display = value; }

/* ══════════════════════════════════════════════════════════
   SOUND UI RESTORE
══════════════════════════════════════════════════════════ */
function restoreSoundUI(sound, audioTabOpen) {
  if (!sound?.id) return;
  document.querySelectorAll('.scard').forEach(c => {
    c.classList.toggle('on', c.dataset.snd === sound.id);
  });
  const np   = g('now-play');
  const name = g('now-name');
  if (np)   np.style.display = audioTabOpen ? 'flex' : 'none';
  if (name) name.textContent = SOUND_NAMES[sound.id] || sound.id;

  const vol = g('vol-master');
  const vv  = g('vval');
  if (vol) vol.value = Math.round((sound.volume || 0.6) * 100);
  if (vv)  vv.textContent = Math.round((sound.volume || 0.6) * 100) + '%';

  const btn = g('audio-tab-btn');
  if (btn) {
    btn.textContent = audioTabOpen ? '🔊 Audio tab open' : '▶ Open audio tab';
    btn.style.color = audioTabOpen ? '#3fb950' : '#818cf8';
  }
}

/* ══════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════ */
function initNav() {
  document.querySelectorAll('.ntab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ntab').forEach(t => t.classList.remove('on'));
      document.querySelectorAll('.pnl').forEach(p => p.classList.remove('on'));
      tab.classList.add('on');
      g(`pnl-${tab.dataset.tab}`)?.classList.add('on');
    });
  });
}

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
function initSettings() {
  const notif    = g('set-notif');
  const annSound = g('set-ann-sound');
  const testBtn  = g('btn-test-sound');

  // Load current settings into the toggles (missing field => enabled by default).
  chrome.storage.local.get(['settings'], (res) => {
    const s = res.settings || {};
    if (notif)    notif.checked    = s.notificationsEnabled    !== false;
    if (annSound) annSound.checked = s.announcementSoundEnabled !== false;
  });

  // Merge + persist a single setting (background reads `settings` fresh each time).
  const save = (key, val) => {
    chrome.storage.local.get(['settings'], (res) => {
      const s = res.settings || {};
      s[key] = val;
      chrome.storage.local.set({ settings: s });
    });
  };

  notif?.addEventListener('change', () => save('notificationsEnabled', notif.checked));
  annSound?.addEventListener('change', () => save('announcementSoundEnabled', annSound.checked));
  testBtn?.addEventListener('click', () => {
    safeSend({ type: 'PLAY_ANNOUNCEMENT_SOUND', priority: 'information' });
    showToast('🔔 Test sound');
  });
}

/* ══════════════════════════════════════════════════════════
   TIMER
══════════════════════════════════════════════════════════ */
function initTimer() {
  document.querySelectorAll('.dbtn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.dbtn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      selDuration = parseInt(b.dataset.val);
      g('cust-dur').value = '';
      if (!appState.focusState?.active) setTimerDisplay(selDuration * 60);
    });
  });

  g('cust-dur')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (v >= 1 && v <= 240) {
      selDuration = v;
      document.querySelectorAll('.dbtn').forEach(x => x.classList.remove('sel'));
      if (!appState.focusState?.active) setTimerDisplay(selDuration * 60);
    }
  });

  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      const inp = g('task-inp');
      if (inp) inp.value = c.dataset.v || '';
    });
  });

  g('btn-start')?.addEventListener('click', startSession);
  g('btn-stop')?.addEventListener('click',  stopSession);
}

function showIdle() {
  setDisp('setup-form', 'flex');
  setDisp('active-ctrl', 'none');
  setDisp('prog-wrap', 'none');
  g('sbadge')?.classList.remove('run');
  const bt = g('sbadge-txt'); if (bt) bt.textContent = 'No active session';
  const lbl = g('t-lbl'); if (lbl) { lbl.textContent = 'READY'; lbl.classList.remove('run'); }
  setRing(0); setTimerDisplay(selDuration * 60); stopTick();
}

function showActive(fs) {
  setDisp('setup-form', 'none');
  setDisp('active-ctrl', 'block');
  setDisp('prog-wrap', 'block');
  g('sbadge')?.classList.add('run');
  const bt = g('sbadge-txt'); if (bt) bt.textContent = fs.sessionName || 'Deep Work';
  const lbl = g('t-lbl'); if (lbl) { lbl.textContent = 'FOCUSING'; lbl.classList.add('run'); }
  startTick(fs);
}

function startTick(fs) {
  stopTick();
  const total = (fs.duration || 25) * 60 * 1000;
  const tick = () => {
    const rem  = Math.max(0, (fs.endTime || Date.now()) - Date.now());
    const prog = Math.min(1, 1 - rem / total);
    setTimerDisplay(Math.ceil(rem / 1000));
    setRing(prog);
    const fill = g('prog-fill');
    if (fill) fill.style.width = (prog * 100).toFixed(1) + '%';
    // Urgency pulse when < 5 minutes remain
    const ringWrap = g('ring-wrap');
    if (ringWrap) ringWrap.classList.toggle('urgent', rem > 0 && rem < 5 * 60 * 1000);
    if (rem <= 0) { stopTick(); loadState(); }
  };
  tick();
  timerTick = setInterval(tick, 500);
}

function stopTick() {
  if (timerTick) { clearInterval(timerTick); timerTick = null; }
}

function setTimerDisplay(secs) {
  const s  = Math.max(0, Math.floor(secs));
  const el = g('t-time');
  if (el) el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function setRing(p) {
  const el = g('ring');
  if (el) el.style.strokeDashoffset = (408.41 * (1 - Math.min(1, Math.max(0, p)))).toFixed(2);
}

function startSession() {
  const name = (g('task-inp')?.value || '').trim() || 'Deep Work';
  safeSend({ type:'START_FOCUS', data:{ sessionName:name, duration:selDuration } }, () => {
    showToast('🚀 Session started!'); loadState();
  });
}

function stopSession() {
  if (!confirm('End this focus session early?')) return;
  safeSend({ type:'STOP_FOCUS', completed:false }, () => {
    showToast('Session ended.'); loadState();
  });
}

/* ══════════════════════════════════════════════════════════
   SOUNDS
══════════════════════════════════════════════════════════ */
function initSounds() {
  document.querySelectorAll('.scard').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.snd;
      if (card.classList.contains('on')) {
        safeSend({ type:'STOP_SOUND' }, () => {
          card.classList.remove('on');
          setDisp('now-play', 'none');
          g('mix-box')?.classList.remove('show');
          updateAudioTabBtn(false);
          showToast('⏹ Sound stopped');
        });
        return;
      }
      const vol = (g('vol-master')?.value || 60) / 100;
      safeSend({ type:'PLAY_SOUND', soundId:id, volume:vol }, () => {
        document.querySelectorAll('.scard').forEach(c => c.classList.remove('on'));
        card.classList.add('on');
        const np   = g('now-play');
        const name = g('now-name');
        if (np)   np.style.display = 'flex';
        if (name) name.textContent = SOUND_NAMES[id] || id;
        g('mix-box')?.classList.add('show');
        updateAudioTabBtn(true);
        showToast(`🎵 ${SOUND_NAMES[id]} — playing in background tab`);
      });
    });
  });

  g('vol-master')?.addEventListener('input', e => {
    const v = e.target.value / 100;
    g('vval').textContent = e.target.value + '%';
    safeSend({ type:'SET_VOLUME', volume:v });
  });

  g('ml1')?.addEventListener('input', e => {
    safeSend({ type:'SET_LAYER', layer:0, volume: e.target.value / 100 });
  });
  g('ml2')?.addEventListener('input', e => {
    safeSend({ type:'SET_LAYER', layer:1, volume: e.target.value / 100 });
  });

  g('audio-tab-btn')?.addEventListener('click', () => {
    safeSend({ type:'GET_STATE' }, r => {
      const sound = r?.sound;
      if (sound?.id) {
        safeSend({ type:'PLAY_SOUND', soundId:sound.id, volume:sound.volume || 0.6 }, () => {
          updateAudioTabBtn(true);
          showToast('🎵 Audio tab reopened');
        });
      } else {
        showToast('Pick a sound first');
      }
    });
  });
}

function updateAudioTabBtn(open) {
  const btn = g('audio-tab-btn');
  if (!btn) return;
  btn.textContent = open ? '🔊 Audio running in tab' : '▶ Open audio tab';
  btn.style.color = open ? '#3fb950' : '#818cf8';
}

/* ══════════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════════ */
function renderStats(history, streaks) {
  const total = history.reduce((s, h) => s + (h.elapsed || 0), 0);
  const hrs = Math.floor(total / 60), mins = total % 60;
  if (g('s-sess')) g('s-sess').textContent = history.length;
  if (g('s-time')) g('s-time').textContent = hrs > 0 ? `${hrs}h${mins}m` : `${mins}m`;
  if (g('s-best')) g('s-best').textContent = streaks.best || 0;
  renderHeatmap(history);

  const list = g('hist-list');
  if (!list) return;
  if (!history.length) {
    list.innerHTML = `<div class="empty"><div class="eico">📭</div><div class="etxt">No sessions yet.<br>Start your first!</div></div>`;
    return;
  }
  list.innerHTML = history.slice(0, 20).map(item => {
    const d  = new Date(item.date);
    const ts = isToday(d)
      ? `Today ${d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`
      : `${d.toLocaleDateString([], { month:'short', day:'numeric' })} ${d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`;
    return `<div class="hi">
      <div class="hdot ${item.completed ? 'd' : 'p'}"></div>
      <div class="hinfo">
        <div class="hname">${esc(item.sessionName || 'Deep Work')}</div>
        <div class="hmeta">${ts}</div>
      </div>
      <div class="hrgt">
        <div class="hmins">${item.elapsed || 0}m</div>
        <div class="hbadge ${item.completed ? 'bd' : 'bp'}">${item.completed ? '✓ Done' : '◐ Partial'}</div>
      </div>
    </div>`;
  }).join('');
}

function renderHeatmap(history) {
  const wrap = g('heatmap');
  if (!wrap) return;
  const DAYS = ['S','M','T','W','T','F','S'], now = new Date();
  wrap.innerHTML = Array.from({ length:7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const m   = history.filter(h => new Date(h.date).toDateString() === key).reduce((s, h) => s + (h.elapsed || 0), 0);
    const lvl = m >= 120 ? 4 : m >= 60 ? 3 : m >= 30 ? 2 : m >= 10 ? 1 : 0;
    return `<div class="hday"><div class="hcell${lvl ? ' l'+lvl : ''}" title="${m}min"></div><div class="hlbl">${DAYS[d.getDay()]}</div></div>`;
  }).join('');
}

function isToday(d) { return d.toDateString() === new Date().toDateString(); }
function esc(s) { const e = document.createElement('div'); e.appendChild(document.createTextNode(String(s))); return e.innerHTML; }

/* ══════════════════════════════════════════════════════════
   BLOCKLIST
══════════════════════════════════════════════════════════ */
function initBlock() {
  g('btn-add-d')?.addEventListener('click', addDomain);
  g('d-inp')?.addEventListener('keydown', e => { if (e.key === 'Enter') addDomain(); });
}

function renderBlocklist(list) {
  const el = g('d-list');
  if (!el) return;
  // Filter out domains already enforced by the admin — show them only in the Org tab
  const adminBl = orgState.adminBlocklist || [];
  const filtered = list.filter(d => !adminBl.includes(d));

  if (!filtered.length) {
    el.innerHTML = orgState.orgId
      ? `<div class="empty"><div class="eico">🛡️</div><div class="etxt">No personal sites blocked.<br>Admin-blocked sites are in the Org tab.</div></div>`
      : `<div class="empty"><div class="eico">🛡️</div><div class="etxt">No sites blocked yet.</div></div>`;
    return;
  }
  const ICO = {twitter:'🐦',x:'✖️',facebook:'👤',instagram:'📸',tiktok:'🎵',reddit:'🤖',netflix:'🎬',twitch:'🎮',discord:'💬',youtube:'📺'};
  el.innerHTML = filtered.map((d, i) => `
    <div class="drow">
      <span class="dico">${ICO[d.split('.')[0]] || '🌐'}</span>
      <span class="dname">${esc(d)}</span>
      <button class="xbtn" data-i="${i}">×</button>
    </div>`).join('');
  el.querySelectorAll('.xbtn').forEach(b => {
    b.addEventListener('click', () => removeDomain(parseInt(b.dataset.i)));
  });
}

function addDomain() {
  const inp = g('d-inp'); if (!inp) return;
  const raw = inp.value.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  if (!raw || !raw.includes('.')) { showToast('⚠️ Enter a valid domain'); return; }

  // Prevent adding a domain that the admin has already locked
  if (orgState.adminBlocklist.includes(raw)) {
    showToast('⚠️ This site is already locked by your admin');
    inp.value = '';
    return;
  }

  const bl = [...(appState.blocklist || [])];
  if (bl.includes(raw)) { showToast('Already blocked'); inp.value = ''; return; }
  bl.push(raw); appState.blocklist = bl;
  safeSend({ type:'UPDATE_BLOCKLIST', blocklist:bl }, () => { renderBlocklist(bl); showToast(`🔒 ${raw} blocked`); });
  inp.value = '';
}

function removeDomain(i) {
  const bl = [...(appState.blocklist || [])];
  if (i < 0 || i >= bl.length) return;
  const removed = bl[i]; bl.splice(i, 1); appState.blocklist = bl;
  safeSend({ type:'UPDATE_BLOCKLIST', blocklist:bl }, () => { renderBlocklist(bl); showToast(`✅ ${removed} removed`); });
}

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg) {
  const el = g('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
