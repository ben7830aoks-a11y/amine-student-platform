/* ===== Inline Script #1 ===== */
(function () {
            const loadedUrls = new Set();
            function loadScriptOnce(url) {
                if (loadedUrls.has(url)) return Promise.resolve();
                loadedUrls.add(url);
                return new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = url;
                    s.async = true;
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error('Failed to load ' + url));
                    document.head.appendChild(s);
                });
            }
            window.ensureAiLabLibrariesLoaded = function () {
                return Promise.all([
                    loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'),
                    loadScriptOnce('https://unpkg.com/brain.js@2.0.0-beta.23/dist/brain-browser.min.js')
                ]).catch(() => {});
            };
            window.ensureOcrLibraryLoaded = function () {
                return loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js').catch(() => {});
            };
            document.addEventListener('DOMContentLoaded', () => {
                const aiBtn = document.getElementById('navAiAssistant');
                const aiMobileBtn = document.querySelector('[data-mnav="aiAssistant"]');
                const triggerLoad = () => {
                    window.ensureAiLabLibrariesLoaded();
                    window.ensureOcrLibraryLoaded();
                };
                if (aiBtn) aiBtn.addEventListener('click', triggerLoad, { once: true });
                if (aiMobileBtn) aiMobileBtn.addEventListener('click', triggerLoad, { once: true });
            });
        })();

/* ===== Inline Script #2 ===== */
(function () {
            const firebaseConfig = {
                apiKey: "AIzaSyCibfAnFN0BACS9-OKf5wmals4KpKc_FKY",
                authDomain: "smart-student-platform-f6eaf.firebaseapp.com",
                databaseURL: "https://smart-student-platform-f6eaf-default-rtdb.firebaseio.com",
                projectId: "smart-student-platform-f6eaf",
                storageBucket: "smart-student-platform-f6eaf.firebasestorage.app",
                messagingSenderId: "112366788977",
                appId: "1:112366788977:web:9e3e00e2c53f6d3e4a96d0",
                measurementId: "G-W99PJPCHQ8"
            };

            function sanitizePlayerId(raw) {
                return String(raw || '').replace(/^#/, '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
            }

            function getActivePlayerId() {
                if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
                    const cleaned = sanitizePlayerId(currentUser.id);
                    if (cleaned) return cleaned;
                }
                let localId = sanitizePlayerId(localStorage.getItem('ssp_ff_player_id'));
                if (!localId) {
                    localId = String(Math.floor(100000 + Math.random() * 900000));
                    localStorage.setItem('ssp_ff_player_id', localId);
                }
                return localId;
            }

            function getActivePlayerName() {
                if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
                    return String(currentUser.username).trim().slice(0, 40) || 'طالب';
                }
                return (document.getElementById('navUsername')?.textContent || 'طالب').trim().slice(0, 40) || 'طالب';
            }

            let rtdb = null;
            let lastFoundFriend = null;
            let friendsListenerAttachedFor = '';

            function initFirebaseFriendSystem() {
                const statusBadge = document.getElementById('ffFirebaseSyncStatus');
                const myIdBadge = document.getElementById('ffMyIdBadge');
                const myId = getActivePlayerId();
                if (myIdBadge) myIdBadge.textContent = 'ID: #' + myId;

                const hasValidConfig = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');
                if (!hasValidConfig || typeof firebase === 'undefined' || !firebase.database) {
                    if (statusBadge) statusBadge.textContent = 'Firebase: أضف firebaseConfig للتفعيل السحابي';
                    renderLocalFallbackFriends();
                    return;
                }

                try {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(firebaseConfig);
                    }
                    rtdb = firebase.database();
                    if (statusBadge) {
                        statusBadge.textContent = 'Firebase: متصل';
                        statusBadge.style.color = '#34d399';
                    }
                    syncCurrentStudentToFirebase();
                    attachFirebaseFriendsListener();
                } catch (err) {
                    console.error(err);
                    if (statusBadge) {
                        statusBadge.textContent = 'Firebase: وضع محلي';
                        statusBadge.style.color = '#fbbf24';
                    }
                    renderLocalFallbackFriends();
                }
            }

            async function syncCurrentStudentToFirebase() {
                const myId = getActivePlayerId();
                const myName = getActivePlayerName();
                const myIdBadge = document.getElementById('ffMyIdBadge');
                if (myIdBadge) myIdBadge.textContent = 'ID: #' + myId;

                if (!rtdb) return;
                try {
                    const myUid = window.getCurrentUid ? window.getCurrentUid() : '';
                    if (!myUid) return;
                    await rtdb.ref('users/' + myUid).update({
                        studentId: myId,
                        name: myName,
                        lastSeen: Date.now()
                    });
                } catch (_) {}
            }

            function renderFriendsChips(friendsArray) {
                const container = document.getElementById('ffFriendsChipsContainer');
                const countEl = document.getElementById('ffFriendsCountLabel');
                if (!container) return;
                container.innerHTML = '';

                const list = Array.isArray(friendsArray) ? friendsArray : [];
                if (countEl) countEl.textContent = String(list.length);

                if (!list.length) {
                    const emptyChip = document.createElement('span');
                    emptyChip.className = 'ff-friend-chip';
                    emptyChip.textContent = 'لا يوجد أصدقاء مضافون بعد';
                    container.appendChild(emptyChip);
                    return;
                }

                list.forEach((f) => {
                    const chip = document.createElement('span');
                    chip.className = 'ff-friend-chip';
                    chip.textContent = (f.name || 'طالب') + ' (#' + f.id + ')';
                    container.appendChild(chip);
                });
            }

            function renderLocalFallbackFriends() {
                const myId = getActivePlayerId();
                try {
                    const raw = JSON.parse(localStorage.getItem('ssp_ff_friends_' + myId) || '[]');
                    renderFriendsChips(Array.isArray(raw) ? raw : []);
                } catch (_) {
                    renderFriendsChips([]);
                }
            }

            function attachFirebaseFriendsListener() {
                const myId = getActivePlayerId();
                if (!rtdb || friendsListenerAttachedFor === myId) return;
                friendsListenerAttachedFor = myId;

                const friendsUid = window.getCurrentUid ? window.getCurrentUid() : '';
                if (!friendsUid) return;
                rtdb.ref('friends/' + friendsUid).on('value', (snap) => {
                    const arr = [];
                    if (snap && snap.exists()) {
                        snap.forEach((child) => {
                            const val = child.val() || {};
                            arr.push({
                                id: sanitizePlayerId(val.id || child.key),
                                name: String(val.name || 'طالب').slice(0, 40)
                            });
                        });
                    }
                    localStorage.setItem('ssp_ff_friends_' + myId, JSON.stringify(arr));
                    renderFriendsChips(arr);
                });
            }

            window.ffCopyMyPlayerId = async function () {
                const myId = '#' + getActivePlayerId();
                if (typeof copyTextToClipboard === 'function') {
                    copyTextToClipboard(myId, 'تم نسخ الـ ID الخاص بك ' + myId);
                    return;
                }
                try {
                    await navigator.clipboard.writeText(myId);
                } catch (_) {}
            };

            window.ffSearchAndPreviewFriend = async function () {
                const input = document.getElementById('ffSearchFriendIdInput');
                const feedback = document.getElementById('ffSearchFeedback');
                const foundBox = document.getElementById('ffFoundFriendBox');
                lastFoundFriend = null;

                if (foundBox) {
                    foundBox.classList.add('hidden');
                    foundBox.innerHTML = '';
                }

                const targetId = sanitizePlayerId(input ? input.value : '');
                const myId = getActivePlayerId();

                if (!targetId) {
                    if (feedback) feedback.textContent = 'أدخل رقم ID صحيحاً للبحث عن صديقك.';
                    return;
                }
                if (targetId === myId) {
                    if (feedback) feedback.textContent = 'هذا هو الـ ID الخاص بك (#' + myId + ').';
                    return;
                }

                if (!rtdb) {
                    if (feedback) feedback.textContent = 'أدخل بيانات firebaseConfig في الملف لتفعيل البحث عن الأصدقاء عبر السحابة.';
                    return;
                }

                if (feedback) feedback.textContent = 'جاري البحث عن #' + targetId + '...';

                try {
                    const resolvedUid = await window.resolveUidByStudentId(targetId);
                    if (!resolvedUid) {
                        if (feedback) feedback.textContent = 'لم يتم العثور على مستخدم مسجل بالـ ID #' + targetId + '.';
                        return;
                    }
                    const snap = await rtdb.ref('publicProfiles/' + resolvedUid).get();
                    if (!snap.exists()) {
                        if (feedback) feedback.textContent = 'لم يتم العثور على مستخدم مسجل بالـ ID #' + targetId + '.';
                        return;
                    }

                    const data = snap.val() || {};
                    lastFoundFriend = {
                        id: targetId,
                        uid: resolvedUid,
                        name: String(data.username || data.name || 'طالب').slice(0, 40)
                    };

                    if (feedback) feedback.textContent = '';
                    if (foundBox) {
                        const infoWrap = document.createElement('div');
                        const nameStrong = document.createElement('strong');
                        nameStrong.style.color = '#fff';
                        nameStrong.textContent = lastFoundFriend.name;
                        const idSpan = document.createElement('span');
                        idSpan.style.cssText = 'color:#38bdf8; margin-inline-start:8px; font-family:monospace;';
                        idSpan.textContent = '#' + lastFoundFriend.id;
                        infoWrap.append(nameStrong, idSpan);

                        const addBtn = document.createElement('button');
                        addBtn.type = 'button';
                        addBtn.className = 'add-friend-btn';
                        addBtn.textContent = '➕ إضافة صديق';
                        addBtn.onclick = () => window.ffConfirmAddFriend(lastFoundFriend);

                        foundBox.append(infoWrap, addBtn);
                        foundBox.classList.remove('hidden');
                    }
                } catch (err) {
                    console.error(err);
                    if (feedback) feedback.textContent = 'تعذر إتمام البحث الآن. تحقق من الاتصال وقواعد الأمان.';
                }
            };

            window.ffConfirmAddFriend = async function (friendObj) {
                const target = friendObj || lastFoundFriend;
                const feedback = document.getElementById('ffSearchFeedback');
                const foundBox = document.getElementById('ffFoundFriendBox');
                const myId = getActivePlayerId();

                if (!target || !target.id) return;
                if (!rtdb) {
                    if (feedback) feedback.textContent = 'فعّل firebaseConfig أولاً لحفظ الصديق في قاعدة البيانات.';
                    return;
                }

                try {
                    const myFriendsUid = window.getCurrentUid ? window.getCurrentUid() : '';
                    await rtdb.ref('friends/' + myFriendsUid + '/' + target.uid).set({
                        uid: target.uid,
                        id: target.id,
                        name: target.name || 'طالب',
                        addedAt: Date.now()
                    });
                    if (foundBox) {
                        foundBox.classList.add('hidden');
                        foundBox.innerHTML = '';
                    }
                    if (feedback) {
                        feedback.textContent = 'تمت إضافة ' + target.name + ' (#' + target.id + ') إلى قائمة أصدقائك.';
                    }
                    if (typeof showToast === 'function') {
                        showToast('تمت إضافة الصديق #' + target.id);
                    }
                } catch (err) {
                    console.error(err);
                    if (feedback) feedback.textContent = 'تعذر إضافة الصديق. تحقق من صلاحيات Rules.';
                }
            };

            document.addEventListener('DOMContentLoaded', () => {
                initFirebaseFriendSystem();
                setTimeout(syncCurrentStudentToFirebase, 800);
            });
        })();

