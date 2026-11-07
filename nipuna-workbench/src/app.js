/* app.js — React UI for the NIPUNA Karnataka Independent Proposal Review Workbench (htm, no build step). */
(function () {
  "use strict";
  const N = window.NWB, R = window.NWBReport;
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const html = htm.bind(React.createElement);
  const clone = (o) => (typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  const STAGES = [
    ["A", "Case"], ["B", "Documents"], ["C", "Facts"], ["D", "Analyse"], ["E", "Findings & scores"], ["F", "Decision"], ["G", "Report & save"],
  ];

  // ───────────────────────── capabilities ─────────────────────────
  async function useCap(name) {
    try {
      if (!window.claude || typeof window.claude.use !== "function") return null;
      return await window.claude.use(name);
    } catch (e) {
      return null;
    }
  }

  // ───────────────────────── storage ─────────────────────────
  const CHUNK = 60000;
  function makeStore(db, uid) {
    if (db && uid) {
      const col = () => db.collection("data/users/" + uid);
      return {
        mode: "db",
        label: "Saved to this artifact's private per-user store on claude.ai (only your account can read it).",
        async list() {
          const snap = await col().get();
          return snap.docs.filter((d) => d.id.startsWith("case__")).map((d) => ({ id: d.id.slice(6), ...d.data() })).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        },
        async load(id) {
          const head = await col().doc("case__" + id).get();
          if (!head.exists) throw new Error("Case not found");
          const h = head.data();
          let s = "";
          for (let i = 0; i < h.parts; i++) {
            const p = await col().doc("part__" + id + "__" + i).get();
            if (!p.exists) throw new Error("Case data incomplete (part " + i + " missing)");
            s += p.data().s;
          }
          return JSON.parse(s);
        },
        async save(c) {
          const s = JSON.stringify(c);
          const parts = Math.ceil(s.length / CHUNK) || 1;
          let old = 0;
          try { const prev = await col().doc("case__" + c.id).get(); if (prev.exists) old = prev.data().parts || 0; } catch (e) { /* first save */ }
          for (let i = 0; i < parts; i++) await col().doc("part__" + c.id + "__" + i).set({ s: s.slice(i * CHUNK, (i + 1) * CHUNK) });
          for (let i = parts; i < old; i++) await col().doc("part__" + c.id + "__" + i).delete();
          await col().doc("case__" + c.id).set({ name: c.meta.caseName, updatedAt: c.updatedAt, parts, schema: N.SCHEMA, synthetic: !!c.synthetic });
        },
        async remove(id) {
          const head = await col().doc("case__" + id).get();
          const parts = head.exists ? head.data().parts || 0 : 0;
          for (let i = 0; i < parts; i++) await col().doc("part__" + id + "__" + i).delete();
          await col().doc("case__" + id).delete();
        },
      };
    }
    let ok = false;
    try { localStorage.setItem("nwb:probe", "1"); localStorage.removeItem("nwb:probe"); ok = true; } catch (e) { ok = false; }
    if (ok)
      return {
        mode: "local",
        label: "Saved in this browser only (the claude.ai store is not available in this view). Export the case file to keep a copy.",
        async list() {
          const out = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith("nwb:case:")) {
              try { const c = JSON.parse(localStorage.getItem(k)); out.push({ id: c.id, name: c.meta.caseName, updatedAt: c.updatedAt, synthetic: c.synthetic }); } catch (e) { /* skip */ }
            }
          }
          return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        },
        async load(id) { return JSON.parse(localStorage.getItem("nwb:case:" + id)); },
        async save(c) { localStorage.setItem("nwb:case:" + c.id, JSON.stringify(c)); },
        async remove(id) { localStorage.removeItem("nwb:case:" + id); },
      };
    return { mode: "none", label: "No storage is available in this view. Use Export case file to keep your work.", async list() { return []; }, async load() { throw new Error("No storage"); }, async save() { throw new Error("No storage available — export the case file instead."); }, async remove() {} };
  }

  // ───────────────────────── document extraction ─────────────────────────
  async function extractPdf(buf) {
    if (!window.pdfjsLib) throw new Error("PDF library did not load.");
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    const units = [];
    const imagePages = [];
    const OPS = pdfjsLib.OPS || {};
    const imgOps = [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat].filter((x) => x !== undefined);
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const text = N.pdfItemsToText(tc.items);
      units.push({ loc: "p." + p, text });
      try {
        const ops = await page.getOperatorList();
        const imgs = ops.fnArray.filter((f) => imgOps.includes(f)).length;
        if (imgs && text.replace(/\s/g, "").length >= 25) imagePages.push("p." + p);
      } catch (e) { /* operator list unavailable */ }
    }
    const extraction = N.assessExtraction(units, "pdf");
    if (imagePages.length) extraction.warnings.push("Pages with embedded images: " + imagePages.join(", ") + ". Text inside images (scanned tables, infographics, logos) is not extracted — check these pages visually and add a transcription if they carry evidence.");
    return { units, extraction, kind: "pdf" };
  }
  async function extractDocx(buf) {
    if (!window.mammoth) throw new Error("DOCX library did not load.");
    const res = await mammoth.convertToHtml({ arrayBuffer: buf });
    const units = N.docxHtmlToUnits(res.value, (h) => new DOMParser().parseFromString(h, "text/html"));
    const extraction = N.assessExtraction(units, "docx");
    const msgs = (res.messages || []).filter((m) => m.type === "warning").map((m) => m.message);
    if (msgs.length) extraction.warnings.push("Converter notes: " + N.trunc(msgs.slice(0, 3).join("; "), 300));
    extraction.warnings.push("DOCX locations are headings, paragraphs and table rows; page numbers are not available. Footnotes, text boxes and headers/footers may be omitted by the converter.");
    return { units, extraction, kind: "docx" };
  }
  function textToUnits(text) {
    return String(text)
      .split(/\n\s*\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, i) => ({ loc: "¶" + (i + 1), text: t }));
  }

  // ───────────────────────── small UI pieces ─────────────────────────
  function Field({ id, label, children, hint, wide }) {
    return html`<div className=${"field" + (wide ? " wide" : "")}><label htmlFor=${id}>${label}</label>${children}${hint ? html`<div className="hint">${hint}</div>` : null}</div>`;
  }
  function Badge({ tone, children, title }) {
    return html`<span className=${"badge " + (tone || "")} title=${title || ""}>${children}</span>`;
  }
  function Banner({ tone, children }) {
    return html`<div className=${"banner " + (tone || "")} role=${tone === "crit" ? "alert" : "status"}>${children}</div>`;
  }
  function Cite({ c, e, onOpen }) {
    if (!e) return null;
    const d = (c.documents || []).find((x) => x.id === e.doc);
    const name = d ? d.shortName || N.trunc(d.name, 18) : e.doc;
    const ok = e.verified !== false;
    return html`<button type="button" className=${"cite " + (ok ? "" : "bad")} onClick=${() => onOpen({ doc: e.doc, loc: e.loc, excerpt: e.excerpt })} title=${e.excerpt ? "“" + e.excerpt + "”" : "Open source"}>${name} ${e.loc}${ok ? "" : " · excerpt not found"}</button>`;
  }
  function Confirm({ label, confirmLabel, onConfirm, tone }) {
    const [armed, setArmed] = useState(false);
    if (!armed) return html`<button type="button" className=${"btn " + (tone || "")} onClick=${() => setArmed(true)}>${label}</button>`;
    return html`<span className="confirm"><span>${confirmLabel}</span><button type="button" className="btn danger" onClick=${() => { setArmed(false); onConfirm(); }}>Yes, continue</button><button type="button" className="btn ghost" onClick=${() => setArmed(false)}>Cancel</button></span>`;
  }

  // ───────────────────────── App ─────────────────────────
  function App() {
    const [caps, setCaps] = useState({ sample: null, downloads: null, ready: false });
    const [store, setStore] = useState(() => makeStore(null, null));
    const [cases, setCases] = useState([]);
    const [c, setC] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [stage, setStage] = useState("A");
    const [viewer, setViewer] = useState(null);
    const [toast, setToast] = useState(null);
    const [busy, setBusy] = useState("");

    const say = useCallback((msg, tone) => { setToast({ msg, tone: tone || "ok", at: Date.now() }); }, []);
    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);

    useEffect(() => {
      let live = true;
      (async () => {
        const [sample, downloads, db, user] = await Promise.all([useCap("sample"), useCap("downloads"), useCap("db"), useCap("user")]);
        let uid = null;
        try { uid = user ? await user.id() : null; } catch (e) { uid = null; }
        if (!live) return;
        const st = makeStore(db, uid);
        setCaps({ sample, downloads, ready: true });
        setStore(st);
        try { setCases(await st.list()); } catch (e) { say("Could not list saved cases: " + (e.message || e.code), "warn"); }
      })();
      return () => { live = false; };
    }, []);

    const update = useCallback((fn, auditAction, auditDetail) => {
      setC((prev) => {
        const next = clone(prev);
        fn(next);
        if (auditAction) N.audit(next, N.ADVISOR, auditAction, auditDetail);
        next.updatedAt = new Date().toISOString();
        return next;
      });
      setDirty(true);
    }, []);

    async function refreshList() { try { setCases(await store.list()); } catch (e) { /* ignore */ } }
    async function save() {
      if (!c) return;
      setBusy("Saving…");
      try {
        const snap = clone(c);
        N.audit(snap, N.ADVISOR, "Case saved", store.mode);
        await store.save(snap);
        setC(snap);
        setDirty(false);
        say("Saved.");
        refreshList();
      } catch (e) {
        say("Save failed: " + (e.message || e.code || e) + ". Export the case file to keep your work.", "crit");
      } finally { setBusy(""); }
    }
    async function open(id) {
      setBusy("Opening…");
      try {
        const obj = await store.load(id);
        const errs = N.validateCase(obj);
        if (errs.length) throw new Error(errs.join(" "));
        setC(obj); setDirty(false); setStage("A"); setViewer(null);
      } catch (e) { say("Could not open case: " + (e.message || e), "crit"); } finally { setBusy(""); }
    }
    function startNew() {
      setC(N.newCase("New proposal review")); setDirty(true); setStage("A"); setViewer(null);
    }
    async function loadBundled() {
      setBusy("Loading…");
      try {
        const r = await fetch("cases/bundled.case.json");
        if (!r.ok) throw new Error(r.status === 404 ? "no prepared case is published with this copy of the workbench" : "HTTP " + r.status);
        const obj = await r.json();
        const errs = N.validateCase(obj);
        if (errs.length) throw new Error(errs.join(" "));
        obj.id = N.uid("case");
        N.audit(obj, N.ADVISOR, "Bundled case opened", "Prepared in Claude Code session; saved as a new case copy");
        setC(obj); setDirty(true); setStage("A");
        say("Prepared case loaded as a new, unsaved copy. Review it, then press Save.");
      } catch (e) { say("Could not load the bundled case: " + (e.message || e), "crit"); } finally { setBusy(""); }
    }
    function loadDemo() { setC(N.makeSyntheticDemo()); setDirty(true); setStage("A"); say("Synthetic demonstration loaded. It describes a fictional applicant."); }
    async function importFile(file) {
      try {
        const obj = JSON.parse(await file.text());
        const errs = N.validateCase(obj);
        if (errs.length) throw new Error(errs.join(" "));
        N.audit(obj, N.ADVISOR, "Case imported", file.name);
        setC(obj); setDirty(true); setStage("A");
        say("Imported " + file.name + ". Press Save to keep it in this workbench.");
      } catch (e) { say("Import failed: " + (e.message || e), "crit"); }
    }
    async function removeCase() {
      if (!c) return;
      try { await store.remove(c.id); } catch (e) { say("Delete failed: " + (e.message || e), "crit"); return; }
      setC(null); setDirty(false); refreshList(); say("Case deleted from " + (store.mode === "db" ? "the claude.ai store" : "this browser") + ". Exported files are not affected.");
    }
    async function saveFile(filename, data) {
      if (!caps.downloads) { say("File saving is not available in this view. Open the artifact on claude.ai to download files.", "warn"); return false; }
      try { await caps.downloads.save({ filename, data }); return true; }
      catch (e) { if (e && e.code === "declined") say("Download declined.", "warn"); else say("Download failed: " + ((e && (e.message || e.code)) || e), "crit"); return false; }
    }

    const openViewer = useCallback((v) => setViewer(v), []);
    const ctx = { c, update, caps, say, setBusy, openViewer, saveFile, store, setStage };

    return html`
      <div className="shell">
        <header className="top">
          <div className="brand">
            <div className="eyebrow">NIPUNA Karnataka · Independent review</div>
            <div className="title">${c ? c.meta.caseName : "Proposal Review Workbench"}</div>
          </div>
          <div className="top-actions">
            ${c ? html`<${Badge} tone="draft">${c.meta.status}</${Badge}>` : null}
            ${c && c.synthetic ? html`<${Badge} tone="crit">Synthetic demo</${Badge}>` : null}
            ${c ? html`<span className=${"save-state " + (dirty ? "dirty" : "")}>${dirty ? "Unsaved changes" : "Saved"}</span>` : null}
            ${c ? html`<button type="button" className="btn primary" onClick=${save} disabled=${!!busy || !dirty}>Save case</button>` : null}
            ${c ? html`<button type="button" className="btn ghost" onClick=${() => { if (dirty) say("Unsaved changes were kept in memory only until you open another case.", "warn"); setC(null); }}>All cases</button>` : null}
          </div>
        </header>
        ${busy ? html`<div className="busy" role="status">${busy}</div>` : null}
        ${!c
          ? html`<${Home} cases=${cases} store=${store} caps=${caps} onOpen=${open} onNew=${startNew} onBundled=${loadBundled} onDemo=${loadDemo} onImport=${importFile} />`
          : html`
          <div className="workspace">
            <nav className="stages" aria-label="Workflow">
              ${STAGES.map(([k, l]) => html`<button type="button" key=${k} className=${"stage " + (stage === k ? "on" : "")} aria-current=${stage === k ? "step" : undefined} onClick=${() => setStage(k)}><span className="sk">${k}</span><span>${l}</span></button>`)}
            </nav>
            <main className="main">
              <${Warnings} c=${c} />
              ${stage === "A" ? html`<${StageCase} ...${ctx} />` : null}
              ${stage === "B" ? html`<${StageDocs} ...${ctx} />` : null}
              ${stage === "C" ? html`<${StageFacts} ...${ctx} />` : null}
              ${stage === "D" ? html`<${StageAnalyse} ...${ctx} />` : null}
              ${stage === "E" ? html`<${StageReview} ...${ctx} />` : null}
              ${stage === "F" ? html`<${StageDecision} ...${ctx} />` : null}
              ${stage === "G" ? html`<${StageReport} ...${ctx} onDelete=${removeCase} />` : null}
            </main>
            ${viewer ? html`<${Viewer} c=${c} v=${viewer} onClose=${() => setViewer(null)} />` : null}
          </div>`}
        ${toast ? html`<div className=${"toast " + toast.tone} role="status">${toast.msg}<button type="button" className="x" aria-label="Dismiss" onClick=${() => setToast(null)}>×</button></div>` : null}
      </div>`;
  }

  function Home({ cases, store, caps, onOpen, onNew, onBundled, onDemo, onImport }) {
    const fileRef = useRef(null);
    return html`
      <main className="home">
        <section className="panel intro">
          <h1>Proposal Review Workbench</h1>
          <p>Prepare an independent advisory evaluation of a NIPUNA Karnataka skilling or employment proposal: source-cited facts, code-checked arithmetic, four-criterion scoring, a provisional compliance checklist, verification notes and an editable Word report. The workbench supports the advisor's judgement. It never issues a government approval.</p>
          <div className="row gap">
            <button type="button" className="btn primary" onClick=${onNew}>New case</button>
            <button type="button" className="btn" onClick=${onBundled}>Open the prepared case</button>
            <button type="button" className="btn ghost" onClick=${onDemo}>Load synthetic demo</button>
            <button type="button" className="btn ghost" onClick=${() => fileRef.current && fileRef.current.click()}>Import case file (.json)</button>
            <input ref=${fileRef} id="import-file" type="file" accept=".json,application/json" hidden onChange=${(e) => { const f = e.target.files[0]; if (f) onImport(f); e.target.value = ""; }} />
          </div>
        </section>
        <section className="panel">
          <h2>Saved cases</h2>
          <p className="hint">${store.label}</p>
          ${cases.length
            ? html`<ul className="caselist">${cases.map((k) => html`<li key=${k.id}><button type="button" className="linkish" onClick=${() => onOpen(k.id)}>${k.name}</button>${k.synthetic ? html` <${Badge} tone="crit">Synthetic</${Badge}>` : null}<span className="muted"> · updated ${String(k.updatedAt || "").slice(0, 10)}</span></li>`)}</ul>`
            : html`<p className="muted">No saved cases yet. Start a new case, or open the prepared case if one is published with this workbench.</p>`}
        </section>
        <${Privacy} store=${store} caps=${caps} />
      </main>`;
  }

  function Privacy({ store, caps }) {
    return html`<section className="panel privacy">
      <h2>Where your documents go</h2>
      <ul>
        <li><b>Reading files:</b> PDF and DOCX files are parsed in this browser tab. The files themselves are not uploaded; the extracted text is kept in the case.</li>
        <li><b>Saving:</b> ${store.label}</li>
        <li><b>AI analysis:</b> ${caps.sample ? "when you press an analysis button, the extracted text of the proposal documents is sent to Claude under your own claude.ai account. Nothing is sent until you confirm." : "Claude is not available in this view. You can copy the prompt into a Claude chat yourself and paste the JSON answer back."} Text sent to Claude leaves this browser.</li>
        <li><b>Web verification:</b> this workbench cannot browse. Enter verification evidence yourself; such records are labelled “Advisor-entered verification”.</li>
        <li><b>Deletion:</b> Delete case removes it from the store above. It does not remove files you exported, and no guarantee is made about copies held elsewhere.</li>
        <li><b>Personal data:</b> do not upload trainee lists or identity documents; the report should not contain trainee identifiers.</li>
      </ul>
    </section>`;
  }

  function Warnings({ c }) {
    const usable = N.hasUsableProposal(c) || c.synthetic;
    const rd = N.readiness(c);
    const inj = (c.documents || []).flatMap((d) => (d.injection || []).map((h) => d.name + " " + h.loc));
    return html`<div className="warnings">
      ${c.synthetic ? html`<${Banner} tone="crit">Synthetic demonstration — fictional applicant and figures. Not for real decisions.</${Banner}>` : null}
      ${!usable ? html`<${Banner} tone="warn">No usable proposal document on file. Scoring, findings and recommendations are disabled; only a blank template can be exported.</${Banner}>` : null}
      ${!N.policyConfirmed(c) ? html`<${Banner} tone="warn">${N.PROVISIONAL_BANNER}</${Banner}>` : null}
      ${inj.length ? html`<${Banner} tone="crit">Embedded instructions found in applicant documents (${inj.join("; ")}). They are treated as data and never followed.</${Banner}>` : null}
      ${rd.warnings.map((w, i) => html`<${Banner} key=${i} tone="crit">${w}</${Banner}>`)}
    </div>`;
  }

  // ───────────────────────── A. Case ─────────────────────────
  function StageCase({ c, update }) {
    const m = c.meta;
    const set = (k) => (e) => { const v = e.target.type === "checkbox" ? e.target.checked : e.target.value; update((x) => { x.meta[k] = v; }, "Case details edited", k + " → " + v); };
    return html`<section className="panel">
      <h2>A. Case details</h2>
      <div className="grid2">
        <${Field} id="case-name" label="Case name"><input id="case-name" value=${m.caseName} onChange=${set("caseName")} /></${Field}>
        <${Field} id="case-stage" label="Proposal stage"><select id="case-stage" value=${m.stage} onChange=${set("stage")}>${N.STAGES.map((s) => html`<option key=${s}>${s}</option>`)}</select></${Field}>
        <${Field} id="case-date" label="Evaluation date" hint="Defaults to today; dates printed in reference reports are never used."><input id="case-date" type="date" value=${m.evalDate} onChange=${set("evalDate")} /></${Field}>
        <${Field} id="case-policy" label="Current approved policy supplied?"><select id="case-policy" value=${m.policySupplied} onChange=${set("policySupplied")}><option>No</option><option>Yes</option></select></${Field}>
        <${Field} id="case-research" label="External research" hint="This workbench cannot browse. Use “Manual evidence only” unless verification records come from a documented research step."><select id="case-research" value=${m.research} onChange=${set("research")}>${N.RESEARCH.map((s) => html`<option key=${s}>${s}</option>`)}</select></${Field}>
        <${Field} id="case-status" label="Document status"><input id="case-status" value=${m.status} onChange=${set("status")} /></${Field}>
        <${Field} id="case-concerns" label="Special concerns" wide=${true}><textarea id="case-concerns" rows="3" value=${m.concerns} onChange=${set("concerns")}></textarea></${Field}>
      </div>
      <label className="check"><input id="case-ack" type="checkbox" checked=${!!m.confidentialityAck} onChange=${set("confidentialityAck")} /> I will treat the applicant's documents as confidential, and I understand that AI analysis sends their text to Claude under my account.</label>
      ${m.policySupplied === "Yes" ? html`<${PolicyConfirmations} c=${c} update=${update} />` : null}
    </section>`;
  }

  function PolicyConfirmations({ c, update }) {
    const [f, setF] = useState({ name: "", role: "", date: N.todayISO(), scope: "" });
    const add = () => {
      if (!f.name.trim() || !f.role.trim() || !f.scope.trim()) return;
      update((x) => { x.policy.confirmations.push({ ...f }); }, "Officer policy confirmation recorded", f.name + ", " + f.role + ", " + f.date + ", scope: " + f.scope);
      setF({ name: "", role: "", date: N.todayISO(), scope: "" });
    };
    return html`<div className="sub">
      <h3>Officer confirmation of policy currency</h3>
      <p className="hint">Record only a documented confirmation from a KDEM officer (name, role, date, scope). The workbench never creates or assumes one. A document with role “Current approved policy” must also be on file.</p>
      ${(c.policy.confirmations || []).map((p, i) => html`<div className="kv" key=${i}>${p.name} · ${p.role} · ${p.date} · scope: ${p.scope} <button type="button" className="btn tiny ghost" onClick=${() => update((x) => { x.policy.confirmations.splice(i, 1); }, "Policy confirmation removed", p.name)}>Remove</button></div>`)}
      <div className="grid4">
        <input id="pc-name" placeholder="Officer name" value=${f.name} onChange=${(e) => setF({ ...f, name: e.target.value })} />
        <input id="pc-role" placeholder="Role" value=${f.role} onChange=${(e) => setF({ ...f, role: e.target.value })} />
        <input id="pc-date" type="date" value=${f.date} onChange=${(e) => setF({ ...f, date: e.target.value })} />
        <input id="pc-scope" placeholder="Scope (e.g. NIPUNA guidelines v2, clauses 4–7)" value=${f.scope} onChange=${(e) => setF({ ...f, scope: e.target.value })} />
      </div>
      <button type="button" className="btn" onClick=${add}>Record confirmation</button>
    </div>`;
  }

  // ───────────────────────── B. Documents ─────────────────────────
  function StageDocs({ c, update, say, setBusy, openViewer }) {
    const [role, setRole] = useState("Proposal (initial)");
    const [version, setVersion] = useState("");
    const [paste, setPaste] = useState({ name: "", text: "" });
    const fileRef = useRef(null);
    async function addFiles(files) {
      for (const file of Array.from(files)) {
        setBusy("Extracting " + file.name + "…");
        try {
          const buf = await file.arrayBuffer();
          const lower = file.name.toLowerCase();
          let r;
          if (lower.endsWith(".pdf")) r = await extractPdf(buf);
          else if (lower.endsWith(".docx")) r = await extractDocx(buf);
          else if (lower.endsWith(".txt")) { const units = textToUnits(new TextDecoder().decode(buf)); r = { units, extraction: N.assessExtraction(units, "text"), kind: "text" }; }
          else throw new Error("Unsupported file type. Use PDF, DOCX or TXT, or paste the text.");
          const doc = { id: N.uid("D"), name: file.name, shortName: N.trunc(file.name.replace(/\.[^.]+$/, ""), 22), role, version, kind: r.kind, addedAt: N.todayISO(), units: r.units, extraction: r.extraction, injection: N.detectInjection(r.units) };
          update((x) => { x.documents.push(doc); }, "Document added", file.name + " as " + role + " — extraction " + r.extraction.status + ", " + r.extraction.chars + " chars");
          if (r.extraction.status === "failed") say(file.name + ": extraction unreliable — see the warnings. Supply an OCR-enabled copy or paste the text.", "crit");
          else say(file.name + " added (" + r.units.length + " locations, " + r.extraction.status + ").");
        } catch (e) { say(file.name + ": " + (e.message || e), "crit"); }
      }
      setBusy("");
    }
    function addPaste() {
      if (!paste.text.trim()) return;
      const units = textToUnits(paste.text);
      const name = paste.name.trim() || "Pasted text";
      const doc = { id: N.uid("D"), name, shortName: N.trunc(name, 22), role, version, kind: "text", addedAt: N.todayISO(), units, extraction: N.assessExtraction(units, "text"), injection: N.detectInjection(units) };
      update((x) => { x.documents.push(doc); }, "Pasted text added", name + " as " + role);
      setPaste({ name: "", text: "" });
    }
    return html`<section className="panel">
      <h2>B. Documents</h2>
      <p className="hint">Assign each document a role before adding it. Reference reports are used for format only and are never sent as evidence. Annexures, tables and footnotes must be checked: pages without a text layer are flagged, not skipped silently.</p>
      <div className="grid3">
        <${Field} id="doc-role" label="Role for the next document"><select id="doc-role" value=${role} onChange=${(e) => setRole(e.target.value)}>${N.DOC_ROLES.map((r) => html`<option key=${r}>${r}</option>`)}</select></${Field}>
        <${Field} id="doc-version" label="Version / date (optional)"><input id="doc-version" value=${version} onChange=${(e) => setVersion(e.target.value)} placeholder="e.g. v2, 9 Sep 2026" /></${Field}>
        <div className="field"><label>Add files</label><button type="button" className="btn primary" onClick=${() => fileRef.current && fileRef.current.click()}>Choose PDF / DOCX / TXT…</button><input ref=${fileRef} id="doc-files" type="file" multiple accept=".pdf,.docx,.txt" hidden onChange=${(e) => { addFiles(e.target.files); e.target.value = ""; }} /></div>
      </div>
      <details className="sub"><summary>Paste source text instead (for scanned documents or OCR output)</summary>
        <input id="paste-name" placeholder="Document name" value=${paste.name} onChange=${(e) => setPaste({ ...paste, name: e.target.value })} />
        <textarea id="paste-text" rows="6" placeholder="Paste text; blank lines separate citable paragraphs" value=${paste.text} onChange=${(e) => setPaste({ ...paste, text: e.target.value })}></textarea>
        <button type="button" className="btn" onClick=${addPaste}>Add pasted text</button>
      </details>
      ${(c.documents || []).map((d) => html`<${DocCard} key=${d.id} c=${c} d=${d} update=${update} openViewer=${openViewer} />`)}
      ${!(c.documents || []).length ? html`<p className="muted">No documents yet.</p>` : null}
    </section>`;
  }

  function DocCard({ c, d, update, openViewer }) {
    const [tx, setTx] = useState({ loc: "", text: "" });
    const empty = (d.units || []).filter((u) => (u.text || "").replace(/\s/g, "").length < 25);
    const st = d.extraction ? d.extraction.status : "unknown";
    return html`<article className="doc">
      <div className="doc-head">
        <div><b>${d.name}</b> <span className="muted">· ${d.kind.toUpperCase()} · ${(d.units || []).length} locations · ${N.fmtNum(d.extraction ? d.extraction.chars : 0)} characters</span></div>
        <div className="row gap"><${Badge} tone=${st === "ok" ? "ok" : st === "partial" ? "warn" : "crit"}>${st === "ok" ? "Text extracted" : st === "partial" ? "Partly extracted" : "Extraction unreliable"}</${Badge}>
          <button type="button" className="btn tiny" onClick=${() => openViewer({ doc: d.id, loc: (d.units[0] || {}).loc })}>View text</button>
          <${Confirm} label="Remove" confirmLabel="Remove this document from the case?" tone="tiny ghost" onConfirm=${() => update((x) => { x.documents = x.documents.filter((y) => y.id !== d.id); }, "Document removed", d.name)} /></div>
      </div>
      <div className="grid3">
        <select aria-label="Document role" value=${d.role} onChange=${(e) => update((x) => { x.documents.find((y) => y.id === d.id).role = e.target.value; }, "Document role changed", d.name + " → " + e.target.value)}>${N.DOC_ROLES.map((r) => html`<option key=${r}>${r}</option>`)}</select>
        <input aria-label="Version" value=${d.version || ""} placeholder="Version / date" onChange=${(e) => update((x) => { x.documents.find((y) => y.id === d.id).version = e.target.value; })} />
        <input aria-label="Short name" value=${d.shortName || ""} placeholder="Short name for citations" onChange=${(e) => update((x) => { x.documents.find((y) => y.id === d.id).shortName = e.target.value; })} />
      </div>
      ${d.role === "Reference report (format only)" ? html`<p className="hint">Format reference only: not evidence about this applicant, not current policy, and its scores are never reused.</p>` : null}
      ${((d.extraction && d.extraction.warnings) || []).map((w, i) => html`<div className="warnline" key=${i}>⚠ ${w}</div>`)}
      ${(d.injection || []).map((h, i) => html`<div className="warnline crit" key=${"i" + i}>Embedded instruction at ${h.loc}: “${h.excerpt}” — treated as untrusted data and ignored.</div>`)}
      ${empty.length ? html`<details className="sub"><summary>Add a transcription for a page with no text (${empty.length})</summary>
        <select aria-label="Location" value=${tx.loc} onChange=${(e) => setTx({ ...tx, loc: e.target.value })}><option value="">Choose location…</option>${empty.map((u) => html`<option key=${u.loc}>${u.loc}</option>`)}</select>
        <textarea rows="4" aria-label="Transcription" placeholder="Type exactly what the page says" value=${tx.text} onChange=${(e) => setTx({ ...tx, text: e.target.value })}></textarea>
        <button type="button" className="btn" onClick=${() => { if (!tx.loc || !tx.text.trim()) return; update((x) => { const dd = x.documents.find((y) => y.id === d.id); const u = dd.units.find((y) => y.loc === tx.loc); u.text = "[Advisor transcription] " + tx.text.trim(); u.manual = true; dd.extraction = N.assessExtraction(dd.units, dd.kind); dd.injection = N.detectInjection(dd.units); }, "Transcription added", d.name + " " + tx.loc); setTx({ loc: "", text: "" }); }}>Save transcription</button>
      </details>` : null}
    </article>`;
  }

  function Viewer({ c, v, onClose }) {
    const [docId, setDocId] = useState(v.doc || ((c.documents[0] || {}).id));
    const [q, setQ] = useState("");
    const ref = useRef(null);
    useEffect(() => { setDocId(v.doc || docId); }, [v]);
    const d = (c.documents || []).find((x) => x.id === docId);
    useEffect(() => {
      const el = ref.current && ref.current.querySelector("[data-hit='1']");
      if (el) el.scrollIntoView({ block: "center" });
    }, [docId, v]);
    const hl = (text, loc) => {
      const ex = v.excerpt && loc === v.loc ? v.excerpt : q;
      if (!ex || ex.length < 3) return text;
      const norm = (s) => s.replace(/\s+/g, " ");
      const t = norm(text), e = norm(ex);
      const i = t.toLowerCase().indexOf(e.toLowerCase().slice(0, 120));
      if (i < 0) return t;
      const len = Math.min(e.length, t.length - i);
      return html`${t.slice(0, i)}<mark>${t.slice(i, i + len)}</mark>${t.slice(i + len)}`;
    };
    const units = d ? d.units.filter((u) => !q || u.text.toLowerCase().includes(q.toLowerCase())) : [];
    return html`<aside className="viewer" aria-label="Evidence viewer">
      <div className="viewer-head">
        <b>Evidence viewer</b>
        <button type="button" className="x" aria-label="Close viewer" onClick=${onClose}>×</button>
      </div>
      <select aria-label="Document" value=${docId} onChange=${(e) => setDocId(e.target.value)}>${c.documents.map((x) => html`<option key=${x.id} value=${x.id}>${x.name}</option>`)}</select>
      <input aria-label="Search text" placeholder="Search this document" value=${q} onChange=${(e) => setQ(e.target.value)} />
      ${v.excerpt && v.doc === docId ? html`<div className="hint">Cited at ${v.loc}: “${N.trunc(v.excerpt, 140)}”</div>` : null}
      <div className="units" ref=${ref}>
        ${units.map((u) => html`<div className=${"unit" + (u.loc === v.loc && v.doc === docId ? " hit" : "")} data-hit=${u.loc === v.loc && v.doc === docId ? "1" : "0"} key=${u.loc}><div className="loc">${u.loc}${u.manual ? " · transcription" : ""}</div><div className="utext">${(u.text || "").trim() ? hl(u.text, u.loc) : html`<i className="muted">No text at this location.</i>`}</div></div>`)}
      </div>
    </aside>`;
  }

  // ───────────────────────── AI panel (sample capability, with manual fallback) ─────────────────────────
  function AiPanel({ c, update, caps, say, kind }) {
    const [ack, setAck] = useState(false);
    const [state, setState] = useState({ phase: "idle", text: "" });
    const [pasted, setPasted] = useState("");
    const ctl = useRef(null);
    const usable = N.hasUsableProposal(c) || c.synthetic;
    const built = useMemo(() => (kind === "facts" ? N.buildFactsPrompt(c) : N.buildAnalysisPrompt(c)), [c, kind]);
    const runId = (kind === "facts" ? "facts-" : "analysis-") + new Date().toISOString().slice(0, 16);
    function apply(res, how) {
      update((x) => {
        const r = kind === "facts" ? N.applyFactsResult(x, res, runId) : N.applyAnalysisResult(x, res, runId);
        x.analysisRuns.push({ at: new Date().toISOString(), kind: kind + " (" + how + ")", ok: true, runId, verified: r.verified, unverified: r.unverified, omitted: built.omitted.length });
      });
      say(kind === "facts" ? "Facts drafted. Review and confirm each field; citations marked “excerpt not found” need checking." : "Analysis drafted. Review findings, scores and compliance; nothing is final until you confirm it.");
    }
    async function run() {
      if (!caps.sample) return;
      ctl.current = new AbortController();
      setState({ phase: "thinking", text: "" });
      try {
        const res = await caps.sample.json(built.prompt, { modelTier: kind === "facts" ? "default" : "complex", signal: ctl.current.signal, onText: ({ text }) => setState({ phase: "writing", text }) });
        apply(res, "Claude via artifact");
        setState({ phase: "done", text: "" });
      } catch (e) {
        const map = { cancelled: "Stopped.", not_granted: "Claude was not allowed for this page. Use the manual route below.", rate_limited: "Too many requests or usage limit reached. Try again later.", prompt_too_large: "The documents are too large for one request. Remove non-essential documents or paste a shorter extract.", invalid_json: "Claude's answer could not be read as JSON. Press Run again or use the manual route.", refused: "Claude declined this request.", sampling_disabled: "Claude is not available for this account." };
        setState({ phase: "error", text: map[e.code] || "Analysis failed (" + (e.code || e.message || "error") + ")." });
        update((x) => { x.analysisRuns.push({ at: new Date().toISOString(), kind, ok: false, error: e.code || String(e) }); });
      }
    }
    function applyPasted() {
      try { const s = pasted.trim().replace(/^```(?:json)?/, "").replace(/```$/, ""); apply(JSON.parse(s), "pasted by advisor"); setPasted(""); }
      catch (e) { say("That is not valid JSON: " + e.message, "crit"); }
    }
    async function copy() {
      try { await navigator.clipboard.writeText(built.prompt); say("Prompt copied."); }
      catch (e) { say("Copy was blocked. Select the prompt text below and copy it manually.", "warn"); }
    }
    if (!usable) return html`<div className="ai off"><b>${kind === "facts" ? "Extract facts" : "Analyse proposal"}</b><p className="muted">Add a proposal document with usable text first.</p></div>`;
    return html`<div className="ai">
      <div className="row between"><b>${kind === "facts" ? "Draft facts with Claude" : "Draft analysis with Claude"}</b><span className="muted">${N.fmtNum(built.prompt.length)} characters · ${caps.sample ? "Claude available" : "Claude not available in this view"}</span></div>
      ${built.omitted.length ? html`<div className="warnline crit">Not all text fits one request: ${built.omitted.length} location(s) omitted (${N.trunc(built.omitted.join(", "), 200)}). Remove non-essential documents or analyse in parts.</div>` : null}
      <label className="check"><input type="checkbox" checked=${ack} onChange=${(e) => setAck(e.target.checked)} /> Send the text of the case's proposal${kind === "analysis" ? ", policy and verification" : ""} documents to Claude under my account.</label>
      ${!c.meta.confidentialityAck ? html`<div className="warnline">Tick the confidentiality acknowledgement in A. Case first.</div>` : null}
      <div className="row gap">
        ${caps.sample ? html`<button type="button" className="btn primary" disabled=${!ack || !c.meta.confidentialityAck || state.phase === "thinking" || state.phase === "writing"} onClick=${run}>${kind === "facts" ? "Extract facts" : "Run analysis"}</button>` : null}
        ${state.phase === "thinking" || state.phase === "writing" ? html`<button type="button" className="btn ghost" onClick=${() => ctl.current && ctl.current.abort()}>Stop</button>` : null}
        <span className="muted" role="status">${state.phase === "thinking" ? "Thinking… (long proposals can take a minute or two)" : state.phase === "writing" ? "Receiving answer… " + N.fmtNum(state.text.length) + " characters" : state.phase === "error" ? state.text : ""}</span>
      </div>
      <details className="sub"><summary>Manual route: copy the prompt, run it in a Claude chat, paste the JSON answer</summary>
        <div className="row gap"><button type="button" className="btn tiny" disabled=${!ack || !c.meta.confidentialityAck} onClick=${copy}>Copy prompt</button></div>
        ${ack && c.meta.confidentialityAck ? html`<textarea readOnly rows="4" aria-label="Prompt" value=${N.trunc(built.prompt, 4000) + (built.prompt.length > 4000 ? "\n…[truncated in this preview; Copy prompt copies all]" : "")}></textarea>` : null}
        <textarea rows="5" aria-label="Paste JSON answer" placeholder="Paste Claude's JSON answer here" value=${pasted} onChange=${(e) => setPasted(e.target.value)}></textarea>
        <button type="button" className="btn" disabled=${!pasted.trim()} onClick=${applyPasted}>Apply pasted answer</button>
      </details>
      <p className="hint">Every quoted excerpt is checked against the document text. Advisor-confirmed facts are never overwritten. Instructions inside applicant documents are treated as data.</p>
    </div>`;
  }

  // ───────────────────────── C. Facts ─────────────────────────
  function StageFacts({ c, update, caps, say, openViewer }) {
    const conflicts = N.factConflicts(c);
    const pt = N.perTrainee(N.factNumber(c, "totalCost"), N.factNumber(c, "publicFunding"), N.factNumber(c, "trainees"));
    return html`<section className="panel">
      <h2>C. Confirm extracted facts</h2>
      <${AiPanel} c=${c} update=${update} caps=${caps} say=${say} kind="facts" />
      ${conflicts.length ? html`<${Banner} tone="warn">${conflicts.length} field(s) carry conflicting statements. Both values are kept with citations; the applicant's figures are never repaired.</${Banner}>` : null}
      <div className="calcstrip">
        <div><span className="lbl">Recalculated total cost per trainee</span><span className="num">${N.fmtINR(pt.total)}</span></div>
        <div><span className="lbl">Recalculated public funding per trainee</span><span className="num">${N.fmtINR(pt.public)}</span></div>
        <div className="muted small">${pt.note}</div>
      </div>
      <div className="tablewrap"><table className="facts">
        <thead><tr><th>Field</th><th>Value(s) and source</th><th>Advisor</th></tr></thead>
        <tbody>${N.FACT_FIELDS.map(([k, label]) => html`<${FactRow} key=${k} c=${c} k=${k} label=${label} update=${update} openViewer=${openViewer} conflict=${conflicts.some((x) => x.key === k)} />`)}</tbody>
      </table></div>
      ${(c.factsExtra || []).length ? html`<h3>Other repeated statements</h3><div className="tablewrap"><table className="facts"><tbody>${c.factsExtra.map((fx) => html`<tr key=${fx.id}><th scope="row">${fx.label}</th><td>${fx.values.map((v, i) => html`<div key=${i} className="val">${v.value} <${Cite} c=${c} e=${v.cite} onOpen=${openViewer} /></div>`)}</td><td>${new Set(fx.values.map((v) => String(v.value).toLowerCase())).size > 1 ? html`<${Badge} tone="warn">Conflicting</${Badge}>` : ""}</td></tr>`)}</tbody></table></div>` : null}
    </section>`;
  }

  function FactRow({ c, k, label, update, openViewer, conflict }) {
    const f = c.facts[k] || { values: [] };
    const [add, setAdd] = useState(null);
    const docs = c.documents.filter((d) => N.PROPOSAL_ROLES.includes(d.role));
    function saveAdd() {
      if (!add.value.trim()) return;
      update((x) => {
        const cite = add.doc ? { doc: add.doc, loc: add.loc, excerpt: add.excerpt } : null;
        if (cite) { const r = N.verifyExcerpt(x, cite); cite.verified = r.verified; if (r.loc) cite.loc = r.loc; }
        (x.facts[k] = x.facts[k] || { values: [] }).values.push({ value: add.value.trim(), cite, origin: "advisor" });
      }, "Fact value added", label + ": " + add.value);
      setAdd(null);
    }
    return html`<tr className=${conflict ? "conflict" : ""}>
      <th scope="row">${label}${conflict ? html`<div><${Badge} tone="warn">Conflicting statements</${Badge}></div>` : null}</th>
      <td>
        ${f.values.length ? f.values.map((v, i) => html`<div className="val" key=${i}>${v.value} ${v.cite ? html`<${Cite} c=${c} e=${v.cite} onOpen=${openViewer} />` : html`<${Badge} tone="warn">No citation</${Badge}>`} <span className="muted small">${v.origin === "ai" ? "AI draft" : v.origin === "session" ? "Session draft" : "Advisor"}</span> <button type="button" className="btn tiny ghost" aria-label="Remove value" onClick=${() => update((x) => { x.facts[k].values.splice(i, 1); }, "Fact value removed", label + ": " + v.value)}>×</button></div>`) : html`<span className="muted">Not stated</span>`}
        ${f.note ? html`<div className="hint">${f.note}</div>` : null}
        ${add ? html`<div className="addform">
          <input aria-label="Value" placeholder="Value as written" value=${add.value} onChange=${(e) => setAdd({ ...add, value: e.target.value })} />
          <select aria-label="Source document" value=${add.doc} onChange=${(e) => setAdd({ ...add, doc: e.target.value })}><option value="">No source (advisor note)</option>${docs.map((d) => html`<option key=${d.id} value=${d.id}>${d.shortName || d.name}</option>`)}</select>
          <input aria-label="Location" placeholder="Location e.g. p.8" value=${add.loc} onChange=${(e) => setAdd({ ...add, loc: e.target.value })} />
          <input aria-label="Excerpt" placeholder="Exact excerpt" value=${add.excerpt} onChange=${(e) => setAdd({ ...add, excerpt: e.target.value })} />
          <button type="button" className="btn tiny" onClick=${saveAdd}>Add</button><button type="button" className="btn tiny ghost" onClick=${() => setAdd(null)}>Cancel</button></div>` : null}
      </td>
      <td className="nowrap">
        <label className="check small"><input type="checkbox" checked=${!!f.confirmed} onChange=${(e) => update((x) => { x.facts[k] = x.facts[k] || { values: [] }; x.facts[k].confirmed = e.target.checked; }, e.target.checked ? "Fact confirmed" : "Fact unconfirmed", label)} /> Confirmed</label>
        <label className="check small" title="Values describe different things (e.g. sequential phases), not a conflict"><input type="checkbox" checked=${!!f.complementary} onChange=${(e) => update((x) => { x.facts[k] = x.facts[k] || { values: [] }; x.facts[k].complementary = e.target.checked; }, "Fact marked " + (e.target.checked ? "complementary" : "conflicting"), label)} /> Not a conflict</label>
        ${!add ? html`<button type="button" className="btn tiny" onClick=${() => setAdd({ value: "", doc: docs[0] ? docs[0].id : "", loc: "", excerpt: "" })}>Add value</button>` : null}
        <input className="note" aria-label="Note" placeholder="Note" value=${f.note || ""} onChange=${(e) => update((x) => { x.facts[k] = x.facts[k] || { values: [] }; x.facts[k].note = e.target.value; })} />
      </td>
    </tr>`;
  }

  // ───────────────────────── D. Analyse ─────────────────────────
  function StageAnalyse(ctx) {
    const { c, update, caps, say } = ctx;
    return html`<section className="panel">
      <h2>D. Analyse proposal</h2>
      <p className="hint">Arithmetic is computed by the workbench, not by the language model. Enter figures exactly as the applicant states them; results show applicant figure → formula → result → discrepancy.</p>
      <${BudgetPanel} ...${ctx} />
      <${FundingPanel} ...${ctx} />
      <${ChecksPanel} ...${ctx} />
      <h3>AI analysis</h3>
      <${AiPanel} c=${c} update=${update} caps=${caps} say=${say} kind="analysis" />
      ${(c.analysisRuns || []).length ? html`<details className="sub"><summary>Analysis runs (${c.analysisRuns.length})</summary><ul className="small">${c.analysisRuns.map((r, i) => html`<li key=${i}>${String(r.at).slice(0, 16).replace("T", " ")} — ${r.kind} — ${r.ok ? "ok" : "failed: " + r.error}${r.verified !== undefined ? " — " + r.verified + " citations verified, " + r.unverified + " not found" : ""}</li>`)}</ul></details>` : null}
    </section>`;
  }

  function parsePastedBudget(text) {
    const rows = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.replace(/\|/g, " ").trim();
      if (!line) continue;
      const nums = line.match(/(?:₹\s*)?\d[\d,]*(?:\.\d+)?/g) || [];
      if (nums.length < 2) continue;
      let label = line;
      const firstNumAt = line.search(/(?:₹\s*)?\d[\d,]*(?:\.\d+)?\s+(?:₹\s*)?\d/);
      const lead = /^\s*\d{1,3}\s+/.exec(line);
      label = line.slice(lead ? lead[0].length : 0, firstNumAt > 0 ? firstNumAt : undefined).trim();
      const vals = nums.slice(lead ? 1 : 0);
      if (vals.length >= 4) rows.push({ label, qty: vals[0], unit: vals[1], freq: vals[2], stated: vals[vals.length - 1] });
      else if (vals.length === 3) rows.push({ label, qty: vals[0], unit: vals[1], freq: 1, stated: vals[2] });
      else rows.push({ label, qty: 1, unit: vals[0], freq: 1, stated: vals[vals.length - 1] });
    }
    return rows;
  }

  function BudgetPanel({ c, update }) {
    const a = useMemo(() => N.analyseBudget(c.budget), [c.budget]);
    const [paste, setPaste] = useState("");
    const setLine = (i, k, v) => update((x) => { x.budget.lines[i][k] = v; });
    const setSub = (i, k, v) => update((x) => { x.budget.subtotals[i][k] = v; });
    return html`<details className="sub" open=${(c.budget.lines || []).length > 0}>
      <summary>Itemised budget — ${a.lines.length} lines · ${a.issues.length ? a.issues.length + " discrepancy(ies)" : a.lines.length ? "no arithmetic discrepancies" : "not entered"}</summary>
      <div className="tablewrap"><table className="grid">
        <thead><tr><th>Line</th><th>Group</th><th>Qty</th><th>Unit ₹</th><th>Freq.</th><th>Stated ₹</th><th>Computed ₹</th><th>Result</th><th></th></tr></thead>
        <tbody>${a.lines.map((l, i) => html`<tr key=${l.id}>
          <td><input aria-label="Line label" value=${l.label} onChange=${(e) => setLine(i, "label", e.target.value)} /></td>
          <td><input className="s" aria-label="Group" value=${l.group || ""} onChange=${(e) => setLine(i, "group", e.target.value)} /></td>
          <td><input className="n" aria-label="Quantity" value=${l.qty} onChange=${(e) => setLine(i, "qty", e.target.value)} /></td>
          <td><input className="n" aria-label="Unit cost" value=${l.unit} onChange=${(e) => setLine(i, "unit", e.target.value)} /></td>
          <td><input className="s" aria-label="Frequency" value=${l.freq} onChange=${(e) => setLine(i, "freq", e.target.value)} /></td>
          <td><input className="n" aria-label="Stated total" value=${l.stated} onChange=${(e) => setLine(i, "stated", e.target.value)} /></td>
          <td className="num">${N.fmtNum(l.computed)}</td>
          <td><${Badge} tone=${l.status === "Consistent" ? "ok" : l.status === "Arithmetic discrepancy" ? "crit" : "warn"}>${l.status}${l.diff ? " " + N.fmtNum(l.diff) : ""}</${Badge}></td>
          <td><button type="button" className="btn tiny ghost" aria-label="Delete line" onClick=${() => update((x) => { x.budget.lines.splice(i, 1); }, "Budget line removed", l.label)}>×</button></td></tr>`)}
        ${a.subtotals.map((s, i) => html`<tr key=${s.id} className="subrow">
          <td><input aria-label="Total label" value=${s.label} onChange=${(e) => setSub(i, "label", e.target.value)} /></td>
          <td colSpan="4"><input aria-label="Sums groups/totals" title="Comma-separated groups or total ids to add" value=${(s.sumOf || []).join(", ")} onChange=${(e) => setSub(i, "sumOf", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /> <span className="muted small">id: ${s.id}${(s.extra || []).length ? " · plus " + s.extra.map((x) => x.label + " " + x.amount).join(", ") : ""}</span></td>
          <td><input className="n" aria-label="Stated total" value=${s.stated} onChange=${(e) => setSub(i, "stated", e.target.value)} /></td>
          <td className="num">${N.fmtNum(s.computed)}</td>
          <td><${Badge} tone=${s.status === "Consistent" ? "ok" : s.status === "Arithmetic discrepancy" ? "crit" : "warn"}>${s.status}${s.diff ? " " + N.fmtNum(s.diff) : ""}</${Badge}></td>
          <td><button type="button" className="btn tiny ghost" aria-label="Delete total" onClick=${() => update((x) => { x.budget.subtotals.splice(i, 1); }, "Budget total removed", s.label)}>×</button></td></tr>`)}
        </tbody></table></div>
      <div className="row gap">
        <button type="button" className="btn tiny" onClick=${() => update((x) => { x.budget.lines.push({ id: N.uid("b"), label: "", qty: "", unit: "", freq: 1, stated: "", group: "A" }); })}>Add line</button>
        <button type="button" className="btn tiny" onClick=${() => update((x) => { x.budget.subtotals.push({ id: N.uid("s"), label: "Subtotal", stated: "", sumOf: ["A"] }); })}>Add subtotal/total</button>
      </div>
      <details className="sub"><summary>Paste budget rows (label, qty, unit, frequency, total)</summary>
        <textarea rows="5" aria-label="Budget rows" value=${paste} onChange=${(e) => setPaste(e.target.value)} placeholder="1 Content and Kit 350 2,200 1 7,70,000"></textarea>
        <button type="button" className="btn tiny" onClick=${() => { const rows = parsePastedBudget(paste); update((x) => { rows.forEach((r) => x.budget.lines.push({ id: N.uid("b"), group: "A", ...r })); }, "Budget rows pasted", rows.length + " rows"); setPaste(""); }}>Add rows</button>
        <p className="hint">Check each parsed row against the source; group lines (e.g. A, B) and add totals that sum the groups.</p>
      </details>
    </details>`;
  }

  function FundingPanel({ c, update }) {
    const f = useMemo(() => N.analyseFunding(c.funding), [c.funding]);
    return html`<details className="sub" open=${(c.funding.sources || []).length > 0}>
      <summary>Funding and release schedule — ${f.issues.length ? f.issues.length + " issue(s)" : "no issues found"}</summary>
      <div className="grid3"><${Field} id="fund-total" label="Total project cost (₹, as stated)"><input id="fund-total" value=${c.funding.total} onChange=${(e) => update((x) => { x.funding.total = e.target.value; })} /></${Field}></div>
      <div className="tablewrap"><table className="grid"><thead><tr><th>Source</th><th>Amount ₹</th><th>Stated %</th><th>Public?</th><th>Commitment status</th><th>Calculated %</th><th></th></tr></thead>
      <tbody>${f.sources.map((s, i) => html`<tr key=${i}>
        <td><input aria-label="Source" value=${s.name} onChange=${(e) => update((x) => { x.funding.sources[i].name = e.target.value; })} /></td>
        <td><input className="n" aria-label="Amount" value=${s.amount} onChange=${(e) => update((x) => { x.funding.sources[i].amount = e.target.value; })} /></td>
        <td><input className="s" aria-label="Stated percent" value=${s.statedPct} onChange=${(e) => update((x) => { x.funding.sources[i].statedPct = e.target.value; })} /></td>
        <td><input type="checkbox" aria-label="Public funding" checked=${!!s.isPublic} onChange=${(e) => update((x) => { x.funding.sources[i].isPublic = e.target.checked; })} /></td>
        <td><input aria-label="Commitment" value=${s.commitment || ""} onChange=${(e) => update((x) => { x.funding.sources[i].commitment = e.target.value; })} /></td>
        <td className="num">${s.calcPct === null ? "—" : s.calcPct.toFixed(2) + "%"} ${s.status !== "—" ? html`<${Badge} tone=${s.status === "Consistent" ? "ok" : "crit"}>${s.status}</${Badge}>` : null}</td>
        <td><button type="button" className="btn tiny ghost" aria-label="Delete source" onClick=${() => update((x) => { x.funding.sources.splice(i, 1); })}>×</button></td></tr>`)}</tbody></table></div>
      <div className="calcstrip"><div><span className="lbl">Sources total</span><span className="num">${N.fmtINR(f.sourceSum)}</span></div><div><span className="lbl">Gap to total cost</span><span className="num">${f.reconDiff === null ? "—" : N.fmtINR(f.reconDiff)}</span></div><div><span className="lbl">Public funding</span><span className="num">${N.fmtINR(f.publicSum)}</span></div></div>
      <button type="button" className="btn tiny" onClick=${() => update((x) => { x.funding.sources.push({ name: "", amount: "", statedPct: "", isPublic: false, commitment: "" }); })}>Add funding source</button>
      <h4>Release schedule (tranches)</h4>
      <div className="tablewrap"><table className="grid"><thead><tr><th>Funder (must match a source)</th><th>Tranche</th><th>Amount ₹</th><th>Stated % of funder share</th><th>Milestone</th><th>Check</th><th></th></tr></thead>
      <tbody>${(c.funding.tranches || []).map((t, i) => {
        const r = f.tranches.filter((x) => !x.summary)[i] || {};
        return html`<tr key=${i}>
        <td><input aria-label="Funder" value=${t.funder} onChange=${(e) => update((x) => { x.funding.tranches[i].funder = e.target.value; })} /></td>
        <td><input aria-label="Tranche" value=${t.label} onChange=${(e) => update((x) => { x.funding.tranches[i].label = e.target.value; })} /></td>
        <td><input className="n" aria-label="Amount" value=${t.amount} onChange=${(e) => update((x) => { x.funding.tranches[i].amount = e.target.value; })} /></td>
        <td><input className="s" aria-label="Percent" value=${t.statedPct} onChange=${(e) => update((x) => { x.funding.tranches[i].statedPct = e.target.value; })} /></td>
        <td><input aria-label="Milestone" value=${t.milestone || ""} onChange=${(e) => update((x) => { x.funding.tranches[i].milestone = e.target.value; })} /></td>
        <td>${r.status && r.status !== "—" ? html`<${Badge} tone=${r.status === "Consistent" ? "ok" : "crit"}>${r.status}${r.expectedFromPct !== null && r.status !== "Consistent" ? " (expected " + N.fmtINR(r.expectedFromPct) + ")" : ""}</${Badge}>` : "—"}</td>
        <td><button type="button" className="btn tiny ghost" aria-label="Delete tranche" onClick=${() => update((x) => { x.funding.tranches.splice(i, 1); })}>×</button></td></tr>`;
      })}</tbody></table></div>
      <button type="button" className="btn tiny" onClick=${() => update((x) => { x.funding.tranches = x.funding.tranches || []; x.funding.tranches.push({ funder: (x.funding.sources[0] || {}).name || "", label: "", amount: "", statedPct: "", milestone: "" }); })}>Add tranche</button>
      ${f.issues.map((i, k) => html`<div className="warnline crit" key=${k}>${i.type}: ${i.detail}</div>`)}
    </details>`;
  }

  function ChecksPanel({ c, update }) {
    const parseInputs = (s) => { const o = {}; String(s).split(",").forEach((p) => { const m = /^\s*([A-Za-z_]\w*)\s*=\s*(.+)\s*$/.exec(p); if (m) o[m[1]] = N.parseINR(m[2]); }); return o; };
    const showInputs = (o) => Object.entries(o || {}).map(([k, v]) => k + "=" + v).join(", ");
    return html`<details className="sub" open=${(c.checks || []).length > 0}>
      <summary>Arithmetic and consistency checks — ${(c.checks || []).length}</summary>
      <p className="hint">Formulas accept numbers, named inputs, + − × ÷ and brackets. Example: 13 × 2 × 50 against the applicant's 1,000 target. No tax, calendar or utilisation assumptions are added unless you enter them and say so in the label.</p>
      <div className="tablewrap"><table className="grid"><thead><tr><th>Check</th><th>Type</th><th>Applicant figure</th><th>Formula</th><th>Inputs</th><th>Calculated</th><th>Result</th><th></th></tr></thead>
      <tbody>${(c.checks || []).map((ch, i) => {
        const r = N.runCheck(ch);
        return html`<tr key=${ch.id}>
          <td><input aria-label="Check label" value=${ch.label} onChange=${(e) => update((x) => { x.checks[i].label = e.target.value; })} /></td>
          <td><select aria-label="Type" value=${ch.kind} onChange=${(e) => update((x) => { x.checks[i].kind = e.target.value; })}><option value="arithmetic">Arithmetic</option><option value="consistency">Consistency</option><option value="derived">Evaluator derivation</option></select></td>
          <td><input className="n" aria-label="Applicant figure" value=${ch.applicant} onChange=${(e) => update((x) => { x.checks[i].applicant = e.target.value; })} /></td>
          <td><input aria-label="Formula" value=${ch.formula} onChange=${(e) => update((x) => { x.checks[i].formula = e.target.value; })} /></td>
          <td><input aria-label="Inputs" value=${showInputs(ch.inputs)} onChange=${(e) => update((x) => { x.checks[i].inputs = parseInputs(e.target.value); })} placeholder="a=1, b=2" /></td>
          <td className="num">${r.computed === null ? "—" : N.fmtNum(r.computed)}</td>
          <td><${Badge} tone=${r.verdict === "Consistent" ? "ok" : r.verdict === "Evaluator calculation" ? "" : "crit"}>${r.verdict}${r.discrepancy ? " " + N.fmtNum(r.discrepancy) : ""}${r.error ? ": " + r.error : ""}</${Badge}></td>
          <td><button type="button" className="btn tiny ghost" aria-label="Delete check" onClick=${() => update((x) => { x.checks.splice(i, 1); }, "Check removed", ch.label)}>×</button></td></tr>`;
      })}</tbody></table></div>
      <button type="button" className="btn tiny" onClick=${() => update((x) => { x.checks.push({ id: N.uid("k"), label: "", kind: "arithmetic", applicant: "", formula: "", inputs: {} }); })}>Add check</button>
    </details>`;
  }

  // ───────────────────────── E. Findings & scores ─────────────────────────
  function StageReview(ctx) {
    const { c } = ctx;
    if (!N.hasUsableProposal(c) && !c.synthetic) return html`<section className="panel"><h2>E. Findings & scores</h2><p className="muted">Scoring and findings are disabled until a proposal with usable text is on file.</p></section>`;
    return html`<section className="panel"><h2>E. Findings & scores</h2>
      <${Findings} ...${ctx} />
      <${Scores} ...${ctx} />
      <${Compliance} ...${ctx} />
    </section>`;
  }

  function Findings({ c, update, openViewer }) {
    const [flt, setFlt] = useState({ kind: "weakness", sev: "", stage: "", status: "", label: "" });
    const [open, setOpen] = useState(null);
    const list = (c.findings || []).filter((f) => (!flt.kind || f.kind === flt.kind) && (!flt.sev || f.severity === flt.sev) && (!flt.stage || f.actionStage === flt.stage) && (!flt.status || f.status === flt.status) && (!flt.label || f.label === flt.label));
    const unsupported = N.unsupportedClaims(c);
    const sel = (k, opts, label) => html`<select aria-label=${label} value=${flt[k]} onChange=${(e) => setFlt({ ...flt, [k]: e.target.value })}><option value="">${label}: all</option>${opts.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}</select>`;
    function addFinding() {
      const id = N.uid("F");
      update((x) => { x.findings.push({ id, kind: "weakness", area: N.ASSESS_AREAS[0], title: "New finding", detail: "", label: "Evaluator judgment", severity: "Minor", evidence: [], impact: "", action: "", party: "Applicant", actionStage: "Before shortlisting/approval", basis: "Advisory safeguard", closureEvidence: "", status: c.meta.stage === "Revised" ? "New finding" : "Open", origin: "advisor" }); }, "Finding added", id);
      setOpen(id);
    }
    return html`<div className="sub">
      <h3>Findings</h3>
      ${unsupported.length ? html`<div className="warnline">Unsupported claims: ${unsupported.length} applicant claim(s) have no source excerpt.</div>` : null}
      <div className="filters">${sel("kind", ["weakness", "strength"], "Type")}${sel("sev", N.SEVERITIES, "Severity")}${sel("stage", N.ACTION_STAGES, "Stage")}${sel("status", N.FINDING_STATUS, "Status")}${sel("label", N.EVIDENCE_LABELS, "Evidence")}<button type="button" className="btn tiny" onClick=${addFinding}>Add finding</button></div>
      <div className="tablewrap"><table className="list">
        <thead><tr><th>Finding</th><th>Severity</th><th>Evidence label</th><th>Stage</th><th>Status</th></tr></thead>
        <tbody>${list.map((f) => html`<${React.Fragment} key=${f.id}>
          <tr className=${"clickable sev-" + f.severity.toLowerCase()} onClick=${() => setOpen(open === f.id ? null : f.id)} tabIndex="0" onKeyDown=${(e) => { if (e.key === "Enter") setOpen(open === f.id ? null : f.id); }}>
            <td><b>${f.title}</b><div className="muted small">${f.area}</div><div>${(f.evidence || []).slice(0, 3).map((e, i) => html`<${Cite} key=${i} c=${c} e=${e} onOpen=${openViewer} />`)}</div></td>
            <td><${Badge} tone=${f.severity === "Critical" ? "crit" : f.severity === "Major" ? "warn" : ""}>${f.severity}</${Badge}></td>
            <td className="small">${f.label}${f.label === "Applicant claim" && !(f.evidence || []).length ? html` <${Badge} tone="warn">Unsupported</${Badge}>` : null}</td>
            <td className="small">${f.actionStage}</td>
            <td className="small">${f.status}${f.suggestedStatus ? html`<div className="muted">AI suggests: ${f.suggestedStatus}</div>` : null}</td>
          </tr>
          ${open === f.id ? html`<tr className="editrow"><td colSpan="5"><${FindingEditor} c=${c} f=${f} update=${update} /></td></tr>` : null}
        </${React.Fragment}>`)}</tbody></table></div>
      ${!list.length ? html`<p className="muted">No findings match these filters.</p>` : null}
    </div>`;
  }

  function FindingEditor({ c, f, update }) {
    const idx = c.findings.findIndex((x) => x.id === f.id);
    const set = (k) => (e) => {
      const v = e.target.value;
      if (k === "status" && v === "Closed" && !String(f.closureEvidence || "").trim()) return; // guarded below
      update((x) => { x.findings[idx][k] = v; }, k === "status" || k === "severity" ? "Finding " + k + " changed" : null, f.id + " " + k + " → " + v);
    };
    const errs = N.validateFinding(f);
    const [ev, setEv] = useState({ doc: (c.documents[0] || {}).id || "", loc: "", excerpt: "" });
    return html`<div className="editor">
      <div className="grid2">
        <${Field} id=${"ft-" + f.id} label="Title" wide=${true}><input id=${"ft-" + f.id} value=${f.title} onChange=${set("title")} /></${Field}>
        <${Field} id=${"fd-" + f.id} label="Finding detail" wide=${true}><textarea id=${"fd-" + f.id} rows="3" value=${f.detail} onChange=${set("detail")}></textarea></${Field}>
        <${Field} id=${"fk-" + f.id} label="Type"><select id=${"fk-" + f.id} value=${f.kind} onChange=${set("kind")}><option value="weakness">Weakness / issue</option><option value="strength">Strength</option></select></${Field}>
        <${Field} id=${"fa-" + f.id} label="Area"><select id=${"fa-" + f.id} value=${f.area} onChange=${set("area")}>${N.ASSESS_AREAS.map((a) => html`<option key=${a}>${a}</option>`)}</select></${Field}>
        <${Field} id=${"fl-" + f.id} label="Evidence label"><select id=${"fl-" + f.id} value=${f.label} onChange=${set("label")}>${N.EVIDENCE_LABELS.map((a) => html`<option key=${a}>${a}</option>`)}</select></${Field}>
        <${Field} id=${"fs-" + f.id} label="Severity"><select id=${"fs-" + f.id} value=${f.severity} onChange=${set("severity")}>${N.SEVERITIES.map((a) => html`<option key=${a}>${a}</option>`)}</select></${Field}>
        <${Field} id=${"fi-" + f.id} label="Impact" wide=${true}><input id=${"fi-" + f.id} value=${f.impact} onChange=${set("impact")} /></${Field}>
        <${Field} id=${"fx-" + f.id} label="Exact submission / correction needed" wide=${true}><textarea id=${"fx-" + f.id} rows="2" value=${f.action} onChange=${set("action")}></textarea></${Field}>
        <${Field} id=${"fp-" + f.id} label="Responsible party"><input id=${"fp-" + f.id} value=${f.party} onChange=${set("party")} /></${Field}>
        <${Field} id=${"fg-" + f.id} label="Required stage"><select id=${"fg-" + f.id} value=${f.actionStage} onChange=${set("actionStage")}>${N.ACTION_STAGES.map((a) => html`<option key=${a}>${a}</option>`)}</select></${Field}>
        <${Field} id=${"fb-" + f.id} label="Basis"><select id=${"fb-" + f.id} value=${f.basis} onChange=${set("basis")}><option>Policy</option><option>Historical benchmark</option><option>Advisory safeguard</option><option value="">—</option></select></${Field}>
        <${Field} id=${"fc-" + f.id} label="Closure evidence (required to close)" wide=${true}><input id=${"fc-" + f.id} value=${f.closureEvidence} onChange=${set("closureEvidence")} placeholder="e.g. Revised proposal v2 p.8 corrected tranche table" /></${Field}>
        <${Field} id=${"fst-" + f.id} label="Status" hint=${!String(f.closureEvidence || "").trim() ? "Enter closure evidence before choosing Closed." : ""}><select id=${"fst-" + f.id} value=${f.status} onChange=${set("status")}>${N.FINDING_STATUS.map((a) => html`<option key=${a} disabled=${a === "Closed" && !String(f.closureEvidence || "").trim()}>${a}</option>`)}</select></${Field}>
      </div>
      <div className="sub"><b>Evidence</b>
        ${(f.evidence || []).map((e, i) => html`<div className="val" key=${i}>${e.loc} “${N.trunc(e.excerpt, 160)}” ${e.verified === false ? html`<${Badge} tone="crit">Excerpt not found</${Badge}>` : html`<${Badge} tone="ok">Found in source</${Badge}>`} <button type="button" className="btn tiny ghost" aria-label="Remove evidence" onClick=${() => update((x) => { x.findings[idx].evidence.splice(i, 1); })}>×</button></div>`)}
        <div className="addform">
          <select aria-label="Document" value=${ev.doc} onChange=${(e) => setEv({ ...ev, doc: e.target.value })}>${c.documents.map((d) => html`<option key=${d.id} value=${d.id}>${d.shortName || d.name}</option>`)}</select>
          <input aria-label="Location" placeholder="p.8" value=${ev.loc} onChange=${(e) => setEv({ ...ev, loc: e.target.value })} />
          <input aria-label="Excerpt" placeholder="Exact excerpt" value=${ev.excerpt} onChange=${(e) => setEv({ ...ev, excerpt: e.target.value })} />
          <button type="button" className="btn tiny" onClick=${() => { if (!ev.excerpt.trim()) return; update((x) => { const r = N.verifyExcerpt(x, ev); x.findings[idx].evidence.push({ ...ev, loc: r.loc || ev.loc, verified: r.verified }); }, "Evidence added", f.id); setEv({ ...ev, loc: "", excerpt: "" }); }}>Add evidence</button>
        </div>
      </div>
      ${errs.length ? html`<div className="warnline">${errs.join(" ")}</div>` : null}
      <div className="row between"><span className="muted small">Origin: ${f.origin === "ai" ? "AI draft" : f.origin === "session" ? "Claude session draft" : f.origin === "prior" ? "Earlier review" : "Advisor"}</span>
      <${Confirm} label="Delete finding" confirmLabel="Delete this finding?" tone="tiny ghost" onConfirm=${() => update((x) => { x.findings.splice(idx, 1); }, "Finding deleted", f.title)} /></div>
    </div>`;
  }

  function Scores({ c, update, say, openViewer }) {
    const comp = N.composite(c.scores, c.policy.compositeOverride);
    return html`<div className="sub">
      <h3>Section A scores</h3>
      <div className="anchors small">${Object.entries(N.ANCHORS).map(([k, v]) => html`<span key=${k}><b>${k}</b> ${v}</span>`)}</div>
      <div className="scores">${N.CRITERIA.map((cr) => html`<${ScoreCard} key=${cr.id} c=${c} cr=${cr} update=${update} say=${say} openViewer=${openViewer} />`)}</div>
      <div className=${"composite " + (comp.withheld ? "withheld" : "")}><span className="lbl">Composite (${comp.method})</span><span className="num big">${comp.withheld ? "Withheld" : comp.value.toFixed(2)}</span><span className="small">${comp.withheld ? comp.display + (comp.missing.length ? ": " + comp.missing.join(", ") : "") : "out of 5.00 — one input to the recommendation, not an approval threshold."}</span></div>
    </div>`;
  }

  function ScoreCard({ c, cr, update, say, openViewer }) {
    const e = c.scores[cr.id] || {};
    const [draft, setDraft] = useState({ score: e.human ? String(e.human.score) : "", rationale: e.human ? e.human.rationale : "", reason: e.human ? e.human.reason : "" });
    const eff = N.effectiveScore(e);
    function apply() {
      const val = draft.score === "" ? null : Number(draft.score);
      const probe = N.setHumanScore(clone(c), cr.id, val, draft.rationale, draft.reason, N.ADVISOR);
      if (!probe.ok) { say(probe.error, "crit"); return; }
      update((x) => { N.setHumanScore(x, cr.id, val, draft.rationale, draft.reason, N.ADVISOR); });
      say(val === null ? "Override cleared; composite recalculated." : "Score recorded; composite recalculated.");
    }
    return html`<article className="scorecard">
      <div className="row between"><b>${cr.name}</b><span className="num big">${e.notScored ? "—" : eff === null ? "—" : eff.toFixed(2)}</span></div>
      ${e.ai ? html`<div className="ai-draft"><div className="small"><b>AI draft:</b> ${e.ai.score === null ? "no score" : Number(e.ai.score).toFixed(2)} ${e.ai.insufficient ? html`<${Badge} tone="warn">Insufficient evidence</${Badge}>` : null}</div><div className="small">${e.ai.rationale}</div><div>${(e.ai.cites || []).map((x, i) => html`<${Cite} key=${i} c=${c} e=${x} onOpen=${openViewer} />`)}</div></div>` : html`<p className="muted small">No AI draft yet.</p>`}
      <div className="grid3">
        <input aria-label=${"Advisor score for " + cr.name} type="number" min="1" max="5" step="0.25" placeholder="Advisor score" value=${draft.score} onChange=${(ev) => setDraft({ ...draft, score: ev.target.value })} />
        <input aria-label="Reason for change" placeholder="Reason for change (required if different)" value=${draft.reason} onChange=${(ev) => setDraft({ ...draft, reason: ev.target.value })} />
        <button type="button" className="btn tiny" onClick=${apply}>${draft.score === "" ? "Clear override" : "Apply score"}</button>
      </div>
      <textarea rows="2" aria-label="Advisor rationale" placeholder="Advisor rationale (blank keeps the AI rationale)" value=${draft.rationale} onChange=${(ev) => setDraft({ ...draft, rationale: ev.target.value })}></textarea>
      <label className="check small"><input type="checkbox" checked=${!!e.notScored} onChange=${(ev) => update((x) => { x.scores[cr.id] = x.scores[cr.id] || {}; x.scores[cr.id].notScored = ev.target.checked; }, ev.target.checked ? "Criterion marked not scored" : "Criterion scoring restored", cr.name)} /> Not scored (no defensible score possible)</label>
      ${e.human ? html`<div className="small muted">Advisor score ${Number(e.human.score).toFixed(2)} recorded ${String(e.human.at).slice(0, 16).replace("T", " ")}${e.human.reason ? " — " + e.human.reason : ""}</div>` : null}
    </article>`;
  }

  function Compliance({ c, update }) {
    const add = (cat) => update((x) => { x.compliance.push({ id: N.uid("cmp"), category: cat, requirement: "", clause: "", status: "Not addressed", evidence: "", action: "", origin: "advisor" }); });
    return html`<div className="sub">
      <h3>Section B compliance</h3>
      <${Banner} tone=${N.policyConfirmed(c) ? "ok" : "warn"}>${N.complianceBasisStatement(c)}</${Banner}>
      ${["A", "B", "C"].map((cat) => html`<div key=${cat}>
        <h4>${cat}. ${N.COMPLIANCE_CATS[cat]}${cat === "B" ? "s — not current rules until KDEM confirms" : "s"}</h4>
        ${cat === "A" && !N.policyConfirmed(c) ? html`<p className="muted small">Rows can be added here only after a current approved policy is on file and an officer confirmation is recorded in A. Case.</p>` : null}
        ${cat === "B" ? html`<p className="hint">Benchmarks named in the earlier reference review: ${N.HISTORICAL_BENCHMARKS.join("; ")}.</p>` : null}
        <div className="tablewrap"><table className="grid"><thead><tr><th>Requirement</th><th>Clause</th><th>Status</th><th>Proposal evidence</th><th>Required action</th><th></th></tr></thead>
        <tbody>${c.compliance.map((r, i) => r.category !== cat ? null : html`<tr key=${r.id}>
          <td><input aria-label="Requirement" value=${r.requirement} onChange=${(e) => update((x) => { x.compliance[i].requirement = e.target.value; })} /></td>
          <td><input className="s" aria-label="Clause" value=${r.clause} onChange=${(e) => update((x) => { x.compliance[i].clause = e.target.value; })} /></td>
          <td><select aria-label="Status" value=${r.status} onChange=${(e) => update((x) => { x.compliance[i].status = e.target.value; }, "Compliance status changed", r.requirement + " → " + e.target.value)}>${N.COMPLIANCE_STATUS.map((s) => html`<option key=${s}>${s}</option>`)}</select></td>
          <td><textarea rows="2" aria-label="Evidence" value=${r.evidence} onChange=${(e) => update((x) => { x.compliance[i].evidence = e.target.value; })}></textarea></td>
          <td><textarea rows="2" aria-label="Action" value=${r.action} onChange=${(e) => update((x) => { x.compliance[i].action = e.target.value; })}></textarea></td>
          <td><button type="button" className="btn tiny ghost" aria-label="Delete row" onClick=${() => update((x) => { x.compliance.splice(i, 1); }, "Compliance row deleted", r.requirement)}>×</button></td></tr>`)}</tbody></table></div>
        <button type="button" className="btn tiny" disabled=${cat === "A" && !N.policyConfirmed(c)} onClick=${() => add(cat)}>Add row</button>
      </div>`)}
    </div>`;
  }

  // ───────────────────────── F. Decision & verification ─────────────────────────
  function StageDecision(ctx) {
    const { c, update } = ctx;
    const usable = N.hasUsableProposal(c) || c.synthetic;
    const d = c.decision;
    const set = (k) => (e) => update((x) => { x.decision[k] = e.target.value; }, k === "outcome" ? "Outcome selected" : null, e.target.value);
    const lists = N.ACTION_STAGES.map((s) => [s, (c.findings || []).filter((f) => f.kind !== "strength" && f.actionStage === s && f.status !== "Closed")]);
    return html`<section className="panel">
      <h2>F. Recommendation, conditions and verification</h2>
      <${Verification} ...${ctx} />
      <div className="sub"><h3>Conditions (from findings)</h3>
        ${lists.map(([s, fs]) => html`<div key=${s}><h4>${s} (${fs.length})</h4>${fs.length ? html`<ol className="small">${fs.map((f) => html`<li key=${f.id}><b>${f.title}</b> — ${f.action || html`<i>no required action entered</i>`} <span className="muted">(${f.party}; ${f.basis || "—"}; ${f.status})</span></li>`)}</ol>` : html`<p className="muted small">None.</p>`}</div>`)}
      </div>
      <div className="sub"><h3>Advisory outcome</h3>
        ${!usable ? html`<p className="muted">Disabled: no proposal on file.</p>` : html`
        ${c.aiDraftDecision && c.aiDraftDecision.outcome ? html`<div className="ai-draft small">AI draft suggests: <b>${c.aiDraftDecision.outcome}</b>. ${c.aiDraftDecision.rationale} <button type="button" className="btn tiny" onClick=${() => update((x) => { x.decision.outcome = x.aiDraftDecision.outcome; x.decision.merit = x.decision.merit || x.aiDraftDecision.merit; x.decision.readinessNote = x.decision.readinessNote || x.aiDraftDecision.readiness; x.decision.rationale = x.decision.rationale || x.aiDraftDecision.rationale; }, "AI draft outcome adopted", c.aiDraftDecision.outcome)}>Use as starting point</button></div>` : null}
        <fieldset className="outcomes"><legend>Choose exactly one</legend>
          ${N.OUTCOMES.map((o) => html`<label key=${o} className="radio"><input type="radio" name="outcome" value=${o} checked=${d.outcome === o} onChange=${set("outcome")} /> ${o}</label>`)}
        </fieldset>
        ${N.readiness(c).warnings.map((w, i) => html`<div className="warnline crit" key=${i}>${w}</div>`)}
        <div className="grid2">
          <${Field} id="dec-merit" label="Programme merit (one sentence)" wide=${true}><input id="dec-merit" value=${d.merit} onChange=${set("merit")} /></${Field}>
          <${Field} id="dec-ready" label="Current readiness (one sentence)" wide=${true}><input id="dec-ready" value=${d.readinessNote} onChange=${set("readinessNote")} /></${Field}>
          <${Field} id="dec-rat" label="Short rationale" wide=${true}><textarea id="dec-rat" rows="3" value=${d.rationale} onChange=${set("rationale")}></textarea></${Field}>
          <${Field} id="dec-cond" label="Principal conditions (one per line)" wide=${true}><textarea id="dec-cond" rows="5" value=${d.principalConditions} onChange=${set("principalConditions")}></textarea></${Field}>
        </div>
        <p className="hint">Do not predict a future score; a resubmission is re-scored on its evidence. This outcome is advisory and is not a government approval.</p>`}
      </div>
    </section>`;
  }

  function Verification({ c, update }) {
    const blank = { area: N.VERIFY_AREAS[0], claim: "", result: "", sourceName: "", url: "", date: N.todayISO(), sourceType: N.SOURCE_TYPES[1], excerpt: "", limitations: "" };
    const [f, setF] = useState(blank);
    const addRec = () => {
      if (!f.claim.trim() || !f.result.trim()) return;
      update((x) => { x.verification.push({ ...f, id: N.uid("v"), enteredBy: "Advisor-entered verification" }); }, "Verification record added", f.claim);
      setF(blank);
    };
    return html`<div className="sub"><h3>Verification register</h3>
      <p className="hint">${c.meta.research === "Available" ? "Records must cite the exact source and access date." : N.NO_VERIFICATION + " This workbench cannot browse; records you add are labelled “Advisor-entered verification”."} Logos, employer names, review ratings and generic partnerships are not proof of programme-specific placement commitments.</p>
      <div className="tablewrap"><table className="list"><thead><tr><th>Area / claim</th><th>Result</th><th>Source</th><th>Limitations</th><th></th></tr></thead>
      <tbody>${(c.verification || []).map((v, i) => html`<tr key=${v.id}><td><div className="small muted">${v.area}</div>${v.claim}</td><td className="small">${v.result}</td><td className="small">${v.url ? html`<a href=${v.url} target="_blank" rel="noopener">${v.sourceName || v.url}</a>` : v.sourceName}<div className="muted">${v.sourceType} · ${v.date}</div><div>${html`<${Badge} tone=${v.enteredBy.startsWith("Advisor") ? "" : "warn"}>${v.enteredBy}</${Badge}>`}</div></td><td className="small">${v.limitations}</td><td><button type="button" className="btn tiny ghost" aria-label="Delete record" onClick=${() => update((x) => { x.verification.splice(i, 1); }, "Verification record deleted", v.claim)}>×</button></td></tr>`)}</tbody></table></div>
      ${(c.verificationChecklist || []).length ? html`<details className="sub"><summary>Verification checklist (${c.verificationChecklist.length})</summary><ul className="small">${c.verificationChecklist.map((v, i) => html`<li key=${i}>[${v.area}] ${v.claim}${v.howToCheck ? " — " + v.howToCheck : ""}</li>`)}</ul></details>` : null}
      <details className="sub"><summary>Add advisor-entered verification</summary>
        <div className="grid2">
          <select aria-label="Area" value=${f.area} onChange=${(e) => setF({ ...f, area: e.target.value })}>${N.VERIFY_AREAS.map((a) => html`<option key=${a}>${a}</option>`)}</select>
          <select aria-label="Source type" value=${f.sourceType} onChange=${(e) => setF({ ...f, sourceType: e.target.value })}>${N.SOURCE_TYPES.map((a) => html`<option key=${a}>${a}</option>`)}</select>
          <input aria-label="Claim checked" placeholder="Claim checked" value=${f.claim} onChange=${(e) => setF({ ...f, claim: e.target.value })} />
          <input aria-label="Result" placeholder="Result" value=${f.result} onChange=${(e) => setF({ ...f, result: e.target.value })} />
          <input aria-label="Source name" placeholder="Source name" value=${f.sourceName} onChange=${(e) => setF({ ...f, sourceName: e.target.value })} />
          <input aria-label="URL" placeholder="Exact URL (or leave blank for a supplied document)" value=${f.url} onChange=${(e) => setF({ ...f, url: e.target.value })} />
          <input aria-label="Access date" type="date" value=${f.date} onChange=${(e) => setF({ ...f, date: e.target.value })} />
          <input aria-label="Excerpt" placeholder="Relevant excerpt" value=${f.excerpt} onChange=${(e) => setF({ ...f, excerpt: e.target.value })} />
          <input aria-label="Limitations" placeholder="Limitations" value=${f.limitations} onChange=${(e) => setF({ ...f, limitations: e.target.value })} />
        </div>
        <button type="button" className="btn" onClick=${addRec}>Add record</button>
      </details>
    </div>`;
  }

  // ───────────────────────── G. Report & save ─────────────────────────
  function StageReport({ c, update, caps, say, saveFile, store, onDelete }) {
    const [preview, setPreview] = useState("");
    const [pv, setPv] = useState(false);
    const summary = N.summaryText(c);
    const slug = (c.meta.caseName || "case").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    const fileRef = useRef(null);
    async function makeBlob(kind) {
      const doc = kind === "annex" ? R.buildAnnex(docx, N, c) : R.buildReport(docx, N, c);
      return await docx.Packer.toBlob(doc);
    }
    async function exportDoc(kind) {
      try {
        const blob = await makeBlob(kind);
        const name = slug + (kind === "annex" ? "-evidence-annex" : N.hasUsableProposal(c) || c.synthetic ? "-evaluation" : "-blank-template") + "-" + c.meta.evalDate + ".docx";
        if (await saveFile(name, blob)) { update((x) => {}, kind === "annex" ? "Annex exported" : "Report exported", name); say("Saved " + name + "."); }
      } catch (e) { say("Could not build the Word file: " + (e.message || e), "crit"); }
    }
    async function doPreview() {
      setPv(true);
      try { const blob = await makeBlob("report"); const r = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() }); setPreview(r.value); }
      catch (e) { setPreview(""); say("Preview failed: " + (e.message || e), "crit"); }
      finally { setPv(false); }
    }
    async function exportCase() {
      const name = slug + "-" + c.meta.evalDate + ".case.json";
      if (await saveFile(name, JSON.stringify(c, null, 1))) say("Case file saved. It contains the extracted source text — store it as confidential.");
    }
    async function copySummary() {
      try { await navigator.clipboard.writeText(summary); say("Summary copied."); } catch (e) { say("Copy was blocked. Select the summary text and copy it manually.", "warn"); }
    }
    return html`<section className="panel">
      <h2>G. Report, summary and saving</h2>
      <div className="row gap wrap">
        <button type="button" className="btn primary" onClick=${() => exportDoc("report")}>${N.hasUsableProposal(c) || c.synthetic ? "Export evaluation report (.docx)" : "Export blank template (.docx)"}</button>
        <button type="button" className="btn" disabled=${!N.hasUsableProposal(c) && !c.synthetic} onClick=${() => exportDoc("annex")}>Export internal annex (.docx)</button>
        <button type="button" className="btn ghost" onClick=${doPreview} disabled=${pv}>${pv ? "Building preview…" : "Preview report"}</button>
        ${!caps.downloads ? html`<span className="warnline">File saving is not available in this view.</span>` : null}
      </div>
      <p className="hint">The main report targets 3–5 A4 pages. Exact pagination depends on Word; long findings are not cut to fit. Status stays “${c.meta.status}”. Advisor review is not government approval, and no signature is added.</p>
      ${preview ? html`<div className="preview" aria-label="Report preview"><div className="hint">Preview converted from the generated .docx (layout simplified).</div><div className="doc-preview" dangerouslySetInnerHTML=${{ __html: preview }}></div></div>` : null}
      <div className="sub"><h3>Short summary</h3><pre className="summary">${summary}</pre><button type="button" className="btn tiny" onClick=${copySummary}>Copy summary</button></div>
      <div className="sub"><h3>Case file</h3>
        <p className="hint">${store.label}</p>
        <div className="row gap wrap">
          <button type="button" className="btn" onClick=${exportCase}>Export case file (.json)</button>
          <${Confirm} label="Delete case" confirmLabel=${"Permanently delete “" + c.meta.caseName + "” from this workbench's store?"} tone="danger-outline" onConfirm=${onDelete} />
        </div>
      </div>
      <details className="sub"><summary>Audit trail (${(c.audit || []).length} entries)</summary>
        <div className="tablewrap"><table className="list small"><thead><tr><th>When (UTC)</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead><tbody>${(c.audit || []).slice().reverse().map((a, i) => html`<tr key=${i}><td className="nowrap">${String(a.at).slice(0, 16).replace("T", " ")}</td><td>${a.actor}</td><td>${a.action}</td><td>${a.detail}</td></tr>`)}</tbody></table></div>
      </details>
    </section>`;
  }

  ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
})();
