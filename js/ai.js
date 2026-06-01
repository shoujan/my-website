/* ============================================
   AI.JS — Cloudflare Worker (Groq) Integration
   All requests are routed through a secure
   Cloudflare Worker so the API key is NEVER
   exposed to the browser.
   ============================================ */

// ---- AI Backend Endpoint ----
// The Worker accepts the same JSON body as Groq's
// /openai/v1/chat/completions and injects the key server-side.
const AI_WORKER_ENDPOINT = (typeof window !== 'undefined' && window.AI_WORKER_URL)
  ? window.AI_WORKER_URL
  : 'https://cv-banau-ai.shoujansapkota1.workers.dev';

// ---- AI State ----
const AI_STATE = {
  lastFullResult: null,
  currentTab: 'ats',
  isGenerating: false
};

// ---- Backend availability ----
// With the Worker proxy, AI is always "ready" — no per-user key required.
function getApiKey() {
  // Returned value is only used as a truthy flag in legacy checks.
  return 'WORKER_PROXY';
}

// ---- Unified call to the AI Worker ----
async function callAIWorker(payload) {
  return fetch(AI_WORKER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // No Authorization header — the Worker injects the key server-side.
    },
    body: JSON.stringify(payload)
  });
}

// ---- Main Generate Function ----
async function generateWithAI(type) {
   /// Resume tracking
if(typeof gtag === 'function'){

    if(type === 'ats' || type === 'modern'){
        trackCVGeneration(type);
    }

    if(type === 'cover'){
        gtag('event', 'cover_letter_generated');
    }

    if(type === 'linkedin'){
        gtag('event', 'linkedin_bio_generated');
    }

}

// Firebase Counters
if(type === 'ats' && typeof incrementATS === 'function'){
    incrementATS();
}

if(type === 'modern' && typeof incrementModern === 'function'){
    incrementModern();
}
  const input = document.getElementById('aiInput')?.value?.trim();
  const jobTitle = document.getElementById('jobTitle')?.value?.trim();
  const jobDesc = document.getElementById('jobDescription')?.value?.trim();

  if (!input && !STATE.data.summary && !STATE.data.personal.firstName) {
    showToast('Please provide some information about yourself first', 'warning');
    return;
  }

  setApiStatus('loading', 'Generating with AI...');
  showAIProgress(true);
  AI_STATE.isGenerating = true;

  try {
    const model = document.getElementById('aiModel')?.value || 'llama-3.3-70b-versatile';
    const tone = document.getElementById('aiTone')?.value || 'professional';
    const language = document.getElementById('aiLanguage')?.value || 'en';

    const prompt = buildPrompt(type, input, jobTitle, jobDesc, tone, language);
    updateAIProgressText('Contacting AI...', 30);

    const response = await callAIWorker({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert resume writer and career coach with 15+ years of experience. You write ${tone}, compelling resumes that pass ATS systems and impress hiring managers. Always return valid JSON.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    updateAIProgressText('Processing response...', 70);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API Error ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    updateAIProgressText('Parsing results...', 90);

    const parsed = parseAIResponse(content, type);
    AI_STATE.lastFullResult = parsed;

    updateAIProgressText('Done! ✨', 100);

    setTimeout(() => {
      showAIProgress(false);
      setApiStatus('ok', 'AI generation complete');
      openAIResultModal(parsed, type);
    }, 500);

  } catch (error) {
    console.error('AI Error:', error);
    showAIProgress(false);
    setApiStatus('error', 'AI generation failed');

    // Intelligent fallback
    const fallback = generateFallback(input || buildTextFromState(), type);
    AI_STATE.lastFullResult = fallback;
    showToast('AI generation failed: ' + (error.message || 'Unknown error'), 'error');
    openAIResultModal(fallback, type);
  }

  AI_STATE.isGenerating = false;
}

// ---- Build Prompts ----
function buildPrompt(type, input, jobTitle, jobDesc, tone, language) {
  const currentData = buildTextFromState();
  const combinedInput = input || currentData;

  const baseContext = `
Resume Data / Experience:
${combinedInput}

${jobTitle ? `Target Job Title: ${jobTitle}` : ''}
${jobDesc ? `Job Description for ATS optimization:\n${jobDesc}` : ''}

Writing tone: ${tone}
Language: ${language}
`;

  if (type === 'all') {
    return `${baseContext}

Based on the above information, generate a complete professional resume package. Return ONLY valid JSON in this exact format:

{
  "ats_resume": {
    "personal": {
      "firstName": "...",
      "lastName": "...",
      "professionalTitle": "...",
      "email": "...",
      "phone": "...",
      "location": "...",
      "linkedin": "...",
      "github": "",
      "website": ""
    },
    "summary": "3-4 sentence professional summary. Write naturally and specifically — avoid clichés like Results-driven, passionate, dynamic, or proven track record. Open with a direct, genuine statement about who the person is professionally.",
    "experience": [
      {
        "jobTitle": "...",
        "company": "...",
        "location": "...",
        "startDate": "...",
        "endDate": "...",
        "current": false,
        "description": "• Achievement 1\\n• Achievement 2\\n• Achievement 3"
      }
    ],
    "education": [
      {
        "degree": "...",
        "field": "...",
        "school": "...",
        "startDate": "...",
        "endDate": "...",
        "gpa": ""
      }
    ],
    "skills": ["skill1", "skill2", "skill3"],
    "projects": [],
    "certifications": [],
    "languages": []
  },
  "modern_resume": "Formatted modern resume as plain text with enhanced descriptions",
  "cover_letter": "Professional cover letter (3-4 paragraphs)",
  "linkedin_summary": "Compelling LinkedIn About section (300 words)"
}`;
  }

  if (type === 'ats') {
    return `${baseContext}

Create an ATS-optimized resume. Return ONLY valid JSON:
{
  "ats_resume": {
    "personal": {"firstName": "...", "lastName": "...", "professionalTitle": "...", "email": "...", "phone": "...", "location": "...", "linkedin": "", "github": "", "website": ""},
    "summary": "ATS-optimized summary that sounds human. No clichés like Results-driven or Proven track record. Begin with a specific, natural statement about the person's expertise or focus area.",
    "experience": [{"jobTitle": "...", "company": "...", "location": "...", "startDate": "MMM YYYY", "endDate": "MMM YYYY", "current": false, "description": "• Quantified achievement\\n• Another achievement"}],
    "education": [{"degree": "...", "field": "...", "school": "...", "startDate": "...", "endDate": "...", "gpa": ""}],
    "skills": ["technical skill 1", "technical skill 2"],
    "projects": [{"name": "...", "description": "...", "tech": "..."}],
    "certifications": [{"name": "...", "issuer": "...", "date": "..."}],
    "languages": []
  },
  "modern_resume": "",
  "cover_letter": "",
  "linkedin_summary": ""
}`;
  }

  if (type === 'modern') {
    return `${baseContext}

Create a compelling modern resume with enhanced, impactful descriptions. Focus on achievements with numbers and impact. Return ONLY valid JSON:
{
  "ats_resume": {
    "personal": {"firstName": "...", "lastName": "...", "professionalTitle": "...", "email": "...", "phone": "...", "location": "...", "linkedin": "", "github": "", "website": ""},
    "summary": "Compelling executive summary without overused phrases like Results-driven or Dynamic leader. Speak directly about impact, approach, and strengths in a confident but authentic voice.",
    "experience": [{"jobTitle": "...", "company": "...", "location": "...", "startDate": "...", "endDate": "...", "current": false, "description": "• Led team of X to achieve Y, resulting in Z% improvement\\n• Developed and implemented X that reduced costs by $Y"}],
    "education": [{"degree": "...", "field": "...", "school": "...", "startDate": "...", "endDate": "...", "gpa": ""}],
    "skills": ["skill1", "skill2"],
    "projects": [],
    "certifications": [],
    "languages": []
  },
  "modern_resume": "Enhanced modern version with compelling narrative",
  "cover_letter": "",
  "linkedin_summary": ""
}`;
  }

  if (type === 'cover') {
    return `${baseContext}

Write a compelling cover letter for ${jobTitle || 'the target position'}. Return ONLY valid JSON:
{
  "ats_resume": null,
  "modern_resume": "",
  "cover_letter": "Dear Hiring Manager,\\n\\n[Opening paragraph - express enthusiasm and mention specific company/role]\\n\\n[Body paragraph 1 - highlight most relevant experience and achievement]\\n\\n[Body paragraph 2 - demonstrate value and cultural fit]\\n\\n[Closing paragraph - call to action]\\n\\nSincerely,\\n[Name]",
  "linkedin_summary": ""
}`;
  }

  if (type === 'linkedin') {
    return `${baseContext}

Write a compelling LinkedIn About/Summary section. Return ONLY valid JSON:
{
  "ats_resume": null,
  "modern_resume": "",
  "cover_letter": "",
  "linkedin_summary": "Compelling 3-4 paragraph LinkedIn summary that starts with a hook, tells a professional story, highlights key achievements, and ends with a call-to-action. Include relevant keywords naturally. Make it personal yet professional."
}`;
  }

  return buildPrompt('all', input, jobTitle, jobDesc, tone, language);
}

// ---- Build text from current state ----
function buildTextFromState() {
  const d = STATE.data;
  const p = d.personal;
  let text = '';

  if (p.firstName || p.lastName) text += `Name: ${p.firstName} ${p.lastName}\n`;
  if (p.professionalTitle) text += `Title: ${p.professionalTitle}\n`;
  if (p.email) text += `Email: ${p.email}\n`;
  if (p.location) text += `Location: ${p.location}\n`;

  if (d.summary) text += `\nSummary: ${d.summary}\n`;

  d.experience.forEach(e => {
    text += `\nExperience: ${e.jobTitle} at ${e.company} (${e.startDate} - ${e.current ? 'Present' : e.endDate})\n`;
    if (e.description) text += e.description + '\n';
  });

  d.education.forEach(e => {
    text += `\nEducation: ${e.degree} in ${e.field} from ${e.school}\n`;
  });

  if (d.skills.length) text += `\nSkills: ${d.skills.join(', ')}\n`;

  return text;
}

// ---- Parse AI Response ----
function parseAIResponse(content, type) {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      ats: parsed.ats_resume ? JSON.stringify(parsed.ats_resume, null, 2) : '',
      modern: parsed.modern_resume || '',
      cover: parsed.cover_letter || '',
      linkedin: parsed.linkedin_summary || '',
      raw: parsed
    };
  } catch(e) {
    console.warn('JSON parse failed, using raw text:', e);
    return {
      ats: type === 'ats' ? content : '',
      modern: type === 'modern' ? content : '',
      cover: type === 'cover' ? content : '',
      linkedin: type === 'linkedin' ? content : '',
      raw: null
    };
  }
}

