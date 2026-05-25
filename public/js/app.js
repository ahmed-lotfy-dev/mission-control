/* ═══════════════════════════════════════════
   Mission Control — Frontend App
   ═══════════════════════════════════════════ */

const API = "";
let currentView = "dashboard";

// ── Helpers ──
async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ── Navigation ──
document.querySelectorAll(".nav-links li").forEach(li => {
  li.addEventListener("click", () => {
    document.querySelectorAll(".nav-links li").forEach(l => l.classList.remove("active"));
    li.classList.add("active");
    navigate(li.dataset.view);
  });
});

function navigate(view) {
  currentView = view;
  const main = document.getElementById("main");
  main.innerHTML = '<div class="loading">Loading...</div>';

  switch (view) {
    case "dashboard": renderDashboard(main); break;
    case "kanban": renderKanban(main); break;
    case "agents": renderAgents(main); break;
    case "content": renderContent(main); break;
    case "vault": renderVault(main); break;
    case "daily": renderDaily(main); break;
    case "scheduled": renderScheduled(main); break;
  }
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
async function renderDashboard(main) {
  try {
    const d = await api("/dashboard");
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>📊 Dashboard</h1>
          <p class="subtitle">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <button class="btn primary" onclick="navigate('kanban')">+ New Task</button>
      </div>

      <div class="grid-4 mb-24">
        <div class="card">
          <div style="font-size:28px;font-weight:700;color:var(--text-bright)">${d.tasks.total}</div>
          <div style="font-size:12px;color:var(--text-dim)">Total Tasks</div>
        </div>
        <div class="card">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">${d.tasks.inProgress}</div>
          <div style="font-size:12px;color:var(--text-dim)">In Progress</div>
        </div>
        <div class="card">
          <div style="font-size:28px;font-weight:700;color:var(--accent2)">${d.tasks.done}</div>
          <div style="font-size:12px;color:var(--text-dim)">Done</div>
        </div>
        <div class="card">
          <div style="font-size:28px;font-weight:700;color:var(--accent4)">${d.vault.total}</div>
          <div style="font-size:12px;color:var(--text-dim)">Vault Notes</div>
        </div>
      </div>

      <div class="grid-2 mb-24">
        <div class="card">
          <h3>📋 Task Pipeline</h3>
          <div style="margin-top:12px">
            ${renderPipelineBar(d.tasks)}
          </div>
          <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-dim)">
            <span>🔵 Backlog: ${d.tasks.backlog}</span>
            <span>📌 Todo: ${d.tasks.todo}</span>
            <span>🔄 In Progress: ${d.tasks.inProgress}</span>
            <span>✅ Done: ${d.tasks.done}</span>
          </div>
        </div>
        <div class="card">
          <h3>🎯 Today's Goals</h3>
          <div id="dash-goals-list">
            ${d.goals.goals.length > 0
              ? d.goals.goals.map((g, i) => `
                <div class="goal-item ${g.done ? "done" : ""}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
                  <input type="checkbox" ${g.done ? "checked" : ""} onchange="toggleGoal(${i}, this.checked)">
                  <span style="${g.done ? "text-decoration:line-through;color:var(--text-dim)" : ""}">${esc(g.text)}</span>
                </div>`).join("")
              : '<p style="color:var(--text-dim);font-size:13px">No goals for today yet.</p>'}
          </div>
          <button class="btn sm mt-16" onclick="navigate('daily')">Open Daily →</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>🤖 Agent Status</h3>
          ${d.agents.length > 0 ? d.agents.map(a => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
              <span class="status-dot ${a.status === 'running' ? 'online' : 'offline'}">●</span>
              <div>
                <div style="font-weight:600;font-size:13px">${esc(a.name)}</div>
                <div style="font-size:11px;color:var(--text-dim)">${esc(a.model)} · ${timeAgo(a.lastActive)}</div>
              </div>
              <span class="badge ${a.status === 'running' ? 'low' : 'medium'}" style="margin-left:auto">${a.status}</span>
            </div>
          `).join("") : '<p style="color:var(--text-dim);font-size:13px">No agents registered.</p>'}
        </div>
        <div class="card">
          <h3>⏰ Scheduled Tasks</h3>
          <div style="font-size:24px;font-weight:700;color:var(--text-bright)">${d.scheduled.enabled}/${d.scheduled.total}</div>
          <div style="font-size:12px;color:var(--text-dim)">Active / Total</div>
          <button class="btn sm mt-16" onclick="navigate('scheduled')">Manage →</button>
        </div>
      </div>
    `;
  } catch (e) {
    main.innerHTML = `<div class="loading">Error loading dashboard: ${e.message}</div>`;
  }
}

function renderPipelineBar(tasks) {
  const total = tasks.total || 1;
  const segments = [
    { label: "Backlog", value: tasks.backlog, color: "var(--text-dim)" },
    { label: "Todo", value: tasks.todo, color: "var(--accent)" },
    { label: "In Progress", value: tasks.inProgress, color: "var(--accent5)" },
    { label: "Done", value: tasks.done, color: "var(--accent2)" },
  ];
  return `<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--bg3)">
    ${segments.map(s => `<div style="width:${(s.value/total)*100}%;background:${s.color}" title="${s.label}: ${s.value}"></div>`).join("")}
  </div>`;
}

async function toggleGoal(index, done) {
  try {
    const date = today();
    const goals = await api(`/goals/${date}`);
    goals.goals[index].done = done;
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ goals: goals.goals }) });
    navigate("dashboard");
  } catch (e) { console.error(e); }
}

