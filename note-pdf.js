/* ==========================================================================
   note-pdf.js
   Attach PDF files to a note. The text is extracted in the browser (pdf.js),
   stored in IndexedDB, and the AI explains it on request.
   Phase 1: text-based PDFs only. Scanned PDFs are reported, not processed.
   ========================================================================== */
(function () {
    const PDFJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
    const MAX_PAGES = 50;                  // pages read per file
    const MAX_CHARS = 7000;                // text sent to the AI per request
    const CONSENT_KEY = 'ssp_pdf_ai_consent';

    let selectedId = null;
    let lastOutput = '';
    let pdfLoading = null;

    const notes = () => (typeof notesList !== 'undefined' ? notesList : []);
    const currentNote = () => notes().find(n => n.id === (typeof activeNoteId !== 'undefined' ? activeNoteId : null));
    const $ = (id) => document.getElementById(id);

    function setStatus(msg, isError) {
        const el = $('notePdfStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? '#f87171' : '#94a3b8';
    }

    function loadPdfJs() {
        if (window.pdfjsLib) return Promise.resolve();
        if (!pdfLoading) {
            pdfLoading = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = PDFJS_SRC;
                s.onload = () => {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
                    resolve();
                };
                s.onerror = () => reject(new Error('تعذر تحميل مكتبة قراءة PDF'));
                document.head.appendChild(s);
            });
        }
        return pdfLoading;
    }

    // A real PDF starts with "%PDF-". Checking the bytes, not the extension.
    async function looksLikePdf(file) {
        const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        return String.fromCharCode(...head) === '%PDF-';
    }

    async function extractText(buffer) {
        await loadPdfJs();
        const doc = await window.pdfjsLib.getDocument({
            data: buffer,
            isEvalSupported: false,
            disableFontFace: true
        }).promise;
        const pages = Math.min(doc.numPages, MAX_PAGES);
        const parts = [];
        for (let p = 1; p <= pages; p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            parts.push(content.items.map(it => it.str).join(' '));
        }
        const text = parts.join('\n\n').replace(/[ \t]+/g, ' ').trim();
        return { text, pages: doc.numPages, readPages: pages };
    }

    function uid() {
        return 'att_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    async function handleUpload(file) {
        if (!file) return;
        const note = currentNote();
        if (!note) { setStatus('افتح ملاحظة أولاً', true); return; }
        if (file.size > MAX_BYTES) { setStatus('الملف أكبر من 10 ميجابايت', true); return; }
        if (!(await looksLikePdf(file))) { setStatus('الملف ليس PDF صالحاً', true); return; }

        setStatus('جاري قراءة الملف...');
        try {
            const buffer = await file.arrayBuffer();
            const { text, pages, readPages } = await extractText(buffer);
            if (!text) {
                setStatus('هذا الملف لا يحتوي على نص (ربما ممسوح ضوئياً). المعالجة الضوئية ستضاف في مرحلة لاحقة.', true);
                return;
            }
            const id = uid();
            if (!window.Platform || !(await window.Platform.saveAttachmentText(id, text))) {
                setStatus('تعذر حفظ النص محلياً في هذا المتصفح', true);
                return;
            }
            note.attachments = note.attachments || [];
            note.attachments.push({
                id, name: file.name, size: file.size,
                pages, readPages, chars: text.length, addedAt: Date.now()
            });
            selectedId = id;
            if (typeof saveNotesToStorage === 'function') saveNotesToStorage();
            renderNoteAttachments();
            setStatus(`تمت إضافة ${file.name} (${pages} صفحة)` + (readPages < pages ? `، قُرئت أول ${readPages} صفحة فقط` : ''));
        } catch (err) {
            console.error('[note-pdf]', err);
            setStatus('تعذر قراءة هذا الملف. جرّب ملفاً آخر', true);
        }
    }

    async function removeAttachment(id) {
        const note = currentNote();
        if (!note || !note.attachments) return;
        if (!confirm('حذف هذا الملف من الملاحظة؟')) return;
        note.attachments = note.attachments.filter(a => a.id !== id);
        if (window.Platform) await window.Platform.deleteAttachmentText(id);
        if (selectedId === id) selectedId = null;
        if (typeof saveNotesToStorage === 'function') saveNotesToStorage();
        renderNoteAttachments();
        $('notePdfOutput').classList.add('hidden');
        $('notePdfOutputActions').classList.add('hidden');
    }

    function renderNoteAttachments() {
        const list = $('notePdfList');
        const actions = $('notePdfActions');
        if (!list) return;
        const note = currentNote();
        const items = (note && note.attachments) || [];
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<span class="note-pdf-empty">لا توجد ملفات بعد. ارفع PDF ليشرحه المساعد.</span>';
            actions.classList.add('hidden');
            return;
        }
        items.forEach(att => {
            const row = document.createElement('div');
            row.className = 'note-pdf-item' + (att.id === selectedId ? ' selected' : '');
            const name = document.createElement('button');
            name.type = 'button';
            name.className = 'note-pdf-name';
            name.textContent = `📄 ${att.name} · ${att.pages} صفحة`;
            name.onclick = () => { selectedId = att.id; renderNoteAttachments(); };
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'note-pdf-del';
            del.textContent = '✕';
            del.title = 'حذف الملف';
            del.onclick = () => removeAttachment(att.id);
            row.append(name, del);
            list.appendChild(row);
        });
        actions.classList.toggle('hidden', !selectedId);
    }

    function prompt_for(mode, text, question) {
        const base = 'أجب بالعربية، واكتب بكلماتك الخاصة دون نسخ حرفي من النص.';
        switch (mode) {
            case 'explain': return `${base} اشرح للطالب الفكرة الرئيسية ثم النقاط المهمة بوضوح ومع أمثلة قصيرة.\n\nالنص:\n${text}`;
            case 'summary': return `${base} قدّم ملخصاً منظماً في نقاط قصيرة.\n\nالنص:\n${text}`;
            case 'method':  return `${base} حلّل الخطوات أو المنهجية المذكورة، وبيّن كل خطوة ولماذا تُتبع.\n\nالنص:\n${text}`;
            case 'review':  return `${base} أنشئ 5 أسئلة مراجعة من النص مع إجابة مختصرة لكل سؤال.\n\nالنص:\n${text}`;
            case 'custom':  return `${base} أجب عن السؤال التالي اعتماداً على النص.\nالسؤال: ${question}\n\nالنص:\n${text}`;
            default: return text;
        }
    }

    function consentOk() {
        if (localStorage.getItem(CONSENT_KEY) === '1') return true;
        const ok = confirm('سيُرسل نص الملف إلى خدمة الذكاء الاصطناعي لشرحه. لا تُرسل الملفات نفسها. هل توافق؟');
        if (ok) localStorage.setItem(CONSENT_KEY, '1');
        return ok;
    }

    window.explainNotePdf = async function (mode) {
        const note = currentNote();
        const att = note && (note.attachments || []).find(a => a.id === selectedId);
        if (!att) { setStatus('اختر ملفاً أولاً', true); return; }
        if (!window.Platform || !window.Platform.AI_PROXY_URL) {
            setStatus('المساعد الذكي غير مربوط بالخادم بعد', true);
            return;
        }
        const question = ($('notePdfQuestion')?.value || '').trim();
        if (mode === 'custom' && !question) { setStatus('اكتب سؤالك أولاً', true); return; }
        if (!consentOk()) { setStatus('لم يتم الإرسال'); return; }

        const full = await window.Platform.getAttachmentText(att.id);
        if (!full) { setStatus('نص الملف غير متوفر، أعد رفعه', true); return; }
        const text = full.slice(0, MAX_CHARS);
        const truncated = full.length > MAX_CHARS;

        setStatus('جاري الشرح...' + (truncated ? ' (سيُرسل أول 7000 حرف فقط من الملف)' : ''));
        const out = $('notePdfOutput');
        out.classList.add('hidden');
        try {
            const reply = await window.Platform.askAi(prompt_for(mode, text, question));
            lastOutput = String(reply || '').trim();
            out.innerHTML = window.Platform.markdownToSafeHtml(lastOutput);
            out.classList.remove('hidden');
            $('notePdfOutputActions').classList.remove('hidden');
            setStatus(truncated ? 'تم. الشرح يغطي أول جزء من الملف.' : 'تم الشرح ✅');
        } catch (err) {
            console.error('[note-pdf] AI failed', err);
            setStatus('تعذر الحصول على الشرح الآن. تحقق من الخادم الوسيط', true);
        }
    };

    window.insertNotePdfOutputIntoNote = function () {
        if (!lastOutput) return;
        const el = document.getElementById('wordRichEditor');
        if (!el) return;
        const block = document.createElement('div');
        block.className = 'note-pdf-inserted';
        block.innerHTML = window.Platform.markdownToSafeHtml(lastOutput);
        el.appendChild(block);
        if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
        setStatus('تمت إضافة الشرح إلى الملاحظة ✅');
    };

    window.renderNoteAttachments = renderNoteAttachments;

    document.addEventListener('DOMContentLoaded', () => {
        const input = $('notePdfInput');
        if (input) input.addEventListener('change', e => {
            const f = e.target.files && e.target.files[0];
            handleUpload(f);
            e.target.value = '';
        });
        renderNoteAttachments();
    });
})();
