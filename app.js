(() => {
  "use strict";

  const STORE = "learning-hub-v1";
  const ABBR = { gpu: "GPU", infer: "Inf", agents: "Agt" };
  let C = null;
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      const s = raw ? JSON.parse(raw) : {};
      return { done: s.done || {}, quiz: s.quiz || {}, grade: s.grade || {} };
    } catch (e) {
      return { done: {}, quiz: {}, grade: {} };
    }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { toast("Couldn't save progress in this browser"); }
  }

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function md(s) {
    let out = esc(s);
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return out;
  }
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  const track = (id) => C.tracks.find((t) => t.id === id);
  const mod = (t, w) => C.modules.find((m) => m.track === t && m.week === w);
  const key = (t, w) => `${t}-${w}`;

  function startDate() {
    const [y, m, d] = C.start.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function weekStart(n) { const d = startDate(); d.setDate(d.getDate() + 7 * (n - 1)); return d; }
  function weekDue(n) { const d = weekStart(n); d.setDate(d.getDate() + 6); d.setHours(21, 0, 0, 0); return d; }
  function currentWeek() {
    const days = Math.floor((new Date() - startDate()) / 86400000);
    return Math.min(C.weeks, Math.max(1, Math.floor(days / 7) + 1));
  }
  const fmt = (d, opts) => d.toLocaleDateString(undefined, opts || { month: "short", day: "numeric" });
  function range(n) {
    const a = weekStart(n), b = new Date(a); b.setDate(b.getDate() + 6);
    return `${fmt(a)} to ${fmt(b)}`;
  }
  function countdown(n) {
    const ms = weekDue(n) - new Date();
    if (ms < 0) return "Past due";
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `Due in ${h} hr${h === 1 ? "" : "s"}`;
    const d = Math.floor(h / 24);
    return `Due in ${d} day${d === 1 ? "" : "s"}`;
  }

  function items(m) {
    const list = [];
    m.blocks.forEach((b) => b.items.forEach((text) => {
      list.push({ id: hash(`${m.track}|${m.week}|${b.label}|${text}`), text, kind: b.kind });
    }));
    return list;
  }
  function progress(m) {
    const all = items(m);
    const done = all.filter((i) => S.done[i.id]).length;
    const lab = all.filter((i) => i.kind === "lab" || i.kind === "exam");
    const labDone = lab.filter((i) => S.done[i.id]).length;
    return { done, total: all.length, labDone, labTotal: lab.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // ---------- nav ----------
  function nav(route) {
    const cw = currentWeek();
    const links = [
      ["#/", "Dashboard"],
      [`#/week/${cw}`, "This week"],
      ["#/syllabus", "Syllabus"],
      ["#/grades", "Gradebook"],
      ["#/resources", "Resources"],
    ];
    let html = links.map(([h, l]) => `<li><a href="${h}"${route === h ? ' aria-current="page"' : ""}>${l}</a></li>`).join("");
    html += '<li class="sep" aria-hidden="true"></li>';
    html += C.tracks.map((t) => {
      const h = `#/track/${t.id}`;
      return `<li class="c-${t.id}"><a href="${h}"${route === h ? ' aria-current="page"' : ""}><span class="dot" style="background:var(--c)"></span>${esc(t.name)}</a></li>`;
    }).join("");
    $("#nav").innerHTML = html;
    $("#term").textContent = `${C.term} · Week ${cw} of ${C.weeks}`;
  }

  // ---------- views ----------
  function die() {
    const cw = currentWeek();
    let g = '<div class="die-grid" role="grid" aria-label="Progress by track and week">';
    g += "<span></span>";
    for (let w = 1; w <= C.weeks; w++) g += `<span class="die-col${w === cw ? " now" : ""}">W${w}</span>`;
    C.tracks.forEach((t) => {
      g += `<span class="die-row c-${t.id}"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--c);flex:none"></span><span class="lbl">${esc(t.name)}</span><span class="abbr">${ABBR[t.id] || ""}</span></span>`;
      for (let w = 1; w <= C.weeks; w++) {
        const m = mod(t.id, w);
        if (!m) { g += "<span></span>"; continue; }
        const its = items(m);
        const p = progress(m);
        const cells = its.map((i) => `<i class="${S.done[i.id] ? "on" : ""}"></i>`).join("");
        const cls = ["sm", `t-${t.id}`];
        if (w === cw) cls.push("now");
        if (p.done === p.total) cls.push("done");
        g += `<a class="${cls.join(" ")}" href="#/module/${t.id}/${w}" aria-label="${esc(t.name)} week ${w}: ${p.done} of ${p.total} done"><span class="sm-cells">${cells}</span><span class="sm-meta">${p.done}/${p.total}</span></a>`;
      }
    });
    g += "</div>";
    const legend = C.tracks.map((t) => `<span class="c-${t.id}"><i style="background:var(--c)"></i>${esc(t.name)}</span>`).join("") +
      '<span><i style="background:var(--cell)"></i>Not done yet</span>';
    return `<section class="die" aria-labelledby="die-h">
      <div class="die-head"><h2 id="die-h" style="margin:0">Progress</h2><p>Each square is one assignment. The outlined column is this week.</p></div>
      ${g}
      <div class="die-legend">${legend}</div>
    </section>`;
  }

  function viewDashboard() {
    const cw = currentWeek();
    const all = C.modules.reduce((a, m) => { const p = progress(m); a.d += p.done; a.t += p.total; return a; }, { d: 0, t: 0 });
    let html = `<h1>Week ${cw} of ${C.weeks}</h1>
      <p class="lede">${range(cw)}. Everything this week is due ${esc(fmt(weekDue(cw), { weekday: "long", month: "short", day: "numeric" }))} at 9pm. <span class="countdown">${countdown(cw)}.</span> ${all.d} of ${all.t} assignments done overall.</p>`;
    html += die();
    html += `<h2>Due this week</h2><div class="due-grid">`;
    C.tracks.forEach((t) => {
      const m = mod(t.id, cw);
      if (!m) return;
      const p = progress(m);
      const flag = !t.core && m.exam ? '<span class="flag">Droppable this week</span>' : "";
      html += `<article class="due c-${t.id}">
        <span class="track-name">${esc(t.name)} · ${esc(t.sessions)}</span>
        <h3><a href="#/module/${t.id}/${cw}">${esc(m.title)}</a></h3>
        <p class="goal">${esc(m.goal)}</p>
        ${flag}
        <div class="bar" aria-hidden="true"><b style="width:${p.pct}%"></b></div>
        <div class="stat"><span>${p.done} of ${p.total} done</span><span>Lab ${p.labDone}/${p.labTotal}</span></div>
      </article>`;
    });
    html += "</div>";
    html += `<h2>Weekly check-in</h2><p style="max-width:64ch">${esc(C.checkin)}</p>`;
    return html;
  }

  function viewModule(tid, w) {
    const t = track(tid), m = mod(tid, w);
    if (!t || !m) return notFound();
    let html = `<div class="c-${t.id}">
      <p class="crumbs"><a href="#/track/${t.id}">${esc(t.name)}</a> / Week ${w}</p>
      <header class="module-head">
        <span class="track-name">${esc(t.name)}, week ${w}</span>
        <h1>${esc(m.title)}</h1>
        <p class="meta">${range(w)} · due ${esc(fmt(weekDue(w), { weekday: "short", month: "short", day: "numeric" }))}, 9pm · ${countdown(w)}</p>
      </header>
      <p class="lede">${esc(m.goal)}</p>`;
    if (!t.core && m.exam) html += `<p class="flag" style="margin:-12px 0 20px">Exam or holiday week. This track can be dropped and made up later.</p>`;
    m.blocks.forEach((b) => {
      const its = b.items.map((text) => ({ id: hash(`${m.track}|${m.week}|${b.label}|${text}`), text }));
      const done = its.filter((i) => S.done[i.id]).length;
      html += `<section class="block k-${b.kind}">
        <div class="block-head"><h3>${esc(b.label)}</h3><span class="count">${done}/${its.length}</span></div>
        <ul class="checks">${its.map((i) => `<li><label><input type="checkbox" data-id="${i.id}"${S.done[i.id] ? " checked" : ""}><span class="txt">${md(i.text)}</span></label></li>`).join("")}</ul>
      </section>`;
    });
    if (m.quiz && m.quiz.length) {
      const k = key(t.id, w);
      html += `<section class="quiz"><h3>Quiz: answer from memory in Sunday's check-in</h3>
        <ol>${m.quiz.map((q) => `<li>${md(q)}</li>`).join("")}</ol>
        <label class="quiz-check"><input type="checkbox" data-quiz="${k}"${S.quiz[k] ? " checked" : ""}>I can answer all of these without notes</label>
      </section>`;
    }
    const prev = w > 1 ? `<a href="#/module/${t.id}/${w - 1}"><small>Previous</small>Week ${w - 1}: ${esc(mod(t.id, w - 1).title)}</a>` : "<span></span>";
    const next = w < C.weeks ? `<a href="#/module/${t.id}/${w + 1}" style="text-align:right"><small>Next</small>Week ${w + 1}: ${esc(mod(t.id, w + 1).title)}</a>` : "<span></span>";
    html += `<nav class="pager" aria-label="Weeks">${prev}${next}</nav></div>`;
    return html;
  }

  function viewTrack(tid) {
    const t = track(tid);
    if (!t) return notFound();
    const cw = currentWeek();
    let html = `<div class="c-${t.id}"><header class="module-head"><span class="track-name">${t.core ? "Core track" : "Agent track"} · ${esc(t.load)}</span><h1>${esc(t.name)}</h1><p class="meta">${esc(t.sessions)}</p></header>
      <p class="lede">${esc(t.blurb)}</p><div class="weeks">`;
    for (let w = 1; w <= C.weeks; w++) {
      const m = mod(t.id, w);
      if (!m) continue;
      const p = progress(m);
      html += `<a class="week-row${w === cw ? " now" : ""}" href="#/module/${t.id}/${w}">
        <span class="wk">Week ${w}</span>
        <span><span class="t">${esc(m.title)}</span><span class="d">${range(w)}${m.exam ? " · exam or holiday week" : ""}</span></span>
        <span class="p"><span class="bar" style="display:block;margin-bottom:4px"><b style="width:${p.pct}%"></b></span>${p.done} of ${p.total} done</span>
      </a>`;
    }
    return html + "</div></div>";
  }

  function viewWeek(w) {
    if (!(w >= 1 && w <= C.weeks)) return notFound();
    let html = `<h1>Week ${w}</h1><p class="lede">${range(w)} · due ${esc(fmt(weekDue(w), { weekday: "long", month: "short", day: "numeric" }))} at 9pm · ${countdown(w)}</p>`;
    html += '<nav class="week-switch" aria-label="Choose a week">';
    for (let i = 1; i <= C.weeks; i++) html += `<a href="#/week/${i}"${i === w ? ' aria-current="page"' : ""}>Week ${i}</a>`;
    html += "</nav>";
    C.tracks.forEach((t) => {
      const m = mod(t.id, w);
      if (!m) return;
      const p = progress(m);
      html += `<section class="block c-${t.id} k-lab">
        <div class="block-head"><h3><a href="#/module/${t.id}/${w}">${esc(t.name)}: ${esc(m.title)}</a></h3><span class="count">${p.done}/${p.total}</span></div>
        <p style="margin:0 0 10px;color:var(--muted)">${esc(m.goal)}${!t.core && m.exam ? " Droppable this week." : ""}</p>
        <div class="bar"><b style="width:${p.pct}%"></b></div>
      </section>`;
    });
    return html;
  }

  function viewGrades() {
    let html = `<h1>Gradebook</h1><p class="lede">A lab counts as passed when every lab item is checked and Sunday's check-in comes back PASS. Record each check-in result here.</p>`;
    html += '<div class="table-wrap"><table><thead><tr><th scope="col">Week</th>';
    C.tracks.forEach((t) => { html += `<th scope="col" class="c-${t.id}"><span style="color:var(--c)">${esc(t.name)}</span></th>`; });
    html += "</tr></thead><tbody>";
    let passed = 0, graded = 0;
    for (let w = 1; w <= C.weeks; w++) {
      html += `<tr><th scope="row">Week ${w}</th>`;
      C.tracks.forEach((t) => {
        const m = mod(t.id, w);
        if (!m) { html += "<td></td>"; return; }
        const p = progress(m), k = key(t.id, w), g = S.grade[k] || "";
        if (g) graded++;
        if (g === "PASS") passed++;
        html += `<td><div class="num" style="font-size:14px;color:var(--muted);margin-bottom:4px">Lab ${p.labDone}/${p.labTotal}${m.quiz && m.quiz.length ? ` · quiz ${S.quiz[k] ? "ready" : "not ready"}` : ""}</div>
          <select data-grade="${k}" aria-label="${esc(t.name)} week ${w} check-in result">
            <option value=""${g === "" ? " selected" : ""}>Not graded</option>
            <option value="PASS"${g === "PASS" ? " selected" : ""}>PASS</option>
            <option value="REDO"${g === "REDO" ? " selected" : ""}>REDO</option>
            <option value="DROPPED"${g === "DROPPED" ? " selected" : ""}>Dropped</option>
          </select></td>`;
      });
      html += "</tr>";
    }
    html += "</tbody></table></div>";
    html += `<p style="color:var(--muted)">${passed} passed out of ${graded} graded so far.</p>`;
    return html;
  }

  function viewResources(filter) {
    const f = filter || "all";
    let html = `<h1>Resources</h1><p class="lede">Every link used in the course.</p><div class="filters" role="group" aria-label="Filter by track">`;
    html += `<button type="button" data-filter="all" aria-pressed="${f === "all"}">All</button>`;
    C.tracks.forEach((t) => { html += `<button type="button" data-filter="${t.id}" aria-pressed="${f === t.id}">${esc(t.name)}</button>`; });
    html += '</div><ul class="res-list">';
    C.resources.filter((r) => f === "all" || r.track === f).forEach((r) => {
      html += `<li class="c-${r.track}"><span class="dot" aria-hidden="true"></span><div><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><span>${esc(r.what)}</span></div></li>`;
    });
    return html + "</ul>";
  }

  function viewSyllabus() {
    let html = `<h1>Syllabus</h1><p class="lede">${C.weeks} weeks from ${fmt(startDate(), { month: "long", day: "numeric" })}. Three tracks run in parallel. Everything is due ${esc(C.due)}.</p>`;
    html += '<div class="track-cards">';
    C.tracks.forEach((t) => {
      html += `<article class="track-card c-${t.id}"><h3>${esc(t.name)}</h3><p>${esc(t.blurb)}</p><p><strong>${esc(t.load)}</strong>, ${esc(t.sessions)}.</p><a class="go" href="#/track/${t.id}">Open track</a></article>`;
    });
    html += "</div><h2>Course rules</h2><ol class=\"rules\">";
    C.rules.forEach((r) => { html += `<li>${md(r)}</li>`; });
    html += `</ol><h2>Weekly check-in</h2><p style="max-width:64ch">${esc(C.checkin)}</p>`;
    return html;
  }

  function notFound() {
    return `<div class="error"><h1>Page not found</h1><p>That week or track doesn't exist. <a href="#/">Go to the dashboard</a>.</p></div>`;
  }

  // ---------- router ----------
  let resFilter = "all";
  function render() {
    const h = location.hash || "#/";
    const parts = h.replace(/^#\/?/, "").split("/").filter(Boolean);
    let html, route = h;
    if (!parts.length) { html = viewDashboard(); route = "#/"; }
    else if (parts[0] === "module") html = viewModule(parts[1], Number(parts[2]));
    else if (parts[0] === "track") html = viewTrack(parts[1]);
    else if (parts[0] === "week") html = viewWeek(Number(parts[1]));
    else if (parts[0] === "grades") html = viewGrades();
    else if (parts[0] === "resources") html = viewResources(resFilter);
    else if (parts[0] === "syllabus") html = viewSyllabus();
    else html = notFound();
    nav(route);
    $("#main").innerHTML = html;
  }

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.id) {
      if (el.checked) S.done[el.dataset.id] = true; else delete S.done[el.dataset.id];
      save();
      const block = el.closest(".block");
      if (block) {
        const boxes = block.querySelectorAll("input[data-id]");
        const n = [...boxes].filter((b) => b.checked).length;
        block.querySelector(".count").textContent = `${n}/${boxes.length}`;
      }
    } else if (el.dataset.quiz) {
      if (el.checked) S.quiz[el.dataset.quiz] = true; else delete S.quiz[el.dataset.quiz];
      save();
    } else if (el.dataset.grade) {
      if (el.value) S.grade[el.dataset.grade] = el.value; else delete S.grade[el.dataset.grade];
      save();
      render();
      toast("Check-in result saved");
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (b) { resFilter = b.dataset.filter; render(); }
  });

  $("#export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `learning-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Progress exported");
  });
  $("#import").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (!s || typeof s.done !== "object") throw new Error("bad file");
      S = { done: s.done || {}, quiz: s.quiz || {}, grade: s.grade || {} };
      save(); render(); toast("Progress imported");
    } catch (err) {
      toast("That file isn't a progress export. Choose a file made with Export progress.");
    }
    e.target.value = "";
  });

  window.addEventListener("hashchange", () => { render(); $("#main").focus({ preventScroll: true }); window.scrollTo(0, 0); });

  fetch("course.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => { C = data; render(); })
    .catch(() => {
      $("#main").innerHTML = '<div class="error"><h1>Course data didn\'t load</h1><p>Check that <code>course.json</code> is in the same folder as <code>index.html</code>, then reload.</p></div>';
    });
})();
