/* ============================================
   APP.JS — Main Application Controller
   ============================================ */

// ---- Initialize Application ----
document.addEventListener('DOMContentLoaded', function() {
  // Init multi-profile system (must run before loadState so
  // it can migrate any legacy data and set STATE.data correctly)
  initProfiles();

  // loadState is now a no-op for data (profiles.js handles it),
  // but we still call it for API key + UI settings
  loadState();

  // Apply saved settings
  applySettings();

  // AI is always available via the secure Cloudflare Worker proxy.
  // No per-user key is required — the Worker holds the key server-side.
  STATE.ai.apiKey = 'WORKER_PROXY';
  setTimeout(() => setApiStatus('ok', 'AI ready'), 100);

  // Populate forms from state
  populateForm();

  // Initialize AI input count
  updateAIInputCount();
  document.getElementById('aiInput')?.addEventListener('input', updateAIInputCount);

  // Start auto-save
  startAutoSave();

  // Apply saved zoom
  applyZoom();

  // Apply saved template
  switchTemplate(STATE.ui.currentTemplate || 'ats');

  // Render resume
  renderResume();

  // Update scores
  updateScores();

  // Update all count badges
  updateCountBadges();

  // Add keyboard shortcuts
  initKeyboardShortcuts();

  // Handle URL params (for share)
  handleURLParams();

  // Init analytics if on dashboard tab
  if (STATE.ui.currentTab === 'dashboard') {
    setTimeout(onAnalyticsTabOpen, 300);
  }

  // Welcome toast
  const hasData = STATE.data.personal.firstName;
  if (!hasData) {
    setTimeout(() => {
      showToast('🎉 Welcome to ResumeAI Pro! Start with AI or build manually.', 'info', 5000);
    }, 1000);
  } else {
    showToast(`Welcome back, ${STATE.data.personal.firstName}!`, 'success', 3000);
  }
});

// ---- Apply Settings on Load ----
function applySettings() {
  const s = STATE.settings;

  // Theme
  document.documentElement.setAttribute('data-theme', s.theme);
  document.querySelectorAll('.theme-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === s.theme);
  });

  // Accent color
  if (s.accentColor && s.accentColor !== '#6366f1') {
    document.documentElement.style.setProperty('--accent', s.accentColor);
    document.documentElement.style.setProperty('--accent-hover', adjustColor(s.accentColor, -20));
    document.documentElement.style.setProperty('--accent-glow', s.accentColor + '55');
  }
  document.querySelectorAll('.color-opt').forEach(b => {
    const bc = b.style.getPropertyValue('--c');
    b.classList.toggle('active', bc === s.accentColor);
  });

  // Font
  if (s.font && s.font !== 'Inter') {
    document.body.style.fontFamily = `'${s.font}', sans-serif`;
  }
  const fontSelect = document.getElementById('fontSelect');
  if (fontSelect) fontSelect.value = s.font;

  // Auto-save
  const autoSaveToggle = document.getElementById('autoSaveToggle');
  if (autoSaveToggle) autoSaveToggle.checked = s.autoSave;

  // AI Settings
  const aiModel = document.getElementById('aiModel');
  if (aiModel) aiModel.value = s.aiModel;

  const aiTone = document.getElementById('aiTone');
  if (aiTone) aiTone.value = s.aiTone;

  const aiLang = document.getElementById('aiLanguage');
  if (aiLang) aiLang.value = s.aiLanguage;
}

// ---- Switch Main Tab ----
function switchMainTab(tab) {
  STATE.ui.currentTab = tab;

  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  // Show/hide content
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('active', el.id === `tab-${tab}`);
  });

  // On analytics tab open
  if (tab === 'dashboard') {
    setTimeout(onAnalyticsTabOpen, 100);
  }
}

// ---- Switch Mode (AI / Manual) ----
function switchMode(mode) {
  STATE.ui.currentMode = mode;

  document.getElementById('modeAI')?.classList.toggle('active', mode === 'ai');
  document.getElementById('modeManual')?.classList.toggle('active', mode === 'manual');
  document.getElementById('aiMode')?.classList.toggle('active', mode === 'ai');
  document.getElementById('manualMode')?.classList.toggle('active', mode === 'manual');

  // Switch to builder tab if not there
  if (STATE.ui.currentTab !== 'builder') {
    switchMainTab('builder');
  }
}

