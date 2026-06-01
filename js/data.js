/* ============================================
   DATA.JS — State Management & Form Handling
   ============================================ */

// ---- Global State ----
const STATE = {
  data: {
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
  },
  settings: {
    theme: 'dark',
    accentColor: '#6366f1',
    font: 'Inter',
    fontSize: 11,
    lineSpacing: '1.5',
    margin: 'normal',
    autoSave: true,
    autoSaveInterval: 10,
    pageNumbers: false,
    includePhoto: false,
    defaultExportFormat: 'pdf',
    aiModel: 'llama-3.3-70b-versatile',
    aiTone: 'professional',
    aiLanguage: 'en'
  },
  ui: {
    currentMode: 'ai',
    currentTemplate: 'ats',
    currentTab: 'builder',
    zoom: 85,
    isFullscreen: false
  },
  ai: {
    apiKey: '',
    lastResult: null,
    currentResultTab: 'ats'
  },
  autoSaveTimer: null,
  charts: {}
};

// ---- Load from LocalStorage ----
function loadState() {
  try {
    // If the profiles system already loaded STATE.data, skip data/settings
    // (ACTIVE_PROFILE_ID is set by profiles.js before app.js calls loadState)
    if (typeof ACTIVE_PROFILE_ID === 'undefined' || !ACTIVE_PROFILE_ID) {
      const saved = localStorage.getItem('resumeai_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        STATE.data = { ...STATE.data, ...parsed.data };
        STATE.settings = { ...STATE.settings, ...(parsed.settings || {}) };
        STATE.ui = { ...STATE.ui, ...(parsed.ui || {}) };
      }
    } else {
      // Profiles already loaded data — only restore UI prefs
      const saved = localStorage.getItem('resumeai_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.ui) STATE.ui = { ...STATE.ui, ...parsed.ui };
        } catch(e) {}
      }
    }
    // AI requests are proxied through the secure Cloudflare Worker.
    // No user-provided key is needed — mark AI as ready unconditionally.
    STATE.ai.apiKey = 'WORKER_PROXY';
    // Clean up any legacy locally-stored key (security hygiene).
    try { localStorage.removeItem('resumeai_groq_key'); } catch(_) {}
    setApiStatus('ok', 'AI ready');
  } catch(e) {
    console.warn('Failed to load state:', e);
  }
}

// ---- Save to LocalStorage ----
function saveState() {
  try {
    localStorage.setItem('resumeai_data', JSON.stringify({
      data: STATE.data,
      settings: STATE.settings,
      ui: { currentTemplate: STATE.ui.currentTemplate, currentMode: STATE.ui.currentMode }
    }));
    showSaveIndicator('saved');
  } catch(e) {
    console.warn('Failed to save state:', e);
  }
}

function saveApiKey() {
  // Legacy no-op: API key is handled server-side by the Cloudflare Worker.
  // The UI field is hidden, but this stub remains for backward compatibility.
  STATE.ai.apiKey = 'WORKER_PROXY';
  setApiStatus('ok', 'AI ready');
}

// ---- Auto-Save ----
function startAutoSave() {
  if (STATE.autoSaveTimer) clearInterval(STATE.autoSaveTimer);
  if (STATE.settings.autoSave) {
    STATE.autoSaveTimer = setInterval(() => {
      collectFormData();
      saveState();
    }, STATE.settings.autoSaveInterval * 1000);
  }
}

function toggleAutoSave() {
  STATE.settings.autoSave = document.getElementById('autoSaveToggle').checked;
  startAutoSave();
  showToast(STATE.settings.autoSave ? 'Auto-save enabled' : 'Auto-save disabled', 'info');
}

function setAutoSaveInterval(val) {
  STATE.settings.autoSaveInterval = parseInt(val);
  startAutoSave();
}

function showSaveIndicator(status) {
  const el = document.getElementById('autosaveIndicator');
  const txt = document.getElementById('saveText') || el.querySelector('.save-text');
  el.className = `autosave-indicator ${status}`;
  if (txt) txt.textContent = status === 'saving' ? 'Saving...' : 'Saved';
  if (status === 'saved') {
    setTimeout(() => { el.className = 'autosave-indicator'; }, 3000);
  }
}