// ---- Natural Summary Generator (varied, non-cliché) ----
function generateNaturalSummary(title, skills) {
  const skillStr = skills.length > 0 ? skills.slice(0, 3).join(', ') : 'relevant technologies';
  const lowerTitle = title.toLowerCase();

  // Detect rough domain from title
  const isDev = /develop|engineer|software|frontend|backend|fullstack|web|mobile/i.test(lowerTitle);
  const isDesign = /design|ux|ui|creative|art/i.test(lowerTitle);
  const isData = /data|analyst|scientist|ml|machine learning|ai/i.test(lowerTitle);
  const isManage = /manager|director|lead|head|vp|chief|executive/i.test(lowerTitle);
  const isMarketing = /market|brand|content|seo|growth/i.test(lowerTitle);

  const variants = isDev ? [
    `${title} who enjoys turning complex problems into clean, reliable software. Experienced with ${skillStr} and passionate about writing code that teams actually want to maintain.`,
    `I build software that works — and works well. As a ${title} with hands-on experience in ${skillStr}, I focus on practical solutions, clear communication, and continuous learning.`,
    `Curious ${title} with a knack for bridging the gap between technical complexity and real-world impact. Comfortable across the stack and always looking to level up with tools like ${skillStr}.`,
    `${title} driven by the satisfaction of shipping things that matter. My background spans ${skillStr}, with a strong emphasis on collaboration, code quality, and iterative improvement.`
  ] : isData ? [
    `${title} who finds meaning in turning messy data into clear decisions. Skilled in ${skillStr}, with a habit of asking "why" before diving into the how.`,
    `I help teams understand their data. As a ${title}, I work across ${skillStr} to surface insights that drive smarter strategies and better outcomes.`,
    `Analytical ${title} with a practical approach to complex datasets. My work in ${skillStr} focuses on accuracy, storytelling, and making findings accessible to non-technical stakeholders.`
  ] : isDesign ? [
    `${title} who believes great design is invisible — it just works. I bring together user empathy, visual clarity, and hands-on experience with ${skillStr} to craft experiences people enjoy.`,
    `Design is problem-solving with a human face. As a ${title}, I combine aesthetic sensibility with structured thinking, working across ${skillStr} to deliver interfaces that delight and perform.`,
    `${title} focused on the space between what users need and what they experience. My toolkit includes ${skillStr}, and my process always starts with listening.`
  ] : isManage ? [
    `${title} who builds teams as deliberately as strategies. Experienced leading cross-functional groups, I focus on clarity, trust, and creating conditions where people do their best work.`,
    `I've led teams through ambiguity, tight timelines, and shifting priorities — and come out with strong relationships and shipped outcomes. As a ${title}, my edge is knowing when to push and when to listen.`,
    `${title} with a track record of turning goals into executed plans. I care about culture as much as results, and I believe the best outcomes come from teams that feel genuinely supported.`
  ] : isMarketing ? [
    `${title} who understands that the best marketing barely feels like marketing. I work across ${skillStr} to create content and campaigns that connect authentically and convert meaningfully.`,
    `I help brands find their voice and their audience. As a ${title} experienced in ${skillStr}, I balance creativity with data to build strategies that grow sustainably.`
  ] : [
    `${title} with a straightforward philosophy: understand the problem deeply, work collaboratively, and deliver something you're proud of. My background includes ${skillStr} and a consistent focus on quality.`,
    `I bring a combination of technical skill and clear communication to every project. As a ${title}, I've worked across ${skillStr} and thrive in environments where ownership and initiative are valued.`,
    `${title} who takes quality seriously without taking themselves too seriously. I'm comfortable with ambiguity, quick to adapt, and genuinely invested in the outcomes of the work I do.`,
    `What motivates me is straightforward: doing good work with good people. As a ${title} with experience in ${skillStr}, I aim to add real value wherever I land.`
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}

// ---- Intelligent Fallback ----
function generateFallback(input, type) {
  const lines = input.split('\n').filter(Boolean);
  const name = extractName(lines) || 'Professional';
  const title = extractTitle(lines) || 'Senior Professional';

  const fallbackATS = {
    personal: {
      firstName: name.split(' ')[0] || 'John',
      lastName: name.split(' ').slice(1).join(' ') || 'Doe',
      professionalTitle: title,
      email: extractEmail(input) || 'email@example.com',
      phone: extractPhone(input) || '',
      location: extractLocation(lines) || '',
      linkedin: '', github: '', website: ''
    },
    summary: generateNaturalSummary(title, extractSkills(input)),
    experience: [{
      id: 1, jobTitle: title, company: 'Current Employer', location: '',
      startDate: '2022', endDate: '', current: true,
      description: '• Led cross-functional teams to deliver projects on time and under budget\n• Improved key processes resulting in significant efficiency gains\n• Collaborated with stakeholders to align technical solutions with business objectives'
    }],
    education: [{ id: 1, degree: "Bachelor's Degree", field: 'Related Field', school: 'University', startDate: '2018', endDate: '2022', gpa: '' }],
    skills: extractSkills(input),
    projects: [], certifications: [], languages: []
  };

  return {
    ats: JSON.stringify(fallbackATS, null, 2),
    modern: `${name}\n${title}\n\nPROFESSIONAL SUMMARY\n${fallbackATS.summary}\n\nSKILLS\n${fallbackATS.skills.join(' • ')}`,
    cover: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${title} position. With my extensive background and proven track record, I am confident I would make a valuable contribution to your team.\n\nThroughout my career, I have developed strong expertise in relevant areas, consistently delivering results that exceed expectations. I am particularly skilled at problem-solving and thrive in collaborative environments.\n\nI would welcome the opportunity to discuss how my skills and experience align with your needs. Thank you for your consideration.\n\nSincerely,\n${name}`,
    linkedin: `🚀 ${title} | Building the future, one solution at a time.\n\nI'm a passionate ${title} with a drive for innovation and excellence. My journey has been defined by a commitment to delivering results that matter.\n\n💡 What I do: Transform complex challenges into elegant solutions\n🎯 My superpower: Bridging the gap between vision and execution\n🌟 What drives me: Creating lasting impact through technology and leadership\n\nLet's connect if you're interested in collaboration or just want to talk about the future of the industry.`,
    raw: { ats_resume: fallbackATS }
  };
}

// ---- Text Extractors ----
function extractName(lines) {
  const nameLine = lines.find(l => l.length > 3 && l.length < 50 && !l.includes('@') && !l.match(/\d{3}/));
  return nameLine?.trim() || '';
}
function extractTitle(lines) {
  const keywords = ['engineer', 'developer', 'manager', 'director', 'designer', 'analyst', 'consultant', 'specialist'];
  const titleLine = lines.find(l => keywords.some(k => l.toLowerCase().includes(k)));
  return titleLine?.trim() || 'Professional';
}
function extractEmail(text) {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match?.[0] || '';
}
function extractPhone(text) {
  const match = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
  return match?.[0] || '';
}
function extractLocation(lines) {
  const locationLine = lines.find(l => l.match(/[A-Z][a-z]+,\s*[A-Z]{2}/));
  return locationLine?.trim() || '';
}
function extractSkills(text) {
  const techWords = ['JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'SQL', 'Git', 'Docker', 'TypeScript', 'Java', 'C++', 'Angular', 'Vue.js', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST API', 'Agile', 'Scrum'];
  return techWords.filter(t => text.toLowerCase().includes(t.toLowerCase())).slice(0, 10);
}

// ---- AI Progress UI ----
function showAIProgress(show) {
  const prog = document.getElementById('aiProgress');
  if (prog) prog.style.display = show ? 'block' : 'none';
  if (show) updateAIProgressText('Initializing AI...', 10);
}

function updateAIProgressText(text, pct) {
  const textEl = document.getElementById('aiProgressText');
  const fill = document.getElementById('aiProgressFill');
  if (textEl) textEl.textContent = text;
  if (fill) fill.style.width = pct + '%';
}

// ---- AI Result Modal ----
function openAIResultModal(result, defaultTab = 'ats') {
  AI_STATE.lastFullResult = result;
  AI_STATE.currentTab = defaultTab;
  showResultTab(defaultTab);

  const modal = document.getElementById('aiResultModal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('aiResultTitle').innerHTML = `<i class="fa-solid fa-sparkles"></i> AI Generated Resume`;
  }
}

function showResultTab(tab) {
  AI_STATE.currentTab = tab;

  document.querySelectorAll('.ai-result-tab').forEach(b => {
    b.classList.toggle('active', b.id === `resultTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  });

  const content = document.getElementById('aiResultContent');
  if (!content || !AI_STATE.lastFullResult) return;

  let text = '';
  switch(tab) {
    case 'ats':
      text = AI_STATE.lastFullResult.ats || 'No ATS resume generated';
      break;
    case 'modern':
      text = AI_STATE.lastFullResult.modern || 'Generate with "Modern Resume" button';
      break;
    case 'cover':
      text = AI_STATE.lastFullResult.cover || 'Generate with "Cover Letter" button';
      break;
    case 'linkedin':
      text = AI_STATE.lastFullResult.linkedin || 'Generate with "LinkedIn Bio" button';
      break;
  }

  content.textContent = text;
}

function copyAIResult() {
  const content = document.getElementById('aiResultContent');
  if (!content) return;
  navigator.clipboard.writeText(content.textContent).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy', 'error');
  });
}

function applyAIResult() {
  if (!AI_STATE.lastFullResult) return;

  try {
    let dataToApply = null;

    if (AI_STATE.lastFullResult.raw?.ats_resume) {
      dataToApply = AI_STATE.lastFullResult.raw.ats_resume;
    } else if (AI_STATE.currentTab === 'ats' && AI_STATE.lastFullResult.ats) {
      try {
        dataToApply = JSON.parse(AI_STATE.lastFullResult.ats);
      } catch(e) {
        // fallback: try to extract structured data from text
        dataToApply = parseTextToData(AI_STATE.lastFullResult.ats);
      }
    }

    if (dataToApply) {
      applyAIToForm(dataToApply);
      closeModal('aiResultModal');
    } else {
      showToast('Please use the ATS Resume tab to apply structured data', 'info');
    }
  } catch(e) {
    showToast('Could not parse AI result. Copy manually.', 'warning');
  }
}

function parseTextToData(text) {
  // Simple text parser as fallback
  const lines = text.split('\n').filter(Boolean);
  return {
    personal: { firstName: 'First', lastName: 'Name', email: '', phone: '', professionalTitle: '', location: '', linkedin: '', github: '', website: '' },
    summary: lines.slice(0, 5).join(' '),
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: []
  };
}

// ---- Enhance Individual Sections ----
async function enhanceSection(section) {
  const d = STATE.data;
  let currentContent = '';
  let prompt = '';

  switch(section) {
    case 'summary':
      currentContent = d.summary;
      if (!currentContent) { showToast('Please write a summary first', 'info'); return; }
      prompt = `Improve this professional summary to be more compelling, impactful, and ATS-friendly. Write naturally — avoid clichés like "Results-driven", "passionate", "dynamic", or "proven track record". Open with a specific, genuine statement about the person's expertise or focus. Return only the improved text, no explanation:\n\n${currentContent}`;
      break;
    case 'experience':
      if (!d.experience.length) { showToast('Please add work experience first', 'info'); return; }
      const exp = d.experience[0];
      currentContent = exp.description;
      prompt = `Improve these job description bullet points for "${exp.jobTitle} at ${exp.company}" to be more impactful with quantified achievements. Use action verbs. Return improved bullet points:\n\n${currentContent}`;
      break;
    case 'skills':
      currentContent = d.skills.join(', ');
      const title = d.personal.professionalTitle || 'Professional';
      prompt = `For a ${title}, suggest 10-15 highly relevant technical and soft skills. Return ONLY a JSON array of strings: ["skill1", "skill2", ...]`;
      break;
    case 'achievements':
      prompt = `Generate 5 impressive, quantified professional achievements for a ${d.personal.professionalTitle || 'professional'} with skills in ${d.skills.slice(0, 5).join(', ')}. Return as bullet points starting with action verbs.`;
      break;
    case 'projects':
      prompt = `Generate 3 impressive portfolio projects for a ${d.personal.professionalTitle || 'professional'} using ${d.skills.slice(0, 5).join(', ')}. Return ONLY valid JSON: [{"name":"...","description":"...","tech":"..."}]`;
      break;
    case 'coverletter':
      const jobT = document.getElementById('jobTitle')?.value || 'the position';
      const jobD = document.getElementById('jobDescription')?.value || '';
      prompt = `Write a compelling cover letter for ${jobT}. Candidate: ${d.personal.firstName} ${d.personal.lastName}, ${d.personal.professionalTitle}. Key skills: ${d.skills.slice(0, 8).join(', ')}. ${jobD ? 'Job description: ' + jobD.substring(0, 500) : ''} Write 4 paragraphs.`;
      break;
  }

  setApiStatus('loading', `Enhancing ${section}...`);
  showToast(`✨ Enhancing ${section}...`, 'info');

  try {
    const model = document.getElementById('aiModel')?.value || 'llama-3.3-70b-versatile';

    const response = await callAIWorker({
      model,
      messages: [
        { role: 'system', content: 'You are an expert resume writer. Be concise and professional.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    applyEnhancement(section, result);
    setApiStatus('ok', 'Enhancement complete');
    showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} enhanced!`, 'success');

  } catch(error) {
    console.error('Enhancement error:', error);
    setApiStatus('error', 'Enhancement failed');
    showToast('Enhancement failed. Check your API key.', 'error');
  }
}

function applyEnhancement(section, result) {
  switch(section) {
    case 'summary':
      STATE.data.summary = result.trim();
      const sumEl = document.getElementById('summary');
      if (sumEl) sumEl.value = result.trim();
      break;
    case 'experience':
      if (STATE.data.experience.length > 0) {
        STATE.data.experience[0].description = result.trim();
        renderExperienceList();
      }
      break;
    case 'skills':
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const skills = JSON.parse(jsonMatch[0]);
          skills.forEach(s => {
            if (!STATE.data.skills.includes(s)) STATE.data.skills.push(s);
          });
          renderSkillsTags();
        }
      } catch(e) {
        const skillsFromText = result.split(/[,\n]/).map(s => s.trim().replace(/^[-•*"]\s*/, '')).filter(s => s.length > 0 && s.length < 40);
        skillsFromText.forEach(s => {
          if (!STATE.data.skills.includes(s)) STATE.data.skills.push(s);
        });
        renderSkillsTags();
      }
      break;
    case 'achievements':
      if (STATE.data.experience.length > 0) {
        STATE.data.experience[0].description = (STATE.data.experience[0].description || '') + '\n' + result;
        renderExperienceList();
      }
      break;
    case 'projects':
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const projs = JSON.parse(jsonMatch[0]);
          projs.forEach(p => addProject({ ...p, id: ++projIdCounter }));
        }
      } catch(e) {}
      break;
    case 'coverletter':
      AI_STATE.lastFullResult = { ...(AI_STATE.lastFullResult || {}), cover: result };
      openAIResultModal(AI_STATE.lastFullResult, 'cover');
      break;
  }
  updatePreview();
  saveState();
}

// ---- Enhance Experience Item ----
async function enhanceExpItem(expId) {
  const exp = STATE.data.experience.find(e => e.id === expId);
  if (!exp) return;

  showToast('✨ Enhancing experience...', 'info');

  try {
    const model = document.getElementById('aiModel')?.value || 'llama-3.3-70b-versatile';
    const response = await callAIWorker({
      model,
      messages: [
        { role: 'system', content: 'You are an expert resume writer.' },
        { role: 'user', content: `Improve these bullet points for "${exp.jobTitle} at ${exp.company}". Make them quantified and impactful. Return ONLY the improved bullet points:\n\n${exp.description || 'No description provided yet. Generate 3 impactful bullet points.'}` }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';
    exp.description = result.trim();
    renderExperienceList();
    updatePreview();
    showToast('Experience enhanced!', 'success');
  } catch(e) {
    showToast('Enhancement failed', 'error');
  }
}

// ---- Job Description Keyword Analyzer ----
function analyzeKeywords() {
  const jobDesc = document.getElementById('kwJobInput')?.value?.trim();
  const results = document.getElementById('keywordResults');
  if (!results) return;

  if (!jobDesc) {
    results.innerHTML = '<p class="empty-hint">Enter a job description above</p>';
    return;
  }

  const resumeText = getResumeAsText().toLowerCase();
  const jobWords = extractKeywordsFromText(jobDesc);
  const resumeWords = extractKeywordsFromText(resumeText);

  const found = [];
  const missing = [];

  jobWords.forEach(word => {
    if (resumeText.includes(word.toLowerCase())) {
      found.push(word);
    } else {
      missing.push(word);
    }
  });

  const matchPct = jobWords.length > 0 ? Math.round((found.length / jobWords.length) * 100) : 0;

  results.innerHTML = `
    <div style="margin-bottom:12px;">
      <span style="font-size:14px;font-weight:700;color:var(--accent)">${matchPct}%</span>
      <span style="font-size:12px;color:var(--text-tertiary)"> keyword match</span>
    </div>
    <div style="margin-bottom:8px;font-size:11px;color:var(--text-tertiary);font-weight:600;">FOUND IN RESUME</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">
      ${found.map(w => `<span class="kw-found">✓ ${w}</span>`).join('') || '<span style="font-size:12px;color:var(--text-tertiary)">None found</span>'}
    </div>
    <div style="margin-bottom:8px;font-size:11px;color:var(--text-tertiary);font-weight:600;">MISSING FROM RESUME</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;">
      ${missing.map(w => `<span class="kw-missing">✗ ${w}</span>`).join('') || '<span style="font-size:12px;color:var(--accent-green)">All keywords found!</span>'}
    </div>`;

  // Update keyword score
  animateScore('scoreFillKW', 'scoreNumKW', matchPct, 'kw');
  STATE.ai.keywordScore = matchPct;
}

function extractKeywordsFromText(text) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','is','was','are','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','with','from','by','as','of','it','its']);
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}
