/* ============================================
   TEMPLATES.JS — 5 Resume Template Renderers
   ============================================ */

function renderResume() {
  const page = document.getElementById('resumePreview');
  if (!page) return;

  const d = STATE.data;
  const isEmpty = !d.personal.firstName && !d.personal.lastName && !d.summary &&
    !d.experience.length && !d.education.length && !d.skills.length;

  if (isEmpty) {
    page.innerHTML = `
      <div class="resume-empty-state" id="emptyState">
        <div class="empty-icon"><i class="fa-solid fa-file-lines"></i></div>
        <h3>Your Resume Awaits</h3>
        <p>Fill in your details on the left or use AI to generate a complete resume instantly</p>
        <button class="btn-start" onclick="switchMode('ai')">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Start with AI
        </button>
      </div>`;
    return;
  }

  switch (STATE.ui.currentTemplate) {
    case 'ats':      page.innerHTML = renderATS(d); break;
    case 'modern':   page.innerHTML = renderModern(d); break;
    case 'creative': page.innerHTML = renderCreative(d); break;
    case 'corporate':page.innerHTML = renderCorporate(d); break;
    case 'tech':     page.innerHTML = renderTech(d); break;
    default:         page.innerHTML = renderATS(d);
  }
}

// ---- Helper: Format contact ----
function fmtContact(items) {
  return items.filter(Boolean).map(i => `<span>${i}</span>`).join('');
}

function fmtBullets(desc) {
  if (!desc) return '';
  const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return `<p class="exp-desc">${desc}</p>`;
  return `<ul class="exp-bullets">${lines.map(l => `<li>${l.replace(/^[-•*]\s*/, '')}</li>`).join('')}</ul>`;
}

