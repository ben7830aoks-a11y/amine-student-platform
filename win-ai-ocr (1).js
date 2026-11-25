/* ==================== قسم المساعد الذكي AI وتحويل الصور إلى نص (OCR) ==================== */

let aiMemoryBank = [];
let aiCustomFacts = [];
let aiConversationHistory = [];
let selectedHandwritingImageDataUrl = "";
let aiLabBrainNet = null;
let aiLabTfModel = null;

function getAiMemoryStorageKey() {
    const email = (currentUser && currentUser.email) ? currentUser.email : "guest";
    return "studentAiMemory_" + email;
}

function getAiFactsStorageKey() {
    const email = (currentUser && currentUser.email) ? currentUser.email : "guest";
    return "studentAiCustomFacts_" + email;
}

function loadAiMemory() {
    try {
        const saved = JSON.parse(localStorage.getItem(getAiMemoryStorageKey()));
        aiMemoryBank = Array.isArray(saved) ? saved : [];
    } catch (_) {
        aiMemoryBank = [];
    }

    try {
        const facts = JSON.parse(localStorage.getItem(getAiFactsStorageKey()));
        aiCustomFacts = Array.isArray(facts) ? facts : [];
    } catch (_) {
        aiCustomFacts = [];
    }

    renderAiMemoryDrawer();
}

function saveAiMemory() {
    try {
        localStorage.setItem(getAiMemoryStorageKey(), JSON.stringify(aiMemoryBank.slice(-40)));
    } catch (_) {}
    try {
        localStorage.setItem(getAiFactsStorageKey(), JSON.stringify(aiCustomFacts.slice(-80)));
    } catch (_) {}
    renderAiMemoryDrawer();
}

function toggleAiMemoryDrawer(forceState) {
    const drawer = document.getElementById("aiMemoryDrawer");
    if (!drawer) return;
    const shouldOpen = typeof forceState === "boolean" ? forceState : drawer.classList.contains("hidden");
    drawer.classList.toggle("hidden", !shouldOpen);
    if (shouldOpen) {
        renderAiMemoryDrawer();
    }
}