/* ===== Inline Script #3 ===== */
(function () {
            window.triggerInsertImageIntoNote = function () {
                const input = document.getElementById('noteInsertImageInput');
                if (input) {
                    input.value = '';
                    input.click();
                }
            };

            function attachSideDimensionControls(figure, img) {
                if (!figure || !img) return;

                figure.querySelectorAll('.img-side-resize-handle').forEach(h => h.remove());

                const sizeLabel = figure.querySelector('.img-scale-badge-label');
                const rangeSlider = figure.querySelector('.img-scale-range-input');
                const numInput = figure.querySelector('.img-scale-num-input');

                function applyScalePercent(rawPct) {
                    const parsed = parseInt(rawPct, 10);
                    const clamped = Math.max(20, Math.min(100, Number.isNaN(parsed) ? 80 : parsed));
                    img.setAttribute('data-scale-pct', String(clamped));
                    img.style.width = clamped + '%';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    if (rangeSlider) rangeSlider.value = String(clamped);
                    if (numInput) numInput.value = String(clamped);
                    if (sizeLabel) sizeLabel.textContent = 'الأبعاد: ' + clamped + '%';
                    if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                }

                figure.__applyImageScalePercent = applyScalePercent;

                function bindSideHandle(side) {
                    const handle = document.createElement('button');
                    handle.type = 'button';
                    handle.className = 'img-side-resize-handle handle-' + side;
                    handle.textContent = side === 'left' ? '⬅' : '➡';
                    handle.title = side === 'left'
                        ? 'اسحب من جهة اليسار لتغيير أبعاد الصورة (20% - 100%)'
                        : 'اسحب من جهة اليمين لتغيير أبعاد الصورة (20% - 100%)';

                    handle.addEventListener('pointerdown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const container = figure.parentElement || document.getElementById('wordRichEditor');
                        const containerWidth = Math.max(200, (container ? container.clientWidth : figure.clientWidth) - 24);
                        const startX = e.clientX;
                        const startWidthPx = img.getBoundingClientRect().width || (containerWidth * 0.8);

                        handle.setPointerCapture?.(e.pointerId);

                        function onMove(ev) {
                            const dx = ev.clientX - startX;
                            const deltaWidth = side === 'right' ? dx : -dx;
                            const nextWidthPx = startWidthPx + deltaWidth;
                            const nextPct = Math.round((nextWidthPx / containerWidth) * 100);
                            applyScalePercent(nextPct);
                        }

                        function onUp() {
                            window.removeEventListener('pointermove', onMove);
                            window.removeEventListener('pointerup', onUp);
                            if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                        }

                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                    });

                    figure.appendChild(handle);
                }

                bindSideHandle('left');
                bindSideHandle('right');
            }

            function insertFigureElementIntoEditor(dataUrl, fileName) {
                const editor = document.getElementById('wordRichEditor');
                if (!editor) return;

                let savedRange = null;
                const prevSel = window.getSelection();
                if (prevSel && prevSel.rangeCount > 0 && editor.contains(prevSel.anchorNode)) {
                    savedRange = prevSel.getRangeAt(0).cloneRange();
                }

                const figure = document.createElement('figure');
                figure.className = 'note-inserted-image-block';
                figure.contentEditable = 'false';
                figure.style.cssText = 'position:relative; margin:14px 0; padding:12px 20px; border:1px solid #cbd5e1; border-radius:10px; background:#f8fafc; text-align:center;';

                const img = document.createElement('img');
                img.src = dataUrl;
                img.alt = fileName || 'صورة الملاحظة';
                img.setAttribute('data-scale-pct', '80');
                img.style.cssText = 'width:80%; max-width:100%; height:auto; border-radius:8px; display:block; margin:0 auto; transition:width 0.1s ease;';

                const caption = document.createElement('figcaption');
                caption.contentEditable = 'true';
                caption.textContent = fileName || 'تعليق على الصورة';
                caption.style.cssText = 'margin-top:6px; font-size:12px; color:#475569; outline:none;';

                const controls = document.createElement('div');
                controls.style.cssText = 'margin-top:8px; display:flex; gap:6px; justify-content:center; align-items:center; flex-wrap:wrap;';

                const sizeLabel = document.createElement('span');
                sizeLabel.className = 'img-scale-badge-label';
                sizeLabel.style.cssText = 'font-size:11px; color:#334155; font-weight:700;';
                sizeLabel.textContent = 'الأبعاد: 80%';

                const shrinkFromRightBtn = document.createElement('button');
                shrinkFromRightBtn.type = 'button';
                shrinkFromRightBtn.textContent = '➡ تصغير يمين';
                shrinkFromRightBtn.style.cssText = 'padding:3px 7px; font-size:11px; border-radius:6px; border:1px solid #94a3b8; background:#fff; color:#0f172a; cursor:pointer;';
                shrinkFromRightBtn.onclick = () => {
                    const cur = parseInt(img.getAttribute('data-scale-pct') || '80', 10);
                    figure.__applyImageScalePercent?.(cur - 10);
                };

                const rangeSlider = document.createElement('input');
                rangeSlider.type = 'range';
                rangeSlider.className = 'img-scale-range-input';
                rangeSlider.min = '20';
                rangeSlider.max = '100';
                rangeSlider.step = '1';
                rangeSlider.value = '80';
                rangeSlider.title = 'تحكم بالأبعاد من 20% إلى 100%';
                rangeSlider.style.cssText = 'width:105px; cursor:pointer; accent-color:#2563eb;';

                const numInput = document.createElement('input');
                numInput.type = 'number';
                numInput.className = 'img-scale-num-input';
                numInput.min = '20';
                numInput.max = '100';
                numInput.step = '1';
                numInput.value = '80';
                numInput.style.cssText = 'width:54px; padding:3px 5px; font-size:11px; border-radius:6px; border:1px solid #94a3b8; background:#fff; color:#0f172a; text-align:center;';

                const pctSign = document.createElement('span');
                pctSign.textContent = '%';
                pctSign.style.cssText = 'font-size:11px; color:#334155; font-weight:700;';

                const shrinkFromLeftBtn = document.createElement('button');
                shrinkFromLeftBtn.type = 'button';
                shrinkFromLeftBtn.textContent = '⬅ تصغير يسار';
                shrinkFromLeftBtn.style.cssText = 'padding:3px 7px; font-size:11px; border-radius:6px; border:1px solid #94a3b8; background:#fff; color:#0f172a; cursor:pointer;';
                shrinkFromLeftBtn.onclick = () => {
                    const cur = parseInt(img.getAttribute('data-scale-pct') || '80', 10);
                    figure.__applyImageScalePercent?.(cur - 10);
                };

                const expandBothSidesBtn = document.createElement('button');
                expandBothSidesBtn.type = 'button';
                expandBothSidesBtn.textContent = '⇿ توسيع يمين/يسار';
                expandBothSidesBtn.style.cssText = 'padding:3px 8px; font-size:11px; border-radius:6px; border:1px solid #2563eb; background:#eff6ff; color:#1d4ed8; cursor:pointer;';
                expandBothSidesBtn.onclick = () => {
                    const cur = parseInt(img.getAttribute('data-scale-pct') || '80', 10);
                    figure.__applyImageScalePercent?.(cur + 10);
                };

                const moveFigureBy = (step) => {
                    if (step < 0 && figure.previousElementSibling) {
                        editor.insertBefore(figure, figure.previousElementSibling);
                    } else if (step > 0 && figure.nextElementSibling) {
                        editor.insertBefore(figure.nextElementSibling, figure);
                    }
                    if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                };

                const upBtn = document.createElement('button');
                upBtn.type = 'button';
                upBtn.textContent = '⬆️ لأعلى';
                upBtn.style.cssText = 'padding:3px 8px; font-size:11px; border-radius:6px; border:1px solid #94a3b8; background:#fff; color:#0f172a; cursor:pointer;';
                upBtn.onclick = () => moveFigureBy(-1);

                const downBtn = document.createElement('button');
                downBtn.type = 'button';
                downBtn.textContent = '⬇️ لأسفل';
                downBtn.style.cssText = 'padding:3px 8px; font-size:11px; border-radius:6px; border:1px solid #94a3b8; background:#fff; color:#0f172a; cursor:pointer;';
                downBtn.onclick = () => moveFigureBy(1);

                const placeAtCursorBtn = document.createElement('button');
                placeAtCursorBtn.type = 'button';
                placeAtCursorBtn.textContent = '📍 نقل لموضع المؤشر';
                placeAtCursorBtn.style.cssText = 'padding:3px 8px; font-size:11px; border-radius:6px; border:1px solid #2563eb; background:#eff6ff; color:#1d4ed8; cursor:pointer;';
                placeAtCursorBtn.onclick = () => {
                    if (typeof showToast === 'function') {
                        showToast('انقر داخل الملاحظة في المكان الذي تريد نقل الصورة إليه 📍');
                    }
                    const onPickTarget = (ev) => {
                        if (!editor.contains(ev.target) || figure.contains(ev.target)) return;
                        ev.preventDefault();
                        ev.stopPropagation();
                        let targetBlock = ev.target;
                        while (targetBlock && targetBlock.parentElement !== editor) {
                            targetBlock = targetBlock.parentElement;
                        }
                        if (targetBlock && targetBlock !== figure) {
                            targetBlock.after(figure);
                        } else {
                            editor.appendChild(figure);
                        }
                        editor.removeEventListener('click', onPickTarget, true);
                        if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                        if (typeof showToast === 'function') showToast('تم نقل الصورة إلى المكان المحدد ✅');
                    };
                    editor.addEventListener('click', onPickTarget, true);
                };

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.textContent = '🗑️ حذف';
                delBtn.style.cssText = 'padding:3px 9px; font-size:11px; border-radius:6px; border:1px solid #ef4444; background:#fee2e2; color:#991b1b; cursor:pointer;';
                delBtn.onclick = function () {
                    figure.remove();
                    if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                };

                controls.append(
                    sizeLabel,
                    shrinkFromRightBtn,
                    rangeSlider,
                    numInput,
                    pctSign,
                    shrinkFromLeftBtn,
                    expandBothSidesBtn,
                    upBtn,
                    downBtn,
                    placeAtCursorBtn,
                    delBtn
                );
                figure.append(img, caption, controls);
                attachSideDimensionControls(figure, img);

                rangeSlider.addEventListener('input', () => figure.__applyImageScalePercent?.(rangeSlider.value));
                numInput.addEventListener('change', () => figure.__applyImageScalePercent?.(numInput.value));
                numInput.addEventListener('input', () => {
                    if (numInput.value === '') return;
                    const v = parseInt(numInput.value, 10);
                    if (!Number.isNaN(v) && v >= 20 && v <= 100) {
                        figure.__applyImageScalePercent?.(v);
                    }
                });

                editor.focus();
                if (savedRange) {
                    savedRange.deleteContents();
                    savedRange.insertNode(figure);
                    const trailingP = document.createElement('p');
                    trailingP.innerHTML = '<br>';
                    figure.after(trailingP);
                    const nextRange = document.createRange();
                    nextRange.setStart(trailingP, 0);
                    nextRange.collapse(true);
                    const s = window.getSelection();
                    if (s) {
                        s.removeAllRanges();
                        s.addRange(nextRange);
                    }
                } else {
                    editor.appendChild(figure);
                    const trailingP = document.createElement('p');
                    trailingP.innerHTML = '<br>';
                    editor.appendChild(trailingP);
                }

                if (typeof isQuillModeActive !== 'undefined' && isQuillModeActive && typeof quillNoteEditor !== 'undefined' && quillNoteEditor) {
                    quillNoteEditor.root.innerHTML = editor.innerHTML;
                }

                if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                if (typeof notifyWatcherActivity === 'function') notifyWatcherActivity('notes');
            }

            window.handleNoteImageFilesSelected = function (event) {
                const files = Array.from((event && event.target && event.target.files) || []).filter(
                    f => f && f.type && f.type.startsWith('image/')
                );
                if (!files.length) return;

                let addedCount = 0;
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = function (ev) {
                        const dataUrl = ev && ev.target ? ev.target.result : '';
                        if (!dataUrl) return;
                        insertFigureElementIntoEditor(dataUrl, file.name);
                        addedCount++;
                        if (addedCount === files.length && typeof showToast === 'function') {
                            showToast(addedCount === 1 ? 'تمت إضافة الصورة مع تحكم يمين ويسار 🖼️' : `تمت إضافة ${addedCount} صور مع تحكم يمين ويسار 🖼️`);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            };
        })();

/* ===== Inline Script #4 ===== */
function insertMathFormulaBlock() {
            const editor = document.getElementById('wordRichEditor');
            if (!editor) return;
            const formula = prompt('أدخل صيغة LaTeX (مثال: \int_0^1 x^2\,dx أو \frac{-b \pm \sqrt{b^2-4ac}}{2a}):', '\frac{-b \pm \sqrt{b^2-4ac}}{2a}');
            if (!formula || !formula.trim()) return;

            const cleanFormula = formula.trim();
            const wrapper = document.createElement('div');
            wrapper.className = 'katex-formula-block';
            wrapper.setAttribute('data-latex', cleanFormula);
            wrapper.style.cssText = 'margin:10px 0; padding:10px 14px; border-radius:8px; background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a; text-align:center; direction:ltr;';

            if (window.katex && typeof window.katex.render === 'function') {
                try {
                    window.katex.render(cleanFormula, wrapper, { displayMode: true, throwOnError: false });
                } catch (_) {
                    wrapper.textContent = '$$' + cleanFormula + '$$';
                }
            } else {
                wrapper.textContent = '$$' + cleanFormula + '$$';
            }

            editor.focus();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(wrapper);
                range.setStartAfter(wrapper);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                editor.appendChild(wrapper);
            }

            if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
            if (typeof notifyWatcherActivity === 'function') notifyWatcherActivity('notes');
        }

        function renderAllMathInNote() {
            const editor = document.getElementById('wordRichEditor');
            if (!editor || !window.katex) return;

            editor.querySelectorAll('[data-latex]').forEach(el => {
                const tex = el.getAttribute('data-latex');
                if (tex) {
                    try {
                        window.katex.render(tex, el, { displayMode: true, throwOnError: false });
                    } catch (_) {}
                }
            });

            if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
        }

        let quillNoteEditor = null;
        let isQuillModeActive = false;

        function insertMarkdownIntoNote() {
            const editor = document.getElementById('wordRichEditor');
            if (!editor) return;
            if (typeof marked === 'undefined') {
                if (typeof showToast === 'function') showToast('مكتبة Marked.js غير متاحة حالياً');
                return;
            }
            const md = prompt('أدخل نص Markdown لتحويله إلى تنسيق منسق:', '### عنوان فرعي\n- **نقطة مهمة:** شرح مختصر\n- `code_example()`');
            if (!md || !md.trim()) return;
            const htmlOut = (window.Platform && window.Platform.markdownToSafeHtml)
                ? window.Platform.markdownToSafeHtml(md)
                : md.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
            const holder = document.createElement('div');
            holder.innerHTML = htmlOut;
            editor.appendChild(holder);
            if (window.hljs && typeof window.hljs.highlightElement === 'function') {
                holder.querySelectorAll('pre code').forEach(b => window.hljs.highlightElement(b));
            }
            if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
            if (typeof notifyWatcherActivity === 'function') notifyWatcherActivity('notes');
        }

        function highlightCodeBlocksInNote() {
            const editor = document.getElementById('wordRichEditor');
            if (!editor) return;
            if (!window.hljs || typeof window.hljs.highlightElement !== 'function') {
                if (typeof showToast === 'function') showToast('مكتبة Highlight.js غير متاحة حالياً');
                return;
            }
            editor.querySelectorAll('pre, code').forEach(el => {
                window.hljs.highlightElement(el);
            });
            if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
        }

        function toggleQuillModernMode() {
            const box = document.getElementById('quillModernContainer');
            const wordSheet = document.getElementById('notePageSheet');
            const editor = document.getElementById('wordRichEditor');
            if (!box || !wordSheet || !editor) return;

            if (!isQuillModeActive) {
                if (typeof Quill === 'undefined') {
                    if (typeof showToast === 'function') showToast('مكتبة Quill.js غير متاحة حالياً');
                    return;
                }
                if (!quillNoteEditor) {
                    quillNoteEditor = new Quill('#quillModernEditor', {
                        theme: 'snow',
                        modules: {
                            toolbar: [
                                [{ header: [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ list: 'ordered' }, { list: 'bullet' }],
                                ['blockquote', 'code-block'],
                                ['clean']
                            ]
                        }
                    });
                }
                quillNoteEditor.root.innerHTML = editor.innerHTML;
                box.classList.remove('hidden');
                wordSheet.classList.add('hidden');
                isQuillModeActive = true;
            } else {
                if (quillNoteEditor) {
                    editor.innerHTML = quillNoteEditor.root.innerHTML;
                }
                box.classList.add('hidden');
                wordSheet.classList.remove('hidden');
                isQuillModeActive = false;
                if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
            }
        }

        function insertSymbolIntoNote(sym) {
            const editor = document.getElementById('wordRichEditor');
            if (!editor) return;
            editor.focus();
            if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, sym);
            } else {
                editor.textContent = (editor.textContent || '') + sym;
            }
            if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
            if (typeof notifyWatcherActivity === 'function') notifyWatcherActivity('notes');
        }

        function organizeNoteTopLayout() {
            const shell = document.querySelector('.word-workspace-shell');
            const strip = document.querySelector('.top-symbols-strip');
            const tabs = document.querySelector('.word-ribbon-tabs');
            if (shell && strip && tabs && tabs.parentElement === shell) {
                shell.insertBefore(strip, tabs);
            }
            if (typeof showToast === 'function') showToast('تم تنظيم الرموز في الأعلى ⬆️');
        }

        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                renderAllMathInNote();
                highlightCodeBlocksInNote();
            }, 400);
        });