// ============================================
// 1. ATS PROFESSIONAL TEMPLATE
// ============================================
function renderATS(d) {
  const p = d.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
  const contacts = [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean);

  return `<div class="resume-ats">
    <div class="res-header">
      <div class="res-name">${fullName || 'Your Name'}</div>
      ${p.professionalTitle ? `<div class="res-title">${p.professionalTitle}</div>` : ''}
      <div class="res-contact">
        ${contacts.map(c => `<span>${c}</span>`).join('')}
      </div>
    </div>

    ${d.summary ? `
    <div class="res-section">
      <div class="res-section-title">Professional Summary</div>
      <div class="res-summary">${d.summary}</div>
    </div>` : ''}

    ${d.experience.length ? `
    <div class="res-section">
      <div class="res-section-title">Work Experience</div>
      ${d.experience.map(e => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-title">${e.jobTitle || ''}</span>
            <span class="exp-dates">${[e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ')}</span>
          </div>
          <div class="exp-company">${[e.company, e.location].filter(Boolean).join(' | ')}</div>
          ${fmtBullets(e.description)}
        </div>`).join('')}
    </div>` : ''}

    ${d.education.length ? `
    <div class="res-section">
      <div class="res-section-title">Education</div>
      ${d.education.map(e => `
        <div class="edu-item">
          <div class="edu-header">
            <span class="edu-degree">${[e.degree, e.field].filter(Boolean).join(' in ')}</span>
            <span class="edu-dates">${[e.startDate, e.endDate].filter(Boolean).join(' – ')}</span>
          </div>
          <div class="edu-school">${e.school}${e.gpa ? ` • GPA: ${e.gpa}` : ''}</div>
        </div>`).join('')}
    </div>` : ''}

    ${d.skills.length ? `
    <div class="res-section">
      <div class="res-section-title">Skills</div>
      <div class="skills-list">
        ${d.skills.map(s => `<span class="skill-item">${s}</span>`).join('')}
      </div>
    </div>` : ''}

    ${d.projects.length ? `
    <div class="res-section">
      <div class="res-section-title">Projects</div>
      ${d.projects.map(p => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-title">${p.name}</span>
            <span class="exp-dates">${p.startDate || ''}</span>
          </div>
          ${p.tech ? `<div class="exp-company">Technologies: ${p.tech}</div>` : ''}
          ${p.description ? `<p class="exp-desc">${p.description}</p>` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${d.certifications.length ? `
    <div class="res-section">
      <div class="res-section-title">Certifications</div>
      ${d.certifications.map(c => `
        <div class="cert-item">• <strong>${c.name}</strong>${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}</div>
      `).join('')}
    </div>` : ''}

    ${d.languages.length ? `
    <div class="res-section">
      <div class="res-section-title">Languages</div>
      <div class="skills-list">
        ${d.languages.map(l => `<span class="skill-item">${l.language} (${l.proficiency})</span>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

// ============================================
// 2. MODERN EXECUTIVE TEMPLATE
// ============================================
function renderModern(d) {
  const p = d.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');

  return `<div class="resume-modern">
    <div class="mod-sidebar">
      <div>
        <div class="mod-name">${fullName || 'Your Name'}</div>
        ${p.professionalTitle ? `<div class="mod-title">${p.professionalTitle}</div>` : ''}
      </div>
      <div>
        <div class="mod-contact-title">Contact</div>
        ${p.email ? `<div class="mod-contact-item"><i class="fa-solid fa-envelope" style="opacity:0.6"></i>${p.email}</div>` : ''}
        ${p.phone ? `<div class="mod-contact-item"><i class="fa-solid fa-phone" style="opacity:0.6"></i>${p.phone}</div>` : ''}
        ${p.location ? `<div class="mod-contact-item"><i class="fa-solid fa-location-dot" style="opacity:0.6"></i>${p.location}</div>` : ''}
        ${p.linkedin ? `<div class="mod-contact-item"><i class="fa-brands fa-linkedin" style="opacity:0.6"></i>${p.linkedin.replace('https://linkedin.com/in/', '')}</div>` : ''}
        ${p.github ? `<div class="mod-contact-item"><i class="fa-brands fa-github" style="opacity:0.6"></i>${p.github.replace('https://github.com/', '')}</div>` : ''}
        ${p.website ? `<div class="mod-contact-item"><i class="fa-solid fa-globe" style="opacity:0.6"></i>${p.website}</div>` : ''}
      </div>
      ${d.skills.length ? `
      <div>
        <div class="mod-contact-title">Skills</div>
        ${d.skills.slice(0, 10).map(s => `
          <div class="mod-skill-wrap">
            <div class="mod-skill-name">${s}</div>
            <div class="mod-skill-bar"><div class="mod-skill-fill" style="width:${60 + Math.random() * 40}%"></div></div>
          </div>`).join('')}
      </div>` : ''}
      ${d.languages.length ? `
      <div>
        <div class="mod-contact-title">Languages</div>
        ${d.languages.map(l => `<div class="mod-contact-item">${l.language} — ${l.proficiency}</div>`).join('')}
      </div>` : ''}
    </div>
    <div class="mod-main">
      ${d.summary ? `
      <div class="mod-section">
        <div class="mod-section-title"><i class="fa-solid fa-user" style="font-size:12px"></i> Professional Summary</div>
        <div class="mod-summary">${d.summary}</div>
      </div>` : ''}
      ${d.experience.length ? `
      <div class="mod-section">
        <div class="mod-section-title"><i class="fa-solid fa-briefcase" style="font-size:12px"></i> Work Experience</div>
        ${d.experience.map(e => `
          <div class="mod-exp">
            <div class="mod-exp-head">
              <span class="mod-exp-title">${e.jobTitle || ''}</span>
              <span class="mod-exp-date">${[e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ')}</span>
            </div>
            <div class="mod-exp-company">${[e.company, e.location].filter(Boolean).join(' • ')}</div>
            ${e.description ? `<ul class="mod-bullets">${e.description.split('\n').filter(Boolean).map(l => `<li>${l.replace(/^[-•*]\s*/,'')}</li>`).join('')}</ul>` : ''}
          </div>`).join('')}
      </div>` : ''}
      ${d.education.length ? `
      <div class="mod-section">
        <div class="mod-section-title"><i class="fa-solid fa-graduation-cap" style="font-size:12px"></i> Education</div>
        ${d.education.map(e => `
          <div class="mod-edu-item">
            <div class="mod-edu-degree">${[e.degree, e.field].filter(Boolean).join(' in ')}</div>
            <div class="mod-edu-school">${e.school}</div>
            <div class="mod-edu-date">${[e.startDate, e.endDate].filter(Boolean).join(' – ')}</div>
          </div>`).join('')}
      </div>` : ''}
      ${d.projects.length ? `
      <div class="mod-section">
        <div class="mod-section-title"><i class="fa-solid fa-diagram-project" style="font-size:12px"></i> Projects</div>
        ${d.projects.map(p => `
          <div class="mod-exp">
            <div class="mod-exp-head"><span class="mod-exp-title">${p.name}</span></div>
            ${p.tech ? `<div class="mod-exp-company">${p.tech}</div>` : ''}
            ${p.description ? `<div class="mod-exp-desc">${p.description}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}
      ${d.certifications.length ? `
      <div class="mod-section">
        <div class="mod-section-title"><i class="fa-solid fa-certificate" style="font-size:12px"></i> Certifications</div>
        ${d.certifications.map(c => `
          <div style="font-size:12px;margin-bottom:6px;">
            <strong>${c.name}</strong>${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` <span style="color:#6b7280">(${c.date})</span>` : ''}
          </div>`).join('')}
      </div>` : ''}
    </div>
  </div>`;
}

// ============================================
// 3. CREATIVE DESIGNER TEMPLATE
// ============================================
function renderCreative(d) {
  const p = d.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');

  return `<div class="resume-creative">
    <div class="cre-header">
      <div class="cre-name">${fullName || 'Your Name'}</div>
      ${p.professionalTitle ? `<div class="cre-title">${p.professionalTitle}</div>` : ''}
      <div class="cre-tags">
        ${d.skills.slice(0, 4).map(s => `<span class="cre-tag">${s}</span>`).join('')}
      </div>
    </div>
    <div class="cre-body">
      <div class="cre-left">
        ${d.summary ? `
        <div class="cre-section">
          <div class="cre-section-title">About</div>
          <p style="font-size:13px;color:#374151;line-height:1.7;">${d.summary}</p>
        </div>` : ''}
        ${d.experience.length ? `
        <div class="cre-section">
          <div class="cre-section-title">Experience</div>
          ${d.experience.map(e => `
            <div class="cre-exp">
              <div class="cre-exp-title">${e.jobTitle}</div>
              <div class="cre-exp-meta">${e.company} ${[e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ')}</div>
              ${e.description ? `<div class="cre-exp-desc">${e.description}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
        ${d.education.length ? `
        <div class="cre-section">
          <div class="cre-section-title">Education</div>
          ${d.education.map(e => `
            <div class="cre-edu-item">
              <div class="cre-edu-deg">${[e.degree, e.field].filter(Boolean).join(' in ')}</div>
              <div class="cre-edu-school">${e.school}</div>
              <div class="cre-edu-date">${[e.startDate, e.endDate].filter(Boolean).join(' – ')}</div>
            </div>`).join('')}
        </div>` : ''}
        ${d.projects.length ? `
        <div class="cre-section">
          <div class="cre-section-title">Projects</div>
          ${d.projects.map(pr => `
            <div class="cre-exp">
              <div class="cre-exp-title">${pr.name}</div>
              ${pr.tech ? `<div class="cre-exp-meta">${pr.tech}</div>` : ''}
              ${pr.description ? `<div class="cre-exp-desc">${pr.description}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="cre-sidebar">
        <div class="cre-sidebar-section">
          <div class="cre-sidebar-title">Contact</div>
          ${p.email ? `<div class="cre-contact-item"><i class="fa-solid fa-envelope" style="color:#7c3aed"></i>${p.email}</div>` : ''}
          ${p.phone ? `<div class="cre-contact-item"><i class="fa-solid fa-phone" style="color:#7c3aed"></i>${p.phone}</div>` : ''}
          ${p.location ? `<div class="cre-contact-item"><i class="fa-solid fa-location-dot" style="color:#7c3aed"></i>${p.location}</div>` : ''}
          ${p.linkedin ? `<div class="cre-contact-item"><i class="fa-brands fa-linkedin" style="color:#7c3aed"></i>${p.linkedin.replace('https://linkedin.com/in/','')}</div>` : ''}
          ${p.website ? `<div class="cre-contact-item"><i class="fa-solid fa-globe" style="color:#7c3aed"></i>${p.website}</div>` : ''}
        </div>
        ${d.skills.length ? `
        <div class="cre-sidebar-section">
          <div class="cre-sidebar-title">Skills</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${d.skills.map(s => `<span class="cre-skill-pill">${s}</span>`).join('')}
          </div>
        </div>` : ''}
        ${d.certifications.length ? `
        <div class="cre-sidebar-section">
          <div class="cre-sidebar-title">Certifications</div>
          ${d.certifications.map(c => `
            <div style="font-size:11px;color:#4b5563;margin-bottom:5px;">
              <strong>${c.name}</strong><br>${c.issuer}
            </div>`).join('')}
        </div>` : ''}
        ${d.languages.length ? `
        <div class="cre-sidebar-section">
          <div class="cre-sidebar-title">Languages</div>
          ${d.languages.map(l => `<div style="font-size:12px;margin-bottom:4px;">${l.language} — ${l.proficiency}</div>`).join('')}
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

// ============================================
// 4. CORPORATE MINIMAL TEMPLATE
// ============================================
function renderCorporate(d) {
  const p = d.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').toUpperCase();

  return `<div class="resume-corporate">
    <div class="corp-header">
      <div class="corp-name">${fullName || 'YOUR NAME'}</div>
      ${p.professionalTitle ? `<div class="corp-title">${p.professionalTitle}</div>` : ''}
    </div>
    <div class="corp-divider"></div>
    <div class="corp-contact">
      ${p.email ? `<span>${p.email}</span>` : ''}
      ${p.phone ? `<span>${p.phone}</span>` : ''}
      ${p.location ? `<span>${p.location}</span>` : ''}
      ${p.linkedin ? `<span>${p.linkedin.replace('https://linkedin.com/in/','linkedin.com/in/')}</span>` : ''}
      ${p.website ? `<span>${p.website}</span>` : ''}
    </div>
    <div class="corp-divider"></div>

    ${d.summary ? `
    <div class="corp-section">
      <div class="corp-section-title">Summary</div>
      <p style="font-size:13px;color:#374151;line-height:1.7;">${d.summary}</p>
    </div>` : ''}

    ${d.experience.length ? `
    <div class="corp-section">
      <div class="corp-section-title">Experience</div>
      ${d.experience.map(e => `
        <div class="corp-exp">
          <div class="corp-exp-head">
            <span class="corp-exp-title">${e.jobTitle}</span>
            <span class="corp-exp-date">${[e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ')}</span>
          </div>
          <div class="corp-exp-company">${[e.company, e.location].filter(Boolean).join(', ')}</div>
          ${e.description ? `<div class="corp-exp-desc">${e.description}</div>` : ''}
          <div class="corp-divider-light"></div>
        </div>`).join('')}
    </div>` : ''}

    ${d.education.length ? `
    <div class="corp-section">
      <div class="corp-section-title">Education</div>
      ${d.education.map(e => `
        <div class="corp-edu">
          <div>
            <div class="corp-edu-deg">${[e.degree, e.field].filter(Boolean).join(' in ')}</div>
            <div class="corp-edu-school">${e.school}</div>
          </div>
          <div class="corp-edu-date">${[e.startDate, e.endDate].filter(Boolean).join(' – ')}</div>
        </div>`).join('')}
    </div>` : ''}

    ${d.skills.length ? `
    <div class="corp-section">
      <div class="corp-section-title">Skills</div>
      <div class="corp-skills">
        ${d.skills.map(s => `<span class="corp-skill">${s}</span>`).join('')}
      </div>
    </div>` : ''}

    ${d.projects.length ? `
    <div class="corp-section">
      <div class="corp-section-title">Projects</div>
      ${d.projects.map(p => `
        <div class="corp-exp">
          <div class="corp-exp-head">
            <span class="corp-exp-title">${p.name}</span>
          </div>
          ${p.tech ? `<div class="corp-exp-company">${p.tech}</div>` : ''}
          ${p.description ? `<div class="corp-exp-desc">${p.description}</div>` : ''}
          <div class="corp-divider-light"></div>
        </div>`).join('')}
    </div>` : ''}

    ${d.certifications.length ? `
    <div class="corp-section">
      <div class="corp-section-title">Certifications</div>
      ${d.certifications.map(c => `
        <div style="font-size:12px;margin-bottom:6px;color:#374151;">
          ${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${d.languages.length ? `
    <div class="corp-section">
      <div class="corp-section-title">Languages</div>
      <div class="corp-skills">
        ${d.languages.map(l => `<span class="corp-skill">${l.language} (${l.proficiency})</span>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

// ============================================
// 5. TECH PROFESSIONAL TEMPLATE
// ============================================
function renderTech(d) {
  const p = d.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');

  // Group skills by category (simple heuristic)
  const techGroups = {
    'Languages': d.skills.filter(s => ['JavaScript','TypeScript','Python','Java','C++','Go','Rust','Ruby','PHP','Swift','Kotlin'].includes(s)),
    'Frameworks': d.skills.filter(s => ['React','Vue','Angular','Node.js','Django','Flask','Spring','Laravel','Next.js'].includes(s)),
    'DevOps & Cloud': d.skills.filter(s => ['AWS','GCP','Azure','Docker','Kubernetes','CI/CD','Terraform','Jenkins'].includes(s)),
    'Other': d.skills.filter(s => !['JavaScript','TypeScript','Python','Java','C++','Go','Rust','Ruby','PHP','Swift','Kotlin','React','Vue','Angular','Node.js','Django','Flask','Spring','Laravel','Next.js','AWS','GCP','Azure','Docker','Kubernetes','CI/CD','Terraform','Jenkins'].includes(s))
  };

  const skillGroups = Object.entries(techGroups).filter(([k,v]) => v.length > 0);
  if (skillGroups.length === 0 && d.skills.length) {
    skillGroups.push(['Skills', d.skills]);
  }

  return `<div class="resume-tech">
    <div class="tech-header">
      <div class="tech-name">${fullName || 'Your Name'}</div>
      ${p.professionalTitle ? `<div class="tech-title">${p.professionalTitle}</div>` : ''}
      <div class="tech-contact">
        ${p.email ? `<span class="tech-contact-item"><i class="fa-solid fa-envelope"></i>${p.email}</span>` : ''}
        ${p.phone ? `<span class="tech-contact-item"><i class="fa-solid fa-phone"></i>${p.phone}</span>` : ''}
        ${p.location ? `<span class="tech-contact-item"><i class="fa-solid fa-location-dot"></i>${p.location}</span>` : ''}
        ${p.github ? `<span class="tech-contact-item"><i class="fa-brands fa-github"></i>${p.github.replace('https://github.com/','')}</span>` : ''}
        ${p.linkedin ? `<span class="tech-contact-item"><i class="fa-brands fa-linkedin"></i>${p.linkedin.replace('https://linkedin.com/in/','')}</span>` : ''}
        ${p.website ? `<span class="tech-contact-item"><i class="fa-solid fa-globe"></i>${p.website}</span>` : ''}
      </div>
      ${d.skills.length ? `
      <div class="tech-tags" style="margin-top:10px;">
        ${d.skills.slice(0, 8).map(s => `<span class="tech-tag">${s}</span>`).join('')}
      </div>` : ''}
    </div>
    <div class="tech-body">
      <div class="tech-main">
        ${d.summary ? `
        <div class="tech-section">
          <div class="tech-section-title">// About</div>
          <p style="font-size:12px;color:#94a3b8;line-height:1.7;">${d.summary}</p>
        </div>` : ''}
        ${d.experience.length ? `
        <div class="tech-section">
          <div class="tech-section-title">// Experience</div>
          ${d.experience.map(e => `
            <div class="tech-exp">
              <div class="tech-exp-title">${e.jobTitle}</div>
              <div class="tech-exp-meta">${e.company} · ${[e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' → ')}</div>
              ${e.description ? `<div class="tech-exp-desc">${e.description}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
        ${d.projects.length ? `
        <div class="tech-section">
          <div class="tech-section-title">// Projects</div>
          ${d.projects.map(pr => `
            <div class="tech-exp">
              <div class="tech-exp-title">${pr.name}${pr.url ? ` <a href="${pr.url}" style="color:#6366f1;font-size:10px;">↗</a>` : ''}</div>
              ${pr.tech ? `<div class="tech-exp-meta">${pr.tech}</div>` : ''}
              ${pr.description ? `<div class="tech-exp-desc">${pr.description}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="tech-sidebar">
        ${skillGroups.length ? `
        <div class="tech-contact-block">
          <div class="tech-sidebar-title">Tech Stack</div>
          ${skillGroups.map(([cat, skills]) => `
            <div class="tech-skill-row">
              <div class="tech-skill-cat">${cat}</div>
              <div class="tech-skill-pills">
                ${skills.map(s => `<span class="tech-skill-pill">${s}</span>`).join('')}
              </div>
            </div>`).join('')}
        </div>` : ''}
        ${d.education.length ? `
        <div class="tech-contact-block">
          <div class="tech-sidebar-title">Education</div>
          ${d.education.map(e => `
            <div class="tech-edu">
              <div class="tech-edu-deg">${[e.degree, e.field].filter(Boolean).join(' in ')}</div>
              <div class="tech-edu-school">${e.school}</div>
              <div style="font-size:10px;color:#475569;">${[e.startDate, e.endDate].filter(Boolean).join(' – ')}</div>
            </div>`).join('')}
        </div>` : ''}
        ${d.certifications.length ? `
        <div class="tech-contact-block">
          <div class="tech-sidebar-title">Certifications</div>
          ${d.certifications.map(c => `<div class="tech-cert">${c.name}${c.issuer ? ` — ${c.issuer}` : ''}</div>`).join('')}
        </div>` : ''}
        ${d.languages.length ? `
        <div class="tech-contact-block">
          <div class="tech-sidebar-title">Languages</div>
          ${d.languages.map(l => `<div class="tech-cert">${l.language} (${l.proficiency})</div>`).join('')}
        </div>` : ''}
      </div>
    </div>
  </div>`;
}

// ---- Template Switching ----
function switchTemplate(tpl) {
  STATE.ui.currentTemplate = tpl;

  // Update quick switch buttons
  document.querySelectorAll('.tqs-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tpl === tpl);
  });

  // Update template cards
  document.querySelectorAll('.template-card').forEach(c => {
    c.classList.toggle('active', c.dataset.tpl === tpl);
  });

  renderResume();
  saveState();
}

function selectTemplate(tpl) {
  switchTemplate(tpl);
  showToast(`Template switched to ${tpl.charAt(0).toUpperCase() + tpl.slice(1)}`, 'success');
}

// ---- Get Plain Text for Export ----
function getResumeAsText() {
  const d = STATE.data;
  const p = d.personal;
  let text = '';

  text += [p.firstName, p.lastName].filter(Boolean).join(' ') + '\n';
  if (p.professionalTitle) text += p.professionalTitle + '\n';
  const contacts = [p.email, p.phone, p.location, p.website].filter(Boolean);
  if (contacts.length) text += contacts.join(' | ') + '\n';
  if (p.linkedin) text += p.linkedin + '\n';
  if (p.github) text += p.github + '\n';
  text += '\n';

  if (d.summary) {
    text += 'PROFESSIONAL SUMMARY\n' + '─'.repeat(40) + '\n';
    text += d.summary + '\n\n';
  }

  if (d.experience.length) {
    text += 'WORK EXPERIENCE\n' + '─'.repeat(40) + '\n';
    d.experience.forEach(e => {
      text += `${e.jobTitle} | ${e.company}\n`;
      text += `${[e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ')}\n`;
      if (e.description) text += e.description + '\n';
      text += '\n';
    });
  }

  if (d.education.length) {
    text += 'EDUCATION\n' + '─'.repeat(40) + '\n';
    d.education.forEach(e => {
      text += `${[e.degree, e.field].filter(Boolean).join(' in ')} | ${e.school}\n`;
      text += `${[e.startDate, e.endDate].filter(Boolean).join(' – ')}\n\n`;
    });
  }

  if (d.skills.length) {
    text += 'SKILLS\n' + '─'.repeat(40) + '\n';
    text += d.skills.join(', ') + '\n\n';
  }

  if (d.projects.length) {
    text += 'PROJECTS\n' + '─'.repeat(40) + '\n';
    d.projects.forEach(pr => {
      text += `${pr.name}${pr.tech ? ' | ' + pr.tech : ''}\n`;
      if (pr.description) text += pr.description + '\n';
      text += '\n';
    });
  }

  if (d.certifications.length) {
    text += 'CERTIFICATIONS\n' + '─'.repeat(40) + '\n';
    d.certifications.forEach(c => {
      text += `${c.name}${c.issuer ? ' — ' + c.issuer : ''}${c.date ? ' (' + c.date + ')' : ''}\n`;
    });
    text += '\n';
  }

  if (d.languages.length) {
    text += 'LANGUAGES\n' + '─'.repeat(40) + '\n';
    text += d.languages.map(l => `${l.language} (${l.proficiency})`).join(', ') + '\n';
  }

  return text;
}
