/* ==========================================================================
   note-editor-v2.js
   Notes editor upgrade:
   - Table: a size picker (rows x columns), no fixed 3x3 table.
   - Images: placed where the student chooses. Long-press an image to drag it
     to a new place. Resize from any of the four corners (aspect ratio kept).
   - The old left/right buttons and slider are hidden by CSS.
   Loaded after app.js, so these replace the earlier handlers.
   ========================================================================== */
(function () {
    const MAX_IMG_WIDTH = 1600;

    const editor = () => document.getElementById('wordRichEditor');
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function syncNote() {
        if (typeof updateCurrentNoteContent === 'function') updateCurrentNoteContent();
    }

    // ---------- 1) Table with a chosen size ----------
    let picker = null;

    function closePicker() { if (picker) { picker.remove(); picker = null; } }

    function insertTable(rows, cols) {
        const el = editor();
        if (!el) return;
        el.focus();
        const head = '<tr>' + Array.from({ length: cols }, (_, c) => `<th>عمود ${c + 1}</th>`).join('') + '</tr>';
        const body = Array.from({ length: rows - 1 }, () =>
            '<tr>' + Array.from({ length: cols }, () => '<td><br></td>').join('') + '</tr>'
        ).join('');
        document.execCommand('insertHTML', false, `<table class="note-table"><thead>${head}</thead><tbody>${body}</tbody></table><p><br></p>`);
        syncNote();
    }

    function openTablePicker(anchor) {
        closePicker();
        picker = document.createElement('div');
        picker.className = 'note-table-picker';
        const grid = document.createElement('div');
        grid.className = 'ntp-grid';
        const label = document.createElement('div');
        label.className = 'ntp-label';
        label.textContent = 'اختر الحجم: 1 × 1';
        const N = 8;
        for (let r = 1; r <= N; r++) for (let c = 1; c <= N; c++) {
            const cell = document.createElement('span');
            cell.className = 'ntp-cell';
            cell.dataset.r = r; cell.dataset.c = c;
            cell.onmouseenter = () => {
                grid.querySelectorAll('.ntp-cell').forEach(x => {
                    x.classList.toggle('on', +x.dataset.r <= r && +x.dataset.c <= c);
                });
                label.textContent = `اختر الحجم: ${r} × ${c}`;
            };
            cell.onclick = () => { closePicker(); insertTable(r, c); };
            grid.appendChild(cell);
        }
        const custom = document.createElement('div');
        custom.className = 'ntp-custom';
        custom.innerHTML = '<label>صفوف <input type="number" min="1" max="30" value="3"></label>'
            + '<label>أعمدة <input type="number" min="1" max="12" value="3"></label>'
            + '<button type="button">إدراج</button>';
        custom.querySelector('button').onclick = () => {
            const [rIn, cIn] = custom.querySelectorAll('input');
            const r = Math.min(30, Math.max(1, parseInt(rIn.value, 10) || 3));
            const c = Math.min(12, Math.max(1, parseInt(cIn.value, 10) || 3));
            closePicker();
            insertTable(r, c);
        };
        picker.append(label, grid, custom);
        document.body.appendChild(picker);
        const rect = anchor.getBoundingClientRect();
        picker.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        picker.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
    }

    window.insertWordTable = function () {
        const btn = document.querySelector('[onclick*="insertWordTable"]');
        openTablePicker(btn || document.body);
    };
    document.addEventListener('click', (e) => {
        if (picker && !picker.contains(e.target) && !(e.target.closest && e.target.closest('[onclick*="insertWordTable"]'))) closePicker();
    });

    // ---------- 2) Images: placed by the student, resized from corners ----------
    function makeFigure(src, alt) {
        const fig = document.createElement('figure');
        fig.className = 'note-img';
        fig.contentEditable = 'false';
        fig.dataset.w = '50';
        fig.style.width = '50%';
        fig.innerHTML = `<img src="${src}" alt="${esc(alt || '')}" draggable="false">`
            + ['tl', 'tr', 'bl', 'br'].map(c => `<span class="ni-h ni-${c}" data-corner="${c}"></span>`).join('')
            + '<figcaption class="ni-hint">اضغط مطولاً للنقل</figcaption>';
        return fig;
    }

    async function fileToDataUrl(file) {
        const img = await new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const i = new Image();
            i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
            i.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
            i.src = url;
        });
        const scale = Math.min(1, MAX_IMG_WIDTH / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
    }

    window.handleNoteImageFilesSelected = async function (event) {
        const files = Array.from((event && event.target && event.target.files) || []).filter(f => f && f.type && f.type.startsWith('image/'));
        if (event && event.target) event.target.value = '';
        const el = editor();
        if (!el || !files.length) return;
        el.focus();
        for (const f of files) {
            try {
                const src = await fileToDataUrl(f);
                document.execCommand('insertHTML', false, makeFigure(src, f.name).outerHTML);
            } catch (_) { /* skip unreadable file */ }
        }
        syncNote();
    };

    // Resize from a corner. The opposite corner stays in place; aspect ratio is kept.
    let resizing = null, moving = null, pressTimer = null, pressFig = null;

    function beginResize(e, fig, corner) {
        const box = editor().getBoundingClientRect();
        resizing = { fig, corner, startX: e.clientX, startW: fig.getBoundingClientRect().width, boxW: box.width };
        e.preventDefault();
    }

    function beginMove(e, fig) {
        moving = fig;
        moving._sx = e.clientX; moving._sy = e.clientY;
        fig.classList.add('is-moving');
        fig.style.opacity = '0.6';
    }

    function caretFromPoint(x, y) {
        if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
        if (document.caretPositionFromPoint) {
            const p = document.caretPositionFromPoint(x, y);
            if (!p) return null;
            const r = document.createRange();
            r.setStart(p.offsetNode, p.offset);
            return r;
        }
        return null;
    }

    function finishMove(x, y) {
        const fig = moving;
        moving = null;
        fig.classList.remove('is-moving');
        fig.style.opacity = '';
        fig.style.transform = '';
        const range = caretFromPoint(x, y);
        if (!range || !editor().contains(range.startContainer)) return;
        fig.remove();
        range.insertNode(fig);
        fig.after(document.createElement('p'));
        syncNote();
    }

    document.addEventListener('pointerdown', (e) => {
        const ed = editor();
        if (!ed || !ed.contains(e.target)) return;
        const handle = e.target.closest && e.target.closest('.ni-h');
        if (handle) {
            const fig = handle.closest('.note-img');
            if (fig) beginResize(e, fig, handle.dataset.corner);
            return;
        }
        const fig = e.target.closest && e.target.closest('.note-img');
        if (fig) {
            pressFig = fig;
            pressFig.dataset.px = e.clientX; pressFig.dataset.py = e.clientY;
            clearTimeout(pressTimer);
            pressTimer = setTimeout(() => { if (pressFig) beginMove(e, pressFig); }, 450);
        }
    });

    document.addEventListener('pointermove', (e) => {
        if (resizing) {
            const { fig, corner, startX, startW, boxW } = resizing;
            const dx = e.clientX - startX;
            const sign = corner.endsWith('r') ? 1 : -1;     // dragging the right side grows to the right
            const pct = Math.max(15, Math.min(100, ((startW + sign * dx) / boxW) * 100));
            fig.style.width = pct.toFixed(1) + '%';
            fig.dataset.w = Math.round(pct);
            return;
        }
        if (pressFig && !moving) {
            const dx = e.clientX - (+pressFig.dataset.px || 0), dy = e.clientY - (+pressFig.dataset.py || 0);
            if (Math.hypot(dx, dy) > 8) { clearTimeout(pressTimer); pressFig = null; }
        }
        if (moving) {
            moving.style.transform = `translate(${e.clientX - moving._sx}px, ${e.clientY - moving._sy}px)`;
        }
    });

    document.addEventListener('pointerup', (e) => {
        clearTimeout(pressTimer);
        pressFig = null;
        if (resizing) { resizing = null; syncNote(); return; }
        if (moving) { finishMove(e.clientX, e.clientY); }
    });

    // Keep the editor free of stray handles from earlier versions when a note is loaded.
    new MutationObserver(() => {
        document.querySelectorAll('.img-side-resize-handle').forEach(h => h.remove());
    }).observe(document.body, { childList: true, subtree: true });
})();
