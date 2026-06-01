/* ============================================
   EXPORT.JS — All Export Formats
   ============================================ */

// ---- PDF Export ----
function downloadPDF() {
  showToast('Preparing PDF...', 'info');
  closeModal('exportModal');

  // Create a print-ready version
  const resumeContent = document.getElementById('resumePreview').innerHTML;
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume — ${getFullName()}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; }
    ${getResumeCSS()}
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
  ${resumeContent}
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
        window.close();
      }, 500);
    };
  </script>
</body>
</html>`);

  printWindow.document.close();
  showToast('PDF dialog opened', 'success');
}

// ---- DOCX Export ----
function downloadDOCX() {
  showToast('Generating DOCX...', 'info');
  const d = STATE.data;
  const p = d.personal;
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Resume';

  // Build RTF format (Word-compatible)
  let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033
{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Arial;}{\\f2\\fmodern\\fcharset0 Courier New;}}
{\\colortbl;\\red0\\green0\\blue0;\\red99\\green102\\blue241;\\red107\\green114\\blue128;}
\\widowctrl\\widoctrl\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440

`;

  // Name
  rtf += `\\f1\\fs36\\b\\cf1 ${escRTF([p.firstName, p.lastName].filter(Boolean).join(' '))}\\b0\\par\n`;
  if (p.professionalTitle) rtf += `\\f1\\fs22\\cf3 ${escRTF(p.professionalTitle)}\\cf1\\par\n`;

  // Contact
  const contacts = [p.email, p.phone, p.location, p.linkedin].filter(Boolean);
  if (contacts.length) {
    rtf += `\\f1\\fs18\\cf3 ${contacts.map(escRTF).join(' | ')}\\cf1\\par\n`;
  }
  rtf += `\\par\n`;

  // Summary
  if (d.summary) {
    rtf += `\\f1\\fs22\\b PROFESSIONAL SUMMARY\\b0\\par\n`;
    rtf += `\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n`;
    rtf += `\\f1\\fs20 ${escRTF(d.summary)}\\par\n\\par\n`;
  }

  // Experience
  if (d.experience.length) {
    rtf += `\\f1\\fs22\\b WORK EXPERIENCE\\b0\\par\n`;
    rtf += `\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n`;
    d.experience.forEach(e => {
      rtf += `\\f1\\fs20\\b ${escRTF(e.jobTitle)}\\b0`;
      const dates = [e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' - ');
      if (dates) rtf += `\\tab\\cf3 ${escRTF(dates)}\\cf1`;
      rtf += `\\par\n`;
      if (e.company) rtf += `\\cf3\\i ${escRTF([e.company, e.location].filter(Boolean).join(', '))}\\i0\\cf1\\par\n`;
      if (e.description) {
        e.description.split('\n').filter(Boolean).forEach(line => {
          rtf += `\\f1\\fs18\\li720 ${escRTF(line.replace(/^[-•*]\s*/, '• '))}\\par\n`;
        });
      }
      rtf += `\\par\n`;
    });
  }

  // Education
  if (d.education.length) {
    rtf += `\\f1\\fs22\\b EDUCATION\\b0\\par\n`;
    rtf += `\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n`;
    d.education.forEach(e => {
      rtf += `\\f1\\fs20\\b ${escRTF([e.degree, e.field].filter(Boolean).join(' in '))}\\b0`;
      const dates = [e.startDate, e.endDate].filter(Boolean).join(' - ');
      if (dates) rtf += `\\tab\\cf3 ${escRTF(dates)}\\cf1`;
      rtf += `\\par\n`;
      if (e.school) rtf += `\\cf3\\i ${escRTF(e.school)}${e.gpa ? ` - GPA: ${e.gpa}` : ''}\\i0\\cf1\\par\n`;
      rtf += `\\par\n`;
    });
  }

  // Skills
  if (d.skills.length) {
    rtf += `\\f1\\fs22\\b SKILLS\\b0\\par\n`;
    rtf += `\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n`;
    rtf += `\\f1\\fs18 ${escRTF(d.skills.join(' • '))}\\par\n\\par\n`;
  }

  // Projects
  if (d.projects.length) {
    rtf += `\\f1\\fs22\\b PROJECTS\\b0\\par\n`;
    rtf += `\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n`;
    d.projects.forEach(pr => {
      rtf += `\\f1\\fs20\\b ${escRTF(pr.name)}\\b0\\par\n`;
      if (pr.tech) rtf += `\\cf2 ${escRTF(pr.tech)}\\cf1\\par\n`;
      if (pr.description) rtf += `\\f1\\fs18 ${escRTF(pr.description)}\\par\n`;
      rtf += `\\par\n`;
    });
  }

  // Certifications
  if (d.certifications.length) {
    rtf += `\\f1\\fs22\\b CERTIFICATIONS\\b0\\par\n`;
    rtf += `\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\n`;
    d.certifications.forEach(c => {
      rtf += `\\f1\\fs18 \\bullet  ${escRTF(c.name)}${c.issuer ? ` - ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}\\par\n`;
    });
    rtf += `\\par\n`;
  }

  rtf += '}';

  const blob = new Blob([rtf], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fullName.replace(/\s+/g, '_')}_Resume.rtf`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('DOCX/RTF downloaded!', 'success');
  closeModal('exportModal');
}

function escRTF(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);
}

