/* =========================================================
   十三行行動博物館 - 首頁互動
   ========================================================= */
(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.add('home-anim');

    /* ---------- 數字跳動 ---------- */
    function setupCounters() {
        const nums = document.querySelectorAll('[data-count]');
        if (reduceMotion) return;
        nums.forEach((el, i) => {
            const target = Number(el.dataset.count);
            const start = performance.now() + 400 + i * 120;
            const dur = 1100;
            el.textContent = '0';
            const step = (now) => {
                const p = Math.min(Math.max((now - start) / dur, 0), 1);
                el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }

    /* ---------- 捲動浮現 ---------- */
    function setupReveal() {
        const items = document.querySelectorAll('.reveal-up');
        if (reduceMotion || !('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                const el = e.target;
                const passed = !e.isIntersecting && e.boundingClientRect.top < 0;
                if (!e.isIntersecting && !passed) return;
                if (passed) el.style.transitionDelay = '0ms';   // 已經捲過：不必再排隊
                el.classList.add('is-in');
                io.unobserve(el);
                // 進場動畫結束後移除錯開延遲，避免之後的 hover 動作被拖慢
                const clear = () => { el.style.transitionDelay = ''; };
                el.addEventListener('transitionend', function onEnd(ev) {
                    if (ev.target !== el || ev.propertyName !== 'opacity') return;
                    el.removeEventListener('transitionend', onEnd);
                    clear();
                });
                setTimeout(clear, 1600);   // 保險
            });
        }, { threshold: 0.15 });
        items.forEach((el, i) => {
            el.style.transitionDelay = (el.classList.contains('unit-card') ? (i % 3) * 120 : 0) + 'ms';
            io.observe(el);
        });
    }

    /* ---------- 主視覺滑鼠視差 ---------- */
    function setupParallax() {
        const visual = document.querySelector('.home-hero__visual');
        if (!visual || reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
        const layers = visual.querySelectorAll('.px');
        const chips = visual.querySelectorAll('.hero-chip');
        let raf = 0, tx = 0, ty = 0;
        visual.addEventListener('pointermove', (e) => {
            const r = visual.getBoundingClientRect();
            tx = (e.clientX - r.left) / r.width - 0.5;
            ty = (e.clientY - r.top) / r.height - 0.5;
            if (!raf) raf = requestAnimationFrame(apply);
        });
        visual.addEventListener('pointerleave', () => {
            tx = ty = 0;
            if (!raf) raf = requestAnimationFrame(apply);
        });
        function apply() {
            raf = 0;
            layers.forEach((g) => {
                const d = Number(g.dataset.depth) || 0;
                g.setAttribute('transform', `translate(${(-tx * d).toFixed(2)} ${(-ty * d).toFixed(2)})`);
            });
            chips.forEach((c, i) => {
                const d = 10 + i * 4;
                c.style.translate = `${(tx * d).toFixed(1)}px ${(ty * d).toFixed(1)}px`;
            });
        }
    }

    /* ---------- 主視覺離開畫面 / 分頁隱藏時暫停動畫 ---------- */
    function setupHeroPause() {
        const visual = document.querySelector('.home-hero__visual');
        if (!visual || reduceMotion || !('IntersectionObserver' in window)) return;
        let inView = true;
        const sync = () => visual.classList.toggle('is-paused', !inView || document.hidden);
        new IntersectionObserver((entries) => {
            inView = entries[entries.length - 1].isIntersecting;
            sync();
        }).observe(visual);
        document.addEventListener('visibilitychange', sync);
    }

    /* ---------- 你知道嗎？冷知識 ---------- */
    const FACTS = [
        '1955 年，空軍飛機飛過八里上空時，飛行員發現羅盤怪怪的。學者後來前來調查，在田裡撿到陶片和煉鐵爐渣。1957 年才正式開始挖掘。',
        '十三行是台灣目前唯一確定有「史前煉鐵」證據的遺址。一千多年前，這裡的人就已經會自己煉鐵了！',
        '「十三行」這個名字，據說來自清代這裡曾有十三家商行，跟史前的十三行人其實沒有關係喔。',
        '1989 年起，這裡要蓋污水處理廠。考古學家臧振華帶著團隊趕在施工前「搶救發掘」，才保住了大量珍貴文物。',
        '十三行人過世後，大多是側身、彎著腳下葬，而且頭常常朝向西南方。為什麼？到現在還是個謎！',
        '國寶「人面陶罐」上有一張小小的臉，有眼睛、鼻子和嘴巴。它是十三行博物館最有名的寶貝之一。'
    ];
    function setupFunFact() {
        const box = document.getElementById('funFact');
        const text = document.getElementById('funFactText');
        const count = document.getElementById('funFactCount');
        const dotsEl = document.getElementById('funFactDots');
        const next = document.getElementById('funFactNext');
        if (!box || !text || !next) return;
        let idx = 0;

        if (dotsEl) {
            dotsEl.innerHTML = FACTS.map((_, i) => `<span class="fun-fact__dot${i === 0 ? ' is-active' : ''}"></span>`).join('');
        }
        function updateDots() {
            if (!dotsEl) return;
            dotsEl.querySelectorAll('.fun-fact__dot').forEach((d, i) => {
                d.classList.toggle('is-active', i === idx);
            });
        }

        next.addEventListener('click', () => {
            idx = (idx + 1) % FACTS.length;
            box.classList.remove('is-flip');
            void box.offsetWidth;
            box.classList.add('is-flip');
            text.textContent = FACTS[idx];
            count.textContent = `${idx + 1} / ${FACTS.length}`;
            updateDots();
        });
        count.textContent = `1 / ${FACTS.length}`;
    }

    const WARM = [
        { q: '考古學家最在意的，通常是什麼？', opts: ['把最漂亮的寶物帶回家', '記下文物躺在哪一層土、旁邊有什麼', '愈快挖完愈好'], a: 1, why: '位置和旁邊的線索，比單一件漂亮文物更重要。' },
        { q: '十三行人最常吃的，比較可能來自哪裡？', opts: ['河裡和海裡的魚、貝', '只吃山上的水果', '每天吃漢堡'], a: 0, why: '遺址裡有很多貝塚和魚骨，他們住在河口邊。' },
        { q: '「十三行」這個名字，最早比較像是在說什麼？', opts: ['剛好有 13 棟房子', '清代這裡的地名／商行', '13 位考古學家'], a: 1, why: '名字來自後來的地名，不是史前就叫這個。' }
    ];
    function setupWarmup() {
        const wrap = document.getElementById('warmupGame');
        const qEl = document.getElementById('warmupQ');
        const optsEl = document.getElementById('warmupOpts');
        const fb = document.getElementById('warmupFb');
        const count = document.getElementById('warmupCount');
        const bar = document.getElementById('warmupBar');
        const go = document.querySelector('.warmup__go');
        if (!qEl || !optsEl) return;
        let i = 0, locked = false;
        function render(animate) {
            const item = WARM[i];
            locked = false;
            if (wrap && animate && !reduceMotion) {
                wrap.classList.remove('is-step-anim');
                void wrap.offsetWidth;
                wrap.classList.add('is-step-anim');
            }
            qEl.textContent = item.q;
            fb.textContent = '';
            fb.dataset.state = '';
            count.textContent = `${i + 1} / ${WARM.length}`;
            if (bar) bar.style.width = `${((i + 1) / WARM.length) * 100}%`;
            optsEl.innerHTML = item.opts.map((t, n) => `<button type="button" data-i="${n}">${t}</button>`).join('');
            optsEl.querySelectorAll('button').forEach((btn) => {
                btn.addEventListener('click', () => {
                    if (locked) return;
                    const ok = Number(btn.dataset.i) === item.a;
                    btn.classList.add(ok ? 'is-ok' : 'is-bad');
                    fb.textContent = (ok ? '✔ 答對了！' : '再想想～') + item.why;
                    fb.dataset.state = ok ? 'ok' : 'bad';
                    if (!ok) {
                        setTimeout(() => btn.classList.remove('is-bad'), 500);
                        return;
                    }
                    locked = true;
                    optsEl.querySelectorAll('button').forEach((b) => { b.disabled = true; });
                    if (i < WARM.length - 1) {
                        setTimeout(() => { i += 1; render(true); }, 900);
                    } else if (go) {
                        go.hidden = false;
                    }
                });
            });
        }
        render(false);
    }

    /* ---------- 讀取已保存的單元學習進度與總測驗最高分 ---------- */
    function setupSavedProgress() {
        document.querySelectorAll('.unit-card[data-progress-key]').forEach((card) => {
            const key = 'shihsanhang.progress.' + card.dataset.progressKey;
            let pct = 0;
            try { pct = Math.min(100, Math.max(0, Number(localStorage.getItem(key)) || 0)); } catch (_) {}
            if (pct > 0) {
                const badge = document.createElement('span');
                badge.className = 'unit-card__prog';
                badge.textContent = pct >= 95 ? `✔ 已完成 (${pct}%)` : `● 已讀 ${pct}%`;
                card.appendChild(badge);
            }
        });
        const bestEl = document.getElementById('homeQuizBest');
        if (bestEl) {
            try {
                const raw = localStorage.getItem('shihsanhang.quiz.best');
                if (raw) {
                    const data = JSON.parse(raw);
                    if (data && typeof data.score === 'number') {
                        const statusStr = data.passed ? '已通過✓' : `答對 ${data.correct || 0}/15 題`;
                        bestEl.textContent = `🏆 最高紀錄：${data.score} 分（${statusStr}）`;
                        bestEl.hidden = false;
                    }
                }
            } catch (_) {}
        }
    }

    [setupCounters, setupReveal, setupParallax, setupHeroPause, setupFunFact, setupWarmup, setupSavedProgress].forEach((fn) => {
        try { fn(); } catch (err) { console.error('[home] ' + fn.name + ' 失敗：', err); }
    });
})();