// ---- Collect Form Data ----
function collectFormData() {
  STATE.data.personal = {
    firstName: val('firstName'),
    lastName: val('lastName'),
    professionalTitle: val('professionalTitle'),
    email: val('email'),
    phone: val('phone'),
    location: val('location'),
    website: val('website'),
    linkedin: val('linkedin'),
    github: val('github')
  };
  STATE.data.summary = val('summary');
  updateWordCount();
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ---- Populate Form from State ----
function populateForm() {
  const p = STATE.data.personal;
  setVal('firstName', p.firstName);
  setVal('lastName', p.lastName);
  setVal('professionalTitle', p.professionalTitle);
  setVal('email', p.email);
  setVal('phone', p.phone);
  setVal('location', p.location);
  setVal('website', p.website);
  setVal('linkedin', p.linkedin);
  setVal('github', p.github);
  setVal('summary', STATE.data.summary);
  renderExperienceList();
  renderEducationList();
  renderSkillsTags();
  renderProjectList();
  renderCertificationList();
  renderLanguageList();
  updatePreview();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.value = val;
}

// ---- Update Preview on Input ----
function updatePreview(debounce = true) {
  collectFormData();
  triggerPreviewUpdate();
  updateScores();
  showSaveIndicator('saving');
}

let previewUpdateTimer;
function triggerPreviewUpdate() {
  clearTimeout(previewUpdateTimer);
  previewUpdateTimer = setTimeout(() => {
    renderResume();
  }, 150);
}

// ---- Word Count ----
function updateWordCount() {
  const summary = STATE.data.summary;
  const words = summary.trim() ? summary.trim().split(/\s+/).length : 0;
  const el = document.getElementById('summaryCount');
  if (el) el.textContent = `${words} words`;
}

// ---- Char Count for AI Input ----
function updateAIInputCount() {
  const el = document.getElementById('aiInput');
  const count = document.getElementById('aiInputCount');
  if (el && count) {
    const len = el.value.length;
    count.textContent = `${len} / 3000`;
    count.style.color = len > 2800 ? 'var(--accent-red)' : 'var(--text-tertiary)';
    el.addEventListener('input', updateAIInputCount);
  }
}

// ---- EXPERIENCE ----
let expIdCounter = 0;
function addExperience(data = null) {
  const id = ++expIdCounter;
  const exp = data || {
    id, jobTitle: '', company: '', location: '',
    startDate: '', endDate: '', current: false, description: ''
  };
  if (!data) STATE.data.experience.push(exp);
  renderExperienceList();
  updatePreview();
  updateCountBadges();
}

function removeExperience(id) {
  STATE.data.experience = STATE.data.experience.filter(e => e.id !== id);
  renderExperienceList();
  updatePreview();
  updateCountBadges();
}

function renderExperienceList() {
  const container = document.getElementById('experienceList');
  if (!container) return;
  container.innerHTML = '';
  STATE.data.experience.forEach((exp, i) => {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <div class="entry-header" onclick="toggleEntry(this)">
        <div>
          <div class="entry-title">${exp.jobTitle || 'New Position'}</div>
          <div class="entry-subtitle">${exp.company || 'Company'}</div>
        </div>
        <div class="entry-actions">
          <button class="entry-action-btn move" onclick="event.stopPropagation(); moveExp(${exp.id}, -1)" title="Move up"><i class="fa-solid fa-chevron-up"></i></button>
          <button class="entry-action-btn move" onclick="event.stopPropagation(); moveExp(${exp.id}, 1)" title="Move down"><i class="fa-solid fa-chevron-down"></i></button>
          <button class="entry-action-btn" onclick="event.stopPropagation(); removeExperience(${exp.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(exp.jobTitle)}" placeholder=" " oninput="updateExp(${exp.id}, 'jobTitle', this.value)">
            <label>Job Title</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${esc(exp.company)}" placeholder=" " oninput="updateExp(${exp.id}, 'company', this.value)">
            <label>Company</label>
          </div>
        </div>
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(exp.startDate)}" placeholder=" " oninput="updateExp(${exp.id}, 'startDate', this.value)">
            <label>Start Date</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${exp.current ? 'Present' : esc(exp.endDate)}" placeholder=" " ${exp.current ? 'disabled' : ''} oninput="updateExp(${exp.id}, 'endDate', this.value)">
            <label>End Date</label>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);cursor:pointer;">
          <input type="checkbox" ${exp.current ? 'checked' : ''} onchange="updateExp(${exp.id}, 'current', this.checked); updatePreview()">
          Currently working here
        </label>
        <div class="floating-field">
          <textarea placeholder=" " rows="3" oninput="updateExp(${exp.id}, 'description', this.value)">${esc(exp.description)}</textarea>
          <label>Description / Achievements</label>
        </div>
        <button class="btn-ai-inline" onclick="enhanceExpItem(${exp.id})">
          <i class="fa-solid fa-wand-magic-sparkles"></i> AI Improve
        </button>
      </div>`;
    container.appendChild(div);
  });
  updateCountBadges();
}

function updateExp(id, field, value) {
  const exp = STATE.data.experience.find(e => e.id === id);
  if (exp) {
    exp[field] = field === 'current' ? value : value;
    const header = document.querySelector(`[data-expid="${id}"] .entry-title`);
    if (header && field === 'jobTitle') header.textContent = value || 'New Position';
    updatePreview();
  }
}

function moveExp(id, dir) {
  const arr = STATE.data.experience;
  const idx = arr.findIndex(e => e.id === id);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  renderExperienceList();
  updatePreview();
}

// ---- EDUCATION ----
let eduIdCounter = 0;
function addEducation(data = null) {
  const id = ++eduIdCounter;
  const edu = data || { id, degree: '', school: '', field: '', startDate: '', endDate: '', gpa: '' };
  if (!data) STATE.data.education.push(edu);
  renderEducationList();
  updatePreview();
  updateCountBadges();
}

function removeEducation(id) {
  STATE.data.education = STATE.data.education.filter(e => e.id !== id);
  renderEducationList();
  updatePreview();
  updateCountBadges();
}

function renderEducationList() {
  const container = document.getElementById('educationList');
  if (!container) return;
  container.innerHTML = '';
  STATE.data.education.forEach(edu => {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <div class="entry-header" onclick="toggleEntry(this)">
        <div>
          <div class="entry-title">${edu.degree || 'Degree'}</div>
          <div class="entry-subtitle">${edu.school || 'Institution'}</div>
        </div>
        <div class="entry-actions">
          <button class="entry-action-btn" onclick="event.stopPropagation(); removeEducation(${edu.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(edu.degree)}" placeholder=" " oninput="updateEdu(${edu.id}, 'degree', this.value)">
            <label>Degree</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${esc(edu.school)}" placeholder=" " oninput="updateEdu(${edu.id}, 'school', this.value)">
            <label>School / University</label>
          </div>
        </div>
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(edu.field)}" placeholder=" " oninput="updateEdu(${edu.id}, 'field', this.value)">
            <label>Field of Study</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${esc(edu.gpa)}" placeholder=" " oninput="updateEdu(${edu.id}, 'gpa', this.value)">
            <label>GPA (optional)</label>
          </div>
        </div>
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(edu.startDate)}" placeholder=" " oninput="updateEdu(${edu.id}, 'startDate', this.value)">
            <label>Start Date</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${esc(edu.endDate)}" placeholder=" " oninput="updateEdu(${edu.id}, 'endDate', this.value)">
            <label>End Date / Expected</label>
          </div>
        </div>
      </div>`;
    container.appendChild(div);
  });
  updateCountBadges();
}