// ---- TXT Export ----
function downloadTXT() {
  collectFormData();
  const text = getResumeAsText();
  const fullName = getFullName().replace(/\s+/g, '_') || 'Resume';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fullName}_Resume.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('TXT file downloaded!', 'success');
  closeModal('exportModal');
}

// ---- Print ----
function printResume() {
  const resumeEl = document.getElementById('resumePreview');
  if (!resumeEl) return;

  const printContent = resumeEl.innerHTML;
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume — ${getFullName()}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; }
    ${getResumeCSS()}
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  ${printContent}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
  closeModal('exportModal');
}

// ---- Copy Resume Text ----
function copyResumeText() {
  collectFormData();
  const text = getResumeAsText();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Resume copied to clipboard!', 'success');
    closeModal('exportModal');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Resume copied to clipboard!', 'success');
    closeModal('exportModal');
  });
}

// ---- Get Resume CSS for exports ----
function getResumeCSS() {
  // Inline all resume-specific CSS
  return `
    .resume-ats { font-family: 'Georgia', serif; padding: 48px; color: #1a1a2e; background: white; line-height: 1.5; }
    .resume-ats .res-header { margin-bottom: 20px; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; }
    .resume-ats .res-name { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
    .resume-ats .res-title { font-size: 14px; color: #4b5563; margin-bottom: 8px; }
    .resume-ats .res-contact { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: #4b5563; }
    .resume-ats .res-section { margin-bottom: 18px; }
    .resume-ats .res-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1a1a2e; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .resume-ats .res-summary { font-size: 13px; color: #374151; line-height: 1.65; }
    .resume-ats .exp-item { margin-bottom: 14px; }
    .resume-ats .exp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .resume-ats .exp-title { font-size: 13px; font-weight: 700; }
    .resume-ats .exp-dates { font-size: 11px; color: #6b7280; }
    .resume-ats .exp-company { font-size: 12px; color: #4b5563; font-style: italic; margin-bottom: 4px; }
    .resume-ats .exp-desc { font-size: 12px; color: #374151; line-height: 1.6; }
    .resume-ats .exp-bullets { list-style: disc; padding-left: 18px; font-size: 12px; color: #374151; line-height: 1.6; }
    .resume-ats .edu-item { margin-bottom: 10px; }
    .resume-ats .edu-header { display: flex; justify-content: space-between; }
    .resume-ats .edu-degree { font-size: 13px; font-weight: 700; }
    .resume-ats .edu-dates { font-size: 11px; color: #6b7280; }
    .resume-ats .edu-school { font-size: 12px; color: #4b5563; }
    .resume-ats .skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .resume-ats .skill-item { font-size: 12px; color: #374151; background: #f3f4f6; padding: 3px 10px; border-radius: 4px; }
    .resume-ats .cert-item { font-size: 12px; margin-bottom: 4px; }

    .resume-modern { display: flex; min-height: 1123px; font-family: 'Inter', sans-serif; background: white; }
    .resume-modern .mod-sidebar { width: 240px; flex-shrink: 0; background: #1e1b4b; color: white; padding: 40px 24px; display: flex; flex-direction: column; gap: 24px; }
    .resume-modern .mod-name { font-size: 22px; font-weight: 800; line-height: 1.2; margin-bottom: 4px; }
    .resume-modern .mod-title { font-size: 12px; color: #a5b4fc; font-weight: 500; }
    .resume-modern .mod-contact-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; margin-bottom: 8px; }
    .resume-modern .mod-contact-item { font-size: 11px; color: #c7d2fe; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; word-break: break-all; }
    .resume-modern .mod-skill-wrap { margin-bottom: 6px; }
    .resume-modern .mod-skill-name { font-size: 11px; color: #e0e7ff; margin-bottom: 3px; }
    .resume-modern .mod-skill-bar { height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; }
    .resume-modern .mod-skill-fill { height: 100%; background: #818cf8; border-radius: 2px; }
    .resume-modern .mod-main { flex: 1; padding: 40px 36px; }
    .resume-modern .mod-section { margin-bottom: 24px; }
    .resume-modern .mod-section-title { font-size: 14px; font-weight: 800; color: #1e1b4b; padding-bottom: 6px; margin-bottom: 12px; border-bottom: 2px solid #6366f1; display: flex; align-items: center; gap: 8px; }
    .resume-modern .mod-summary { font-size: 13px; color: #374151; line-height: 1.7; }
    .resume-modern .mod-exp { margin-bottom: 14px; }
    .resume-modern .mod-exp-head { display: flex; justify-content: space-between; align-items: baseline; }
    .resume-modern .mod-exp-title { font-size: 13px; font-weight: 700; color: #111827; }
    .resume-modern .mod-exp-date { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 100px; }
    .resume-modern .mod-exp-company { font-size: 12px; color: #6366f1; font-weight: 600; margin: 2px 0 6px; }
    .resume-modern .mod-exp-desc { font-size: 12px; color: #374151; line-height: 1.6; }
    .resume-modern .mod-bullets { list-style: none; padding: 0; }
    .resume-modern .mod-bullets li { font-size: 12px; color: #374151; line-height: 1.6; padding-left: 16px; position: relative; margin-bottom: 3px; }
    .resume-modern .mod-bullets li::before { content: '▸'; position: absolute; left: 0; color: #6366f1; }
    .resume-modern .mod-edu-item { margin-bottom: 10px; }
    .resume-modern .mod-edu-degree { font-size: 13px; font-weight: 700; }
    .resume-modern .mod-edu-school { font-size: 12px; color: #6b7280; }
    .resume-modern .mod-edu-date { font-size: 11px; color: #9ca3af; }

    .resume-creative { font-family: 'Inter', sans-serif; background: white; overflow: hidden; }
    .resume-creative .cre-header { background: linear-gradient(135deg, #7c3aed, #a78bfa); padding: 40px 48px 32px; color: white; position: relative; }
    .resume-creative .cre-header::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 30px; background: white; clip-path: ellipse(55% 100% at 50% 100%); }
    .resume-creative .cre-name { font-size: 30px; font-weight: 900; letter-spacing: -1px; }
    .resume-creative .cre-title { font-size: 14px; color: #ddd6fe; margin: 4px 0 16px; }
    .resume-creative .cre-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .resume-creative .cre-tag { background: rgba(255,255,255,0.2); padding: 3px 12px; border-radius: 100px; font-size: 11px; }
    .resume-creative .cre-body { padding: 48px 48px 40px; display: grid; grid-template-columns: 1fr 220px; gap: 32px; }
    .resume-creative .cre-section { margin-bottom: 24px; }
    .resume-creative .cre-section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #7c3aed; margin-bottom: 10px; }
    .resume-creative .cre-exp { margin-bottom: 14px; padding-left: 14px; border-left: 2px solid #ede9fe; }
    .resume-creative .cre-exp-title { font-size: 13px; font-weight: 700; }
    .resume-creative .cre-exp-meta { font-size: 11px; color: #7c3aed; font-weight: 600; margin-bottom: 4px; }
    .resume-creative .cre-exp-desc { font-size: 12px; color: #374151; line-height: 1.6; }
    .resume-creative .cre-skill-pill { display: inline-block; background: #f3f0ff; color: #7c3aed; border: 1px solid #ddd6fe; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; margin: 3px; }
    .resume-creative .cre-sidebar-section { margin-bottom: 20px; }
    .resume-creative .cre-sidebar-title { font-size: 12px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .resume-creative .cre-contact-item { font-size: 11px; color: #4b5563; margin-bottom: 5px; display: flex; gap: 6px; align-items: center; }
    .resume-creative .cre-edu-item { margin-bottom: 8px; }
    .resume-creative .cre-edu-deg { font-size: 12px; font-weight: 700; color: #111827; }
    .resume-creative .cre-edu-school { font-size: 11px; color: #6b7280; }
    .resume-creative .cre-edu-date { font-size: 10px; color: #9ca3af; }

    .resume-corporate { font-family: 'Inter', sans-serif; background: white; padding: 56px 60px; color: #1a1a1a; }
    .resume-corporate .corp-name { font-size: 28px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; color: #111; }
    .resume-corporate .corp-title { font-size: 13px; color: #6b7280; letter-spacing: 1px; margin: 6px 0 14px; }
    .resume-corporate .corp-divider { height: 1px; background: #1a1a1a; margin: 16px 0; }
    .resume-corporate .corp-contact { display: flex; gap: 20px; flex-wrap: wrap; font-size: 11px; color: #6b7280; }
    .resume-corporate .corp-section { margin-bottom: 24px; }
    .resume-corporate .corp-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 12px; font-weight: 500; }
    .resume-corporate .corp-exp-head { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .resume-corporate .corp-exp-title { font-size: 13px; font-weight: 600; }
    .resume-corporate .corp-exp-date { font-size: 11px; color: #6b7280; }
    .resume-corporate .corp-exp-company { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
    .resume-corporate .corp-exp-desc { font-size: 12px; color: #4b5563; line-height: 1.7; }
    .resume-corporate .corp-edu { margin-bottom: 10px; display: flex; justify-content: space-between; }
    .resume-corporate .corp-edu-deg { font-size: 13px; font-weight: 600; }
    .resume-corporate .corp-edu-school { font-size: 12px; color: #6b7280; }
    .resume-corporate .corp-edu-date { font-size: 11px; color: #9ca3af; }
    .resume-corporate .corp-skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .resume-corporate .corp-skill { font-size: 12px; color: #4b5563; background: #f9fafb; border: 1px solid #e5e7eb; padding: 4px 12px; border-radius: 3px; }
    .resume-corporate .corp-divider-light { height: 1px; background: #f3f4f6; margin: 8px 0; }

    .resume-tech { font-family: 'Inter', sans-serif; background: #0f172a; color: #e2e8f0; padding: 0; min-height: 1123px; }
    .resume-tech .tech-header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 40px 48px 32px; border-bottom: 1px solid #1e293b; }
    .resume-tech .tech-name { font-size: 28px; font-weight: 900; color: #f1f5f9; letter-spacing: -0.5px; }
    .resume-tech .tech-title { font-size: 14px; color: #64748b; margin: 4px 0 16px; }
    .resume-tech .tech-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .resume-tech .tech-tag { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; padding: 3px 12px; border-radius: 4px; font-size: 11px; }
    .resume-tech .tech-contact { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
    .resume-tech .tech-contact-item { font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 5px; }
    .resume-tech .tech-body { padding: 32px 48px; display: grid; grid-template-columns: 1fr 200px; gap: 32px; }
    .resume-tech .tech-section { margin-bottom: 24px; }
    .resume-tech .tech-section-title { font-size: 12px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
    .resume-tech .tech-exp { margin-bottom: 16px; padding-left: 14px; border-left: 2px solid #1e293b; }
    .resume-tech .tech-exp-title { font-size: 13px; font-weight: 700; color: #f1f5f9; }
    .resume-tech .tech-exp-meta { font-size: 11px; color: #6366f1; margin: 2px 0 6px; }
    .resume-tech .tech-exp-desc { font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .resume-tech .tech-skill-row { margin-bottom: 8px; }
    .resume-tech .tech-skill-cat { font-size: 10px; color: #6366f1; margin-bottom: 4px; text-transform: uppercase; }
    .resume-tech .tech-skill-pills { display: flex; flex-wrap: wrap; gap: 4px; }
    .resume-tech .tech-skill-pill { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); color: #a5b4fc; padding: 2px 8px; border-radius: 3px; font-size: 11px; }
    .resume-tech .tech-sidebar-title { font-size: 10px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .resume-tech .tech-contact-block { margin-bottom: 20px; }
    .resume-tech .tech-cert { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
    .resume-tech .tech-edu { margin-bottom: 10px; }
    .resume-tech .tech-edu-deg { font-size: 12px; font-weight: 600; color: #e2e8f0; }
    .resume-tech .tech-edu-school { font-size: 11px; color: #64748b; }
  `;
}

