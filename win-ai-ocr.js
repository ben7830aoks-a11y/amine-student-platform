        /* ==================== مكتبات تطوير الذكاء الاصطناعي ==================== */
        function updateAiLibrariesBadge() {
            const badge = document.getElementById('aiLibsStatusBadge');
            if (badge) badge.textContent = `Brain.js: ${typeof window.brain !== 'undefined' ? 'جاهز ✅' : 'غير محمّل'} | TensorFlow.js: ${typeof window.tf !== 'undefined' ? 'جاهز ✅' : 'غير محمّل'}`;
        }
        async function runAiLibraryExperiment() {
            const lib = document.getElementById('aiLabLibSelect')?.value || 'brain', rawTest = (document.getElementById('aiLabTestInput')?.value || '1, 0').trim(), outBox = document.getElementById('aiLabOutputBox');
            if (!outBox) return;
            const parts = rawTest.split(',').map(v => parseFloat(v.trim())).filter(n => !Number.isNaN(n));
            if (parts.length < 2) { showToast('أدخل قيمتين رقميتين مثل: 1, 0', true); return; }
            const x1 = parts[0] ? 1 : 0, x2 = parts[1] ? 1 : 0; outBox.textContent = '⏳ جاري تدريب النموذج...';
            try {
                if (lib === 'brain' && typeof window.brain !== 'undefined') {
                    const net = new window.brain.NeuralNetwork({ hiddenLayers: [4] });
                    net.train([{ input: [0, 0], output: [0] }, { input: [0, 1], output: [1] }, { input: [1, 0], output: [1] }, { input: [1, 1], output: [0] }], { iterations: 800 });
                    const prob = Number(net.run([x1, x2])[0] || 0).toFixed(4);
                    outBox.textContent = `🧠 [Brain.js] مدخل [${x1}, ${x2}] → احتمال XOR = ${prob}`; return;
                }
                if (typeof window.tf !== 'undefined') {
                    const model = window.tf.sequential(); model.add(window.tf.layers.dense({ units: 8, inputShape: [2], activation: 'tanh' })); model.add(window.tf.layers.dense({ units: 1, activation: 'sigmoid' }));
                    model.compile({ optimizer: window.tf.train.adam(0.08), loss: 'binaryCrossentropy' });
                    const xs = window.tf.tensor2d([[0, 0], [0, 1], [1, 0], [1, 1]]), ys = window.tf.tensor2d([[0], [1], [1], [0]]);
                    await model.fit(xs, ys, { epochs: 90, verbose: 0 });
                    const inp = window.tf.tensor2d([[x1, x2]]), pred = model.predict(inp), prob = Number((await pred.data())[0] || 0).toFixed(4);
                    xs.dispose(); ys.dispose(); inp.dispose(); pred.dispose(); model.dispose();
                    outBox.textContent = `⚡ [TensorFlow.js] مدخل [${x1}, ${x2}] → احتمال XOR = ${prob}`; return;
                }
            } catch (err) { outBox.textContent = '⚠️ تعذر إكمال التدريب؛ أعد المحاولة.'; }
        }

        /* ==================== المساعد الذكي AI + ذاكرة تعليمية ==================== */
        function getAiMemoryStorageKey() {
            return `smartStudentAiMemory_${currentUser && currentUser.id ? currentUser.id : 'guest'}`;
        }
        function loadAiMemoryBank() {
            const raw = JSON.parse(localStorage.getItem(getAiMemoryStorageKey()) || '[]');
            return Array.isArray(raw) ? raw : [];
        }
        function saveAiMemoryBank(list) {
            localStorage.setItem(getAiMemoryStorageKey(), JSON.stringify(list));
            renderAiMemoryDrawer();
        }
        function renderAiMemoryDrawer() {
            const list = loadAiMemoryBank();
            const badge = document.getElementById('aiMemoryCountBadge');
            if (badge) badge.textContent = String(list.length);
            const container = document.getElementById('aiMemoryListContainer');
            if (!container) return;
            if (!list.length) {
                container.innerHTML = `<div style="color:#94a3b8; padding:6px;">لم تُعلّم الذكاء الاصطناعي معلومات إضافية بعد. اكتب "تذكر أن..." في المحادثة أو أضف معلومة هنا.</div>`;
                return;
            }
            container.innerHTML = list.map((item, idx) => `
                <div class="list-item" style="margin-bottom:6px; padding:7px 10px; font-size:12px;">
                    <span>💡 ${escapeHtml(item.fact)}</span>
                    <button type="button" class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteAiMemoryItem(${idx})">حذف</button>
                </div>
            `).join('');
        }
        function toggleAiMemoryDrawer() {
            const drawer = document.getElementById('aiMemoryDrawer');
            if (!drawer) return;
            drawer.classList.toggle('hidden');
            renderAiMemoryDrawer();
        }
        function saveDirectFactToAiMemory() {
            const inp = document.getElementById('aiDirectFactInput');
            const fact = (inp?.value || '').trim();
            if (!fact) { showToast('اكتب معلومة ليحفظها الذكاء الاصطناعي', true); return; }
            const list = loadAiMemoryBank();
            list.unshift({ id: Date.now(), fact, savedAt: new Date().toLocaleDateString('ar-DZ') });
            saveAiMemoryBank(list);
            if (inp) inp.value = '';
            showToast('تم حفظ المعلومة في ذاكرة AI 🧠');
        }
        function deleteAiMemoryItem(idx) {
            const list = loadAiMemoryBank();
            list.splice(idx, 1);
            saveAiMemoryBank(list);
        }
        function clearAiMemoryBank() {
            saveAiMemoryBank([]);
            showToast('تم مسح ذاكرة AI');
        }
        function extractTeachableFactFromPrompt(prompt) {
            const cleaned = String(prompt || '').trim();
            const patterns = [
                /^(?:تذكر(?:\s+أن)?|احفظ(?:\s+أن)?|علّمك\s+أن|معلومة\s*[:：])\s*(.+)$/i,
                /^(?:remember(?:\s+that)?|note\s+that)\s+(.+)$/i
            ];
            for (const rx of patterns) {
                const m = cleaned.match(rx);
                if (m && m[1] && m[1].trim().length >= 2) return m[1].trim();
            }
            return '';
        }

        function initAiAssistant() {
            renderAiMemoryDrawer();
            const box = document.getElementById('aiChatMessages');
            if (box && box.children.length === 0) {
                appendAiMessage('أهلاً بك! يمكنني تلخيص ملاحظاتك، اختبارك، حفظ معلومات جديدة تُعلّمني إياها، أو تدريب نماذج Brain.js وTensorFlow.js.', false);
            }
        }
        function sendAiMessage() {
            const inp = document.getElementById('aiChatInput'), txt = inp.value.trim(); if (!txt) return;
            appendAiMessage(txt, true); inp.value = '';
            setTimeout(() => appendAiMessage(generateSmartAiResponse(txt), false), 300);
        }
        function appendAiMessage(text, isUser) {
            const box = document.getElementById('aiChatMessages'), div = document.createElement('div');
            div.className = 'chat-msg ' + (isUser ? 'chat-msg-user' : 'chat-msg-other');
            div.style.whiteSpace = 'pre-wrap'; div.innerHTML = `<span class="sensitive-content">${escapeHtml(text)}</span>`;
            box.appendChild(div); box.scrollTop = box.scrollHeight;
        }
        function aiSummarizeActiveNote() {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0], content = getEditorPlainText() || (note ? note.content.trim() : '');
            if (!content) { appendAiMessage('ملاحظتك الحالية فارغة.', false); return; }
            appendAiMessage(`📝 تلخيص (${note ? note.title : 'الملاحظة'}):\n${content.split(/[.!؟\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 3).map(s => `• ${s}`).join('\n')}`, false);
        }
        function aiExtractKeyPoints() {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0], content = getEditorPlainText() || (note ? note.content.trim() : '');
            if (!content) { appendAiMessage('لا توجد نقاط لاستخراجها لأن الملاحظة فارغة.', false); return; }
            const words = content.split(/\s+/).filter(w => w.length > 3), freq = {};
            words.forEach(w => { const k = w.replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, ''); if (k.length > 3) freq[k] = (freq[k] || 0) + 1; });
            const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => `🔑 ${k}`);
            appendAiMessage(`🎯 أبرز الكلمات والمفاهيم:\n${top.length ? top.join('\n') : '• راجع الفقرات الرئيسية في الملاحظة.'}`, false);
        }
        function aiGenerateQuizFromNotes() {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0], title = note ? note.title : 'موضوعك الدراسي';
            appendAiMessage(`❓ سؤال اختبار سريع حول "${title}":\nاشرح بأسلوبك الفكرة المركزية في ملاحظتك وكيف تطبقها عملياً؟`, false);
        }
        function aiReviewTasksAndGpa() {
            const done = tasksList.filter(t => t.completed).length, total = tasksList.length, gpaText = document.getElementById('gpaResult')?.textContent || 'المعدل التراكمي: 0.00 / 20';
            appendAiMessage(`📊 تحليل سريع لأدائك:\n• المهام: أنجزت ${done} من أصل ${total}.\n• ${gpaText}`, false);
        }
        function generateSmartAiResponse(prompt) {
            const taughtFact = extractTeachableFactFromPrompt(prompt);
            if (taughtFact) {
                const list = loadAiMemoryBank();
                list.unshift({ id: Date.now(), fact: taughtFact, savedAt: new Date().toLocaleDateString('ar-DZ') });
                saveAiMemoryBank(list);
                return `🧠 تم حفظ المعلومة في ذاكرتي: "${taughtFact}". سأعتمد عليها في إجاباتي القادمة!`;
            }

            const q = prompt.toLowerCase(), memory = loadAiMemoryBank();
            if (q.includes('ذاكرة') || q.includes('ماذا تعرف عني') || q.includes('تذكرت') || q.includes('memory')) {
                if (!memory.length) return '🧠 ذاكرتي الإضافية فارغة حالياً. قل لي مثلاً: "تذكر أن تخصصي رياضيات" وسأحفظها فوراً.';
                return `🧠 المعلومات المحفوظة في ذاكرتي:\n${memory.slice(0, 8).map(m => `• ${m.fact}`).join('\n')}`;
            }

            const matchedMem = memory.find(m => m.fact.toLowerCase().split(/\s+/).some(tok => tok.length > 2 && q.includes(tok.toLowerCase())));
            if (q.includes('ملاحظ') || q.includes('تلخيص') || q.includes('لخص')) {
                const note = notesList.find(n => n.id === activeNoteId) || notesList[0], c = getEditorPlainText() || (note ? note.content.trim() : '');
                return c ? `ملخص ملاحظتك "${note ? note.title : ''}":\n${c.slice(0, 220)}${c.length > 220 ? '...' : ''}` : 'ملاحظتك فارغة حالياً.';
            }
            if (q.includes('مهام') || q.includes('أنجزت')) { const done = tasksList.filter(t => t.completed).length; return `أنجزت ${done} من أصل ${tasksList.length} مهام.`; }
            if (q.includes('معدل')) return document.getElementById('gpaResult')?.textContent || 'المعدل التراكمي: 0.00 / 20';
            if (matchedMem) return `💡 بناءً على ما علّمتني إياه: "${matchedMem.fact}". كيف يمكنني مساعدتك أكثر بخصوص ذلك؟`;
            return `فهمت سؤالك (${prompt}). يمكنك أيضاً تعليمي معلومة جديدة بقول "تذكر أن..." أو استخدام مختبر Brain.js وTensorFlow.js بالأسفل.`;
        }

        /* ==================== تحويل صورة خط اليد إلى نص OCR ==================== */
        let selectedHandwritingImageFile = null;

        function previewAiHandwritingImage(event) {
            const file = event.target.files && event.target.files[0];
            const wrap = document.getElementById('aiImagePreviewWrap');
            const img = document.getElementById('aiImagePreviewImg');
            const badge = document.getElementById('ocrStatusBadge');
            if (!file) {
                selectedHandwritingImageFile = null;
                if (wrap) wrap.classList.add('hidden');
                return;
            }
            selectedHandwritingImageFile = file;
            if (img && wrap) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    img.src = e.target.result;
                    wrap.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
            if (badge) badge.textContent = `الصورة جاهزة: ${file.name}`;
        }

        function formatRecognizedMachineText(rawText) {
            const cleaned = String(rawText || '')
                .replace(/\r\n/g, '\n')
                .replace(/[ \t]+/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            if (!cleaned) return '';
            return cleaned
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .join('\n');
        }

        async function convertHandwritingImageToMachineText() {
            const badge = document.getElementById('ocrStatusBadge');
            const outArea = document.getElementById('aiConvertedMachineText');
            const lang = document.getElementById('ocrLangSelect')?.value || 'ara+eng';
            if (!selectedHandwritingImageFile) {
                showToast('اختر صورة خط اليد أو التقطها أولاً 📷', true);
                return;
            }
            if (typeof window.Tesseract === 'undefined') {
                showToast('مكتبة التعرف الضوئي غير متاحة حالياً', true);
                return;
            }
            if (badge) badge.textContent = '⏳ جاري قراءة النص وتحويله لخط آلة...';
            try {
                const result = await window.Tesseract.recognize(selectedHandwritingImageFile, lang, {
                    logger: (m) => {
                        if (m && m.status === 'recognizing text' && typeof m.progress === 'number' && badge) {
                            badge.textContent = `⏳ جاري التحويل: ${Math.round(m.progress * 100)}%`;
                        }
                    }
                });
                const formatted = formatRecognizedMachineText(result?.data?.text || '');
                if (!formatted) {
                    if (badge) badge.textContent = '⚠️ لم يتم العثور على نص واضح في الصورة';
                    showToast('لم يتضح نص كافٍ في الصورة؛ جرّب صورة أوضح', true);
                    return;
                }
                if (outArea) outArea.value = formatted;
                if (badge) badge.textContent = '✅ تم التحويل إلى خط منسّق جاهز للإرسال';
                showToast('تم تحويل خط اليد إلى نص منسّق ✨');
            } catch (err) {
                if (badge) badge.textContent = '⚠️ تعذر تحويل الصورة حالياً';
                showToast('حدث خطأ أثناء قراءة الصورة', true);
            }
        }

        function sendConvertedTextToNote() {
            const outArea = document.getElementById('aiConvertedMachineText');
            const txt = (outArea?.value || '').trim();
            if (!txt) {
                showToast('لا يوجد نص محوّل لإرساله إلى الملاحظة', true);
                return;
            }
            appendToActiveNote(`🖨️ نص محوّل من صورة:\n${txt}`, 'تم إرسال النص المحوّل إلى دفتر الملاحظات 📝');
        }