function renderAiMemoryDrawer() {
    const badge = document.getElementById("aiMemoryCountBadge");
    const container = document.getElementById("aiMemoryListContainer");
    if (badge) {
        badge.textContent = String(aiCustomFacts.length);
    }
    if (!container) return;

    if (!aiCustomFacts.length) {
        container.innerHTML = '<div style="color:#94a3b8; padding:6px;">لم تقم بتعليمي معلومات مخصصة بعد. يمكنك إعطائي أي معلومة وسأحفظها وأستخدمها في ردودي.</div>';
        return;
    }

    container.innerHTML = aiCustomFacts.map((item, idx) => {
        const safeText = escapeHtml(item.text || "");
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:var(--card-bg); border:1px solid var(--border); border-radius:7px; padding:6px 10px; margin-bottom:6px;">
                <span style="color:#e2e8f0; line-height:1.4;">• ${safeText}</span>
                <button type="button" onclick="deleteCustomAiFact(${idx})" style="background:transparent; border:none; color:#f87171; cursor:pointer; font-size:12px;" title="حذف">✕</button>
            </div>
        `;
    }).join("");
}

function saveDirectFactToAiMemory() {
    const input = document.getElementById("aiDirectFactInput");
    if (!input) return;
    const factText = input.value.trim();
    if (!factText) {
        showToast("اكتب معلومة أولاً لأحفظها 🧠");
        return;
    }
    addCustomFactToAiMemory(factText);
    input.value = "";
    appendAiMessage("ai", `🧠 تم حفظ المعلومة في ذاكرتي الدائمة: "${factText}". سأعتمد عليها في إجاباتي القادمة!`);
    showToast("تم حفظ المعلومة في ذاكرة AI 🧠");
}

function addCustomFactToAiMemory(factText) {
    const clean = String(factText || "").trim();
    if (!clean) return;
    const exists = aiCustomFacts.some(f => f.text.toLowerCase() === clean.toLowerCase());
    if (!exists) {
        aiCustomFacts.push({
            text: clean,
            savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
        saveAiMemory();
    }
}

function deleteCustomAiFact(index) {
    if (index < 0 || index >= aiCustomFacts.length) return;
    aiCustomFacts.splice(index, 1);
    saveAiMemory();
    showToast("تم حذف المعلومة من الذاكرة");
}

function clearAiMemoryBank() {
    aiMemoryBank = [];
    aiCustomFacts = [];
    saveAiMemory();
    appendAiMessage("ai", "🧹 تم مسح ذاكرة المحادثات والمعلومات المحفوظة بنجاح.");
    showToast("تم مسح ذاكرة AI");
}

function extractAndLearnFactFromUserText(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    const patterns = [
        /^(?:تذكر(?:\s+أن|\s+أني)?|احفظ(?:\s+أن|\s+أني)?|علّمك(?:\s+أن|\s+أني)?|اعلم(?:\s+أن|\s+أني)?|معلومة(?:\s+لك)?\s*:?)\s*(.+)$/i,
        /^(?:انا|أنا)\s+(?:طالب|طالبة|ادرس|أدرس|تخصصي|اسمي|هدفي|مشروعي)\s+(.+)$/i
    ];

    for (const pattern of patterns) {
        const match = raw.match(pattern);
        if (match && match[1]) {
            const learned = /تذكر|احفظ|علّمك|اعلم|معلومة/i.test(raw) ? match[1].trim() : raw;
            if (learned.length >= 3 && learned.length <= 240) {
                addCustomFactToAiMemory(learned);
                return learned;
            }
        }
    }
    return null;
}

function renderAiWelcomeMessage() {
    const box = document.getElementById("aiChatMessages");
    if (!box) return;
    const name = (currentUser && currentUser.username) ? currentUser.username : "أيها الطالب";
    const factsPreview = aiCustomFacts.length
        ? `<br><span style="color:#c4b5fd; font-size:12px;">🧠 أتذكر ${aiCustomFacts.length} معلومة أضفتها سابقاً.</span>`
        : "";
    box.innerHTML = `
        <div class="chat-msg ai">
            <strong>🤖 المساعد الذكي AI:</strong> أهلاً بك يا <strong>${escapeHtml(name)}</strong>! يمكنني تلخيص ملاحظاتك، تحليل مهامك ومعدلك، الإجابة عن أسئلتك العلمية والبرمجية المدعومة بالحساب الرمزي والمراجع والموسوعات، وحفظ المعلومات التي تعلّمني إياها.${factsPreview}
        </div>
    `;
}

function appendAiMessage(sender, htmlContent, options = {}) {
    const box = document.getElementById("aiChatMessages");
    if (!box) return null;
    const div = document.createElement("div");
    div.className = "chat-msg " + (sender === "user" ? "user" : "ai");
    if (sender === "user") {
        div.innerHTML = `<strong>أنت:</strong> ${escapeHtml(htmlContent)}`;
    } else {
        div.innerHTML = `<strong>🤖 المساعد الذكي AI:</strong> ${htmlContent}`;
        if (options.plainTextForNote) {
            const btnWrap = document.createElement("div");
            btnWrap.style.marginTop = "8px";
            const sendBtn = document.createElement("button");
            sendBtn.type = "button";
            sendBtn.className = "send-to-note-btn";
            sendBtn.textContent = "📝 إرسال الرد إلى دفتر الملاحظات";
            sendBtn.onclick = () => sendTextToActiveNote(options.plainTextForNote, options.noteTitle || "ملخص المساعد الذكي AI");
            btnWrap.appendChild(sendBtn);
            div.appendChild(btnWrap);
        }
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function getActiveNotePlainText() {
    if (typeof notes !== "undefined" && Array.isArray(notes) && notes.length > 0) {
        const active = notes.find(n => n.id === activeNoteId) || notes[0];
        if (active) {
            const temp = document.createElement("div");
            temp.innerHTML = active.content || "";
            return {
                title: active.title || "ملاحظة بدون عنوان",
                text: (temp.innerText || temp.textContent || "").trim()
            };
        }
    }
    const editor = document.getElementById("wordRichEditor");
    const titleInput = document.getElementById("activeNoteTitle");
    return {
        title: (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : "ملاحظة بدون عنوان",
        text: editor ? (editor.innerText || editor.textContent || "").trim() : ""
    };
}

function sendTextToActiveNote(plainText, suggestedTitle) {
    const clean = String(plainText || "").trim();
    if (!clean) {
        showToast("لا يوجد نص لإرساله إلى الملاحظة");
        return;
    }

    if (typeof showMainSection === "function") {
        const projBtn = document.getElementById("navProjects");
        showMainSection("projects", projBtn || null);
    }
    if (typeof showSubTab === "function") {
        const notesBtn = document.getElementById("subBtnNotes");
        showSubTab("notes", notesBtn || null);
    }

    const editor = document.getElementById("wordRichEditor");
    if (editor) {
        const safeParagraphs = clean.split(/\n+/).map(line => `<p>${escapeHtml(line)}</p>`).join("");
        const block = `<div style="margin:10px 0; padding:10px; border-right:3px solid #38bdf8; background:#f8fafc; color:#0f172a;"><strong>${escapeHtml(suggestedTitle || "إضافة من المساعد الذكي")}:</strong>${safeParagraphs}</div>`;
        editor.innerHTML = (editor.innerHTML || "") + block;
        if (typeof updateCurrentNoteContent === "function") {
            updateCurrentNoteContent();
        }
    }
    showToast("تم إرسال النص إلى دفتر الملاحظات 📝");
}

function aiSummarizeActiveNote() {
    const note = getActiveNotePlainText();
    if (!note.text) {
        appendAiMessage("ai", "ملاحظتك الحالية فارغة. اكتب بعض المحتوى في دفتر الملاحظات أولاً ثم اطلب تلخيصه.");
        return;
    }
    const sentences = note.text.split(/[.!؟\n]+/).map(s => s.trim()).filter(Boolean);
    const summaryLines = sentences.slice(0, 4);
    const summaryText = summaryLines.length ? summaryLines.join(" — ") : note.text.slice(0, 240);

    appendAiMessage(
        "ai",
        `<strong>ملخص الملاحظة (${escapeHtml(note.title)}):</strong><br>${escapeHtml(summaryText)}`,
        { plainTextForNote: summaryText, noteTitle: "ملخص: " + note.title }
    );
}

function aiExtractKeyPoints() {
    const note = getActiveNotePlainText();
    if (!note.text) {
        appendAiMessage("ai", "لا توجد نصوص كافية في ملاحظتك الحالية لاستخراج النقاط الرئيسية.");
        return;
    }
    const parts = note.text.split(/[.!؟،\n]+/).map(s => s.trim()).filter(s => s.length > 3);
    const points = parts.slice(0, 6);
    const htmlList = points.map(p => `<li>${escapeHtml(p)}</li>`).join("");
    const plainList = points.map((p, i) => `${i + 1}. ${p}`).join("\n");

    appendAiMessage(
        "ai",
        `<strong>النقاط الرئيسية من (${escapeHtml(note.title)}):</strong><ul style="margin:6px 18px 0 0; line-height:1.7;">${htmlList}</ul>`,
        { plainTextForNote: plainList, noteTitle: "نقاط رئيسية: " + note.title }
    );
}

function aiGenerateQuizFromNotes() {
    const note = getActiveNotePlainText();
    if (!note.text) {
        appendAiMessage("ai", "أضف محتوى دراسياً في ملاحظتك أولاً حتى أتمكن من توليد أسئلة اختبار منه.");
        return;
    }
    const keywords = note.text.split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}_-]/gu, "")).filter(w => w.length >= 4);
    const sampleTerm = keywords[0] || note.title;
    const secondTerm = keywords[Math.min(3, keywords.length - 1)] || "الفكرة الأساسية";

    const quizHtml = `
        <strong>اختبار سريع من (${escapeHtml(note.title)}):</strong>
        <ol style="margin:6px 18px 0 0; line-height:1.8;">
            <li>اشرح بأسلوبك المقصود بـ <strong>${escapeHtml(sampleTerm)}</strong> وكيف يرتبط بموضوع الملاحظة؟</li>
            <li>ما العلاقة بين <strong>${escapeHtml(sampleTerm)}</strong> و <strong>${escapeHtml(secondTerm)}</strong> في سياق الدرس؟</li>
            <li>اذكر مثالاً تطبيقياً أو عملياً يوضح هذه الفكرة.</li>
        </ol>
    `;
    const quizPlain = `1. اشرح المقصود بـ ${sampleTerm}.\n2. ما العلاقة بين ${sampleTerm} و ${secondTerm}؟\n3. اذكر مثالاً تطبيقياً.`;

    appendAiMessage("ai", quizHtml, { plainTextForNote: quizPlain, noteTitle: "اختبار: " + note.title });
}

function aiReviewTasksAndGpa() {
    const totalTasks = (typeof tasks !== "undefined" && Array.isArray(tasks)) ? tasks.length : 0;
    const doneTasks = (typeof tasks !== "undefined" && Array.isArray(tasks)) ? tasks.filter(t => t.completed).length : 0;
    const pendingTasks = totalTasks - doneTasks;

    let gpaText = "لم يتم إدخال مواد بعد";
    if (typeof gpaItems !== "undefined" && Array.isArray(gpaItems) && gpaItems.length > 0) {
        let sumWeighted = 0;
        let sumCoeff = 0;
        gpaItems.forEach(item => {
            const g = parseFloat(item.grade) || 0;
            const c = parseFloat(item.coeff) || 1;
            sumWeighted += g * c;
            sumCoeff += c;
        });
        if (sumCoeff > 0) {
            gpaText = `${(sumWeighted / sumCoeff).toFixed(2)} / 20 (${gpaItems.length} مواد)`;
        }
    }

    const reportPlain = `تقرير الأداء:\n- المهام المنجزة: ${doneTasks} من ${totalTasks} (متبقي: ${pendingTasks})\n- المعدل التراكمي: ${gpaText}`;
    appendAiMessage(
        "ai",
        `<strong>تحليل المهام والمعدل:</strong><br>• المهام المنجزة: <strong>${doneTasks}</strong> من <strong>${totalTasks}</strong> (المتبقي: <strong>${pendingTasks}</strong>)<br>• المعدل التراكمي: <strong>${escapeHtml(gpaText)}</strong>`,
        { plainTextForNote: reportPlain, noteTitle: "تحليل المهام والمعدل" }
    );
}

function buildLocalKnowledgeReply(prompt, scientificContext = "") {
    const q = String(prompt || "").trim();
    const lower = q.toLowerCase();

    const matchedFacts = aiCustomFacts.filter(f => {
        const words = f.text.split(/\s+/).filter(w => w.length >= 3);
        return words.some(w => lower.includes(w.toLowerCase()));
    });

    const lines = [];
    if (matchedFacts.length) {
        lines.push(`استناداً إلى ما علّمتني إياه سابقاً: <strong>${escapeHtml(matchedFacts[0].text)}</strong>.`);
    }

    if (scientificContext) {
        const sciLines = scientificContext.split("\n").filter(Boolean).map(l => `• ${escapeHtml(l)}`);
        lines.push(`<strong>المعطيات العلمية والمراجع المرتبطة:</strong><br>${sciLines.join("<br>")}`);
    }

    if (!lines.length) {
        lines.push(`بخصوص سؤالك عن "<strong>${escapeHtml(q)}</strong>": أنصحك بتقسيم الفكرة إلى مفاهيم أساسية، تطبيق عملي، ومراجعة دورية في دفتر الملاحظات. يمكنك أيضاً الضغط على أزرار التلخيص أو الاختبار بالأعلى أو تعليمي معلومة جديدة لأحفظها.`);
    }

    if (aiCustomFacts.length > 0 && !matchedFacts.length) {
        lines.push(`<span style="font-size:11px; color:#94a3b8;">(لدي ${aiCustomFacts.length} معلومة محفوظة في ذاكرتي؛ افتح "ذاكرة AI" لعرضها أو إدارتها).</span>`);
    }

    return lines.join("<br><br>");
}

async function sendAiMessage() {
    const input = document.getElementById("aiChatInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendAiMessage("user", text);

    const learnedFact = extractAndLearnFactFromUserText(text);
    if (learnedFact) {
        aiConversationHistory.push({ role: "user", content: text });
        aiConversationHistory.push({ role: "assistant", content: `تم حفظ: ${learnedFact}` });
        aiMemoryBank.push({ q: text, a: learnedFact, time: Date.now() });
        saveAiMemory();
        appendAiMessage("ai", `🧠 فهمت وحفظت المعلومة في ذاكرتي: "<strong>${escapeHtml(learnedFact)}</strong>". سأستحضرها عند حاجتك لها.`);
        return;
    }

    const thinkingEl = appendAiMessage("ai", '<span style="color:#94a3b8;">⏳ جاري التحليل والبحث في المصادر العلمية...</span>');

    let scientificContext = "";
    if (typeof window.buildScientificAiContext === "function") {
        try {
            scientificContext = await window.buildScientificAiContext(text);
        } catch (_) {
            scientificContext = "";
        }
    }

    const replyHtml = buildLocalKnowledgeReply(text, scientificContext);
    const plainForNote = replyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (thinkingEl) {
        thinkingEl.remove();
    }

    appendAiMessage("ai", replyHtml, {
        plainTextForNote: plainForNote,
        noteTitle: "رد AI: " + text.slice(0, 35)
    });

    aiConversationHistory.push({ role: "user", content: text });
    aiConversationHistory.push({ role: "assistant", content: plainForNote });
    aiMemoryBank.push({ q: text, a: plainForNote, time: Date.now() });
    saveAiMemory();
}

/* ==================== تحويل صورة خط اليد إلى نص منسّق (OCR) ==================== */

function previewAiHandwritingImage(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    const wrap = document.getElementById("aiImagePreviewWrap");
    const img = document.getElementById("aiImagePreviewImg");
    const badge = document.getElementById("ocrStatusBadge");

    if (!file) {
        selectedHandwritingImageDataUrl = "";
        if (wrap) wrap.classList.add("hidden");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        selectedHandwritingImageDataUrl = e.target && e.target.result ? String(e.target.result) : "";
        if (img && selectedHandwritingImageDataUrl) {
            img.src = selectedHandwritingImageDataUrl;
        }
        if (wrap) wrap.classList.remove("hidden");
        if (badge) badge.textContent = "الصورة جاهزة للتحويل (" + file.name + ")";
    };
    reader.readAsDataURL(file);
}

async function convertHandwritingImageToMachineText() {
    const badge = document.getElementById("ocrStatusBadge");
    const outArea = document.getElementById("aiConvertedMachineText");
    const langSelect = document.getElementById("ocrLangSelect");
    const lang = langSelect ? langSelect.value : "ara+eng";

    if (!selectedHandwritingImageDataUrl) {
        showToast("اختر صورة أولاً ليتم تحويلها 📷");
        if (badge) badge.textContent = "يرجى اختيار صورة أولاً";
        return;
    }

    if (typeof window.Tesseract === "undefined" || typeof window.Tesseract.recognize !== "function") {
        if (badge) badge.textContent = "مكتبة OCR قيد التحميل أو غير متاحة";
        showToast("تعذر تحميل محرك التعرف الضوئي Tesseract.js");
        return;
    }

    if (badge) badge.textContent = "⏳ جاري قراءة النص من الصورة...";
    try {
        const result = await window.Tesseract.recognize(selectedHandwritingImageDataUrl, lang, {
            logger: (m) => {
                if (m && m.status === "recognizing text" && typeof m.progress === "number" && badge) {
                    badge.textContent = `⏳ جاري التحويل: ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        const extracted = (result && result.data && result.data.text) ? result.data.text.trim() : "";
        if (outArea) {
            outArea.value = extracted || "لم يتم العثور على نص واضح في الصورة.";
        }
        if (badge) {
            badge.textContent = extracted ? "✅ تم استخراج النص بنجاح" : "⚠️ لم يظهر نص واضح";
        }
    } catch (err) {
        console.error(err);
        if (badge) badge.textContent = "❌ حدث خطأ أثناء قراءة الصورة";
        showToast("تعذر استخراج النص من الصورة");
    }
}

function sendConvertedTextToNote() {
    const outArea = document.getElementById("aiConvertedMachineText");
    const text = outArea ? outArea.value.trim() : "";
    if (!text) {
        showToast("لا يوجد نص محوّل لإرساله");
        return;
    }
    sendTextToActiveNote(text, "نص مستخرج من صورة");
}

/* ==================== مختبر مكتبات تطوير AI (Brain.js & TensorFlow.js) ==================== */

function updateAiLabLibrariesBadge() {
    const badge = document.getElementById("aiLibsStatusBadge");
    if (!badge) return;
    const hasBrain = typeof window.brain !== "undefined" && typeof window.brain.NeuralNetwork === "function";
    const hasTf = typeof window.tf !== "undefined" && typeof window.tf.sequential === "function";

    if (hasBrain && hasTf) {
        badge.textContent = "Brain.js + TensorFlow.js جاهزان";
        badge.style.color = "#34d399";
    } else if (hasBrain || hasTf) {
        badge.textContent = hasBrain ? "Brain.js جاهز (جاري تحميل TF)" : "TensorFlow.js جاهز (جاري تحميل Brain)";
        badge.style.color = "#38bdf8";
    } else {
        badge.textContent = "بانتظار تحميل المكتبات عند التشغيل";
        badge.style.color = "#fbbf24";
    }
}

async function runAiLibraryExperiment() {
    const libSelect = document.getElementById("aiLabLibSelect");
    const inputEl = document.getElementById("aiLabTestInput");
    const outputBox = document.getElementById("aiLabOutputBox");
    if (!libSelect || !outputBox) return;

    updateAiLabLibrariesBadge();
    const chosenLib = libSelect.value;
    const rawNums = (inputEl ? inputEl.value : "1, 0")
        .split(",")
        .map(v => parseFloat(v.trim()))
        .filter(n => !Number.isNaN(n));

    const a = rawNums.length > 0 ? rawNums[0] : 1;
    const b = rawNums.length > 1 ? rawNums[1] : 0;

    outputBox.textContent = "⏳ جاري تدريب النموذج وحساب التنبؤ...";

    if (chosenLib === "brain") {
        if (typeof window.brain === "undefined" || typeof window.brain.NeuralNetwork !== "function") {
            outputBox.textContent = "مكتبة Brain.js غير متاحة حالياً. تأكد من الاتصال بالإنترنت.";
            return;
        }
        try {
            if (!aiLabBrainNet) {
                aiLabBrainNet = new window.brain.NeuralNetwork({ hiddenLayers: [4] });
                aiLabBrainNet.train([
                    { input: [0, 0], output: [0] },
                    { input: [0, 1], output: [1] },
                    { input: [1, 0], output: [1] },
                    { input: [1, 1], output: [0] }
                ], { iterations: 1200 });
            }
            const pred = aiLabBrainNet.run([a, b]);
            const val = Array.isArray(pred) ? pred[0] : (pred && typeof pred[0] === "number" ? pred[0] : 0);
            outputBox.innerHTML = `<strong>🧠 Brain.js (XOR Model):</strong> المدخلات <code>[${a}, ${b}]</code> → التنبؤ: <strong>${Number(val).toFixed(4)}</strong>`;
        } catch (err) {
            outputBox.textContent = "خطأ في تشغيل Brain.js: " + String(err.message || err);
        }
        return;
    }

    if (typeof window.tf === "undefined" || typeof window.tf.sequential !== "function") {
        outputBox.textContent = "مكتبة TensorFlow.js غير متاحة حالياً. تأكد من الاتصال بالإنترنت.";
        return;
    }

    try {
        if (!aiLabTfModel) {
            const model = window.tf.sequential();
            model.add(window.tf.layers.dense({ inputShape: [2], units: 8, activation: "tanh" }));
            model.add(window.tf.layers.dense({ units: 1, activation: "sigmoid" }));
            model.compile({ optimizer: window.tf.train.adam(0.05), loss: "binaryCrossentropy" });

            const xs = window.tf.tensor2d([[0, 0], [0, 1], [1, 0], [1, 1]]);
            const ys = window.tf.tensor2d([[0], [1], [1], [0]]);
            await model.fit(xs, ys, { epochs: 120, verbose: 0 });
            xs.dispose();
            ys.dispose();
            aiLabTfModel = model;
        }

        const predTensor = aiLabTfModel.predict(window.tf.tensor2d([[a, b]]));
        const data = await predTensor.data();
        predTensor.dispose();
        const predictedVal = data && data.length ? Number(data[0]) : 0;
        outputBox.innerHTML = `<strong>⚡ TensorFlow.js (Sequential Model):</strong> المدخلات <code>[${a}, ${b}]</code> → التنبؤ: <strong>${predictedVal.toFixed(4)}</strong>`;
    } catch (err) {
        outputBox.textContent = "خطأ في تشغيل TensorFlow.js: " + String(err.message || err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        updateAiLabLibrariesBadge();
    }, 600);
});
