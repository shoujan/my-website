/* ============================================
   PROFILES.JS — Multi-Profile Manager
   Stores multiple complete resumes in
   localStorage. Each profile is fully
   independent: personal info, summary,
   experience, education, skills, projects,
   certifications, languages, and settings.
   ============================================ */

const PROFILES_KEY  = 'resumeai_profiles';
const ACTIVE_KEY    = 'resumeai_active_profile';

// ---- Profiles state (loaded once at boot) ----
let PROFILES = {};          // { [id]: { meta, data, settings } }
let ACTIVE_PROFILE_ID = null;

// ---- Helpers ----
function profileId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function emptyProfileData() {
  return {
    personal: {
      firstName: '', lastName: '', professionalTitle: '',
      email: '', phone: '', location: '',
      website: '', linkedin: '', github: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: []
  };
}

function defaultProfileMeta(name) {
  return {
    name: name || 'My Resume',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    color: randomProfileColor()
  };
}

function randomProfileColor() {
  const colors = ['#6366f1','#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ---- Persistence ----
function saveProfiles() {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(PROFILES));
    localStorage.setItem(ACTIVE_KEY, ACTIVE_PROFILE_ID);
  } catch(e) {
    console.warn('Failed to save profiles:', e);
  }
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const activeId = localStorage.getItem(ACTIVE_KEY);

    if (raw) {
      PROFILES = JSON.parse(raw);
    }

    // If no profiles exist yet, migrate the existing resumeai_data into a default profile
    if (Object.keys(PROFILES).length === 0) {
      const legacyRaw = localStorage.getItem('resumeai_data');
      let legacyData = emptyProfileData();
      let legacySettings = null;
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (parsed.data) legacyData = { ...legacyData, ...parsed.data };
          if (parsed.settings) legacySettings = parsed.settings;
        } catch(e) {}
      }
      const id = profileId();
      const name = (legacyData.personal?.firstName
        ? legacyData.personal.firstName + (legacyData.personal.lastName ? ' ' + legacyData.personal.lastName : '') + "'s Resume"
        : 'My Resume');
      PROFILES[id] = {
        meta: defaultProfileMeta(name),
        data: legacyData,
        settings: legacySettings || {}
      };
      ACTIVE_PROFILE_ID = id;
      saveProfiles();
      return;
    }

    // Restore active profile, fall back to first available
    if (activeId && PROFILES[activeId]) {
      ACTIVE_PROFILE_ID = activeId;
    } else {
      ACTIVE_PROFILE_ID = Object.keys(PROFILES)[0];
    }
  } catch(e) {
    console.warn('Failed to load profiles:', e);
    // Start fresh
    const id = profileId();
    PROFILES[id] = { meta: defaultProfileMeta('My Resume'), data: emptyProfileData(), settings: {} };
    ACTIVE_PROFILE_ID = id;
  }
}

// ---- Switch active profile ----
function switchProfile(id) {
  if (!PROFILES[id]) return;

  // Save current state into the current profile first
  persistCurrentToProfile();

  ACTIVE_PROFILE_ID = id;
  saveProfiles();

  // Load new profile into app STATE
  loadProfileIntoState(id);

  // Re-render everything
  populateForm();
  applySettings();
  renderResume();
  updateScores();
  updateCountBadges();
  if (typeof updateAnalyticsDashboard === 'function') updateAnalyticsDashboard();

  renderProfileSwitcher();
  renderProfileModal();
  closeModal('profilesModal');
  showToast(`Switched to "${PROFILES[id].meta.name}"`, 'success', 2500);
}