// ---- Helper Functions ----
function getFullName() {
  const p = STATE.data.personal;
  return [p.firstName, p.lastName].filter(Boolean).join(' ');
}

// ---- Open/Close Export Modal ----
function openExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function closeModalOutside(event, id) {
  if (event.target.id === id) closeModal(id);
}

// ---- Zoom Controls ----
function zoomIn() {
  STATE.ui.zoom = Math.min(150, STATE.ui.zoom + 10);
  applyZoom();
}

function zoomOut() {
  STATE.ui.zoom = Math.max(30, STATE.ui.zoom - 10);
  applyZoom();
}

function zoomReset() {
  STATE.ui.zoom = 85;
  applyZoom();
}

function applyZoom() {
  const page = document.getElementById('resumePreview');
  const display = document.getElementById('zoomLevel');
  if (page) page.style.transform = `scale(${STATE.ui.zoom / 100})`;
  if (display) display.textContent = STATE.ui.zoom + '%';
}

// ---- Fullscreen ----
function toggleFullscreen() {
  const overlay = document.getElementById('fullscreenOverlay');
  const stage = document.getElementById('fullscreenStage');
  const page = document.getElementById('resumePreview');

  if (!STATE.ui.isFullscreen) {
    const clone = page.cloneNode(true);
    clone.style.transform = 'scale(1)';
    clone.style.transformOrigin = 'top center';
    clone.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
    if (stage) {
      stage.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'filter: drop-shadow(0 20px 60px rgba(0,0,0,0.5));';
      wrapper.appendChild(clone);
      stage.appendChild(wrapper);
    }
    overlay.classList.add('active');
    STATE.ui.isFullscreen = true;
  } else {
    overlay.classList.remove('active');
    if (stage) stage.innerHTML = '';
    STATE.ui.isFullscreen = false;
  }
}
