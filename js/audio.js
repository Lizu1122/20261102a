/* =========================================================
   十三行行動博物館 - 聲音與背景音樂引擎 (js/audio.js)
   功能：
   1. 預設全面開啟：背景輕音樂 (BGM) 與按鈕音效 (SFX) 預設為開啟狀態。
   2. 單一控制入口：全站聲音開關集中於右下角常駐浮動控制列 (Floating Dock)。
   3. 即時環境雅樂合成 (Web Audio API) + 支援自訂 MP3 (audio/bgm.mp3)。
   4. 全自動全域按鈕音效委派與測驗答題狀態監聽。
   5. 跨頁面狀態記憶 (localStorage)。
   ========================================================= */

(function () {
    'use strict';

    // 儲存鍵名
    const STORAGE_KEY_BGM = 'shihsanhang_audio_bgm';
    const STORAGE_KEY_SFX = 'shihsanhang_audio_sfx';
    const STORAGE_KEY_VOL = 'shihsanhang_audio_vol';

    // 預設偏好：預設皆為開啟 (true)，音量 35%
    let bgmEnabled = localStorage.getItem(STORAGE_KEY_BGM) !== 'false';
    let sfxEnabled = localStorage.getItem(STORAGE_KEY_SFX) !== 'false';
    let masterVolume = parseFloat(localStorage.getItem(STORAGE_KEY_VOL) || '0.35');
    if (isNaN(masterVolume) || masterVolume < 0 || masterVolume > 1) masterVolume = 0.35;

    // Web Audio 核心變數
    let audioCtx = null;
    let sfxGainNode = null;
    let bgmGainNode = null;
    let reverbConvolver = null;
    let isSynthRunning = false;
    let synthTimer = null;
    let activeBgmNodes = [];
    let customAudio = null;
    let isCustomAudioPlaying = false;
    let customAudioFailed = false;

    function trackBgmNode(node) {
        if (!node) return node;
        activeBgmNodes.push(node);
        try {
            node.addEventListener('ended', () => {
                const idx = activeBgmNodes.indexOf(node);
                if (idx > -1) activeBgmNodes.splice(idx, 1);
            }, { once: true });
        } catch (_) {}
        return node;
    }

    // 使用者互動解鎖標記
    let userHasInteracted = false;
    let lastClickTime = 0;
    let hintDismissTimer = null;

    /* =========================================================
       1. 初始化 Web Audio Context 與公用節點
       ========================================================= */
    function initAudioContext() {
        if (audioCtx) return audioCtx;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;

        try {
            audioCtx = new AudioContextClass();

            // 音效 Master Gain
            sfxGainNode = audioCtx.createGain();
            sfxGainNode.gain.setValueAtTime(sfxEnabled ? 1.0 : 0.0, audioCtx.currentTime);
            sfxGainNode.connect(audioCtx.destination);

            // 背景音樂 Master Gain
            bgmGainNode = audioCtx.createGain();
            bgmGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime); // 初始微音量，平滑淡入
            bgmGainNode.connect(audioCtx.destination);

            // 建立高雅的博物館空間模擬迴音 (Procedural Acoustic Reverb)
            createAcousticReverb();

            return audioCtx;
        } catch (e) {
            console.warn('[Audio] Web Audio API 初始化失敗：', e);
            return null;
        }
    }

    // 建立 2.2 秒平滑指數衰減的立體聲迴音衝激響應
    function createAcousticReverb() {
        if (!audioCtx) return;
        try {
            const sampleRate = audioCtx.sampleRate;
            const length = Math.floor(sampleRate * 2.2);
            const impulse = audioCtx.createBuffer(2, length, sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);

            for (let i = 0; i < length; i++) {
                const decay = Math.exp(-i / (sampleRate * 0.45));
                left[i] = (Math.random() * 2 - 1) * decay;
                right[i] = (Math.random() * 2 - 1) * decay;
            }

            reverbConvolver = audioCtx.createConvolver();
            reverbConvolver.buffer = impulse;

            const reverbGain = audioCtx.createGain();
            reverbGain.gain.setValueAtTime(0.28, audioCtx.currentTime);

            reverbConvolver.connect(reverbGain);
            reverbGain.connect(audioCtx.destination);
        } catch (e) {
            reverbConvolver = null;
        }
    }

    // 確保 AudioContext 已恢復運作並平滑承接音樂
    function resumeAudio() {
        if (!audioCtx) initAudioContext();
        if (audioCtx && audioCtx.state === 'suspended') {
            const p = audioCtx.resume();
            if (p && typeof p.then === 'function') {
                p.then(() => {
                    if (bgmEnabled && !isSynthRunning && !isCustomAudioPlaying) {
                        reallyStartSynthBGM();
                    }
                    updateUI();
                }).catch(() => {});
            }
        } else if (audioCtx && audioCtx.state === 'running') {
            if (bgmEnabled && !isSynthRunning && !isCustomAudioPlaying) {
                reallyStartSynthBGM();
            }
        }
    }

    /* =========================================================
       2. 按鈕音效引擎 (Procedural SFX Engine)
       ========================================================= */
    function playSFX(type) {
        if (!sfxEnabled) return;
        resumeAudio();
        if (!audioCtx || !sfxGainNode) return;

        const now = audioCtx.currentTime;

        switch (type) {
            case 'click':
            case 'subtle': {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const filter = audioCtx.createBiquadFilter();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(1180, now);
                osc.frequency.exponentialRampToValueAtTime(380, now + 0.038);

                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

                filter.type = 'highpass';
                filter.frequency.setValueAtTime(180, now);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(sfxGainNode);

                osc.start(now);
                osc.stop(now + 0.04);
                break;
            }

            case 'pop':
            case 'select': {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(540, now);
                osc.frequency.exponentialRampToValueAtTime(860, now + 0.048);

                gain.gain.setValueAtTime(0.16, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

                osc.connect(gain);
                gain.connect(sfxGainNode);

                osc.start(now);
                osc.stop(now + 0.05);
                break;
            }

            case 'toggleOn': {
                playBeep(540, now, 0.035, 0.14);
                playBeep(820, now + 0.04, 0.05, 0.16);
                break;
            }

            case 'toggleOff': {
                playBeep(820, now, 0.035, 0.14);
                playBeep(540, now + 0.04, 0.05, 0.12);
                break;
            }

            case 'flip': {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(680, now + 0.09);

                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

                osc.connect(gain);
                gain.connect(sfxGainNode);

                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }

            case 'correct': {
                const notes = [783.99, 1046.50, 1318.51];
                notes.forEach((freq, idx) => {
                    const t = now + idx * 0.085;
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.001, t);
                    gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

                    osc.connect(gain);
                    gain.connect(sfxGainNode);

                    if (reverbConvolver) gain.connect(reverbConvolver);

                    osc.start(t);
                    osc.stop(t + 0.7);
                });
                break;
            }

            case 'wrong': {
                const lowNotes = [220, 174.61];
                lowNotes.forEach((freq, idx) => {
                    const t = now + idx * 0.09;
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.18, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

                    osc.connect(gain);
                    gain.connect(sfxGainNode);

                    osc.start(t);
                    osc.stop(t + 0.12);
                });
                break;
            }

            case 'fanfare': {
                const fanfareNotes = [523.25, 659.25, 783.99, 880.00, 1046.50, 1318.51];
                fanfareNotes.forEach((freq, idx) => {
                    const t = now + idx * 0.08;
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);

                    gain.gain.setValueAtTime(0.001, t);
                    gain.gain.linearRampToValueAtTime(0.24, t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

                    osc.connect(gain);
                    gain.connect(sfxGainNode);

                    if (reverbConvolver) gain.connect(reverbConvolver);

                    osc.start(t);
                    osc.stop(t + 0.8);
                });
                break;
            }

            default:
                break;
        }
    }

    function playBeep(freq, time, duration, vol) {
        if (!audioCtx || !sfxGainNode) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        gain.connect(sfxGainNode);

        osc.start(time);
        osc.stop(time + duration + 0.01);
    }

    /* =========================================================
       3. 背景輕音樂引擎 (Background Music Engine)
       ========================================================= */

    function probeCustomAudio() {
        if (customAudio || customAudioFailed) return;

        try {
            const audio = new Audio();
            audio.preload = 'none';
            audio.src = 'audio/bgm.mp3';

            audio.addEventListener('canplaythrough', () => {
                if (bgmEnabled && !isCustomAudioPlaying) {
                    customAudio = audio;
                    customAudio.loop = true;
                    customAudio.volume = masterVolume;
                    customAudio.play().then(() => {
                        isCustomAudioPlaying = true;
                        stopSynthBGM();
                        updateUI();
                    }).catch(() => {
                        customAudioFailed = true;
                    });
                }
            }, { once: true });

            audio.addEventListener('error', () => {
                customAudioFailed = true;
            }, { once: true });

            audio.load();
        } catch (_) {
            customAudioFailed = true;
        }
    }

    function playBGM() {
        if (!bgmEnabled) return;
        resumeAudio();
        if (customAudio && !customAudioFailed) {
            customAudio.volume = masterVolume;
            const playPromise = customAudio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(() => {
                    isCustomAudioPlaying = true;
                    stopSynthBGM();
                    updateUI();
                }).catch(() => {
                    customAudioFailed = true;
                    startSynthBGM();
                });
            }
            return;
        }
        // 核心：0ms 瞬間啟動 Web Audio 即時演算合成音樂，不因外部音檔載入受阻
        startSynthBGM();
        // 背景靜默探測是否有自訂 MP3
        if (!customAudioFailed && !isCustomAudioPlaying) {
            probeCustomAudio();
        }
    }

    function pauseBGM() {
        if (customAudio && isCustomAudioPlaying) {
            try {
                customAudio.pause();
            } catch (_) {}
            isCustomAudioPlaying = false;
        }
        stopSynthBGM();
        updateUI();
    }

    const AMBIENT_CHORDS = [
        { name: 'Fmaj9', root: 174.61, notes: [174.61, 261.63, 329.63, 392.00, 440.00], scale: [523.25, 659.25, 783.99, 880.00, 1046.50] },
        { name: 'G6/9',  root: 196.00, notes: [196.00, 293.66, 392.00, 440.00, 493.88], scale: [587.33, 783.99, 880.00, 987.77, 1174.66] },
        { name: 'Em7',   root: 164.81, notes: [164.81, 246.94, 293.66, 329.63, 392.00], scale: [493.88, 587.33, 659.25, 783.99, 987.77] },
        { name: 'Am9',   root: 110.00, notes: [110.00, 164.81, 220.00, 261.63, 329.63, 392.00], scale: [523.25, 659.25, 783.99, 880.00, 1046.50] },
        { name: 'Dm9',   root: 146.83, notes: [146.83, 220.00, 261.63, 329.63, 349.23], scale: [523.25, 587.33, 698.46, 880.00, 1046.50] },
        { name: 'Cmaj7', root: 130.81, notes: [130.81, 196.00, 246.94, 329.63, 392.00], scale: [523.25, 659.25, 783.99, 987.77, 1046.50] }
    ];

    let currentChordIdx = 0;
    const CHORD_DURATION = 6.2;

    function startSynthBGM() {
        if (isSynthRunning) return;
        initAudioContext();
        if (!audioCtx || !bgmGainNode) return;

        // 若 AudioContext 因瀏覽器未獲使用者互動而掛起，等待 resume 成功再標記運行
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                if (audioCtx.state === 'running' && bgmEnabled && !isSynthRunning) {
                    reallyStartSynthBGM();
                }
            }).catch(() => {
                // 等候使用者在頁面上任何手勢（滑動、觸控、按鍵）解鎖
            });
            return;
        }

        reallyStartSynthBGM();
    }

    function reallyStartSynthBGM() {
        if (isSynthRunning || !audioCtx || !bgmGainNode) return;
        if (audioCtx.state !== 'running') return;
        isSynthRunning = true;

        bgmGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        bgmGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        bgmGainNode.gain.linearRampToValueAtTime(masterVolume, audioCtx.currentTime + 0.6);

        currentChordIdx = 0;
        scheduleNextChord();
        updateUI();

        // 成功發聲時，若提示 Toast 還在等待手勢，即刻更新並優雅淡出
        const toast = document.getElementById('audioToast');
        if (toast && toast.classList && toast.classList.contains('is-show')) {
            const textSpan = toast.querySelector('.audio-toast__text > span');
            if (textSpan && typeof textSpan.textContent === 'string' && textSpan.textContent.includes('輕觸或')) {
                textSpan.textContent = '背景輕音樂已啟動';
                setTimeout(() => dismissToast(), 1800);
            }
        }
    }

    function stopSynthBGM() {
        isSynthRunning = false;
        if (synthTimer) {
            clearTimeout(synthTimer);
            synthTimer = null;
        }

        // 立即停止並斷開所有當前發聲中的背景音樂節點
        activeBgmNodes.forEach(node => {
            try {
                if (typeof node.stop === 'function') node.stop();
                if (typeof node.disconnect === 'function') node.disconnect();
            } catch (_) {}
        });
        activeBgmNodes = [];

        if (audioCtx && bgmGainNode) {
            try {
                bgmGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                bgmGainNode.gain.setValueAtTime(bgmGainNode.gain.value, audioCtx.currentTime);
                bgmGainNode.gain.linearRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
            } catch (_) {
                try { bgmGainNode.gain.value = 0.00001; } catch (__) {}
            }
        }
        updateUI();
    }

    function scheduleNextChord() {
        if (!isSynthRunning || !audioCtx) return;

        playAmbientChord(AMBIENT_CHORDS[currentChordIdx]);
        currentChordIdx = (currentChordIdx + 1) % AMBIENT_CHORDS.length;

        synthTimer = setTimeout(() => {
            if (isSynthRunning) {
                scheduleNextChord();
            }
        }, (CHORD_DURATION - 0.4) * 1000);
    }

    function playAmbientChord(chordData) {
        if (!audioCtx || !bgmGainNode || !isSynthRunning) return;

        const now = audioCtx.currentTime;
        const dur = CHORD_DURATION;

        chordData.notes.forEach((freq) => {
            [-3.5, 3.5].forEach((detune) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const filter = audioCtx.createBiquadFilter();

                osc.type = detune > 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                osc.detune.setValueAtTime(detune, now);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(580, now);
                filter.Q.setValueAtTime(1.2, now);

                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.linearRampToValueAtTime(0.045, now + 2.0);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 1.2);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(bgmGainNode);

                if (reverbConvolver) gain.connect(reverbConvolver);

                trackBgmNode(osc);
                osc.start(now);
                osc.stop(now + dur + 1.5);
            });
        });

        const noteCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < noteCount; i++) {
            const delayOffset = 1.0 + i * (1.1 + Math.random() * 0.8);
            if (delayOffset < dur - 0.5) {
                const dropFreq = chordData.scale[Math.floor(Math.random() * chordData.scale.length)];
                playBellDrop(dropFreq, now + delayOffset);
            }
        }
    }

    function playBellDrop(freq, time) {
        if (!audioCtx || !bgmGainNode || !isSynthRunning) return;

        const osc = audioCtx.createOscillator();
        const overtone = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2.02, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.075, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);

        osc.connect(gain);
        overtone.connect(gain);
        gain.connect(bgmGainNode);

        if (reverbConvolver) gain.connect(reverbConvolver);

        trackBgmNode(osc);
        trackBgmNode(overtone);

        osc.start(time);
        overtone.start(time);
        osc.stop(time + 1.7);
        overtone.stop(time + 1.7);
    }

    function setBGMVolume(val) {
        masterVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
        localStorage.setItem(STORAGE_KEY_VOL, masterVolume.toString());

        if (customAudio) {
            customAudio.volume = masterVolume;
        }

        if (bgmGainNode && audioCtx) {
            bgmGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            bgmGainNode.gain.setValueAtTime(bgmGainNode.gain.value, audioCtx.currentTime);
            bgmGainNode.gain.linearRampToValueAtTime(bgmEnabled ? masterVolume : 0.00001, audioCtx.currentTime + 0.1);
        }

        updateUI();
    }

    // 右下角聲音開關指引標籤控制
    function dismissSwitchHints() {
        const dockPointer = document.getElementById('dockAudioPointer');
        if (dockPointer) {
            dockPointer.classList.add('is-hide');
        }
    }

    function injectSwitchHints() {
        const dockPointer = document.getElementById('dockAudioPointer');
        if (dockPointer) {
            dockPointer.classList.remove('is-hide');
        }
    }

    function toggleBGM(forceState) {
        bgmEnabled = typeof forceState === 'boolean' ? forceState : !bgmEnabled;
        localStorage.setItem(STORAGE_KEY_BGM, bgmEnabled ? 'true' : 'false');

        if (bgmEnabled) {
            playBGM();
            playSFX('toggleOn');
        } else {
            pauseBGM();
            playSFX('toggleOff');
        }
        dismissSwitchHints();
        updateUI();
    }

    function toggleSFX(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !sfxEnabled;

        if (!nextState && sfxEnabled) {
            playSFX('toggleOff');
        }

        sfxEnabled = nextState;
        localStorage.setItem(STORAGE_KEY_SFX, sfxEnabled ? 'true' : 'false');

        if (sfxGainNode && audioCtx) {
            if (sfxEnabled) {
                sfxGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
            } else {
                setTimeout(() => {
                    if (!sfxEnabled && sfxGainNode && audioCtx) {
                        sfxGainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
                    }
                }, 120);
            }
        }

        if (sfxEnabled) {
            playSFX('toggleOn');
        }
        dismissSwitchHints();
        updateUI();
    }

    /* =========================================================
       4. 全域按鈕事件自動攔截與音效委派
       ========================================================= */
    function setupGlobalSFXDelegation() {
        function handleFirstInteraction() {
            userHasInteracted = true;
            try {
                sessionStorage.setItem('shihsanhang_audio_unlocked', '1');
            } catch (_) {}

            resumeAudio();
            if (bgmEnabled && !isSynthRunning && !isCustomAudioPlaying) {
                startSynthBGM();
            }

            const toast = document.getElementById('audioToast');
            if (toast && toast.classList && toast.classList.contains('is-show')) {
                const textSpan = toast.querySelector('.audio-toast__text > span');
                if (textSpan && typeof textSpan.textContent === 'string' && textSpan.textContent.includes('輕觸或')) {
                    textSpan.textContent = '背景輕音樂已啟動';
                    setTimeout(() => dismissToast(), 1600);
                }
            }
        }

        // 監聽全域手勢（微小滑鼠移動、滑動滾輪、觸控、按鍵、聚焦等即刻無縫解鎖）
        const unlockEvents = [
            'pointerdown', 'mousedown', 'touchstart', 'touchend', 'click',
            'pointermove', 'mousemove',
            'wheel', 'scroll',
            'keydown', 'keyup',
            'focus'
        ];

        unlockEvents.forEach(evt => {
            window.addEventListener(evt, handleFirstInteraction, { capture: true, passive: true });
        });

        // 跨頁面點擊任何內部連結時，保證攜帶解鎖標記與即刻激活
        document.addEventListener('click', (e) => {
            const link = e.target && e.target.closest('a[href]');
            if (link) {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    try {
                        sessionStorage.setItem('shihsanhang_audio_unlocked', '1');
                    } catch (_) {}
                    resumeAudio();
                    if (bgmEnabled && !isSynthRunning) {
                        startSynthBGM();
                    }
                }
            }
        }, { capture: true, passive: true });

        document.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastClickTime < 30) return;
            lastClickTime = now;

            handleFirstInteraction();

            const target = e.target;
            if (!target) return;

            if (target.closest('[data-no-sfx="true"]')) return;

            const customSfxEl = target.closest('[data-sfx]');
            if (customSfxEl) {
                const sfxName = customSfxEl.getAttribute('data-sfx');
                if (sfxName && sfxName !== 'none') {
                    playSFX(sfxName);
                    return;
                }
            }

            if (target.closest('.flip-card, .flip-box, [data-modal-open]')) {
                playSFX('flip');
                return;
            }

            const interactiveEl = target.closest(
                'button, a, summary, [role="button"], input[type="radio"], input[type="checkbox"], ' +
                '.quiz-opt, .opt-btn, .quiz-choice, .tab-btn, .unit-item__btn, .sub-nav__btn, ' +
                '.locator__quick, .cmap__node, .bellows-btn, .pot-step, .game-cell, .bead-color'
            );

            if (interactiveEl) {
                if (interactiveEl.closest('.audio-dock, .audio-toggle-btn, .audio-modal-card')) return;
                playSFX('click');
            }
        }, { capture: true, passive: true });

        setupQuizSoundObserver();
    }

    function setupQuizSoundObserver() {
        if (!('MutationObserver' in window)) return;

        const observer = new MutationObserver((mutations) => {
            if (!sfxEnabled) return;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const el = mutation.target;
                    if (el && el.classList) {
                        if (el.classList.contains('is-correct') || el.classList.contains('is-ok')) {
                            playSFX('correct');
                            break;
                        } else if (el.classList.contains('is-wrong') || el.classList.contains('is-bad')) {
                            playSFX('wrong');
                            break;
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        window.addEventListener('shihsanhang:celebrate', () => playSFX('fanfare'));
        window.addEventListener('shihsanhang:correct', () => playSFX('correct'));
        window.addEventListener('shihsanhang:wrong', () => playSFX('wrong'));
    }

    /* =========================================================
       5. 介面動態注入（僅在右下角保留單一控制列）
       ========================================================= */

    function injectAudioUI() {
        injectFloatingDock();    // 注入右下角常駐浮動聲音膠囊
        injectSettingsModal();   // 注入專屬聲音控制中心彈窗
        injectSwitchHints();     // 提示右下角按鈕位置
        updateUI();
    }

    // 注入右下角浮動膠囊 (Floating Dock) - 全站唯一常駐聲音控制入口
    function injectFloatingDock() {
        if (document.getElementById('audioFloatingDock')) return;

        const dock = document.createElement('div');
        dock.id = 'audioFloatingDock';
        dock.className = 'audio-dock';
        dock.setAttribute('role', 'region');
        dock.setAttribute('aria-label', '背景音樂與音效快捷開關');

        dock.innerHTML = `
            <!-- 右下角開關提示標籤 -->
            <span class="audio-switch-pointer audio-switch-pointer--dock" id="dockAudioPointer">聲音開關在右下角 ↘️</span>
            <button type="button" class="audio-dock__btn ${bgmEnabled ? 'is-on' : 'is-off'}" id="dockBgmBtn" title="點擊切換背景輕音樂開關">
                <span class="audio-dock__icon" aria-hidden="true">
                    <span class="audio-bars" aria-hidden="true">
                        <span class="audio-bar"></span>
                        <span class="audio-bar"></span>
                        <span class="audio-bar"></span>
                    </span>
                </span>
                <span class="audio-dock__label">背景音樂</span>
                <span class="audio-dock__tag" id="dockBgmTag">${bgmEnabled ? '開' : '關'}</span>
            </button>
            <div class="audio-dock__divider" aria-hidden="true"></div>
            <button type="button" class="audio-dock__btn ${sfxEnabled ? 'is-on' : 'is-off'}" id="dockSfxBtn" title="點擊切換按鈕音效開關">
                <span class="audio-dock__icon" aria-hidden="true">🔔</span>
                <span class="audio-dock__label">按鈕音效</span>
                <span class="audio-dock__tag" id="dockSfxTag">${sfxEnabled ? '開' : '關'}</span>
            </button>
            <div class="audio-dock__divider" aria-hidden="true"></div>
            <button type="button" class="audio-dock__gear" id="dockGearBtn" title="開啟聲音進階設定（音量與說明）" aria-label="開啟聲音控制中心">
                ⚙️
            </button>
        `;

        document.body.appendChild(dock);

        const dockBgmBtn = document.getElementById('dockBgmBtn');
        if (dockBgmBtn) {
            dockBgmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissSwitchHints();
                toggleBGM();
            });
        }

        const dockSfxBtn = document.getElementById('dockSfxBtn');
        if (dockSfxBtn) {
            dockSfxBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissSwitchHints();
                toggleSFX();
            });
        }

        const dockGearBtn = document.getElementById('dockGearBtn');
        if (dockGearBtn) {
            dockGearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissSwitchHints();
                openSettingsModal();
            });
        }
    }

    // 注入專屬聲音控制中心彈窗 (Audio Settings Modal)
    function injectSettingsModal() {
        if (document.getElementById('audioModalBackdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'audioModalBackdrop';
        backdrop.className = 'audio-modal-backdrop';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-labelledby', 'audioModalTitle');

        const volPercent = Math.round(masterVolume * 100);

        backdrop.innerHTML = `
            <div class="audio-modal-card">
                <header class="audio-modal__head">
                    <div class="audio-modal__title-box">
                        <span class="audio-modal__icon-badge" aria-hidden="true">🎵</span>
                        <div>
                            <h3 class="audio-modal__title" id="audioModalTitle">聲音與音樂控制台</h3>
                            <p class="audio-modal__subtitle">十三行行動博物館 · 沉浸聽覺體驗</p>
                        </div>
                    </div>
                    <button type="button" class="audio-modal__close" id="audioModalClose" aria-label="關閉設定面板">✕</button>
                </header>

                <div class="audio-modal__list">
                    <!-- 背景輕音樂控制列 -->
                    <div class="audio-row">
                        <div class="audio-row__info">
                            <h4 class="audio-row__name">🎵 背景輕音樂 (BGM)</h4>
                            <p class="audio-row__desc">淡水河口海風、溫潤陶韻與沉浸氛圍雅樂（預設開啟）</p>
                        </div>
                        <label class="audio-switch" aria-label="切換背景輕音樂開關">
                            <input type="checkbox" id="modalBgmSwitch" ${bgmEnabled ? 'checked' : ''}>
                            <span class="audio-slider"></span>
                        </label>
                    </div>

                    <!-- 按鈕互動音效控制列 -->
                    <div class="audio-row">
                        <div class="audio-row__info">
                            <h4 class="audio-row__name">🔔 按鈕互動音效 (SFX)</h4>
                            <p class="audio-row__desc">按鈕點選、翻牌、測驗反饋與通關慶祝音效（預設開啟）</p>
                        </div>
                        <label class="audio-switch" aria-label="切換按鈕音效開關">
                            <input type="checkbox" id="modalSfxSwitch" ${sfxEnabled ? 'checked' : ''}>
                            <span class="audio-slider"></span>
                        </label>
                    </div>

                    <!-- 音樂音量調節滑桿 -->
                    <div class="audio-vol-box">
                        <div class="audio-vol-box__header">
                            <span>🔊 音樂音量大小</span>
                            <span class="audio-vol-box__val" id="modalVolVal">${volPercent}%</span>
                        </div>
                        <input type="range" class="audio-vol-range" id="modalVolRange" min="0" max="100" value="${volPercent}" aria-label="音樂音量滑桿">
                    </div>
                </div>

                <footer class="audio-modal__foot">
                    <button type="button" class="audio-test-btn" id="modalTestBtn">
                        <span>▶ 試聽互動音效</span>
                    </button>
                    <p class="audio-info-tip">
                        💡 支援自訂背景音樂：將您的音檔命名為 <code>audio/bgm.mp3</code> 即可自動套用！
                    </p>
                </footer>
            </div>
        `;

        document.body.appendChild(backdrop);

        const closeBtn = document.getElementById('audioModalClose');
        if (closeBtn) closeBtn.addEventListener('click', closeSettingsModal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeSettingsModal();
        });

        const bgmSwitch = document.getElementById('modalBgmSwitch');
        if (bgmSwitch) {
            bgmSwitch.addEventListener('change', (e) => {
                toggleBGM(e.target.checked);
            });
        }

        const sfxSwitch = document.getElementById('modalSfxSwitch');
        if (sfxSwitch) {
            sfxSwitch.addEventListener('change', (e) => {
                toggleSFX(e.target.checked);
            });
        }

        const volRange = document.getElementById('modalVolRange');
        if (volRange) {
            volRange.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10) / 100;
                setBGMVolume(val);
            });
        }

        const testBtn = document.getElementById('modalTestBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                playSFX('click');
                setTimeout(() => playSFX('flip'), 280);
                setTimeout(() => playSFX('correct'), 650);
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && backdrop.classList.contains('is-open')) {
                closeSettingsModal();
            }
        });
    }

    // 注入非侵入式提示吐司 (Audio Pill Toast)
    function showAudioToast(message, duration, subText) {
        let toast = document.getElementById('audioToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'audioToast';
            toast.className = 'audio-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);

            // 點擊提示本身亦能直接播放
            toast.addEventListener('click', () => {
                userHasInteracted = true;
                resumeAudio();
                if (bgmEnabled && !isSynthRunning && !isCustomAudioPlaying) {
                    playBGM();
                }
                dismissToast();
            });
        }

        toast.innerHTML = `
            <span class="audio-toast__icon" aria-hidden="true">🎵</span>
            <span class="audio-toast__text">
                <span>${message}</span>
                ${subText ? `<span class="audio-toast__sub">${subText}</span>` : ''}
            </span>
            <button type="button" class="audio-toast__close" aria-label="關閉提示">✕</button>
        `;

        toast.querySelector('.audio-toast__close').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissToast();
        });

        setTimeout(() => {
            toast.classList.add('is-show');
        }, 150);

        if (hintDismissTimer) clearTimeout(hintDismissTimer);
        if (duration) {
            hintDismissTimer = setTimeout(() => {
                dismissToast();
            }, duration);
        }
    }

    function dismissToast() {
        if (hintDismissTimer) {
            clearTimeout(hintDismissTimer);
            hintDismissTimer = null;
        }

        const toast = document.getElementById('audioToast');
        if (toast) {
            toast.classList.remove('is-show');
            setTimeout(() => toast.remove(), 400);
        }

        const dockPointer = document.getElementById('dockAudioPointer');
        if (dockPointer) dockPointer.classList.add('is-hide');
    }

    function openSettingsModal() {
        const backdrop = document.getElementById('audioModalBackdrop');
        if (backdrop) {
            backdrop.classList.add('is-open');
            playSFX('pop');
        }
    }

    function closeSettingsModal() {
        const backdrop = document.getElementById('audioModalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('is-open');
            playSFX('pop');
        }
    }

    // 更新右下角膠囊與彈窗 UI 狀態
    function updateUI() {
        const isPlaying = isSynthRunning || isCustomAudioPlaying;

        // 浮動膠囊狀態
        const dockBgmBtn = document.getElementById('dockBgmBtn');
        const dockBgmTag = document.getElementById('dockBgmTag');
        if (dockBgmBtn) {
            dockBgmBtn.classList.toggle('is-on', bgmEnabled);
            dockBgmBtn.classList.toggle('is-off', !bgmEnabled);
            dockBgmBtn.classList.toggle('is-playing', isPlaying && bgmEnabled);
        }
        if (dockBgmTag) {
            dockBgmTag.textContent = bgmEnabled ? '開' : '關';
        }

        const dockSfxBtn = document.getElementById('dockSfxBtn');
        const dockSfxTag = document.getElementById('dockSfxTag');
        if (dockSfxBtn) {
            dockSfxBtn.classList.toggle('is-on', sfxEnabled);
            dockSfxBtn.classList.toggle('is-off', !sfxEnabled);
        }
        if (dockSfxTag) {
            dockSfxTag.textContent = sfxEnabled ? '開' : '關';
        }

        // 彈窗設定狀態
        const modalBgmSwitch = document.getElementById('modalBgmSwitch');
        if (modalBgmSwitch) modalBgmSwitch.checked = bgmEnabled;

        const modalSfxSwitch = document.getElementById('modalSfxSwitch');
        if (modalSfxSwitch) modalSfxSwitch.checked = sfxEnabled;

        const volPercent = Math.round(masterVolume * 100);
        const modalVolVal = document.getElementById('modalVolVal');
        if (modalVolVal) modalVolVal.textContent = `${volPercent}%`;

        const modalVolRange = document.getElementById('modalVolRange');
        if (modalVolRange) modalVolRange.value = volPercent;
    }

    /* =========================================================
       6. 頁面生命週期與初始化掛載
       ========================================================= */
    function init() {
        setupGlobalSFXDelegation();
        injectAudioUI();

        // 預設立即啟動音樂
        if (bgmEnabled) {
            initAudioContext();
            resumeAudio();
            startSynthBGM();
        }

        // 多段嘗試喚醒（若瀏覽器在頁面初次渲染前幾幀才傳遞 User Activation）
        [40, 120, 260, 500].forEach(delay => {
            setTimeout(() => {
                if (bgmEnabled && !isSynthRunning && !isCustomAudioPlaying) {
                    resumeAudio();
                    startSynthBGM();
                }
            }, delay);
        });

        // 右下角聲音開關指引標籤於 4 秒後自動淡出
        setTimeout(() => {
            const dockPointer = document.getElementById('dockAudioPointer');
            if (dockPointer) dockPointer.classList.add('is-hide');
        }, 4000);

        // 檢查瀏覽器自動播放狀態並呈現提示
        setTimeout(() => {
            const isPlaying = isSynthRunning || isCustomAudioPlaying || (audioCtx && audioCtx.state === 'running');
            if (isPlaying) {
                // 自動播放成功（已在同工作階段互動或瀏覽器允許）
                showAudioToast('背景輕音樂已自動播放', 2500, '· 右下角可調整音量');
            } else if (bgmEnabled) {
                // 受限於瀏覽器 Autoplay 規範，友善提示：任何滑動、移動、觸控皆能直接無縫出聲
                showAudioToast('輕觸或滑動頁面即可啟動背景音樂', 4500, '· 右下角常駐控制');
            }
        }, 320);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (isCustomAudioPlaying && customAudio) customAudio.pause();
                if (isSynthRunning) stopSynthBGM();
            } else {
                if (bgmEnabled) {
                    resumeAudio();
                    startSynthBGM();
                }
            }
        });
    }

    // 立即在 script 載入時搶先建立 context（從上一頁跳轉過來時可直接繼承 user activation 瞬間出聲）
    try {
        if (bgmEnabled) {
            initAudioContext();
            resumeAudio();
            startSynthBGM();
        }
    } catch (_) {}

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ShihsanhangAudio = {
        playBGM,
        pauseBGM,
        toggleBGM,
        setBGMVolume,
        playSFX,
        toggleSFX,
        openSettings: openSettingsModal,
        closeSettings: closeSettingsModal,
        dismissHints: dismissToast,
        getState: () => ({
            bgm: bgmEnabled,
            sfx: sfxEnabled,
            volume: masterVolume,
            isPlaying: isSynthRunning || isCustomAudioPlaying
        })
    };

})();