function loadProfileIntoState(id) {
  const profile = PROFILES[id];
  if (!profile) return;

  // Deep merge data
  STATE.data = {
    personal: { firstName:'', lastName:'', professionalTitle:'', email:'', phone:'', location:'', website:'', linkedin:'', github:'', ...profile.data.personal },
    summary: profile.data.summary || '',
    experience: profile.data.experience || [],
    education: profile.data.education || [],
    skills: profile.data.skills || [],
    projects: profile.data.projects || [],
    certifications: profile.data.certifications || [],
    languages: profile.data.languages || []
  };

  // Reset ID counters to safe values beyond existing items
  const maxId = arr => arr.reduce((m, item) => Math.max(m, item.id || 0), 0);
  expIdCounter  = maxId(STATE.data.experience);
  eduIdCounter  = maxId(STATE.data.education);
  projIdCounter = maxId(STATE.data.projects);
  certIdCounter = maxId(STATE.data.certifications);
  langIdCounter = maxId(STATE.data.languages);

  // Apply saved settings if present
  if (profile.settings && Object.keys(profile.settings).length) {
    STATE.settings = { ...STATE.settings, ...profile.settings };
  }
}

function persistCurrentToProfile() {
  if (!ACTIVE_PROFILE_ID || !PROFILES[ACTIVE_PROFILE_ID]) return;
  collectFormData();
  PROFILES[ACTIVE_PROFILE_ID].data = JSON.parse(JSON.stringify(STATE.data));
  PROFILES[ACTIVE_PROFILE_ID].settings = JSON.parse(JSON.stringify(STATE.settings));
  PROFILES[ACTIVE_PROFILE_ID].meta.updatedAt = Date.now();
}

// ---- Hook into existing saveState so profiles stay in sync ----
const _originalSaveState = typeof saveState === 'function' ? saveState : null;
function saveStateWithProfiles() {
  persistCurrentToProfile();
  saveProfiles();
  // Also run the original save so the legacy key stays intact for fallback
  try {
    localStorage.setItem('resumeai_data', JSON.stringify({
      data: STATE.data,
      settings: STATE.settings,
      ui: { currentTemplate: STATE.ui.currentTemplate, currentMode: STATE.ui.currentMode }
    }));
    showSaveIndicator('saved');
  } catch(e) {}
}

// ---- Create a new profile ----
function createProfile(name) {
  persistCurrentToProfile();
  const id = profileId();
  PROFILES[id] = {
    meta: defaultProfileMeta(name || 'New Resume'),
    data: emptyProfileData(),
    settings: JSON.parse(JSON.stringify(STATE.settings))
  };
  saveProfiles();
  switchProfile(id);
  return id;
}

// ---- Duplicate current profile ----
function duplicateProfile(id) {
  const src = PROFILES[id];
  if (!src) return;
  persistCurrentToProfile();
  const newId = profileId();
  PROFILES[newId] = {
    meta: { ...defaultProfileMeta(src.meta.name + ' (Copy)'), color: src.meta.color },
    data: JSON.parse(JSON.stringify(src.data)),
    settings: JSON.parse(JSON.stringify(src.settings || {}))
  };
  saveProfiles();
  renderProfileModal();
  renderProfileSwitcher();
  showToast('Profile duplicated', 'success', 2000);
  return newId;
}

// ---- Rename profile ----
function renameProfile(id, newName) {
  if (!PROFILES[id] || !newName.trim()) return;
  PROFILES[id].meta.name = newName.trim();
  PROFILES[id].meta.updatedAt = Date.now();
  saveProfiles();
  renderProfileModal();
  renderProfileSwitcher();
}

// ---- Delete profile ----
function deleteProfile(id) {
  const count = Object.keys(PROFILES).length;
  if (count <= 1) {
    showToast('Cannot delete the last profile', 'warning');
    return;
  }
  if (!confirm(`Delete "${PROFILES[id]?.meta.name}"? This cannot be undone.`)) return;

  const wasActive = id === ACTIVE_PROFILE_ID;
  delete PROFILES[id];
  saveProfiles();

  if (wasActive) {
    // Switch to the first remaining
    const nextId = Object.keys(PROFILES)[0];
    loadProfileIntoState(nextId);
    ACTIVE_PROFILE_ID = nextId;
    populateForm();
    applySettings();
    renderResume();
    updateScores();
    updateCountBadges();
  }

  renderProfileModal();
  renderProfileSwitcher();
  if (wasActive) showToast('Profile deleted, switched to next', 'info');
  else showToast('Profile deleted', 'info');
}

// ---- Change profile color ----
function setProfileColor(id, color) {
  if (!PROFILES[id]) return;
  PROFILES[id].meta.color = color;
  saveProfiles();
  renderProfileModal();
  renderProfileSwitcher();
}

