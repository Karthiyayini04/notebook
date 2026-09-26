// ── ai.js — Gemini AI Integration for Notebook App ────────────────────────
// Drop this file into frontend/public/ and add <script src="ai.js"></script>
// to index.html AFTER app.js

const GEMINI_MODEL = 'gemini-3.5-flash-lite'; // free, fast model
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Gemini API call ────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('No API key set');

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || 'Gemini API error';
    throw new Error(msg);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
}

// ── Key storage ────────────────────────────────────────────────────────────
function getGeminiKey() { return localStorage.getItem('gemini_api_key'); }
function saveGeminiKey(key) { localStorage.setItem('gemini_api_key', key.trim()); }
function clearGeminiKey() { localStorage.removeItem('gemini_api_key'); }

// ── Get current note text ──────────────────────────────────────────────────
function getNoteText() {
  if (!window.quill) return '';
  return quill.getText().trim();
}
function getNoteTitle() {
  return document.getElementById('noteTitle')?.value?.trim() || 'Untitled';
}

// ── AI prompts ─────────────────────────────────────────────────────────────
const AI_FEATURES = [
  {
    id: 'grammar',
    icon: '✏️',
    label: 'Grammar Check',
    prompt: (text, title) =>
      `Check the grammar and spelling of this note titled "${title}". List each mistake found with the correction. If no mistakes, say "No grammar issues found!"\n\nNote content:\n${text}`
  },
  {
    id: 'rewrite',
    icon: '✨',
    label: 'Improve Writing',
    prompt: (text, title) =>
      `Rewrite and improve this note titled "${title}" to make it clearer, more professional, and better structured. Keep the same meaning but improve the language.\n\nNote content:\n${text}`
  },
  {
    id: 'summarize',
    icon: '📋',
    label: 'Summarize',
    prompt: (text, title) =>
      `Summarize this note titled "${title}" in 3-5 bullet points. Be concise and capture the key points.\n\nNote content:\n${text}`
  },
  {
    id: 'suggest',
    icon: '💡',
    label: 'Suggest Next',
    prompt: (text, title) =>
      `Based on this note titled "${title}", suggest 3 ideas for what to write next. Give specific, useful suggestions that continue naturally from the existing content.\n\nNote content:\n${text}`
  }
];

// ── Render AI panel HTML ───────────────────────────────────────────────────
function renderAIPanel() {
  const hasKey = !!getGeminiKey();

  return `
    <div class="ai-panel-header">
      <div class="ai-panel-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        AI Assistant
      </div>
      <button class="icon-btn" id="closeAiPanel">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- API Key setup -->
    <div class="ai-setup">
      ${hasKey ? `
        <div class="ai-key-set">
          <span>✅ Gemini API key saved</span>
          <button class="ai-key-clear" id="clearApiKey">Change key</button>
        </div>
      ` : `
        <p>Enter your free Gemini API key to use AI features.<br>
          Get one free at <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a>
        </p>
        <input type="password" id="geminiKeyInput" placeholder="AIza..."/>
        <button class="ai-save-key-btn" id="saveApiKey">Save API Key</button>
      `}
    </div>

    <!-- Feature buttons -->
    <div class="ai-features">
      ${AI_FEATURES.map(f => `
        <button class="ai-feature-btn" data-feature="${f.id}" ${!hasKey ? 'disabled title="Add API key first"' : ''}>
          <span class="ai-feature-icon">${f.icon}</span>
          <span class="ai-feature-label">${f.label}</span>
        </button>
      `).join('')}
    </div>

    <!-- Custom prompt -->
    <div class="ai-custom-wrap">
      <textarea id="aiCustomPrompt" rows="2" placeholder="Ask AI anything about your note…" ${!hasKey ? 'disabled' : ''}></textarea>
      <button class="ai-ask-btn" id="aiAskBtn" ${!hasKey ? 'disabled' : ''}>Ask AI</button>
    </div>

    <!-- Results -->
    <div class="ai-result-area" id="aiResultArea">
      <div class="ai-empty">
        <div class="ai-empty-icon">🤖</div>
        <p>Select a feature above or ask a custom question about your note.</p>
      </div>
    </div>
  `;
}

// ── Show loading ───────────────────────────────────────────────────────────
function showAILoading(label) {
  document.getElementById('aiResultArea').innerHTML = `
    <div class="ai-loading-card">
      <div class="spinner"></div>
      <span>Running ${label}…</span>
    </div>`;
}

// ── Show result ────────────────────────────────────────────────────────────
function showAIResult(icon, label, result, canApply = false) {
  const escaped = result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  document.getElementById('aiResultArea').innerHTML = `
    <div class="ai-result-card">
      <div class="ai-result-card-header">
        <div class="ai-result-card-title">${icon} ${label}</div>
      </div>
      <div class="ai-result-card-body">${escaped}</div>
      <div class="ai-result-actions">
        <button class="ai-action-btn" id="aiCopyBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        ${canApply ? `
        <button class="ai-action-btn apply" id="aiApplyBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Apply to note
        </button>` : ''}
      </div>
    </div>`;

  // Copy button
  document.getElementById('aiCopyBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(result);
    document.getElementById('aiCopyBtn').textContent = '✅ Copied!';
    setTimeout(() => { document.getElementById('aiCopyBtn').textContent = 'Copy'; }, 1500);
  });

  // Apply to note button (replaces note content with AI result)
  document.getElementById('aiApplyBtn')?.addEventListener('click', () => {
    if (!window.quill) return;
    quill.setText(result);
    scheduleSave(); // auto-save from app.js
    document.getElementById('aiApplyBtn').textContent = '✅ Applied!';
    setTimeout(() => { document.getElementById('aiApplyBtn').textContent = 'Apply to note'; }, 1500);
  });
}