function updateEdu(id, field, value) {
  const edu = STATE.data.education.find(e => e.id === id);
  if (edu) { edu[field] = value; updatePreview(); }
}

// ---- SKILLS ----
const SKILL_SUGGESTIONS_MAP = {
  'JavaScript': ['React', 'Node.js', 'TypeScript', 'Vue.js', 'Next.js'],
  'Python': ['Django', 'Flask', 'FastAPI', 'NumPy', 'Pandas', 'TensorFlow'],
  'React': ['Redux', 'React Native', 'Next.js', 'GraphQL', 'Jest'],
  'Java': ['Spring Boot', 'Maven', 'Hibernate', 'JUnit', 'Kafka'],
  'AWS': ['S3', 'EC2', 'Lambda', 'DynamoDB', 'CloudFormation'],
  'Design': ['Figma', 'Sketch', 'Adobe XD', 'Illustrator', 'Photoshop'],
  'default': ['Communication', 'Leadership', 'Problem Solving', 'Agile/Scrum', 'Git', 'Docker', 'CI/CD']
};

function handleSkillInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addSkillFromInput();
  } else {
    updateSkillSuggestions(event.target.value);
  }
}

function addSkillFromInput() {
  const input = document.getElementById('skillInput');
  const skill = input.value.trim();
  if (skill && !STATE.data.skills.includes(skill)) {
    STATE.data.skills.push(skill);
    renderSkillsTags();
    showSkillSuggestions(skill);
    updatePreview();
    updateCountBadges();
  }
  input.value = '';
  document.getElementById('skillSuggestions').innerHTML = '';
}