// ---- Get profile initials ----
function profileInitials(name) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---- Render the mini profile switcher in the nav header ----
function renderProfileSwitcher() {
  const container = document.getElementById('profileSwitcher');
  if (!container) return;

  const active = PROFILES[ACTIVE_PROFILE_ID];
  if (!active) return;

  const count = Object.keys(PROFILES).length;

  container.innerHTML = `
    <button class="profile-switcher-btn" onclick="openProfilesModal()" title="Manage profiles">
      <span class="profile-avatar" style="background:${active.meta.color}">${profileInitials(active.meta.name)}</span>
      <span class="profile-name-short">${active.meta.name}</span>
      <span class="profile-count-badge" ${count < 2 ? 'style="display:none"' : ''}>${count}</span>
      <i class="fa-solid fa-chevron-down" style="font-size:10px;color:var(--text-tertiary);margin-left:2px;"></i>
    </button>`;
}

// ---- Render profile list inside the modal ----
function renderProfileModal() {
  const list = document.getElementById('profilesList');
  if (!list) return;

  const ids = Object.keys(PROFILES);

  list.innerHTML = ids.map(id => {
    const p = PROFILES[id];
    const isActive = id === ACTIVE_PROFILE_ID;
    const d = p.data;
    const skillCount = (d.skills || []).length;
    const expCount   = (d.experience || []).length;
    const name = d.personal?.firstName
      ? (d.personal.firstName + (d.personal.lastName ? ' ' + d.personal.lastName : ''))
      : '';
    const subtitle = d.personal?.professionalTitle || (name ? '' : 'No info yet');

    return `
      <div class="profile-card ${isActive ? 'active' : ''}" data-id="${id}">
        <div class="profile-card-left">
          <div class="profile-avatar-lg" style="background:${p.meta.color}">${profileInitials(p.meta.name)}</div>
        </div>
        <div class="profile-card-body">
          <div class="profile-card-top">
            <div>
              <div class="profile-card-name" id="pname_${id}" onclick="startRenameProfile('${id}')" title="Click to rename">${esc(p.meta.name)}</div>
              ${name ? `<div class="profile-card-sub">${esc(name)}${subtitle ? ' · ' + esc(subtitle) : ''}</div>` : `<div class="profile-card-sub" style="font-style:italic">${esc(subtitle)}</div>`}
            </div>
            ${isActive ? '<span class="profile-active-badge"><i class="fa-solid fa-check"></i> Active</span>' : ''}
          </div>
          <div class="profile-card-stats">
            <span><i class="fa-solid fa-briefcase"></i> ${expCount} exp</span>
            <span><i class="fa-solid fa-code"></i> ${skillCount} skills</span>
            <span><i class="fa-solid fa-clock"></i> ${timeAgo(p.meta.updatedAt)}</span>
          </div>
          <div class="profile-card-colors">
            ${['#6366f1','#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'].map(c =>
              `<button class="pcolor-dot ${p.meta.color === c ? 'active' : ''}" style="--pc:${c}" onclick="setProfileColor('${id}','${c}')" title="${c}"></button>`
            ).join('')}
          </div>
        </div>
        <div class="profile-card-actions">
          ${!isActive ? `<button class="paction-btn primary" onclick="switchProfile('${id}')"><i class="fa-solid fa-right-to-bracket"></i> Load</button>` : ''}
          <button class="paction-btn" onclick="duplicateProfile('${id}')" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
          ${Object.keys(PROFILES).length > 1 ? `<button class="paction-btn danger" onclick="deleteProfile('${id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ---- Inline rename ----
function startRenameProfile(id) {
  const el = document.getElementById('pname_' + id);
  if (!el) return;
  const current = PROFILES[id]?.meta.name || '';
  el.innerHTML = `<input class="profile-rename-input" value="${esc(current)}" onblur="finishRename('${id}', this.value)" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.value='${esc(current)}';this.blur()}" autofocus>`;
  el.querySelector('input').select();
}

function finishRename(id, value) {
  if (value.trim()) renameProfile(id, value.trim());
  else renderProfileModal();
}

// ---- Open / close modal ----
function openProfilesModal() {
  persistCurrentToProfile();
  renderProfileModal();
  document.getElementById('profilesModal')?.classList.add('open');
}

// ---- New profile form handling ----
function submitNewProfile() {
  const input = document.getElementById('newProfileNameInput');
  const name = input?.value?.trim() || 'New Resume';
  createProfile(name);
  if (input) input.value = '';
}

// ---- Export a single profile as JSON ----
function exportProfileJSON(id) {
  const p = PROFILES[id];
  if (!p) return;
  const blob = new Blob([JSON.stringify({ meta: p.meta, data: p.data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (p.meta.name.replace(/\s+/g, '_') || 'profile') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Profile exported', 'success');
}

// ---- Import a profile from JSON ----
function importProfileJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      // Accept either a raw data object or a full profile export
      const id = profileId();
      PROFILES[id] = {
        meta: defaultProfileMeta(obj.meta?.name || file.name.replace(/\.json$/,'')),
        data: obj.data || { ...emptyProfileData(), ...obj },
        settings: obj.settings || {}
      };
      if (obj.meta?.color) PROFILES[id].meta.color = obj.meta.color;
      saveProfiles();
      renderProfileModal();
      renderProfileSwitcher();
      showToast('Profile imported! Click Load to use it.', 'success');
    } catch(err) {
      showToast('Invalid file', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ---- Boot: called from app.js DOMContentLoaded ----
function initProfiles() {
  loadProfiles();
  loadProfileIntoState(ACTIVE_PROFILE_ID);

  // Override saveState globally so auto-save writes to the profile store
  window.saveState = saveStateWithProfiles;

  renderProfileSwitcher();

  // Inject the profile switcher into nav if it doesn't exist yet
  injectProfileNav();
  injectProfileModal();
  injectProfileStyles();
}

// ---- DOM injection ----
function injectProfileNav() {
  if (document.getElementById('profileSwitcher')) return;

  const nav = document.querySelector('.nav-right') || document.querySelector('.nav-tabs');
  if (!nav) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'profileSwitcher';
  wrapper.style.cssText = 'display:flex;align-items:center;';

  // Insert before the last child of nav-right, or after nav-tabs
  const navRight = document.querySelector('.nav-right');
  if (navRight) {
    navRight.insertBefore(wrapper, navRight.firstChild);
  } else {
    nav.parentNode.insertBefore(wrapper, nav.nextSibling);
  }

  renderProfileSwitcher();
}

function injectProfileModal() {
  if (document.getElementById('profilesModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'profilesModal';
  modal.setAttribute('onclick', "closeModalOutside(event,'profilesModal')");

  modal.innerHTML = `
    <div class="modal modal-wide" style="max-width:680px;">
      <div class="modal-header">
        <h2><i class="fa-solid fa-users" style="color:var(--accent)"></i> Profile Manager</h2>
        <button class="modal-close" onclick="closeModal('profilesModal')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding:0;">

        <!-- New profile row -->
        <div class="pm-new-row">
          <input id="newProfileNameInput" class="pm-name-input" type="text" placeholder="New profile name…" maxlength="40"
            onkeydown="if(event.key==='Enter') submitNewProfile()">
          <button class="btn-primary pm-create-btn" onclick="submitNewProfile()">
            <i class="fa-solid fa-plus"></i> Create
          </button>
          <label class="btn-ghost pm-import-btn" title="Import profile from JSON">
            <i class="fa-solid fa-file-import"></i> Import
            <input type="file" accept=".json" style="display:none" onchange="importProfileJSON(event)">
          </label>
        </div>

        <!-- Profile list -->
        <div id="profilesList" class="pm-list"></div>

      </div>
    </div>`;

  document.body.appendChild(modal);
}

function injectProfileStyles() {
  if (document.getElementById('profileStyles')) return;
  const style = document.createElement('style');
  style.id = 'profileStyles';
  style.textContent = `
    /* ---- Nav profile switcher ---- */
    .profile-switcher-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 10px 5px 6px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--bg-card);
      cursor: pointer;
      transition: var(--transition);
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }
    .profile-switcher-btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
    }
    .profile-avatar {
      width: 26px; height: 26px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .profile-avatar-lg {
      width: 46px; height: 46px;
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 700; color: #fff;
      flex-shrink: 0;
    }
    .profile-name-short {
      max-width: 120px;
      overflow: hidden; text-overflow: ellipsis;
    }
    .profile-count-badge {
      background: var(--accent);
      color: #fff;
      font-size: 10px; font-weight: 700;
      padding: 1px 6px;
      border-radius: 99px;
      line-height: 1.6;
    }

    /* ---- Modal ---- */
    .pm-new-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
    }
    .pm-name-input {
      flex: 1;
      padding: 9px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      transition: var(--transition);
    }
    .pm-name-input:focus { border-color: var(--border-focus); background: var(--bg-input-focus); }
    .pm-create-btn { padding: 9px 16px; font-size: 13px; }
    .pm-import-btn {
      padding: 9px 14px;
      font-size: 13px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex; align-items: center; gap: 6px;
      transition: var(--transition);
      white-space: nowrap;
    }
    .pm-import-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }

    /* ---- Profile cards ---- */
    .pm-list {
      max-height: 480px;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pm-list::-webkit-scrollbar { width: 5px; }
    .pm-list::-webkit-scrollbar-track { background: transparent; }
    .pm-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .profile-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--bg-card);
      transition: var(--transition);
    }
    .profile-card:hover { background: var(--bg-card-hover); border-color: var(--border-hover); }
    .profile-card.active {
      border-color: var(--accent);
      background: rgba(99,102,241,0.06);
    }

    .profile-card-left { padding-top: 2px; }

    .profile-card-body { flex: 1; min-width: 0; }
    .profile-card-top {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: 8px;
      margin-bottom: 6px;
    }
    .profile-card-name {
      font-size: 14px; font-weight: 600; color: var(--text-primary);
      cursor: pointer;
      border-radius: 4px;
      padding: 2px 4px;
      margin-left: -4px;
      transition: var(--transition);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .profile-card-name:hover { background: var(--bg-card-hover); }
    .profile-card-sub {
      font-size: 12px; color: var(--text-tertiary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .profile-active-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600;
      color: var(--accent-green);
      background: rgba(16,185,129,0.12);
      padding: 3px 8px; border-radius: 99px;
      white-space: nowrap; flex-shrink: 0;
    }

    .profile-card-stats {
      display: flex; gap: 12px; margin-bottom: 8px;
      font-size: 11px; color: var(--text-tertiary);
    }
    .profile-card-stats span { display: flex; align-items: center; gap: 4px; }
    .profile-card-stats i { font-size: 10px; color: var(--accent); }

    .profile-card-colors {
      display: flex; gap: 5px;
    }
    .pcolor-dot {
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 2px solid transparent;
      background: var(--pc);
      cursor: pointer;
      transition: transform 0.15s;
      padding: 0;
    }
    .pcolor-dot:hover { transform: scale(1.25); }
    .pcolor-dot.active { border-color: var(--text-primary); transform: scale(1.2); }

    .profile-card-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
      flex-shrink: 0;
    }
    .paction-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-input);
      color: var(--text-secondary);
      font-size: 12px; font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
      white-space: nowrap;
    }
    .paction-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .paction-btn.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .paction-btn.primary:hover { background: var(--accent-hover); }
    .paction-btn.danger:hover { background: rgba(239,68,68,0.15); color: var(--accent-red); border-color: var(--accent-red); }

    .profile-rename-input {
      width: 100%;
      background: var(--bg-input-focus);
      border: 1px solid var(--border-focus);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 14px; font-weight: 600;
      padding: 2px 6px;
      outline: none;
    }

    /* ---- Responsive ---- */
    @media (max-width: 520px) {
      .profile-name-short { display: none; }
      .pm-list { max-height: 340px; }
      .profile-card { flex-wrap: wrap; }
      .profile-card-actions { flex-direction: row; width: 100%; justify-content: flex-end; }
    }
  `;
  document.head.appendChild(style);
}