/* ===== Inline Script #5 ===== */
(function () {
            const fileInput = document.getElementById('i2vFileInput');
            const dropzone = document.getElementById('i2vDropzone');
            const slideList = document.getElementById('i2vSlideList');
            const clearBtn = document.getElementById('i2vClearBtn');
            const previewBtn = document.getElementById('i2vPreviewBtn');
            const generateBtn = document.getElementById('i2vGenerateBtn');
            const stopBtn = document.getElementById('i2vStopBtn');
            const clearVideoBtn = document.getElementById('i2vClearVideoBtn');
            const canvas = document.getElementById('i2vCanvas');
            const progressBar = document.getElementById('i2vProgressBar');
            const statusEl = document.getElementById('i2vStatus');
            const countBadge = document.getElementById('i2vSlideCountBadge');
            const durationBadge = document.getElementById('i2vTotalDurationBadge');
            const durationInput = document.getElementById('i2vDuration');
            const motionSelect = document.getElementById('i2vMotion');
            const ratioSelect = document.getElementById('i2vRatio');
            const fpsSelect = document.getElementById('i2vFps');
            const captionInput = document.getElementById('i2vCaption');
            const audioInput = document.getElementById('i2vAudioInput');
            const resultBox = document.getElementById('i2vResultBox');
            const resultVideo = document.getElementById('i2vResultVideo');
            const downloadLink = document.getElementById('i2vDownloadLink');
            const playResultBtn = document.getElementById('i2vPlayResultBtn');
            const deleteResultInlineBtn = document.getElementById('i2vDeleteResultInlineBtn');
            const sendToNoteBtn = document.getElementById('i2vSendToNoteBtn');
            const publishProjectBtn = document.getElementById('i2vPublishProjectBtn');

            if (!fileInput || !canvas) return;

            let userSlides = [];
            let isRunning = false;
            let stopRequested = false;
            let activeRecorder = null;
            let currentVideoUrl = '';

            window.addSampleSlides = function () { return []; };
            window.loadSampleSlides = function () { return []; };
            window.getSlides = function () { return userSlides.slice(); };

            function setStatus(msg) {
                if (statusEl) statusEl.textContent = msg;
            }

            function setProgress(pct) {
                if (progressBar) progressBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
            }

            function getRatioDimensions() {
                const ratio = ratioSelect ? ratioSelect.value : '16:9';
                if (ratio === '1:1') return { width: 1080, height: 1080 };
                if (ratio === '9:16') return { width: 720, height: 1280 };
                return { width: 1280, height: 720 };
            }

            function updateSummary() {
                const perSlide = Math.max(0.5, parseFloat(durationInput?.value) || 2.5);
                if (countBadge) countBadge.textContent = 'عدد الصور: ' + userSlides.length;
                if (durationBadge) durationBadge.textContent = 'المدة التقديرية: ' + (userSlides.length * perSlide).toFixed(1) + ' ثانية';
            }

            function moveSlide(index, delta) {
                const target = index + delta;
                if (target < 0 || target >= userSlides.length) return;
                const copy = userSlides.slice();
                const [item] = copy.splice(index, 1);
                copy.splice(target, 0, item);
                userSlides = copy;
                renderSlideList();
            }

            function removeSlide(index) {
                const removed = userSlides[index];
                if (removed && removed.url) {
                    try { URL.revokeObjectURL(removed.url); } catch (_) {}
                }
                userSlides.splice(index, 1);
                renderSlideList();
            }

            function renderSlideList() {
                updateSummary();
                if (!slideList) return;
                slideList.innerHTML = '';

                if (!userSlides.length) {
                    const empty = document.createElement('div');
                    empty.className = 'slide-sub';
                    empty.style.cssText = 'text-align:center; padding:14px;';
                    empty.textContent = 'لا توجد صور مضافة بعد. أضف صورك ليتم استخدامها فقط في الفيديو.';
                    slideList.appendChild(empty);
                    return;
                }

                userSlides.forEach((slide, idx) => {
                    const row = document.createElement('div');
                    row.className = 'slide-item';
                    row.draggable = true;

                    row.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', String(idx));
                    });
                    row.addEventListener('dragover', (e) => e.preventDefault());
                    row.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!Number.isNaN(fromIdx) && fromIdx !== idx) {
                            const copy = userSlides.slice();
                            const [moved] = copy.splice(fromIdx, 1);
                            copy.splice(idx, 0, moved);
                            userSlides = copy;
                            renderSlideList();
                        }
                    });

                    const thumb = document.createElement('img');
                    thumb.src = slide.url;
                    thumb.alt = slide.name;
                    thumb.className = 'slide-thumb';

                    const meta = document.createElement('div');
                    meta.className = 'slide-meta';
                    const title = document.createElement('div');
                    title.className = 'slide-title';
                    title.textContent = (idx + 1) + '. ' + slide.name;
                    const sub = document.createElement('div');
                    sub.className = 'slide-sub';
                    sub.textContent = (slide.width || 0) + '×' + (slide.height || 0);
                    meta.appendChild(title);
                    meta.appendChild(sub);

                    const actions = document.createElement('div');
                    actions.className = 'slide-actions';

                    const upBtn = document.createElement('button');
                    upBtn.type = 'button';
                    upBtn.className = 'icon-btn';
                    upBtn.textContent = '↑';
                    upBtn.disabled = idx === 0;
                    upBtn.onclick = () => moveSlide(idx, -1);

                    const downBtn = document.createElement('button');
                    downBtn.type = 'button';
                    downBtn.className = 'icon-btn';
                    downBtn.textContent = '↓';
                    downBtn.disabled = idx === userSlides.length - 1;
                    downBtn.onclick = () => moveSlide(idx, 1);

                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.className = 'icon-btn';
                    delBtn.textContent = '✕';
                    delBtn.onclick = () => removeSlide(idx);

                    actions.appendChild(upBtn);
                    actions.appendChild(downBtn);
                    actions.appendChild(delBtn);

                    row.appendChild(thumb);
                    row.appendChild(meta);
                    row.appendChild(actions);
                    slideList.appendChild(row);
                });
            }

            function loadImageElement(srcUrl) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('تعذر تحميل الصورة'));
                    img.src = srcUrl;
                });
            }

            async function addFiles(fileList) {
                if (!fileList || !fileList.length) return;
                const imageFiles = Array.from(fileList).filter(f => f && f.type && f.type.startsWith('image/'));
                for (const file of imageFiles) {
                    const url = URL.createObjectURL(file);
                    try {
                        const img = await loadImageElement(url);
                        userSlides.push({
                            name: file.name,
                            url: url,
                            img: img,
                            width: img.naturalWidth || img.width,
                            height: img.naturalHeight || img.height
                        });
                    } catch (_) {
                        try { URL.revokeObjectURL(url); } catch (__) {}
                    }
                }
                renderSlideList();
                setStatus('تمت إضافة ' + userSlides.length + ' صورة من جهازك.');
            }

            function drawUserSlideFrame(ctx, w, h, slide, progress) {
                ctx.fillStyle = '#090d16';
                ctx.fillRect(0, 0, w, h);

                const img = slide.img;
                if (!img) return;

                const imgRatio = (img.naturalWidth || img.width || 1) / (img.naturalHeight || img.height || 1);
                const boxRatio = w / h;
                let baseW, baseH;
                if (imgRatio > boxRatio) {
                    baseW = w;
                    baseH = w / imgRatio;
                } else {
                    baseH = h;
                    baseW = h * imgRatio;
                }

                const motion = motionSelect ? motionSelect.value : 'zoomIn';
                let scale = 1.0;
                let offsetX = 0;
                let offsetY = 0;

                if (motion === 'zoomIn') {
                    scale = 1.0 + 0.08 * progress;
                } else if (motion === 'zoomOut') {
                    scale = 1.08 - 0.08 * progress;
                } else if (motion === 'panRight') {
                    scale = 1.06;
                    offsetX = (progress - 0.5) * (w * 0.05);
                } else if (motion === 'panLeft') {
                    scale = 1.06;
                    offsetX = (0.5 - progress) * (w * 0.05);
                }

                const drawW = baseW * scale;
                const drawH = baseH * scale;
                const drawX = (w - drawW) / 2 + offsetX;
                const drawY = (h - drawH) / 2 + offsetY;

                ctx.drawImage(img, drawX, drawY, drawW, drawH);

                const userCaption = (captionInput?.value || '').trim();
                if (userCaption) {
                    const barH = Math.max(44, Math.round(h * 0.08));
                    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
                    ctx.fillRect(0, h - barH, w, barH);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold ' + Math.max(18, Math.round(h * 0.033)) + 'px Tahoma, Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(userCaption, w / 2, h - barH / 2);
                }
            }

            async function runTimeline(recordMode) {
                if (isRunning) return;
                if (!userSlides.length) {
                    setStatus('يرجى رفع صورة واحدة على الأقل أولاً. لا يتم إنشاء شرائح أو نصوص تلقائية.');
                    if (typeof showToast === 'function') {
                        showToast('ارفع صورك أولاً؛ لن يتم إضافة أي صور أو نصوص تلقائية');
                    }
                    return;
                }

                const dims = getRatioDimensions();
                canvas.width = dims.width;
                canvas.height = dims.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                isRunning = true;
                stopRequested = false;
                if (stopBtn) stopBtn.disabled = false;
                if (generateBtn) generateBtn.disabled = true;
                if (previewBtn) previewBtn.disabled = true;

                const fps = Math.max(15, Math.min(60, parseInt(fpsSelect?.value, 10) || 30));
                const perSlideSec = Math.max(0.5, parseFloat(durationInput?.value) || 2.5);
                const framesPerSlide = Math.max(1, Math.round(perSlideSec * fps));
                const totalFrames = userSlides.length * framesPerSlide;

                let recorder = null;
                let chunks = [];
                let audioCtx = null;
                let audioEl = null;

                if (recordMode) {
                    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
                        setStatus('المتصفح الحالي لا يدعم تسجيل الفيديو من الكانفاس.');
                        isRunning = false;
                        if (stopBtn) stopBtn.disabled = true;
                        if (generateBtn) generateBtn.disabled = false;
                        if (previewBtn) previewBtn.disabled = false;
                        return;
                    }

                    const stream = canvas.captureStream(fps);
                    const audioFile = audioInput?.files?.[0];
                    if (audioFile) {
                        try {
                            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            audioEl = new Audio(URL.createObjectURL(audioFile));
                            audioEl.loop = true;
                            const srcNode = audioCtx.createMediaElementSource(audioEl);
                            const destNode = audioCtx.createMediaStreamDestination();
                            srcNode.connect(destNode);
                            srcNode.connect(audioCtx.destination);
                            destNode.stream.getAudioTracks().forEach(t => stream.addTrack(t));
                            await audioEl.play().catch(() => {});
                        } catch (_) {}
                    }

                    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
                    const chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
                    recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
                    recorder.ondataavailable = (ev) => {
                        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
                    };
                    recorder.start(200);
                    activeRecorder = recorder;
                }

                let frameCount = 0;
                for (let s = 0; s < userSlides.length; s++) {
                    if (stopRequested) break;
                    const slide = userSlides[s];
                    for (let f = 0; f < framesPerSlide; f++) {
                        if (stopRequested) break;
                        const p = framesPerSlide === 1 ? 1 : f / (framesPerSlide - 1);
                        drawUserSlideFrame(ctx, canvas.width, canvas.height, slide, p);
                        frameCount++;
                        setProgress((frameCount / totalFrames) * 100);
                        setStatus((recordMode ? 'جاري توليد الفيديو من صورك...' : 'معاينة صورك...') + ' (' + (s + 1) + '/' + userSlides.length + ')');
                        await new Promise(r => setTimeout(r, 1000 / fps));
                    }
                }

                if (audioEl) {
                    try { audioEl.pause(); URL.revokeObjectURL(audioEl.src); } catch (_) {}
                }
                if (audioCtx) {
                    try { audioCtx.close(); } catch (_) {}
                }

                if (recordMode && recorder && recorder.state !== 'inactive') {
                    await new Promise((resolve) => {
                        recorder.onstop = resolve;
                        recorder.stop();
                    });
                    if (chunks.length && !stopRequested) {
                        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
                        if (currentVideoUrl) {
                            try { URL.revokeObjectURL(currentVideoUrl); } catch (_) {}
                        }
                        currentVideoUrl = URL.createObjectURL(blob);
                        if (resultVideo) {
                            resultVideo.src = currentVideoUrl;
                            resultVideo.load();
                        }
                        if (downloadLink) {
                            downloadLink.href = currentVideoUrl;
                            downloadLink.download = 'my-images-video.webm';
                        }
                        if (resultBox) resultBox.style.display = 'block';
                        setProgress(100);
                        setStatus('تم توليد الفيديو بنجاح باستخدام صورك فقط.');
                    } else {
                        setStatus('تم إيقاف توليد الفيديو.');
                    }
                } else {
                    setStatus(stopRequested ? 'تم إيقاف المعاينة.' : 'انتهت معاينة صورك.');
                }

                isRunning = false;
                activeRecorder = null;
                if (stopBtn) stopBtn.disabled = true;
                if (generateBtn) generateBtn.disabled = false;
                if (previewBtn) previewBtn.disabled = false;
            }

            function stopCurrentProcess() {
                stopRequested = true;
                if (activeRecorder && activeRecorder.state !== 'inactive') {
                    try { activeRecorder.stop(); } catch (_) {}
                }
            }

            function clearAllUserSlides() {
                stopCurrentProcess();
                userSlides.forEach(s => {
                    if (s && s.url) {
                        try { URL.revokeObjectURL(s.url); } catch (_) {}
                    }
                });
                userSlides = [];
                fileInput.value = '';
                renderSlideList();
                setProgress(0);
                setStatus('تم مسح جميع الصور.');
            }

            function deleteGeneratedVideo() {
                if (resultVideo) {
                    resultVideo.pause();
                    resultVideo.removeAttribute('src');
                    resultVideo.load();
                }
                if (currentVideoUrl) {
                    try { URL.revokeObjectURL(currentVideoUrl); } catch (_) {}
                    currentVideoUrl = '';
                }
                if (resultBox) resultBox.style.display = 'none';
                setStatus('تم حذف الفيديو الناتج.');
            }

            if (dropzone) {
                dropzone.addEventListener('click', () => fileInput.click());
                dropzone.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInput.click();
                    }
                });
                dropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropzone.classList.add('dragover');
                });
                dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
                dropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropzone.classList.remove('dragover');
                    addFiles(e.dataTransfer?.files);
                });
            }

            fileInput.addEventListener('change', (e) => {
                addFiles(e.target?.files);
            });

            if (durationInput) {
                durationInput.addEventListener('input', updateSummary);
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', clearAllUserSlides);
            }
            if (previewBtn) {
                previewBtn.addEventListener('click', () => runTimeline(false));
            }
            if (generateBtn) {
                generateBtn.addEventListener('click', () => runTimeline(true));
            }
            if (stopBtn) {
                stopBtn.addEventListener('click', stopCurrentProcess);
            }
            if (clearVideoBtn) {
                clearVideoBtn.addEventListener('click', deleteGeneratedVideo);
            }
            if (deleteResultInlineBtn) {
                deleteResultInlineBtn.addEventListener('click', deleteGeneratedVideo);
            }
            if (playResultBtn && resultVideo) {
                playResultBtn.addEventListener('click', () => {
                    if (resultVideo.src) resultVideo.play().catch(() => {});
                });
            }
            if (sendToNoteBtn) {
                sendToNoteBtn.addEventListener('click', () => {
                    const editor = document.getElementById('wordRichEditor');
                    if (editor && userSlides.length) {
                        const info = document.createElement('p');
                        info.textContent = 'فيديو مولّد من ' + userSlides.length + ' صورة مرفوعة: ' + userSlides.map(s => s.name).join('، ');
                        editor.appendChild(info);
                        if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                        if (typeof showToast === 'function') showToast('تم إرسال معلومات صورك إلى الملاحظة');
                    }
                });
            }
            if (publishProjectBtn) {
                publishProjectBtn.addEventListener('click', () => {
                    if (typeof openShareModal === 'function') {
                        openShareModal();
                        const titleEl = document.getElementById('shareProjTitle');
                        const contentEl = document.getElementById('shareProjContent');
                        if (titleEl && !titleEl.value) titleEl.value = 'عرض صور المشروع (' + userSlides.length + ' صورة)';
                        if (contentEl && !contentEl.value) contentEl.value = 'الصور المستخدمة:\n' + userSlides.map((s, i) => (i + 1) + '. ' + s.name).join('\n');
                    }
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isRunning) {
                    stopCurrentProcess();
                }
            });

            window.generateVideoFromUserImages = function () {
                return runTimeline(true);
            };
            window.previewUserImagesSlideshow = function () {
                return runTimeline(false);
            };

            function triggerGenerateVideoAction(ev) {
                if (ev) {
                    ev.preventDefault();
                }
                if (isRunning) {
                    setStatus('جاري التوليد حالياً...');
                    return;
                }
                try {
                    runTimeline(true);
                } catch (err) {
                    const msg = 'تعذر بدء التوليد: ' + (err && err.message ? err.message : String(err));
                    setStatus(msg);
                    if (typeof showToast === 'function') showToast(msg);
                }
            }

            if (generateBtn) {
                generateBtn.onclick = triggerGenerateVideoAction;
                generateBtn.addEventListener('click', triggerGenerateVideoAction, true);
            }

            document.addEventListener('click', (e) => {
                const targetBtn = e.target && e.target.closest ? e.target.closest('#i2vGenerateBtn, [data-action="generate-video"]') : null;
                if (targetBtn) {
                    triggerGenerateVideoAction(e);
                }
            }, true);

            userSlides = [];
            renderSlideList();
        })();

/* ===== Inline Script #6 ===== */
(function () {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                    navigator.serviceWorker.register('./sw.js').catch(function () {});
                });
            }

            let deferredInstallPrompt = null;
            window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                deferredInstallPrompt = e;
            });

            const originalTrigger = window.triggerPwaInstall;
            window.triggerPwaInstall = async function () {
                if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    try {
                        await deferredInstallPrompt.userChoice;
                    } catch (_) {}
                    deferredInstallPrompt = null;
                    return;
                }
                if (typeof originalTrigger === 'function') {
                    return originalTrigger();
                }
                const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
                const msg = isIos
                    ? 'لتثبيت التطبيق على آيفون: اضغط زر المشاركة ⬆️ ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                    : 'لتثبيت التطبيق: افتح قائمة المتصفح (⋮) بالأعلى واختر "تثبيت التطبيق" (Install app).';
                if (typeof showToast === 'function') {
                    showToast(msg);
                } else {
                    alert(msg);
                }
            };
        })();