function removeSkill(skill) {
  STATE.data.skills = STATE.data.skills.filter(s => s !== skill);
  renderSkillsTags();
  updatePreview();
  updateCountBadges();
}

function renderSkillsTags() {
  const container = document.getElementById('skillsTags');
  if (!container) return;
  container.innerHTML = '';
  STATE.data.skills.forEach(skill => {
    const tag = document.createElement('div');
    tag.className = 'skill-tag';
    tag.innerHTML = `<span>${esc(skill)}</span><button onclick="removeSkill('${esc(skill)}')" title="Remove"><i class="fa-solid fa-xmark"></i></button>`;
    container.appendChild(tag);
  });
  updateCountBadges();
}

function updateSkillSuggestions(val) {
  if (!val || val.length < 2) {
    document.getElementById('skillSuggestions').innerHTML = '';
    return;
  }
  const allSkills = Object.keys(SKILL_SUGGESTIONS_MAP).concat(SKILL_SUGGESTIONS_MAP.default);
  const matches = allSkills.filter(s => s.toLowerCase().includes(val.toLowerCase()) && !STATE.data.skills.includes(s));
  const container = document.getElementById('skillSuggestions');
  container.innerHTML = matches.slice(0, 5).map(s =>
    `<span class="skill-suggestion-chip" onclick="quickAddSkill('${esc(s)}')">${esc(s)}</span>`
  ).join('');
}

function showSkillSuggestions(skill) {
  const related = SKILL_SUGGESTIONS_MAP[skill] || [];
  const container = document.getElementById('skillSuggestions');
  if (related.length) {
    container.innerHTML = `<span style="font-size:10px;color:var(--text-tertiary);margin-right:4px;">Related:</span>` +
      related.filter(s => !STATE.data.skills.includes(s))
        .map(s => `<span class="skill-suggestion-chip" onclick="quickAddSkill('${esc(s)}')">${esc(s)}</span>`).join('');
  }
}

function quickAddSkill(skill) {
  if (!STATE.data.skills.includes(skill)) {
    STATE.data.skills.push(skill);
    renderSkillsTags();
    updatePreview();
    updateCountBadges();
  }
}

// ---- PROJECTS ----
let projIdCounter = 0;
function addProject(data = null) {
  const id = ++projIdCounter;
  const proj = data || { id, name: '', description: '', tech: '', url: '', startDate: '', endDate: '' };
  if (!data) STATE.data.projects.push(proj);
  renderProjectList();
  updatePreview();
  updateCountBadges();
}

function removeProject(id) {
  STATE.data.projects = STATE.data.projects.filter(p => p.id !== id);
  renderProjectList();
  updatePreview();
  updateCountBadges();
}

