        /* ==================== توليد أيقونات PWA ومانيفست ديناميكي ==================== */
        let deferredPwaPrompt = null;
        let generatedManifestUrl = null;

        function generateAppIconDataUrl(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            const grad = ctx.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#1e3a8a');
            ctx.fillStyle = grad;
            const r = Math.round(size * 0.22);
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.arcTo(size, 0, size, size, r);
            ctx.arcTo(size, size, 0, size, r);
            ctx.arcTo(0, size, 0, 0, r);
            ctx.arcTo(0, 0, size, 0, r);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(3, Math.round(size * 0.03));
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(size * 0.42)}px Tahoma, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎓', size / 2, size * 0.52);

            return canvas.toDataURL('image/png');
        }

        function initDynamicPwaManifest() {
            const appleLink = document.getElementById('appleTouchIconLink');
            if (location.protocol === 'file:') {
                const icon192 = generateAppIconDataUrl(192);
                if (appleLink && icon192) appleLink.href = icon192;
                return;
            }
            if (appleLink) appleLink.href = './icon-192.png';
            const link = document.getElementById('dynamicManifestLink');
            if (link) link.href = './manifest.json';
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPwaPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
            deferredPwaPrompt = null;
            showToast('تم تثبيت المنصة على هاتفك بنجاح 🎉');
        });

        async function triggerPwaInstall() {
            if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
                showToast('المنصة مثبتة وتعمل بالفعل ✅');
                return;
            }
            if (location.protocol === 'file:') {
                showToast('للتثبيت على الهاتف، افتح الرابط عبر HTTPS أو خادم محلي (وليس file://)', true);
                return;
            }
            if (deferredPwaPrompt) {
                deferredPwaPrompt.prompt();
                const choice = await deferredPwaPrompt.userChoice;
                if (choice && choice.outcome === 'accepted') {
                    showToast('جاري تثبيت التطبيق على جهازك 📲');
                }
                deferredPwaPrompt = null;
                return;
            }
            const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
            if (isIos) {
                showToast('في Safari: اضغط زر المشاركة (⬆️) ثم اختر "إضافة إلى الشاشة الرئيسية"');
            } else {
                showToast('افتح قائمة المتصفح (⋮) واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"');
            }
        }

        /* ==================== الحالة العامة والتخزين ==================== */
        let currentLang = 'ar';
        let selectedGender = 'male';
        let currentUser = null;
        let mathChartInstance = null;

        let activeSectionId = 'projects';
        let activeSubTabId = 'calcGraph';
        let cmdSelectedIndex = 0;

        let gpaItems = [];
        let notesList = [];
        let activeNoteId = null;
        let noteViewMode = 'edit';
        let notePaperTheme = 'white';
        let tasksList = [];
        let pomodoroSeconds = 25 * 60;
        let pomodoroInterval = null;
        let pomodoroRunning = false;

        let studyPomoSeconds = 25 * 60;
        let studyPomoInterval = null;
        let studyPomoRunning = false;
        let studyPomoMode = 'focus';

        let studyRoomFriends = [];
        let sharedProjects = [];
        const openCommentsDrawerIds = new Set();
        let lastBotInsight = '';
        let botQuietMode = false;
        let botHiddenCompletely = false;
        let privacyMasked = false;
        let screenLocked = false;
        let autoLockTimerId = null;

        let syncChannel = null;
        let freeDbUrl = '';
        let firebaseAuthToken = '';
        let firebaseAuthUid = '';
        let invitePollTimerId = null;
        let projectsPollTimerId = null;
        let pendingIncomingInvite = null;

        let battleSize = 1;
        let battleTotalRounds = 3;
        let battleRoomInfo = { name: 'غرفة التحدي السريع', code: '#ROOM-101' };
        let customTeamA = [];
        let customTeamB = [];
        let battleTeamA = [];
        let battleTeamB = [];
        let battleQuestions = [];
        let battleRoundIndex = 0;
        let battleTimerSec = 20;
        let battleTimerId = null;
        let autoAdvanceCountdownId = null;
        let battleAnswered = false;
        let battleLogs = [];

        let currentArenaSubMode = 'classic';
        let aiBattleState = null;
        let aiBattleStepTimerId = null;
        let generatedBattleResearchText = '';
        let activeAiOpponentId = '#3109';
        let opponentRefsRegistry = {};

        const platformQuestionBank = {
            programming: [
                { domain: '💻 برمجة - خوارزميات', q: 'ما التعقيد الزمني لخوارزمية البحث الثنائي (Binary Search) في مصفوفة مرتبة حجمها n؟', options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], answer: 0 },
                { domain: '💻 برمجة - Python', q: 'ما ناتج len([x for x in range(10) if x % 2 == 0]) في Python؟', options: ['5', '10', '4', '6'], answer: 0 },
                { domain: '💻 برمجة - هياكل البيانات', q: 'أي بنية بيانات تعمل بمبدأ LIFO؟', options: ['Stack (المكدس)', 'Queue (الطابور)', 'Linked List', 'Binary Heap'], answer: 0 },
                { domain: '💻 برمجة - JavaScript', q: 'ما نتيجة typeof [] === "object" في JavaScript؟', options: ['true', 'false', 'undefined', 'array'], answer: 0 }
            ],
            math: [
                { domain: '📐 رياضيات - تفاضل', q: 'ما مشتقة الدالة f(x) = 3x² + 5x بالنسبة إلى x؟', options: ['6x + 5', '3x + 5', '6x² + 5', '9x + 5'], answer: 0 },
                { domain: '📐 رياضيات - جبر', q: 'ما قيمة x التي تحقق المعادلة الخطية: 2x - 6 = 14؟', options: ['10', '4', '7', '20'], answer: 0 },
                { domain: '📐 رياضيات - نهايات', q: 'ما قيمة النهاية: lim (sin(x) / x) عندما x تؤول إلى 0؟', options: ['1', '0', '∞', '-1'], answer: 0 },
                { domain: '📐 رياضيات - تكامل', q: 'ما التكامل غير المحدود للدالة f(x) = 4x³؟', options: ['x⁴ + C', '12x² + C', 'x³ + C', '4x⁴ + C'], answer: 0 }
            ]
        };

        const i18n = {
            ar: {
                dir: 'rtl', pageTitle: 'منصة الطالب الذكية - بناء مشاريع', loginHeaderTitle: 'منصة الطالب الذكية',
                loginSubTitle: 'الآلة الحاسبة المتقدمة والرسوم البيانية', lblEmail: 'البريد الإلكتروني', lblPass: 'كلمة المرور',
                btnLoginBtn: 'دخول المنصة', noAccountText: 'ليس لديك حساب؟', linkToggleReg: 'إنشاء حساب جديد',
                lblRegUser: 'اسم المستخدم', lblRegEmail: 'البريد الإلكتروني', lblRegPass: 'كلمة المرور',
                lblRegPassConfirm: 'تأكيد كلمة المرور', lblTheme: 'اختر مظهر المنصة (الجنس)',
                regBtnMale: '👦 أولاد', regBtnFemale: '👧 بنات', btnRegisterBtn: 'حفظ وتسجيل الدخول',
                hasAccountText: 'لديك حساب بالفعل؟', linkToggleLogin: 'تسجيل الدخول',
                navProjects: '🚀 بناء مشاريع', navBattleArena: '⚔️ ساحة المعارك', navSharing: '🤝 مشاركة مشاريع',
                navStudyRoom: '👥 غرفة المذاكرة', navAiAssistant: '🤖 المساعد الذكي AI', btnLogout: '🚪 خروج',
                subBtnCalc: '🔢 الآلة والرسوم', subBtnNotes: '📝 دفتر الملاحظات', subBtnWorkshop: '🛠️ ورشة المهام',
                subBtnImg2Vid: '🎬 تحويل صور إلى فيديوهات',
                calcCardTitle: '🔢 الآلة الحاسبة العلمية والمتقدمة', calcGpaBtn: '🎓 حساب المعدل',
                graphCardTitle: '📈 رسم المنحنيات الرياضية (دالة f(x))', drawGraphBtn: 'رسم المنحنى',
                noteCardTitle: '📝 دفتر الملاحظات الذكي', taskCardTitle: '🛠️ ورشة المهام اليومية وإنتاجية المشروع',
                sharingTitle: '🤝 مجتمع مشاركة مشاريع الطلاب',
                sharingDesc: 'استعرض مشاريع زملائك، تفاعل بالإعجاب أو ديسلايك، وأضف تعليقاتك.',
                studyRoomTitle: '👥 غرفة المذاكرة المباشرة والتعاون',
                aiTitle: '🤖 المساعد الأكاديمي الذكي AI'
            },
            fr: {
                dir: 'ltr', pageTitle: 'Plateforme Étudiante Intelligente', loginHeaderTitle: 'Plateforme Étudiante',
                loginSubTitle: 'Calculatrice scientifique et graphiques', lblEmail: 'Adresse Email', lblPass: 'Mot de passe',
                btnLoginBtn: 'Se connecter', noAccountText: 'Pas de compte ?', linkToggleReg: 'Créer un compte',
                lblRegUser: 'Nom d’utilisateur', lblRegEmail: 'Adresse Email', lblRegPass: 'Mot de passe',
                lblRegPassConfirm: 'Confirmer le mot de passe', lblTheme: 'Choisir le thème',
                regBtnMale: '👦 Garçons', regBtnFemale: '👧 Filles', btnRegisterBtn: 'Enregistrer et entrer',
                hasAccountText: 'Déjà un compte ?', linkToggleLogin: 'Connexion',
                navProjects: '🚀 Projets', navBattleArena: '⚔️ Arène', navSharing: '🤝 Partage',
                navStudyRoom: '👥 Salle d’étude', navAiAssistant: '🤖 Assistant IA', btnLogout: '🚪 Quitter',
                subBtnCalc: '🔢 Calcul & Graphes', subBtnNotes: '📝 Bloc-notes', subBtnWorkshop: '🛠️ Tâches',
                subBtnImg2Vid: '🎬 Images en Vidéo',
                calcCardTitle: '🔢 Calculatrice Scientifique Avancée', calcGpaBtn: '🎓 Moyenne GPA',
                graphCardTitle: '📈 Tracer une fonction f(x)', drawGraphBtn: 'Tracer',
                noteCardTitle: '📝 Cahier de Notes Intelligent', taskCardTitle: '🛠️ Atelier des Tâches & Productivité',
                sharingTitle: '🤝 Communauté de Partage de Projets',
                sharingDesc: 'Découvrez les projets de vos camarades, réagissez et commentez.',
                studyRoomTitle: '👥 Salle d’Étude & Collaboration en Direct',
                aiTitle: '🤖 Assistant Académique Intelligent IA'
            },
            en: {
                dir: 'ltr', pageTitle: 'Smart Student Platform', loginHeaderTitle: 'Smart Student Platform',
                loginSubTitle: 'Advanced Calculator & Math Graphing', lblEmail: 'Email Address', lblPass: 'Password',
                btnLoginBtn: 'Login to Platform', noAccountText: 'Don’t have an account?', linkToggleReg: 'Create new account',
                lblRegUser: 'Username', lblRegEmail: 'Email Address', lblRegPass: 'Password',
                lblRegPassConfirm: 'Confirm Password', lblTheme: 'Choose Theme',
                regBtnMale: '👦 Boys', regBtnFemale: '👧 Girls', btnRegisterBtn: 'Save & Login',
                hasAccountText: 'Already have an account?', linkToggleLogin: 'Sign In',
                navProjects: '🚀 Build Projects', navBattleArena: '⚔️ Battle Arena', navSharing: '🤝 Share Projects',
                navStudyRoom: '👥 Study Room', navAiAssistant: '🤖 AI Assistant', btnLogout: '🚪 Logout',
                subBtnCalc: '🔢 Calc & Graphs', subBtnNotes: '📝 Notebook', subBtnWorkshop: '🛠️ Task Workshop',
                subBtnImg2Vid: '🎬 Images to Video',
                calcCardTitle: '🔢 Scientific & Advanced Calculator', calcGpaBtn: '🎓 GPA Calc',
                graphCardTitle: '📈 Plot Math Function f(x)', drawGraphBtn: 'Plot Graph',
                noteCardTitle: '📝 Smart Notebook', taskCardTitle: '🛠️ Daily Tasks & Productivity Workshop',
                sharingTitle: '🤝 Student Project Sharing Community',
                sharingDesc: 'Explore peers’ projects, react with like/dislike, and leave comments.',
                studyRoomTitle: '👥 Live Study Room & Collaboration',
                aiTitle: '🤖 Smart Academic AI Assistant'
            }
        };

        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(() => {});
            });
        }

        /* ==================== إشعارات وصوت ==================== */
        function showToast(msg, isError = false) { const toast = document.getElementById('toastBanner'); toast.textContent = msg; toast.style.background = isError ? '#ef4444' : '#10b981'; toast.classList.remove('hidden'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500); }
        function playGentleChime() { try { const AudioCtx = window.AudioContext || window.webkitAudioContext, ctx = new AudioCtx(), osc = ctx.createOscillator(), gain = ctx.createGain(); osc.frequency.setValueAtTime(587.33, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6); osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.6); } catch (e) {} }
