/* =========================================================
   十三行行動博物館 - 互動式操作說明直接引導系統 (js/tour.js)
   功能：
   1. 進入學習頁面時「先跳出操作說明直接引導」，再讓使用者進行網頁瀏覽。
   2. 採用聚光燈 (Spotlight) 縷空高亮技術，動態框選實體按鈕。
   3. 依序引導使用者了解全站按鈕位置：
      - 頂部導覽列核心功能（課程地圖、操作說明、重點整理、製作團隊）
      - ⏱ 終極總測驗入口按鈕
      - 目前位置定位與學習進度計算列 (Locator)
      - 左側學習地圖單元小節切換 (Sidebar)
      - 右下角常駐浮動聲音控制膠囊 (Floating Dock - 唯一聲音控制中心)
      - 互動式數位教材核心區（滑桿、翻牌卡、隨堂測驗等）
   4. 支援隨時點擊「操作說明」重新體驗導覽，支援「上一步 / 下一步 / 略過」。
   ========================================================= */

(function () {
    'use strict';

    const STORAGE_KEY_TOUR = 'shihsanhang.tour.seen';

    // 檢查是否由首頁帶 ?guide=1 進入
    const urlParams = new URLSearchParams(window.location.search);
    const cameFromHomeGuide = urlParams.get('guide') === '1';

    let currentStepIdx = 0;
    let isTourRunning = false;
    let overlayEl = null;
    let spotlightEl = null;
    let cardEl = null;
    let resizeTimer = null;

    // 步驟設定清單（共 6 步，清晰聚焦）
    const TOUR_STEPS = [
        {
            selector: '.top-nav',
            badge: '頂部功能選單',
            title: '🧭 頂部四大核心工具',
            desc: '頂部右側為全站核心導覽選單，收錄了學習中隨時會用到的快捷工具：',
            items: [
                '🗺️ <b>課程地圖</b>：綜覽 3 大單元完整架構，隨時切換單元。',
                '💡 <b>操作說明</b>：隨時再次開啟本按鈕導覽引導。',
                '📝 <b>重點整理</b>：回顧各小節考古速記考點筆記。',
                '👥 <b>製作團隊</b>：畢業專題成員與感謝名單。'
            ]
        },
        {
            selector: '.top-nav__link--quiz',
            badge: '總測驗入口',
            title: '⏱ 15 題總測驗限時挑戰',
            desc: '完成單元學習後，點擊此按鈕進入<b>終極總測驗</b>！包含 10 題選擇題與 5 題視覺互動遊戲（人面陶罐拼圖、羅盤探測、圖片配對與商船裝載），限時 10 分鐘挑戰你的考古實力！'
        },
        {
            selector: '#locator',
            badge: '目前位置與進度',
            title: '📍 章節定位與學習進度條',
            desc: '薄薄的定位列隨時為您導航：左側顯示目前所在<b>單元與小節名稱</b>；右側自動計算<b>閱讀進度百分比</b>，並提供「快速切換單元」捷徑！'
        },
        {
            selector: '.sidebar',
            fallbackSelector: '.sub-nav',
            badge: '學習地圖導覽',
            title: '📑 單元小節快速跳轉',
            desc: '左側導覽欄列出本單元的所有小節（如 1-1 我們的考古日記、1-2 走進十三行聚落、1-3 泥土裡的寶物）。<b>點擊任意小節按鈕即可瞬間跳轉</b>，捲動時也會即時高亮標記！'
        },
        {
            selector: '#audioFloatingDock',
            badge: '聲音控制中心',
            title: '🎵 右下角常駐聲音與音樂控制列',
            desc: '全站聲音控制<b>統一收攏於右下角常駐浮動列</b>！教材已預設開啟背景輕音樂與按鈕音效，向下捲動閱讀時隨時都能控制：',
            items: [
                '🎵 <b>背景音樂</b>：一鍵切換淡水河口史前雅樂播放／靜音。',
                '🔔 <b>按鈕音效</b>：一鍵切換按鈕點擊、翻牌與測驗音效。',
                '⚙️ <b>設定齒輪</b>：開啟面板微調音量大小（0%～100%）或更換自訂 MP3！'
            ]
        },
        {
            selector: '.unit-hero',
            fallbackSelector: '.content',
            badge: '準備完成',
            title: '🚀 開始探索十三行文化！',
            desc: '教材中融合了豐富的互動設計：<b>時光地圖滑桿、3D 視差建築、文物翻牌卡、盲盒發掘與隨堂測驗</b>。點擊下方「完成，開始探索！」立即開啟您的考古冒險！'
        }
    ];

    /* =========================================================
       1. 建立導覽 DOM 架構
       ========================================================= */
    function buildTourDOM() {
        if (overlayEl) return;

        // 1. 全螢幕防點擊遮罩
        overlayEl = document.createElement('div');
        overlayEl.id = 'tourOverlay';
        overlayEl.className = 'tour-overlay';
        overlayEl.setAttribute('role', 'dialog');
        overlayEl.setAttribute('aria-modal', 'true');
        overlayEl.setAttribute('aria-label', '操作說明直接引導');

        // 2. 聚光燈縷空高亮框
        spotlightEl = document.createElement('div');
        spotlightEl.id = 'tourSpotlight';
        spotlightEl.className = 'tour-spotlight';

        // 3. 引導卡片
        cardEl = document.createElement('div');
        cardEl.id = 'tourCard';
        cardEl.className = 'tour-card';
        cardEl.setAttribute('role', 'region');
        cardEl.setAttribute('aria-live', 'polite');

        overlayEl.appendChild(spotlightEl);
        overlayEl.appendChild(cardEl);
        document.body.appendChild(overlayEl);

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    /* =========================================================
       2. 啟動與步驟切換邏輯
       ========================================================= */
    function startTour() {
        buildTourDOM();
        currentStepIdx = 0;
        isTourRunning = true;

        if (window.ShihsanhangAudio && typeof window.ShihsanhangAudio.closeSettings === 'function') {
            window.ShihsanhangAudio.closeSettings();
        }
        if (typeof window.closeAllModals === 'function') {
            window.closeAllModals();
        }

        // 暫時鎖定頁面背景滾動，專注於引導體驗
        document.body.style.overflow = 'hidden';

        overlayEl.classList.add('is-active');

        if (window.ShihsanhangAudio) {
            window.ShihsanhangAudio.playSFX('pop');
            if (typeof window.ShihsanhangAudio.playBGM === 'function') {
                window.ShihsanhangAudio.playBGM();
            }
        }

        renderStep(currentStepIdx);
    }

    function endTour(isCompleted = false) {
        if (!isTourRunning) return;
        isTourRunning = false;

        if (overlayEl) {
            overlayEl.classList.remove('is-active');
        }

        document.body.style.overflow = '';

        // 標記已完成導覽
        try {
            localStorage.setItem(STORAGE_KEY_TOUR, '1');
            localStorage.setItem('shihsanhang.onboard.seen', '1');
        } catch (_) {}

        // 若有首頁 ?guide=1 參數，靜默清理 URL
        if (cameFromHomeGuide) {
            try {
                const url = new URL(window.location.href);
                url.searchParams.delete('guide');
                history.replaceState(null, '', url.pathname + url.search + url.hash);
            } catch (_) {}
        }

        if (window.ShihsanhangAudio) {
            if (isCompleted) {
                window.ShihsanhangAudio.playSFX('correct');
            } else {
                window.ShihsanhangAudio.playSFX('click');
            }
            window.ShihsanhangAudio.playBGM();
        }

        const oldOnboard = document.getElementById('onboard');
        if (oldOnboard) oldOnboard.hidden = true;
    }

    function renderStep(idx) {
        if (idx < 0 || idx >= TOUR_STEPS.length) {
            endTour(true);
            return;
        }

        const step = TOUR_STEPS[idx];
        let targetEl = document.querySelector(step.selector);
        if (!targetEl && step.fallbackSelector) {
            targetEl = document.querySelector(step.fallbackSelector);
        }

        // 若特定頁面找不到該目標元素，自動平滑跳至下一步
        if (!targetEl) {
            if (idx + 1 < TOUR_STEPS.length) {
                renderStep(idx + 1);
            } else {
                endTour(true);
            }
            return;
        }

        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateSpotlightAndCard(targetEl, step, idx);
    }

    function updateSpotlightAndCard(targetEl, step, idx) {
        const rect = targetEl.getBoundingClientRect();
        const pad = 8;

        const spotTop = Math.max(0, rect.top - pad);
        const spotLeft = Math.max(0, rect.left - pad);
        const spotWidth = Math.min(window.innerWidth - spotLeft, rect.width + pad * 2);
        const spotHeight = Math.min(window.innerHeight - spotTop, rect.height + pad * 2);

        spotlightEl.style.top = `${spotTop}px`;
        spotlightEl.style.left = `${spotLeft}px`;
        spotlightEl.style.width = `${spotWidth}px`;
        spotlightEl.style.height = `${spotHeight}px`;

        const isFirst = idx === 0;
        const isLast = idx === TOUR_STEPS.length - 1;

        let listHtml = '';
        if (step.items && step.items.length) {
            listHtml = `<ul class="tour-card__list">${step.items.map(it => `<li>${it}</li>`).join('')}</ul>`;
        }

        cardEl.innerHTML = `
            <div class="tour-card__head">
                <div class="tour-card__badge-group">
                    <span class="tour-card__step-badge">引導 ${idx + 1} / ${TOUR_STEPS.length}</span>
                    <span class="tour-card__target-tag">🎯 ${step.badge}</span>
                </div>
                <button type="button" class="tour-card__close" id="tourCloseBtn" aria-label="略過導覽">✕ 略過</button>
            </div>
            <h3 class="tour-card__title">${step.title}</h3>
            <p class="tour-card__desc">${step.desc}</p>
            ${listHtml}
            <div class="tour-card__foot">
                <button type="button" class="tour-btn tour-btn--skip" id="tourSkipBtn">略過導覽</button>
                <div class="tour-btn-group">
                    <button type="button" class="tour-btn tour-btn--prev" id="tourPrevBtn" ${isFirst ? 'disabled' : ''}>← 上一步</button>
                    <button type="button" class="tour-btn ${isLast ? 'tour-btn--finish' : 'tour-btn--next'}" id="tourNextBtn">
                        ${isLast ? '完成，開始探索！ 🚀' : '下一步 →'}
                    </button>
                </div>
            </div>
        `;

        const cardWidth = Math.min(450, window.innerWidth - 32);
        const cardHeight = 290;

        let cardTop = 0;
        let cardLeft = 0;

        if (window.innerWidth <= 680) {
            cardLeft = 16;
        } else {
            cardLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 24, rect.left + (rect.width / 2) - (cardWidth / 2)));
        }

        const spaceBelow = window.innerHeight - (spotTop + spotHeight);
        const spaceAbove = spotTop;

        if (spaceBelow >= cardHeight + 20) {
            cardTop = spotTop + spotHeight + 16;
        } else if (spaceAbove >= cardHeight + 20) {
            cardTop = spotTop - cardHeight - 16;
        } else {
            cardTop = Math.max(16, (window.innerHeight - cardHeight) / 2);
        }

        cardTop = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, cardTop));

        cardEl.style.top = `${cardTop}px`;
        cardEl.style.left = `${cardLeft}px`;

        document.getElementById('tourCloseBtn').addEventListener('click', () => {
            if (window.ShihsanhangAudio && typeof window.ShihsanhangAudio.playBGM === 'function') {
                window.ShihsanhangAudio.playBGM();
            }
            endTour(false);
        });
        document.getElementById('tourSkipBtn').addEventListener('click', () => {
            if (window.ShihsanhangAudio && typeof window.ShihsanhangAudio.playBGM === 'function') {
                window.ShihsanhangAudio.playBGM();
            }
            endTour(false);
        });

        document.getElementById('tourPrevBtn').addEventListener('click', () => {
            if (window.ShihsanhangAudio && typeof window.ShihsanhangAudio.playBGM === 'function') {
                window.ShihsanhangAudio.playBGM();
            }
            if (currentStepIdx > 0) {
                currentStepIdx--;
                if (window.ShihsanhangAudio) window.ShihsanhangAudio.playSFX('click');
                renderStep(currentStepIdx);
            }
        });

        document.getElementById('tourNextBtn').addEventListener('click', () => {
            if (window.ShihsanhangAudio && typeof window.ShihsanhangAudio.playBGM === 'function') {
                window.ShihsanhangAudio.playBGM();
            }
            if (currentStepIdx < TOUR_STEPS.length - 1) {
                currentStepIdx++;
                if (window.ShihsanhangAudio) window.ShihsanhangAudio.playSFX('pop');
                renderStep(currentStepIdx);
            } else {
                endTour(true);
            }
        });
    }

    function handleResize() {
        if (!isTourRunning) return;
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderStep(currentStepIdx);
        }, 120);
    }

    function handleScroll() {
        if (!isTourRunning) return;
        const step = TOUR_STEPS[currentStepIdx];
        if (!step) return;
        const targetEl = document.querySelector(step.selector) || (step.fallbackSelector && document.querySelector(step.fallbackSelector));
        if (targetEl) {
            updateSpotlightAndCard(targetEl, step, currentStepIdx);
        }
    }

    /* =========================================================
       3. 攔截「操作說明」按鈕與自動觸發判定
       ========================================================= */
    function init() {
        document.querySelectorAll('[data-modal-open="guide"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startTour();
            });
        });

        let hasSeenTour = false;
        try {
            hasSeenTour = localStorage.getItem(STORAGE_KEY_TOUR) === '1';
        } catch (_) {}

        if (cameFromHomeGuide || !hasSeenTour) {
            setTimeout(() => {
                startTour();
            }, 350);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ShihsanhangTour = {
        start: startTour,
        end: endTour,
        getCurrentStep: () => currentStepIdx
    };

})();