function renderProjectList() {
  const container = document.getElementById('projectList');
  if (!container) return;
  container.innerHTML = '';
  STATE.data.projects.forEach(proj => {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <div class="entry-header" onclick="toggleEntry(this)">
        <div>
          <div class="entry-title">${proj.name || 'New Project'}</div>
          <div class="entry-subtitle">${proj.tech || 'Technologies'}</div>
        </div>
        <div class="entry-actions">
          <button class="entry-action-btn" onclick="event.stopPropagation(); removeProject(${proj.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <div class="floating-field">
          <input type="text" value="${esc(proj.name)}" placeholder=" " oninput="updateProj(${proj.id}, 'name', this.value)">
          <label>Project Name</label>
        </div>
        <div class="floating-field">
          <input type="text" value="${esc(proj.tech)}" placeholder=" " oninput="updateProj(${proj.id}, 'tech', this.value)">
          <label>Technologies Used</label>
        </div>
        <div class="floating-field">
          <textarea placeholder=" " rows="3" oninput="updateProj(${proj.id}, 'description', this.value)">${esc(proj.description)}</textarea>
          <label>Description</label>
        </div>
        <div class="form-row-2">
          <div class="floating-field">
            <input type="url" value="${esc(proj.url)}" placeholder=" " oninput="updateProj(${proj.id}, 'url', this.value)">
            <label>Project URL</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${esc(proj.startDate)}" placeholder=" " oninput="updateProj(${proj.id}, 'startDate', this.value)">
            <label>Date</label>
          </div>
        </div>
      </div>`;
    container.appendChild(div);
  });
  updateCountBadges();
}

function updateProj(id, field, value) {
  const proj = STATE.data.projects.find(p => p.id === id);
  if (proj) { proj[field] = value; updatePreview(); }
}

// ---- CERTIFICATIONS ----
let certIdCounter = 0;
function addCertification(data = null) {
  const id = ++certIdCounter;
  const cert = data || { id, name: '', issuer: '', date: '', url: '' };
  if (!data) STATE.data.certifications.push(cert);
  renderCertificationList();
  updatePreview();
  updateCountBadges();
}

function removeCertification(id) {
  STATE.data.certifications = STATE.data.certifications.filter(c => c.id !== id);
  renderCertificationList();
  updatePreview();
  updateCountBadges();
}

function renderCertificationList() {
  const container = document.getElementById('certificationList');
  if (!container) return;
  container.innerHTML = '';
  STATE.data.certifications.forEach(cert => {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <div class="entry-header" onclick="toggleEntry(this)">
        <div>
          <div class="entry-title">${cert.name || 'Certification'}</div>
          <div class="entry-subtitle">${cert.issuer || 'Issuer'}</div>
        </div>
        <div class="entry-actions">
          <button class="entry-action-btn" onclick="event.stopPropagation(); removeCertification(${cert.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <div class="floating-field">
          <input type="text" value="${esc(cert.name)}" placeholder=" " oninput="updateCert(${cert.id}, 'name', this.value)">
          <label>Certification Name</label>
        </div>
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(cert.issuer)}" placeholder=" " oninput="updateCert(${cert.id}, 'issuer', this.value)">
            <label>Issuing Organization</label>
          </div>
          <div class="floating-field">
            <input type="text" value="${esc(cert.date)}" placeholder=" " oninput="updateCert(${cert.id}, 'date', this.value)">
            <label>Issue Date</label>
          </div>
        </div>
      </div>`;
    container.appendChild(div);
  });
  updateCountBadges();
}

function updateCert(id, field, value) {
  const cert = STATE.data.certifications.find(c => c.id === id);
  if (cert) { cert[field] = value; updatePreview(); }
}

// ---- LANGUAGES ----
let langIdCounter = 0;
function addLanguage(data = null) {
  const id = ++langIdCounter;
  const lang = data || { id, language: '', proficiency: 'Fluent' };
  if (!data) STATE.data.languages.push(lang);
  renderLanguageList();
  updatePreview();
  updateCountBadges();
}

function removeLanguage(id) {
  STATE.data.languages = STATE.data.languages.filter(l => l.id !== id);
  renderLanguageList();
  updatePreview();
  updateCountBadges();
}