// ---- Keyboard Shortcuts ----
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + S = Save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      collectFormData();
      saveState();
      showToast('Saved!', 'success', 2000);
    }

    // Cmd/Ctrl + P = Print
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault();
      printResume();
    }

    // Cmd/Ctrl + E = Export
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      openExportModal();
    }

    // Escape = Close modals / fullscreen
    if (e.key === 'Escape') {
      closeModal('exportModal');
      closeModal('aiResultModal');
      if (STATE.ui.isFullscreen) toggleFullscreen();
      closeSuggestions();
    }

    // Ctrl + 1-4 = Switch tabs
    if (e.ctrlKey && e.key === '1') switchMainTab('builder');
    if (e.ctrlKey && e.key === '2') switchMainTab('dashboard');
    if (e.ctrlKey && e.key === '3') switchMainTab('templates');
    if (e.ctrlKey && e.key === '4') switchMainTab('settings');
  });
}

// ---- Handle URL Params ----
function handleURLParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const resumeData = params.get('resume');
    if (resumeData) {
      const decoded = JSON.parse(atob(resumeData));
      STATE.data = { ...STATE.data, ...decoded };
      populateForm();
      showToast('Resume loaded from shared link', 'success');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch(e) {
    // No valid URL params
  }
}

// ---- Close Suggestions ----
function closeSuggestions() {
  const panel = document.getElementById('suggestionsPanel');
  if (panel) panel.classList.remove('visible');
}

// ---- Show AI Suggestions based on resume content ----
function showSmartSuggestions() {
  const d = STATE.data;
  const suggestions = [];

  if (!d.summary) suggestions.push({ text: 'Add a professional summary to increase visibility', action: "switchMode('manual')" });
  if (d.experience.length === 0) suggestions.push({ text: 'Add work experience to strengthen your resume', action: "switchMode('manual')" });
  if (d.skills.length < 5) suggestions.push({ text: `Add more skills (you have ${d.skills.length}, aim for 10+)`, action: "switchMode('manual')" });
  if (d.experience.some(e => !e.description)) suggestions.push({ text: 'Add bullet points to your job descriptions', action: "switchMode('manual')" });
  if (!d.personal.linkedin) suggestions.push({ text: 'Add your LinkedIn URL for more credibility', action: "switchMode('manual')" });
  if (d.projects.length === 0) suggestions.push({ text: 'Add a projects section to showcase your work', action: "addProject()" });

  if (suggestions.length === 0) {
    suggestions.push({ text: 'Your resume looks great! Use AI to further enhance it.', action: "switchMode('ai')" });
  }

  const panel = document.getElementById('suggestionsPanel');
  const list = document.getElementById('suggestionsList');

  if (!panel || !list) return;

  list.innerHTML = suggestions.map(s => `
    <div class="suggestion-item" onclick="${s.action}; closeSuggestions()">
      <i class="fa-solid fa-lightbulb"></i>
      <span>${s.text}</span>
    </div>`).join('');

  panel.classList.add('visible');
}

// ---- Settings persistence ----
window.addEventListener('beforeunload', () => {
  collectFormData();
  saveState();
});

// ---- Responsive handling ----
window.addEventListener('resize', debounce(() => {
  // Adjust zoom for small screens
  if (window.innerWidth < 768) {
    STATE.ui.zoom = 45;
  } else if (window.innerWidth < 900) {
    STATE.ui.zoom = 60;
  }
  applyZoom();
}, 200));

function debounce(fn, wait) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ---- Tab-specific updates ----
const originalSwitchMainTab = switchMainTab;

// ---- Smart tooltip system ----
function initTooltips() {
  document.querySelectorAll('[title]').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const title = el.getAttribute('title');
      if (!title) return;

      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip-popup';
      tooltip.textContent = title;
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        pointer-events: none;
        z-index: 9999;
        backdrop-filter: blur(4px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        white-space: nowrap;
      `;

      document.body.appendChild(tooltip);

      const rect = el.getBoundingClientRect();
      tooltip.style.top = (rect.bottom + 6) + 'px';
      tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';

      el._tooltipEl = tooltip;
      el.removeAttribute('title');
      el._tooltipTitle = title;
    });

    el.addEventListener('mouseleave', (e) => {
      if (el._tooltipEl) {
        el._tooltipEl.remove();
        el._tooltipEl = null;
        el.setAttribute('title', el._tooltipTitle || '');
      }
    });
  });
}

// ---- Progressive reveal animation ----
function initRevealAnimations() {
  const cards = document.querySelectorAll('.form-card, .dash-card, .settings-card, .template-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 50);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    observer.observe(card);
  });
}

// Run after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initRevealAnimations, 100);
});
