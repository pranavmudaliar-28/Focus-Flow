(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // content.js
  var require_content = __commonJS({
    "content.js"() {
      (function() {
        "use strict";
        let focusBarActive = false;
        let pollInterval = null;
        let overlayShown = false;
        function alive() {
          try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
          } catch (_) {
            return false;
          }
        }
        function safeSend(msg, cb) {
          if (!alive()) {
            killPoll();
            return;
          }
          try {
            chrome.runtime.sendMessage(msg, (r) => {
              if (chrome.runtime.lastError) return;
              if (cb) cb(r);
            });
          } catch (_) {
            killPoll();
          }
        }
        function killPoll() {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
        function injectBar() {
          if (document.getElementById("ff-bar")) return;
          if (!document.getElementById("ff-style")) {
            const s = document.createElement("style");
            s.id = "ff-style";
            s.textContent = "@keyframes ffp{0%,100%{opacity:.6}50%{opacity:1}}";
            (document.head || document.documentElement).appendChild(s);
          }
          const bar = document.createElement("div");
          bar.id = "ff-bar";
          bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:3px;z-index:2147483647;pointer-events:none;background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4);animation:ffp 2.5s ease-in-out infinite;";
          (document.body || document.documentElement).prepend(bar);
          focusBarActive = true;
        }
        function removeBar() {
          document.getElementById("ff-bar")?.remove();
          document.getElementById("ff-style")?.remove();
          focusBarActive = false;
        }
        function checkBar() {
          if (!alive()) {
            killPoll();
            return;
          }
          safeSend({ type: "GET_STATE" }, (r) => {
            const active = r?.focusState?.active;
            if (active && !focusBarActive) injectBar();
            else if (!active && focusBarActive) removeBar();
          });
        }
        function showSessionCompleteOverlay(data) {
          if (overlayShown) return;
          overlayShown = true;
          const styleEl = document.createElement("style");
          styleEl.id = "ff-overlay-style";
          styleEl.textContent = `
      #ff-overlay {
        position: fixed; inset: 0; z-index: 2147483646;
        display: flex; align-items: center; justify-content: center;
        background: rgba(2,8,23,0.82);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: ffOverlayIn 0.4s cubic-bezier(.16,1,.3,1) both;
        font-family: -apple-system, 'Inter', sans-serif;
      }
      @keyframes ffOverlayIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
      #ff-overlay-card {
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 20px;
        padding: 40px 44px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15);
        animation: ffCardIn 0.45s cubic-bezier(.16,1,.3,1) 0.05s both;
      }
      @keyframes ffCardIn {
        from { opacity:0; transform: scale(0.92) translateY(16px); }
        to   { opacity:1; transform: scale(1) translateY(0); }
      }
      #ff-overlay .ff-icon {
        font-size: 52px; margin-bottom: 16px; display:block;
        animation: ffBounce 0.6s cubic-bezier(.36,.07,.19,.97) 0.3s both;
      }
      @keyframes ffBounce {
        0%   { transform: scale(0.5); opacity:0; }
        60%  { transform: scale(1.15); }
        80%  { transform: scale(0.95); }
        100% { transform: scale(1); opacity:1; }
      }
      #ff-overlay h2 {
        font-size: 24px; font-weight: 700; color: #e6edf3;
        margin: 0 0 8px; letter-spacing: -0.02em;
      }
      #ff-overlay .ff-sub {
        font-size: 14px; color: #8b949e; margin-bottom: 24px; line-height:1.5;
      }
      #ff-overlay .ff-sub strong { color: #818cf8; }
      #ff-overlay .ff-stats {
        display: flex; gap: 12px; justify-content: center; margin-bottom: 28px;
      }
      #ff-overlay .ff-stat {
        flex: 1; padding: 14px 10px;
        background: #161b22; border: 1px solid #21262d;
        border-radius: 12px;
      }
      #ff-overlay .ff-stat-num {
        font-family: 'JetBrains Mono', monospace; font-size: 22px;
        font-weight: 600; color: #818cf8; line-height:1;
      }
      #ff-overlay .ff-stat-lbl {
        font-size: 10px; text-transform: uppercase;
        letter-spacing: .07em; color: #484f58; margin-top:4px; font-weight:600;
      }
      #ff-overlay .ff-btns { display:flex; flex-direction:column; gap:8px; }
      #ff-overlay .ff-btn-primary {
        padding: 13px; border-radius: 12px;
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        color: #fff; border: none; font-size: 14px; font-weight:700;
        cursor: pointer; transition: all .2s; letter-spacing:.02em;
        box-shadow: 0 4px 14px rgba(99,102,241,.35);
      }
      #ff-overlay .ff-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(99,102,241,.45);
      }
      #ff-overlay .ff-btn-close {
        padding: 11px; border-radius: 12px;
        background: transparent; color: #8b949e;
        border: 1px solid #30363d; font-size: 13px; font-weight:500;
        cursor: pointer; transition: all .15s;
      }
      #ff-overlay .ff-btn-close:hover {
        background: #161b22; color: #e6edf3;
      }
      #ff-overlay .ff-progress {
        height: 4px; background: #161b22; border-radius: 4px;
        margin-bottom: 20px; overflow: hidden;
      }
      #ff-overlay .ff-progress-fill {
        height: 100%;
        background: linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4);
        border-radius: 4px;
        width: 100%;
        animation: ffProgress 0.6s ease-out 0.2s both;
      }
      @keyframes ffProgress {
        from { width: 0%; } to { width: 100%; }
      }
    `;
          document.head.appendChild(styleEl);
          const isComplete = data.completed !== false;
          const mins = data.elapsed || 0;
          const name = data.sessionName || "Deep Work";
          const overlay = document.createElement("div");
          overlay.id = "ff-overlay";
          overlay.innerHTML = `
      <div id="ff-overlay-card">
        <span class="ff-icon">${isComplete ? "\u{1F389}" : "\u23F9"}</span>
        <h2>${isComplete ? "Session Complete!" : "Session Ended"}</h2>
        <p class="ff-sub">
          You focused on <strong>${escHtml(name)}</strong> for
          <strong>${mins} minute${mins !== 1 ? "s" : ""}</strong>.
          ${isComplete ? "Amazing work! \u{1F525}" : "Every minute counts!"}
        </p>
        <div class="ff-progress"><div class="ff-progress-fill"></div></div>
        <div class="ff-stats">
          <div class="ff-stat">
            <div class="ff-stat-num">${mins}m</div>
            <div class="ff-stat-lbl">Focused</div>
          </div>
          <div class="ff-stat">
            <div class="ff-stat-num">${isComplete ? "\u2713" : "~"}</div>
            <div class="ff-stat-lbl">${isComplete ? "Completed" : "Partial"}</div>
          </div>
          <div class="ff-stat">
            <div class="ff-stat-num">\u{1F525}</div>
            <div class="ff-stat-lbl">Streak</div>
          </div>
        </div>
        <div class="ff-btns">
          <button class="ff-btn-primary" id="ff-new-session">\u{1F680} Start Another Session</button>
          <button class="ff-btn-close" id="ff-dismiss">Dismiss</button>
        </div>
      </div>
    `;
          document.body.appendChild(overlay);
          removeBar();
          const dismiss = () => {
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.3s";
            setTimeout(() => {
              overlay.remove();
              styleEl.remove();
              overlayShown = false;
            }, 300);
          };
          document.getElementById("ff-dismiss")?.addEventListener("click", dismiss);
          overlay.addEventListener("click", (e) => {
            if (e.target === overlay) dismiss();
          });
          document.getElementById("ff-new-session")?.addEventListener("click", () => {
            dismiss();
            safeSend({ type: "OPEN_POPUP" }, () => {
            });
          });
          setTimeout(() => {
            if (overlayShown) dismiss();
          }, 3e4);
        }
        function escHtml(s) {
          const d = document.createElement("div");
          d.appendChild(document.createTextNode(String(s)));
          return d.innerHTML;
        }
        function setupMessageListener() {
          if (!alive()) return;
          try {
            chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
              if (msg.type === "SESSION_COMPLETE") {
                showSessionCompleteOverlay(msg);
                sendResponse({ ok: true });
              }
              return false;
            });
          } catch (_) {
          }
        }
        function startPolling() {
          if (!alive()) return;
          checkBar();
          pollInterval = setInterval(() => {
            if (!alive()) {
              killPoll();
              return;
            }
            checkBar();
          }, 15e3);
        }
        setupMessageListener();
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", startPolling, { once: true });
        } else {
          startPolling();
        }
        window.addEventListener("beforeunload", () => {
          killPoll();
          removeBar();
        }, { once: true });
      })();
    }
  });
  require_content();
})();
//# sourceMappingURL=content.js.map