function renderLanguageList() {
  const container = document.getElementById('languageList');
  if (!container) return;
  container.innerHTML = '';
  STATE.data.languages.forEach(lang => {
    const div = document.createElement('div');
    div.className = 'entry-item';
    div.innerHTML = `
      <div class="entry-header" onclick="toggleEntry(this)">
        <div>
          <div class="entry-title">${lang.language || 'Language'}</div>
          <div class="entry-subtitle">${lang.proficiency}</div>
        </div>
        <div class="entry-actions">
          <button class="entry-action-btn" onclick="event.stopPropagation(); removeLanguage(${lang.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="entry-body">
        <div class="form-row-2">
          <div class="floating-field">
            <input type="text" value="${esc(lang.language)}" placeholder=" " oninput="updateLang(${lang.id}, 'language', this.value)">
            <label>Language</label>
          </div>
          <div class="floating-field">
            <select oninput="updateLang(${lang.id}, 'proficiency', this.value)" style="padding:14px 14px 6px;">
              ${['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'].map(l =>
                `<option ${lang.proficiency === l ? 'selected' : ''}>${l}</option>`
              ).join('')}
            </select>
            <label>Proficiency</label>
          </div>
        </div>
      </div>`;
    container.appendChild(div);
  });
  updateCountBadges();
}

function updateLang(id, field, value) {
  const lang = STATE.data.languages.find(l => l.id === id);
  if (lang) { lang[field] = value; updatePreview(); }
}

// ---- Count Badges ----
function updateCountBadges() {
  const set = (id, n) => { const el = document.getElementById(id); if(el) el.textContent = `${n} ${n===1?id.replace('Count','').toLowerCase():id.replace('Count','').toLowerCase()+'s'}`; };
  document.getElementById('expCount') && (document.getElementById('expCount').textContent = `${STATE.data.experience.length} position${STATE.data.experience.length !== 1 ? 's' : ''}`);
  document.getElementById('eduCount') && (document.getElementById('eduCount').textContent = `${STATE.data.education.length} entr${STATE.data.education.length !== 1 ? 'ies' : 'y'}`);
  document.getElementById('skillCount') && (document.getElementById('skillCount').textContent = `${STATE.data.skills.length} skill${STATE.data.skills.length !== 1 ? 's' : ''}`);
  document.getElementById('projectCount') && (document.getElementById('projectCount').textContent = `${STATE.data.projects.length} project${STATE.data.projects.length !== 1 ? 's' : ''}`);
  document.getElementById('certCount') && (document.getElementById('certCount').textContent = `${STATE.data.certifications.length} certification${STATE.data.certifications.length !== 1 ? 's' : ''}`);
  document.getElementById('langCount') && (document.getElementById('langCount').textContent = `${STATE.data.languages.length} language${STATE.data.languages.length !== 1 ? 's' : ''}`);
}

// ---- Toggle Entry ----
function toggleEntry(header) {
  const item = header.closest('.entry-item');
  item.classList.toggle('collapsed');
}

// ---- Toggle Card ----
function toggleCard(header) {
  const card = header.closest('.form-card');
  card.classList.toggle('collapsed');
}

// ---- Escape HTML ----
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- File Upload ----
function handleDrop(event) {
  event.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  const file = event.dataTransfer.files[0];
  if (file) processUploadedFile(file);
}

function handleDragOver(event) {
  event.preventDefault();
  document.getElementById('uploadZone').classList.add('dragover');
}

function handleDragLeave(event) {
  document.getElementById('uploadZone').classList.remove('dragover');
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) processUploadedFile(file);
}

function processUploadedFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large. Maximum 5MB.', 'error');
    return;
  }
  const result = document.getElementById('uploadResult');
  const fileName = document.getElementById('uploadFileName');
  if (fileName) fileName.textContent = file.name;
  if (result) result.style.display = 'flex';

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    document.getElementById('aiInput').value = text.substring(0, 3000);
    updateAIInputCount();
    showToast(`Loaded: ${file.name}`, 'success');
  };
  reader.readAsText(file);
}