// ═══════════════════════════════════════════
// KANBAN
// ═══════════════════════════════════════════
const KANBAN_COLUMNS = ["backlog", "todo", "in_progress", "done"];
const KANBAN_LABELS = { backlog: "📥 Backlog", todo: "📌 To Do", in_progress: "🔄 In Progress", done: "✅ Done" };

async function renderKanban(main) {
  try {
    const tasks = await api("/tasks");
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>📋 Kanban Board</h1>
          <p class="subtitle">${tasks.length} tasks</p>
        </div>
        <button class="btn primary" onclick="openTaskModal()">+ New Task</button>
      </div>
      <div id="kanban-board" style="display:flex;gap:16px;overflow-x:auto;padding-bottom:16px">
        ${KANBAN_COLUMNS.map(col => `
          <div class="kanban-col" style="min-width:280px;flex:1">
            <div class="flex-between" style="margin-bottom:12px">
              <h3 style="font-size:13px;font-weight:600">${KANBAN_LABELS[col]}</h3>
              <span style="font-size:12px;color:var(--text-dim)">${tasks.filter(t => t.status === col).length}</span>
            </div>
            <div class="kanban-col-tasks" data-status="${col}" style="min-height:200px;display:flex;flex-direction:column;gap:8px"
              ondragover="event.preventDefault()" ondrop="handleDrop(event, '${col}')">
              ${tasks.filter(t => t.status === col).map(t => renderTaskCard(t)).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `;
    initDragAndDrop();
  } catch (e) {
    main.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

function renderTaskCard(t) {
  return `
    <div class="task-card" draggable="true" data-id="${t.id}" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px;cursor:grab;transition:box-shadow 0.15s"
      ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;color:var(--text-bright)">${esc(t.title)}</span>
        <span class="badge ${t.priority}">${t.priority}</span>
      </div>
      ${t.description ? `<p style="font-size:12px;color:var(--text-dim);margin-bottom:8px">${esc(t.description.substring(0, 100))}</p>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${t.project ? `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--bg);color:var(--accent)">${esc(t.project)}</span>` : ""}
          ${t.tags ? t.tags.split(",").slice(0, 2).map(tag => `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--bg);color:var(--text-dim)">${esc(tag.trim())}</span>`).join("") : ""}
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn sm" onclick="openTaskModal(${t.id})" title="Edit">✏️</button>
          <button class="btn sm danger" onclick="deleteTask(${t.id})" title="Delete">🗑️</button>
        </div>
      </div>
      ${t.dueDate ? `<div style="font-size:11px;color:var(--text-dim);margin-top:6px">📅 ${t.dueDate}</div>` : ""}
    </div>
  `;
}

// Drag and Drop
let draggedId = null;
function handleDragStart(e) { draggedId = Number(e.target.dataset.id); e.target.style.opacity = "0.5"; }
function handleDragEnd(e) { e.target.style.opacity = "1"; draggedId = null; }
async function handleDrop(e, status) {
  e.preventDefault();
  if (!draggedId) return;
  await api(`/tasks/${draggedId}`, { method: "PATCH", body: JSON.stringify({ status }) });
  navigate("kanban");
}

function initDragAndDrop() {
  // Native drag/drop is set up via inline handlers
}

// Task Modal
async function openTaskModal(id = null) {
  let task = { title: "", description: "", status: "backlog", priority: "medium", project: "", tags: "", dueDate: "" };
  if (id) {
    try { task = await api(`/tasks/${id}`); } catch {}
  }
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <h2>${id ? "Edit Task" : "New Task"}</h2>
      <div class="form-group">
        <label>Title</label>
        <input id="task-title" value="${esc(task.title)}" placeholder="What needs to be done?">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="task-desc" placeholder="Details...">${esc(task.description)}</textarea>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label>Status</label>
          <select id="task-status">
            ${KANBAN_COLUMNS.map(c => `<option value="${c}" ${task.status === c ? "selected" : ""}>${KANBAN_LABELS[c]}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="task-priority">
            ${["low", "medium", "high", "urgent"].map(p => `<option value="${p}" ${task.priority === p ? "selected" : ""}>${p}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label>Project</label>
          <input id="task-project" value="${esc(task.project)}" placeholder="Project name">
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input id="task-due" type="date" value="${esc(task.dueDate)}">
        </div>
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input id="task-tags" value="${esc(task.tags)}" placeholder="frontend, bug, urgent">
      </div>
      <div class="form-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn primary" onclick="saveTask(${id})">${id ? "Update" : "Create"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

async function saveTask(id) {
  const body = {
    title: document.getElementById("task-title").value,
    description: document.getElementById("task-desc").value,
    status: document.getElementById("task-status").value,
    priority: document.getElementById("task-priority").value,
    project: document.getElementById("task-project").value,
    tags: document.getElementById("task-tags").value,
    dueDate: document.getElementById("task-due").value,
  };
  if (!body.title.trim()) return alert("Title is required");
  if (id) {
    await api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  } else {
    await api("/tasks", { method: "POST", body: JSON.stringify(body) });
  }
  document.querySelector(".modal-overlay")?.remove();
  navigate("kanban");
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  await api(`/tasks/${id}`, { method: "DELETE" });
  navigate("kanban");
}

// ═══════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════
async function renderAgents(main) {
  try {
    const agents = await api("/agents");
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>🤖 Agent Status</h1>
          <p class="subtitle">${agents.length} agents registered</p>
        </div>
        <button class="btn primary" onclick="openAgentModal()">+ Register Agent</button>
      </div>
      <div class="grid-3">
        ${agents.length > 0 ? agents.map(a => `
          <div class="card">
            <div class="flex-between mb-16">
              <div style="display:flex;align-items:center;gap:10px">
                <span class="status-dot ${a.status === 'running' ? 'online' : 'offline'}" style="font-size:16px">●</span>
                <div>
                  <div style="font-weight:600;font-size:15px;color:var(--text-bright)">${esc(a.name)}</div>
                  <div style="font-size:12px;color:var(--text-dim)">${esc(a.model)}</div>
                </div>
              </div>
              <span class="badge ${a.status === 'running' ? 'low' : a.status === 'error' ? 'urgent' : 'medium'}">${a.status}</span>
            </div>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px">
              Version: ${esc(a.version || "N/A")} · Last active: ${timeAgo(a.lastActive)}
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn sm" onclick="openAgentModal(${a.id})">Edit</button>
              <button class="btn sm danger" onclick="deleteAgent(${a.id})">Remove</button>
            </div>
          </div>
        `).join("") : '<div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-dim)">No agents registered yet.</div>'}
      </div>
    `;
  } catch (e) {
    main.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

async function openAgentModal(id = null) {
  let agent = { name: "", model: "", version: "", status: "idle", metadata: {} };
  if (id) {
    try { agent = await api(`/agents/${id}`); agent.metadata = JSON.parse(agent.metadata || "{}"); } catch {}
  }
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <h2>${id ? "Edit Agent" : "Register Agent"}</h2>
      <div class="form-group"><label>Name</label><input id="agent-name" value="${esc(agent.name)}" placeholder="e.g. OWL (Hermes)"></div>
      <div class="form-group"><label>Model</label><input id="agent-model" value="${esc(agent.model)}" placeholder="e.g. openrouter/owl-alpha"></div>
      <div class="grid-2">
        <div class="form-group"><label>Version</label><input id="agent-version" value="${esc(agent.version)}" placeholder="1.0"></div>
        <div class="form-group"><label>Status</label>
          <select id="agent-status">
            ${["idle", "running", "error"].map(s => `<option value="${s}" ${agent.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn primary" onclick="saveAgent(${id})">${id ? "Update" : "Register"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

async function saveAgent(id) {
  const body = {
    name: document.getElementById("agent-name").value,
    model: document.getElementById("agent-model").value,
    version: document.getElementById("agent-version").value,
    status: document.getElementById("agent-status").value,
  };
  if (!body.name.trim()) return alert("Name is required");
  if (id) {
    await api(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  } else {
    await api("/agents", { method: "POST", body: JSON.stringify(body) });
  }
  document.querySelector(".modal-overlay")?.remove();
  navigate("agents");
}

async function deleteAgent(id) {
  if (!confirm("Remove this agent?")) return;
  await api(`/agents/${id}`, { method: "DELETE" });
  navigate("agents");
}

// ═══════════════════════════════════════════
// CONTENT STUDIO
// ═══════════════════════════════════════════
async function renderContent(main) {
  try {
    const assets = await api("/content");
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>🎨 Content Studio</h1>
          <p class="subtitle">Generate images, video, audio, and text</p>
        </div>
      </div>

      <div class="grid-4 mb-24">
        <div class="card" style="cursor:pointer" onclick="openContentModal('image')">
          <div style="font-size:32px;text-align:center;margin-bottom:8px">🖼️</div>
          <div style="text-align:center;font-weight:600">Image Gen</div>
          <div style="text-align:center;font-size:12px;color:var(--text-dim)">Generate images</div>
        </div>
        <div class="card" style="cursor:pointer" onclick="openContentModal('video')">
          <div style="font-size:32px;text-align:center;margin-bottom:8px">🎬</div>
          <div style="text-align:center;font-weight:600">Video Gen</div>
          <div style="text-align:center;font-size:12px;color:var(--text-dim)">Generate video</div>
        </div>
        <div class="card" style="cursor:pointer" onclick="openContentModal('audio')">
          <div style="font-size:32px;text-align:center;margin-bottom:8px">🔊</div>
          <div style="text-align:center;font-weight:600">TTS / Audio</div>
          <div style="text-align:center;font-size:12px;color:var(--text-dim)">Text to speech</div>
        </div>
        <div class="card" style="cursor:pointer" onclick="openContentModal('text')">
          <div style="font-size:32px;text-align:center;margin-bottom:8px">📝</div>
          <div style="text-align:center;font-weight:600">Text Gen</div>
          <div style="text-align:center;font-size:12px;color:var(--text-dim)">Generate text</div>
        </div>
      </div>

      <div class="card">
        <h3>Recent Assets</h3>
        ${assets.length > 0 ? `
          <table style="width:100%;margin-top:12px;border-collapse:collapse">
            <thead>
              <tr style="font-size:12px;color:var(--text-dim);text-align:left">
                <th style="padding:8px 0">Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${assets.map(a => `
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding:10px 0">${esc(a.type)}</td>
                  <td>${esc(a.title)}</td>
                  <td><span class="badge ${a.status === 'done' ? 'low' : a.status === 'error' ? 'urgent' : 'medium'}">${a.status}</span></td>
                  <td style="font-size:12px;color:var(--text-dim)">${formatDate(a.createdAt)}</td>
                  <td><button class="btn sm danger" onclick="deleteAsset(${a.id})">🗑️</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : '<p style="color:var(--text-dim);font-size:13px;margin-top:12px">No assets generated yet.</p>'}
      </div>
    `;
  } catch (e) {
    main.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

function openContentModal(type) {
  const labels = { image: "🖼️ Image Generation", video: "🎬 Video Generation", audio: "🔊 TTS / Audio", text: "📝 Text Generation" };
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <h2>${labels[type]}</h2>
      <div class="form-group"><label>Title</label><input id="content-title" value="" placeholder="Asset name"></div>
      <div class="form-group"><label>Prompt / Content</label><textarea id="content-prompt" placeholder="Describe what you want to generate..."></textarea></div>
      <div class="form-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn primary" onclick="createAsset('${type}')">Create</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

async function createAsset(type) {
  const body = {
    type,
    title: document.getElementById("content-title").value || `New ${type}`,
    prompt: document.getElementById("content-prompt").value,
  };
  await api("/content", { method: "POST", body: JSON.stringify(body) });
  document.querySelector(".modal-overlay")?.remove();
  navigate("content");
}

async function deleteAsset(id) {
  if (!confirm("Delete this asset?")) return;
  await api(`/content/${id}`, { method: "DELETE" });
  navigate("content");
}

// ═══════════════════════════════════════════
// VAULT
// ═══════════════════════════════════════════
async function renderVault(main) {
  try {
    const [notes, stats] = await Promise.all([
      api("/vault/notes"),
      api("/vault/stats"),
    ]);
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>🧠 Obsidian Vault</h1>
          <p class="subtitle">${stats.total} notes indexed · Last sync: ${notes.length > 0 ? timeAgo(notes[0].indexedAt) : "never"}</p>
        </div>
        <button class="btn primary" onclick="syncVault()">🔄 Sync Vault</button>
      </div>

      <div class="grid-4 mb-24">
        ${Object.entries(stats.folders).slice(0, 8).map(([folder, count]) => `
          <div class="card" style="cursor:pointer" onclick="filterVault('${esc(folder)}')">
            <div style="font-size:24px;font-weight:700;color:var(--text-bright)">${count}</div>
            <div style="font-size:12px;color:var(--text-dim)">${esc(folder)}</div>
          </div>
        `).join("")}
      </div>

      <div class="card mb-16">
        <div class="flex-between">
          <input id="vault-search" placeholder="Search notes..." style="max-width:300px" oninput="searchVault(this.value)">
          <span id="vault-filter-label" style="font-size:12px;color:var(--text-dim)">All folders</span>
        </div>
      </div>

      <div id="vault-notes-list" class="card">
        ${notes.length > 0 ? notes.slice(0, 50).map(n => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:16px">📄</span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px;color:var(--text-bright)">${esc(n.title)}</div>
              <div style="font-size:11px;color:var(--text-dim)">${esc(n.folder)}/${esc(n.path.split("/").pop())}</div>
            </div>
            <span style="font-size:11px;color:var(--text-dim)">${timeAgo(n.lastModified)}</span>
          </div>
        `).join("") : '<p style="color:var(--text-dim);text-align:center;padding:20px">No notes indexed. Click "Sync Vault" to index your Obsidian vault.</p>'}
      </div>
    `;
  } catch (e) {
    main.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

async function syncVault() {
  const btn = document.querySelector("button");
  btn.textContent = "⏳ Syncing...";
  btn.disabled = true;
  try {
    const result = await api("/vault/sync", { method: "POST" });
    alert(`Synced ${result.synced} notes!`);
    navigate("vault");
  } catch (e) {
    alert("Sync failed: " + e.message);
    btn.textContent = "🔄 Sync Vault";
    btn.disabled = false;
  }
}

function filterVault(folder) {
  document.getElementById("vault-filter-label").textContent = `Folder: ${folder}`;
  document.querySelectorAll("#vault-notes-list > div").forEach(el => {
    const pathEl = el.querySelector("div > div:last-child");
    if (pathEl && pathEl.textContent.startsWith(folder)) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });
}

async function searchVault(q) {
  if (!q.trim()) { navigate("vault"); return; }
  try {
    const results = await api(`/vault/search?q=${encodeURIComponent(q)}`);
    const container = document.getElementById("vault-notes-list");
    if (results.length === 0) {
      container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:20px">No results found.</p>';
      return;
    }
    container.innerHTML = results.map(n => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:16px">📄</span>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;color:var(--text-bright)">${esc(n.title)}</div>
          <div style="font-size:11px;color:var(--text-dim)">${esc(n.folder)}/${esc(n.path.split("/").pop())}</div>
        </div>
        <span style="font-size:11px;color:var(--text-dim)">${timeAgo(n.lastModified)}</span>
      </div>
    `).join("");
  } catch (e) { console.error(e); }
}

// ═══════════════════════════════════════════
// DAILY
// ═══════════════════════════════════════════
let currentDailyDate = today();

async function renderDaily(main) {
  try {
    const goals = await api(`/goals/${currentDailyDate}`);
    const goalList = goals.goals || [];
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>📝 Daily Journal</h1>
          <p class="subtitle">${new Date(currentDailyDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div class="flex gap-8">
          <button class="btn" onclick="changeDailyDate(-1)">← Prev</button>
          <button class="btn" onclick="changeDailyDate(1)">Next →</button>
          <button class="btn primary" onclick="changeDailyDate(0)">Today</button>
        </div>
      </div>

      <div class="grid-2 mb-24">
        <div class="card">
          <h3>🎯 Goals</h3>
          <div id="daily-goals-list" style="margin-top:12px">
            ${goalList.length > 0 ? goalList.map((g, i) => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
                <input type="checkbox" ${g.done ? "checked" : ""} onchange="updateGoal(${i}, this.checked, null)">
                <input style="flex:1;border:none;background:transparent;color:var(--text);font-size:13px" value="${esc(g.text)}"
                  onchange="updateGoal(${i}, null, this.value)" placeholder="Goal...">
                <button class="btn sm danger" onclick="removeGoal(${i})">✕</button>
              </div>
            `).join("") : '<p style="color:var(--text-dim);font-size:13px">No goals yet. Add one below.</p>'}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <input id="new-goal-input" placeholder="Add a goal..." style="flex:1" onkeydown="if(event.key==='Enter')addGoal()">
            <button class="btn primary" onclick="addGoal()">+ Add</button>
          </div>
        </div>
        <div class="card">
          <h3>😊 Mood</h3>
          <div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap">
            ${["😀", "😊", "😐", "😤", "😴", "🤔", "💪", "🎉"].map(m => `
              <button class="btn ${goals.mood === m ? "primary" : ""}" style="font-size:20px;padding:8px 12px" onclick="setMood('${m}')">${m}</button>
            `).join("")}
          </div>
          <h3 style="margin-top:16px">📖 Journal</h3>
          <textarea id="daily-journal" placeholder="What happened today? Thoughts, decisions, ideas..."
            style="margin-top:8px;min-height:200px">${esc(goals.journal || "")}</textarea>
          <button class="btn primary mt-16" onclick="saveJournal()">Save Journal</button>
        </div>
      </div>
    `;
  } catch (e) {
    main.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

function changeDailyDate(offset) {
  const d = new Date(currentDailyDate);
  if (offset === 0) { currentDailyDate = today(); }
  else { d.setDate(d.getDate() + offset); currentDailyDate = d.toISOString().split("T")[0]; }
  renderDaily(document.getElementById("main"));
}

async function addGoal() {
  const input = document.getElementById("new-goal-input");
  const text = input.value.trim();
  if (!text) return;
  const goals = await api(`/goals/${currentDailyDate}`);
  const list = goals.goals || [];
  list.push({ text, done: false });
  await api(`/goals/${currentDailyDate}`, { method: "POST", body: JSON.stringify({ goals: list }) });
  renderDaily(document.getElementById("main"));
}

async function updateGoal(index, done, text) {
  const goals = await api(`/goals/${currentDailyDate}`);
  const list = goals.goals || [];
  if (done !== null) list[index].done = done;
  if (text !== null) list[index].text = text;
  await api(`/goals/${currentDailyDate}`, { method: "POST", body: JSON.stringify({ goals: list }) });
}

async function removeGoal(index) {
  const goals = await api(`/goals/${currentDailyDate}`);
  const list = goals.goals || [];
  list.splice(index, 1);
  await api(`/goals/${currentDailyDate}`, { method: "POST", body: JSON.stringify({ goals: list }) });
  renderDaily(document.getElementById("main"));
}

async function setMood(mood) {
  await api(`/goals/${currentDailyDate}`, { method: "POST", body: JSON.stringify({ mood }) });
  renderDaily(document.getElementById("main"));
}

async function saveJournal() {
  const journal = document.getElementById("daily-journal").value;
  await api(`/goals/${currentDailyDate}`, { method: "POST", body: JSON.stringify({ journal }) });
  alert("Journal saved!");
}

// ═══════════════════════════════════════════
// SCHEDULED
// ═══════════════════════════════════════════
async function renderScheduled(main) {
  try {
    const tasks = await api("/scheduled");
    main.innerHTML = `
      <div class="flex-between mb-24">
        <div>
          <h1>⏰ Scheduled Tasks</h1>
          <p class="subtitle">${tasks.filter(t => t.enabled).length}/${tasks.length} active</p>
        </div>
        <button class="btn primary" onclick="openScheduledModal()">+ New Schedule</button>
      </div>

      <div class="card">
        ${tasks.length > 0 ? `
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="font-size:12px;color:var(--text-dim);text-align:left">
                <th style="padding:8px 0">Name</th>
                <th>Schedule</th>
                <th>Type</th>
                <th>Status</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(t => `
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding:10px 0">
                    <div style="font-weight:600;font-size:13px">${esc(t.name)}</div>
                    <div style="font-size:11px;color:var(--text-dim)">${esc(t.description)}</div>
                  </td>
                  <td style="font-family:monospace;font-size:12px">${esc(t.schedule)}</td>
                  <td><span class="badge medium">${t.type}</span></td>
                  <td>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                      <input type="checkbox" ${t.enabled ? "checked" : ""} onchange="toggleScheduled(${t.id}, this.checked)">
                      <span style="font-size:12px">${t.enabled ? "Active" : "Paused"}</span>
                    </label>
                  </td>
                  <td style="font-size:12px;color:var(--text-dim)">
                    ${t.lastRun ? `${timeAgo(t.lastRun)}<br><span class="badge ${t.lastStatus === 'success' ? 'low' : 'urgent'}">${t.lastStatus}</span>` : "Never"}
                  </td>
                  <td>
                    <div class="flex gap-4">
                      <button class="btn sm" onclick="runScheduled(${t.id})">▶ Run</button>
                      <button class="btn sm" onclick="openScheduledModal(${t.id})">Edit</button>
                      <button class="btn sm danger" onclick="deleteScheduled(${t.id})">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : '<p style="color:var(--text-dim);text-align:center;padding:20px">No scheduled tasks yet.</p>'}
      </div>
    `;
  } catch (e) {
    main.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

async function openScheduledModal(id = null) {
  let task = { name: "", description: "", schedule: "", type: "script", payload: "", enabled: true };
  if (id) {
    try { task = await api(`/scheduled/${id}`); } catch {}
  }
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <h2>${id ? "Edit Schedule" : "New Scheduled Task"}</h2>
      <div class="form-group"><label>Name</label><input id="sched-name" value="${esc(task.name)}" placeholder="Daily backup"></div>
      <div class="form-group"><label>Description</label><input id="sched-desc" value="${esc(task.description)}" placeholder="What does this do?"></div>
      <div class="grid-2">
        <div class="form-group"><label>Schedule (cron)</label><input id="sched-cron" value="${esc(task.schedule)}" placeholder="0 6 * * *"></div>
        <div class="form-group"><label>Type</label>
          <select id="sched-type">
            ${["script", "command", "webhook"].map(t => `<option value="${t}" ${task.type === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Payload (command / URL / script)</label><textarea id="sched-payload" placeholder="bun run backup.sh">${esc(task.payload)}</textarea></div>
      <div class="form-actions">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn primary" onclick="saveScheduled(${id})">${id ? "Update" : "Create"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

async function saveScheduled(id) {
  const body = {
    name: document.getElementById("sched-name").value,
    description: document.getElementById("sched-desc").value,
    schedule: document.getElementById("sched-cron").value,
    type: document.getElementById("sched-type").value,
    payload: document.getElementById("sched-payload").value,
  };
  if (!body.name.trim() || !body.schedule.trim()) return alert("Name and schedule are required");
  if (id) {
    await api(`/scheduled/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  } else {
    await api("/scheduled", { method: "POST", body: JSON.stringify(body) });
  }
  document.querySelector(".modal-overlay")?.remove();
  navigate("scheduled");
}

async function toggleScheduled(id, enabled) {
  await api(`/scheduled/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
  navigate("scheduled");
}

async function runScheduled(id) {
  try {
    const result = await api(`/scheduled/${id}/run`, { method: "POST" });
    alert(`Executed: ${result.status}`);
    navigate("scheduled");
  } catch (e) {
    alert("Run failed: " + e.message);
  }
}

async function deleteScheduled(id) {
  if (!confirm("Delete this scheduled task?")) return;
  await api(`/scheduled/${id}`, { method: "DELETE" });
  navigate("scheduled");
}

// ═══════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════
navigate("dashboard");
