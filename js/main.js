/* =========================================================
   十三行行動博物館 - 主互動腳本
   ========================================================= */

(function () {
    'use strict';

    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // 首頁「進入 1-1」連結會帶 ?guide=1，用來自動顯示操作說明
    const cameFromHomeGuide = /[?&]guide=1(&|$)/.test(window.location.search);

    /* ---------- 通用：DOM 就緒 ---------- */
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // 每個功能各自獨立初始化：其中一個出錯時，不會讓後面的互動全部失效
        [
            setupLockedUnits,
            setupSidebarNav,
            setupUnitButtons,        // 側欄單元按鈕跳轉
            setupUnitHeroParallax,   // 單元標頭主視覺 3D 懸浮視差與徽章
            setupMap,
            setupTimeSlider,
            setupHouseInteraction,   // 1-2 建築 / 2-2 煉鐵爐 / 3-2 人面陶罐 部位互動
            setupFlipCards,          // 翻牌卡（1-2 / 3-2）
            setupSpoilers,           // 模糊揭示
            setupAccordion,          // 手風琴 FAQ
            setupMysteryBox,         // 1-3 文物盲盒
            setupQuiz,               // 證據點選測驗（各單元）
            setupQuizBank,           // 進階測驗題庫（各單元）
            setupPotterySteps,       // 2-1 製陶五步驟
            setupKiln,               // 2-1 燒陶溫度模擬器
            setupBellows,            // 2-2 鼓風挑戰
            setupBeadLab,            // 2-3 玻璃珠設計工坊
            setupSortGame,           // 2-3 本地 vs 舶來、3-3 證據 vs 推測
            setupMatchGame,          // 1-1 考古工具配對
            setupDigGame,            // 3-1 模擬考古發掘
            setupStrataGame,         // 3-1 地層排序
            setupRevealOnScroll,
            setupSkeletonLoading,
            setupModal,              // 全域 Modal（課程地圖／操作說明／重點整理／製作團隊）
            setupOnboarding,         // 首次進入引導
            setupLocator,            // 麵包屑 + 整體進度條
            setupHomeLink            // LOGO 回首頁
        ].forEach(fn => {
            try { fn(); } catch (err) { console.error('[init] ' + fn.name + ' 失敗：', err); }
        });
    }

    /* ====================================================
       0. 單元標頭主視覺 3D 視差與主題徽章
       ==================================================== */
    function setupUnitHeroParallax() {
        const hero = document.querySelector('.unit-hero');
        const visual = hero ? hero.querySelector('.unit-hero__visual') : null;
        const stack = visual ? visual.querySelector('.hero-stack') : null;
        if (!hero || !visual || !stack) return;

        const badges = {
            'unit-1': '🧭 距今 1800–500 年',
            'unit-2': '🔥 1200°C 史前煉鐵',
            'unit-3': '🏺 國寶人面陶罐'
        };
        if (badges[hero.id] && !stack.querySelector('.hero-stack__badge')) {
            const b = document.createElement('span');
            b.className = 'hero-stack__badge';
            b.textContent = badges[hero.id];
            stack.appendChild(b);
        }

        if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
        visual.addEventListener('pointermove', e => {
            const r = visual.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            stack.style.setProperty('--ry', (nx * 14).toFixed(2) + 'deg');
            stack.style.setProperty('--rx', (-ny * 12).toFixed(2) + 'deg');
        });
        visual.addEventListener('pointerleave', () => {
            stack.style.setProperty('--ry', '0deg');
            stack.style.setProperty('--rx', '0deg');
        });
    }

    /* ====================================================
       1. 鎖定單元：滑鼠經過顯示提示
       ==================================================== */
    function setupLockedUnits() {
        const tip = document.getElementById('floatingTip');
        const lockedItems = document.querySelectorAll('.unit-item.is-locked');
        if (!tip || lockedItems.length === 0) return;

        lockedItems.forEach(item => {
            const btn = item.querySelector('.unit-item__btn');
            if (!btn) return;

            btn.addEventListener('mouseenter', e => showTip(e, '此單元尚未開放，敬請期待'));
            btn.addEventListener('mousemove', moveTip);
            btn.addEventListener('mouseleave', hideTip);
            btn.addEventListener('click', e => {
                e.preventDefault();
                shakeElement(item);
            });
        });

        function showTip(e, text) {
            tip.textContent = text;
            tip.hidden = false;
            moveTip(e);
        }
        function moveTip(e) {
            tip.style.left = e.clientX + 'px';
            tip.style.top  = e.clientY + 'px';
        }
        function hideTip() {
            tip.hidden = true;
        }
    }

    function shakeElement(el) {
        el.style.animation = 'none';
        // force reflow
        void el.offsetWidth;
        el.style.animation = 'shake 380ms';
        setTimeout(() => { el.style.animation = ''; }, 400);
    }

    /* ====================================================
       2. 側邊單元導覽：點擊子單元跳轉並更新樣式
       ==================================================== */
    function setupSidebarNav() {
        const subLinks = document.querySelectorAll('.sub-link');
        subLinks.forEach(link => {
            link.addEventListener('click', () => {
                subLinks.forEach(l => l.classList.remove('is-current'));
                link.classList.add('is-current');
            });
        });

        // 使用 IntersectionObserver 在滾動時自動高亮目前單元
        const sections = document.querySelectorAll('.sub-section');
        if (!('IntersectionObserver' in window) || sections.length === 0) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    subLinks.forEach(l => {
                        l.classList.toggle('is-current', l.getAttribute('href') === '#' + id);
                    });
                    // 同步高亮所屬單元（sub-2-1 → unit 2）
                    const m = id.match(/^sub-(\d+)-/);
                    if (m) {
                        document.querySelectorAll('.unit-item').forEach(u => {
                            u.classList.toggle('is-active', u.dataset.unit === m[1]);
                        });
                    }
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px' });

        sections.forEach(s => observer.observe(s));
    }

    /* ====================================================
       2.5 側欄單元按鈕：點擊跳到該單元標頭
       ==================================================== */
    function setupUnitButtons() {
        document.querySelectorAll('.unit-item__btn[data-unit-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = btn.dataset.unitTarget;
                if (!t) return;
                if (t.charAt(0) === '#') {
                    const target = document.querySelector(t);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // 跨頁：切換到其他單元頁面
                    window.location.href = t;
                }
            });
        });
    }

    /* ====================================================
       3. 子單元 1-1：地圖互動 Tooltip
       ==================================================== */
    function setupMap() {
        const mapFrame = document.querySelector('.map-frame');
        const svg = document.getElementById('estuaryMap');
        const spots = document.querySelectorAll('.map-spot');
        const tooltip = document.querySelector('.map-tooltip');
        const hint = document.getElementById('mapHint');
        if (!mapFrame || !svg || !tooltip || spots.length === 0) return;

        // 每個地點在四個時代各有不同的說明
        const data = {
            site: {
                prehistoric: { era: '距今約 1500 年', title: '十三行聚落', desc: '十三行人在河岸沙丘上搭起干欄屋，在這裡煉鐵、製陶，並與海外交換玻璃珠與銅器。' },
                qing:        { era: '西元 1750 年', title: '八里坌渡口', desc: '史前聚落早已深埋地下。地表上成了漢人的渡口與農田，沒有人知道腳下藏著千年前的村落。' },
                japanese:    { era: '西元 1920 年', title: '沉睡的遺址', desc: '遺址還靜靜埋在沙丘和田地底下，要等到 1955 年飛機「羅盤亂轉」的事件，才會被人發現。' },
                modern:      { era: '西元 2025 年', title: '十三行博物館', desc: '1955 年被發現，1957 年開始挖掘，1989–1991 年大規模搶救發掘，現在是國定遺址；2003 年旁邊蓋了十三行博物館。' }
            },
            mountain: {
                prehistoric: { era: '距今約 1500 年', title: '觀音山', desc: '山上的安山岩是十三行人製作石器的原料，山林裡的鹿與山豬是重要的肉食來源。' },
                qing:        { era: '西元 1750 年', title: '觀音山', desc: '漢人移民在山腳開墾，砍伐森林闢為田地，山上的林木逐漸變少。' },
                japanese:    { era: '西元 1920 年', title: '觀音山', desc: '山區出現小規模採煤與採石，安山岩被大量用來建造房屋與堤岸。' },
                modern:      { era: '西元 2025 年', title: '觀音山', desc: '最高峰硬漢嶺約 616 公尺，現在是國家風景區，爬上山頂就能看到淡水河口和十三行博物館。' }
            },
            estuary: {
                prehistoric: { era: '距今約 1500 年', title: '淡水河出海口', desc: '潮汐帶來豐富魚貝，十三行人划獨木舟捕魚，也經由海路與東南亞、中國往來交易。' },
                qing:        { era: '西元 1750 年', title: '淡水河出海口', desc: '戎克船往返兩岸載運米、糖與布匹；1860 年代淡水開港後，更成為北台灣最重要的港口。' },
                japanese:    { era: '西元 1920 年', title: '淡水河出海口', desc: '河道逐漸淤積，大型船隻改往基隆港，渡輪與小汽船仍穿梭在兩岸之間。' },
                modern:      { era: '西元 2025 年', title: '淡水河出海口', desc: '如今是觀光渡輪、漁人碼頭與候鳥棲地，也是欣賞夕陽的熱門景點。' }
            }
        };

        let activeSpot = null;   // 目前顯示中的地點
        let pinned = false;      // 是否由點擊固定

        const canHover = () => window.matchMedia && window.matchMedia('(hover: hover)').matches;

        spots.forEach(spot => {
            if (!data[spot.dataset.spot]) return;
            spot.addEventListener('mouseenter', () => { if (canHover() && !pinned) showSpot(spot); });
            spot.addEventListener('mouseleave', () => { if (canHover() && !pinned) hideSpot(); });
            spot.addEventListener('focus', () => { if (!pinned) showSpot(spot); });
            spot.addEventListener('blur', () => { if (!pinned) hideSpot(); });
            spot.addEventListener('click', e => {
                e.stopPropagation();
                if (pinned && activeSpot === spot) { pinned = false; hideSpot(); return; }
                pinned = true;
                showSpot(spot);
            });
            spot.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spot.dispatchEvent(new MouseEvent('click')); }
            });
        });

        document.addEventListener('click', e => {
            if (pinned && !e.target.closest('.map-spot')) { pinned = false; hideSpot(); }
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && activeSpot) { pinned = false; hideSpot(); }
        });

        // 時代切換時，若說明框開著就同步更新內容
        svg.addEventListener('erachange', () => { if (activeSpot) showSpot(activeSpot); });
        window.addEventListener('resize', () => { if (activeSpot) positionTooltip(activeSpot); });

        function showSpot(spot) {
            const era = svg.dataset.era || 'modern';
            const info = data[spot.dataset.spot][era];
            tooltip.querySelector('.map-tooltip__era').textContent   = info.era;
            tooltip.querySelector('.map-tooltip__title').textContent = info.title;
            tooltip.querySelector('.map-tooltip__desc').textContent  = info.desc;

            spots.forEach(s => s.classList.toggle('is-active', s === spot));
            activeSpot = spot;
            tooltip.hidden = false;
            positionTooltip(spot);
            requestAnimationFrame(() => tooltip.classList.add('is-visible'));
            if (hint) hint.classList.add('is-gone');
        }
        function positionTooltip(spot) {
            const dot = spot.querySelector('.map-spot__dot');
            const rect = mapFrame.getBoundingClientRect();
            const dotRect = dot.getBoundingClientRect();
            const half = tooltip.offsetWidth / 2;
            let left = dotRect.left - rect.left + dotRect.width / 2;
            left = Math.max(half + 8, Math.min(rect.width - half - 8, left));
            const top = dotRect.top - rect.top;
            // 上方空間不足時改顯示在圓點下方，避免被地圖框裁切
            const below = top < tooltip.offsetHeight * 1.1 + 12;
            tooltip.classList.toggle('is-below', below);
            tooltip.style.left = left + 'px';
            tooltip.style.top  = (below ? dotRect.bottom - rect.top : top) + 'px';
        }
        function hideSpot() {
            tooltip.classList.remove('is-visible');
            tooltip.hidden = true;
            spots.forEach(s => s.classList.remove('is-active'));
            activeSpot = null;
        }
    }

    /* ====================================================
       4. 時光滑桿：圖層 cross-fade + 顏色平滑內插
       ==================================================== */
    function setupTimeSlider() {
        const range  = document.getElementById('timeRange');
        const yearEl = document.getElementById('timeYear');
        const eraEl  = document.getElementById('timeEra');
        const svg    = document.getElementById('estuaryMap');
        if (!range || !yearEl || !eraEl || !svg) return;

        // 四個時代的關鍵幀：位置（0-100）、配色、太陽軌跡與色溫、年代
        const stages = [
            {
                key: 'prehistoric', name: '史前', year: '距今 1500 年', at: 0, yearNum: 525,
                tag: 'PREHISTORIC ERA',
                title: '史前：十三行人的河口家園',
                text: '十三行人在南岸搭起高腳的干欄屋，划著獨木舟在河口捕魚撿貝；觀音山覆蓋著茂密森林，鹿群在岸邊吃草。',
                find: ['干欄屋', '獨木舟', '鹿群', '煉鐵工坊'],
                sun: { x: 645, y: 74, color: '#FFE38A' },
                colors: {
                    sky1: '#B5D9D4', sky2: '#E4EBE2',
                    water1: '#3A6F8A', water2: '#1F3A52',
                    land1: '#9DAA7A', land2: '#6E7A55',
                    mtn1: '#5A6B45',  mtn2: '#2E3A1F'
                }
            },
            {
                key: 'qing', name: '清領', year: '西元 1750 年', at: 33, yearNum: 1750,
                tag: 'QING DYNASTY',
                title: '清領：渡口與商船的時代',
                text: '漢人移民來到河口，八里出現紅瓦房與渡船頭；北岸的滬尾街熱鬧起來，戎克船載著貨物往返兩岸。',
                find: ['戎克船', '滬尾老街', '福佑宮', '紅毛城'],
                sun: { x: 672, y: 58, color: '#F5C265' },
                colors: {
                    sky1: '#F0D8A0', sky2: '#FAE8C8',
                    water1: '#4A7DA0', water2: '#2A5070',
                    land1: '#D4B888', land2: '#A88A5C',
                    mtn1: '#7A6B4D',  mtn2: '#4D4030'
                }
            },
            {
                key: 'japanese', name: '日治', year: '西元 1920 年', at: 66, yearNum: 1920,
                tag: 'JAPANESE ERA',
                title: '日治：火車開進淡水',
                text: '1901 年北淡線鐵路通車，蒸汽火車沿著北岸奔馳；燈塔、教堂、工廠煙囪陸續出現，淡水走向現代化。',
                find: ['蒸汽火車', '燈塔', '工廠煙囪', '淡水驛'],
                sun: { x: 692, y: 64, color: '#E2C374' },
                colors: {
                    sky1: '#D0D8E0', sky2: '#E8ECF0',
                    water1: '#5A7895', water2: '#3A506B',
                    land1: '#B8A890', land2: '#88775A',
                    mtn1: '#6E7060',  mtn2: '#3E4030'
                }
            },
            {
                key: 'modern', name: '現代', year: '西元 2025 年', at: 100, yearNum: 2025,
                tag: 'MODERN ERA',
                title: '現代：博物館守護著千年遺址',
                text: '十三行博物館在遺址旁守護出土文物；鮮紅的關渡大橋跨越河面，捷運與高樓林立，風力發電機在河口轉動，飛機從天空劃過。',
                find: ['十三行博物館', '關渡大橋', '風力發電機', '飛機'],
                sun: { x: 708, y: 52, color: '#FFD86E' },
                colors: {
                    sky1: '#A8C8E8', sky2: '#D8E5F0',
                    water1: '#5A8DBA', water2: '#2E5E80',
                    land1: '#C8C2B5', land2: '#9A968A',
                    mtn1: '#88927A',  mtn2: '#4A5340'
                }
            }
        ];

        // 取得四組漸層 stop 節點與共用太陽節點
        const stops = {
            sky1: document.getElementById('skyStop1'),
            sky2: document.getElementById('skyStop2'),
            water1: document.getElementById('waterStop1'),
            water2: document.getElementById('waterStop2'),
            land1: document.getElementById('landStop1'),
            land2: document.getElementById('landStop2'),
            mtn1: document.getElementById('mtnStop1'),
            mtn2: document.getElementById('mtnStop2')
        };
        const sharedSunGroup = document.getElementById('sharedSunGroup');
        const sharedSunCore  = document.getElementById('sharedSunCore');

        const eraLayers = svg.querySelectorAll('.era-layer');

        /* --- 工具函式 --- */
        function hexToRgb(hex) {
            const h = hex.replace('#', '');
            return {
                r: parseInt(h.slice(0, 2), 16),
                g: parseInt(h.slice(2, 4), 16),
                b: parseInt(h.slice(4, 6), 16)
            };
        }
        function rgbToHex(r, g, b) {
            const to = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
            return `#${to(r)}${to(g)}${to(b)}`;
        }
        function lerpColor(c1, c2, t) {
            const a = hexToRgb(c1), b = hexToRgb(c2);
            return rgbToHex(
                a.r + (b.r - a.r) * t,
                a.g + (b.g - a.g) * t,
                a.b + (b.b - a.b) * t
            );
        }
        function clamp(v, lo, hi) {
            return Math.max(lo, Math.min(hi, v));
        }
        function smoothstep(t) {
            // 平滑曲線（緩入緩出）
            t = clamp(t, 0, 1);
            return t * t * (3 - 2 * t);
        }

        function update() {
            const v = parseFloat(range.value);

            // 找出當前 v 落在哪兩個時代之間
            let i = 0;
            while (i < stages.length - 1 && v > stages[i + 1].at) i++;
            const a = stages[i];
            const b = stages[Math.min(i + 1, stages.length - 1)];
            const span = Math.max(1, b.at - a.at);
            const tRaw = (v - a.at) / span;
            const t = smoothstep(tRaw);

            // ① 內插顏色並套用到漸層 stop
            Object.keys(stops).forEach(k => {
                if (!stops[k]) return;
                const c = lerpColor(a.colors[k], b.colors[k], t);
                stops[k].setAttribute('stop-color', c);
            });

            // ①-b 共用太陽位置與色溫平滑內插
            if (sharedSunGroup && a.sun && b.sun) {
                const sx = a.sun.x + (b.sun.x - a.sun.x) * t;
                const sy = a.sun.y + (b.sun.y - a.sun.y) * t;
                sharedSunGroup.setAttribute('transform', `translate(${sx.toFixed(1)}, ${sy.toFixed(1)})`);
                if (sharedSunCore) {
                    sharedSunCore.setAttribute('fill', lerpColor(a.sun.color, b.sun.color, t));
                }
            }

            // ② 各時代圖層的飽滿型 cross-fade（避免兩時代交界處畫面過淡）
            eraLayers.forEach(layer => {
                const stage = stages.find(s => s.key === layer.dataset.era);
                if (!stage) return;
                const dist = Math.abs(v - stage.at);
                const linearOp = clamp(1 - dist / 33, 0, 1);
                const op = Math.pow(linearOp, 0.78);
                layer.setAttribute('opacity', op.toFixed(3));
                layer.classList.toggle('is-idle', op < 0.02);   // 完全看不見的圖層暫停內部動畫以節省效能
            });

            // ③ 年份計數器：依滑桿位置在相鄰時代之間連續滾動
            const yr = Math.round(a.yearNum + (b.yearNum - a.yearNum) * clamp(tRaw, 0, 1));
            yearEl.textContent = yr < 1000 ? `距今約 ${2025 - yr} 年` : `西元 ${yr} 年`;

            // ④ 時代標籤：以最接近者為準，跨越時代時觸發轉場
            let nearest = stages[0];
            let bestDist = Math.abs(v - nearest.at);
            stages.forEach(s => {
                const d = Math.abs(v - s.at);
                if (d < bestDist) { bestDist = d; nearest = s; }
            });
            eraEl.textContent = nearest.name;
            range.setAttribute('aria-valuenow', String(Math.round(v)));
            range.setAttribute('aria-valuetext', `${nearest.name}・${yearEl.textContent}`);
            range.style.setProperty('--fill', v + '%');
            if (nearest.key !== currentKey) enterEra(nearest);
        }

        /* --- 時代切換：故事卡、按鈕高亮、轉場光幕 --- */
        const storyTag   = document.getElementById('eraStoryTag');
        const storyTitle = document.getElementById('eraStoryTitle');
        const storyText  = document.getElementById('eraStoryText');
        const storyFind  = document.getElementById('eraStoryFind');
        const story      = document.getElementById('eraStory');
        const flash      = document.getElementById('eraFlash');
        const eraBtns    = document.querySelectorAll('.time-slider__ticks [data-era-at]');
        let currentKey = null;

        function enterEra(stage) {
            const first = currentKey === null;
            currentKey = stage.key;
            svg.dataset.era = stage.key;
            eraBtns.forEach(btn => {
                const on = Number(btn.dataset.eraAt) === stage.at;
                btn.classList.toggle('is-active', on);
                btn.setAttribute('aria-pressed', String(on));
            });
            if (story) {
                storyTag.textContent   = stage.tag;
                storyTitle.textContent = stage.title;
                storyText.textContent  = stage.text;
                storyFind.innerHTML    = stage.find.map(f => `<li>${f}</li>`).join('');
                story.dataset.era = stage.key;
                if (!first) restartAnim(story, 'is-swap');
            }
            if (flash && !first) restartAnim(flash, 'is-on');
            svg.dispatchEvent(new CustomEvent('erachange', { detail: stage.key }));
        }

        function restartAnim(el, cls) {
            el.classList.remove(cls);
            void el.offsetWidth;
            el.classList.add(cls);
        }

        /* --- 平滑移動滑桿到指定位置 --- */
        let tweenId = 0;
        function tweenTo(target, duration) {
            const id = ++tweenId;
            const from = parseFloat(range.value);
            if (reduceMotion || duration <= 0 || from === target) {
                range.value = target;
                update();
                return Promise.resolve(id === tweenId);
            }
            const start = performance.now();
            return new Promise(resolve => {
                function step(now) {
                    if (id !== tweenId) return resolve(false);
                    const k = clamp((now - start) / duration, 0, 1);
                    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
                    range.value = from + (target - from) * e;
                    update();
                    if (k < 1) requestAnimationFrame(step);
                    else resolve(true);
                }
                requestAnimationFrame(step);
            });
        }
        function wait(ms) {
            const id = tweenId;
            return new Promise(resolve => setTimeout(() => resolve(id === tweenId), ms));
        }

        /* --- 時光之旅：自動依序播放四個時代 --- */
        const playBtn  = document.getElementById('timePlay');
        const playText = playBtn ? playBtn.querySelector('.time-slider__play-text') : null;
        let playing = false;

        function setPlaying(on) {
            playing = on;
            if (!playBtn) return;
            playBtn.classList.toggle('is-playing', on);
            playBtn.setAttribute('aria-pressed', String(on));
            playText.textContent = on ? '暫停' : '時光之旅';
        }

        async function playTour() {
            setPlaying(true);
            let v = parseFloat(range.value);
            if (v >= 99) {
                if (!(await tweenTo(0, 900))) return;
                if (!(await wait(1800))) return;
                v = 0;
            }
            for (const s of stages) {
                if (s.at <= v + 0.5) continue;
                if (!(await tweenTo(s.at, 2200))) return;
                if (!(await wait(2600))) return;
            }
            setPlaying(false);
        }
        function stopTour() {
            tweenId++;
            setPlaying(false);
        }

        if (playBtn) {
            playBtn.addEventListener('click', () => { playing ? stopTour() : playTour(); });
        }
        eraBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                stopTour();
                tweenTo(Number(btn.dataset.eraAt), 1200);
            });
        });

        range.addEventListener('input', () => {
            stopTour();   // 使用者自己操作時，一律中止進行中的自動移動（時光之旅／時代按鈕）
            update();
        });
        range.addEventListener('change', update);
        update();

        setupEstuaryActors(svg);
    }

    /* ====================================================
       4.5 時光地圖動畫：船隻、火車、捷運、風機、鹿群
       ----------------------------------------------------
       這些 SVG 群組以 transform 屬性定位，若改用 CSS 動畫
       會覆蓋原本座標，因此統一由 JS 在原座標上疊加位移。
       ==================================================== */
    function setupEstuaryActors(svg) {
        const W = 800, MARGIN = 70;
        const actors = [];

        function parseBase(el) {
            const tf = el.getAttribute('transform') || '';
            const m = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(tf);
            return {
                x: m ? parseFloat(m[1]) : 0,
                y: m ? parseFloat(m[2]) : 0,
                rest: tf.replace(/translate\([^)]*\)/, '').trim()
            };
        }
        function wrapX(x) {
            const span = W + MARGIN * 2;
            return ((x + MARGIN) % span + span) % span - MARGIN;
        }
        function layerOf(el) { return el.closest('.era-layer'); }

        // 船隻：沿河道緩慢航行、隨波起伏（dir 負值代表往上游）
        const boats = [
            ['.dugout-canoe', [  9, -7 ]],
            ['.junk-fleet > g', [ 11, -8, 9 ]],
            ['.ferry-jp', [ -14 ]],
            ['.steamship', [ 16 ]],
            ['.ferry-modern', [ 18 ]],
            ['.cargo', [ -10 ]],
            ['.sailboat', [ 13 ]]
        ];
        boats.forEach(([sel, speeds]) => {
            svg.querySelectorAll(sel).forEach((el, i) => {
                const speed = speeds[i % speeds.length];
                const flip = speed < 0 && !el.classList.contains('ferry-modern');
                actors.push({ type: 'boat', el, layer: layerOf(el), base: parseBase(el), speed, flip, phase: Math.random() * 6 });
            });
        });

        // 蒸汽火車：沿北岸鐵軌由左往右行駛
        svg.querySelectorAll('.steam-train').forEach(el => {
            actors.push({ type: 'train', el, layer: layerOf(el), base: parseBase(el), speed: 46 });
        });

        // 現代淡水信義線捷運列車：在軌道區間平穩往返進站
        svg.querySelectorAll('.mrt-train').forEach(el => {
            actors.push({ type: 'mrt', el, layer: layerOf(el), base: parseBase(el) });
        });

        // 風機葉片：繞輪轂旋轉
        svg.querySelectorAll('.blades').forEach((el, i) => {
            const line = el.querySelector('line');
            actors.push({
                type: 'blades', el, layer: layerOf(el),
                hx: parseFloat(line.getAttribute('x1')), hy: parseFloat(line.getAttribute('y1')),
                speed: 70 + i * 18
            });
        });

        // 鹿群：在岸邊來回漫步
        svg.querySelectorAll('.pre-deer').forEach((el, i) => {
            actors.push({ type: 'deer', el, layer: layerOf(el), base: parseBase(el), phase: i * 2.2 });
        });

        if (actors.length === 0) return;

        function render(t) {
            actors.forEach(a => {
                if (a.layer && parseFloat(a.layer.getAttribute('opacity')) < 0.02) return;
                const b = a.base;
                let tf;
                if (a.type === 'boat') {
                    const x = wrapX(b.x + a.speed * t);
                    const y = b.y + Math.sin(t * 1.6 + a.phase) * 1.2;
                    const rot = Math.sin(t * 1.1 + a.phase) * 1.8;
                    tf = `translate(${x.toFixed(1)}, ${y.toFixed(2)}) ${b.rest} rotate(${rot.toFixed(2)})${a.flip ? ' scale(-1, 1)' : ''}`;
                } else if (a.type === 'train') {
                    tf = `translate(${wrapX(b.x + a.speed * t).toFixed(1)}, ${b.y}) ${b.rest}`;
                } else if (a.type === 'mrt') {
                    // 在 x=286 至 x=418 之間平滑減速進站與發車
                    const s = Math.sin(t * 0.45);
                    const x = 352 + s * 64;
                    tf = `translate(${x.toFixed(1)}, ${b.y}) ${b.rest}`;
                } else if (a.type === 'blades') {
                    tf = `rotate(${((a.speed * t) % 360).toFixed(1)} ${a.hx} ${a.hy})`;
                } else if (a.type === 'deer') {
                    const s = Math.sin(t * 0.35 + a.phase);
                    const dir = Math.cos(t * 0.35 + a.phase) >= 0 ? 1 : -1;
                    tf = `translate(${(b.x + s * 14).toFixed(1)}, ${b.y}) ${b.rest} scale(${dir}, 1)`;
                }
                a.el.setAttribute('transform', tf.trim());
            });
        }

        if (reduceMotion) { render(0); return; }

        let visible = true;
        let rafId = 0;
        const t0 = performance.now();
        function loop(now) {
            render((now - t0) / 1000);
            rafId = requestAnimationFrame(loop);
        }
        function sync() {
            const run = visible && !document.hidden;
            svg.classList.toggle('is-offscreen', !run);   // CSS 端同步暫停（見 style.css §21）
            if (run && !rafId) rafId = requestAnimationFrame(loop);
            if (!run && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                visible = entries[0].isIntersecting;
                sync();
            }).observe(svg);
        }
        document.addEventListener('visibilitychange', sync);
        render(0);
        sync();
    }

    /* ====================================================
       5. 子單元 1-2 重點：建築部位懸浮互動（含快速切換膠囊列）
       ==================================================== */
    function setupHouseInteraction() {
        // 通用「部位解析」互動：1-2 干欄屋、2-2 煉鐵爐、3-2 人面陶罐
        document.querySelectorAll('.house-lab').forEach(initLab);

        function initLab(lab) {
            const svg       = lab.querySelector('.house-svg');
            const parts     = lab.querySelectorAll('.house-part');
            const callouts  = lab.querySelectorAll('.part-callouts .callout');
            const infoPanel = lab.querySelector('.info-panel');
            const cards     = lab.querySelectorAll('.info-panel .info-card');
            if (!svg || parts.length === 0) return;

            // 自動建立部位快速切換膠囊列（讓使用者也能直接點擊標籤切換並追蹤已探索部位）
            let pillMap = {};
            if (infoPanel && !infoPanel.querySelector('.part-pills')) {
                const pillBar = document.createElement('div');
                pillBar.className = 'part-pills';
                pillBar.setAttribute('role', 'tablist');
                pillBar.setAttribute('aria-label', '部位快速檢視');
                cards.forEach(c => {
                    const key = c.dataset.info;
                    if (!key || key === 'default') return;
                    const titleEl = c.querySelector('.info-card__title');
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'part-pill';
                    btn.dataset.partPill = key;
                    btn.textContent = titleEl ? titleEl.textContent.trim() : key;
                    btn.addEventListener('click', () => {
                        const targetPart = lab.querySelector(`.house-part[data-part="${key}"]`);
                        if (targetPart) {
                            parts.forEach(p => p.classList.remove('is-active'));
                            targetPart.classList.add('is-active');
                        }
                        activatePart(key);
                    });
                    pillBar.appendChild(btn);
                    pillMap[key] = btn;
                });
                if (Object.keys(pillMap).length > 0) {
                    infoPanel.insertBefore(pillBar, infoPanel.firstChild);
                }
            }

            const canHover = () => window.matchMedia && window.matchMedia('(hover: hover)').matches;

            parts.forEach(part => {
                const key = part.dataset.part;

                part.addEventListener('mouseenter', () => { if (canHover()) activatePart(key); });
                part.addEventListener('focus',      () => activatePart(key));
                part.addEventListener('mouseleave', () => { if (canHover()) deactivatePart(); });
                part.addEventListener('blur',       () => deactivatePart());

                // 點擊：鎖定該部位（再點一次取消）
                part.addEventListener('click', () => {
                    if (part.classList.contains('is-active')) {
                        part.classList.remove('is-active');
                        deactivatePart();
                    } else {
                        parts.forEach(p => p.classList.remove('is-active'));
                        part.classList.add('is-active');
                        activatePart(key);
                    }
                });
                // 鍵盤：Enter / 空白鍵等同點擊
                part.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        part.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    }
                });
            });

            function activatePart(key) {
                svg.classList.add('has-hover');
                callouts.forEach(c => {
                    c.classList.toggle('is-on', c.dataset.for === key);
                });
                Object.keys(pillMap).forEach(k => {
                    const pill = pillMap[k];
                    if (k === key) pill.classList.add('is-visited', 'is-active');
                    else pill.classList.remove('is-active');
                });
                showCard(key);
            }

            function deactivatePart() {
                // 若有鎖定中的部位則不要解除
                const lockedPart = lab.querySelector('.house-part.is-active');
                if (lockedPart) {
                    activatePart(lockedPart.dataset.part);
                    return;
                }
                svg.classList.remove('has-hover');
                callouts.forEach(c => c.classList.remove('is-on'));
                Object.keys(pillMap).forEach(k => pillMap[k].classList.remove('is-active'));
                showCard('default');
            }

            function showCard(key) {
                cards.forEach(c => {
                    c.hidden = (c.dataset.info !== key);
                });
            }
        }
    }

    /* ====================================================
       7. 子單元 1-3：證據點選測驗（含答錯複習路徑提示）
       ==================================================== */
    function setupQuiz() {
        // 通用「證據點選」測驗：每個單元的評量區各有一組
        document.querySelectorAll('.quiz').forEach(initQuiz);

        function initQuiz(quiz) {
            const options  = quiz.querySelectorAll('.quiz-opt');
            const feedback = quiz.querySelector('.quiz__feedback');
            if (options.length === 0 || !feedback) return;

            const correctText = quiz.dataset.correctFeedback || '答對了！這就是最直接的證據。';
            const wrongText   = quiz.dataset.wrongFeedback   || '再想想看～這個選項無法直接證明題目要問的行為。';
            let answered = false;

            // 動態建立「複習路徑」提示區塊
            let reviewBox = quiz.querySelector('.quiz-review');
            if (!reviewBox) {
                reviewBox = document.createElement('div');
                reviewBox.className = 'quiz-review';
                reviewBox.innerHTML = `
                    <span class="quiz-review__title">↻ 複習路徑：</span>
                    <span class="quiz-review__hint"></span>
                    <a class="quiz-review__link" href="#" target="_self">前往複習 →</a>
                `;
                quiz.appendChild(reviewBox);
            }
            const hintEl = reviewBox.querySelector('.quiz-review__hint');
            const linkEl = reviewBox.querySelector('.quiz-review__link');

            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    if (answered) return;
                    const correct = opt.dataset.correct === 'true';

                    if (correct) {
                        answered = true;
                        options.forEach(o => o.disabled = true);
                        opt.classList.add('is-correct');
                        feedback.textContent = correctText;
                        feedback.className = 'quiz__feedback is-correct';
                        reviewBox.classList.remove('is-on');
                        celebrate();
                    } else {
                        opt.classList.add('is-wrong');
                        feedback.textContent = wrongText;
                        feedback.className = 'quiz__feedback is-wrong';
                        setTimeout(() => opt.classList.remove('is-wrong'), 600);

                        // 顯示專屬複習路徑
                        const hint = opt.dataset.reviewHint || '這個選項不正確，建議回到前面段落重新檢視證據關聯。';
                        const link = opt.dataset.reviewLink || '#sub-1-1';
                        hintEl.textContent = hint;
                        linkEl.setAttribute('href', link);
                        reviewBox.classList.add('is-on');
                    }
                });
            });
        }
    }

    /* ====================================================
       5.5  翻牌卡 (Flip Cards)
       ==================================================== */
    function setupFlipCards() {
        const cards = document.querySelectorAll('.flip-card');
        if (cards.length === 0) return;

        cards.forEach(card => {
            const flip = () => card.classList.toggle('is-flipped');

            card.addEventListener('click', flip);
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    flip();
                }
            });
        });
    }

    /* ====================================================
       5.6  模糊揭示 (Spoiler Reveal)
       ==================================================== */
    function setupSpoilers() {
        const spoilers = document.querySelectorAll('.spoiler');
        if (spoilers.length === 0) return;

        spoilers.forEach(box => {
            const trigger = box.querySelector('.spoiler__answer');
            if (!trigger) return;

            const reveal = () => {
                if (box.classList.contains('is-revealed')) return;
                box.classList.add('is-revealed', 'is-open');
            };

            trigger.addEventListener('click', reveal);
            trigger.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    reveal();
                }
            });
        });
    }

    /* ====================================================
       5.7  手風琴 FAQ (Accordion)
       ==================================================== */
    function setupAccordion() {
        const accordions = document.querySelectorAll('.accordion');
        if (accordions.length === 0) return;

        accordions.forEach(acc => {
            const items = acc.querySelectorAll('.accordion__item');
            items.forEach(item => {
                const head = item.querySelector('.accordion__head');
                if (!head) return;

                head.addEventListener('click', () => {
                    const isOpen = item.classList.contains('is-open');
                    // 同一組內互斥：開新的時關掉其他（如要允許多開可註解這段）
                    items.forEach(other => {
                        other.classList.remove('is-open');
                        const h = other.querySelector('.accordion__head');
                        if (h) h.setAttribute('aria-expanded', 'false');
                    });
                    if (!isOpen) {
                        item.classList.add('is-open');
                        head.setAttribute('aria-expanded', 'true');
                    }
                });
            });
        });
    }

    /* ====================================================
       5.8  文物盲盒 (Mystery Box)
       ==================================================== */
    function setupMysteryBox() {
        const box = document.getElementById('mysteryBox');
        if (!box) return;

        const boxImg     = document.getElementById('mysteryBoxImg');
        const svgHolder  = document.getElementById('mysterySvg');
        const info       = document.getElementById('mysteryInfo');
        const chip       = document.getElementById('mysteryChip');
        const nameEl     = document.getElementById('mysteryName');
        const enEl       = document.getElementById('mysteryEn');
        const descEl     = document.getElementById('mysteryDesc');
        const statsEl    = document.getElementById('mysteryStats');
        const btn        = document.getElementById('mysteryBtn');
        const btnText    = document.getElementById('mysteryBtnText');
        const countEl    = document.getElementById('mysteryCount');

        let openCount = 0;
        let lastIndex = -1;

        const ART = [
            {
                name: '人面陶罐', en: 'ANTHROPOMORPHIC POT',
                rare: '★★★★★', era: '距今約 1500 年', found: '極稀少', tag: '鎮館之寶',
                svg: `<defs><radialGradient id="potG" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#D9B888"/><stop offset="100%" stop-color="#6B4A2A"/></radialGradient></defs>
                      <ellipse cx="50" cy="60" rx="32" ry="28" fill="url(#potG)" stroke="#3D2A18" stroke-width="2"/>
                      <ellipse cx="50" cy="34" rx="20" ry="7" fill="#A88A5C" stroke="#3D2A18" stroke-width="2"/>
                      <circle cx="42" cy="56" r="3" fill="#1F1208"/>
                      <circle cx="58" cy="56" r="3" fill="#1F1208"/>
                      <path d="M42 70 Q50 76 58 70" fill="none" stroke="#1F1208" stroke-width="2" stroke-linecap="round"/>`,
                desc: '十三行文化最有名的文物！罐子上捏出一張<b>圓眼睛、高鼻子的人臉</b>。考古學家推測它和祭祀、葬禮或祖靈信仰有關，現在是十三行博物館的「<b>鎮館之寶</b>」，也是國寶級文物。'
            },
            {
                name: '玻璃珠', en: 'GLASS BEADS',
                rare: '★★★★', era: '距今約 1800–500 年', found: '大量', tag: '貿易證據',
                svg: `<defs><radialGradient id="bdG" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#9FD3F0"/><stop offset="100%" stop-color="#1F3A5F"/></radialGradient></defs>
                      <circle cx="35" cy="40" r="14" fill="url(#bdG)" stroke="#0F2238" stroke-width="2"/>
                      <circle cx="65" cy="55" r="11" fill="#E8A845" stroke="#6B4A2A" stroke-width="2"/>
                      <circle cx="48" cy="72" r="9" fill="#7FB3D5" stroke="#1F3A5F" stroke-width="2"/>
                      <circle cx="35" cy="40" r="4" fill="#fff" opacity="0.7"/>`,
                desc: '五顏六色、小小一顆。十三行人自己不會做玻璃，學者推測這些珠子多半是從<b>東南亞或南亞</b>經過一站一站交換才來到這裡，是十三行人參與<b>海洋貿易</b>的重要證據。在當時，它就像今天的「珠寶」一樣珍貴。'
            },
            {
                name: '煉鐵爐渣', en: 'IRON SLAG',
                rare: '★★★', era: '距今約 1500 年', found: '大量', tag: '煉鐵證據',
                svg: `<path d="M22 70 L48 28 L74 70 Z" fill="#5A5A5A" stroke="#1F1F1F" stroke-width="2"/>
                      <path d="M30 70 L48 40 L66 70 Z" fill="#3A3A3A"/>
                      <circle cx="48" cy="55" r="6" fill="#FF7A45"/>
                      <circle cx="40" cy="62" r="2" fill="#FFB07A"/>
                      <circle cx="56" cy="62" r="2" fill="#FFB07A"/>`,
                desc: '煉鐵時留下的<b>黑色渣渣</b>，就像煮飯後鍋底的鍋巴。有爐渣，就代表這裡真的有人在「<b>煉鐵</b>」！十三行是台灣目前唯一確認有史前煉鐵的遺址，所以爐渣是超級重要的證據。'
            },
            {
                name: '骨針與骨器', en: 'BONE NEEDLES',
                rare: '★★', era: '距今約 1500 年', found: '少量', tag: '生活工具',
                svg: `<rect x="20" y="48" width="55" height="3" fill="#E8DFC9" stroke="#6B4A2A" stroke-width="1.2"/>
                      <circle cx="22" cy="49.5" r="2.5" fill="none" stroke="#6B4A2A" stroke-width="1.2"/>
                      <rect x="22" y="58" width="50" height="3" fill="#D9C8A8" stroke="#6B4A2A" stroke-width="1.2"/>
                      <circle cx="24" cy="59.5" r="2.5" fill="none" stroke="#6B4A2A" stroke-width="1.2"/>
                      <rect x="20" y="68" width="58" height="3" fill="#E8DFC9" stroke="#6B4A2A" stroke-width="1.2"/>
                      <circle cx="22" cy="69.5" r="2.5" fill="none" stroke="#6B4A2A" stroke-width="1.2"/>`,
                desc: '用<b>動物骨頭</b>磨成的針，可以用來縫衣服、縫獸皮。有骨針，代表十三行人已經會<b>縫紉</b>，能替自己做衣服——跟現在的針線包有一樣的功能喔！'
            },
            {
                name: '貝類飾品', en: 'SHELL ORNAMENTS',
                rare: '★★★', era: '距今約 1500 年', found: '中等', tag: '裝飾品',
                svg: `<defs><radialGradient id="shG" cx="40%" cy="40%" r="70%"><stop offset="0%" stop-color="#FFF8E8"/><stop offset="100%" stop-color="#C8A878"/></radialGradient></defs>
                      <path d="M50 20 Q78 28 76 60 Q74 80 50 82 Q26 80 24 60 Q22 28 50 20 Z" fill="url(#shG)" stroke="#6B4A2A" stroke-width="2"/>
                      <path d="M50 25 Q70 32 70 58" fill="none" stroke="#6B4A2A" stroke-width="1" opacity="0.5"/>
                      <path d="M50 30 Q65 36 65 56" fill="none" stroke="#6B4A2A" stroke-width="1" opacity="0.5"/>
                      <path d="M50 35 Q60 40 60 54" fill="none" stroke="#6B4A2A" stroke-width="1" opacity="0.5"/>`,
                desc: '把<b>貝殼、螺殼</b>磨一磨、鑽個洞，就成了耳環、項鍊或手環。這告訴我們，十三行人也很<em>愛漂亮</em>，會用飾品打扮自己，飾品也可能代表一個人的身分。'
            },
            {
                name: '青銅錢幣', en: 'CHINESE COINS',
                rare: '★★★★', era: '唐宋時期', found: '少量', tag: '舶來品',
                svg: `<defs><linearGradient id="coG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C8A85C"/><stop offset="100%" stop-color="#6B5A2A"/></linearGradient></defs>
                      <circle cx="50" cy="50" r="32" fill="url(#coG)" stroke="#3D2A18" stroke-width="2"/>
                      <rect x="42" y="42" width="16" height="16" fill="#3D2A18"/>
                      <text x="36" y="38" font-size="8" fill="#3D2A18" font-weight="700">開</text>
                      <text x="56" y="38" font-size="8" fill="#3D2A18" font-weight="700">元</text>
                      <text x="36" y="74" font-size="8" fill="#3D2A18" font-weight="700">通</text>
                      <text x="56" y="74" font-size="8" fill="#3D2A18" font-weight="700">寶</text>`,
                desc: '外圓內方的古代銅錢，例如唐代的<b>「開元通寶」</b>和宋代銅錢。它們是從<em>中國大陸</em>來的「舶來品」（從海外運來的東西），可能是透過交換一路傳過來的，證明那時候已經和海峽對岸有往來。'
            },
            {
                name: '磨製石斧', en: 'POLISHED STONE AXE',
                rare: '★★', era: '距今約 1500 年', found: '少量', tag: '日常工具',
                svg: `<polygon points="38,20 62,20 70,75 30,75" fill="#7E7E7E" stroke="#2E2E2E" stroke-width="2"/>
                      <polygon points="38,20 62,20 60,32 40,32" fill="#5A5A5A" stroke="#2E2E2E" stroke-width="2"/>
                      <line x1="40" y1="40" x2="60" y2="40" stroke="#2E2E2E" stroke-width="1" opacity="0.4"/>
                      <line x1="40" y1="52" x2="60" y2="52" stroke="#2E2E2E" stroke-width="1" opacity="0.4"/>
                      <line x1="40" y1="64" x2="60" y2="64" stroke="#2E2E2E" stroke-width="1" opacity="0.4"/>`,
                desc: '把石頭<b>磨得光滑又鋒利</b>做成的斧頭，可以用來砍樹、削木頭。十三行人已經會用鐵器，所以石器比更早的時代少很多，但有些石器還是會繼續使用。'
            },
            {
                name: '陶罐（生活器）', en: 'DAILY POTTERY',
                rare: '★', era: '距今約 1500 年', found: '極大量', tag: '出土最多',
                svg: `<defs><linearGradient id="cpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D9B888"/><stop offset="100%" stop-color="#8B6A3A"/></linearGradient></defs>
                      <ellipse cx="50" cy="78" rx="26" ry="6" fill="#5A3F1A" opacity="0.4"/>
                      <path d="M30 30 Q28 50 32 72 L68 72 Q72 50 70 30 Q60 26 50 27 Q40 26 30 30 Z" fill="url(#cpG)" stroke="#3D2A18" stroke-width="2"/>
                      <ellipse cx="50" cy="30" rx="20" ry="5" fill="#A88A5C" stroke="#3D2A18" stroke-width="2"/>
                      <line x1="34" y1="48" x2="66" y2="48" stroke="#3D2A18" stroke-width="0.8" opacity="0.4"/>
                      <line x1="33" y1="58" x2="67" y2="58" stroke="#3D2A18" stroke-width="0.8" opacity="0.4"/>`,
                desc: '每個家庭都會用的鍋碗瓢盆！可以<b>裝水、存糧食、煮東西</b>。因為用量超大，遺址裡到處都是<em>碎陶片</em>，每一片都是千年前生活的小線索。'
            }
        ];

        countEl.textContent = `已開啟 ${openCount} 次　·　共 ${ART.length} 種文物`;

        function pickRandom() {
            if (ART.length === 1) return 0;
            let idx;
            do {
                idx = Math.floor(Math.random() * ART.length);
            } while (idx === lastIndex);
            lastIndex = idx;
            return idx;
        }

        function reveal() {
            const idx = pickRandom();
            const art = ART[idx];

            // 開盒動畫
            boxImg.classList.remove('is-opened');
            boxImg.classList.add('is-shaking');
            btn.disabled = true;
            btnText.textContent = '抽取中…';

            setTimeout(() => {
                boxImg.classList.remove('is-shaking');
                boxImg.classList.add('is-opened');
                svgHolder.innerHTML = art.svg;

                info.classList.remove('is-empty');
                chip.textContent = art.tag;
                nameEl.textContent = art.name;
                enEl.textContent = art.en;
                descEl.innerHTML = art.desc;

                statsEl.style.display = 'flex';
                statsEl.innerHTML = `
                    <span><b>${art.era}</b>距今年代</span>
                    <span><b>${art.found}</b>出土數量</span>
                    <span><b>${art.rare}</b>稀有度</span>
                `;

                openCount++;
                countEl.textContent = `已開啟 ${openCount} 次　·　共 ${ART.length} 種文物`;
                btnText.textContent = '再抽一次';
                btn.disabled = false;
            }, 650);
        }

        btn.addEventListener('click', reveal);
    }

    /* ====================================================
       7.5  進階測驗題庫 (1-3)（含答錯複習路徑提示）
       ==================================================== */
    function setupQuizBank() {
        // 通用「進階測驗題庫」：每個單元的評量區各有一組
        document.querySelectorAll('.quiz-bank').forEach(initBank);

        function initBank(bank) {
        const questions = bank.querySelectorAll('.quiz-q');
        let totalCorrect = 0;
        let totalAnswered = 0;
        let firstAllCorrectFired = false;

        questions.forEach(q => {
            const correctAns = q.dataset.correct;
            const reviewAnchor = q.dataset.reviewAnchor || '#sub-1-1';
            const reviewText   = q.dataset.reviewText   || '再回到對應段落複習一下，這題的關鍵概念可在前面找到。';
            const choices = q.querySelectorAll('.quiz-choice');

            // 為每題加上獨立的複習提示區塊
            let reviewBox = q.querySelector('.quiz-q__review');
            if (!reviewBox) {
                reviewBox = document.createElement('div');
                reviewBox.className = 'quiz-q__review';
                reviewBox.innerHTML = `
                    <span class="quiz-q__review-title">↻ 答錯了？建議複習：</span>
                    <span class="quiz-q__review-hint"></span>
                    <a class="quiz-q__review-link" href="#" target="_self">前往複習 →</a>
                `;
                q.appendChild(reviewBox);
            }
            const hintEl = reviewBox.querySelector('.quiz-q__review-hint');
            const linkEl = reviewBox.querySelector('.quiz-q__review-link');
            hintEl.textContent = reviewText;
            linkEl.setAttribute('href', reviewAnchor);

            choices.forEach(choice => {
                choice.addEventListener('click', () => {
                    if (q.classList.contains('is-answered')) return;

                    const isCorrect = choice.dataset.ans === correctAns;

                    if (isCorrect) {
                        choice.classList.add('is-correct');
                        q.classList.add('is-answered');
                        totalCorrect++;
                        totalAnswered++;
                        // 顯示其他正確答案
                        choices.forEach(c => {
                            if (c.dataset.ans === correctAns) c.classList.add('is-correct');
                        });
                        reviewBox.classList.remove('is-on');
                        // 全部答對時也慶祝一下
                        if (totalAnswered === questions.length && !firstAllCorrectFired) {
                            firstAllCorrectFired = true;
                            celebrate();
                        }
                    } else {
                        choice.classList.add('is-wrong');
                        setTimeout(() => choice.classList.remove('is-wrong'), 600);
                        reviewBox.classList.add('is-on');
                    }
                });
            });
        });
        }
    }

    /* ====================================================
       7.7  單元二・三 新增互動
       ==================================================== */

    /* --- 2-1 製陶五步驟 Stepper --- */
    function setupPotterySteps() {
        const root = document.getElementById('potterySteps');
        if (!root) return;

        const tabs    = Array.from(root.querySelectorAll('.steps-flow__tab'));
        const panels  = Array.from(root.querySelectorAll('.steps-flow__panel'));
        const prevBtn = document.getElementById('potteryPrev');
        const nextBtn = document.getElementById('potteryNext');
        const counter = document.getElementById('potteryCounter');
        let current = 0;

        function show(idx) {
            current = Math.max(0, Math.min(panels.length - 1, idx));
            tabs.forEach((t, i) => {
                t.classList.toggle('is-active', i === current);
                t.classList.toggle('is-done', i < current);
                t.setAttribute('aria-selected', String(i === current));
            });
            panels.forEach((p, i) => p.classList.toggle('is-active', i === current));
            prevBtn.disabled = current === 0;
            nextBtn.disabled = current === panels.length - 1;
            counter.textContent = `STEP ${current + 1} / ${panels.length}`;
        }

        tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
        prevBtn.addEventListener('click', () => show(current - 1));
        nextBtn.addEventListener('click', () => show(current + 1));
        show(0);
    }

    /* --- 2-1 燒陶溫度模擬器 --- */
    function setupKiln() {
        const range = document.getElementById('kilnRange');
        if (!range) return;

        const lab     = document.getElementById('kilnLab');
        const tempEl  = document.getElementById('kilnTemp');
        const stateEl = document.getElementById('kilnState');
        const potBody = document.getElementById('kilnPotBody');
        const potRim  = document.getElementById('kilnPotRim');
        const crack   = document.getElementById('kilnCrack');
        const fire    = document.getElementById('kilnFire');
        const glow    = document.getElementById('kilnGlow');
        const zones   = document.querySelectorAll('.kiln-lab__zones li');

        function hexToRgb(hex) {
            const h = hex.replace('#', '');
            return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
        }
        function mix(c1, c2, t) {
            const a = hexToRgb(c1), b = hexToRgb(c2);
            const to = n => Math.round(n).toString(16).padStart(2, '0');
            return `#${to(a.r + (b.r - a.r) * t)}${to(a.g + (b.g - a.g) * t)}${to(a.b + (b.b - a.b) * t)}`;
        }

        const RAW  = '#8B7355';   // 生土色
        const GOOD = '#B5653A';   // 燒成的紅褐色
        const OVER = '#6E3A20';   // 過燒焦色
        const RAW_RIM  = '#6E5A42';
        const GOOD_RIM = '#8E4526';
        const OVER_RIM = '#4A2413';

        function update() {
            const t = parseFloat(range.value);
            tempEl.textContent = Math.round(t) + '°C';

            // 陶色內插：100–900 生土→紅褐；900 以上往焦色偏
            let body, rim;
            if (t <= 900) {
                const k = Math.max(0, (t - 300) / 600);
                body = mix(RAW, GOOD, Math.min(1, k));
                rim  = mix(RAW_RIM, GOOD_RIM, Math.min(1, k));
            } else {
                const k = Math.min(1, (t - 900) / 300);
                body = mix(GOOD, OVER, k);
                rim  = mix(GOOD_RIM, OVER_RIM, k);
            }
            potBody.setAttribute('fill', body);
            potRim.setAttribute('fill', rim);

            // 火焰大小與地面紅光
            const s = 0.5 + (t / 1200) * 0.8;
            fire.style.transform = `scale(${s.toFixed(2)})`;
            glow.setAttribute('opacity', (t / 1200 * 0.6).toFixed(2));

            // 裂痕（超過 900°C 出現，與頁面區間標籤一致）
            crack.setAttribute('opacity', t > 900 ? '1' : '0');
            if (lab) {
                lab.classList.toggle('is-optimal', t >= 600 && t <= 900);
                lab.classList.toggle('is-overheated', t > 900);
            }

            // 狀態文字與區間高亮
            let zone, msg;
            if (t < 600)       { zone = 'low';  msg = t < 300 ? '還只是溫溫的泥土，再加點火吧！' : '開始變硬了，但裡面還沒燒透喔。'; }
            else if (t <= 900) { zone = 'good'; msg = '剛剛好！泥土變成了硬硬的紅褐色陶器，泡水也不會散開！'; }
            else               { zone = 'high'; msg = '糟糕，火太大了——陶罐裂開了！'; }
            stateEl.textContent = msg;
            stateEl.dataset.zone = zone;
            zones.forEach(li => li.classList.toggle('is-on', li.dataset.zone === zone));
        }

        range.addEventListener('input', update);
        update();
    }

    /* --- 2-2 鼓風挑戰 --- */
    function setupBellows() {
        const game = document.getElementById('bellowsGame');
        if (!game) return;

        const btn      = document.getElementById('bellowsBtn');
        const resetBtn = document.getElementById('bellowsReset');
        const bar      = document.getElementById('bellowsBar');
        const tempEl   = document.getElementById('bellowsTemp');
        const msgEl    = document.getElementById('bellowsMsg');
        const fire     = document.getElementById('bellowsFire');
        const glow     = document.getElementById('bellowsGlow');
        const wind     = document.getElementById('bellowsWind');
        const bloom    = document.getElementById('bellowsBloom');
        const bag      = document.getElementById('bellowsBag');

        const MAX = 1200, START = 20;
        let temp = START;
        let done = false;
        let windTimer = null;
        let bagTimer = null;

        function render() {
            bar.style.width = Math.max(2, (temp / MAX) * 100) + '%';
            tempEl.textContent = Math.round(temp) + '°C';
            const s = 0.55 + (temp / MAX) * 0.9;
            fire.style.transform = `scale(${s.toFixed(2)})`;
            glow.setAttribute('opacity', (0.12 + (temp / MAX) * 0.5).toFixed(2));

            if (done) return;
            if (temp < 200)       msgEl.textContent = '爐子還是冷的，開始鼓風吧！';
            else if (temp < 500)  msgEl.textContent = '有點熱度了，繼續！';
            else if (temp < 800)  msgEl.textContent = '不錯！保持這個節奏！';
            else if (temp < 1050) msgEl.textContent = '溫度衝高了，千萬別停下來！';
            else                  msgEl.textContent = '就快到了——最後衝刺！';
        }

        // 溫度自然下降（模擬停止鼓風的散熱）
        setInterval(() => {
            if (done) return;
            if (temp > START) {
                temp = Math.max(START, temp - 9);
                render();
            }
        }, 200);

        btn.addEventListener('click', () => {
            if (done) return;
            temp = Math.min(MAX, temp + 55);

            // 風囊壓縮與風流視覺回饋
            if (bag) {
                bag.classList.add('is-pumping');
                clearTimeout(bagTimer);
                bagTimer = setTimeout(() => bag.classList.remove('is-pumping'), 150);
            }
            wind.setAttribute('opacity', '1');
            clearTimeout(windTimer);
            windTimer = setTimeout(() => wind.setAttribute('opacity', '0'), 260);

            if (temp >= MAX) {
                done = true;
                game.classList.add('is-success');
                bloom.setAttribute('opacity', '1');
                msgEl.textContent = '成功！爐底出現海綿鐵，接下來就是鍛打成器！';
                btn.disabled = true;
                resetBtn.hidden = false;
                celebrate();
            }
            render();
        });

        resetBtn.addEventListener('click', () => {
            temp = START;
            done = false;
            game.classList.remove('is-success');
            bloom.setAttribute('opacity', '0');
            btn.disabled = false;
            resetBtn.hidden = true;
            msgEl.textContent = '爐子還是冷的，開始鼓風吧！';
            render();
        });

        render();
    }

    /* --- 2-3 玻璃珠設計工坊 --- */
    function setupBeadLab() {
        const lab = document.getElementById('beadLab');
        if (!lab) return;

        const beadSvg  = document.getElementById('beadSvg');
        const base     = document.getElementById('beadBase');
        const swatches = lab.querySelectorAll('.bead-swatch');
        const patterns = lab.querySelectorAll('.bead-pattern');
        const doneBtn  = document.getElementById('beadDone');
        const result   = document.getElementById('beadResult');

        const patGroups = {
            stripe: document.getElementById('beadPat-stripe'),
            eye:    document.getElementById('beadPat-eye'),
            dot:    document.getElementById('beadPat-dot')
        };
        const patNames = { plain: '素面', stripe: '波紋', eye: '眼紋', dot: '點紋' };

        let colorName = '靛藍';
        let patternKey = 'plain';

        function darken(hex, amt) {
            const h = hex.replace('#', '');
            const to = n => Math.max(0, Math.round(n)).toString(16).padStart(2, '0');
            return `#${to(parseInt(h.slice(0,2),16)*amt)}${to(parseInt(h.slice(2,4),16)*amt)}${to(parseInt(h.slice(4,6),16)*amt)}`;
        }

        function spinBead() {
            if (!beadSvg || reduceMotion) return;
            beadSvg.classList.remove('is-spinning');
            void beadSvg.offsetWidth;
            beadSvg.classList.add('is-spinning');
        }

        swatches.forEach(sw => {
            sw.addEventListener('click', () => {
                swatches.forEach(s => s.classList.remove('is-active'));
                sw.classList.add('is-active');
                base.setAttribute('fill', sw.dataset.beadColor);
                base.setAttribute('stroke', darken(sw.dataset.beadColor, 0.55));
                colorName = sw.dataset.colorName;
                spinBead();
            });
        });

        patterns.forEach(p => {
            p.addEventListener('click', () => {
                patterns.forEach(x => x.classList.remove('is-active'));
                p.classList.add('is-active');
                patternKey = p.dataset.beadPattern;
                Object.keys(patGroups).forEach(k => {
                    patGroups[k].setAttribute('opacity', k === patternKey ? '1' : '0');
                });
                spinBead();
            });
        });

        doneBtn.addEventListener('click', () => {
            lab.classList.add('is-crafted');
            spinBead();
            result.classList.add('is-done');
            result.textContent = `完成！你做出了一顆「${colorName}底・${patNames[patternKey]}」玻璃珠——在千年前，這可是從遠方交換來、非常珍貴的寶貝！`;
            celebrate();
        });
    }

    /* --- 2-3 本地 vs 舶來 分類遊戲 --- */
    function setupSortGame() {
        // 通用二選一分類遊戲：2-3 本地 vs 舶來、3-3 證據 vs 推測
        document.querySelectorAll('.sort-game').forEach(initSortGame);
    }

    function initSortGame(game) {
        const cards   = game.querySelectorAll('.sort-card');
        const scoreEl = game.querySelector('.sort-game__score');
        const doneText = game.dataset.doneText || '你已經有考古學家的眼光了！';
        let solved = 0;
        let celebrated = false;

        cards.forEach(card => {
            const answer = card.dataset.answer;
            const why    = card.dataset.why || '';
            const fb     = card.querySelector('.sort-card__fb');
            const btns   = card.querySelectorAll('.sort-card__btns button');

            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (card.classList.contains('is-solved')) return;

                    if (btn.dataset.choice === answer) {
                        card.classList.add('is-solved');
                        btn.classList.add('is-correct');
                        btns.forEach(b => b.disabled = true);
                        fb.innerHTML = `<b>正解：${btn.textContent.trim()}。</b>${why}`;
                        solved++;
                        scoreEl.textContent = `已答對 ${solved} / ${cards.length}`;
                        if (solved === cards.length && !celebrated) {
                            celebrated = true;
                            scoreEl.textContent = `全部答對 ${solved} / ${cards.length}——${doneText}`;
                            celebrate();
                        }
                    } else {
                        btn.classList.add('is-wrong');
                        setTimeout(() => btn.classList.remove('is-wrong'), 600);
                    }
                });
            });
        });
    }

    function shuffleChildren(parent) {
        const items = Array.from(parent.children);
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        items.forEach(el => parent.appendChild(el));
    }

    /* --- 1-1 考古工具配對 --- */
    function setupMatchGame() {
        document.querySelectorAll('.match-game').forEach(game => {
            const tools   = Array.from(game.querySelectorAll('[data-side="tool"] .match-item'));
            const uses    = Array.from(game.querySelectorAll('[data-side="use"] .match-item'));
            const useCol  = game.querySelector('[data-side="use"]');
            const scoreEl = game.querySelector('.match-game__score');
            const msgEl   = game.querySelector('.match-game__msg');
            const resetBtn = game.querySelector('.match-game__reset');
            const defaultMsg = msgEl.textContent;
            let pick = { tool: null, use: null };
            let matched = 0;

            function select(item, side) {
                if (item.classList.contains('is-matched')) return;
                const list = side === 'tool' ? tools : uses;
                list.forEach(i => i.classList.toggle('is-picked', i === item && pick[side] !== item));
                pick[side] = pick[side] === item ? null : item;
                if (pick.tool && pick.use) check();
            }

            function check() {
                const { tool, use } = pick;
                if (tool.dataset.key === use.dataset.key) {
                    [tool, use].forEach(i => {
                        i.classList.remove('is-picked');
                        i.classList.add('is-matched', 'is-done');
                        i.disabled = true;
                    });
                    matched++;
                    scoreEl.textContent = `配對 ${matched} / ${tools.length}`;
                    msgEl.innerHTML = `<b>✔ ${tool.querySelector('b').textContent}</b>　${tool.dataset.tip || ''}`;
                    msgEl.dataset.state = 'ok';
                    if (matched === tools.length) {
                        msgEl.innerHTML = '<b>🎉 全部配對成功！</b>　你已經認識考古學家的工具箱了。';
                        celebrate();
                    }
                } else {
                    [tool, use].forEach(i => {
                        i.classList.remove('is-picked');
                        i.classList.add('is-wrong');
                        setTimeout(() => i.classList.remove('is-wrong'), 500);
                    });
                    msgEl.textContent = '好像不太對喔，再想想這個工具是拿來做什麼的？';
                    msgEl.dataset.state = 'bad';
                }
                pick = { tool: null, use: null };
            }

            tools.forEach(t => t.addEventListener('click', () => select(t, 'tool')));
            uses.forEach(u => u.addEventListener('click', () => select(u, 'use')));

            function reset() {
                shuffleChildren(useCol);
                [...tools, ...uses].forEach((i, idx) => {
                    i.classList.remove('is-matched', 'is-done', 'is-picked', 'is-deal');
                    i.disabled = false;
                    void i.offsetWidth;
                    i.style.animationDelay = (idx * 35) + 'ms';
                    i.classList.add('is-deal');
                });
                pick = { tool: null, use: null };
                matched = 0;
                scoreEl.textContent = `配對 0 / ${tools.length}`;
                msgEl.textContent = defaultMsg;
                delete msgEl.dataset.state;
            }
            if (resetBtn) resetBtn.addEventListener('click', reset);
            shuffleChildren(useCol);
        });
    }

    /* --- 3-1 地層排序：由最古老疊到最新 --- */
    function setupStrataGame() {
        document.querySelectorAll('.strata-game').forEach(game => {
            const pool     = game.querySelector('.strata-game__pool');
            const column   = game.querySelector('.strata-game__column');
            const progress = game.querySelector('.strata-game__progress');
            const msgEl    = game.querySelector('.strata-game__msg');
            const resetBtn = game.querySelector('.strata-game__reset');
            const cards    = Array.from(pool.querySelectorAll('.strata-card'));
            const defaultMsg = msgEl.innerHTML;
            const doneMsg = game.dataset.done || '🎉 完成！越下面的土越古老、越上面越新，這就是考古學家判斷年代的「<b>地層學</b>」。';
            const hintFirst = game.dataset.hintFirst || '還不是這層喔！提示：最古老的一層在最深處，那時候<b>還沒有人住</b>，所以沒有任何人類留下的東西。';
            const hintLater = game.dataset.hintLater || '還不是這層喔！提示：想想看，哪一層裡的東西年代<b>比較早</b>？';
            let next = 1;

            cards.forEach(card => {
                card.addEventListener('click', () => {
                    if (card.disabled) return;
                    if (Number(card.dataset.order) === next) {
                        card.disabled = true;
                        card.classList.add('is-used');
                        const slab = document.createElement('div');
                        slab.className = 'strata-slab';
                        slab.style.setProperty('--layer', card.style.getPropertyValue('--layer'));
                        slab.innerHTML = `<b>${card.dataset.name}</b><span>${card.dataset.reveal}</span>`;
                        column.appendChild(slab);
                        game.classList.add('has-slab');
                        progress.textContent = `${next} / ${cards.length}`;
                        msgEl.innerHTML = `<b>✔ 答對！</b>${card.dataset.reveal}`;
                        msgEl.dataset.state = 'ok';
                        next++;
                        if (next > cards.length) {
                            game.classList.add('is-done');
                            msgEl.innerHTML = doneMsg;
                            celebrate();
                        }
                    } else {
                        card.classList.add('is-wrong');
                        setTimeout(() => card.classList.remove('is-wrong'), 500);
                        msgEl.innerHTML = next === 1 ? hintFirst : hintLater;
                        msgEl.dataset.state = 'bad';
                    }
                });
            });

            function reset() {
                next = 1;
                column.querySelectorAll('.strata-slab').forEach(s => s.remove());
                cards.forEach(c => { c.disabled = false; c.classList.remove('is-used'); });
                game.classList.remove('is-done', 'has-slab');
                progress.textContent = `0 / ${cards.length}`;
                msgEl.innerHTML = defaultMsg;
                delete msgEl.dataset.state;
                shuffleChildren(pool);
            }
            if (resetBtn) resetBtn.addEventListener('click', reset);
            shuffleChildren(pool);
        });
    }

    /* --- 3-1 模擬考古發掘（拂去泥土） --- */
    function setupDigGame() {
        const game = document.getElementById('digGame');
        if (!game) return;

        const pit        = document.getElementById('digPit');
        const cover      = document.getElementById('digCover');
        const progressEl = document.getElementById('digProgress');
        const resetBtn   = document.getElementById('digReset');
        const finds      = document.getElementById('digFinds');

        const COLS = 20, ROWS = 12, TOTAL = COLS * ROWS;
        let cleared = 0;
        let completed = false;
        let brushing = false;

        function buildTiles() {
            cover.innerHTML = '';
            for (let i = 0; i < TOTAL; i++) {
                const tile = document.createElement('span');
                tile.className = 'dig-tile';
                cover.appendChild(tile);
            }
            cleared = 0;
            completed = false;
            finds.classList.remove('is-on');
            finds.querySelectorAll('.dig-find').forEach(f => {
                f.classList.remove('is-found');
                f.style.animationDelay = '';
            });
            progressEl.textContent = '已清理 0%';
        }

        function clearTileAt(clientX, clientY) {
            const rect = cover.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

            const col = Math.floor((x / rect.width) * COLS);
            const row = Math.floor((y / rect.height) * ROWS);

            // 筆刷範圍：目前格 + 上下左右
            [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
                const c = col + dc, r = row + dr;
                if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
                const tile = cover.children[r * COLS + c];
                if (tile && !tile.classList.contains('is-cleared')) {
                    tile.classList.add('is-cleared');
                    cleared++;
                }
            });

            const pct = Math.round((cleared / TOTAL) * 100);
            if (!completed) progressEl.textContent = `已清理 ${Math.min(pct, 100)}%`;

            if (!completed && pct >= 85) {
                completed = true;
                // 自動清除剩餘泥土，露出完整墓葬
                Array.from(cover.children).forEach(t => t.classList.add('is-cleared'));
                progressEl.textContent = '發掘完成 100%！';
                finds.classList.add('is-on');
                finds.querySelectorAll('.dig-find').forEach((f, idx) => {
                    f.style.animationDelay = (idx * 90) + 'ms';
                    f.classList.add('is-found');
                });
                celebrate();
            }
        }

        pit.addEventListener('pointerdown', e => {
            brushing = true;
            try { pit.setPointerCapture(e.pointerId); } catch (_) {}
            clearTileAt(e.clientX, e.clientY);
        });
        pit.addEventListener('pointermove', e => {
            if (!brushing) return;
            clearTileAt(e.clientX, e.clientY);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => {
            pit.addEventListener(ev, () => { brushing = false; });
        });

        // 鍵盤操作：方向鍵移動畫筆並清理，Enter / 空白鍵清理目前位置
        let kCol = Math.floor(COLS / 2), kRow = Math.floor(ROWS / 2);
        pit.tabIndex = 0;
        pit.setAttribute('role', 'application');
        pit.setAttribute('aria-label', '考古坑：用方向鍵移動毛刷，拂去泥土');
        pit.addEventListener('keydown', e => {
            const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
            if (!move && e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            if (move) {
                kCol = Math.max(0, Math.min(COLS - 1, kCol + move[0]));
                kRow = Math.max(0, Math.min(ROWS - 1, kRow + move[1]));
            }
            const rect = cover.getBoundingClientRect();
            clearTileAt(
                rect.left + ((kCol + 0.5) / COLS) * rect.width,
                rect.top + ((kRow + 0.5) / ROWS) * rect.height
            );
        });

        resetBtn.addEventListener('click', buildTiles);
        buildTiles();
    }

    /* ====================================================
       7.6  捲動進場動畫
       ==================================================== */
    function setupRevealOnScroll() {
        if (!('IntersectionObserver' in window) || reduceMotion) return;

        const targets = document.querySelectorAll(
            '.lead-block, .know-card, .timeline__item, .pull-quote, ' +
            '.cmp-table, .tip-box, .data-strip, .reading-list li, ' +
            '.quiz-q, .glossary__term, .two-col__col, ' +
            '.flip-card, .spoiler, .accordion__item, .mystery, ' +
            '.steps-flow, .kiln-lab, .bellows-game, .bead-lab, ' +
            '.sort-card, .dig-game, .match-game, .strata-game, .video-frame'
        );

        // 動畫結束後移除所有進場用的 class，避免干擾元件自己的 hover / 翻牌 / transform 樣式
        function settle(el) {
            el.classList.remove('rv-anim');
        }
        function reveal(el, animate) {
            el.classList.remove('rv-pending');
            if (!animate) { settle(el); return; }
            const finish = () => {
                el.removeEventListener('transitionend', onEnd);
                settle(el);
            };
            const onEnd = e => { if (e.target === el && e.propertyName === 'opacity') finish(); };
            el.addEventListener('transitionend', onEnd);
            setTimeout(finish, 900);   // 保險
        }

        targets.forEach(el => el.classList.add('rv-pending', 'rv-anim'));

        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const el = entry.target;
                if (entry.isIntersecting) {
                    reveal(el, true);
                    io.unobserve(el);
                } else if (entry.boundingClientRect.top < 0) {
                    // 已經捲過（例如直接跳到後面的小節）：不必再等，直接顯示
                    reveal(el, false);
                    io.unobserve(el);
                }
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

        targets.forEach(el => io.observe(el));
    }

    /* ====================================================
       8. 慶祝光點微噴泉
       ==================================================== */
    function celebrate() {
        if (window.ShihsanhangAudio) window.ShihsanhangAudio.playSFX('fanfare');
        const container = document.getElementById('celebrate');
        if (!container || reduceMotion) return;
        // 連續快速答對時避免堆疊過多光點
        if (container.childElementCount > 90) return;

        // 以視窗中央為噴發起點，避免依賴特定 DOM
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const colors = ['#FFD86E', '#4F86B3', '#1F3A5F', '#C8965C', '#B8D4E8'];

        for (let i = 0; i < 36; i++) {
            const spark = document.createElement('span');
            spark.className = 'spark';
            const angle = (Math.PI * 2 * i) / 36 + (Math.random() * 0.4);
            const dist  = 120 + Math.random() * 120;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 40;

            spark.style.left = cx + 'px';
            spark.style.top  = cy + 'px';
            spark.style.setProperty('--dx', dx + 'px');
            spark.style.setProperty('--dy', dy + 'px');
            spark.style.background =
                `radial-gradient(circle, ${colors[i % colors.length]}, transparent 70%)`;
            spark.style.animationDelay = (Math.random() * 200) + 'ms';

            container.appendChild(spark);
            spark.addEventListener('animationend', () => spark.remove(), { once: true });
            setTimeout(() => spark.remove(), 2000);   // 保險：動畫事件沒觸發時仍會清除
        }
    }

    /* ====================================================
       9. Skeleton 骨架屏載入動效
       ==================================================== */
    function setupSkeletonLoading() {
        const targets = document.querySelectorAll('.skeleton');
        targets.forEach(el => el.classList.add('is-loading'));

        // 模擬資源載入完成
        window.addEventListener('load', () => {
            setTimeout(() => {
                targets.forEach(el => el.classList.remove('is-loading'));
            }, 400);
        });

        // 保險：若 load 已經觸發
        if (document.readyState === 'complete') {
            setTimeout(() => {
                targets.forEach(el => el.classList.remove('is-loading'));
            }, 400);
        }
    }

    /* ====================================================
       10. 全域 Modal（課程地圖 / 操作說明 / 重點整理 / 製作團隊）
       ==================================================== */
    function setupModal() {
        const root = document.getElementById('modalRoot');
        if (!root) return;

        const panels = root.querySelectorAll('.modal__panel');
        let activeKey = null;
        let lastFocus = null;

        function open(key) {
            const target = root.querySelector(`.modal__panel[data-modal="${key}"]`);
            if (!target) return;
            lastFocus = document.activeElement;

            root.hidden = false;
            panels.forEach(p => { p.hidden = (p !== target); });
            activeKey = key;
            document.documentElement.style.overflow = 'hidden';

            // 焦點移入面板（用 rAF 等下一幀，避免阻塞動畫起始）
            requestAnimationFrame(() => {
                const focusable = target.querySelector('button, a, [tabindex]');
                if (focusable) focusable.focus({ preventScroll: true });
            });
        }

        function close() {
            if (!activeKey) return;
            root.hidden = true;
            panels.forEach(p => p.hidden = true);
            activeKey = null;
            document.documentElement.style.overflow = '';
            if (lastFocus && typeof lastFocus.focus === 'function') {
                // preventScroll：從「課程地圖」點連結跳段後，不要又被焦點拉回原本的位置
                lastFocus.focus({ preventScroll: true });
            }
        }

        // 開啟按鈕
        document.addEventListener('click', e => {
            const opener = e.target.closest('[data-modal-open]');
            if (opener) {
                e.preventDefault();
                open(opener.dataset.modalOpen);
                return;
            }
            const closer = e.target.closest('[data-modal-close]');
            if (closer) {
                // 若是 anchor，先讓瀏覽器跳轉再關閉
                if (closer.tagName === 'A' && closer.getAttribute('href')) {
                    // 不阻擋預設行為
                    setTimeout(close, 30);
                } else {
                    e.preventDefault();
                    close();
                }
            }
        });

        // ESC 關閉；Tab 鍵焦點限制在目前開啟的面板內
        document.addEventListener('keydown', e => {
            if (!activeKey) return;
            if (e.key === 'Escape') { close(); return; }
            if (e.key !== 'Tab') return;
            const panel = root.querySelector(`.modal__panel[data-modal="${activeKey}"]`);
            if (!panel) return;
            const items = Array.from(panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'))
                .filter(el => !el.disabled && !el.hidden);
            if (items.length === 0) { e.preventDefault(); return; }
            const first = items[0], last = items[items.length - 1];
            if (!panel.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        // 從首頁進入 1-1（網址帶 ?guide=1）時，自動跳出「操作說明」
        if (cameFromHomeGuide && !window.ShihsanhangTour) {
            requestAnimationFrame(() => open('guide'));
            try {
                const url = new URL(window.location.href);
                url.searchParams.delete('guide');
                history.replaceState(null, '', url.pathname + url.search + url.hash);
            } catch (_) {}
        }
    }

    /* ====================================================
       11. 首次進入引導 Onboarding（含 localStorage 持久化）
       ==================================================== */
    function setupOnboarding() {
        const card  = document.getElementById('onboard');
        const start = document.getElementById('onboardStart');
        const skip  = document.getElementById('onboardSkip');
        const cb    = document.getElementById('onboardDontShow');
        if (!card || !start || !skip) return;

        const KEY = 'shihsanhang.onboard.seen';
        let seen = false;
        try { seen = localStorage.getItem(KEY) === '1'; } catch (_) {}

        if (!seen && !cameFromHomeGuide && !window.ShihsanhangTour) {
            // 等首屏 paint 完立即出現
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { card.hidden = false; });
            });
        }

        function dismiss(saveFlag) {
            card.hidden = true;
            if (saveFlag) {
                try { localStorage.setItem(KEY, '1'); } catch (_) {}
            }
        }

        start.addEventListener('click', () => {
            const remember = cb && cb.checked;
            dismiss(remember);
            // 主動帶到第一個子單元頂部
            const target = document.getElementById('sub-1-1');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        skip.addEventListener('click', () => {
            const remember = cb && cb.checked;
            dismiss(remember);
        });

        // 點背景關閉
        card.addEventListener('click', e => {
            if (e.target === card) {
                const remember = cb && cb.checked;
                dismiss(remember);
            }
        });
    }

    /* ====================================================
       12. 麵包屑 + 頂部進度條（依滾動位置動態更新）
       ==================================================== */
    function setupLocator() {
        const pathEl = document.getElementById('locatorPath');
        const progressText = document.getElementById('locatorProgress');
        const headerBar = document.getElementById('headerProgressBar');
        const sidebarBar = document.querySelector('.sidebar__progress .progress-bar span');
        const sidebarPct = document.querySelector('.sidebar__progress .progress-percent');

        if (!pathEl) return;

        const subSections = Array.from(document.querySelectorAll('.sub-section'));
        if (subSections.length === 0) return;

        // 將每個 sub-section 對應到顯示文字
        const titleMap = {};
        subSections.forEach(s => {
            const idx = s.querySelector('.sub-section__index');
            const title = s.querySelector('.sub-section__title');
            if (idx && title) {
                titleMap[s.id] = { idx: idx.textContent.trim(), title: title.textContent.trim() };
            }
        });

        function setProgress(pct) {
            const p = Math.max(0, Math.min(100, Math.round(pct)));
            if (headerBar)  headerBar.style.width = p + '%';
            if (sidebarBar) sidebarBar.style.width = p + '%';
            if (sidebarPct) sidebarPct.textContent = p + '%';
            if (progressText) progressText.textContent = '學習進度 ' + p + '%';
        }

        // 各單元名稱（依 sub-section id 前綴判斷）
        const unitNames = {
            '1': '單元一　·　初識十三行',
            '2': '單元二　·　工藝大挑戰',
            '3': '單元三　·　社會與信仰'
        };

        function updateForSection(id) {
            const info = titleMap[id];
            if (!info) return;
            const m = id.match(/^sub-(\d+)-/);
            const unitLabel = (m && unitNames[m[1]]) ? unitNames[m[1]] : unitNames['1'];
            pathEl.innerHTML = `${unitLabel}　／　<b>${info.idx} ${info.title}</b>`;
        }

        // 學習進度：依本頁「已捲動的比例」慢慢增加（只增不減，記錄讀到最遠的位置），
        // 並存在這台裝置上，下次回來可以接著走（與首頁「進度會記得你」的說明一致）
        const STORE_KEY = 'shihsanhang.progress.' + (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
        let maxPct = 0;
        try { maxPct = Math.min(100, Math.max(0, Number(localStorage.getItem(STORE_KEY)) || 0)); } catch (_) {}
        let lastSaved = Math.round(maxPct);
        let ticking = false;
        function computeScrollProgress() {
            ticking = false;
            const doc = document.documentElement;
            const scrollTop = window.pageYOffset || doc.scrollTop || 0;
            const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
            const pct = (scrollTop / scrollable) * 100;
            if (pct > maxPct) {
                maxPct = Math.min(100, pct);
                setProgress(maxPct);
                const rounded = Math.round(maxPct);
                if (rounded !== lastSaved) {
                    lastSaved = rounded;
                    try { localStorage.setItem(STORE_KEY, String(rounded)); } catch (_) {}
                }
            }
        }
        function onScroll() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(computeScrollProgress);
            }
        }
        setProgress(maxPct);
        computeScrollProgress();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        window.addEventListener('load', onScroll);

        // IntersectionObserver：滾到哪一節就更新麵包屑
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateForSection(entry.target.id);
                    }
                });
            }, { rootMargin: '-30% 0px -55% 0px' });
            subSections.forEach(s => io.observe(s));
        }
    }

    /* ====================================================
       13. LOGO 點擊回到首頁/最頂部
       ==================================================== */
    function setupHomeLink() {
        const link = document.getElementById('homeLink');
        if (!link) return;
        // 子頁的 LOGO 直接導回首頁，交給瀏覽器處理
        const href = link.getAttribute('href');
        if (href && href.charAt(0) !== '#') return;
        link.addEventListener('click', e => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const target = document.getElementById('top');
            if (target && typeof target.focus === 'function') {
                setTimeout(() => target.focus({ preventScroll: true }), 600);
            }
        });
    }

})();
