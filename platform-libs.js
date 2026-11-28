/* ==========================================================================
   platform-libs.js
   Single entry point for third-party helpers used by the platform.
   Every helper degrades gracefully when its library failed to load.
   Load order: vendor scripts (in index.html) -> platform-libs.js -> app.js
   ========================================================================== */
(function () {
    const Platform = {};
    window.Platform = Platform;

    /* ---------- status ---------- */
    Platform.status = function () {
        return {
            DOMPurify: typeof window.DOMPurify !== 'undefined',
            MiniSearch: typeof window.MiniSearch !== 'undefined',
            html2pdf: typeof window.html2pdf !== 'undefined',
            docx: typeof window.docx !== 'undefined',
            idb: typeof window.idb !== 'undefined',
            imageCompression: typeof window.imageCompression !== 'undefined',
            Zod: typeof window.Zod !== 'undefined',
            marked: typeof window.marked !== 'undefined'
        };
    };
    setTimeout(() => {
        const s = Platform.status();
        const missing = Object.keys(s).filter(k => !s[k]);
        if (missing.length) console.warn('[platform-libs] libraries not loaded:', missing.join(', '));
    }, 1500);

    /* ---------- 1. Sanitizing HTML (security) ---------- */
    // Fallback cleaner used only if DOMPurify is unavailable.
    function fallbackSanitize(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = String(html || '');
        tpl.content.querySelectorAll('script,iframe,object,embed,link,meta,style').forEach(n => n.remove());
        tpl.content.querySelectorAll('*').forEach(el => {
            [...el.attributes].forEach(a => {
                const name = a.name.toLowerCase();
                const val = a.value.trim().toLowerCase();
                if (name.startsWith('on') || ((name === 'href' || name === 'src') && val.startsWith('javascript:'))) {
                    el.removeAttribute(a.name);
                }
            });
        });
        return tpl.innerHTML;
    }
    Platform.sanitize = function (html) {
        if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            return window.DOMPurify.sanitize(String(html || ''), { USE_PROFILES: { html: true } });
        }
        return fallbackSanitize(html);
    };
    // Markdown -> safe HTML
    Platform.markdownToSafeHtml = function (md) {
        const raw = (window.marked && typeof window.marked.parse === 'function')
            ? window.marked.parse(String(md || ''))
            : String(md || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        return Platform.sanitize(raw);
    };

    /* ---------- 2. Search over notes/projects (MiniSearch) ---------- */
    Platform.createSearchIndex = function (docs, fields = ['title', 'text']) {
        if (!window.MiniSearch) return null;
        const ms = new window.MiniSearch({
            fields,
            storeFields: ['id', 'title'],
            searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 2 } }
        });
        ms.addAll(docs || []);
        return ms;
    };
    Platform.search = function (index, query, limit = 20) {
        if (!index || !String(query || '').trim()) return [];
        return index.search(String(query).trim()).slice(0, limit);
    };

    /* ---------- 3. Export PDF (html2pdf.js) ---------- */
    Platform.exportElementToPdf = function (element, filename = 'note.pdf') {
        if (!window.html2pdf || !element) return false;
        window.html2pdf().set({
            margin: 10,
            filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
        return true;
    };

    /* ---------- 4. Export Word (docx) ---------- */
    Platform.exportTextToDocx = async function (title, text, filename = 'note.docx') {
        if (!window.docx) return false;
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
        const children = [new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true,
            children: [new TextRun({ text: String(title || ''), rightToLeft: true })] })];
        String(text || '').split(/\n/).forEach(line => {
            children.push(new Paragraph({ bidirectional: true,
                children: [new TextRun({ text: line, rightToLeft: true })] }));
        });
        const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    };

    /* ---------- 5. Offline storage (idb) ---------- */
    let dbPromise = null;
    Platform.db = function () {
        if (!window.idb) return null;
        if (!dbPromise) {
            dbPromise = window.idb.openDB('ssp-platform', 2, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('attachments')) db.createObjectStore('attachments', { keyPath: 'id' });
                }
            });
        }
        return dbPromise;
    };
    Platform.saveNoteLocal = async function (note) {
        const db = Platform.db();
        if (!db) return false;
        await (await db).put('notes', { ...note, updatedAt: Date.now() });
        return true;
    };
    // Extracted PDF text lives in IndexedDB (too large for localStorage).
    Platform.saveAttachmentText = async function (id, text) {
        const db = Platform.db();
        if (!db) return false;
        await (await db).put('attachments', { id, text, savedAt: Date.now() });
        return true;
    };
    Platform.getAttachmentText = async function (id) {
        const db = Platform.db();
        if (!db) return '';
        const rec = await (await db).get('attachments', id);
        return rec ? rec.text : '';
    };
    Platform.deleteAttachmentText = async function (id) {
        const db = Platform.db();
        if (db) await (await db).delete('attachments', id);
    };
    Platform.getAllNotesLocal = async function () {
        const db = Platform.db();
        return db ? (await db).getAll('notes') : [];
    };

    /* ---------- 6. Image compression before saving ---------- */
    Platform.compressImage = async function (file, maxSizeMB = 0.5, maxWidthOrHeight = 1600) {
        if (!window.imageCompression) return file;
        try {
            return await window.imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true });
        } catch (_) {
            return file;
        }
    };

    /* ---------- 7. Validate AI JSON replies (Zod) ---------- */
    Platform.zod = function () {
        return window.Zod ? (window.Zod.z || window.Zod) : null;
    };
    Platform.parseAiJson = function (text, schema) {
        const clean = String(text || '').replace(/```json|```/g, '').trim();
        let data;
        try { data = JSON.parse(clean); } catch (_) { return { ok: false, error: 'invalid_json' }; }
        if (!schema || typeof schema.safeParse !== 'function') return { ok: true, data };
        const r = schema.safeParse(data);
        return r.success ? { ok: true, data: r.data } : { ok: false, error: 'schema_mismatch' };
    };

    /* ---------- 8. Semantic ranking, loaded only on demand (Transformers.js) ---------- */
    let embedderPromise = null;
    Platform.loadEmbedder = function () {
        if (!embedderPromise) {
            embedderPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2/+esm')
                .then(m => m.pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'))
                .catch(err => { console.warn('[platform-libs] embedder unavailable', err); embedderPromise = null; return null; });
        }
        return embedderPromise;
    };
    Platform.semanticRank = async function (query, docs) {
        const embed = await Platform.loadEmbedder();
        if (!embed) return [];
        const vec = async t => Array.from((await embed(t, { pooling: 'mean', normalize: true })).data);
        const q = await vec(query);
        const scored = [];
        for (const d of docs) {
            const v = await vec(String(d.text || '').slice(0, 1000));
            scored.push({ doc: d, score: q.reduce((s, x, i) => s + x * v[i], 0) });
        }
        return scored.sort((a, b) => b.score - a.score);
    };

    /* ---------- 9. AI requests through a server-side proxy (no keys in the browser) ---------- */
    Platform.AI_PROXY_URL = ''; // e.g. https://your-worker.your-subdomain.workers.dev
    Platform.askAi = async function (prompt) {
        if (!Platform.AI_PROXY_URL) throw new Error('AI proxy URL not configured');
        const res = await fetch(Platform.AI_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: String(prompt || '').slice(0, 8000) })
        });
        if (!res.ok) throw new Error('AI proxy error ' + res.status);
        const data = await res.json();
        return String(data.text || '');
    };

    /* ---------- 9b. Model hook used by the AI section (app.js askAiDirectEngine) ---------- */
    window.callGeminiOrAiModel = async function callGeminiOrAiModel(prompt) {
        return Platform.askAi(prompt); // throws if no proxy is configured; the engine then falls back
    };

    /* ---------- 10. Assistant entry point called by shell-bot.js ----------
       Placeholder: defines the hook so shell-bot.js no longer warns. It does
       nothing else until the assistant is connected to Platform.askAi. */
    if (typeof window.initAiAssistant !== 'function') {
        window.initAiAssistant = function initAiAssistant() {
            console.info('[assistant] ready; AI proxy configured:', !!Platform.AI_PROXY_URL);
        };
    }
})();