function clearUpload() {
  document.getElementById('uploadResult').style.display = 'none';
  document.getElementById('fileInput').value = '';
}

function clearAiInput() {
  document.getElementById('aiInput').value = '';
  updateAIInputCount();
}

// ---- Clear All Data ----
function clearAllData() {
  if (!confirm('Clear all resume data? This cannot be undone.')) return;
  STATE.data = {
    personal: { firstName: '', lastName: '', professionalTitle: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '' },
    summary: '', experience: [], education: [], skills: [],
    projects: [], certifications: [], languages: []
  };
  expIdCounter = 0; eduIdCounter = 0; projIdCounter = 0; certIdCounter = 0; langIdCounter = 0;
  localStorage.removeItem('resumeai_data');
  populateForm();
  renderResume();
  updateScores();
  showToast('All data cleared', 'info');
}

// ---- Import/Export JSON ----
function exportJSON() {
  collectFormData();
  const blob = new Blob([JSON.stringify(STATE.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume_data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Resume data exported as JSON', 'success');
  closeModal('exportModal');
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      STATE.data = { ...STATE.data, ...data };
      populateForm();
      saveState();
      showToast('Resume data imported successfully', 'success');
      closeModal('exportModal');
    } catch(err) {
      showToast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

// ---- Apply AI Result to Form ----
function applyAIToForm(parsedData) {
  if (!parsedData) return;
  if (parsedData.personal) {
    Object.assign(STATE.data.personal, parsedData.personal);
  }
  if (parsedData.summary) STATE.data.summary = parsedData.summary;
  if (parsedData.experience && Array.isArray(parsedData.experience)) {
    STATE.data.experience = parsedData.experience.map((e, i) => ({ ...e, id: ++expIdCounter }));
  }
  if (parsedData.education && Array.isArray(parsedData.education)) {
    STATE.data.education = parsedData.education.map((e, i) => ({ ...e, id: ++eduIdCounter }));
  }
  if (parsedData.skills && Array.isArray(parsedData.skills)) {
    STATE.data.skills = [...new Set([...STATE.data.skills, ...parsedData.skills])];
  }
  if (parsedData.projects && Array.isArray(parsedData.projects)) {
    STATE.data.projects = parsedData.projects.map((p, i) => ({ ...p, id: ++projIdCounter }));
  }
  if (parsedData.certifications && Array.isArray(parsedData.certifications)) {
    STATE.data.certifications = parsedData.certifications.map((c, i) => ({ ...c, id: ++certIdCounter }));
  }
  populateForm();
  saveState();
  switchMode('manual');
  showToast('AI result applied to builder!', 'success');
}

// ---- Scores ----
function updateScores() {
  const score = calculateResumeScore();
  animateScore('scoreFillResume', 'scoreNumResume', score.overall);
  animateScore('scoreFillATS', 'scoreNumATS', score.ats, 'ats');
  animateScore('scoreFillKW', 'scoreNumKW', score.keyword, 'kw');
  animateScore('scoreFillComp', 'scoreNumComp', score.completion, 'comp');
}

function animateScore(fillId, numId, value, type = '') {
  const fill = document.getElementById(fillId);
  const num = document.getElementById(numId);
  if (fill) fill.style.width = value + '%';
  if (num) num.textContent = value + '%';
  if (num) {
    num.style.color = value >= 75 ? 'var(--accent-green)' :
                      value >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)';
  }
}

function calculateResumeScore() {
  const d = STATE.data;
  let points = 0;
  let max = 100;

  // Personal info (25 pts)
  if (d.personal.firstName && d.personal.lastName) points += 8;
  if (d.personal.email) points += 5;
  if (d.personal.phone) points += 4;
  if (d.personal.location) points += 3;
  if (d.personal.linkedin || d.personal.github) points += 5;

  // Summary (15 pts)
  if (d.summary && d.summary.length > 100) points += 15;
  else if (d.summary && d.summary.length > 50) points += 8;

  // Experience (25 pts)
  if (d.experience.length > 0) points += 10;
  if (d.experience.length > 1) points += 5;
  if (d.experience.some(e => e.description && e.description.length > 100)) points += 10;

  // Education (10 pts)
  if (d.education.length > 0) points += 10;

  // Skills (15 pts)
  if (d.skills.length >= 5) points += 15;
  else if (d.skills.length >= 3) points += 10;
  else if (d.skills.length > 0) points += 5;

  // Projects/Certs (10 pts)
  if (d.projects.length > 0) points += 5;
  if (d.certifications.length > 0) points += 5;

  const overall = Math.min(100, Math.round(points));

  // ATS score
  let ats = 0;
  if (d.personal.email) ats += 15;
  if (d.personal.phone) ats += 10;
  if (d.summary) ats += 15;
  if (d.experience.length > 0) ats += 20;
  if (d.education.length > 0) ats += 15;
  if (d.skills.length >= 5) ats += 15;
  if (!d.personal.linkedin || d.personal.linkedin === '') {} else ats += 5;
  if (d.certifications.length > 0) ats += 5;
  ats = Math.min(100, ats);

  // Keyword score (based on skills count as proxy)
  const kw = Math.min(100, d.skills.length * 8);

  // Completion
  let comp = 0;
  const sections = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'];
  if (d.summary) comp += 17;
  if (d.experience.length) comp += 17;
  if (d.education.length) comp += 17;
  if (d.skills.length) comp += 16;
  if (d.projects.length) comp += 17;
  if (d.certifications.length) comp += 16;

  return { overall, ats, keyword: kw, completion: comp };
}

// ---- API Status ----
function setApiStatus(status, text) {
  const dot = document.querySelector('.status-dot');
  const textEl = document.getElementById('apiStatusText');
  if (dot) dot.className = `status-dot status-${status}`;
  if (textEl) textEl.textContent = text;
}

// ---- Toggle API Key Visibility ----
function toggleApiKey() {
  const input = document.getElementById('groqApiKey');
  const icon = document.getElementById('apiKeyEyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
}

// ---- Settings Handlers ----
function setTheme(theme) {
  STATE.settings.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  saveState();
}

function toggleTheme() {
  const themes = ['dark', 'light', 'midnight'];
  const curr = STATE.settings.theme;
  const next = themes[(themes.indexOf(curr) + 1) % themes.length];
  setTheme(next);
}

function setAccentColor(color) {
  STATE.settings.accentColor = color;
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', adjustColor(color, -20));
  document.documentElement.style.setProperty('--accent-glow', color + '55');
  document.querySelectorAll('.color-opt').forEach(b => {
    const bc = b.style.getPropertyValue('--c');
    b.classList.toggle('active', bc === color);
  });
  saveState();
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function setFont(font) {
  STATE.settings.font = font;
  document.body.style.fontFamily = `'${font}', sans-serif`;
  saveState();
}

let resumeFontSize = 11;
function adjustFontSize(delta) {
  resumeFontSize = Math.max(8, Math.min(14, resumeFontSize + delta));
  const display = document.getElementById('fontSizeDisplay');
  if (display) display.textContent = resumeFontSize + 'pt';
  const page = document.getElementById('resumePreview');
  if (page) page.style.fontSize = resumeFontSize + 'pt';
}

function setLineSpacing(val) {
  STATE.settings.lineSpacing = val;
  const page = document.getElementById('resumePreview');
  if (page) page.style.lineHeight = val;
  saveState();
}

function setMargin(val) {
  STATE.settings.margin = val;
  const margins = { narrow: '28px', normal: '48px', wide: '64px' };
  const page = document.getElementById('resumePreview');
  if (page) {
    const m = margins[val] || '48px';
    page.style.padding = m;
  }
  saveState();
}

// ---- Share ----
function shareResume() {
  collectFormData();
  const encoded = btoa(JSON.stringify(STATE.data)).substring(0, 500);
  const url = `${window.location.href.split('?')[0]}?resume=${encoded}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Share link copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy link', 'error');
  });
  closeModal('exportModal');
}
