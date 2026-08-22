/* ==========================================================================
   Marginalia — a vivid, block-based note workspace
   Vanilla JS, no build step, no dependencies. Data lives in localStorage.
   ========================================================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "marginalia_v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const SPINE_COLORS = [
    { key: "violet", value: "#7C5CFC" },
    { key: "coral", value: "#FF6B5B" },
    { key: "teal", value: "#0FB8A6" },
    { key: "gold", value: "#F2A93B" },
    { key: "rose", value: "#F154A3" },
    { key: "none", value: "#C9C2DE" },
  ];

  const BLOCK_TYPES = [
    { key: "p", title: "Text", desc: "Plain paragraph", icon: "¶", kw: ["text", "paragraph", "plain"] },
    { key: "h1", title: "Heading 1", desc: "Big section heading", icon: "H1", kw: ["heading", "title", "h1"] },
    { key: "h2", title: "Heading 2", desc: "Medium heading", icon: "H2", kw: ["heading", "h2"] },
    { key: "h3", title: "Heading 3", desc: "Small heading", icon: "H3", kw: ["heading", "h3"] },
    { key: "bullet", title: "Bulleted list", desc: "A simple bullet point", icon: "•", kw: ["bullet", "list", "ul"] },
    { key: "number", title: "Numbered list", desc: "A numbered line item", icon: "1.", kw: ["number", "list", "ol", "ordered"] },
    { key: "todo", title: "To-do", desc: "A checkbox to track tasks", icon: "☑", kw: ["todo", "task", "check", "checkbox"] },
    { key: "quote", title: "Quote", desc: "Set text apart", icon: "❝", kw: ["quote", "blockquote"] },
    { key: "callout", title: "Callout", desc: "Highlighted note box", icon: "💡", kw: ["callout", "note", "info"] },
    { key: "code", title: "Code", desc: "A monospace code block", icon: "</>", kw: ["code", "snippet"] },
    { key: "divider", title: "Divider", desc: "A horizontal line", icon: "—", kw: ["divider", "line", "hr"] },
  ];

  const PLACEHOLDERS = {
    p: "Type '/' for commands, or just start writing…",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    bullet: "List item",
    number: "List item",
    todo: "To-do",
    quote: "Quote",
    callout: "Write a note…",
    code: "// code",
  };

  const EMOJI_SET = "📝 📔 📓 📒 📚 🗒 🗂 📌 📎 🔖 💡 ✨ 🔥 🌱 🌙 ☀️ ⭐ 🎯 🧭 🗺 🧠 💭 ✅ 📅 ⏰ 🍀 🎨 🎵 🍎 ☕ 🚀 💻 📷 🏡 ✈️ 🧩 🔑 📈 💰 🛒 ❤️ 🧘 🏋️ 📖 🧵 🪴 🐣 🎉".split(" ");

  // ------------------------------------------------------------------------
  // State + persistence
  // ------------------------------------------------------------------------
  let state = null;
  let saveTimer = null;

  function freshBlock(type = "p", html = "") {
    return { id: uid(), type, html, checked: false };
  }

  function seedWorkspace() {
    const welcomeId = uid();
    const tipsId = uid();
    return {
      theme: "day",
      currentId: welcomeId,
      order: [welcomeId, tipsId],
      pages: {
        [welcomeId]: {
          id: welcomeId,
          icon: "✨",
          title: "Welcome to Marginalia",
          color: "violet",
          parentId: null,
          createdAt: Date.now(),
          blocks: [
            freshBlock("p", "This is your workspace. Everything you write is saved privately, right here on this device."),
            freshBlock("h2", "Getting around"),
            freshBlock("bullet", "Type <code>/</code> at the start of a line to insert headings, lists, to-dos, quotes and more."),
            freshBlock("bullet", "Select any text to bold, italicise, or turn it into a link."),
            freshBlock("bullet", "Drag the grip handle that appears on the left of a block to reorder it."),
            freshBlock("todo", "Try checking off this to-do"),
            freshBlock("callout", "Tap the emoji above the title to give this page its own icon, and pick a spine colour to find it fast in the sidebar."),
            freshBlock("quote", "A good note is a message to your future self."),
          ],
        },
        [tipsId]: {
          id: tipsId,
          icon: "🚀",
          title: "Install this on your phone",
          color: "teal",
          parentId: null,
          createdAt: Date.now() + 1,
          blocks: [
            freshBlock("p", "Marginalia works fully offline once loaded, and can live on your home screen like any other app."),
            freshBlock("h3", "On Android (Chrome)"),
            freshBlock("number", "Open the site in Chrome."),
            freshBlock("number", "Tap the ⋮ menu, then \"Add to Home screen\" (or use the install banner if it appears)."),
            freshBlock("number", "Open it from your home screen — it now runs full-screen, like a native app."),
            freshBlock("divider", ""),
            freshBlock("p", "Use the Export button above any page to save it as a Markdown file you can share or back up."),
          ],
        },
      },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt data */ }
    return seedWorkspace();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }

  function saveNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage full or unavailable */ }
  }

  // ------------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------------
  function currentPage() {
    return state.currentId ? state.pages[state.currentId] : null;
  }

  function stripHtml(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || "").trim();
  }

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function placeCaret(el, atStart) {
    if (!el) return;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(atStart);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function isCaretAtStart(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length === 0;
  }

  // ------------------------------------------------------------------------
  // Sidebar / page tree
  // ------------------------------------------------------------------------
  function pageChildren(parentId) {
    return state.order
      .map((id) => state.pages[id])
      .filter((p) => p && (p.parentId || null) === parentId);
  }

  function renderSidebar() {
    const tree = $("#pageTree");
    tree.innerHTML = "";

    function renderLevel(parentId, depth) {
      pageChildren(parentId).forEach((page) => {
        const row = document.createElement("div");
        row.className = "page-row" + (page.id === state.currentId ? " active" : "");
        row.style.marginLeft = depth * 14 + "px";
        row.dataset.id = page.id;

        const color = (SPINE_COLORS.find((c) => c.key === page.color) || SPINE_COLORS[0]).value;
        row.innerHTML = `
          <span class="spine" style="background:${page.color === "none" ? "transparent" : color}"></span>
          <span class="p-icon">${page.icon || "📝"}</span>
          <span class="p-title">${escapeHtml(page.title) || "Untitled"}</span>
          <span class="row-actions">
            <button class="add-sub" title="Add sub-page" aria-label="Add sub-page">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </span>`;

        row.addEventListener("click", (e) => {
          if (e.target.closest(".add-sub")) return;
          selectPage(page.id);
          closeMobileSidebar();
        });
        row.querySelector(".add-sub").addEventListener("click", (e) => {
          e.stopPropagation();
          createPage(page.id);
        });

        tree.appendChild(row);
        renderLevel(page.id, depth + 1);
      });
    }
    renderLevel(null, 0);

    if (state.order.length === 0) {
      tree.innerHTML = `<div class="storage-note" style="padding:10px 6px;">No pages yet — create your first one below.</div>`;
    }
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  // ------------------------------------------------------------------------
  // Page CRUD
  // ------------------------------------------------------------------------
  function createPage(parentId = null) {
    const id = uid();
    const palette = ["violet", "coral", "teal", "gold", "rose"];
    state.pages[id] = {
      id,
      icon: "📝",
      title: "",
      color: palette[Math.floor(Math.random() * palette.length)],
      parentId,
      createdAt: Date.now(),
      blocks: [freshBlock("p", "")],
    };
    state.order.push(id);
    state.currentId = id;
    scheduleSave();
    renderAll();
    requestAnimationFrame(() => placeCaret($("#pageTitle"), true));
  }

  function deletePage(id) {
    const page = state.pages[id];
    if (!page) return;
    const childIds = state.order.filter((pid) => state.pages[pid] && state.pages[pid].parentId === id);
    if (!confirm(`Delete "${page.title || "Untitled"}"${childIds.length ? ` and its ${childIds.length} sub-page(s)` : ""}? This can't be undone.`)) return;

    const toRemove = new Set([id, ...childIds]);
    // also remove deeper descendants
    let grew = true;
    while (grew) {
      grew = false;
      state.order.forEach((pid) => {
        const p = state.pages[pid];
        if (p && toRemove.has(p.parentId) && !toRemove.has(pid)) {
          toRemove.add(pid);
          grew = true;
        }
      });
    }
    toRemove.forEach((pid) => delete state.pages[pid]);
    state.order = state.order.filter((pid) => !toRemove.has(pid));
    if (toRemove.has(state.currentId)) {
      state.currentId = state.order[0] || null;
    }
    scheduleSave();
    renderAll();
    showToast("Page deleted");
  }

  function selectPage(id) {
    state.currentId = id;
    scheduleSave();
    renderAll();
  }

  // ------------------------------------------------------------------------
  // Editor rendering
  // ------------------------------------------------------------------------
  let pendingFocus = null; // { blockId, atStart }

  function renderEditor() {
    const page = currentPage();
    const emptyState = $("#emptyState");
    const editorPane = $("#editorPane");

    if (!page) {
      emptyState.style.display = "flex";
      editorPane.style.display = "none";
      $("#topbarTitle").textContent = "Marginalia";
      return;
    }
    emptyState.style.display = "none";
    editorPane.style.display = "flex";

    $("#topbarTitle").textContent = page.title || "Untitled";
    $("#pageIconBtn").textContent = page.icon || "📝";

    const titleEl = $("#pageTitle");
    if (titleEl.innerHTML !== escapeHtml(page.title)) titleEl.innerHTML = escapeHtml(page.title);

    const d = new Date(page.createdAt);
    $("#pageMeta").textContent = `Created ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

    renderSpineRow(page);
    renderCrumbs(page);
    renderBlocks();
  }

  function renderSpineRow(page) {
    const row = $("#spineRow");
    row.innerHTML = "";
    SPINE_COLORS.forEach((c) => {
      const dot = document.createElement("button");
      dot.className = "spine-dot" + (page.color === c.key ? " selected" : "");
      dot.style.background = c.value;
      dot.title = c.key;
      dot.addEventListener("click", () => {
        page.color = c.key;
        scheduleSave();
        renderSpineRow(page);
        renderSidebar();
      });
      row.appendChild(dot);
    });
  }

  function renderCrumbs(page) {
    const crumbs = $("#crumbs");
    const chain = [];
    let p = page;
    const guard = new Set();
    while (p && !guard.has(p.id)) {
      chain.unshift(p);
      guard.add(p.id);
      p = p.parentId ? state.pages[p.parentId] : null;
    }
    crumbs.innerHTML = chain
      .map((pg, i) => {
        const sep = i > 0 ? '<span>/</span>' : "";
        return `${sep}<span class="crumb" data-id="${pg.id}">${pg.icon || ""} ${escapeHtml(pg.title) || "Untitled"}</span>`;
      })
      .join(" ");
    $$(".crumb", crumbs).forEach((el) => {
      el.addEventListener("click", () => selectPage(el.dataset.id));
    });
  }

  function numberIndexFor(blocks, i) {
    let n = 0;
    for (let k = i; k >= 0; k--) {
      if (blocks[k].type === "number") n++;
      else break;
    }
    return n;
  }

  function renderBlocks() {
    const page = currentPage();
    const container = $("#blocks");
    container.innerHTML = "";
    if (!page) return;

    page.blocks.forEach((block, idx) => {
      container.appendChild(buildBlockEl(block, idx, page.blocks));
    });

    if (pendingFocus) {
      const target = container.querySelector(`[data-id="${pendingFocus.blockId}"] .block-content`);
      if (target) placeCaret(target, pendingFocus.atStart);
      pendingFocus = null;
    }
  }

  function buildBlockEl(block, idx, blocksArr) {
    const wrap = document.createElement("div");
    wrap.className = "block" + (block.checked ? " checked" : "");
    wrap.dataset.type = block.type;
    wrap.dataset.id = block.id;

    const controls = document.createElement("div");
    controls.className = "block-controls";
    controls.innerHTML = `
      <button class="add-below" title="Add block below" aria-label="Add block below">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button class="drag-handle" title="Drag to reorder" aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>
      </button>
      <button class="del-block" title="Delete block" aria-label="Delete block">
        <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>
      </button>`;
    wrap.appendChild(controls);

    let inner;
    switch (block.type) {
      case "bullet":
        inner = document.createElement("div");
        inner.innerHTML = `<span class="marker"></span>`;
        wrap.appendChild(inner.firstChild);
        wrap.appendChild(makeContentEl(block));
        break;
      case "number": {
        const n = numberIndexFor(blocksArr, idx);
        const marker = document.createElement("span");
        marker.className = "marker";
        marker.textContent = n + ".";
        wrap.appendChild(marker);
        wrap.appendChild(makeContentEl(block));
        break;
      }
      case "todo": {
        const box = document.createElement("span");
        box.className = "checkbox";
        box.addEventListener("click", () => {
          block.checked = !block.checked;
          wrap.classList.toggle("checked", block.checked);
          scheduleSave();
        });
        wrap.appendChild(box);
        wrap.appendChild(makeContentEl(block));
        break;
      }
      case "callout": {
        const box = document.createElement("div");
        box.className = "callout-box";
        box.innerHTML = `<span class="callout-icon">💡</span>`;
        const content = makeContentEl(block);
        box.appendChild(content);
        wrap.appendChild(box);
        break;
      }
      case "code": {
        const box = document.createElement("div");
        box.className = "code-box";
        const content = makeContentEl(block, true);
        box.appendChild(content);
        wrap.appendChild(box);
        break;
      }
      case "divider": {
        const line = document.createElement("div");
        line.className = "divider-line";
        wrap.appendChild(line);
        break;
      }
      default:
        wrap.appendChild(makeContentEl(block));
    }

    attachDragHandlers(controls.querySelector(".drag-handle"), wrap);
    controls.querySelector(".add-below").addEventListener("click", () => {
      insertBlockAfter(block.id, "p");
    });
    controls.querySelector(".del-block").addEventListener("click", () => {
      removeBlock(block.id);
    });

    return wrap;
  }

  function makeContentEl(block, isCode) {
    const el = document.createElement(isCode ? "pre" : "div");
    el.className = "block-content";
    el.contentEditable = "true";
    el.spellcheck = true;
    el.dataset.placeholder = PLACEHOLDERS[block.type] || "Type something…";
    el.innerHTML = block.html || "";
    bindContentEvents(el, block);
    return el;
  }

  // ------------------------------------------------------------------------
  // Content editing behaviour
  // ------------------------------------------------------------------------
  function bindContentEvents(el, block) {
    el.addEventListener("input", () => {
      block.html = el.innerHTML;
      scheduleSave();
      updateAddBlockHintVisibility();

      const text = el.textContent || "";
      if (text === "/") {
        openSlashMenu(el, block, "");
      } else if (slashState.open && slashState.blockId === block.id) {
        if (text.startsWith("/")) updateSlashFilter(text.slice(1));
        else closeSlashMenu();
      }
    });

    el.addEventListener("keydown", (e) => {
      if (slashState.open && slashState.blockId === block.id) {
        if (handleSlashKeydown(e)) return;
      }

      if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
        e.preventDefault();
        const page = currentPage();
        const text = stripHtml(el.innerHTML);
        if (["bullet", "number", "todo"].includes(block.type) && text === "") {
          changeBlockType(block.id, "p");
          return;
        }
        insertBlockAfter(block.id, ["bullet", "number", "todo"].includes(block.type) ? block.type : "p");
        return;
      }

      if (e.key === "Backspace" && isCaretAtStart(el)) {
        const page = currentPage();
        const idx = page.blocks.findIndex((b) => b.id === block.id);
        if (stripHtml(el.innerHTML) === "") {
          e.preventDefault();
          if (page.blocks.length > 1) {
            removeBlock(block.id, true);
          } else if (block.type !== "p") {
            changeBlockType(block.id, "p");
          }
          return;
        } else if (idx > 0) {
          e.preventDefault();
          mergeWithPrevious(block.id);
          return;
        }
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const page = currentPage();
        const idx = page.blocks.findIndex((b) => b.id === block.id);
        const targetIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
        if (targetIdx >= 0 && targetIdx < page.blocks.length) {
          const atStart = e.key === "ArrowUp";
          const targetEl = $(`#blocks .block[data-id="${page.blocks[targetIdx].id}"] .block-content`);
          if (targetEl) {
            e.preventDefault();
            placeCaret(targetEl, atStart ? false : true);
          }
        }
      }
    });

    el.addEventListener("blur", () => {
      block.html = el.innerHTML;
      scheduleSave();
    });

    el.addEventListener("mouseup", scheduleSelectionCheck);
    el.addEventListener("keyup", scheduleSelectionCheck);
  }

  function updateAddBlockHintVisibility() {
    // purely cosmetic; hint always visible under the list
  }

  function insertBlockAfter(afterId, type) {
    const page = currentPage();
    const idx = page.blocks.findIndex((b) => b.id === afterId);
    const nb = freshBlock(type, "");
    page.blocks.splice(idx + 1, 0, nb);
    pendingFocus = { blockId: nb.id, atStart: true };
    scheduleSave();
    renderBlocks();
  }

  function removeBlock(id, focusPrev) {
    const page = currentPage();
    const idx = page.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    if (page.blocks.length === 1) {
      // keep at least one empty block
      page.blocks[0] = freshBlock("p", "");
      pendingFocus = { blockId: page.blocks[0].id, atStart: true };
    } else {
      page.blocks.splice(idx, 1);
      const focusIdx = Math.max(0, idx - 1);
      if (focusPrev) pendingFocus = { blockId: page.blocks[focusIdx].id, atStart: false };
    }
    scheduleSave();
    renderBlocks();
  }

  function mergeWithPrevious(id) {
    const page = currentPage();
    const idx = page.blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const prev = page.blocks[idx - 1];
    const cur = page.blocks[idx];
    const prevLen = stripHtml(prev.html).length;
    prev.html = (prev.html || "") + (cur.html || "");
    page.blocks.splice(idx, 1);
    pendingFocus = { blockId: prev.id, atStart: false };
    scheduleSave();
    renderBlocks();
  }

  function changeBlockType(id, type) {
    const page = currentPage();
    const block = page.blocks.find((b) => b.id === id);
    if (!block) return;
    block.type = type;
    pendingFocus = { blockId: id, atStart: false };
    scheduleSave();
    renderBlocks();
  }

  // ------------------------------------------------------------------------
  // Slash command menu
  // ------------------------------------------------------------------------
  const slashState = { open: false, blockId: null, filter: "", activeIndex: 0 };

  function openSlashMenu(anchorEl, block) {
    slashState.open = true;
    slashState.blockId = block.id;
    slashState.filter = "";
    slashState.activeIndex = 0;
    positionPopover($("#slashMenu"), anchorEl);
    renderSlashMenu();
    $("#slashMenu").classList.add("visible");
  }

  function updateSlashFilter(text) {
    slashState.filter = text.toLowerCase();
    slashState.activeIndex = 0;
    renderSlashMenu();
  }

  function closeSlashMenu() {
    slashState.open = false;
    $("#slashMenu").classList.remove("visible");
  }

  function filteredBlockTypes() {
    const f = slashState.filter;
    if (!f) return BLOCK_TYPES;
    return BLOCK_TYPES.filter((t) => t.title.toLowerCase().includes(f) || t.kw.some((k) => k.includes(f)));
  }

  function renderSlashMenu() {
    const menu = $("#slashMenu");
    const items = filteredBlockTypes();
    if (!items.length) {
      menu.innerHTML = `<div class="slash-empty">No matching blocks</div>`;
      return;
    }
    menu.innerHTML = `<div class="sm-label">Turn into</div>` + items
      .map(
        (t, i) => `
      <div class="slash-item${i === slashState.activeIndex ? " active" : ""}" data-key="${t.key}">
        <span class="si-icon">${t.icon}</span>
        <span class="si-text"><span class="si-title">${t.title}</span><span class="si-desc">${t.desc}</span></span>
      </div>`
      )
      .join("");
    $$(".slash-item", menu).forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applySlashSelection(el.dataset.key);
      });
    });
  }

  function applySlashSelection(key) {
    const page = currentPage();
    const block = page.blocks.find((b) => b.id === slashState.blockId);
    if (block) {
      block.html = "";
      block.type = key;
      pendingFocus = { blockId: block.id, atStart: true };
      scheduleSave();
      renderBlocks();
    }
    closeSlashMenu();
  }

  function handleSlashKeydown(e) {
    const items = filteredBlockTypes();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      slashState.activeIndex = Math.min(items.length - 1, slashState.activeIndex + 1);
      renderSlashMenu();
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      slashState.activeIndex = Math.max(0, slashState.activeIndex - 1);
      renderSlashMenu();
      return true;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[slashState.activeIndex];
      if (item) applySlashSelection(item.key);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeSlashMenu();
      return true;
    }
    if (e.key === "Backspace" && slashState.filter === "") {
      closeSlashMenu();
      return false;
    }
    return false;
  }

  function positionPopover(el, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    el.style.left = Math.max(12, rect.left + scrollX) + "px";
    el.style.top = rect.bottom + scrollY + 6 + "px";
    // keep on screen horizontally
    requestAnimationFrame(() => {
      const w = el.offsetWidth || 250;
      if (rect.left + w > window.innerWidth - 12) {
        el.style.left = Math.max(12, window.innerWidth - w - 12) + "px";
      }
    });
  }

  // ------------------------------------------------------------------------
  // Drag reorder (pointer events — unified mouse & touch)
  // ------------------------------------------------------------------------
  let dragCtx = null;

  function attachDragHandlers(handle, wrap) {
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const page = currentPage();
      const container = $("#blocks");
      dragCtx = {
        id: wrap.dataset.id,
        pointerId: e.pointerId,
        indicator: document.createElement("div"),
      };
      dragCtx.indicator.className = "drop-indicator";
      wrap.classList.add("dragging");
      handle.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        if (!dragCtx) return;
        const siblings = $$(".block", container).filter((b) => b.dataset.id !== dragCtx.id);
        let inserted = false;
        for (const sib of siblings) {
          const r = sib.getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) {
            container.insertBefore(dragCtx.indicator, sib);
            inserted = true;
            break;
          }
        }
        if (!inserted) container.appendChild(dragCtx.indicator);
      };

      const onUp = () => {
        if (!dragCtx) return;
        const container2 = $("#blocks");
        const ids = $$(".block", container2)
          .map((b) => b.dataset.id)
          .filter((id) => id !== dragCtx.id);
        const indicatorIdx = Array.from(container2.children).indexOf(dragCtx.indicator);
        const idsBefore = Array.from(container2.children)
          .slice(0, indicatorIdx)
          .filter((n) => n.classList && n.classList.contains("block"))
          .map((n) => n.dataset.id);

        const newOrder = [];
        idsBefore.forEach((id) => newOrder.push(id));
        newOrder.push(dragCtx.id);
        ids.forEach((id) => {
          if (!newOrder.includes(id)) newOrder.push(id);
        });

        const page2 = currentPage();
        const byId = Object.fromEntries(page2.blocks.map((b) => [b.id, b]));
        page2.blocks = newOrder.map((id) => byId[id]).filter(Boolean);

        dragCtx.indicator.remove();
        wrap.classList.remove("dragging");
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        dragCtx = null;
        scheduleSave();
        renderBlocks();
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp, { once: true });
    });
  }

  // ------------------------------------------------------------------------
  // Selection toolbar (bold / italic / strike / code / link)
  // ------------------------------------------------------------------------
  function scheduleSelectionCheck() {
    clearTimeout(scheduleSelectionCheck._t);
    scheduleSelectionCheck._t = setTimeout(checkSelection, 10);
  }

  function checkSelection() {
    const toolbar = $("#selectionToolbar");
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      toolbar.classList.remove("visible");
      return;
    }
    const anchorNode = sel.anchorNode;
    const container = anchorNode && anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
    if (!container || !container.closest(".block-content")) {
      toolbar.classList.remove("visible");
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      toolbar.classList.remove("visible");
      return;
    }
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    toolbar.style.left = rect.left + scrollX + rect.width / 2 + "px";
    toolbar.style.top = rect.top + scrollY - 44 + "px";
    toolbar.classList.add("visible");
  }

  $("#selectionToolbar").addEventListener("mousedown", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    e.preventDefault();
    const cmd = btn.dataset.cmd;
    if (cmd === "link") {
      const url = window.prompt("Link URL");
      if (url) document.execCommand("createLink", false, url);
    } else if (cmd === "code") {
      document.execCommand("insertHTML", false, `<code>${window.getSelection().toString()}</code>`);
    } else {
      document.execCommand(cmd, false, null);
    }
    const active = document.activeElement;
    if (active && active.classList.contains("block-content")) {
      const page = currentPage();
      const wrap = active.closest(".block");
      const block = page.blocks.find((b) => b.id === wrap.dataset.id);
      if (block) block.html = active.innerHTML;
      scheduleSave();
    }
  });

  document.addEventListener("selectionchange", scheduleSelectionCheck);

  // ------------------------------------------------------------------------
  // Emoji popover (page icon)
  // ------------------------------------------------------------------------
  function toggleEmojiPopover() {
    const pop = $("#emojiPopover");
    if (pop.classList.contains("visible")) {
      pop.classList.remove("visible");
      return;
    }
    pop.innerHTML = EMOJI_SET.map((e) => `<button type="button">${e}</button>`).join("");
    positionPopover(pop, $("#pageIconBtn"));
    pop.classList.add("visible");
    $$("button", pop).forEach((b) => {
      b.addEventListener("click", () => {
        const page = currentPage();
        page.icon = b.textContent;
        scheduleSave();
        pop.classList.remove("visible");
        renderEditor();
        renderSidebar();
      });
    });
  }

  // ------------------------------------------------------------------------
  // Export as Markdown
  // ------------------------------------------------------------------------
  function inlineToMarkdown(el) {
    let out = "";
    el.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        out += node.textContent;
        return;
      }
      const tag = node.tagName ? node.tagName.toLowerCase() : "";
      const inner = inlineToMarkdown(node);
      if (tag === "b" || tag === "strong") out += `**${inner}**`;
      else if (tag === "i" || tag === "em") out += `*${inner}*`;
      else if (tag === "s" || tag === "strike" || tag === "del") out += `~~${inner}~~`;
      else if (tag === "code") out += `\`${inner}\``;
      else if (tag === "a") out += `[${inner}](${node.getAttribute("href") || ""})`;
      else if (tag === "br") out += "\n";
      else out += inner;
    });
    return out;
  }

  function blockToMarkdown(block) {
    const holder = document.createElement("div");
    holder.innerHTML = block.html || "";
    const text = inlineToMarkdown(holder).trim();
    switch (block.type) {
      case "h1": return `# ${text}`;
      case "h2": return `## ${text}`;
      case "h3": return `### ${text}`;
      case "bullet": return `- ${text}`;
      case "number": return `1. ${text}`;
      case "todo": return `- [${block.checked ? "x" : " "}] ${text}`;
      case "quote": return `> ${text}`;
      case "callout": return `> 💡 ${text}`;
      case "code": return "```\n" + text + "\n```";
      case "divider": return "---";
      default: return text;
    }
  }

  function exportCurrentPage() {
    const page = currentPage();
    if (!page) return;
    const lines = [`# ${page.icon || ""} ${page.title || "Untitled"}`.trim(), ""];
    page.blocks.forEach((b) => lines.push(blockToMarkdown(b), ""));
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(page.title || "untitled").replace(/[^\w\- ]/g, "").trim() || "untitled"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Exported as Markdown");
  }

  // ------------------------------------------------------------------------
  // Command palette
  // ------------------------------------------------------------------------
  function openPalette() {
    $("#paletteOverlay").classList.add("visible");
    const input = $("#paletteInput");
    input.value = "";
    renderPaletteResults("");
    setTimeout(() => input.focus(), 30);
  }
  function closePalette() {
    $("#paletteOverlay").classList.remove("visible");
  }

  function renderPaletteResults(query) {
    const q = query.trim().toLowerCase();
    const results = $("#paletteResults");
    const pages = state.order.map((id) => state.pages[id]).filter(Boolean);
    let matches = pages;
    if (q) {
      matches = pages.filter((p) => {
        if ((p.title || "").toLowerCase().includes(q)) return true;
        const text = p.blocks.map((b) => stripHtml(b.html)).join(" ").toLowerCase();
        return text.includes(q);
      });
    }
    if (!matches.length) {
      results.innerHTML = `<div class="palette-empty">No pages match "${escapeHtml(query)}"</div>`;
      return;
    }
    results.innerHTML = matches
      .map((p, i) => {
        const snippet = q
          ? (p.blocks.map((b) => stripHtml(b.html)).join(" ").slice(0, 90) || "Empty page")
          : new Date(p.createdAt).toLocaleDateString();
        return `<div class="palette-item${i === 0 ? " active" : ""}" data-id="${p.id}">
          <span class="pi-icon">${p.icon || "📝"}</span>
          <div><div class="pi-title">${escapeHtml(p.title) || "Untitled"}</div><div class="pi-snippet">${escapeHtml(snippet)}</div></div>
        </div>`;
      })
      .join("");
    $$(".palette-item", results).forEach((el) => {
      el.addEventListener("click", () => {
        selectPage(el.dataset.id);
        closePalette();
      });
    });
  }

  // ------------------------------------------------------------------------
  // Mobile sidebar
  // ------------------------------------------------------------------------
  function openMobileSidebar() {
    $("#sidebar").classList.add("open");
    $("#sidebarScrim").classList.add("visible");
  }
  function closeMobileSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebarScrim").classList.remove("visible");
  }

  // ------------------------------------------------------------------------
  // Theme
  // ------------------------------------------------------------------------
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    $("#themeIcon").innerHTML =
      state.theme === "night"
        ? '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  }

  function toggleTheme() {
    state.theme = state.theme === "night" ? "day" : "night";
    applyTheme();
    scheduleSave();
  }

  // ------------------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------------------
  function renderAll() {
    renderSidebar();
    renderEditor();
  }

  function bindTitleEvents() {
    const titleEl = $("#pageTitle");
    titleEl.addEventListener("input", () => {
      const page = currentPage();
      if (!page) return;
      page.title = titleEl.textContent;
      $("#topbarTitle").textContent = page.title || "Untitled";
      scheduleSave();
      renderSidebar();
    });
    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = $("#blocks .block .block-content");
        if (first) placeCaret(first, true);
      }
    });
  }

  function bindGlobalUI() {
    $("#menuToggle").addEventListener("click", openMobileSidebar);
    $("#sidebarScrim").addEventListener("click", closeMobileSidebar);
    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#newPageBtn").addEventListener("click", () => createPage(null));
    $("#emptyNewPageBtn").addEventListener("click", () => createPage(null));
    $("#fab").addEventListener("click", () => createPage(null));
    $("#pageIconBtn").addEventListener("click", toggleEmojiPopover);
    $("#exportBtn").addEventListener("click", exportCurrentPage);
    $("#deletePageBtn").addEventListener("click", () => state.currentId && deletePage(state.currentId));
    $("#addBlockHint").addEventListener("click", () => {
      const page = currentPage();
      if (!page) return;
      const last = page.blocks[page.blocks.length - 1];
      if (last && stripHtml(last.html) === "" && last.type === "p") {
        pendingFocus = { blockId: last.id, atStart: true };
        renderBlocks();
      } else {
        insertBlockAfter(last.id, "p");
      }
    });

    $("#searchToggle").addEventListener("click", openPalette);
    $("#searchPill").addEventListener("click", openPalette);
    $("#paletteOverlay").addEventListener("mousedown", (e) => {
      if (e.target.id === "paletteOverlay") closePalette();
    });
    $("#paletteInput").addEventListener("input", (e) => renderPaletteResults(e.target.value));
    $("#paletteInput").addEventListener("keydown", (e) => {
      const results = $$(".palette-item");
      let idx = results.findIndex((r) => r.classList.contains("active"));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (idx >= 0) results[idx].classList.remove("active");
        idx = Math.min(results.length - 1, idx + 1);
        if (results[idx]) results[idx].classList.add("active");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx >= 0) results[idx].classList.remove("active");
        idx = Math.max(0, idx - 1);
        if (results[idx]) results[idx].classList.add("active");
      } else if (e.key === "Enter") {
        const active = $(".palette-item.active");
        if (active) {
          selectPage(active.dataset.id);
          closePalette();
        }
      } else if (e.key === "Escape") {
        closePalette();
      }
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (e.key === "Escape") {
        closeSlashMenu();
        $("#emojiPopover").classList.remove("visible");
      }
    });

    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest("#emojiPopover") && !e.target.closest("#pageIconBtn")) {
        $("#emojiPopover").classList.remove("visible");
      }
      if (!e.target.closest("#slashMenu") && !e.target.closest(".block-content")) {
        closeSlashMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) closeMobileSidebar();
    });
  }

  // ------------------------------------------------------------------------
  // Service worker registration
  // ------------------------------------------------------------------------
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  // ------------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------------
  function init() {
    state = loadState();
    if (!state.currentId && state.order.length) state.currentId = state.order[0];
    applyTheme();
    bindTitleEvents();
    bindGlobalUI();
    renderAll();
    registerSW();
    window.addEventListener("beforeunload", saveNow);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
