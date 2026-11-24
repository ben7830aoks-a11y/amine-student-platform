      (function () {
        'use strict';

        // 1. إدارة تبويبات بناء المشاريع داخل قسم تحويل صور إلى فيديوهات
        const hubTabAllBtn = document.getElementById('hubTabAllBtn');
        const hubTabImg2VidBtn = document.getElementById('hubTabImg2VidBtn');
        const hubTabGuideBtn = document.getElementById('hubTabGuideBtn');
        const hubGuideBox = document.getElementById('hubGuideBox');
        const img2vidSection = document.getElementById('images-to-video-section');

        const defaultGuideHtml = hubGuideBox ? hubGuideBox.innerHTML : '';

        function setHubTabActive(activeBtn) {
          [hubTabAllBtn, hubTabImg2VidBtn, hubTabGuideBtn].forEach((btn) => {
            if (!btn) return;
            const isSelected = btn === activeBtn;
            btn.classList.toggle('active', isSelected);
            btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          });
        }

        if (hubTabAllBtn) {
          hubTabAllBtn.addEventListener('click', () => {
            setHubTabActive(hubTabAllBtn);
            if (img2vidSection) img2vidSection.classList.remove('img2vid-hidden');
            if (hubGuideBox) hubGuideBox.innerHTML = defaultGuideHtml;
          });
        }

        if (hubTabImg2VidBtn) {
          hubTabImg2VidBtn.addEventListener('click', () => {
            setHubTabActive(hubTabImg2VidBtn);
            if (img2vidSection) {
              img2vidSection.classList.remove('img2vid-hidden');
              img2vidSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        }

        if (hubTabGuideBtn) {
          hubTabGuideBtn.addEventListener('click', () => {
            setHubTabActive(hubTabGuideBtn);
            if (hubGuideBox) {
              hubGuideBox.innerHTML =
                '<strong>ملاحظة الدمج:</strong> جميع عناصر وتبويبات وأدوات <strong>تحويل صور إلى فيديوهات</strong> تعمل مباشرة داخل المتصفح، ويمكن إرسال الفيديو الناتج إلى <strong>دفتر الملاحظات</strong> أو نشره في <strong>مشاركة مشاريع</strong>.';
            }
          });
        }

        // 2. عناصر ومكونات وحدة تحويل الصور إلى فيديو
        const dropzone = document.getElementById('i2vDropzone');
        const fileInput = document.getElementById('i2vFileInput');
        const slideListEl = document.getElementById('i2vSlideList');
        const sampleBtn = document.getElementById('i2vSampleBtn');
        const clearBtn = document.getElementById('i2vClearBtn');
        const durationInput = document.getElementById('i2vDuration');
        const motionSelect = document.getElementById('i2vMotion');
        const ratioSelect = document.getElementById('i2vRatio');
        const fpsSelect = document.getElementById('i2vFps');
        const captionInput = document.getElementById('i2vCaption');
        const audioInput = document.getElementById('i2vAudioInput');
        const previewBtn = document.getElementById('i2vPreviewBtn');
        const generateBtn = document.getElementById('i2vGenerateBtn');
        const stopBtn = document.getElementById('i2vStopBtn');
        const clearVideoBtn = document.getElementById('i2vClearVideoBtn');
        const progressBar = document.getElementById('i2vProgressBar');
        const statusEl = document.getElementById('i2vStatus');
        const canvas = document.getElementById('i2vCanvas');
        const resultBox = document.getElementById('i2vResultBox');
        const resultVideo = document.getElementById('i2vResultVideo');
        const downloadLink = document.getElementById('i2vDownloadLink');
        const sendToNoteBtn = document.getElementById('i2vSendToNoteBtn');
        const publishProjectBtn = document.getElementById('i2vPublishProjectBtn');
        const slideCountBadge = document.getElementById('i2vSlideCountBadge');
        const totalDurationBadge = document.getElementById('i2vTotalDurationBadge');

        if (!canvas || !slideListEl) return;
        const ctx = canvas.getContext('2d');

        let slides = []; // { id, name, img, objectUrl }
        let isRunning = false;
        let cancelFlag = false;
        let activeAnimFrame = null;
        let activeRecorder = null;
        let activeAudioCtx = null;
        let activeAudioSource = null;
        let currentGeneratedBlob = null;
        let currentGeneratedUrl = null;
        let draggedSlideIndex = null;

        function setStatus(msg) {
          if (statusEl) statusEl.textContent = msg;
        }

        function setProgress(pct) {
          const clamped = Math.max(0, Math.min(100, pct));
          if (progressBar) progressBar.style.width = `${clamped}%`;
        }

        function getSlideDurationSec() {
          const val = parseFloat(durationInput ? durationInput.value : '2.5');
          if (Number.isNaN(val)) return 2.5;
          return Math.max(1, Math.min(15, val));
        }

        function updateSummaryBadges() {
          const count = slides.length;
          const totalSec = (count * getSlideDurationSec()).toFixed(1);
          if (slideCountBadge) slideCountBadge.textContent = `عدد الصور: ${count}`;
          if (totalDurationBadge) totalDurationBadge.textContent = `المدة التقديرية: ${totalSec} ثانية`;
        }

        function updateCanvasDimensions() {
          const ratio = ratioSelect ? ratioSelect.value : '16:9';
          if (ratio === '1:1') {
            canvas.width = 1080;
            canvas.height = 1080;
          } else if (ratio === '9:16') {
            canvas.width = 720;
            canvas.height = 1280;
          } else {
            canvas.width = 1280;
            canvas.height = 720;
          }
          if (!isRunning && slides.length > 0) {
            drawSlideFrame(slides[0].img, 0.35, motionSelect ? motionSelect.value : 'zoomIn', captionInput ? captionInput.value : '', 1);
          } else if (!isRunning && slides.length === 0) {
            drawIdleCanvas();
          }
        }

        function drawIdleCanvas() {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 28px Tahoma, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('شاشة معاينة الفيديو — أضف صوراً للبدء', canvas.width / 2, canvas.height / 2);
        }

        function revokeSlideUrl(slide) {
          if (slide && slide.objectUrl && slide.objectUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(slide.objectUrl);
            } catch (_) {}
          }
        }

        function clearGeneratedVideoResult() {
          if (currentGeneratedUrl) {
            try {
              URL.revokeObjectURL(currentGeneratedUrl);
            } catch (_) {}
            currentGeneratedUrl = null;
          }
          currentGeneratedBlob = null;
          if (resultVideo) {
            resultVideo.pause();
            resultVideo.removeAttribute('src');
            resultVideo.load();
          }
          if (downloadLink) {
            downloadLink.removeAttribute('href');
          }
          if (resultBox) {
            resultBox.classList.remove('active');
          }
        }

        function moveSlide(fromIdx, toIdx) {
          if (fromIdx === toIdx) return;
          if (fromIdx < 0 || fromIdx >= slides.length || toIdx < 0 || toIdx >= slides.length) return;
          const [moved] = slides.splice(fromIdx, 1);
          slides.splice(toIdx, 0, moved);
          renderSlides();
          if (!isRunning && slides.length > 0) {
            drawSlideFrame(slides[0].img, 0.35, motionSelect ? motionSelect.value : 'zoomIn', captionInput ? captionInput.value : '', 1);
          }
        }

        function renderSlides() {
          updateSummaryBadges();
          if (!slides.length) {
            slideListEl.innerHTML = '<div class="slide-sub" style="text-align:center; padding: 14px;">لا توجد صور مضافة بعد. أضف صوراً أو اضغط "جرّب بمثال سريع".</div>';
            return;
          }

          slideListEl.innerHTML = '';
          slides.forEach((slide, idx) => {
            const item = document.createElement('div');
            item.className = 'slide-item';
            item.draggable = true;
            item.dataset.index = String(idx);

            item.addEventListener('dragstart', (e) => {
              draggedSlideIndex = idx;
              item.classList.add('dragging');
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(idx));
              }
            });

            item.addEventListener('dragend', () => {
              draggedSlideIndex = null;
              item.classList.remove('dragging');
              slideListEl.querySelectorAll('.slide-item').forEach((el) => el.classList.remove('drag-over-card'));
            });

            item.addEventListener('dragover', (e) => {
              e.preventDefault();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              item.classList.add('drag-over-card');
            });

            item.addEventListener('dragleave', () => {
              item.classList.remove('drag-over-card');
            });

            item.addEventListener('drop', (e) => {
              e.preventDefault();
              item.classList.remove('drag-over-card');
              let fromIdx = draggedSlideIndex;
              if (fromIdx === null && e.dataTransfer) {
                const parsed = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (!Number.isNaN(parsed)) fromIdx = parsed;
              }
              if (fromIdx !== null && fromIdx !== idx) {
                moveSlide(fromIdx, idx);
              }
              draggedSlideIndex = null;
            });

            const img = document.createElement('img');
            img.src = slide.objectUrl || slide.img.src;
            img.alt = slide.name;

            const title = document.createElement('div');
            title.className = 'slide-title';
            title.textContent = `${idx + 1}. ${slide.name}`;

            const meta = document.createElement('div');
            meta.className = 'slide-sub';
            meta.textContent = `شريحة ${idx + 1} من ${slides.length} • اسحب لإعادة الترتيب`;

            const actions = document.createElement('div');
            actions.className = 'slide-actions';

            const upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'icon-btn';
            upBtn.textContent = '↑';
            upBtn.title = 'نقل لأعلى';
            upBtn.disabled = idx === 0;
            upBtn.addEventListener('click', () => moveSlide(idx, idx - 1));

            const downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'icon-btn';
            downBtn.textContent = '↓';
            downBtn.title = 'نقل لأسفل';
            downBtn.disabled = idx === slides.length - 1;
            downBtn.addEventListener('click', () => moveSlide(idx, idx + 1));

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'icon-btn danger';
            delBtn.textContent = '✕';
            delBtn.title = 'حذف الصورة';
            delBtn.addEventListener('click', () => {
              const removed = slides.splice(idx, 1)[0];
              revokeSlideUrl(removed);
              renderSlides();
              if (!isRunning) {
                if (slides.length > 0) {
                  drawSlideFrame(slides[0].img, 0.35, motionSelect ? motionSelect.value : 'zoomIn', captionInput ? captionInput.value : '', 1);
                } else {
                  drawIdleCanvas();
                }
              }
            });

            actions.appendChild(upBtn);
            actions.appendChild(downBtn);
            actions.appendChild(delBtn);

            item.appendChild(img);
            item.appendChild(title);
            item.appendChild(meta);
            item.appendChild(actions);
            slideListEl.appendChild(item);
          });
        }

        function loadImageFromFile(file) {
          return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, img, objectUrl: url });
            img.onerror = (err) => {
              try { URL.revokeObjectURL(url); } catch (_) {}
              reject(err);
            };
            img.src = url;
          });
        }

        async function handleFiles(fileList) {
          const files = Array.from(fileList || []).filter((f) => f.type && f.type.startsWith('image/'));
          if (!files.length) {
            setStatus('يرجى اختيار ملفات صور صالحة (PNG, JPG, WEBP).');
            return;
          }
          setStatus('جاري تحميل الصور...');
          for (const file of files) {
            try {
              const slide = await loadImageFromFile(file);
              slides.push(slide);
            } catch (_) {
              setStatus(`تعذر قراءة الصورة: ${file.name}`);
            }
          }
          renderSlides();
          if (slides.length > 0 && !isRunning) {
            drawSlideFrame(slides[0].img, 0.35, motionSelect ? motionSelect.value : 'zoomIn', captionInput ? captionInput.value : '', 1);
          }
          setStatus(`تمت إضافة ${files.length} صورة. الإجمالي: ${slides.length}.`);
        }

        function createSampleDataUrl(bg1, bg2, title, subtitle) {
          const c = document.createElement('canvas');
          c.width = 1280;
          c.height = 720;
          const gCtx = c.getContext('2d');
          const grad = gCtx.createLinearGradient(0, 0, c.width, c.height);
          grad.addColorStop(0, bg1);
          grad.addColorStop(1, bg2);
          gCtx.fillStyle = grad;
          gCtx.fillRect(0, 0, c.width, c.height);

          gCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          gCtx.beginPath();
          gCtx.arc(1080, 160, 220, 0, Math.PI * 2);
          gCtx.fill();

          gCtx.fillStyle = '#ffffff';
          gCtx.font = 'bold 54px Tahoma, Arial, sans-serif';
          gCtx.textAlign = 'center';
          gCtx.textBaseline = 'middle';
          gCtx.fillText(title, c.width / 2, c.height / 2 - 26);

          gCtx.fillStyle = '#e2e8f0';
          gCtx.font = '28px Tahoma, Arial, sans-serif';
          gCtx.fillText(subtitle, c.width / 2, c.height / 2 + 36);
          return c.toDataURL('image/png');
        }

        async function loadSampleSlides() {
          if (isRunning) return;
          const samples = [
            { name: 'slide-1-intro.png', url: createSampleDataUrl('#1e3a8a', '#0f172a', 'مقدمة المشروع الطلابي', 'عرض منظم للأفكار والنتائج') },
            { name: 'slide-2-method.png', url: createSampleDataUrl('#065f46', '#0f172a', 'منهجية العمل والتنفيذ', 'خطوات واضحة قابلة للقياس') },
            { name: 'slide-3-summary.png', url: createSampleDataUrl('#7c2d12', '#0f172a', 'الخلاصة والتوصيات', 'جاهز للمشاركة والحفظ') }
          ];

          slides.forEach(revokeSlideUrl);
          slides = [];

          for (const s of samples) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                slides.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: s.name, img, objectUrl: s.url });
                resolve();
              };
              img.onerror = () => {
                resolve();
              };
              img.src = s.url;
            });
          }

          if (captionInput && !captionInput.value.trim()) {
            captionInput.value = 'عرض تقديمي سريع لمشروع الطالب';
          }
          renderSlides();
          drawSlideFrame(slides[0].img, 0.35, motionSelect ? motionSelect.value : 'zoomIn', captionInput ? captionInput.value : '', 1);
          setStatus('تم تحميل 3 شرائح تجريبية. جرّب "معاينة مباشرة" أو "توليد الفيديو".');
        }

        function drawSlideFrame(img, progress, motionType, caption, alpha = 1) {
          const cw = canvas.width;
          const ch = canvas.height;
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, cw, ch);

          const iw = img.naturalWidth || img.width || cw;
          const ih = img.naturalHeight || img.height || ch;
          const baseScale = Math.max(cw / iw, ch / ih);

          let scale = baseScale;
          let offsetX = 0;
          let offsetY = 0;

          const p = Math.max(0, Math.min(1, progress));
          if (motionType === 'zoomIn') {
            scale = baseScale * (1 + 0.12 * p);
          } else if (motionType === 'zoomOut') {
            scale = baseScale * (1.12 - 0.12 * p);
          } else if (motionType === 'panRight') {
            scale = baseScale * 1.1;
            offsetX = ((p - 0.5) * cw * 0.08);
          } else if (motionType === 'panLeft') {
            scale = baseScale * 1.1;
            offsetX = ((0.5 - p) * cw * 0.08);
          }

          const drawW = iw * scale;
          const drawH = ih * scale;
          const dx = (cw - drawW) / 2 + offsetX;
          const dy = (ch - drawH) / 2 + offsetY;

          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.drawImage(img, dx, dy, drawW, drawH);

          const cleanCaption = (caption || '').trim();
          if (cleanCaption) {
            const barH = Math.max(54, Math.round(ch * 0.085));
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.72;
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, ch - barH, cw, barH);

            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.fillStyle = '#ffffff';
            const fontSize = Math.max(18, Math.round(cw * 0.024));
            ctx.font = `bold ${fontSize}px Tahoma, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cleanCaption, cw / 2, ch - barH / 2, cw - 40);
          }

          ctx.restore();
        }

        function setControlsBusy(busy) {
          isRunning = busy;
          if (previewBtn) previewBtn.disabled = busy;
          if (generateBtn) generateBtn.disabled = busy;
          if (sampleBtn) sampleBtn.disabled = busy;
          if (clearBtn) clearBtn.disabled = busy;
          // keep clearVideoBtn available
          if (stopBtn) stopBtn.disabled = !busy;
        }

        function stopActiveProcess() {
          cancelFlag = true;
          if (activeAnimFrame) {
            cancelAnimationFrame(activeAnimFrame);
            activeAnimFrame = null;
          }
          if (activeRecorder && activeRecorder.state !== 'inactive') {
            try { activeRecorder.stop(); } catch (_) {}
          }
          activeRecorder = null;
          if (activeAudioSource) {
            try { activeAudioSource.stop(); } catch (_) {}
            activeAudioSource = null;
          }
          if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
            try { activeAudioCtx.close(); } catch (_) {}
            activeAudioCtx = null;
          }
          setControlsBusy(false);
          setStatus('تم إيقاف التشغيل.');
        }

        function playSequence(durationSec, motionType, captionText, onProgress, onFinish) {
          const totalSlides = slides.length;
          const slideMs = durationSec * 1000;
          const totalMs = totalSlides * slideMs;
          const startTime = performance.now();

          function tick(now) {
            if (cancelFlag) return;
            const elapsed = now - startTime;
            if (elapsed >= totalMs) {
              const lastSlide = slides[totalSlides - 1];
              drawSlideFrame(lastSlide.img, 1, motionType, captionText, 1);
              if (onProgress) onProgress(100, totalSlides, totalSlides);
              if (onFinish) onFinish();
              return;
            }

            const overallProgress = elapsed / totalMs;
            const currentIdx = Math.min(totalSlides - 1, Math.floor(elapsed / slideMs));
            const slideElapsed = elapsed - currentIdx * slideMs;
            const slideProgress = slideElapsed / slideMs;

            const fadeDurationMs = Math.min(350, slideMs * 0.25);
            let alpha = 1;
            if (currentIdx > 0 && slideElapsed < fadeDurationMs) {
              alpha = slideElapsed / fadeDurationMs;
            }

            drawSlideFrame(slides[currentIdx].img, slideProgress, motionType, captionText, alpha);
            if (onProgress) onProgress(overallProgress * 100, currentIdx + 1, totalSlides);

            activeAnimFrame = requestAnimationFrame(tick);
          }

          activeAnimFrame = requestAnimationFrame(tick);
        }

        async function startPreview() {
          if (isRunning) return;
          if (!slides.length) {
            setStatus('أضف صوراً أولاً أو اضغط "جرّب بمثال سريع".');
            return;
          }
          cancelFlag = false;
          setControlsBusy(true);
          updateCanvasDimensions();
          setProgress(0);

          const durationSec = getSlideDurationSec();
          const motionType = motionSelect ? motionSelect.value : 'zoomIn';
          const captionText = captionInput ? captionInput.value : '';

          playSequence(
            durationSec,
            motionType,
            captionText,
            (pct, idx, total) => {
              setProgress(pct);
              setStatus(`معاينة مباشرة: شريحة ${idx} من ${total}...`);
            },
            () => {
              setControlsBusy(false);
              setStatus('اكتملت المعاينة المباشرة.');
            }
          );
        }

        function pickSupportedMimeType(hasAudio) {
          if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
          const candidates = hasAudio
            ? [
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp9,opus',
                'video/webm',
                'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
                'video/mp4'
              ]
            : [
                'video/webm;codecs=vp8',
                'video/webm;codecs=vp9',
                'video/webm',
                'video/mp4;codecs=avc1.42E01E',
                'video/mp4'
              ];
          for (const mime of candidates) {
            try {
              if (MediaRecorder.isTypeSupported(mime)) return mime;
            } catch (_) {}
          }
          return '';
        }

        function getFileExtensionForMime(mime) {
          if (mime && mime.includes('mp4')) return 'mp4';
          return 'webm';
        }

        async function prepareAudioTrack(audioCtx, destNode) {
          const file = audioInput && audioInput.files && audioInput.files[0];
          if (!file) return null;
          try {
            const arrayBuf = await file.arrayBuffer();
            const decoded = await audioCtx.decodeAudioData(arrayBuf);
            const src = audioCtx.createBufferSource();
            src.buffer = decoded;
            src.loop = true;
            src.connect(destNode);
            src.start(0);
            return src;
          } catch (_) {
            setStatus('تعذر قراءة الملف الصوتي؛ سيتم توليد الفيديو بدون صوت.');
            return null;
          }
        }

        async function startGenerateVideo() {
          if (isRunning) return;
          if (!slides.length) {
            const msg = 'أضف صوراً أولاً أو اضغط "جرّب بمثال سريع".';
            setStatus(msg);
            if (typeof window.showToast === 'function') {
              window.showToast(msg, true);
            }
            return;
          }
          if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
            const msg = 'متصفحك لا يدعم تسجيل الفيديو المباشر (MediaRecorder). جرّب متصفح Chrome أو Edge حديث.';
            setStatus(msg);
            if (typeof window.showToast === 'function') {
              window.showToast(msg, true);
            }
            return;
          }

          cancelFlag = false;
          setControlsBusy(true);
          updateCanvasDimensions();
          clearGeneratedVideoResult();
          setProgress(0);

          try {

          const fps = parseInt(fpsSelect ? fpsSelect.value : '30', 10) || 30;
          const durationSec = getSlideDurationSec();
          const motionType = motionSelect ? motionSelect.value : 'zoomIn';
          const captionText = captionInput ? captionInput.value : '';

          const canvasStream = canvas.captureStream(fps);
          const combinedTracks = [...canvasStream.getVideoTracks()];

          const hasAudioFile = !!(audioInput && audioInput.files && audioInput.files[0]);
          if (hasAudioFile && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            activeAudioCtx = new AudioCtxClass();
            const dest = activeAudioCtx.createMediaStreamDestination();
            activeAudioSource = await prepareAudioTrack(activeAudioCtx, dest);
            if (activeAudioSource) {
              dest.stream.getAudioTracks().forEach((t) => combinedTracks.push(t));
            }
          }

          // رسم الإطار الأول فوراً قبل بدء التسجيل لضمان وجود إطارات صالحة في المسار
          drawSlideFrame(slides[0].img, 0, motionType, captionText, 1);

          const hasAudioTrack = combinedTracks.some((t) => t.kind === 'audio');
          const finalStream = new MediaStream(combinedTracks);
          const mimeType = pickSupportedMimeType(hasAudioTrack);
          const chunks = [];
          let effectiveMime = mimeType;

          try {
            activeRecorder = mimeType
              ? new MediaRecorder(finalStream, { mimeType })
              : new MediaRecorder(finalStream);
            effectiveMime = activeRecorder.mimeType || mimeType || 'video/webm';
          } catch (_) {
            activeRecorder = new MediaRecorder(finalStream);
            effectiveMime = activeRecorder.mimeType || 'video/webm';
          }

          activeRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          activeRecorder.onstop = () => {
            if (activeAudioSource) {
              try { activeAudioSource.stop(); } catch (_) {}
              activeAudioSource = null;
            }
            if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
              try { activeAudioCtx.close(); } catch (_) {}
              activeAudioCtx = null;
            }
            setControlsBusy(false);

            if (cancelFlag || !chunks.length) {
              setStatus('لم يتم حفظ فيديو مكتمل.');
              return;
            }

            const baseMime = (effectiveMime && effectiveMime.includes('mp4')) ? 'video/mp4' : 'video/webm';
            const blob = new Blob(chunks, { type: baseMime });
            currentGeneratedBlob = blob;
            const url = URL.createObjectURL(blob);
            currentGeneratedUrl = url;

            if (resultVideo) {
              resultVideo.pause();
              resultVideo.muted = false;
              resultVideo.src = url;
              resultVideo.load();
              resultVideo.onloadedmetadata = () => {
                try {
                  if (resultVideo.duration === Infinity || Number.isNaN(resultVideo.duration)) {
                    resultVideo.currentTime = 1e101;
                    resultVideo.ontimeupdate = () => {
                      resultVideo.ontimeupdate = null;
                      resultVideo.currentTime = 0;
                    };
                  } else {
                    resultVideo.currentTime = 0;
                  }
                } catch (_) {}
              };
            }
            const ext = getFileExtensionForMime(baseMime);
            if (downloadLink) {
              downloadLink.href = url;
              downloadLink.download = `student-project-video-${Date.now()}.${ext}`;
            }
            if (resultBox) {
              resultBox.classList.add('active');
              try { resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
            }
            setProgress(100);
            setStatus('تم توليد الفيديو بنجاح! اضغط "▶️ تشغيل الفيديو" أو زر التشغيل في المشغل.');
          };

          activeRecorder.start(250);

          playSequence(
            durationSec,
            motionType,
            captionText,
            (pct, idx, total) => {
              setProgress(pct);
              setStatus(`جاري توليد الفيديو: شريحة ${idx} من ${total} (${Math.round(pct)}%)...`);
            },
            () => {
              setTimeout(() => {
                if (activeRecorder && activeRecorder.state !== 'inactive') {
                  try {
                    if (typeof activeRecorder.requestData === 'function') {
                      activeRecorder.requestData();
                    }
                    activeRecorder.stop();
                  } catch (_) {}
                }
              }, 500);
            }
          );
          } catch (err) {
            if (activeAnimFrame) {
              cancelAnimationFrame(activeAnimFrame);
              activeAnimFrame = null;
            }
            if (activeAudioSource) {
              try { activeAudioSource.stop(); } catch (_) {}
              activeAudioSource = null;
            }
            if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
              try { activeAudioCtx.close(); } catch (_) {}
              activeAudioCtx = null;
            }
            setControlsBusy(false);
            const reason = (err && err.message) ? ` (${err.message})` : '';
            const errMsg = `تعذر بدء توليد الفيديو في هذا المتصفح${reason}. جرّب بدون ملف صوتي أو عبر خادم محلي/HTTPS.`;
            setStatus(errMsg);
            if (typeof window.showToast === 'function') {
              window.showToast(errMsg, true);
            }
          }
        }

        function getVideoShareSummaryText() {
          const cap = (captionInput && captionInput.value.trim()) || 'فيديو مشروع طلابي من صور';
          const count = slides.length;
          const totalSec = (count * getSlideDurationSec()).toFixed(1);
          const motionLabel = motionSelect ? motionSelect.options[motionSelect.selectedIndex].text : '';
          const ratioLabel = ratioSelect ? ratioSelect.value : '16:9';
          return [
            `🎬 ${cap}`,
            `• عدد الشرائح: ${count} صورة`,
            `• المدة الإجمالية: ${totalSec} ثانية`,
            `• نوع الحركة: ${motionLabel}`,
            `• الأبعاد: ${ratioLabel}`,
            `• اسم الملف: ${downloadLink && downloadLink.download ? downloadLink.download : 'project-video.webm'}`
          ].join('\n');
        }

        if (sendToNoteBtn) {
          sendToNoteBtn.addEventListener('click', () => {
            if (!currentGeneratedBlob) {
              setStatus('ولّد الفيديو أولاً ليتم إرساله إلى دفتر الملاحظات.');
              return;
            }
            const summary = getVideoShareSummaryText();
            if (typeof window.appendToActiveNote === 'function') {
              window.appendToActiveNote(summary, 'تم إرسال ملخص الفيديو إلى دفتر الملاحظات 📝');
              setStatus('تم إرسال تفاصيل الفيديو إلى دفتر الملاحظات.');
            } else {
              setStatus('تم تجهيز تفاصيل الفيديو لدفتر الملاحظات.');
            }
          });
        }

        if (publishProjectBtn) {
          publishProjectBtn.addEventListener('click', () => {
            if (!currentGeneratedBlob) {
              setStatus('ولّد الفيديو أولاً ليتم نشره في قسم مشاركة مشاريع.');
              return;
            }
            const title = (captionInput && captionInput.value.trim()) || `فيديو مشروع (${slides.length} صور)`;
            const content = getVideoShareSummaryText();

            if (Array.isArray(window.sharedProjects)) {
              const authorName = (window.currentUser && window.currentUser.username) || 'طالب';
              const authorId = (window.currentUser && window.currentUser.id) || '#1001';
              window.sharedProjects.unshift({
                id: Date.now(),
                author: authorName,
                authorId: authorId,
                title: title,
                domain: 'أخرى',
                content: content,
                likes: 0,
                dislikes: 0,
                userReactions: {},
                comments: []
              });
              if (typeof window.saveSharedProjects === 'function') {
                window.saveSharedProjects(true);
              }
              if (typeof window.renderSharedProjects === 'function') {
                window.renderSharedProjects();
              }
              if (typeof window.showToast === 'function') {
                window.showToast('تم نشر مشروع الفيديو في مجتمع مشاركة المشاريع 🚀');
              }
              setStatus('تم نشر الفيديو بنجاح في قسم مشاركة مشاريع.');
            } else {
              setStatus('تعذر الوصول إلى قائمة المشاريع المشتركة حالياً.');
            }
          });
        }

        if (dropzone && fileInput) {
          dropzone.addEventListener('click', () => fileInput.click());
          dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInput.click();
            }
          });

          ['dragenter', 'dragover'].forEach((evName) => {
            dropzone.addEventListener(evName, (e) => {
              e.preventDefault();
              dropzone.classList.add('dragover');
            });
          });

          ['dragleave', 'drop'].forEach((evName) => {
            dropzone.addEventListener(evName, (e) => {
              e.preventDefault();
              dropzone.classList.remove('dragover');
            });
          });

          dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files) {
              handleFiles(dt.files);
            }
          });

          fileInput.addEventListener('change', (e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          });
        }

        if (sampleBtn) {
          sampleBtn.addEventListener('click', loadSampleSlides);
        }

        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            if (isRunning) stopActiveProcess();
            slides.forEach(revokeSlideUrl);
            slides = [];
            renderSlides();
            clearGeneratedVideoResult();
            setProgress(0);
            drawIdleCanvas();
            setStatus('تم مسح جميع الصور.');
          });
        }

        const playResultBtn = document.getElementById('i2vPlayResultBtn');
        const deleteResultInlineBtn = document.getElementById('i2vDeleteResultInlineBtn');

        function handleDeleteGeneratedVideo() {
          if (isRunning) {
            stopActiveProcess();
          }
          const hadVideo = !!(currentGeneratedBlob || currentGeneratedUrl || (resultBox && resultBox.classList.contains('active')));
          clearGeneratedVideoResult();
          setProgress(0);
          if (slides.length > 0) {
            drawSlideFrame(slides[0].img, 0.35, motionSelect ? motionSelect.value : 'zoomIn', captionInput ? captionInput.value : '', 1);
          } else {
            drawIdleCanvas();
          }
          const msg = hadVideo ? 'تم حذف الفيديو الناتج بنجاح 🗑️' : 'لا يوجد فيديو ناتج لحذفه حالياً.';
          setStatus(msg);
          if (typeof window.showToast === 'function') {
            window.showToast(msg, !hadVideo);
          }
        }

        if (clearVideoBtn) {
          clearVideoBtn.disabled = false;
          clearVideoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleDeleteGeneratedVideo();
          });
        }

        if (deleteResultInlineBtn) {
          deleteResultInlineBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleDeleteGeneratedVideo();
          });
        }

        if (playResultBtn && resultVideo) {
          playResultBtn.addEventListener('click', async () => {
            if (!currentGeneratedUrl && !resultVideo.src) {
              setStatus('لا يوجد فيديو مولّد لتشغيله بعد.');
              return;
            }
            try {
              if (resultVideo.paused) {
                resultVideo.muted = false;
                if (resultVideo.ended) resultVideo.currentTime = 0;
                await resultVideo.play();
                playResultBtn.textContent = '⏸️ إيقاف مؤقت';
              } else {
                resultVideo.pause();
                playResultBtn.textContent = '▶️ تشغيل الفيديو';
              }
            } catch (err) {
              // Fallback: try muted playback if browser autoplay/audio policy blocks unmuted play
              try {
                resultVideo.muted = true;
                await resultVideo.play();
                playResultBtn.textContent = '⏸️ إيقاف مؤقت';
                setStatus('تم تشغيل الفيديو (صامت) — يمكنك رفع الصوت من شريط المشغل.');
              } catch (err2) {
                setStatus('تعذر تشغيل الفيديو داخل المتصفح؛ يمكنك تحميله مباشرة من زر "تحميل الفيديو".');
              }
            }
          });

          resultVideo.addEventListener('play', () => {
            playResultBtn.textContent = '⏸️ إيقاف مؤقت';
          });
          resultVideo.addEventListener('pause', () => {
            playResultBtn.textContent = '▶️ تشغيل الفيديو';
          });
          resultVideo.addEventListener('ended', () => {
            playResultBtn.textContent = '▶️ إعادة التشغيل';
          });
        }

        if (ratioSelect) {
          ratioSelect.addEventListener('change', updateCanvasDimensions);
        }

        if (durationInput) {
          durationInput.addEventListener('input', updateSummaryBadges);
          durationInput.addEventListener('change', updateSummaryBadges);
        }

        if (previewBtn) {
          previewBtn.addEventListener('click', startPreview);
        }

        if (generateBtn) {
          generateBtn.addEventListener('click', () => {
            startGenerateVideo();
          });
        }

        if (stopBtn) {
          stopBtn.addEventListener('click', stopActiveProcess);
        }

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && isRunning) {
            stopActiveProcess();
          }
        });

        drawIdleCanvas();
        updateSummaryBadges();
      })();