/* ===== Inline Script #7 ===== */
(function () {
            const SCIENTIFIC_ENDPOINTS = {
                openAlex: 'https://api.openalex.org/works',
                wikipediaAr: 'https://ar.wikipedia.org/w/api.php',
                wikipediaEn: 'https://en.wikipedia.org/w/api.php',
                wikidata: 'https://www.wikidata.org/w/api.php'
            };

            function normalizeScientificQuery(raw) {
                return String(raw || '')
                    .replace(/[؟?!.,،؛:()\[\]{}"']/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            window.evaluateScienceMath = function (expr) {
                const cleaned = String(expr || '').trim();
                if (!cleaned) return { ok: false, error: 'EMPTY' };

                if (window.math && typeof window.math.evaluate === 'function') {
                    try {
                        return { ok: true, engine: 'math.js', value: window.math.evaluate(cleaned) };
                    } catch (err) {
                        return { ok: false, engine: 'math.js', error: String(err.message || err) };
                    }
                }

                const safeMath = cleaned.replace(/\^/g, '**').replace(/[^0-9+\-*/().%\s]/g, '');
                if (!safeMath.trim() || !/[0-9]/.test(safeMath)) {
                    return { ok: false, engine: 'fallback', error: 'UNSUPPORTED' };
                }

                try {
                    const out = Function(`"use strict"; return (${safeMath});`)();
                    if (typeof out === 'number' && Number.isFinite(out)) {
                        return { ok: true, engine: 'fallback', value: out };
                    }
                    return { ok: false, engine: 'fallback', error: 'NON_FINITE' };
                } catch (err) {
                    return { ok: false, engine: 'fallback', error: String(err.message || err) };
                }
            };

            window.solveSymbolicScience = function (expressionOrEq) {
                const input = String(expressionOrEq || '').trim();
                if (!input || typeof window.nerdamer !== 'function') return null;
                try {
                    return String(window.nerdamer(input).evaluate());
                } catch (_) {
                    return null;
                }
            };

            window.searchOpenAlexPapers = async function (query, limit = 3) {
                const q = normalizeScientificQuery(query);
                if (!q) return [];
                try {
                    const res = await fetch(`${SCIENTIFIC_ENDPOINTS.openAlex}?search=${encodeURIComponent(q)}&per-page=${limit}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return (Array.isArray(data?.results) ? data.results : []).map(w => ({
                        source: 'OpenAlex',
                        title: w.title || '',
                        year: w.publication_year || '',
                        citedBy: Number(w.cited_by_count || 0),
                        doi: w.doi || ''
                    }));
                } catch (_) {
                    return [];
                }
            };

            window.searchWikipediaScience = async function (query, lang = 'ar') {
                const q = normalizeScientificQuery(query);
                if (!q) return null;
                const endpoint = lang === 'en' ? SCIENTIFIC_ENDPOINTS.wikipediaEn : SCIENTIFIC_ENDPOINTS.wikipediaAr;
                try {
                    const searchUrl = `${endpoint}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`;
                    const sRes = await fetch(searchUrl);
                    if (!sRes.ok) return null;
                    const sJson = await sRes.json();
                    const title = sJson?.query?.search?.[0]?.title;
                    if (!title) return null;

                    const extUrl = `${endpoint}?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
                    const eRes = await fetch(extUrl);
                    if (!eRes.ok) return null;
                    const eJson = await eRes.json();
                    const pages = eJson?.query?.pages || {};
                    const page = Object.values(pages)[0];
                    if (!page || !page.extract) return null;

                    return {
                        source: lang === 'en' ? 'Wikipedia (EN)' : 'Wikipedia (AR)',
                        title: page.title || title,
                        extract: String(page.extract).slice(0, 700)
                    };
                } catch (_) {
                    return null;
                }
            };

            window.buildScientificAiContext = async function (promptText) {
                const q = normalizeScientificQuery(promptText);
                if (!q) return '';

                const exprMatch = q.match(/[0-9]+(?:\s*[+\-*/^().%]\s*[0-9]+)+/);
                const mathCalc = exprMatch ? window.evaluateScienceMath(exprMatch[0]) : null;
                const symbolic = window.solveSymbolicScience(q);

                const [wikiAr, papers] = await Promise.all([
                    window.searchWikipediaScience(q, 'ar'),
                    window.searchOpenAlexPapers(q, 3)
                ]);
                const wiki = wikiAr || (await window.searchWikipediaScience(q, 'en'));

                const parts = [];
                if (mathCalc && mathCalc.ok) {
                    parts.push(`نتيجة حسابية (${exprMatch[0]}): ${mathCalc.value} [${mathCalc.engine}]`);
                }
                if (symbolic) {
                    parts.push(`تحليل رمزي (nerdamer): ${symbolic}`);
                }
                if (wiki && wiki.extract) {
                    parts.push(`موسوعة (${wiki.source} - ${wiki.title}): ${wiki.extract}`);
                }
                if (papers.length) {
                    parts.push('أبحاث علمية (OpenAlex): ' + papers.map(p => `${p.title} (${p.year}, اقتباسات: ${p.citedBy})`).join(' | '));
                }
                return parts.join('\n');
            };
        })();

/* ===== Inline Script #8 ===== */
(function () {
            window.wantsSourcesInPrompt = function (text) {
                const t = String(text || "").toLowerCase();
                return /(مرجع|مراجع|مصدر|مصادر|بحث|أبحاث|دراسة|دراسات|اقتباس|اقتباسات|موسوعة|ويكيبيديا|openalex|source|sources|reference|references|citation|citations|paper|papers)/i.test(t);
            };

            window.isSimpleArithmeticPrompt = function (text) {
                const cleaned = String(text || "")
                    .replace(/^(احسب|ما هو|ما ناتج|كم يساوي|يساوي|calculate|compute|what is)\s+/i, "")
                    .replace(/[؟?=.،]+$/g, "")
                    .trim();
                return /^[0-9]+(?:\s*[+\-*/^().%×÷]\s*[0-9]+)+$/.test(cleaned);
            };

            window.formatDirectAiAnswer = function (questionText, rawReplyText) {
                const q = String(questionText || "").trim();
                const reply = String(rawReplyText || "").trim();
                const wantsRefs = window.wantsSourcesInPrompt(q);

                if (!wantsRefs && window.isSimpleArithmeticPrompt(q) && typeof window.evaluateScienceMath === "function") {
                    const exprMatch = q.match(/[0-9]+(?:\s*[+\-*/^().%×÷]\s*[0-9]+)+/);
                    if (exprMatch) {
                        const normalizedExpr = exprMatch[0].replace(/×/g, "*").replace(/÷/g, "/");
                        const calc = window.evaluateScienceMath(normalizedExpr);
                        if (calc && calc.ok && typeof calc.value !== "undefined") {
                            return "يساوي " + calc.value;
                        }
                    }
                }

                if (!wantsRefs && reply) {
                    const stripped = reply
                        .replace(/\[?المراجع العلمية المرفقة:[\s\S]*$/i, "")
                        .replace(/(?:^|\n)\s*(?:المراجع|المصادر|References|Sources)\s*:[\s\S]*$/i, "")
                        .trim();
                    return stripped || reply;
                }

                return reply;
            };

            function appendAiBubble(containerId, role, text) {
                const box = document.getElementById(containerId);
                if (!box) return;
                const row = document.createElement("div");
                row.style.cssText = role === "user"
                    ? "margin:8px 0; padding:9px 12px; border-radius:8px; background:rgba(37,99,235,0.22); border:1px solid rgba(56,189,248,0.35); color:#f8fafc; font-size:13px;"
                    : "margin:8px 0; padding:9px 12px; border-radius:8px; background:rgba(15,23,42,0.92); border:1px solid rgba(148,163,184,0.3); color:#e2e8f0; font-size:13px; white-space:pre-wrap;";
                const label = document.createElement("strong");
                label.style.color = role === "user" ? "#38bdf8" : "#34d399";
                label.textContent = role === "user" ? "أنت: " : "الذكاء الاصطناعي: ";
                const body = document.createElement("span");
                body.textContent = text;
                row.append(label, body);
                box.appendChild(row);
                box.scrollTop = box.scrollHeight;
            }

            window.askAiDirectEngine = async function (questionText, targetChatContainerId) {
                const q = String(questionText || "").trim();
                if (!q) return "";
                const includeRefs = window.wantsSourcesInPrompt(q);

                if (window.isSimpleArithmeticPrompt(q) && typeof window.evaluateScienceMath === "function") {
                    const exprMatch = q.match(/[0-9]+(?:\s*[+\-*/^().%×÷]\s*[0-9]+)+/);
                    if (exprMatch) {
                        const normalizedExpr = exprMatch[0].replace(/×/g, "*").replace(/÷/g, "/");
                        const calc = window.evaluateScienceMath(normalizedExpr);
                        if (calc && calc.ok && typeof calc.value !== "undefined") {
                            const ans = includeRefs
                                ? `يساوي ${calc.value}
المصدر: محرك الحساب الرياضي (${calc.engine})`
                                : `يساوي ${calc.value}`;
                            if (targetChatContainerId) appendAiBubble(targetChatContainerId, "ai", ans);
                            return ans;
                        }
                    }
                }

                let sciCtx = "";
                if (includeRefs && typeof window.buildScientificAiContext === "function") {
                    try {
                        sciCtx = await window.buildScientificAiContext(q);
                    } catch (_) {}
                }

                if (typeof window.callGeminiOrAiModel === "function") {
                    try {
                        const promptToSend = includeRefs && sciCtx
                            ? `${q}
[المراجع المطلوبة:
${sciCtx}
]`
                            : `${q}
[أجب بشكل مباشر ومختصر دون ذكر مراجع أو مصادر إلا إذا طلب المستخدم ذلك صراحة.]`;
                        const modelOut = await window.callGeminiOrAiModel(promptToSend);
                        if (modelOut && String(modelOut).trim()) {
                            const finalReply = window.formatDirectAiAnswer(q, String(modelOut).trim());
                            if (targetChatContainerId) appendAiBubble(targetChatContainerId, "ai", finalReply);
                            return finalReply;
                        }
                    } catch (_) {}
                }

                let fallbackReply = "";
                if (includeRefs && sciCtx) {
                    fallbackReply = `النتيجة والمراجع لـ "${q}":
${sciCtx}`;
                } else {
                    const sym = typeof window.solveSymbolicScience === "function" ? window.solveSymbolicScience(q) : null;
                    if (sym) {
                        fallbackReply = `النتيجة: ${sym}`;
                    } else if (typeof window.searchWikipediaScience === "function") {
                        const wiki = (await window.searchWikipediaScience(q, "ar")) || (await window.searchWikipediaScience(q, "en"));
                        if (wiki && wiki.extract) {
                            const firstSent = String(wiki.extract).split(/[.،\n]/)[0].trim();
                            fallbackReply = firstSent || String(wiki.extract).slice(0, 240);
                        }
                    }
                    if (!fallbackReply) {
                        fallbackReply = `تم استلام سؤالك: "${q}". اكتب "مع المراجع" إذا أردت مصادر وأبحاثاً مرفقة.`;
                    }
                }

                const cleanOut = window.formatDirectAiAnswer(q, fallbackReply);
                if (targetChatContainerId) appendAiBubble(targetChatContainerId, "ai", cleanOut);
                return cleanOut;
            };

            document.addEventListener("DOMContentLoaded", function () {
                const aiInput = document.getElementById("aiChatInput");
                const aiSection = document.getElementById("section-aiAssistant");
                if (!aiInput || !aiSection) return;

                const sendBtn = aiSection.querySelector('button[onclick*="sendAiMessage"]');
                const interceptDirectSend = function (e) {
                    const q = (aiInput.value || "").trim();
                    if (!q) return;
                    if (window.isSimpleArithmeticPrompt(q) || window.wantsSourcesInPrompt(q)) {
                        if (e) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                        }
                        appendAiBubble("aiChatMessages", "user", q);
                        aiInput.value = "";
                        window.askAiDirectEngine(q, "aiChatMessages");
                    }
                };

                if (sendBtn) {
                    sendBtn.addEventListener("click", interceptDirectSend, true);
                }
                aiInput.addEventListener("keydown", function (e) {
                    if (e.key === "Enter") {
                        interceptDirectSend(e);
                    }
                }, true);
            });
        })();

/* ===== Inline Script #9 ===== */
(function () {
            window.switchAdvAiTab = function (tabName, btnEl) {
                document.querySelectorAll('.adv-ai-tab').forEach(b => b.classList.remove('active'));
                if (btnEl) btnEl.classList.add('active');
                ['rag', 'agents', 'transformers', 'tools'].forEach(key => {
                    const panel = document.getElementById('advPanel-' + key);
                    if (panel) panel.classList.toggle('hidden', key !== tabName);
                });
            };

            function collectNoteChunks() {
                const chunks = [];
                const editor = document.getElementById('wordRichEditor');
                const titleInput = document.getElementById('activeNoteTitle');
                const docTitle = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'المستند الحالي';
                if (editor) {
                    const rawText = (editor.innerText || editor.textContent || '').trim();
                    if (rawText) {
                        const paras = rawText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 3);
                        paras.forEach((p, idx) => {
                            chunks.push({
                                source: docTitle + ' (مقطع #' + (idx + 1) + ')',
                                text: p
                            });
                        });
                    }
                }
                if (Array.isArray(window.notesData)) {
                    window.notesData.forEach((n, nIdx) => {
                        const t = (n && n.title) ? String(n.title) : ('ملاحظة ' + (nIdx + 1));
                        const plain = String((n && n.content) || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        if (plain) {
                            chunks.push({ source: t, text: plain.slice(0, 400) });
                        }
                    });
                }
                if (!chunks.length) {
                    chunks.push({
                        source: 'دليل المنصة',
                        text: 'لا توجد نصوص كافية في دفتر الملاحظات بعد. اكتب ملاحظاتك أو أضف مستنداً ثم أعد البحث.'
                    });
                }
                return chunks;
            }

            window.indexNotesForRag = function () {
                const chunks = collectNoteChunks();
                window.__ragIndexedChunks = chunks;
                const out = document.getElementById('ragOutputBox');
                if (out) {
                    out.textContent = 'تمت فهرسة ' + chunks.length + ' مقطعاً من المستندات والملاحظات بنجاح.';
                }
            };

            window.runLocalRagSearch = function () {
                const q = String(document.getElementById('ragQueryInput')?.value || '').trim();
                const out = document.getElementById('ragOutputBox');
                if (!out) return;
                const chunks = Array.isArray(window.__ragIndexedChunks) && window.__ragIndexedChunks.length
                    ? window.__ragIndexedChunks
                    : collectNoteChunks();

                if (!q) {
                    out.textContent = 'أدخل كلمة أو سؤالاً للبحث الدلالي في ' + chunks.length + ' مقطعاً مفهرساً.';
                    return;
                }
                const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
                const scored = chunks.map(ch => {
                    const lower = ch.text.toLowerCase();
                    let score = 0;
                    terms.forEach(term => {
                        if (lower.includes(term)) score += 2;
                    });
                    return { ...ch, score };
                }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

                if (!scored.length) {
                    out.textContent = 'لم يتم العثور على تطابق مباشر لـ "' + q + '" في الملاحظات المفهرسة (' + chunks.length + ' مقطع).';
                    return;
                }
                out.textContent = scored.map((item, i) =>
                    (i + 1) + ') [المصدر: ' + item.source + ' | مطابقة: ' + item.score + ']\n' + item.text
                ).join('\n\n');
            };

            window.runMultiAgentWorkflow = function () {
                const goal = String(document.getElementById('multiAgentGoalInput')?.value || '').trim();
                const out = document.getElementById('multiAgentOutputBox');
                if (!out) return;
                if (!goal) {
                    out.textContent = 'يرجى كتابة موضوع أو إشكالية أولاً لتشغيل خط الوكلاء.';
                    return;
                }
                const state = {
                    topic: goal,
                    researcher: 'الوكيل الباحث: جمع المحاور الأساسية المرتبطة بـ "' + goal + '" وتحديد الفرضيات والقيود.',
                    analyst: 'الوكيل المحلل: قارن بين النهج العملي والنظري وحدد نقاط القوة والمخاطر المحتملة.',
                    critic: 'الوكيل المدقق: راجع الاستنتاجات، وأوصى بإضافة شواهد قابلة للقياس قبل الاعتماد النهائي.'
                };
                out.textContent = [
                    '• ' + state.researcher,
                    '• ' + state.analyst,
                    '• ' + state.critic
                ].join('\n\n');
            };

            window.runTransformersJsExperiment = async function () {
                const task = document.getElementById('tjsTaskSelect')?.value || 'sentiment-analysis';
                const text = String(document.getElementById('tjsInputText')?.value || '').trim();
                const out = document.getElementById('tjsOutputBox');
                if (!out) return;
                if (!text) {
                    out.textContent = 'أدخل نصاً لاختبار Transformers.js.';
                    return;
                }

                const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
                out.textContent = 'جاري فحص WebGPU (' + (hasWebGpu ? 'متاح' : 'غير متاح - استخدام WASM/CPU') + ') وتحميل @huggingface/transformers...';

                try {
                    const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.2');
                    const { pipeline } = mod;
                    if (task === 'feature-extraction') {
                        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                            device: hasWebGpu ? 'webgpu' : 'wasm'
                        });
                        const tensor = await extractor(text, { pooling: 'mean', normalize: true });
                        const arr = Array.from(tensor.data || []);
                        out.textContent = 'تم استخراج متجه تضمين بطول ' + arr.length + ' عنصر (أول 6 قيم): [' + arr.slice(0, 6).map(n => Number(n).toFixed(4)).join(', ') + ']';
                    } else {
                        const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
                            device: hasWebGpu ? 'webgpu' : 'wasm'
                        });
                        const res = await classifier(text);
                        out.textContent = 'نتيجة التصنيف عبر Transformers.js: ' + JSON.stringify(res, null, 2);
                    }
                } catch (err) {
                    out.textContent = 'تعذر تشغيل النموذج في البيئة الحالية (' + (err && err.message ? err.message : String(err)) + '). تأكد من اتصال الإنترنت ودعم المتصفح.';
                }
            };

            window.runStructuredToolCall = async function () {
                const toolName = document.getElementById('toolCallerSelect')?.value || 'math';
                const arg = String(document.getElementById('toolCallerArg')?.value || '').trim();
                const out = document.getElementById('toolCallerOutputBox');
                if (!out) return;

                let structuredResult = {
                    ok: false,
                    tool: toolName,
                    input: arg,
                    timestamp: new Date().toISOString()
                };

                if (toolName === 'math') {
                    const evalRes = typeof window.evaluateScienceMath === 'function'
                        ? window.evaluateScienceMath(arg)
                        : { ok: false, error: 'evaluateScienceMath unavailable' };
                    const symRes = typeof window.solveSymbolicScience === 'function'
                        ? window.solveSymbolicScience(arg)
                        : null;
                    structuredResult = {
                        ...structuredResult,
                        ok: Boolean(evalRes && evalRes.ok) || Boolean(symRes),
                        numericResult: evalRes,
                        symbolicResult: symRes
                    };
                } else if (toolName === 'openalex') {
                    const papers = typeof window.searchOpenAlexPapers === 'function'
                        ? await window.searchOpenAlexPapers(arg || 'machine learning', 3)
                        : [];
                    structuredResult = {
                        ...structuredResult,
                        ok: papers.length > 0,
                        resultsCount: papers.length,
                        papers
                    };
                } else if (toolName === 'workspace') {
                    const notesCount = Array.isArray(window.notesData) ? window.notesData.length : 0;
                    const tasksCount = Array.isArray(window.tasksData) ? window.tasksData.length : 0;
                    structuredResult = {
                        ...structuredResult,
                        ok: true,
                        notesCount,
                        tasksCount
                    };
                }

                out.textContent = JSON.stringify(structuredResult, null, 2);
            };
        })();

/* ===== Inline Script #10 ===== */
(function () {
            window.__lastPdfProcessorReport = 'لم يتم تنفيذ عملية على ملفات PDF بعد.';

            function setPdfStatus(msg) {
                window.__lastPdfProcessorReport = msg;
                const box = document.getElementById('pdfToolsStatusBox');
                if (box) box.textContent = msg;
            }

            window.inspectSelectedPdfs = async function () {
                const input = document.getElementById('pdfMergeFilesInput');
                const files = Array.from(input && input.files ? input.files : []);
                if (!files.length) {
                    setPdfStatus('يرجى اختيار ملف PDF واحد أو أكثر أولاً.');
                    return;
                }
                const details = [];
                for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    let pageGuess = 'غير محدد';
                    try {
                        const text = await f.text();
                        const matches = text.match(/\/Type\s*\/Page/g);
                        if (matches && matches.length) {
                            pageGuess = String(matches.length) + ' صفحة تقريباً';
                        }
                    } catch (_) {}
                    const kb = (f.size / 1024).toFixed(1);
                    details.push((i + 1) + ') ' + f.name + ' (' + kb + ' KB — ' + pageGuess + ')');
                }
                setPdfStatus('تم فحص ' + files.length + ' ملف PDF:\n' + details.join('\n'));
            };

            window.preparePdfSplitRange = function () {
                const fileInput = document.getElementById('pdfSplitFileInput');
                const rangeInput = document.getElementById('pdfPageRangeInput');
                const file = fileInput && fileInput.files && fileInput.files[0];
                const range = String(rangeInput && rangeInput.value ? rangeInput.value : '').trim();
                if (!file) {
                    setPdfStatus('اختر ملف PDF المراد تحديد صفحاته.');
                    return;
                }
                if (!range) {
                    setPdfStatus('أدخل نطاق الصفحات (مثال: 1-3 أو 2,5).');
                    return;
                }
                setPdfStatus('تم تجهيز نطاق الصفحات [' + range + '] للملف: ' + file.name + '. يمكنك استخدام نافذة الطباعة/PDF لحفظ النطاق المطلوب.');
            };

            window.buildPrintableImagesPdfView = async function () {
                const input = document.getElementById('pdfImagesToSheetInput');
                const files = Array.from(input && input.files ? input.files : []).filter(f => f.type && f.type.startsWith('image/'));
                if (!files.length) {
                    setPdfStatus('اختر صورة واحدة أو أكثر لتحويلها إلى صفحة PDF.');
                    return;
                }
                const dataUrls = await Promise.all(files.map(file => new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({ name: file.name, url: reader.result });
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(file);
                })));
                const valid = dataUrls.filter(Boolean);
                const printWin = window.open('', '_blank');
                if (!printWin) {
                    setPdfStatus('تم تجهيز ' + valid.length + ' صورة، يرجى السماح بالنوافذ المنبثقة لفتح صفحة الحفظ كـ PDF.');
                    return;
                }
                const imgsHtml = valid.map(item =>
                    '<div style="page-break-inside:avoid;margin-bottom:18px;text-align:center;"><img src="' + item.url + '" style="max-width:100%;max-height:85vh;border:1px solid #cbd5e1;border-radius:6px;"><div style="font-size:12px;color:#475569;margin-top:6px;">' + item.name.replace(/</g, '&lt;') + '</div></div>'
                ).join('');
                printWin.document.write(
                    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>معالجات pdf - تصدير</title></head>' +
                    '<body style="font-family:Tahoma,sans-serif;padding:20px;"><h3>صفحة صور المشروع (PDF)</h3>' +
                    imgsHtml +
                    '<script>window.onload=function(){window.print();};<\/script>' +
                    '</body></html>'
                );
                printWin.document.close();
                setPdfStatus('تم فتح صفحة ' + valid.length + ' صورة جاهزة للحفظ كـ PDF عبر الطباعة.');
            };

            window.sendPdfSummaryToNote = function () {
                const editor = document.getElementById('wordRichEditor');
                if (!editor) return;
                const p = document.createElement('p');
                p.textContent = 'تقرير معالجات pdf: ' + window.__lastPdfProcessorReport;
                editor.appendChild(p);
                if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
                if (typeof showToast === 'function') showToast('تم إرسال تقرير PDF إلى دفتر الملاحظات');
            };

            window.sendPdfSummaryToWorkshop = function () {
                const taskInput = document.getElementById('taskInput');
                if (taskInput && typeof addTask === 'function') {
                    taskInput.value = 'مراجعة PDF: ' + window.__lastPdfProcessorReport.split('\n')[0].slice(0, 80);
                    addTask();
                    if (typeof showToast === 'function') showToast('تمت إضافة مهمة مراجعة PDF');
                }
            };
        })();

