const quotes = [
  "Deep work is the ability to focus without distraction on a cognitively demanding task.",
  "The cost of distraction is measured not in time lost, but in depth never reached.",
  "Every interruption is a withdrawal from your focus account.",
  "Your future self will thank you for staying focused right now.",
  "Champions aren't made in gyms. They are made from something they have deep inside.",
  "The secret of getting ahead is getting started. Keep going.",
  "Focus is not about saying yes to the thing you've got to focus on. It's about saying no to everything else.",
  "Concentrate all your thoughts upon the work in hand.",
];

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    site:      params.get('site')      || 'this site',
    remaining: parseInt(params.get('remaining') || '0'),
    session:   params.get('session')   || 'Deep Work',
  };
}

const params = getParams();
document.getElementById('site-display').textContent  = params.site;
document.getElementById('session-name').textContent  = params.session;

// Two UI modes: Admin Policy (no session) vs active user session
const isAdminPolicy = params.session === 'Admin Policy';
if (isAdminPolicy) {
  // Hide countdown timer — there is no active session timer
  const sessionInfo = document.querySelector('.session-info');
  if (sessionInfo) sessionInfo.style.display = 'none';
  // Hide "End Session" — nothing to end
  const stopBtn = document.querySelector('.btn-stop');
  if (stopBtn) stopBtn.style.display = 'none';
}
// else: normal session — timer and both buttons visible by default

// Countdown timer
let remainingSeconds = params.remaining * 60;
function updateTimer() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  document.getElementById('timer-display').textContent =
    `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  if (remainingSeconds > 0) remainingSeconds--;
}
updateTimer();
const timerInterval = setInterval(updateTimer, 1000);
// Clean up interval when page is hidden/unloaded to prevent memory leaks
window.addEventListener('pagehide', () => clearInterval(timerInterval), { once: true });

// Random motivational quote
const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
document.getElementById('quote-text').textContent = `"${randomQuote}"`;

function goBack() {
  history.back();
}

function stopSession() {
  if (confirm('End your focus session early? Your progress will still be saved.')) {
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS', completed: false }, () => {
      history.back();
    });
  }
}

// Wire up buttons — no inline onclick allowed in MV3
document.querySelector('.btn-back')?.addEventListener('click', goBack);
document.querySelector('.btn-stop')?.addEventListener('click', stopSession);

// Real-time: auto-redirect when admin removes this site from the blocklist
const blockedSite = params.site;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.orgAdminBlocklist) return;
  const newList = changes.orgAdminBlocklist.newValue || [];
  // A site is still blocked if it matches exactly OR is a subdomain of a blocked domain
  const stillBlocked = newList.some(d => blockedSite === d || blockedSite.endsWith('.' + d));
  if (!stillBlocked) {
    // Preserve original protocol if possible; default to https
    const proto = window.location.protocol === 'http:' ? 'http://' : 'https://';
    window.location.href = proto + blockedSite;
  }
});