// ── Show error ─────────────────────────────────────────────────────────────
function showAIError(msg) {
  document.getElementById('aiResultArea').innerHTML = `
    <div class="ai-result-card">
      <div class="ai-result-card-header" style="background: linear-gradient(135deg,#dc2626,#ef4444)">
        <div class="ai-result-card-title">❌ Error</div>
      </div>
      <div class="ai-result-card-body">${msg}</div>
    </div>`;
}

// ── Run AI feature ─────────────────────────────────────────────────────────
async function runAIFeature(featureId) {
  const text = getNoteText();
  if (!text) { showAIError('Your note is empty. Write something first!'); return; }

  const feature = AI_FEATURES.find(f => f.id === featureId);
  if (!feature) return;

  showAILoading(feature.label);

  // Disable all feature buttons while loading
  document.querySelectorAll('.ai-feature-btn').forEach(b => b.classList.add('loading'));

  try {
    const prompt = feature.prompt(text, getNoteTitle());
    const result = await callGemini(prompt);
    const canApply = featureId === 'rewrite'; // only rewrite replaces note
    showAIResult(feature.icon, feature.label, result, canApply);
  } catch (err) {
    showAIError(err.message.includes('API_KEY_INVALID')
      ? 'Invalid API key. Please check and update your Gemini API key.'
      : err.message);
  } finally {
    document.querySelectorAll('.ai-feature-btn').forEach(b => b.classList.remove('loading'));
  }
}

// ── Run custom prompt ──────────────────────────────────────────────────────
async function runCustomPrompt() {
  const userQ = document.getElementById('aiCustomPrompt')?.value?.trim();
  if (!userQ) return;
  const text = getNoteText();
  const fullPrompt = text
    ? `Regarding this note titled "${getNoteTitle()}":\n\n${text}\n\n---\nUser question: ${userQ}`
    : userQ;

  showAILoading('your question');
  document.getElementById('aiAskBtn').disabled = true;

  try {
    const result = await callGemini(fullPrompt);
    showAIResult('💬', 'AI Response', result, false);
  } catch (err) {
    showAIError(err.message);
  } finally {
    document.getElementById('aiAskBtn').disabled = false;
  }
}

// ── Init AI panel ──────────────────────────────────────────────────────────
function initAI() {
  // Create AI panel element and inject into app layout
  const panel = document.createElement('div');
  panel.className = 'ai-panel';
  panel.id = 'aiPanel';
  panel.innerHTML = renderAIPanel();

  // Insert panel after .editor-area
  const editorArea = document.querySelector('.editor-area');
  editorArea?.parentNode?.insertBefore(panel, editorArea.nextSibling);

  // Add AI button to editor topbar actions
  const actions = document.querySelector('.editor-actions');
  if (actions) {
    const aiBtn = document.createElement('button');
    aiBtn.className = 'ai-btn';
    aiBtn.id = 'aiToggleBtn';
    aiBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      AI
    `;
    actions.insertBefore(aiBtn, actions.firstChild);
    aiBtn.addEventListener('click', toggleAIPanel);
  }

  // Also add AI button to placeholder area
  const placeholder = document.getElementById('editorPlaceholder');
  if (placeholder) {
    const aiPlaceholderBtn = document.createElement('button');
    aiPlaceholderBtn.className = 'ai-btn';
    aiPlaceholderBtn.style.marginTop = '8px';
    aiPlaceholderBtn.innerHTML = `✨ Open AI Assistant`;
    aiPlaceholderBtn.addEventListener('click', toggleAIPanel);
    placeholder.appendChild(aiPlaceholderBtn);
  }

  bindAIPanelEvents();
}

// ── Toggle panel open/close ────────────────────────────────────────────────
function toggleAIPanel() {
  const panel = document.getElementById('aiPanel');
  panel.classList.toggle('open');
  // Re-render to pick up latest key status
  panel.innerHTML = renderAIPanel();
  bindAIPanelEvents();
}

// ── Bind events inside panel ───────────────────────────────────────────────
function bindAIPanelEvents() {
  // Close button
  document.getElementById('closeAiPanel')?.addEventListener('click', () => {
    document.getElementById('aiPanel').classList.remove('open');
  });

  // Save API key
  document.getElementById('saveApiKey')?.addEventListener('click', () => {
    const val = document.getElementById('geminiKeyInput')?.value?.trim();
    if (!val) return;
    saveGeminiKey(val);
    document.getElementById('aiPanel').innerHTML = renderAIPanel();
    bindAIPanelEvents();
  });

  // Clear API key
  document.getElementById('clearApiKey')?.addEventListener('click', () => {
    clearGeminiKey();
    document.getElementById('aiPanel').innerHTML = renderAIPanel();
    bindAIPanelEvents();
  });

  // Feature buttons
  document.querySelectorAll('.ai-feature-btn').forEach(btn => {
    btn.addEventListener('click', () => runAIFeature(btn.dataset.feature));
  });

  // Custom prompt
  document.getElementById('aiAskBtn')?.addEventListener('click', runCustomPrompt);
  document.getElementById('aiCustomPrompt')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) runCustomPrompt();
  });
}

// ── Boot after DOM ready ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wait for app.js to render the editor first
  setTimeout(initAI, 100);
});