/* ===== Inline Script #11 ===== */
(function () {
        const PUBLIC_ONLY_FIREBASE_CONFIG = {
            apiKey: "AIzaSyCibfAnFN0BACS9-OKf5wmals4KpKc_FKY",
            authDomain: "smart-student-platform-f6eaf.firebaseapp.com",
            databaseURL: "https://smart-student-platform-f6eaf-default-rtdb.firebaseio.com",
            projectId: "smart-student-platform-f6eaf",
            storageBucket: "smart-student-platform-f6eaf.firebasestorage.app",
            messagingSenderId: "112366788977",
            appId: "1:112366788977:web:9e3e00e2c53f6d3e4a96d0",
            measurementId: "G-W99PJPCHQ8"
        };

        if (typeof firebase === "undefined" || !firebase.database) {
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(PUBLIC_ONLY_FIREBASE_CONFIG);
        }
        const rtdb = firebase.database();
        const CLIENT_SESSION_ID = "cli_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);

        function cleanKey(raw, fallback) {
            const s = String(raw || "")
                .replace(/^#/, "")
                .trim()
                .replace(/[.#$\[\]]/g, "_")
                .slice(0, 64);
            return s || fallback;
        }

        function getActor() {
            const u = (typeof currentUser !== "undefined" && currentUser) ? currentUser : null;
            let savedId = "";
            try { savedId = localStorage.getItem("ssp_ff_player_id") || ""; } catch (_) {}
            const id = cleanKey((u && u.id) || savedId || String(Math.floor(100000 + Math.random() * 900000)), "1001");
            try { localStorage.setItem("ssp_ff_player_id", id); } catch (_) {}
            const navName = document.getElementById("navUsername")?.textContent || "";
            const name = String((u && u.username) || navName || "طالب").trim().slice(0, 40) || "طالب";
            return { id, name, uid: (window.getCurrentUid ? window.getCurrentUid() : '') };
        }

        // 1) قسم غرفة المذاكرة العامة (#section-studyRoom)
        const STUDY_ROOM_ID = "general-study-room";
        let studyChatInitialized = false;

        function bindStudyRoomPublicSync() {
            const studySection = document.getElementById("section-studyRoom");
            if (!studySection) return;

            const me = getActor();
            const statusSelect = document.getElementById("myStudyStatus");
            const currentStatus = (statusSelect && statusSelect.value) || "أراجع المحاضرات 📚";
            const memberRef = rtdb.ref(`public/studyRoom/${STUDY_ROOM_ID}/members/${me.uid || me.id}`);

            memberRef.set({
                id: me.id,
                name: me.name,
                status: currentStatus,
                online: true,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            memberRef.onDisconnect().update({
                online: false,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            rtdb.ref(`public/studyRoom/${STUDY_ROOM_ID}/members`).on("value", (snap) => {
                const active = [];
                if (snap && snap.exists()) {
                    snap.forEach((child) => {
                        const v = child.val() || {};
                        if (v.online !== false) {
                            active.push({
                                id: cleanKey(v.id || child.key, child.key),
                                name: String(v.name || "طالب").slice(0, 40),
                                status: String(v.status || "متصل").slice(0, 80)
                            });
                        }
                    });
                }
                const countBadge = document.getElementById("studyActiveCountBadge");
                if (countBadge) {
                    countBadge.textContent = `🟢 ${active.length || 1} طلاب نشطون الآن`;
                }
                const listEl = document.getElementById("onlineStudentsList");
                if (listEl) {
                    listEl.innerHTML = "";
                    active.forEach((m) => {
                        const row = document.createElement("div");
                        row.style.cssText = "padding:7px 8px; border-bottom:1px solid rgba(148,163,184,0.14); display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12px;";
                        const left = document.createElement("span");
                        left.style.color = "#f8fafc";
                        left.textContent = `${m.name} (#${m.id})`;
                        const right = document.createElement("span");
                        right.style.color = "#38bdf8";
                        right.textContent = m.status;
                        row.append(left, right);
                        listEl.appendChild(row);
                    });
                }
            });

            if (statusSelect) {
                statusSelect.addEventListener("change", () => {
                    const actor = getActor();
                    rtdb.ref(`public/studyRoom/${STUDY_ROOM_ID}/members/${actor.uid || actor.id}`).update({
                        name: actor.name,
                        status: statusSelect.value,
                        online: true,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                });
            }

            const chatBox = document.getElementById("studyChatMessages");
            const chatInput = document.getElementById("studyChatInput");
            const sendBtn = studySection.querySelector('button[onclick*="sendStudyMessage"]');

            const pushPublicStudyMessage = function () {
                if (!chatInput) return;
                const text = String(chatInput.value || "").trim().slice(0, 500);
                if (!text) return;
                const actor = getActor();
                rtdb.ref(`public/studyRoom/${STUDY_ROOM_ID}/messages`).push().set({
                    senderId: actor.id,
                    senderName: actor.name,
                    text,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                chatInput.value = "";
            };

            if (sendBtn) {
                sendBtn.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    pushPublicStudyMessage();
                }, true);
            }
            if (chatInput) {
                chatInput.addEventListener("keydown", function (e) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        pushPublicStudyMessage();
                    }
                }, true);
            }

            if (!studyChatInitialized && chatBox) {
                studyChatInitialized = true;
                rtdb.ref(`public/studyRoom/${STUDY_ROOM_ID}/messages`).limitToLast(60).on("value", (snap) => {
                    chatBox.innerHTML = "";
                    if (!snap || !snap.exists()) return;
                    snap.forEach((child) => {
                        const m = child.val() || {};
                        const item = document.createElement("div");
                        item.style.cssText = "margin:6px 0; padding:8px 11px; border-radius:8px; background:rgba(15,23,42,0.85); border:1px solid rgba(148,163,184,0.2); font-size:13px; color:#e2e8f0;";
                        const header = document.createElement("div");
                        header.style.cssText = "font-size:11px; color:#38bdf8; font-weight:bold; margin-bottom:3px;";
                        header.textContent = `${m.senderName || "طالب"} (#${m.senderId || "?"})`;
                        const body = document.createElement("div");
                        body.textContent = m.text || "";
                        item.append(header, body);
                        chatBox.appendChild(item);
                    });
                    chatBox.scrollTop = chatBox.scrollHeight;
                });
            }

            rtdb.ref(`public/studyRoom/${STUDY_ROOM_ID}/pomodoro`).on("value", (snap) => {
                if (!snap || !snap.exists()) return;
                const p = snap.val() || {};
                const timerEl = document.getElementById("studyPomodoroTimer");
                const modeBadge = document.getElementById("studyPomoModeBadge");
                if (timerEl && typeof p.seconds === "number") {
                    const mins = String(Math.floor(p.seconds / 60)).padStart(2, "0");
                    const secs = String(p.seconds % 60).padStart(2, "0");
                    timerEl.textContent = `${mins}:${secs}`;
                }
                if (modeBadge && p.modeLabel) {
                    modeBadge.textContent = p.modeLabel;
                }
            });
        }

        // 2) قسم المعارك الحية بين الأجهزة + إشعارات الدعوات + renderBattleTeams (#section-battleArena)
        let activeBattleSyncCode = "ROOM-101";
        let isApplyingRemoteBattleState = false;
        let currentBattleRoomRef = null;
        let currentBattleRoomListener = null;
        let currentBattleMovesRef = null;
        let currentBattleMovesListener = null;
        let currentInviteListenerRef = null;
        let currentInviteListenerId = "";
        let pendingBattleInviteObj = null;
        let lastAppliedBattleSeq = 0;

        window.__announcedBattleGuests = window.__announcedBattleGuests || new Set();
        window.battleRoomInfo = window.battleRoomInfo || { name: "غرفة التحدي السريع", code: "#ROOM-101" };
        window.battleTotalRounds = window.battleTotalRounds || 3;
        window.battleSize = window.battleSize || 1;
        window.customTeamB = window.customTeamB || [];

        if (typeof window.updateBattleRoomBanner !== "function") {
            window.updateBattleRoomBanner = function () {
                const nameEl = document.getElementById("battleRoomNameDisplay");
                const codeEl = document.getElementById("battleRoomCodeBadge");
                const roundsEl = document.getElementById("battleRoundsBadge");
                const roundsSel = document.getElementById("battleRoundsSelect");
                if (nameEl && window.battleRoomInfo?.name) {
                    nameEl.textContent = window.battleRoomInfo.name;
                }
                if (codeEl && window.battleRoomInfo?.code) {
                    codeEl.textContent = window.battleRoomInfo.code.startsWith("#")
                        ? window.battleRoomInfo.code
                        : "#" + window.battleRoomInfo.code;
                }
                if (roundsEl && window.battleTotalRounds) {
                    roundsEl.textContent = `${window.battleTotalRounds} جولات`;
                }
                if (roundsSel && window.battleTotalRounds) {
                    roundsSel.value = String(window.battleTotalRounds);
                }
            };
        }

        if (typeof window.setupBattleTeams !== "function") {
            window.setupBattleTeams = function () {
                const actor = getActor();
                if (!Array.isArray(window.battleTeamA) || !window.battleTeamA.length) {
                    window.battleTeamA = [{
                        name: actor.name,
                        studentId: `#${actor.id}`,
                        score: 0,
                        isUser: true,
                        isCustom: true
                    }];
                } else {
                    window.battleTeamA[0] = {
                        ...window.battleTeamA[0],
                        name: actor.name,
                        studentId: `#${actor.id}`,
                        isUser: true
                    };
                }

                if (Array.isArray(window.customTeamB) && window.customTeamB.length > 0) {
                    window.battleTeamB = window.customTeamB.slice(0, window.battleSize || 1).map((g, idx) => ({
                        name: g.name || `طالب #${idx + 1}`,
                        studentId: g.studentId || `#${2000 + idx}`,
                        score: Number(g.score) || 0,
                        isUser: false,
                        isCustom: true,
                        isLiveGuest: !!g.isLiveGuest
                    }));
                }

                if (typeof renderBattleTeams === "function") {
                    renderBattleTeams();
                }
            };
        }

        function wbToast(msg) {
            if (typeof showToast === "function") {
                showToast(msg);
            }
        }

        /* ==================== استقبال تحديثات الغرفة الحية عند قبول الضيف ==================== */
        window.applyIncomingBattleRoomState = function applyIncomingBattleRoomState(roomData) {
            if (!roomData || typeof roomData !== 'object') return;

            // 1. تحديث بيانات الغرفة وعدد الجولات والنمط إن تغيرت
            if (roomData.roomName || roomData.name || roomData.roomCode || roomData.code) {
                const rawCode = String(roomData.roomCode || roomData.code || window.battleRoomInfo.code);
                window.battleRoomInfo = {
                    name: roomData.roomName || roomData.name || window.battleRoomInfo.name,
                    code: rawCode.startsWith('#') ? rawCode : `#${rawCode.replace(/^#/, '')}`
                };
            }
            if (roomData.rounds || roomData.totalRounds) {
                window.battleTotalRounds = Number(roomData.rounds || roomData.totalRounds) || window.battleTotalRounds;
            }
            if (roomData.size) {
                const incomingSize = parseInt(roomData.size, 10);
                if (Number.isFinite(incomingSize) && incomingSize >= 1 && incomingSize <= 4 && incomingSize !== window.battleSize) {
                    window.battleSize = incomingSize;
                    document.querySelectorAll('.battle-mode-btn').forEach(b => b.classList.remove('active-mode'));
                    document.getElementById(`modeBtn${window.battleSize}v${window.battleSize}`)?.classList.add('active-mode');
                    const label = document.getElementById('battleModeLabel');
                    if (label) label.textContent = `${window.battleSize} vs ${window.battleSize}`;
                }
            }
            window.updateBattleRoomBanner();

            // 2. استخراج الضيوف المنضمين (سواء من حقل opponent أو players أو teamB)
            const currentUserId = String(
                (typeof currentUser !== 'undefined' && currentUser?.id) ||
                localStorage.getItem('ssp_ff_player_id') ||
                '1001'
            ).replace(/^#/, '');

            let rawPlayers = [];
            if (roomData.opponent && typeof roomData.opponent === 'object') {
                rawPlayers.push(roomData.opponent);
            }
            if (roomData.players && typeof roomData.players === 'object') {
                rawPlayers = rawPlayers.concat(Object.values(roomData.players));
            } else if (Array.isArray(roomData.teamB)) {
                rawPlayers = rawPlayers.concat(roomData.teamB);
            }

            const guests = rawPlayers.filter(p => {
                if (!p) return false;
                const pid = String(p.id || p.studentId || '').replace(/^#/, '');
                return pid && pid !== currentUserId;
            });

            if (guests.length > 0) {
                window.customTeamB = guests.slice(0, window.battleSize).map(g => {
                    const cleanId = String(g.id || g.studentId).replace(/^#/, '');
                    return {
                        name: g.name || g.username || `طالب #${cleanId}`,
                        studentId: `#${cleanId}`,
                        score: Number(g.score) || 0,
                        isUser: false,
                        isCustom: true,
                        isLiveGuest: true
                    };
                });

                window.setupBattleTeams();

                // إشعار المضيف مرة واحدة فقط لكل ضيف جديد ينضم
                window.customTeamB.forEach(guest => {
                    if (!window.__announcedBattleGuests.has(guest.studentId)) {
                        window.__announcedBattleGuests.add(guest.studentId);
                        wbToast(`انضم ${guest.name} (${guest.studentId}) إلى الغرفة! ⚔️`);
                    }
                });
            }
        };

        function formatDisplayId(rawId, fallback = "#1001") {
            const cleaned = cleanKey(rawId, "");
            if (!cleaned) return fallback;
            return "#" + cleaned;
        }

        function buildOpponentEntry(rawId, rawName, score = 0) {
            const normId = formatDisplayId(rawId, "#2000");
            const cleanName = String(rawName || "").trim().slice(0, 40) || `منافس ${normId}`;
            return {
                name: cleanName,
                studentId: normId,
                score: Number(score) || 0,
                isUser: false,
                isCustom: true
            };
        }

        function syncOpponentIntoBattleTeams(opponentInfo, roomHostInfo = null) {
            if (!opponentInfo || (!opponentInfo.id && !opponentInfo.studentId && !opponentInfo.name)) return;
            const oppId = cleanKey(opponentInfo.studentId || opponentInfo.id, "");
            const oppName = String(opponentInfo.name || opponentInfo.username || "").trim();
            const oppScore = Number(opponentInfo.score || 0);
            const oppEntry = buildOpponentEntry(oppId, oppName, oppScore);

            if (typeof customTeamB !== "undefined" && Array.isArray(customTeamB)) {
                const existingCustomIdx = customTeamB.findIndex(p => cleanKey(p.studentId || p.id, "") === oppId && oppId);
                if (existingCustomIdx >= 0) {
                    customTeamB[existingCustomIdx] = { ...customTeamB[existingCustomIdx], ...oppEntry };
                } else {
                    customTeamB.unshift(oppEntry);
                }
            }

            if (typeof battleTeamB !== "undefined" && Array.isArray(battleTeamB)) {
                if (!battleTeamB.length) {
                    battleTeamB.push(oppEntry);
                } else {
                    const existingIdx = battleTeamB.findIndex(p => cleanKey(p.studentId || p.id, "") === oppId && oppId);
                    if (existingIdx >= 0) {
                        battleTeamB[existingIdx] = { ...battleTeamB[existingIdx], ...oppEntry };
                    } else {
                        battleTeamB[0] = { ...oppEntry, score: Number(battleTeamB[0]?.score || oppScore || 0) };
                    }
                }
            }

            if (roomHostInfo && (roomHostInfo.id || roomHostInfo.name)) {
                const me = getActor();
                const hostId = cleanKey(roomHostInfo.id, "");
                if (hostId && hostId !== me.id && typeof battleTeamA !== "undefined" && Array.isArray(battleTeamA) && battleTeamA.length) {
                    const hostEntry = {
                        name: String(roomHostInfo.name || "مضيف الغرفة").trim().slice(0, 40),
                        studentId: formatDisplayId(hostId, "#1001"),
                        score: Number(battleTeamA[0]?.score || 0),
                        isUser: false,
                        isCustom: true
                    };
                    if (!battleTeamA[0]?.isUser) {
                        battleTeamA[0] = hostEntry;
                    }
                }
            }

            if (typeof renderBattleTeams === "function") {
                renderBattleTeams();
            }
        }

        function getCurrentRoomCodeClean() {
            const raw = document.getElementById("battleRoomCodeBadge")?.textContent || "ROOM-101";
            return cleanKey(raw, "ROOM-101");
        }

        function setCurrentRoomUi(roomCode, roomName) {
            const cleanCode = cleanKey(roomCode, "ROOM-101");
            const codeEl = document.getElementById("battleRoomCodeBadge");
            const nameEl = document.getElementById("battleRoomNameDisplay");
            if (codeEl) codeEl.textContent = "#" + cleanCode;
            if (nameEl && roomName) nameEl.textContent = String(roomName);
            window.battleRoomInfo = {
                name: roomName ? String(roomName) : (window.battleRoomInfo?.name || "غرفة التحدي السريع"),
                code: "#" + cleanCode
            };
            if (typeof battleRoomInfo !== "undefined" && battleRoomInfo) {
                battleRoomInfo.code = "#" + cleanCode;
                if (roomName) battleRoomInfo.name = String(roomName);
            }
        }

        function collectCurrentBattleSnapshot() {
            const actor = getActor();
            const code = getCurrentRoomCodeClean();
            const roomName = (document.getElementById("battleRoomNameDisplay")?.textContent || "غرفة التحدي السريع").trim();
            const rounds = (document.getElementById("battleRoundsSelect")?.value || "3");
            const domain = (document.getElementById("battleDomainSelect")?.value || "programming");
            const scoreA = (document.getElementById("teamAScoreBadge")?.textContent || "0 نقطة").trim();
            const scoreB = (document.getElementById("teamBScoreBadge")?.textContent || "0 نقطة").trim();
            const roundInfo = (document.getElementById("battleRoundInfo")?.textContent || "").trim();
            const timerText = (document.getElementById("battleTimerBadge")?.textContent || "").trim();
            const questionText = (document.getElementById("battleQuestionText")?.textContent || "").trim();
            const feedbackText = (document.getElementById("battleRoundFeedback")?.textContent || "").trim();
            const activeAreaHidden = !!document.getElementById("battleActiveArea")?.classList.contains("hidden");
            const summaryHidden = !!document.getElementById("battleSummaryArea")?.classList.contains("hidden");
            const summaryHtml = document.getElementById("battleSummaryArea")?.innerHTML || "";

            const teamASnapshot = (typeof battleTeamA !== "undefined" && Array.isArray(battleTeamA))
                ? battleTeamA.map(p => ({
                    name: String(p.name || "").slice(0, 40),
                    studentId: formatDisplayId(p.studentId || p.id, "#1001"),
                    score: Number(p.score) || 0,
                    isUser: !!p.isUser,
                    isCustom: !!p.isCustom
                }))
                : [];

            const teamBSnapshot = (typeof battleTeamB !== "undefined" && Array.isArray(battleTeamB))
                ? battleTeamB.map(p => ({
                    name: String(p.name || "").slice(0, 40),
                    studentId: formatDisplayId(p.studentId || p.id, "#5102"),
                    score: Number(p.score) || 0,
                    isUser: false,
                    isCustom: !!p.isCustom
                }))
                : [];

            const options = Array.from(document.querySelectorAll("#battleOptionsGrid button")).map((btn, idx) => ({
                index: idx,
                text: (btn.textContent || "").trim(),
                disabled: !!btn.disabled
            }));

            return {
                roomCode: code,
                roomName,
                rounds,
                size: window.battleSize || 1,
                domain,
                scoreA,
                scoreB,
                roundInfo,
                timerText,
                questionText,
                feedbackText,
                activeAreaHidden,
                summaryHidden,
                summaryHtml,
                options,
                teamA: teamASnapshot,
                teamB: teamBSnapshot,
                hostId: actor.id,
                hostName: actor.name,
                hostSessionId: window.battleHostSessionId || CLIENT_SESSION_ID,
                hostUid: (window.getCurrentUid ? window.getCurrentUid() : '') || '',
                sourceClientId: CLIENT_SESSION_ID,
                seq: Date.now(),
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
        }

        function applyRemoteBattleSnapshot(data) {
            console.info("[battle] remote snapshot received", data && data.roomCode, "seq", data && data.seq, "from", data && data.sourceClientId);
            if (!data || data.sourceClientId === CLIENT_SESSION_ID) return;
            if (typeof data.seq === "number" && data.seq <= lastAppliedBattleSeq) return;
            if (typeof data.seq === "number") lastAppliedBattleSeq = data.seq;

            isApplyingRemoteBattleState = true;
            try {
                if (typeof window.applyIncomingBattleRoomState === "function") {
                    window.applyIncomingBattleRoomState(data);
                }

                const code = cleanKey(data.roomCode || activeBattleSyncCode, "ROOM-101");
                setCurrentRoomUi(code, data.roomName);

                const roundsEl = document.getElementById("battleRoundsSelect");
                const roundsBadge = document.getElementById("battleRoundsBadge");
                const domainEl = document.getElementById("battleDomainSelect");
                const scoreAEl = document.getElementById("teamAScoreBadge");
                const scoreBEl = document.getElementById("teamBScoreBadge");
                const roundInfoEl = document.getElementById("battleRoundInfo");
                const timerEl = document.getElementById("battleTimerBadge");
                const qTextEl = document.getElementById("battleQuestionText");
                const fbEl = document.getElementById("battleRoundFeedback");
                const optsGrid = document.getElementById("battleOptionsGrid");
                const activeArea = document.getElementById("battleActiveArea");
                const summaryArea = document.getElementById("battleSummaryArea");

                if (roundsEl && data.rounds) roundsEl.value = String(data.rounds);
                if (roundsBadge && data.rounds) roundsBadge.textContent = `${data.rounds} جولات`;
                if (domainEl && data.domain) domainEl.value = String(data.domain);
                if (scoreAEl && data.scoreA) scoreAEl.textContent = data.scoreA;
                if (scoreBEl && data.scoreB) scoreBEl.textContent = data.scoreB;

                if (Array.isArray(data.teamB) && data.teamB.length && typeof battleTeamB !== "undefined" && Array.isArray(battleTeamB)) {
                    data.teamB.forEach((remoteP, idx) => {
                        if (remoteP && (remoteP.name || remoteP.studentId)) {
                            const entry = buildOpponentEntry(remoteP.studentId, remoteP.name, remoteP.score || 0);
                            if (idx < battleTeamB.length) {
                                battleTeamB[idx] = { ...battleTeamB[idx], ...entry, isCustom: true };
                            }
                        }
                    });
                }

                if (data.opponent && (data.opponent.id || data.opponent.studentId || data.opponent.name)) {
                    syncOpponentIntoBattleTeams(data.opponent, { id: data.hostId, name: data.hostName });
                } else if (typeof renderBattleTeams === "function") {
                    renderBattleTeams();
                }

                const syncStatus = document.getElementById("battleLiveSyncStatus");
                if (syncStatus && data.opponent && (data.opponent.name || data.opponent.studentId)) {
                    const oppLabel = `${data.opponent.name || "منافس"} (${formatDisplayId(data.opponent.studentId || data.opponent.id, "#?")})`;
                    syncStatus.textContent = `✅ انضم الخصم: ${oppLabel}`;
                }

                if (activeArea && typeof data.activeAreaHidden === "boolean") {
                    activeArea.classList.toggle("hidden", data.activeAreaHidden);
                }
                if (roundInfoEl && typeof data.roundInfo === "string") {
                    roundInfoEl.textContent = data.roundInfo;
                }
                if (timerEl && data.timerText) {
                    timerEl.textContent = data.timerText;
                }
                if (qTextEl && typeof data.questionText === "string") {
                    qTextEl.textContent = data.questionText;
                }
                if (fbEl && typeof data.feedbackText === "string") {
                    fbEl.textContent = data.feedbackText;
                }

                if (optsGrid && Array.isArray(data.options) && data.options.length) {
                    const existingBtns = Array.from(optsGrid.querySelectorAll("button"));
                    if (existingBtns.length === data.options.length) {
                        const letters = ["A", "B", "C", "D"];
                        data.options.forEach((opt, i) => {
                            if (existingBtns[i]) {
                                const cleanOptText = String(opt.text || "").replace(/^[A-D1-4]\s*/, "").trim();
                                const badge = existingBtns[i].querySelector(".opt-letter");
                                if (badge) {
                                    const letterEl = document.createElement("span");
                                    letterEl.className = "opt-letter";
                                    letterEl.textContent = letters[i] || String(i + 1);
                                    const textEl = document.createElement("span");
                                    textEl.textContent = cleanOptText;
                                    existingBtns[i].replaceChildren(letterEl, textEl);
                                } else {
                                    existingBtns[i].textContent = opt.text;
                                }
                                existingBtns[i].disabled = !!window.battleAnswered;
                                existingBtns[i].onclick = () => {
                                    if (window.battleIsGuest) {
                                        Array.from(optsGrid.querySelectorAll("button")).forEach(x => { x.disabled = true; });
                                        recordBattleMoveToRoom(code, { type: "answer", optionIndex: i, optionText: cleanOptText });
                                    }
                                };
                            }
                        });
                    } else {
                        optsGrid.innerHTML = "";
                        data.options.forEach((opt) => {
                            const b = document.createElement("button");
                            b.type = "button";
                            b.className = "battle-option-btn";
                            b.textContent = opt.text;
                            b.disabled = !!window.battleAnswered;
                            b.onclick = () => {
                                if (window.battleIsGuest) {
                                    Array.from(optsGrid.querySelectorAll("button")).forEach(x => { x.disabled = true; });
                                    recordBattleMoveToRoom(code, { type: "answer", optionIndex: opt.index, optionText: opt.text });
                                    return;
                                }
                                const localIdx = mapRemoteOptionToLocal(opt.text);
                                if (localIdx >= 0 && typeof window.submitBattleChoice === "function") {
                                    window.submitBattleChoice(localIdx);
                                } else {
                                    recordBattleMoveToRoom(code, {
                                        type: "answer",
                                        optionIndex: opt.index,
                                        optionText: opt.text
                                    });
                                }
                            };
                            optsGrid.appendChild(b);
                        });
                    }
                }

                if (summaryArea && typeof data.summaryHidden === "boolean") {
                    summaryArea.classList.toggle("hidden", data.summaryHidden);
                    if (!data.summaryHidden && typeof data.summaryHtml === "string" && data.summaryHtml) {
                        if (window.Platform && window.Platform.sanitize) {
                            summaryArea.innerHTML = window.Platform.sanitize(data.summaryHtml);
                        } else {
                            summaryArea.textContent = data.summaryHtml;
                        }
                    }
                }
            } finally {
                setTimeout(() => {
                    isApplyingRemoteBattleState = false;
                }, 140);
            }
        }

        function getSafeBattleDb() {
            if (typeof rtdb !== "undefined" && rtdb && typeof rtdb.ref === "function") {
                return rtdb;
            }
            if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length && typeof firebase.database === "function") {
                return firebase.database();
            }
            return null;
        }

        // win-battle.js calls these through window.*; without these lines the calls were skipped
        // silently, so the host never listened to its room and never published its state.
        window.attachBattleRoomSyncListeners = attachBattleRoomSyncListeners;
        window.publishBattleStateNow = publishBattleStateNow;
        window.recordBattleMoveToRoom = recordBattleMoveToRoom;

        window.handleCantAnswerClick = function handleCantAnswerClick() {
            if (window.battleIsGuest) {
                document.querySelectorAll("#battleOptionsGrid button").forEach(x => { x.disabled = true; });
                const c = document.getElementById("cantAnswerBtn");
                if (c) c.disabled = true;
                recordBattleMoveToRoom(getCurrentRoomCodeClean(), { type: "cant_answer", optionIndex: -1, optionText: "عجز" });
                return;
            }
            if (typeof window.declareCantAnswer === "function") window.declareCantAnswer();
        };

        function mapRemoteOptionToLocal(text) {
            const q = window.battleQuestions && window.battleQuestions[window.battleRoundIndex];
            if (!q || !Array.isArray(q.options)) return -1;
            const clean = String(text || "").replace(/^[A-D1-4]\s*/, "").trim();
            return q.options.findIndex(o => String(o).trim() === clean);
        }

        function recordBattleMoveToRoom(roomCode, movePayload) {
            const db = getSafeBattleDb();
            if (!db) return;
            const cleanCode = cleanKey(roomCode || getCurrentRoomCodeClean(), "ROOM-101");
            const actor = getActor();
            db.ref(`public/battles/${cleanCode}/moves`).push().set({
                playerId: actor.id,
                playerName: actor.name,
                sourceClientId: CLIENT_SESSION_ID,
                ...movePayload,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
        }

        function publishBattleStateNow() {
            if (isApplyingRemoteBattleState) return;
            if (window.battleIsGuest) return;
            const db = getSafeBattleDb();
            if (!db) return;
            const snap = collectCurrentBattleSnapshot();
            activeBattleSyncCode = snap.roomCode;
            db.ref(`public/battles/${snap.roomCode}`).update(snap).catch(() => {});
        }

        function attachBattleRoomSyncListeners(roomCode) {
            const db = getSafeBattleDb();
            if (!db) return;
            const cleanCode = cleanKey(roomCode, "ROOM-101");
            activeBattleSyncCode = cleanCode;

            if (currentBattleRoomRef && currentBattleRoomListener) {
                currentBattleRoomRef.off("value", currentBattleRoomListener);
            }
            if (currentBattleMovesRef && currentBattleMovesListener) {
                currentBattleMovesRef.off("child_added", currentBattleMovesListener);
            }

            currentBattleRoomRef = db.ref(`public/battles/${cleanCode}`);
            currentBattleRoomListener = (snap) => {
                if (!snap || !snap.exists()) return;
                if (!window.battleIsGuest) { console.info("[battle] host ignores room snapshot"); return; }
                window.battleLiveRival = true;
                const val = snap.val() || {};
                if (val.hostSessionId) window.battleHostSessionId = val.hostSessionId;
                applyRemoteBattleSnapshot(val);
            };
            currentBattleRoomRef.on("value", currentBattleRoomListener);

            const roomJoinTime = Date.now();
            currentBattleMovesRef = db.ref(`public/battles/${cleanCode}/moves`);
            currentBattleMovesListener = (childSnap) => {
                if (!childSnap || !childSnap.exists()) return;
                const move = childSnap.val() || {};
                if (move.sourceClientId === CLIENT_SESSION_ID) return;
                const ts = Number(move.createdAt || 0);
                if (ts && ts < roomJoinTime - 2000) return;

                if (!window.battleIsGuest && typeof window.submitBattleChoice === "function") {
                    window.battleLiveRival = true;
                    if (move.type === "answer") {
                        const idx = Number.isInteger(move.optionIndex) && move.optionIndex >= 0
                            ? move.optionIndex
                            : mapRemoteOptionToLocal(move.optionText);
                        if (idx >= 0) window.submitBattleChoice(idx, true);
                    } else if (move.type === "cant_answer" && typeof window.declareCantAnswer === "function") {
                        window.declareCantAnswer(true);
                    }
                }

                const statusEl = document.getElementById("battleLiveSyncStatus");
                if (statusEl) {
                    const actionLabel = move.type === "cant_answer"
                        ? "أعلن عدم القدرة على الإجابة"
                        : `اختار الإجابة: ${move.optionText || ""}`;
                    statusEl.textContent = `⚡ ${move.playerName || "منافس"} (#${move.playerId || "?"}) ${actionLabel}`;
                }
            };
            currentBattleMovesRef.on("child_added", currentBattleMovesListener);

            // Host: when a guest joins, add them to team B and publish the room state,
            // so the guest's view and the host's teams both update.
            if (!window.battleIsGuest) {
                if (window.__battleMembersRef) window.__battleMembersRef.off();
                window.__battleMembersRef = db.ref(`public/battles/${cleanCode}/members`);
                console.info("[battle] host listening to members of", cleanCode);
                window.__battleMembersRef.on("child_added", (mSnap) => {
                    if (!mSnap || !mSnap.exists()) return;
                    console.info("[battle] member joined:", mSnap.key, mSnap.val());
                    const m = mSnap.val() || {};
                    const oppId = m.studentId || "";
                    if (!oppId && !m.name) return;
                    syncOpponentIntoBattleTeams({ id: oppId, studentId: oppId, name: m.name || "طالب", score: 0 });
                    publishBattleStateNow();
                });
            }
        }

        function renderInviteBannerWithActions(inviteObj) {
            const banner = document.getElementById("incomingInviteBanner");
            const textEl = document.getElementById("incomingInviteText");
            if (!banner || !textEl) return;

            pendingBattleInviteObj = inviteObj;
            const fromName = inviteObj.fromName || "منافس";
            const fromId = cleanKey(inviteObj.fromId || "", "?");
            const roomCode = cleanKey(inviteObj.roomCode || "ROOM-101", "ROOM-101");
            const roomName = inviteObj.roomName || `غرفة #${roomCode}`;

            textEl.textContent = `📩 دعوة معركة مباشرة من ${fromName} (#${fromId}) للانضمام إلى "${roomName}" (#${roomCode})`;
            banner.classList.remove("hidden");

            const actionsWrap = banner.querySelector("div:last-child");
            if (actionsWrap) {
                actionsWrap.innerHTML = "";
                const acceptBtn = document.createElement("button");
                acceptBtn.type = "button";
                acceptBtn.style.cssText = "background:#10b981; color:#fff; border:none; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;";
                acceptBtn.textContent = "✅ قبول ودخول المعركة";
                acceptBtn.onclick = () => {
                    window.acceptIncomingInvite();
                };

                const declineBtn = document.createElement("button");
                declineBtn.type = "button";
                declineBtn.style.cssText = "background:#ef4444; color:#fff; border:none; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;";
                declineBtn.textContent = "✕ رفض";
                declineBtn.onclick = () => {
                    window.declineIncomingInvite();
                };

                actionsWrap.append(acceptBtn, declineBtn);
            }
        }

        window.acceptIncomingInvite = async function () {
            const inv = pendingBattleInviteObj;
            const banner = document.getElementById("incomingInviteBanner");
            if (banner) banner.classList.add("hidden");
            if (!inv) return;

            const actor = getActor();
            const targetRoom = cleanKey(inv.roomCode || "ROOM-101", "ROOM-101");
            const roomName = inv.roomName || `غرفة #${targetRoom}`;
            const hostId = cleanKey(inv.fromUid || inv.fromId || "1001", "1001");
            const hostName = inv.fromName || "مضيف الغرفة";

            if (typeof jumpToSection === "function") {
                jumpToSection("battleArena");
            } else if (typeof showMainSection === "function") {
                showMainSection("battleArena");
            }

            setCurrentRoomUi(targetRoom, roomName);
            window.battleIsGuest = true;
            attachBattleRoomSyncListeners(targetRoom);

            const db = getSafeBattleDb();
            if (db) {
                try {
                    const roomSnap = await db.ref(`public/battles/${targetRoom}`).get();
                    const existingRoomData = roomSnap && roomSnap.exists() ? (roomSnap.val() || {}) : {};
                    if (existingRoomData.roomName) {
                        setCurrentRoomUi(targetRoom, existingRoomData.roomName);
                    }
                    if (existingRoomData.rounds && document.getElementById("battleRoundsSelect")) {
                        document.getElementById("battleRoundsSelect").value = String(existingRoomData.rounds);
                        const roundsBadge = document.getElementById("battleRoundsBadge");
                        if (roundsBadge) roundsBadge.textContent = `${existingRoomData.rounds} جولات`;
                    }
                    if (existingRoomData.domain && document.getElementById("battleDomainSelect")) {
                        document.getElementById("battleDomainSelect").value = String(existingRoomData.domain);
                    }

                    const effectiveHostId = cleanKey(existingRoomData.hostId || hostId, hostId);
                    const effectiveHostName = String(existingRoomData.hostName || hostName).trim() || "مضيف الغرفة";

                    const joinedOpponentObj = {
                        id: actor.id,
                        studentId: formatDisplayId(actor.id, "#2000"),
                        name: actor.name,
                        joinedAt: Date.now()
                    };

                    const updatedTeamB = Array.isArray(existingRoomData.teamB) && existingRoomData.teamB.length
                        ? existingRoomData.teamB.map((item, idx) => idx === 0 ? {
                            ...item,
                            name: actor.name,
                            studentId: formatDisplayId(actor.id, "#2000"),
                            isCustom: true
                        } : item)
                        : [{
                            name: actor.name,
                            studentId: formatDisplayId(actor.id, "#2000"),
                            score: 0,
                            isUser: false,
                            isCustom: true
                        }];

                    const guestUid = window.getCurrentUid ? window.getCurrentUid() : '';
                    if (guestUid) {
                        await db.ref(`public/battles/${targetRoom}/members/${guestUid}`).set({
                            name: actor.name,
                            studentId: actor.id,
                            joinedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    await db.ref(`public/battles/${targetRoom}`).update({
                        roomCode: targetRoom,
                        roomName: existingRoomData.roomName || roomName,
                        hostId: effectiveHostId,
                        hostName: effectiveHostName,
                        opponent: joinedOpponentObj,
                        teamB: updatedTeamB,
                        sourceClientId: CLIENT_SESSION_ID,
                        seq: Date.now(),
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });

                    syncOpponentIntoBattleTeams(joinedOpponentObj, { id: effectiveHostId, name: effectiveHostName });

                    if (inv.inviteId && (actor.uid || actor.id)) {
                        await db.ref(`public/invites/${actor.uid || actor.id}/${inv.inviteId}`).update({
                            status: "accepted",
                            acceptedById: actor.uid || actor.id,
                            acceptedByName: actor.name,
                            acceptedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    if (hostId && hostId !== (actor.uid || actor.id)) {
                        await db.ref(`public/inviteResponses/${hostId}`).push().set({
                            type: "invite_accepted",
                            roomCode: targetRoom,
                            roomName: existingRoomData.roomName || roomName,
                            guestId: actor.id,
                            guestName: actor.name,
                            sourceClientId: CLIENT_SESSION_ID,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                } catch (_) {}
            }

            const statusEl = document.getElementById("battleLiveSyncStatus");
            if (statusEl) {
                statusEl.textContent = `✅ متصل بالغرفة #${targetRoom} مع ${hostName} (#${hostId})`;
            }
            wbToast(`تم الانضمام إلى الغرفة #${targetRoom} مع ${hostName} ⚔️`);
            pendingBattleInviteObj = null;
        };

        window.declineIncomingInvite = async function () {
            const inv = pendingBattleInviteObj;
            const banner = document.getElementById("incomingInviteBanner");
            if (banner) banner.classList.add("hidden");
            const db = getSafeBattleDb();
            const actor = getActor();
            if (db && inv && inv.inviteId && actor.id) {
                try {
                    await db.ref(`public/invites/${actor.uid || actor.id}/${inv.inviteId}`).update({
                        status: "declined",
                        declinedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                } catch (_) {}
            }
            pendingBattleInviteObj = null;
        };

        function attachInviteListenersForCurrentUser() {
            const db = getSafeBattleDb();
            if (!db) return;
            const actor = getActor();
            if (!actor.id || currentInviteListenerId === actor.id) return;

            if (currentInviteListenerRef && currentInviteListenerId) {
                currentInviteListenerRef.off();
            }
            currentInviteListenerId = actor.id;
            const connectedSince = Date.now();

            const invitesRef = db.ref(`public/invites/${actor.uid || actor.id}`);
            invitesRef.on("child_added", (snap) => {
                if (!snap || !snap.exists()) return;
                const val = snap.val() || {};
                if (val.status && val.status !== "pending") return;
                const ts = Number(val.createdAt || 0);
                if (ts && ts < connectedSince - 15000) return;

                const invObj = {
                    inviteId: snap.key,
                    fromId: cleanKey(val.fromId || "", ""),
                    fromName: String(val.fromName || "منافس").slice(0, 40),
                    roomCode: cleanKey(val.roomCode || "ROOM-101", "ROOM-101"),
                    roomName: String(val.roomName || "").slice(0, 60)
                };
                renderInviteBannerWithActions(invObj);
                wbToast(`📩 دعوة معركة من ${invObj.fromName} (#${invObj.fromId})`);
            });

            const responsesRef = db.ref(`public/inviteResponses/${actor.uid || actor.id}`);
            responsesRef.on("child_added", (snap) => {
                if (!snap || !snap.exists()) return;
                const val = snap.val() || {};
                if (val.sourceClientId === CLIENT_SESSION_ID) return;
                const ts = Number(val.createdAt || 0);
                if (ts && ts < connectedSince - 10000) return;

                if (val.type === "invite_accepted") {
                    const guestId = cleanKey(val.guestId || "", "");
                    const guestName = String(val.guestName || "منافس").trim() || "منافس";
                    const targetRoom = cleanKey(val.roomCode || getCurrentRoomCodeClean(), "ROOM-101");
                    attachBattleRoomSyncListeners(targetRoom);

                    if (typeof window.applyIncomingBattleRoomState === "function") {
                        window.applyIncomingBattleRoomState({
                            roomCode: targetRoom,
                            roomName: val.roomName || window.battleRoomInfo?.name,
                            opponent: { id: guestId, name: guestName }
                        });
                    } else {
                        syncOpponentIntoBattleTeams({ id: guestId, name: guestName }, { id: actor.id, name: actor.name });
                    }

                    const statusEl = document.getElementById("battleLiveSyncStatus");
                    if (statusEl) {
                        statusEl.textContent = `✅ قبل ${guestName} (#${guestId}) الدعوة وانضم للغرفة #${targetRoom}`;
                    }
                    wbToast(`✅ قبل ${guestName} (#${guestId}) الدعوة وانضم إلى المعركة!`);
                    publishBattleStateNow();
                }
            });

            currentInviteListenerRef = invitesRef;
        }

        function bindBattlePublicSync() {
            const battleSection = document.getElementById("section-battleArena");
            if (!battleSection) return;

            attachInviteListenersForCurrentUser();

            const classicPanel = document.getElementById("classicBattlePanel");
            if (classicPanel && !document.getElementById("battleLiveSyncBar")) {
                const syncBar = document.createElement("div");
                syncBar.id = "battleLiveSyncBar";
                syncBar.className = "battle-live-sync-box";

                const infoSpan = document.createElement("span");
                infoSpan.id = "battleLiveSyncStatus";
                infoSpan.style.cssText = "font-size:12px; color:#38bdf8; font-weight:bold;";
                infoSpan.textContent = "🌐 مزامنة المعركة الحية مفعلة عبر Firebase";

                const controlsWrap = document.createElement("div");
                controlsWrap.style.cssText = "display:flex; gap:6px; flex-wrap:wrap; align-items:center;";

                const roomJoinInput = document.createElement("input");
                roomJoinInput.type = "text";
                roomJoinInput.id = "liveBattleRoomCodeInput";
                roomJoinInput.placeholder = "كود الغرفة (مثال: ROOM-101)";
                roomJoinInput.style.cssText = "padding:6px 10px; background:var(--card-bg); color:#fff; border:1px solid var(--border); border-radius:7px; font-size:12px; width:165px;";

                const joinBtn = document.createElement("button");
                joinBtn.type = "button";
                joinBtn.textContent = "🔗 انضمام للغرفة";
                joinBtn.style.cssText = "background:#0284c7; color:#fff; border:none; padding:6px 11px; border-radius:7px; cursor:pointer; font-size:12px; font-weight:bold;";
                joinBtn.onclick = async () => {
                    const code = cleanKey(roomJoinInput.value || getCurrentRoomCodeClean(), "ROOM-101");
                    setCurrentRoomUi(code);
                    window.battleIsGuest = true;
                    const joinUid = window.getCurrentUid ? window.getCurrentUid() : '';
                    if (joinUid && rtdb) {
                        try {
                            await rtdb.ref(`public/battles/${code}/members/${joinUid}`).set({
                                name: getActor().name,
                                studentId: getActor().id,
                                joinedAt: firebase.database.ServerValue.TIMESTAMP
                            });
                        } catch (err) {
                            console.error("[battle] join failed:", err);
                            wbToast("تعذر الانضمام إلى الغرفة (" + ((err && err.code) || "خطأ") + ")");
                            window.battleIsGuest = false;
                            return;
                        }
                    }
                    attachBattleRoomSyncListeners(code);
                    infoSpan.textContent = `🔗 متصل بالغرفة #${code}`;
                    wbToast(`تم الانضمام ومزامنة الغرفة #${code}`);
                };

                const inviteOppInput = document.createElement("input");
                inviteOppInput.type = "text";
                inviteOppInput.id = "liveBattleInviteIdInput";
                inviteOppInput.placeholder = "ID الخصم للدعوة (مثال: #2045)";
                inviteOppInput.style.cssText = "padding:6px 10px; background:var(--card-bg); color:#fff; border:1px solid var(--border); border-radius:7px; font-size:12px; width:165px;";

                const inviteBtn = document.createElement("button");
                inviteBtn.type = "button";
                inviteBtn.textContent = "📩 إرسال دعوة معركة";
                inviteBtn.style.cssText = "background:#8b5cf6; color:#fff; border:none; padding:6px 11px; border-radius:7px; cursor:pointer; font-size:12px; font-weight:bold;";
                inviteBtn.onclick = () => {
                    const targetId = cleanKey(inviteOppInput.value || "", "");
                    if (!targetId) {
                        wbToast("أدخل ID الخصم أولاً لإرسال الدعوة");
                        return;
                    }
                    const me = getActor();
                    const code = cleanKey(roomJoinInput.value || getCurrentRoomCodeClean(), "ROOM-101");
                    const roomName = (document.getElementById("battleRoomNameDisplay")?.textContent || `غرفة #${code}`).trim();
                    setCurrentRoomUi(code, roomName);
                    attachBattleRoomSyncListeners(code);
                    publishBattleStateNow();

                    window.resolveUidByStudentId(targetId).then((tUid) => {
                        if (!tUid) throw new Error("unregistered");
                        return rtdb.ref(`public/invites/${tUid}`).push().set({
                            fromId: me.id,
                            fromUid: me.uid || "",
                            fromName: me.name,
                            roomCode: code,
                            roomName,
                            status: "pending",
                            sourceClientId: CLIENT_SESSION_ID,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }).then(() => {
                        infoSpan.textContent = `📩 تم إرسال دعوة المعركة إلى #${targetId} للغرفة #${code}`;
                        wbToast(`تم إرسال دعوة إلى #${targetId} 📩`);
                    }).catch((err) => {
                        console.error("[invite] send failed:", err);
                        const reason = (err && (err.code || err.message)) || "unknown";
                        wbToast("تعذر إرسال الدعوة الآن (" + reason + ")");
                    });
                };

                controlsWrap.append(roomJoinInput, joinBtn, inviteOppInput, inviteBtn);
                syncBar.append(infoSpan, controlsWrap);
                const modeSelector = classicPanel.querySelector(".battle-mode-selector");
                if (modeSelector && modeSelector.parentElement === classicPanel) {
                    classicPanel.insertBefore(syncBar, modeSelector);
                } else {
                    classicPanel.prepend(syncBar);
                }
            }

            attachBattleRoomSyncListeners(getCurrentRoomCodeClean());

            if (!battleSection.__publicSyncBound) {
                battleSection.__publicSyncBound = true;

                battleSection.addEventListener("click", (ev) => {
                    if (isApplyingRemoteBattleState) return;
                    const btn = ev.target && ev.target.closest ? ev.target.closest("button") : null;
                    if (!btn) return;
                    const code = getCurrentRoomCodeClean();

                    if (window.battleIsGuest) return;
                    if (btn.closest("#battleOptionsGrid")) {
                        const allBtns = Array.from(document.querySelectorAll("#battleOptionsGrid button"));
                        const idx = allBtns.indexOf(btn);
                        recordBattleMoveToRoom(code, {
                            type: "answer",
                            optionIndex: idx,
                            optionText: (btn.textContent || "").trim()
                        });
                    } else if (btn.id === "cantAnswerBtn") {
                        recordBattleMoveToRoom(code, {
                            type: "cant_answer",
                            optionIndex: -1,
                            optionText: "عجز"
                        });
                    }

                    setTimeout(() => {
                        const updatedCode = getCurrentRoomCodeClean();
                        if (updatedCode !== activeBattleSyncCode) {
                            attachBattleRoomSyncListeners(updatedCode);
                        }
                        publishBattleStateNow();
                    }, 90);
                }, true);

                battleSection.addEventListener("change", () => {
                    if (isApplyingRemoteBattleState) return;
                    setTimeout(publishBattleStateNow, 80);
                }, true);

                const battleObserver = new MutationObserver(() => {
                    if (isApplyingRemoteBattleState) return;
                    clearTimeout(battleObserver.__timer);
                    battleObserver.__timer = setTimeout(publishBattleStateNow, 120);
                });
                battleObserver.observe(battleSection, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        }

        // 3) قسم مشاركة مشاريع الطلاب (#section-sharing)
        let sharingInitialized = false;
        let currentSharingUserId = "";
        let latestPublicProjects = [];

        // win-social-study.js renders the feed from a local copy (localStorage), which wiped
        // the cloud projects whenever the section was opened. Route every render to the cloud list.
        window.renderSharedProjects = function renderSharedProjects() {
            renderPublicProjectsFeed(latestPublicProjects);
        };

        function renderPublicProjectsFeed(projects) {
            const feed = document.getElementById("sharedProjectsFeed");
            if (!feed) return;
            const actor = getActor();
            feed.innerHTML = "";

            if (!projects.length) {
                const empty = document.createElement("div");
                empty.style.cssText = "padding:18px; text-align:center; color:#94a3b8; background:rgba(15,23,42,0.7); border-radius:10px; border:1px dashed rgba(148,163,184,0.3);";
                empty.textContent = "لا توجد مشاريع منشورة بعد. اضغط على (🚀 نشر مشروع جديد) لإضافة أول مشروع.";
                feed.appendChild(empty);
                return;
            }

            projects.forEach((proj) => {
                const card = document.createElement("div");
                card.style.cssText = "background:var(--bg-dark); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:14px;";

                const topRow = document.createElement("div");
                topRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;";

                const titleEl = document.createElement("h4");
                titleEl.style.cssText = "margin:0; color:#f8fafc; font-size:16px;";
                titleEl.textContent = proj.title || "مشروع بدون عنوان";

                const domainBadge = document.createElement("span");
                domainBadge.style.cssText = "background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.35); padding:3px 10px; border-radius:999px; font-size:11px; font-weight:bold;";
                domainBadge.textContent = proj.domain || "عام";

                topRow.append(titleEl, domainBadge);

                const authorEl = document.createElement("div");
                authorEl.style.cssText = "font-size:12px; color:#94a3b8; margin-bottom:10px;";
                authorEl.textContent = `بواسطة: ${proj.authorName || "طالب"} (#${proj.authorStudentId || proj.authorId || "?"})`;

                const contentEl = document.createElement("pre");
                contentEl.style.cssText = "background:#020617; border:1px solid rgba(148,163,184,0.2); border-radius:8px; padding:12px; color:#e2e8f0; font-size:13px; white-space:pre-wrap; overflow-x:auto; margin:0 0 12px;";
                contentEl.textContent = proj.content || "";

                const likesObj = proj.reactions?.likes || {};
                const dislikesObj = proj.reactions?.dislikes || {};
                const likeIds = Object.keys(likesObj);
                const dislikeIds = Object.keys(dislikesObj);
                const userLiked = !!likesObj[actor.uid || actor.id];
                const userDisliked = !!dislikesObj[actor.uid || actor.id];

                const actionsRow = document.createElement("div");
                actionsRow.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:10px;";

                const likeBtn = document.createElement("button");
                likeBtn.type = "button";
                likeBtn.textContent = `👍 إعجاب (${likeIds.length})`;
                likeBtn.style.cssText = userLiked
                    ? "background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;"
                    : "background:var(--card-bg); color:#e2e8f0; border:1px solid var(--border); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px;";
                likeBtn.onclick = () => {
                    const u = getActor();
                    const base = rtdb.ref(`public/projects/${proj.id}/reactions`);
                    if (userLiked) {
                        base.child(`likes/${u.uid || u.id}`).remove();
                    } else {
                        base.child(`dislikes/${u.uid || u.id}`).remove();
                        base.child(`likes/${u.uid || u.id}`).set(true);
                    }
                };

                const dislikeBtn = document.createElement("button");
                dislikeBtn.type = "button";
                dislikeBtn.textContent = `👎 ديسلايك (${dislikeIds.length})`;
                dislikeBtn.style.cssText = userDisliked
                    ? "background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;"
                    : "background:var(--card-bg); color:#e2e8f0; border:1px solid var(--border); padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px;";
                dislikeBtn.onclick = () => {
                    const u = getActor();
                    const base = rtdb.ref(`public/projects/${proj.id}/reactions`);
                    if (userDisliked) {
                        base.child(`dislikes/${u.uid || u.id}`).remove();
                    } else {
                        base.child(`likes/${u.uid || u.id}`).remove();
                        base.child(`dislikes/${u.uid || u.id}`).set(true);
                    }
                };

                actionsRow.append(likeBtn, dislikeBtn);

                if (proj.authorId === (actor.uid || actor.id)) {
                    const delBtn = document.createElement("button");
                    delBtn.type = "button";
                    delBtn.textContent = "🗑️ حذف";
                    delBtn.style.cssText = "background:rgba(239,68,68,0.16); color:#fca5a5; border:1px solid rgba(239,68,68,0.4); padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px;";
                    delBtn.onclick = () => {
                        rtdb.ref(`public/projects/${proj.id}`).remove();
                    };
                    actionsRow.appendChild(delBtn);
                }

                const commentsBox = document.createElement("div");
                commentsBox.style.cssText = "border-top:1px solid rgba(148,163,184,0.18); padding-top:10px;";

                const commentsList = Object.values(proj.comments || {});
                commentsList.forEach((c) => {
                    const cRow = document.createElement("div");
                    cRow.style.cssText = "font-size:12px; color:#cbd5e1; background:rgba(15,23,42,0.75); padding:6px 10px; border-radius:7px; margin-bottom:6px;";
                    const cAuthor = document.createElement("strong");
                    cAuthor.style.color = "#38bdf8";
                    cAuthor.textContent = `${c.authorName || "طالب"}: `;
                    const cText = document.createElement("span");
                    cText.textContent = c.text || "";
                    cRow.append(cAuthor, cText);
                    commentsBox.appendChild(cRow);
                });

                const commentForm = document.createElement("div");
                commentForm.style.cssText = "display:flex; gap:8px; margin-top:6px;";

                const cInput = document.createElement("input");
                cInput.type = "text";
                cInput.placeholder = "أضف تعليقاً...";
                cInput.style.cssText = "flex:1; padding:8px 10px; background:var(--card-bg); color:#fff; border:1px solid var(--border); border-radius:8px; font-size:12px;";

                const cBtn = document.createElement("button");
                cBtn.type = "button";
                cBtn.textContent = "تعليق";
                cBtn.style.cssText = "background:var(--primary); color:#fff; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;";

                const submitComment = () => {
                    const txt = String(cInput.value || "").trim().slice(0, 300);
                    if (!txt) return;
                    const u = getActor();
                    rtdb.ref(`public/projects/${proj.id}/comments`).push().set({
                        authorId: u.uid || u.id,
                        authorName: u.name,
                        text: txt,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    cInput.value = "";
                };

                cBtn.onclick = submitComment;
                cInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        submitComment();
                    }
                });

                commentForm.append(cInput, cBtn);
                commentsBox.appendChild(commentForm);

                card.append(topRow, authorEl, contentEl, actionsRow, commentsBox);
                feed.appendChild(card);
            });
        }

        function setupSharingFeedGuards() {
            const shareSec = document.getElementById("section-sharing");
            const feed = document.getElementById("sharedProjectsFeed");
            if (!shareSec || !feed || feed.__guarded) return;
            feed.__guarded = true;
            let repairing = false;
            const repair = () => {
                if (repairing) return;
                if (feed.childElementCount === 0 && latestPublicProjects.length) {
                    repairing = true;
                    renderPublicProjectsFeed(latestPublicProjects);
                    repairing = false;
                }
            };
            new MutationObserver(repair).observe(feed, { childList: true });
            new MutationObserver(() => {
                if (!shareSec.classList.contains("hidden")) repair();
            }).observe(shareSec, { attributes: true, attributeFilter: ["class"] });
        }

        function bindSharingPublicSync() {
            const shareSection = document.getElementById("section-sharing");
            if (!shareSection) return;
            setupSharingFeedGuards();

            const actor = getActor();
            if (!sharingInitialized) {
                sharingInitialized = true;
                currentSharingUserId = actor.id;
                rtdb.ref("public/projects").orderByChild("createdAt").limitToLast(50).on("value", (snap) => {
                    const list = [];
                    if (snap && snap.exists()) {
                        snap.forEach((child) => {
                            list.push({ id: child.key, ...(child.val() || {}) });
                        });
                    }
                    list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
                    latestPublicProjects = list;
                    renderPublicProjectsFeed(latestPublicProjects);
                });
            } else if (currentSharingUserId !== actor.id) {
                currentSharingUserId = actor.id;
                renderPublicProjectsFeed(latestPublicProjects);
            }

            const shareModal = document.getElementById("shareProjectModal");
            if (shareModal && !shareModal.__publicSubmitBound) {
                shareModal.__publicSubmitBound = true;
                const publishBtn = shareModal.querySelector('button[onclick*="submitSharedProject"]');
                if (publishBtn) {
                    publishBtn.addEventListener("click", function (e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();

                        const titleInput = document.getElementById("shareProjTitle");
                        const domainInput = document.getElementById("shareProjDomain");
                        const contentInput = document.getElementById("shareProjContent");

                        const title = String(titleInput?.value || "").trim().slice(0, 120);
                        const domain = String(domainInput?.value || "عام").trim().slice(0, 50);
                        const content = String(contentInput?.value || "").trim().slice(0, 4000);

                        if (!title || !content) {
                            if (typeof showToast === "function") {
                                showToast("يرجى إدخال عنوان المشروع ومحتواه أولاً");
                            }
                            return;
                        }

                        const u = getActor();
                        rtdb.ref("public/projects").push().set({
                            title,
                            domain,
                            content,
                            authorId: u.uid || u.id,
                            authorStudentId: u.id,
                            authorName: u.name,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        }).then(() => {
                            if (titleInput) titleInput.value = "";
                            if (contentInput) contentInput.value = "";
                            if (typeof closeShareModal === "function") {
                                closeShareModal();
                            } else {
                                shareModal.classList.add("hidden");
                            }
                            if (typeof showToast === "function") {
                                showToast("تم نشر المشروع ومزامنته مع الجميع ✅");
                            }
                        });
                    }, true);
                }
            }
        }

        function refreshAllPublicSync() {
            bindStudyRoomPublicSync();
            bindBattlePublicSync();
            bindSharingPublicSync();
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", refreshAllPublicSync);
        } else {
            refreshAllPublicSync();
        }

        document.addEventListener("click", (e) => {
            const btn = e.target && e.target.closest ? e.target.closest("button, [data-mnav]") : null;
            if (!btn) return;
            const idOrAttr = (btn.id || "") + " " + (btn.getAttribute("data-mnav") || "") + " " + (btn.getAttribute("onclick") || "");
            if (/studyRoom|battleArena|sharing|BattleRoom|Competitor|Friend|Accept|Invite/i.test(idOrAttr)) {
                setTimeout(refreshAllPublicSync, 80);
            }
        }, true);

        setInterval(refreshAllPublicSync, 4000);
    })();

/* ===== Inline Script #12 ===== */
(function () {
        const PLATFORM_FIREBASE_CONFIG = {
            apiKey: "AIzaSyCibfAnFN0BACS9-OKf5wmals4KpKc_FKY",
            authDomain: "smart-student-platform-f6eaf.firebaseapp.com",
            databaseURL: "https://smart-student-platform-f6eaf-default-rtdb.firebaseio.com",
            projectId: "smart-student-platform-f6eaf",
            storageBucket: "smart-student-platform-f6eaf.firebasestorage.app",
            messagingSenderId: "112366788977",
            appId: "1:112366788977:web:9e3e00e2c53f6d3e4a96d0",
            measurementId: "G-W99PJPCHQ8"
        };

        if (typeof firebase === "undefined" || !firebase.database) return;
        if (!firebase.apps.length) {
            firebase.initializeApp(PLATFORM_FIREBASE_CONFIG);
        }
        const rtdb = firebase.database();

        function normId(raw) {
            return String(raw || "")
                .replace(/^#/, "")
                .trim()
                .replace(/[^a-zA-Z0-9_-]/g, "");
        }

        function getMe() {
            const u = (typeof currentUser !== "undefined" && currentUser) ? currentUser : null;
            let savedId = "";
            try { savedId = localStorage.getItem("ssp_ff_player_id") || ""; } catch (_) {}
            const id = normId((u && u.id) || savedId || "1001") || "1001";
            try { localStorage.setItem("ssp_ff_player_id", id); } catch (_) {}
            const name = String((u && u.username) || document.getElementById("navUsername")?.textContent || "طالب").trim() || "طالب";
            return { id, name, uid: (window.getCurrentUid ? window.getCurrentUid() : '') };
        }

        function registerMeInDirectory() {
            const me = getMe();
            const myIdBadge = document.getElementById("navUserIdentityId");
            if (myIdBadge) myIdBadge.textContent = "ID: #" + me.id;
            const welcomeIdBadge = document.getElementById("welcomeUserIdBadge");
            if (welcomeIdBadge) welcomeIdBadge.textContent = "#" + me.id;

            const uidKey = me.uid || me.id;
            const payload = {
                studentId: me.id,
                username: me.name,
                name: me.name,
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            };
            if (uidKey) {
                rtdb.ref(`users/${uidKey}`).update(payload).catch(() => {});
                rtdb.ref(`publicProfiles/${uidKey}`).update(payload).catch(() => {});
                rtdb.ref(`users/${uidKey}`).onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
                rtdb.ref(`publicProfiles/${uidKey}`).onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
            }
        }

        async function findRegisteredUserById(rawId) {
            const targetId = normId(rawId);
            if (!targetId || !rtdb) return null;
            try {
                const uid = await window.resolveUidByStudentId(targetId);
                if (!uid) return null;
                const snap = await rtdb.ref("publicProfiles/" + uid).get();
                if (!snap.exists()) return null;
                const val = snap.val() || {};
                const uname = String(val.username || "").trim();
                if (!uname) return null;
                return { id: targetId, uid, username: uname, online: val.online !== false };
            } catch (_) {
                return null;
            }
        }

        async function sendCloudInviteToId(rawTargetId, roomCodeOverride, roomNameOverride) {
            const targetId = normId(rawTargetId);
            const me = getMe();
            if (!targetId) {
                if (typeof showToast === "function") showToast("أدخل ID صحيحاً لإرسال الدعوة");
                return false;
            }
            if (targetId === me.id) {
                if (typeof showToast === "function") showToast("لا يمكنك إرسال دعوة إلى الـ ID الخاص بك");
                return false;
            }

            const code = normId(roomCodeOverride || document.getElementById("battleRoomCodeBadge")?.textContent || "ROOM-101") || "ROOM-101";
            const roomName = String(roomNameOverride || document.getElementById("battleRoomNameDisplay")?.textContent || `غرفة #${code}`).trim();

            const tUid = await window.resolveUidByStudentId(targetId);
            if (!tUid) {
                if (typeof showToast === "function") showToast("هذا ID غير مسجّل في المنصة");
                return false;
            }
            try {
                await rtdb.ref(`public/invites/${tUid}`).push().set({
                    fromId: me.id,
                    fromUid: me.uid || "",
                    fromName: me.name,
                    roomCode: code,
                    roomName,
                    status: "pending",
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                if (typeof showToast === "function") {
                    showToast(`تم إرسال الدعوة إلى #${targetId} 📩`);
                }
                return true;
            } catch (err) {
                console.error("[invite] send failed:", err);
                const reason = (err && (err.code || err.message)) || "unknown";
                if (typeof showToast === "function") {
                    showToast("تعذر إرسال الدعوة الآن (" + reason + ")");
                }
                return false;
            }
        }

        window.sendBattleInviteToId = function sendBattleInviteToId(rawTargetId, roomCodeOverride, roomNameOverride) {
            return sendCloudInviteToId(rawTargetId, roomCodeOverride, roomNameOverride);
        };

        function addOpponentToBattleTeamState(userObj, targetTeam = "B") {
            if (!userObj || !userObj.id) return;
            const entry = {
                name: userObj.username,
                studentId: "#" + userObj.id,
                score: 0,
                isUser: false,
                isCustom: true
            };

            if (targetTeam === "A") {
                if (typeof battleTeamA !== "undefined" && Array.isArray(battleTeamA)) {
                    const idx = battleTeamA.findIndex(p => normId(p.studentId || p.id) === userObj.id);
                    if (idx >= 0) battleTeamA[idx] = { ...battleTeamA[idx], ...entry };
                    else if (battleTeamA.length < (window.battleSize || 1)) battleTeamA.push(entry);
                    else battleTeamA[battleTeamA.length - 1] = entry;
                }
            } else {
                if (typeof customTeamB !== "undefined" && Array.isArray(customTeamB)) {
                    const cIdx = customTeamB.findIndex(p => normId(p.studentId || p.id) === userObj.id);
                    if (cIdx >= 0) customTeamB[cIdx] = { ...customTeamB[cIdx], ...entry };
                    else customTeamB.unshift(entry);
                }
                if (typeof battleTeamB !== "undefined" && Array.isArray(battleTeamB)) {
                    const bIdx = battleTeamB.findIndex(p => normId(p.studentId || p.id) === userObj.id);
                    if (bIdx >= 0) battleTeamB[bIdx] = { ...battleTeamB[bIdx], ...entry };
                    else if (battleTeamB.length > 0) battleTeamB[0] = entry;
                    else battleTeamB.push(entry);
                }
            }

            if (typeof renderBattleTeams === "function") {
                renderBattleTeams();
            }
        }

        function addFriendToStudyRoomState(userObj, topicText) {
            if (!userObj || !userObj.id) return;
            const me = getMe();
            const topic = String(topicText || "متصل في غرفة المذاكرة").trim();
            const friendItem = {
                id: "#" + userObj.id,
                name: userObj.username,
                status: topic,
                online: true
            };

            if (typeof customFriends !== "undefined" && Array.isArray(customFriends)) {
                const idx = customFriends.findIndex(f => normId(f.id) === userObj.id);
                if (idx >= 0) customFriends[idx] = friendItem;
                else customFriends.push(friendItem);
            }

            try {
                const raw = JSON.parse(localStorage.getItem("ssp_ff_friends_" + me.id) || "[]");
                const list = Array.isArray(raw) ? raw : [];
                if (!list.some(x => normId(x.id) === userObj.id)) {
                    list.push({ id: userObj.id, name: userObj.username });
                    localStorage.setItem("ssp_ff_friends_" + me.id, JSON.stringify(list));
                }
            } catch (_) {}

            rtdb.ref(`friends/${me.uid || me.id}/${userObj.uid || userObj.id}`).set({
                uid: userObj.uid || "",
                id: userObj.id,
                name: userObj.username,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});

            if (typeof renderOnlineStudents === "function") {
                renderOnlineStudents();
            }
            if (typeof renderLocalFallbackFriends === "function") {
                renderLocalFallbackFriends();
            }
        }

        window.lookupRegisteredUserById = async function () {
            const input = document.getElementById("friendNameOrIdInput");
            const box = document.getElementById("lookupUserResultBox");
            const raw = String(input?.value || "").trim();
            const targetId = normId(raw);
            if (!box) return;

            if (!targetId) {
                box.style.color = "#fbbf24";
                box.textContent = "أدخل ID صحيحاً للبحث (مثال: #2045).";
                return;
            }

            box.style.color = "#38bdf8";
            box.textContent = `جاري البحث عن #${targetId}...`;

            const found = await findRegisteredUserById(targetId);
            if (!found) {
                box.style.color = "#f87171";
                box.textContent = `لم يتم العثور على مستخدم مسجل بالـ ID #${targetId}.`;
                return;
            }

            box.style.color = "#34d399";
            box.textContent = `تم العثور على: ${found.username} (#${found.id}) ${found.online ? "• متصل" : ""}`;
            const topicInput = document.getElementById("friendTopicInput");
            if (topicInput && !topicInput.value.trim()) {
                topicInput.value = `طالب مسجل (#${found.id})`;
            }
        };

        window.sendLiveInviteFromFriendModal = async function () {
            const input = document.getElementById("friendNameOrIdInput");
            const targetId = normId(input?.value || "");
            if (!targetId) {
                if (typeof showToast === "function") showToast("أدخل ID المستخدم أولاً");
                return;
            }
            const found = await findRegisteredUserById(targetId);
            const sent = await sendCloudInviteToId(targetId);
            if (sent && found) {
                addFriendToStudyRoomState(found, document.getElementById("friendTopicInput")?.value);
            }
        };

        function bindIdIntegrationHooks() {
            registerMeInDirectory();

            const friendModal = document.getElementById("addFriendModal");
            if (friendModal && !friendModal.__idHookBound) {
                friendModal.__idHookBound = true;
                const addBtn = friendModal.querySelector('button[onclick*="submitAddFriend"]');
                if (addBtn) {
                    addBtn.addEventListener("click", async function (e) {
                        const rawVal = String(document.getElementById("friendNameOrIdInput")?.value || "").trim();
                        const targetId = normId(rawVal);
                        if (!targetId) return;

                        e.preventDefault();
                        e.stopImmediatePropagation();

                        const found = await findRegisteredUserById(targetId);
                        const userObj = found || {
                            id: targetId,
                            username: /^\d+$/.test(rawVal) ? `طالب #${targetId}` : rawVal,
                            online: true
                        };
                        addFriendToStudyRoomState(userObj, document.getElementById("friendTopicInput")?.value);
                        if (typeof closeAddFriendModal === "function") closeAddFriendModal();
                        if (typeof showToast === "function") showToast(`تمت إضافة ${userObj.username} (#${userObj.id}) ✅`);
                    }, true);
                }
            }

            const compModal = document.getElementById("addCompetitorModal");
            if (compModal && !compModal.__idHookBound) {
                compModal.__idHookBound = true;
                const compBtn = compModal.querySelector('button[onclick*="submitAddCompetitor"]');
                if (compBtn) {
                    compBtn.addEventListener("click", async function (e) {
                        const rawVal = String(document.getElementById("competitorNameOrIdInput")?.value || "").trim();
                        const targetId = normId(rawVal);
                        if (!targetId) return;

                        e.preventDefault();
                        e.stopImmediatePropagation();

                        const teamSel = document.getElementById("competitorTargetTeam")?.value || "B";
                        const found = await findRegisteredUserById(targetId);
                        const userObj = found || {
                            id: targetId,
                            username: /^\d+$/.test(rawVal) ? `منافس #${targetId}` : rawVal,
                            online: true
                        };

                        addOpponentToBattleTeamState(userObj, teamSel);
                        if (teamSel === "B" && userObj.id !== getMe().id) {
                            await sendCloudInviteToId(userObj.id);
                        }
                        if (typeof closeAddCompetitorModal === "function") closeAddCompetitorModal();
                        if (typeof showToast === "function") showToast(`تمت إضافة ${userObj.username} (#${userObj.id}) إلى المعركة ⚔️`);
                    }, true);
                }
            }

            const aiOppBtn = document.querySelector('button[onclick*="addAiOpponentById"]');
            if (aiOppBtn && !aiOppBtn.__idHookBound) {
                aiOppBtn.__idHookBound = true;
                aiOppBtn.addEventListener("click", async function (e) {
                    const input = document.getElementById("aiOpponentIdInput");
                    const targetId = normId(input?.value || "");
                    if (!targetId) return;

                    const found = await findRegisteredUserById(targetId);
                    if (found) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if (typeof activeAiOpponentId !== "undefined") {
                            window.activeAiOpponentId = "#" + found.id;
                        }
                        const badge = document.getElementById("aiOpponentLinkedBadge");
                        if (badge) badge.textContent = `الخصم المرتبط: #${found.id} (${found.username})`;
                        const titleEl = document.getElementById("aiOpponentDisplayTitle");
                        if (titleEl) titleEl.textContent = `${found.username} #${found.id}`;
                        const nameInp = document.getElementById("ai2NameInput");
                        if (nameInp) nameInp.value = `وكيل الخصم — ${found.username} (#${found.id})`;
                        if (typeof showToast === "function") showToast(`تم ربط وكيل الخصم: ${found.username} (#${found.id}) 🤖`);
                    }
                }, true);
            }
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", bindIdIntegrationHooks);
        } else {
            bindIdIntegrationHooks();
        }
        setInterval(registerMeInDirectory, 15000);
    })();
