        /* ==================== الآلة الحاسبة والرسوم البيانية ==================== */
        function toggleAdvancedMenu() {
            const p = document.getElementById('advancedPanel'), b = document.getElementById('toggleAdvBtn'); p.classList.toggle('hidden');
            b.textContent = p.classList.contains('hidden') ? '🔽 الرموز الرياضية والمتغيرات (π, e, x, y, √)' : '🔼 إخفاء الرموز المتقدمة';
        }
        function calcPress(val) { const s = document.getElementById('calcScreen'); s.value = (s.value || '') + val; notifyWatcherActivity('calc'); }
        function calcClear() { document.getElementById('calcScreen').value = ''; }
        function calcBack() { const s = document.getElementById('calcScreen'); s.value = s.value.slice(0, -1); }
        function calcEval() {
            const s = document.getElementById('calcScreen'); let expr = s.value; if (!expr.trim()) return;
            expr = expr.replace(/π/g, 'Math.PI').replace(/\be\b/g, 'Math.E').replace(/\^2/g, '**2').replace(/\^/g, '**').replace(/sqrt\(/g, 'Math.sqrt(').replace(/abs\(/g, 'Math.abs(').replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(').replace(/ln\(/g, 'Math.log(').replace(/exp\(/g, 'Math.exp(');
            try { const res = Function('"use strict";return (' + expr + ')')(); s.value = (typeof res === 'number' && !Number.isInteger(res)) ? parseFloat(res.toFixed(6)) : res; }
            catch (err) { s.value = 'خطأ رياضي'; }
        }
        function toggleGpaMode() { document.getElementById('gpaPanel').classList.toggle('hidden'); }
        function addGpaItem() {
            const subj = document.getElementById('gpaSubj').value.trim(), grade = parseFloat(document.getElementById('gpaGrade').value), coeff = parseFloat(document.getElementById('gpaCoeff').value);
            if (!subj || isNaN(grade) || isNaN(coeff) || coeff <= 0) { showToast('يرجى إدخال بيانات صحيحة', true); return; }
            gpaItems.push({ subject: subj, grade, coeff }); document.getElementById('gpaSubj').value = ''; document.getElementById('gpaGrade').value = ''; document.getElementById('gpaCoeff').value = '';
            renderGpaList();
        }
        function removeGpaItem(i) { gpaItems.splice(i, 1); renderGpaList(); }
        function renderGpaList() {
            const list = document.getElementById('gpaList'); list.innerHTML = ''; let sumWeighted = 0, sumCoeff = 0;
            gpaItems.forEach((item, idx) => {
                sumWeighted += item.grade * item.coeff; sumCoeff += item.coeff;
                const d = document.createElement('div'); d.className = 'list-item';
                d.innerHTML = `<span>${escapeHtml(item.subject)} — <strong>${item.grade}/20</strong> (معامل ${item.coeff})</span><button class="btn btn-danger" onclick="removeGpaItem(${idx})">حذف</button>`;
                list.appendChild(d);
            });
            const gpa = sumCoeff > 0 ? (sumWeighted / sumCoeff).toFixed(2) : '0.00';
            document.getElementById('gpaResult').textContent = `المعدل التراكمي: ${gpa} / 20`;
        }
        function drawGraph() {
            if (typeof window.Chart === 'undefined') {
                showToast('مكتبة الرسوم البيانية غير متاحة حالياً', true);
                return;
            }
            const exprInput = (document.getElementById('funcInput')?.value || 'x * x').trim();
            const labels = [], dataPoints = [];
            for (let x = -10; x <= 10; x += 0.5) {
                labels.push(x.toFixed(1));
                try {
                    const safeExpr = exprInput
                        .replace(/\^/g, '**')
                        .replace(/π/g, 'Math.PI')
                        .replace(/\be\b/g, 'Math.E')
                        .replace(/sin\(/g, 'Math.sin(')
                        .replace(/cos\(/g, 'Math.cos(')
                        .replace(/tan\(/g, 'Math.tan(')
                        .replace(/sqrt\(/g, 'Math.sqrt(')
                        .replace(/abs\(/g, 'Math.abs(')
                        .replace(/ln\(/g, 'Math.log(')
                        .replace(/exp\(/g, 'Math.exp(');
                    const y = Function('x', '"use strict";return (' + safeExpr + ')')(x);
                    dataPoints.push(Number.isFinite(y) ? y : null);
                } catch (e) { dataPoints.push(null); }
            }
            const ctx = document.getElementById('mathChart').getContext('2d');
            if (mathChartInstance) mathChartInstance.destroy();
            mathChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{ label: `f(x) = ${exprInput}`, data: dataPoints, borderColor: selectedGender === 'female' ? '#f472b6' : '#38bdf8', backgroundColor: selectedGender === 'female' ? 'rgba(244,114,182,0.1)' : 'rgba(56,189,248,0.1)', borderWidth: 3, pointRadius: 1, tension: 0.25 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } } }, plugins: { legend: { labels: { color: '#f8fafc', font: { size: 14 } } } } }
            });
        }
