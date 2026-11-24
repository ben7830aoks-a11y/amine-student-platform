        /* ==================== دفتر الملاحظات (Word Studio Engine) ==================== */
        let wordZoomPercent = 100;
        let isWordFullscreen = false;
        let wordAutoSaveTimer = null;

        function getEditorElement() {
            return document.getElementById('wordRichEditor');
        }

        function getEditorPlainText() {
            const el = getEditorElement();
            if (!el) return '';
            return (el.innerText || el.textContent || '').replace(/\u00A0/g, ' ').trim();
        }

        function getEditorHtmlContent() {
            const el = getEditorElement();
            return el ? el.innerHTML : '';
        }

        function setEditorContentFromNote(note) {
            const el = getEditorElement();
            if (!el) return;
            if (note.htmlContent && note.htmlContent.trim()) {
                el.innerHTML = note.htmlContent;
            } else if (note.content && note.content.trim()) {
                el.innerHTML = note.content
                    .split('\n')
                    .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>')
                    .join('');
            } else {
                el.innerHTML = '';
            }
        }

        function initNotes() {
            const saved = JSON.parse(localStorage.getItem('smartStudentNotes') || 'null');
            if (Array.isArray(saved) && saved.length > 0) {
                notesList = saved.map(n => ({
                    ...n,
                    tag: n.tag || '📌 عام',
                    htmlContent: n.htmlContent || ''
                }));
            } else {
                notesList = [{
                    id: Date.now(),
                    title: 'ملاحظة البحث الأولى',
                    tag: '🧠 بحث معركة',
                    content: 'أفضل هيكلة مشروع ويب تعليمي تعتمد على تقسيم الواجهة إلى وحدات واضحة وسهلة الاختبار.\nيمكنني توسيع هذا التحليل أثناء مناظرة الذكاء الاصطناعي.',
                    htmlContent: '<h2>ملاحظة البحث الأولى</h2><p>أفضل هيكلة مشروع ويب تعليمي تعتمد على تقسيم الواجهة إلى وحدات واضحة وسهلة الاختبار.</p><p>يمكنني توسيع هذا التحليل أثناء مناظرة الذكاء الاصطناعي.</p>'
                }];
                saveNotesToStorage();
            }
            activeNoteId = notesList[0].id;
            const savedTheme = localStorage.getItem('smartStudentNotePaperTheme');
            if (savedTheme) notePaperTheme = savedTheme;
            applyNotePaperTheme();
            renderNotesSidebar();
            loadNoteIntoEditor(notesList[0]);
            if (noteViewMode === 'preview') renderFormattedNotePreview();
            updateNoteStats();
        }

        function saveNotesToStorage() {
            localStorage.setItem('smartStudentNotes', JSON.stringify(notesList));
            const badge = document.getElementById('wordAutoSaveIndicator');
            if (badge) {
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                badge.textContent = `✓ محفوظ تلقائياً (${nowTime})`;
            }
        }

        function renderNotesSidebar() {
            const container = document.getElementById('notesListContainer');
            if (!container) return;
            const query = (document.getElementById('noteSearchInput')?.value || '').trim().toLowerCase();
            container.innerHTML = '';

            const filtered = notesList.filter(note => {
                if (!query) return true;
                return (note.title || '').toLowerCase().includes(query) ||
                    (note.content || '').toLowerCase().includes(query) ||
                    (note.tag || '').toLowerCase().includes(query);
            });

            if (!filtered.length) {
                container.innerHTML = `<div style="font-size:12px; color:#94a3b8; text-align:center; padding:12px;">لا توجد مستندات مطابقة</div>`;
                return;
            }

            filtered.forEach((note) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'note-item-btn ' + (note.id === activeNoteId ? 'active-note' : '');
                btn.onclick = () => selectNote(note.id);

                const titleSpan = document.createElement('span');
                titleSpan.style.overflow = 'hidden';
                titleSpan.style.textOverflow = 'ellipsis';
                titleSpan.style.whiteSpace = 'nowrap';
                titleSpan.textContent = `${note.tag || '📌'} ${note.title || 'بدون عنوان'}`;
                btn.appendChild(titleSpan);

                if (notesList.length > 1) {
                    const delBtn = document.createElement('span');
                    delBtn.textContent = '🗑️';
                    delBtn.style.fontSize = '12px';
                    delBtn.style.opacity = '0.75';
                    delBtn.title = 'حذف المستند';
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                    };
                    btn.appendChild(delBtn);
                }
                container.appendChild(btn);
            });
        }

        function selectNote(id) {
            const note = notesList.find(n => n.id === id);
            if (!note) return;
            activeNoteId = note.id;
            renderNotesSidebar();
            loadNoteIntoEditor(note);
            if (noteViewMode === 'preview') renderFormattedNotePreview();
            updateNoteStats();
        }

        function loadNoteIntoEditor(note) {
            const titleInput = document.getElementById('activeNoteTitle');
            const tagSelect = document.getElementById('activeNoteTag');
            const headerTitle = document.getElementById('wordDocHeaderTitle');
            if (titleInput) titleInput.value = note.title || '';
            if (tagSelect) tagSelect.value = note.tag || '📌 عام';
            if (headerTitle) headerTitle.textContent = note.title || 'مستند الطالب الذكي';
            setEditorContentFromNote(note);
            updateNoteStats();
        }

        function createNewNote() {
            const newNote = {
                id: Date.now(),
                title: `مستند جديد ${notesList.length + 1}`,
                tag: '📚 درس',
                content: '',
                htmlContent: ''
            };
            notesList.unshift(newNote);
            activeNoteId = newNote.id;
            saveNotesToStorage();
            renderNotesSidebar();
            loadNoteIntoEditor(newNote);
            if (noteViewMode === 'preview') renderFormattedNotePreview();
            const el = getEditorElement();
            if (el) el.focus();
            showToast('تم إنشاء مستند جديد 📄');
        }

        function deleteNote(id) {
            if (notesList.length <= 1) return;
            notesList = notesList.filter(n => n.id !== id);
            if (activeNoteId === id) activeNoteId = notesList[0].id;
            saveNotesToStorage();
            renderNotesSidebar();
            loadNoteIntoEditor(notesList.find(n => n.id === activeNoteId));
            if (noteViewMode === 'preview') renderFormattedNotePreview();
        }

        function scheduleWordAutoSave() {
            const badge = document.getElementById('wordAutoSaveIndicator');
            if (badge) badge.textContent = '⏳ جاري الحفظ...';
            clearTimeout(wordAutoSaveTimer);
            wordAutoSaveTimer = setTimeout(() => {
                saveNotesToStorage();
            }, 350);
        }

        function updateCurrentNoteTitle() {
            const note = notesList.find(n => n.id === activeNoteId);
            if (!note) return;
            const titleVal = document.getElementById('activeNoteTitle').value;
            note.title = titleVal;
            const headerTitle = document.getElementById('wordDocHeaderTitle');
            if (headerTitle) headerTitle.textContent = titleVal.trim() || 'مستند الطالب الذكي';
            renderNotesSidebar();
            scheduleWordAutoSave();
        }

        function updateCurrentNoteTag() {
            const note = notesList.find(n => n.id === activeNoteId);
            if (!note) return;
            note.tag = document.getElementById('activeNoteTag').value;
            renderNotesSidebar();
            scheduleWordAutoSave();
        }

        function saveActiveNoteTitle() {
            updateCurrentNoteContent();
            saveNotesToStorage();
            showToast('تم حفظ المستند بنجاح 💾');
        }

        function updateCurrentNoteContent() {
            const note = notesList.find(n => n.id === activeNoteId);
            if (!note) return;
            note.content = getEditorPlainText();
            note.htmlContent = getEditorHtmlContent();
            updateNoteStats();
            scheduleWordAutoSave();
        }

        function updateNoteStats() {
            const text = getEditorPlainText();
            const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
            const chars = text.length;
            const counterEl = document.getElementById('noteStatsCounter');
            if (counterEl) counterEl.textContent = `الكلمات: ${words} | الحروف: ${chars}`;
        }

        function switchWordRibbonTab(tabName) {
            ['home', 'insert', 'layout'].forEach(t => {
                const panel = document.getElementById(`wordRibbon-${t}`);
                const btn = document.getElementById(`wordTab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
                if (panel) panel.classList.toggle('hidden', t !== tabName);
                if (btn) btn.classList.toggle('active', t === tabName);
            });
        }

        function execWordCmd(cmd, value = null) {
            const el = getEditorElement();
            if (!el) return;
            el.focus();
            try {
                if (cmd === 'hiliteColor' && !document.queryCommandSupported('hiliteColor')) {
                    document.execCommand('backColor', false, value);
                } else {
                    document.execCommand(cmd, false, value);
                }
            } catch (e) {}
            updateCurrentNoteContent();
        }

        function applyWordBlockFormat(tagName) {
            if (!tagName) return;
            execWordCmd('formatBlock', tagName);
        }

        function setWordDocDirection(dir) {
            const el = getEditorElement();
            if (!el) return;
            el.setAttribute('dir', dir);
            el.style.textAlign = dir === 'ltr' ? 'left' : 'right';
            updateCurrentNoteContent();
        }

        function insertWordTable() {
            const el = getEditorElement();
            if (!el) return;
            el.focus();
            const tableHtml = `<table><thead><tr><th>العمود 1</th><th>العمود 2</th><th>العمود 3</th></tr></thead><tbody><tr><td>بيانات 1</td><td>بيانات 2</td><td>بيانات 3</td></tr><tr><td>بيانات 4</td><td>بيانات 5</td><td>بيانات 6</td></tr></tbody></table><p><br></p>`;
            document.execCommand('insertHTML', false, tableHtml);
            updateCurrentNoteContent();
        }

        function insertCodeSnippet() {
            const el = getEditorElement();
            if (!el) return;
            el.focus();
            const codeHtml = `<pre><code>// اكتب الكود هنا\nfunction solve() {\n  return true;\n}</code></pre><p><br></p>`;
            document.execCommand('insertHTML', false, codeHtml);
            updateCurrentNoteContent();
        }

        function insertWordHorizontalRule() {
            const el = getEditorElement();
            if (!el) return;
            el.focus();
            document.execCommand('insertHTML', false, '<hr style="margin:14px 0; border:none; border-top:2px solid var(--sheet-border);"><p><br></p>');
            updateCurrentNoteContent();
        }

        function insertWordChecklist() {
            const el = getEditorElement();
            if (!el) return;
            el.focus();
            const checkHtml = `<div style="margin:6px 0;"><label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox"> <span>مهمة دراسية جديدة</span></label></div>`;
            document.execCommand('insertHTML', false, checkHtml);
            updateCurrentNoteContent();
        }

        function insertNoteTemplate(type) {
            const el = getEditorElement();
            if (!el) return;
            el.focus();
            let tpl = '';
            if (type === 'research') {
                tpl = `<h1>عنوان البحث الجامعي</h1><h2>1. المقدمة والإشكالية</h2><p>اكتب هنا مقدمة البحث والسؤال الإشكالي...</p><h2>2. المنهجية والتحليل</h2><p>استعرض الأدلة والمقارنات الأساسية...</p><h2>3. الخاتمة والتوصيات</h2><p>لخص أهم النتائج...</p>`;
            } else {
                tpl = `<h1>ملخص المحاضرة</h1><h2>📌 الأفكار الأساسية</h2><ul><li>الفكرة الأولى</li><li>الفكرة الثانية</li></ul><h2>💡 أمثلة وتطبيقات</h2><blockquote>مثال توضيحي أو قاعدة مهمة للمراجعة.</blockquote>`;
            }
            document.execCommand('insertHTML', false, tpl);
            updateCurrentNoteContent();
            showToast('تم إدراج القالب في الصفحة ✅');
        }

        function setNotePaperTheme(themeName) {
            notePaperTheme = themeName;
            localStorage.setItem('smartStudentNotePaperTheme', themeName);
            applyNotePaperTheme();
        }

        function applyNotePaperTheme() {
            const sheet = document.getElementById('notePageSheet');
            if (!sheet) return;
            sheet.classList.remove('paper-white', 'paper-cream', 'paper-dark');
            if (notePaperTheme === 'cream') sheet.classList.add('paper-cream');
            else if (notePaperTheme === 'dark') sheet.classList.add('paper-dark');
            else sheet.classList.add('paper-white');
        }

        function adjustWordZoom(delta) {
            wordZoomPercent = Math.min(140, Math.max(70, wordZoomPercent + delta));
            applyWordZoom();
        }

        function resetNotePageSize() {
            wordZoomPercent = 100;
            applyWordZoom();
        }

        function applyWordZoom() {
            const sheet = document.getElementById('notePageSheet');
            const label = document.getElementById('notePageSizeLabel');
            if (sheet) sheet.style.transform = `scale(${wordZoomPercent / 100})`;
            if (label) label.textContent = `التكبير: ${wordZoomPercent}%`;
        }

        function updateNotePageSizeLabel() {
            const label = document.getElementById('notePageSizeLabel');
            if (label) label.textContent = `التكبير: ${wordZoomPercent}%`;
        }

        function toggleWordFullscreen(forceState = null) {
            const shell = document.querySelector('#subtab-notes .word-workspace-shell');
            if (!shell) return;
            const nextState = typeof forceState === 'boolean' ? forceState : !isWordFullscreen;
            isWordFullscreen = nextState;
            shell.classList.toggle('word-fullscreen-mode', isWordFullscreen);
            document.body.style.overflow = isWordFullscreen ? 'hidden' : '';

            const topBtn = document.getElementById('wordFullscreenBtn');
            const statusBtn = document.getElementById('wordStatusFullscreenBtn');
            const labelText = isWordFullscreen ? '🗗 تصغير الشاشة' : '⛶ ملء الشاشة';
            if (topBtn) topBtn.textContent = labelText;
            if (statusBtn) statusBtn.textContent = labelText;

            const editorEl = getEditorElement();
            if (editorEl) setTimeout(() => editorEl.focus(), 40);
        }

        function renderFormattedNotePreview() {
            const note = notesList.find(n => n.id === activeNoteId);
            if (note) setEditorContentFromNote(note);
        }

        function toggleNoteTranslateMenu() {
            const menu = document.getElementById('noteTranslateMenu');
            menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
        }

        async function translateSelectedText(targetLang) {
            document.getElementById('noteTranslateMenu').style.display = 'none';
            const statusMsg = document.getElementById('translationStatusMsg');
            const editorEl = getEditorElement();
            if (!editorEl) return;

            const sel = window.getSelection();
            const selectedText = sel ? sel.toString().trim() : '';
            if (!selectedText) {
                showToast('ظلل نصاً داخل المستند أولاً ثم اختر لغة الترجمة', true);
                return;
            }

            if (statusMsg) statusMsg.textContent = '⏳ جاري الترجمة...';
            const langPairMap = { ar: 'en|ar', fr: 'en|fr', en: 'ar|en' };
            const pair = langPairMap[targetLang] || 'en|ar';

            try {
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedText)}&langpair=${encodeURIComponent(pair)}`);
                const data = await res.json();
                const translated = data && data.responseData && data.responseData.translatedText ? data.responseData.translatedText : '';
                if (!translated) throw new Error('EMPTY_TRANS');

                if (sel && sel.rangeCount > 0 && editorEl.contains(sel.anchorNode)) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(translated));
                    sel.removeAllRanges();
                }
                updateCurrentNoteContent();
                if (statusMsg) statusMsg.textContent = '✓ تم استبدال النص المحدد بالترجمة';
                setTimeout(() => { if (statusMsg) statusMsg.textContent = ''; }, 3000);
                showToast('تمت ترجمة النص المحدد 🌐');
            } catch (err) {
                if (statusMsg) statusMsg.textContent = '⚠️ تعذر الاتصال بخدمة الترجمة';
                showToast('تعذر إتمام الترجمة حالياً', true);
            }
        }

        function exportNoteAsWordDoc() {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0];
            const title = (document.getElementById('activeNoteTitle')?.value || note?.title || 'مستند').trim();
            const bodyHtml = getEditorHtmlContent() || `<p>${escapeHtml(getEditorPlainText())}</p>`;
            const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${escapeHtml(title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#1e293b;padding:24px;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #94a3b8;padding:8px;}</style></head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`;
            const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[\\/:*?"<>|]/g, '_') || 'document'}.doc`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('تم تصدير المستند بصيغة Word (.doc) 📘');
        }

        function exportNoteAsFile() {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0];
            const title = (document.getElementById('activeNoteTitle')?.value || note?.title || 'مستند').trim();
            const text = getEditorPlainText();
            const blob = new Blob([`${title}\n${'='.repeat(24)}\n\n${text}`], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[\\/:*?"<>|]/g, '_') || 'document'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('تم تصدير المستند كملف نصي (.txt) 📥');
        }

        function exportNoteAsPDF() {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0];
            const title = (document.getElementById('activeNoteTitle')?.value || note?.title || 'مستند').trim();
            const bodyHtml = getEditorHtmlContent() || `<p>${escapeHtml(getEditorPlainText()).replace(/\n/g, '<br>')}</p>`;
            const w = window.open('', '_blank', 'width=820,height=900');
            if (!w) {
                showToast('اسمح بفتح النوافذ المنبثقة للطباعة أو حفظ PDF', true);
                return;
            }
            w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#0f172a;padding:36px;max-width:780px;margin:0 auto;}h1{border-bottom:2px solid #2563eb;padding-bottom:8px;margin-bottom:18px;}table{border-collapse:collapse;width:100%;margin:12px 0;}td,th{border:1px solid #cbd5e1;padding:8px;}pre{background:#f1f5f9;padding:12px;border-radius:6px;direction:ltr;text-align:left;}</style></head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}<script>window.onload=function(){window.print();};<\/script></body></html>`);
            w.document.close();
        }
