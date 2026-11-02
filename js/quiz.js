/* =========================================================
   十三行行動博物館 - 終極總測驗互動與倒數計時引擎 (js/quiz.js)
   結構：10 題跨單元選擇題（答案均勻分布於 A/B/C/D）+ 5 題全新極簡視覺互動遊戲（共 15 題）
   通過門檻：選擇題至少答對 6/10 題 且 互動題至少完成並答對 3/5 題
   回饋機制：作答過程中不提前洩漏對錯，送出考卷後才統一批改、公布成績與錯題檢討
   ========================================================= */

(() => {
    'use strict';

    const RING_CIRCUMFERENCE = 125.66; // 2 * Math.PI * 20
    const PASS_MCQ_MIN = 6;            // 選擇題通過門檻：至少 6 / 10 題
    const PASS_GAME_MIN = 3;           // 互動題通過門檻：至少 3 / 5 題

    /* ---------- 視覺 SVG 圖庫（極簡大圖、少字直覺） ---------- */
    const ART = {
        // 遊戲 1：人面陶罐三部位拼圖塊
        potRim: `<svg viewBox="0 0 120 72"><rect width="120" height="72" rx="8" fill="#FBF7F0"/><path d="M34 12 H86 L78 34 L84 62 H36 L42 34 Z" fill="#C96A3B" stroke="#5A2810" stroke-width="2.5"/><circle cx="44" cy="20" r="3" fill="none" stroke="#FFF" stroke-width="1.5"/><circle cx="60" cy="20" r="3" fill="none" stroke="#FFF" stroke-width="1.5"/><circle cx="76" cy="20" r="3" fill="none" stroke="#FFF" stroke-width="1.5"/><ellipse cx="50" cy="40" rx="4.5" ry="2" fill="#3E1B0B"/><ellipse cx="70" cy="40" rx="4.5" ry="2" fill="#3E1B0B"/><path d="M60 36 V47 M52 52 Q60 57 68 52" fill="none" stroke="#3E1B0B" stroke-width="2.2" stroke-linecap="round"/></svg>`,
        potBelly: `<svg viewBox="0 0 120 72"><rect width="120" height="72" rx="8" fill="#FBF7F0"/><path d="M34 8 H86 C108 24 108 50 84 64 H36 C12 50 12 24 34 8 Z" fill="#C96A3B" stroke="#5A2810" stroke-width="2.5"/><path d="M40 36 L60 18 L80 36 L60 54 Z" fill="none" stroke="#5A2810" stroke-width="2.2"/><path d="M48 36 L60 25 L72 36 L60 47 Z" fill="none" stroke="#FFF2E2" stroke-width="1.6"/></svg>`,
        potFoot: `<svg viewBox="0 0 120 72"><rect width="120" height="72" rx="8" fill="#FBF7F0"/><path d="M38 12 H82 L74 30 L92 58 H28 L46 30 Z" fill="#B85D30" stroke="#5A2810" stroke-width="2.5"/><line x1="34" y1="50" x2="86" y2="50" stroke="#FFF2E2" stroke-width="2" stroke-dasharray="4 3"/></svg>`,

        // 遊戲 3：圖片配圖片（微距紋飾 vs 文物本尊）
        zoomDiamond: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#D97B48"/><path d="M14 36 L36 14 L58 36 L36 58 Z" fill="none" stroke="#4A200E" stroke-width="3.2"/><path d="M24 36 L36 24 L48 36 L36 48 Z" fill="none" stroke="#FFF" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="none" stroke="#FFF" stroke-width="2"/><circle cx="56" cy="16" r="4" fill="none" stroke="#FFF" stroke-width="2"/></svg>`,
        zoomEyeBead: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#1F4E79"/><circle cx="36" cy="36" r="24" fill="#F4D03F"/><circle cx="36" cy="36" r="16" fill="#FFFFFF"/><circle cx="36" cy="36" r="9" fill="#1F4E79"/><circle cx="33" cy="33" r="3" fill="#FFF"/></svg>`,
        zoomSlag: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#3B322C"/><path d="M12 50 Q10 22 30 14 Q52 10 60 30 Q62 52 40 58 Q18 60 12 50Z" fill="#5C4938" stroke="#221A15" stroke-width="2"/><circle cx="26" cy="30" r="5.5" fill="#1B1410"/><circle cx="44" cy="26" r="4.5" fill="#1B1410"/><circle cx="38" cy="44" r="6.5" fill="#1B1410"/></svg>`,
        zoomSpindle: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#EEDCC5"/><circle cx="36" cy="36" r="25" fill="#C86D3B" stroke="#6E3219" stroke-width="2.2"/><circle cx="36" cy="36" r="7" fill="#FBF7F0" stroke="#6E3219" stroke-width="2"/><path d="M36 11 V24 M36 48 V61 M11 36 H24 M48 36 H61" stroke="#FFF" stroke-width="2.2" stroke-linecap="round"/></svg>`,

        itemPot: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#F6EFE6"/><path d="M25 12 H47 L44 25 C55 30 57 47 45 55 L50 62 H22 L27 55 C15 47 17 30 28 25 Z" fill="#C96A3B" stroke="#5A2810" stroke-width="2.2"/><circle cx="32" cy="20" r="2" fill="#3E1B0B"/><circle cx="40" cy="20" r="2" fill="#3E1B0B"/></svg>`,
        itemBead: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#EEF5FB"/><path d="M16 20 Q36 60 56 20" fill="none" stroke="#8C6D46" stroke-width="2.5"/><circle cx="22" cy="34" r="6" fill="#E67E22"/><circle cx="36" cy="42" r="7" fill="#2980B9"/><circle cx="50" cy="34" r="6" fill="#27AE60"/></svg>`,
        itemSlag: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#F3ECE4"/><path d="M18 56 L25 28 H47 L54 56 Z" fill="#8C6239" stroke="#4A3219" stroke-width="2.2"/><path d="M28 28 Q36 10 44 28" fill="#FF5722"/><circle cx="32" cy="45" r="6.5" fill="#2B231D"/><circle cx="42" cy="47" r="5.5" fill="#3D322A"/></svg>`,
        itemSpindle: `<svg viewBox="0 0 72 72"><rect width="72" height="72" rx="12" fill="#F6F2EA"/><line x1="16" y1="56" x2="56" y2="16" stroke="#6E4726" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="36" cy="36" rx="16" ry="8" transform="rotate(-45 36 36)" fill="#C86D3B" stroke="#5A2810" stroke-width="2.2"/></svg>`,

        // 遊戲 4：貿易帆船 6 選 3
        cargoBead: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="#2980B9" stroke="#1B4F72" stroke-width="2"/><circle cx="32" cy="32" r="10" fill="#F1C40F"/><circle cx="32" cy="32" r="4" fill="#FFF"/></svg>`,
        cargoCoin: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="#529471" stroke="#2D5743" stroke-width="2.5"/><rect x="25" y="25" width="14" height="14" fill="#FFF" stroke="#2D5743" stroke-width="2"/></svg>`,
        cargoCeladon: `<svg viewBox="0 0 64 64"><path d="M12 24 H52 C50 44 40 50 32 50 C24 50 14 44 12 24 Z" fill="#A3C9A8" stroke="#4F7756" stroke-width="2.2"/><rect x="24" y="50" width="16" height="5" rx="2" fill="#6B9071"/></svg>`,
        cargoRock: `<svg viewBox="0 0 64 64"><polygon points="12,50 22,18 44,14 54,46 32,54" fill="#7F8C8D" stroke="#34495E" stroke-width="2.2"/></svg>`,
        cargoShell: `<svg viewBox="0 0 64 64"><path d="M14 42 C14 20 50 20 50 42 L38 52 H26 Z" fill="#F4A261" stroke="#8C4A1E" stroke-width="2.2"/><line x1="32" y1="24" x2="32" y2="52" stroke="#8C4A1E" stroke-width="2"/></svg>`,
        cargoIron: `<svg viewBox="0 0 64 64"><path d="M14 46 Q14 22 32 16 Q50 20 50 44 Q32 54 14 46 Z" fill="#4A3F35" stroke="#221A15" stroke-width="2.2"/><circle cx="28" cy="32" r="4" fill="#FF5722"/><circle cx="38" cy="38" r="5" fill="#1F1814"/></svg>`
    };

    /* ---------- 第一部分：10 題跨單元全新選擇題（正確答案均勻分布於 B、D、C、A，絕不全是 A） ---------- */
    const MCQ_BANK = [
        {
            id: 'mcq-1',
            type: 'mcq',
            unit: 1,
            unitLabel: 'UNIT 01｜認識十三行',
            topic: '1-1 發現史與磁場異常',
            link: 'unit1.html#sub-1-1',
            linkText: '複習 1-1 發現史與地理環境',
            q: '1955 年空軍飛行員潘克永飛越觀音山與八里上空時，發現飛機羅盤出現異常偏轉；兩年後地質學家林朝棨前往調查，才揭開十三行遺址的序幕。當時造成羅盤磁場異常的真正原因是什麼？',
            opts: [
                '八里海岸線下有一座尚未噴發的海底活火山磁場',
                '地底下埋藏了大量史前時代留下的含鐵質鐵砂與煉鐵爐渣',
                '清代沈船在淡水河口遺留了數百門生鐵大砲',
                '外星隕石撞擊台北盆地邊緣所留下的高磁性隕石坑'
            ],
            ans: 1, // B
            exp: '飛行員原本以為地底下有天然大鐵礦，經地質學家林朝棨實地勘查後，發現地表與土層裡滿布史前人類煉鐵留下的「鐵渣（爐渣）」與鐵砂，進而確認這是一處鐵器時代考古遺址。'
        },
        {
            id: 'mcq-2',
            type: 'mcq',
            unit: 1,
            unitLabel: 'UNIT 01｜認識十三行',
            topic: '1-1 搶救考古與社會運動',
            link: 'unit1.html#sub-1-1',
            linkText: '複習 1-1 發現史與地理環境',
            q: '1988 至 1989 年間，十三行遺址因為與哪一項大型公共工程的選址重疊，引發台灣史上罕見的文化資產搶救運動，並促成後續大規模搶救發掘與博物館的誕生？',
            opts: [
                '台北港深水貨櫃碼頭工程',
                '淡水河口跨海大橋工程',
                '林口火力發電廠擴建工程',
                '八里汙水處理廠工程'
            ],
            ans: 3, // D
            exp: '1989 年因「八里汙水處理廠」預定地與遺址重疊，考古學者與社會大眾發起搶救運動，最終保留部分遺址並促成十三行博物館於 2003 年開館。'
        },
        {
            id: 'mcq-3',
            type: 'mcq',
            unit: 1,
            unitLabel: 'UNIT 01｜認識十三行',
            topic: '1-1 現代非破壞性探測',
            link: 'unit1.html#sub-1-1',
            linkText: '複習 1-1 考古學家的工具箱',
            q: '如果考古團隊想在「還沒有開挖破壞土層」的前提下，先透視地底下哪裡可能埋藏著石牆、灰坑或遺跡結構，最適合先使用下列哪一種工具？',
            opts: [
                '碳十四定年儀（測定有機物死亡年代）',
                '小毛刷與竹籤（清理脆弱人骨與陶片表面）',
                '地質雷達（GPR，利用電磁波反射描繪地下結構）',
                '高溫熱風槍（烘乾潮濕的土壤剖面）'
            ],
            ans: 2, // C
            exp: '地質雷達（GPR）就像幫大地照超音波，能在不開挖的情況下探測地下密度異常區域，協助考古學家決定探坑位置。'
        },
        {
            id: 'mcq-4',
            type: 'mcq',
            unit: 1,
            unitLabel: 'UNIT 01｜認識十三行',
            topic: '1-2 干欄式建築的考古證據',
            link: 'unit1.html#sub-1-2',
            linkText: '複習 1-2 干欄式建築與聚落',
            q: '木頭在台灣潮濕的土壤裡經過一千多年早已腐爛消失，考古學家究竟是靠什麼關鍵證據，推論出十三行人居住在木柱架高的「干欄式建築」？',
            opts: [
                '地層表面保留了超過 400 個土壤顏色較深、密度不同的圓形「柱洞」排列痕跡',
                '遺址中出土了一張刻在安山岩石板上的房屋立面設計圖',
                '在人面陶罐的肚子上畫著完整的干欄式房屋圖案',
                '清代地方志書裡詳細記載了十三行千年前的木屋尺寸'
            ],
            ans: 0, // A
            exp: '當木柱立在土裡腐朽後，會讓原本插柱子的洞口土壤顏色變深、質地與周圍不同，稱為「柱洞（Postholes）」。考古學家透過超過 400 個柱洞的排列規律，重建出架高木屋結構。'
        },
        {
            id: 'mcq-5',
            type: 'mcq',
            unit: 2,
            unitLabel: 'UNIT 02｜工藝與生活',
            topic: '2-1 製陶選土與摻砂科學',
            link: 'unit2.html#sub-2-1',
            linkText: '複習 2-1 製陶五步驟',
            q: '十三行工匠在製作炊煮用的陶器時，不會只用純黏土，而是會故意在黏土中混入一定比例的「細砂（羼合料）」並反覆揉土排氣。這麼做的科學原因為何？',
            opts: [
                '加入海砂可以讓煮出來的食物自帶鹹味，省去加鹽步驟',
                '細砂在 600°C 下會完全融化成透明玻璃，讓陶罐變成透明水壺',
                '砂粒能作為骨架減少乾燥與受熱收縮率，排氣泡則能防止入火燒製時氣體膨脹炸裂',
                '純粹是因為八里黏土太少，摻砂可以偷工減料增加重量'
            ],
            ans: 2, // C
            exp: '純黏土受熱收縮率大、容易開裂；摻入石英或安山岩細砂（羼合料）可支撐胎體並均勻傳熱，而揉土排出氣孔則能避免高溫燒製時空氣急速膨脹導致「炸窯」。'
        },
        {
            id: 'mcq-6',
            type: 'mcq',
            unit: 2,
            unitLabel: 'UNIT 02｜工藝與生活',
            topic: '2-1 露天燒陶與紅褐色成因',
            link: 'unit2.html#sub-2-1',
            linkText: '複習 2-1 燒陶溫度模擬器',
            q: '十三行文化最具代表性的陶器被稱為「紅褐色夾砂陶」。為什麼採用 600–900°C「露天堆燒」燒出來的陶器，表面大多呈現溫暖的紅褐色？',
            opts: [
                '工匠在出窯後統一塗上紅樹林樹皮熬煮的紅色染劑',
                '露天環境空氣流通、氧氣充足，使陶土中所含的鐵質充分氧化成紅褐色氧化鐵',
                '陶土裡混入了大量打碎的清代紅磚粉末',
                '因為使用紅檜木作為唯一燃料，煙燻出紅褐色澤'
            ],
            ans: 1, // B
            exp: '八里一帶的黏土富含鐵質，在空氣流通、氧氣充足的「氧化焰（露天堆燒）」環境下以 600–900°C 燒製，土中的鐵元素會氧化形成三氧化二鐵（Fe₂O₃），呈現磚紅或紅褐色。'
        },
        {
            id: 'mcq-7',
            type: 'mcq',
            unit: 2,
            unitLabel: 'UNIT 02｜工藝與生活',
            topic: '2-2 煉鐵化學與木炭角色',
            link: 'unit2.html#sub-2-2',
            linkText: '複習 2-2 煉鐵工坊與原理',
            q: '十三行工匠在半地下式煉鐵爐中，會將「木炭」與「鐵砂（磁鐵礦）」一層一層交錯疊放。在 1,100°C 以上的爐內，木炭除了燃燒提供高溫外，還扮演什麼關鍵角色？',
            opts: [
                '把鐵砂染成黑色，讓鍛打出來的鐵刀不容易生鏽',
                '吸收空氣中的水分，讓爐內保持絕對真空狀態',
                '直接融化成液態碳水，代替水來冷卻剛出爐的鐵塊',
                '產生一氧化碳等還原氣體，把鐵砂（氧化鐵）中的「氧」搶走，還原出金屬鐵'
            ],
            ans: 3, // D
            exp: '海邊黑沙中的磁鐵礦本質上是「鐵的氧化物」。木炭燃燒產生一氧化碳（CO），能在高溫下奪走鐵砂裡的氧原子，使氧化鐵「還原」為海綿鐵塊。'
        },
        {
            id: 'mcq-8',
            type: 'mcq',
            unit: 3,
            unitLabel: 'UNIT 03｜社會與傳承',
            topic: '3-1 考古地層疊壓律',
            link: 'unit3.html#sub-3-1',
            linkText: '複習 3-1 地層時間切片',
            q: '考古學家在十三行遺址挖開一個垂直探坑，由下而上依序看到：(底層) 自然沙丘層 → 十三行文化層 → 清代青花瓷層 → (頂層) 現代塑膠瓶蓋層。這印證了考古學的哪一項基本原理？',
            opts: [
                '重量沉降律：越重的文物會自己往地心下沉，所以鐵器一定在最底層',
                '地層疊壓律：在未受人為翻動或地質擾動的情況下，越下方的土層堆積年代越古老',
                '色彩分層律：土壤顏色越淺的代表年代越古老，顏色越深的代表越現代',
                '價值遞增律：越靠近地表的文物越值錢，越深層的越沒有研究價值'
            ],
            ans: 1, // B
            exp: '「地層疊壓律（Law of Superposition）」是考古學與地質學的核心法則：泥沙與人類遺留物會隨時間一層層往上覆蓋，因此越深層代表越早期的歷史切片。'
        },
        {
            id: 'mcq-9',
            type: 'mcq',
            unit: 3,
            unitLabel: 'UNIT 03｜社會與傳承',
            topic: '3-3 凱達格蘭族與地名記憶',
            link: 'unit3.html#sub-3-3',
            linkText: '複習 3-3 文化延續與凱達格蘭族',
            q: '今日大台北地區的「北投（Ki-pataw，意為女巫）」、「大龍峒」、「八里」等地名，都源自平埔族群凱達格蘭族的語言。學者將十三行文化晚期與凱達格蘭族連結起來，傳遞了什麼歷史觀點？',
            opts: [
                '十三行人早就發明了現代中文拼音，並幫台北捷運站取好名字',
                '所有史前文化只要滿一千年就會自動滅絕，與現代台灣人毫無關聯',
                '文化不會憑空消失，而是像河流一樣隨時代轉變，並融入後代人群的生活與地名記憶中',
                '凱達格蘭族是在清朝末年才從日本搭船移民到八里的外來民族'
            ],
            ans: 2, // C
            exp: '從年代銜接、地理重疊到生活型態，都顯示十三行文化並非「神祕滅絕」，而是逐漸轉化為歷史時期北台灣的凱達格蘭族，並透過地名與文化記憶延續至今。'
        },
        {
            id: 'mcq-10',
            type: 'mcq',
            unit: 3,
            unitLabel: 'UNIT 01–03｜跨單元綜合推理',
            topic: '跨單元考古上下文綜合判讀',
            link: 'unit3.html#sub-3-4',
            linkText: '複習 3-4 全程學習總回顧',
            q: '【跨單元綜合題】假設你在十三行遺址的一座「側身屈肢葬」墓穴中，同時發現墓主身旁陪葬了「精美拍印紋陶罐、東南亞色彩玻璃珠串、以及本地鍛打的鐵刀」。這組「考古上下文」最能綜合說明什麼？',
            opts: [
                '這位墓主一定是一位從東南亞偷渡來台的玻璃工匠，因為迷路而死在沙灘上',
                '十三行人只會跟外國人買東西，自己完全不會製作任何工具或容器',
                '這座墓穴是現代人偽造的，因為陶器、玻璃跟鐵器不可能出現在同一個時代',
                '這位墓主生前可能具較高社會地位，且當時聚落同時擁有成熟工藝、跨海貿易網絡與喪葬信仰'
            ],
            ans: 3, // D
            exp: '拍印紋陶罐與本地鐵刀展現了聚落自主的高超工藝（Unit 2），東南亞玻璃珠見證了活躍的海洋貿易網絡（Unit 2-3），而屈肢葬與豐富陪葬品則反映出社會階層與死後世界信仰（Unit 3-1）。'
        }
    ];

    /* ---------- 第二部分：5 道全新設計、少字直覺的視覺互動遊戲（不與前面單元重複） ---------- */
    const GAME_BANK = [
        {
            id: 'game-pot',
            type: 'game',
            gameKind: 'pot-puzzle',
            unit: 3,
            unitLabel: '互動遊戲 01｜文物拼圖修復檯',
            topic: '3-2 國寶人面陶罐三部位組裝',
            link: 'unit3.html#sub-3-2',
            linkText: '複習 3-2 鎮館之寶：人面陶罐',
            q: '【文物拼圖修復】請將左側 3 塊陶罐殘件，拖曳（或點選）放入右側修復架的「上、中、下」正確位置，拼出國寶人面陶罐！',
            pieces: [
                { id: 'belly', label: '菱形印紋圓腹', svg: ART.potBelly },
                { id: 'foot',  label: '外撇圈足底座', svg: ART.potFoot },
                { id: 'rim',   label: '口緣與人面頸', svg: ART.potRim }
            ],
            slots: [
                { id: 'top',    label: '⬆️ 上層部位', accept: 'rim' },
                { id: 'middle', label: '⏺️ 中層部位', accept: 'belly' },
                { id: 'bottom', label: '⬇️ 下層部位', accept: 'foot' }
            ],
            exp: '人面陶罐由上而下依序為：① 上層「口緣與浮塑人面頸」 → ② 中層「雙線菱形印紋圓鼓腹」 → ③ 下層「外撇圈足底座」（讓禮器能穩立於平面）。'
        },
        {
            id: 'game-radar',
            type: 'game',
            gameKind: 'radar-compass',
            unit: 1,
            unitLabel: '互動遊戲 02｜飛行員磁力探測',
            topic: '1-1 1955 羅盤異常航點與成因',
            link: 'unit1.html#sub-1-1',
            linkText: '複習 1-1 發現史與羅盤事件',
            q: '【磁力探測任務】① 點擊左側地圖上的 4 個航點，觀察右側羅盤指針在哪一處會「劇烈偏轉」並鎖定該點；② 點選造成磁場異常的地底物質！',
            points: [
                { id: 'A', name: 'A 觀音山頂', x: '26%', y: '72%', anomaly: false },
                { id: 'B', name: 'B 八里十三行', x: '62%', y: '58%', anomaly: true },
                { id: 'C', name: 'C 淡水河道', x: '74%', y: '26%', anomaly: false },
                { id: 'D', name: 'D 外海沙洲', x: '22%', y: '24%', anomaly: false }
            ],
            causes: [
                { id: 'wood',  icon: '🪵', name: '腐朽木柱' },
                { id: 'iron',  icon: '🧲', name: '鐵砂與爐渣' },
                { id: 'shell', icon: '🐚', name: '貝塚殼堆' }
            ],
            correctPoint: 'B',
            correctCause: 'iron',
            exp: '1955 年潘克永飛越「B 八里十三行」上空時羅盤劇烈偏轉，主因是地底埋藏大量具磁性的史前「🧲 鐵砂與煉鐵爐渣」。'
        },
        {
            id: 'game-pic',
            type: 'game',
            gameKind: 'pic-match',
            unit: 2,
            unitLabel: '互動遊戲 03｜圖片配圖片',
            topic: '2-1～3-2 微距放大鏡 × 文物本尊',
            link: 'unit2.html#sub-2-1',
            linkText: '複習單元二工藝與紋飾細節',
            q: '【圖片配圖片】請將上方 4 張「文物本尊圖卡」，拖曳（或點選）配對到下方對應的「放大鏡微距特徵圖」！',
            cards: [
                { id: 'bead',    name: '蜻蜓眼玻璃珠', svg: ART.itemBead },
                { id: 'pot',     name: '人面陶罐',     svg: ART.itemPot },
                { id: 'spindle', name: '穿孔陶紡輪',   svg: ART.itemSpindle },
                { id: 'slag',    name: '煉鐵爐渣',     svg: ART.itemSlag }
            ],
            slots: [
                { id: 'z1', label: '🔍 菱形與圈印紋', accept: 'pot',     svg: ART.zoomDiamond },
                { id: 'z2', label: '🔍 藍白同心圓眼', accept: 'bead',    svg: ART.zoomEyeBead },
                { id: 'z3', label: '🔍 黑褐多孔結晶', accept: 'slag',    svg: ART.zoomSlag },
                { id: 'z4', label: '🔍 穿孔放射刻紋', accept: 'spindle', svg: ART.zoomSpindle }
            ],
            exp: '菱形與圈印紋屬於「人面陶罐」；藍白同心圓眼屬於「蜻蜓眼玻璃珠」；黑褐多孔結晶為「煉鐵爐渣」；穿孔放射刻紋則是紡線用的「陶紡輪」。'
        },
        {
            id: 'game-ship',
            type: 'game',
            gameKind: 'ship-cargo',
            unit: 2,
            unitLabel: '互動遊戲 04｜貿易帆船裝載',
            topic: '2-3 挑出 3 件跨海貿易外來品',
            link: 'unit2.html#sub-2-3',
            linkText: '複習 2-3 海洋貿易與玻璃珠',
            q: '【貿易船進港：6 選 3】請直接點擊上方 6 件物品，挑出「3 件從海外貿易換來的外來品」裝上貿易帆船！（再點一下可卸貨）',
            items: [
                { id: 'rock',    name: '觀音山安山岩', svg: ART.cargoRock,    isImport: false },
                { id: 'bead',    name: '東南亞玻璃珠', svg: ART.cargoBead,    isImport: true },
                { id: 'shell',   name: '淡水河口血蚶', svg: ART.cargoShell,   isImport: false },
                { id: 'coin',    name: '唐宋開元通寶', svg: ART.cargoCoin,    isImport: true },
                { id: 'iron',    name: '本地煉鐵爐渣', svg: ART.cargoIron,    isImport: false },
                { id: 'celadon', name: '中國唐宋青瓷', svg: ART.cargoCeladon, isImport: true }
            ],
            exp: '「東南亞玻璃珠」、「唐宋開元通寶銅錢」與「中國唐宋青瓷碗」皆為十三行人透過海洋貿易網換來的外來珍品；安山岩、河口血蚶與煉鐵爐渣則是八里本地資源與產物。'
        },
        {
            id: 'game-house',
            type: 'game',
            gameKind: 'house-lab',
            unit: 1,
            unitLabel: '互動遊戲 05｜木屋構造調節器',
            topic: '1-2 干欄式建築防雨與防潮參數',
            link: 'unit1.html#sub-1-2',
            linkText: '複習 1-2 干欄式建築構造',
            q: '【木屋建造實驗】八里河口多雨且地面潮濕易淹水。請點選右側按鈕，將左側房屋調整為最符合十三行智慧的「屋頂斜角」與「木柱高度」！',
            roofOpts: [
                { id: 'flat',  label: '15° 平緩屋頂' },
                { id: 'steep', label: '50° 陡斜屋頂' },
                { id: 'spire', label: '85° 極尖高塔' }
            ],
            stiltOpts: [
                { id: 'ground', label: '0m 直接貼地' },
                { id: 'raised', label: '2m 木柱架高' },
                { id: 'tower',  label: '6m 懸空高台' }
            ],
            correctRoof: 'steep',
            correctStilt: 'raised',
            exp: '十三行干欄式建築採用「45°–60°（約 50°）陡斜茅草屋頂」讓雨水快速滑落不積水，並以「約 1.5–2.5m（2m）木柱架高」達成防潮、避洪、防蛇蟲與通風四大功能。'
        }
    ];

    /* ---------- 狀態管理 ---------- */
    const state = {
        modeSec: 600,
        shuffle: false,
        viewMode: 'single',
        questions: [],
        answers: {},
        pickedCard: null,       // { qIdx, cardId }
        flags: {},
        currentIndex: 0,
        isRunning: false,
        isSubmitted: false,
        startTimeMs: 0,
        remainSec: 600,
        spentSec: 0,
        timerId: null,
        reviewFilter: 'all'
    };

    /* ---------- DOM 參照 ---------- */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const dom = {
        prepSection: $('#quiz-intro'),
        arenaSection: $('#quiz-arena'),
        reportSection: $('#quiz-report'),
        bestScoreVal: $('#prepBestVal'),
        bestScoreSub: $('#prepBestSub'),
        modeBtns: $$('.quiz-mode-btn'),
        optShuffle: $('#optShuffle'),
        optAllView: $('#optAllView'),
        startBtn: $('#startExamBtn'),

        hud: $('#quizHud'),
        clock: $('#quizClock'),
        ringProgress: $('#quizRingProgress'),
        hudAnswered: $('#hudAnsweredCount'),
        hudFlagged: $('#hudFlaggedCount'),
        hudBarFill: $('#hudProgressBar'),
        modeToggleBtn: $('#modeToggleBtn'),
        submitExamBtn: $('#submitExamBtn'),

        paletteGrid: $('#quizPaletteGrid'),
        stage: $('#quizStage'),

        timeoutBanner: $('#timeoutBanner'),
        reportHero: $('#reportHeroCard'),
        reportScoreNum: $('#reportScoreNum'),
        reportRankBadge: $('#reportRankBadge'),
        reportHeroTitle: $('#reportHeroTitle'),
        reportHeroDesc: $('#reportHeroDesc'),
        metricCorrect: $('#metricCorrect'),
        metricAccuracy: $('#metricAccuracy'),
        metricTimeSpent: $('#metricTimeSpent'),
        metricModeName: $('#metricModeName'),
        passGrid: $('#reportPassGrid'),
        failCallout: $('#reportFailCallout'),
        failRetryBtn: $('#failRetryBtn'),
        reportUnits: $('#reportUnits'),
        filterBtns: $$('.report-filter-btn'),
        reviewList: $('#reportReviewList'),
        retryBtn: $('#retryExamBtn'),
        backPrepBtn: $('#backPrepBtn')
    };

    /* ---------- 工具函式 ---------- */
    function formatClock(sec) {
        const s = Math.max(0, Math.floor(sec));
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    }

    function formatDurationText(sec) {
        const s = Math.max(1, Math.floor(sec));
        const m = Math.floor(s / 60);
        const r = s % 60;
        if (m === 0) return `${r} 秒`;
        return `${m} 分 ${String(r).padStart(2, '0')} 秒`;
    }

    function getModeLabel(sec) {
        if (sec === 300) return '極速搶救考古（5 分鐘）';
        if (sec === 900) return '從容深思模式（15 分鐘）';
        return '標準田野考核（10 分鐘）';
    }

    function shuffleArray(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    /* 判斷某題是否已完成作答 */
    function isQuestionAnswered(qIdx) {
        const qObj = state.questions[qIdx];
        if (!qObj) return false;
        const ans = state.answers[qIdx];
        if (qObj.type === 'mcq') {
            return typeof ans === 'number';
        }
        if (!ans) return false;
        switch (qObj.gameKind) {
            case 'pot-puzzle':
            case 'pic-match':
                return qObj.slots.every((s) => Boolean(ans[s.id]));
            case 'radar-compass':
                return Boolean(ans.point && ans.cause);
            case 'ship-cargo':
                return Array.isArray(ans.selected) && ans.selected.length === 3;
            case 'house-lab':
                return Boolean(ans.roof && ans.stilt);
            default:
                return false;
        }
    }

    /* 判斷某題是否答對（僅於送出考卷後統一批改使用） */
    function isQuestionCorrect(qIdx) {
        const qObj = state.questions[qIdx];
        if (!qObj) return false;
        const ans = state.answers[qIdx];
        if (qObj.type === 'mcq') {
            return ans === qObj.ans;
        }
        if (!ans) return false;
        switch (qObj.gameKind) {
            case 'pot-puzzle':
            case 'pic-match':
                return qObj.slots.every((s) => ans[s.id] === s.accept);
            case 'radar-compass':
                return ans.point === qObj.correctPoint && ans.cause === qObj.correctCause;
            case 'ship-cargo': {
                if (!Array.isArray(ans.selected) || ans.selected.length !== 3) return false;
                const importIds = qObj.items.filter((i) => i.isImport).map((i) => i.id);
                return importIds.every((id) => ans.selected.includes(id));
            }
            case 'house-lab':
                return ans.roof === qObj.correctRoof && ans.stilt === qObj.correctStilt;
            default:
                return false;
        }
    }

    /* ---------- 讀取與更新最高紀錄 ---------- */
    function loadBestRecord() {
        try {
            const raw = localStorage.getItem('shihsanhang.quiz.best');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && typeof data.score === 'number') {
                const passTag = data.passed ? '（已通過✓）' : '（未達門檻）';
                if (dom.bestScoreVal) dom.bestScoreVal.textContent = `${data.score} 分 ${passTag}`;
                if (dom.bestScoreSub) {
                    const mcqStr = typeof data.mcqCorrect === 'number' ? `選擇 ${data.mcqCorrect}/10` : '';
                    const gameStr = typeof data.gameCorrect === 'number' ? `・互動 ${data.gameCorrect}/5` : '';
                    const timeStr = data.spentSec ? `・${formatDurationText(data.spentSec)}` : '';
                    dom.bestScoreSub.textContent = `${mcqStr}${gameStr}${timeStr}` || '歷史最高分紀錄';
                }
            }
        } catch (err) {
            console.warn('無法讀取總測驗最高紀錄', err);
        }
    }

    function saveBestRecord(score, mcqCorrect, gameCorrect, passed, spentSec) {
        try {
            if (passed) {
                localStorage.setItem('shihsanhang.progress.quiz', '1');
            }
            const prevRaw = localStorage.getItem('shihsanhang.quiz.best');
            let prev = null;
            if (prevRaw) {
                try { prev = JSON.parse(prevRaw); } catch (_) { prev = null; }
            }
            const isBetter = !prev
                || (passed && !prev.passed)
                || (passed === Boolean(prev.passed) && score > prev.score)
                || (passed === Boolean(prev.passed) && score === prev.score && spentSec < (prev.spentSec || 99999));

            if (isBetter) {
                localStorage.setItem('shihsanhang.quiz.best', JSON.stringify({
                    score,
                    correct: mcqCorrect + gameCorrect,
                    mcqCorrect,
                    gameCorrect,
                    passed,
                    spentSec,
                    updatedAt: new Date().toISOString()
                }));
            }
            loadBestRecord();
            updateOverallSidebarProgress(state.questions.length);
        } catch (err) {
            console.warn('無法儲存總測驗紀錄', err);
        }
    }

    function updateOverallSidebarProgress(answeredCount) {
        const total = state.questions.length || 15;
        const pct = Math.min(100, Math.round((answeredCount / total) * 100));
        const pctEl = $('.progress-percent');
        const barEl = $('.progress-bar span');
        const readBar = $('#headerProgressBar');
        const locProg = $('#locatorProgress');
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (barEl) barEl.style.width = `${pct}%`;
        if (readBar) readBar.style.width = `${pct}%`;
        if (locProg) locProg.textContent = `作答進度 ${pct}%`;
    }

    /* ---------- 倒數計時引擎 ---------- */
    function startTimer() {
        stopTimer();
        state.startTimeMs = Date.now();
        state.remainSec = state.modeSec;
        updateTimerHUD();

        state.timerId = window.setInterval(() => {
            if (!state.isRunning) return;
            const elapsedSec = Math.floor((Date.now() - state.startTimeMs) / 1000);
            state.spentSec = Math.min(state.modeSec, elapsedSec);
            state.remainSec = Math.max(0, state.modeSec - elapsedSec);
            updateTimerHUD();

            if (state.remainSec <= 0) {
                stopTimer();
                submitExam(true);
            }
        }, 250);
    }

    function stopTimer() {
        if (state.timerId) {
            window.clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    function updateTimerHUD() {
        if (dom.clock) {
            dom.clock.textContent = formatClock(state.remainSec);
        }
        if (dom.ringProgress) {
            const ratio = Math.max(0, Math.min(1, state.remainSec / state.modeSec));
            const offset = RING_CIRCUMFERENCE * (1 - ratio);
            dom.ringProgress.style.strokeDashoffset = offset.toFixed(2);
        }
        if (dom.hud) {
            const warnThreshold = Math.min(150, Math.round(state.modeSec * 0.25));
            dom.hud.classList.toggle('is-warning', state.remainSec <= warnThreshold && state.remainSec > 60);
            dom.hud.classList.toggle('is-critical', state.remainSec <= 60);
        }
    }

    /* ---------- 開始測驗 ---------- */
    function startExam() {
        state.shuffle = Boolean(dom.optShuffle && dom.optShuffle.checked);
        state.viewMode = (dom.optAllView && dom.optAllView.checked) ? 'all' : 'single';

        // 複製題庫；若勾選隨機洗牌，連同選擇題的 A/B/C/D 選項順序一起隨機打亂！
        let mcqs = MCQ_BANK.map((q) => {
            if (!state.shuffle) return { ...q, opts: q.opts.slice() };
            const indexed = q.opts.map((text, idx) => ({ text, isAns: idx === q.ans }));
            const shuffledOpts = shuffleArray(indexed);
            return {
                ...q,
                opts: shuffledOpts.map((o) => o.text),
                ans: shuffledOpts.findIndex((o) => o.isAns)
            };
        });
        if (state.shuffle) mcqs = shuffleArray(mcqs);

        const games = state.shuffle ? shuffleArray(GAME_BANK) : GAME_BANK.slice();
        state.questions = [...mcqs, ...games];

        state.answers = {};
        state.pickedCard = null;
        state.flags = {};
        state.currentIndex = 0;
        state.isRunning = true;
        state.isSubmitted = false;
        state.spentSec = 0;

        // 初始化 5 道互動題的空白作答狀態
        state.questions.forEach((qObj, idx) => {
            if (qObj.type === 'game') {
                if (qObj.gameKind === 'ship-cargo') {
                    state.answers[idx] = { selected: [] };
                } else {
                    state.answers[idx] = {};
                }
            }
        });

        if (dom.prepSection) dom.prepSection.hidden = true;
        if (dom.reportSection) dom.reportSection.hidden = true;
        if (dom.arenaSection) dom.arenaSection.hidden = false;

        updateModeToggleText();
        renderPalette();
        renderStage();
        updateHUDStats();
        startTimer();

        if (dom.arenaSection) {
            dom.arenaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function updateModeToggleText() {
        if (!dom.modeToggleBtn) return;
        dom.modeToggleBtn.textContent = state.viewMode === 'single'
            ? '📑 切換全卷總覽（15 題）'
            : '🎯 切換單題專注模式';
    }

    /* ---------- 渲染題號導覽盤 (1-15 Palette) ---------- */
    function renderPalette() {
        if (!dom.paletteGrid) return;
        dom.paletteGrid.innerHTML = state.questions.map((qObj, idx) => {
            const isAnswered = isQuestionAnswered(idx);
            const isCurrent = state.viewMode === 'single' && idx === state.currentIndex;
            const isFlagged = Boolean(state.flags[idx]);
            const isGame = qObj.type === 'game';
            const cls = [
                'quiz-pal-btn',
                isGame ? 'quiz-pal-btn--game' : '',
                isAnswered ? 'is-answered' : '',
                isCurrent ? 'is-current' : '',
                isFlagged ? 'is-flagged' : ''
            ].filter(Boolean).join(' ');
            const labelPrefix = isGame ? '🎮' : '';
            return `<button type="button" class="${cls}" data-q-idx="${idx}" title="${isGame ? '互動遊戲題' : '單選題'} 第 ${idx + 1} 題">${labelPrefix}${idx + 1}</button>`;
        }).join('');
    }

    function updateHUDStats() {
        let mcqDone = 0;
        let gameDone = 0;
        state.questions.forEach((qObj, idx) => {
            if (isQuestionAnswered(idx)) {
                if (qObj.type === 'mcq') mcqDone++;
                else gameDone++;
            }
        });
        const totalDone = mcqDone + gameDone;
        const flaggedCount = Object.keys(state.flags).filter((k) => state.flags[k]).length;
        const pct = Math.round((totalDone / state.questions.length) * 100);

        if (dom.hudAnswered) {
            dom.hudAnswered.textContent = `已完成 ${totalDone}/15 題（選擇 ${mcqDone}/10・互動 ${gameDone}/5）`;
        }
        if (dom.hudFlagged) dom.hudFlagged.textContent = `🚩 標記 ${flaggedCount} 題`;
        if (dom.hudBarFill) dom.hudBarFill.style.width = `${pct}%`;

        updateOverallSidebarProgress(totalDone);
    }

    /* ---------- 渲染題目舞台 ---------- */
    function buildFooterNavHTML(idx) {
        if (state.viewMode !== 'single') return '';
        return `
            <div class="exam-card__nav">
                <button type="button" class="exam-nav-btn" data-nav="prev" ${idx === 0 ? 'disabled' : ''}>
                    ← 上一題
                </button>
                <span style="font-size:13px; color:var(--c-text-mute);">
                    送出考卷後統一揭曉對錯與詳解
                </span>
                ${idx < state.questions.length - 1
                    ? `<button type="button" class="exam-nav-btn exam-nav-btn--primary" data-nav="next">下一題 →</button>`
                    : `<button type="button" class="exam-nav-btn exam-nav-btn--primary" data-nav="submit">送出考卷並批改 ✓</button>`
                }
            </div>
        `;
    }

    function buildMCQCardHTML(qObj, idx) {
        const chosen = state.answers[idx];
        const flagged = Boolean(state.flags[idx]);
        const letters = ['A', 'B', 'C', 'D'];
        const total = state.questions.length;

        const optsHTML = qObj.opts.map((optText, optIdx) => {
            const isSel = chosen === optIdx;
            return `
                <button type="button" class="exam-opt ${isSel ? 'is-selected' : ''}" data-q-idx="${idx}" data-opt-idx="${optIdx}">
                    <span class="exam-opt__letter">${letters[optIdx]}</span>
                    <span class="exam-opt__text">${optText}</span>
                    <span class="exam-opt__check" aria-hidden="true">${isSel ? '✓' : ''}</span>
                </button>
            `;
        }).join('');

        return `
            <article class="exam-card" id="exam-q-${idx}" data-unit="${qObj.unit}">
                <div class="exam-card__head">
                    <div class="exam-card__badges">
                        <span class="exam-card__no">Q${String(idx + 1).padStart(2, '0')} / ${total}</span>
                        <span class="exam-card__type-badge exam-card__type-badge--mcq">📝 綜合選擇題（6 分）</span>
                        <span class="exam-card__unit">${qObj.unitLabel}</span>
                    </div>
                    <button type="button" class="exam-card__flag ${flagged ? 'is-flagged' : ''}" data-flag-idx="${idx}">
                        🚩 ${flagged ? '已標記' : '標記待查'}
                    </button>
                </div>
                <h3 class="exam-card__q">${qObj.q}</h3>
                <div class="exam-card__opts" role="radiogroup" aria-label="第 ${idx + 1} 題選項">
                    ${optsHTML}
                </div>
                ${buildFooterNavHTML(idx)}
            </article>
        `;
    }

    /* --- 5 種極簡視覺互動小遊戲 HTML 建構器 --- */
    function buildPotPuzzleBody(qObj, idx) {
        const ans = state.answers[idx] || {};
        const placedIds = new Set(Object.values(ans));

        const piecesHTML = qObj.pieces.map((p) => {
            const isPlaced = placedIds.has(p.id);
            const isPicked = state.pickedCard && state.pickedCard.qIdx === idx && state.pickedCard.cardId === p.id;
            return `
                <div class="mg-piece ${isPlaced ? 'is-placed' : ''} ${isPicked ? 'is-picked' : ''}"
                     draggable="true"
                     data-drag-card="${p.id}"
                     data-q-idx="${idx}">
                    <div class="mg-piece__svg">${p.svg}</div>
                    <span class="mg-piece__label">${p.label}</span>
                </div>
            `;
        }).join('');

        const slotsHTML = qObj.slots.map((s) => {
            const pid = ans[s.id];
            const piece = pid ? qObj.pieces.find((p) => p.id === pid) : null;
            return `
                <div class="mg-pot-slot ${piece ? 'is-filled' : ''}"
                     data-drop-slot="${s.id}"
                     data-q-idx="${idx}">
                    ${piece ? `
                        <div class="mg-piece__svg" style="background:transparent;">${piece.svg}</div>
                        <span class="mg-piece__label" style="font-size:14px;">${piece.label}</span>
                        <button type="button" class="mg-slot-clear" data-clear-slot="${s.id}" data-q-idx="${idx}">×</button>
                    ` : `<span class="mg-pot-slot__hint">${s.label}（拖曳或點擊放入）</span>`}
                </div>
            `;
        }).join('');

        return `
            <div class="mg-board">
                <div class="mg-pot-layout">
                    <div class="mg-pot-pieces">${piecesHTML}</div>
                    <div class="mg-pot-frame">
                        <span style="font-size:12px; font-weight:700; color:var(--c-earth);">🏺 人面陶罐拼圖架</span>
                        ${slotsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    function buildRadarCompassBody(qObj, idx) {
        const ans = state.answers[idx] || {};
        const activePt = qObj.points.find((p) => p.id === ans.point);
        const isAnomaly = Boolean(activePt && activePt.anomaly);

        const ptsHTML = qObj.points.map((pt) => {
            const isAct = ans.point === pt.id;
            return `
                <button type="button"
                        class="mg-radar-pt ${isAct ? 'is-active' : ''}"
                        style="left:${pt.x}; top:${pt.y};"
                        data-radar-pt="${pt.id}"
                        data-q-idx="${idx}">
                    ✈️ ${pt.name}
                </button>
            `;
        }).join('');

        const causesHTML = qObj.causes.map((c) => {
            const isSel = ans.cause === c.id;
            return `
                <button type="button"
                        class="mg-cause-btn ${isSel ? 'is-selected' : ''}"
                        data-radar-cause="${c.id}"
                        data-q-idx="${idx}">
                    <span>${c.icon}</span>
                    <b>${c.name}</b>
                </button>
            `;
        }).join('');

        return `
            <div class="mg-board">
                <div class="mg-radar-layout">
                    <div class="mg-radar-map">
                        <svg class="mg-radar-bg" viewBox="0 0 360 220" preserveAspectRatio="none">
                            <rect width="360" height="220" fill="#A8D5EE"/>
                            <path d="M90 0 Q150 90 360 85 L360 220 L110 220 Q125 130 90 0 Z" fill="#DDE8C8"/>
                            <path d="M180 0 Q220 75 360 65 L360 105 Q210 110 140 0 Z" fill="#5BA4CF"/>
                            <polygon points="45,185 95,115 150,185" fill="#6A996F"/>
                            <circle cx="220" cy="128" r="24" fill="none" stroke="#C46D3B" stroke-width="2" stroke-dasharray="4 3"/>
                        </svg>
                        ${ptsHTML}
                    </div>
                    <div class="mg-radar-panel">
                        <div class="mg-compass-box">
                            <div class="mg-compass-dial">
                                <svg class="mg-compass-needle ${isAnomaly ? 'is-anomaly' : ''}" viewBox="0 0 36 36">
                                    <polygon points="18,3 23,18 18,15 13,18" fill="#FF5252"/>
                                    <polygon points="18,33 23,18 18,21 13,18" fill="#ECEFF1"/>
                                    <circle cx="18" cy="18" r="2.5" fill="#FFD86E"/>
                                </svg>
                            </div>
                            <div>
                                <div style="font-size:11.5px; color:#FFD86E; font-weight:700;">AIRCRAFT COMPASS</div>
                                <strong style="font-size:15px;">
                                    ${!activePt ? '請先點擊左側航點探測' : (isAnomaly ? '⚠️ 羅盤劇烈偏轉異常！' : '指針穩定（無磁場異常）')}
                                </strong>
                            </div>
                        </div>

                        <div>
                            <div style="font-size:13px; font-weight:700; color:var(--c-indigo); margin-bottom:8px;">
                                ② 點選地底干擾羅盤的物質：
                            </div>
                            <div class="mg-cause-grid">${causesHTML}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildPicMatchBody(qObj, idx) {
        const ans = state.answers[idx] || {};
        const placedIds = new Set(Object.values(ans));

        const cardsHTML = qObj.cards.map((c) => {
            const isPlaced = placedIds.has(c.id);
            const isPicked = state.pickedCard && state.pickedCard.qIdx === idx && state.pickedCard.cardId === c.id;
            return `
                <div class="mg-pic-card ${isPlaced ? 'is-placed' : ''} ${isPicked ? 'is-picked' : ''}"
                     draggable="true"
                     data-drag-card="${c.id}"
                     data-q-idx="${idx}">
                    <div class="mg-pic-card__art">${c.svg}</div>
                    <strong class="mg-pic-card__name">${c.name}</strong>
                </div>
            `;
        }).join('');

        const slotsHTML = qObj.slots.map((s) => {
            const cid = ans[s.id];
            const card = cid ? qObj.cards.find((c) => c.id === cid) : null;
            return `
                <div class="mg-pic-slot ${card ? 'is-filled' : ''}"
                     data-drop-slot="${s.id}"
                     data-q-idx="${idx}">
                    ${card ? `<button type="button" class="mg-slot-clear" data-clear-slot="${s.id}" data-q-idx="${idx}">×</button>` : ''}
                    <div class="mg-pic-slot__target">${s.svg}</div>
                    <span class="mg-pic-slot__label">${s.label}</span>
                    <div class="mg-pic-slot__box">
                        ${card ? `✓ ${card.name}` : '點擊或拖入'}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="mg-board">
                <div class="mg-pic-tray">${cardsHTML}</div>
                <div class="mg-pic-slots">${slotsHTML}</div>
            </div>
        `;
    }

    function buildShipCargoBody(qObj, idx) {
        const ans = state.answers[idx] || { selected: [] };
        const selected = Array.isArray(ans.selected) ? ans.selected : [];

        const itemsHTML = qObj.items.map((item) => {
            const isLoaded = selected.includes(item.id);
            return `
                <button type="button"
                        class="mg-ship-item ${isLoaded ? 'is-loaded' : ''}"
                        data-ship-item="${item.id}"
                        data-q-idx="${idx}">
                    <div class="mg-ship-item__svg">${item.svg}</div>
                    <span class="mg-ship-item__name">${item.name}</span>
                </button>
            `;
        }).join('');

        const slotsHTML = [0, 1, 2].map((slotIdx) => {
            const itemId = selected[slotIdx];
            const item = itemId ? qObj.items.find((i) => i.id === itemId) : null;
            return `
                <div class="mg-cargo-box ${item ? 'is-filled' : ''}">
                    ${item ? `<span>✓ ${item.name}</span>` : `<span style="color:var(--c-text-mute);">船艙 ${slotIdx + 1}</span>`}
                </div>
            `;
        }).join('');

        return `
            <div class="mg-board">
                <div class="mg-ship-items">${itemsHTML}</div>
                <div class="mg-ship-deck">
                    <div class="mg-ship-deck__title">
                        <span style="font-size:28px;">⛵</span>
                        <div>
                            <div>海外貿易帆船艙位（已裝載 ${selected.length} / 3 件）</div>
                            <span style="font-size:12px; color:var(--c-text-soft); font-family:var(--f-sans);">點擊上方物品即可裝船或卸貨</span>
                        </div>
                    </div>
                    <div class="mg-ship-CargoSlots">${slotsHTML}</div>
                </div>
            </div>
        `;
    }

    function buildHouseLabBody(qObj, idx) {
        const ans = state.answers[idx] || {};
        const roof = ans.roof || 'flat';
        const stilt = ans.stilt || 'ground';

        // 根據選取的屋頂斜角與木柱高度動態計算 SVG 座標
        const floorY = stilt === 'ground' ? 148 : (stilt === 'raised' ? 112 : 76);
        const bodyTopY = floorY - 26;
        const peakY = roof === 'flat' ? bodyTopY - 16 : (roof === 'steep' ? bodyTopY - 48 : bodyTopY - 72);

        const roofBtns = qObj.roofOpts.map((r) => `
            <button type="button"
                    class="mg-ctrl-btn ${ans.roof === r.id ? 'is-active' : ''}"
                    data-house-roof="${r.id}"
                    data-q-idx="${idx}">${r.label}</button>
        `).join('');

        const stiltBtns = qObj.stiltOpts.map((s) => `
            <button type="button"
                    class="mg-ctrl-btn ${ans.stilt === s.id ? 'is-active' : ''}"
                    data-house-stilt="${s.id}"
                    data-q-idx="${idx}">${s.label}</button>
        `).join('');

        return `
            <div class="mg-board">
                <div class="mg-house-layout">
                    <div class="mg-house-stage">
                        <svg viewBox="0 0 260 180">
                            <!-- 雨滴裝飾 -->
                            <g stroke="#5BA4CF" stroke-width="1.8" stroke-linecap="round" opacity="0.6">
                                <line x1="40" y1="15" x2="34" y2="28"/><line x1="90" y1="10" x2="84" y2="23"/>
                                <line x1="180" y1="14" x2="174" y2="27"/><line x1="225" y1="18" x2="219" y2="31"/>
                            </g>
                            <!-- 地表線 -->
                            <line x1="15" y1="152" x2="245" y2="152" stroke="#6E4E23" stroke-width="3"/>
                            <!-- 木柱 -->
                            <line x1="78" y1="${floorY}" x2="78" y2="152" stroke="#5C3A1E" stroke-width="6"/>
                            <line x1="130" y1="${floorY}" x2="130" y2="152" stroke="#5C3A1E" stroke-width="6"/>
                            <line x1="182" y1="${floorY}" x2="182" y2="152" stroke="#5C3A1E" stroke-width="6"/>
                            <!-- 屋身 -->
                            <rect x="66" y="${bodyTopY}" width="128" height="26" rx="3" fill="#A47148" stroke="#5C3A1E" stroke-width="2.2"/>
                            <!-- 茅草屋頂 -->
                            <polygon points="50,${bodyTopY} 130,${peakY} 210,${bodyTopY}" fill="#D4A359" stroke="#6E4E23" stroke-width="2.5" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="mg-house-controls">
                        <div class="mg-ctrl-group">
                            <span class="mg-ctrl-group__label">① 選擇「茅草屋頂斜角」（排水考量）：</span>
                            <div class="mg-ctrl-btns">${roofBtns}</div>
                        </div>
                        <div class="mg-ctrl-group">
                            <span class="mg-ctrl-group__label">② 選擇「木柱架高距離」（防潮防洪）：</span>
                            <div class="mg-ctrl-btns">${stiltBtns}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildGameCardHTML(qObj, idx) {
        const flagged = Boolean(state.flags[idx]);
        const total = state.questions.length;
        const done = isQuestionAnswered(idx);

        let gameBodyHTML = '';
        if (qObj.gameKind === 'pot-puzzle') gameBodyHTML = buildPotPuzzleBody(qObj, idx);
        else if (qObj.gameKind === 'radar-compass') gameBodyHTML = buildRadarCompassBody(qObj, idx);
        else if (qObj.gameKind === 'pic-match') gameBodyHTML = buildPicMatchBody(qObj, idx);
        else if (qObj.gameKind === 'ship-cargo') gameBodyHTML = buildShipCargoBody(qObj, idx);
        else if (qObj.gameKind === 'house-lab') gameBodyHTML = buildHouseLabBody(qObj, idx);

        return `
            <article class="exam-card exam-card--game" id="exam-q-${idx}" data-unit="${qObj.unit}">
                <div class="exam-card__head">
                    <div class="exam-card__badges">
                        <span class="exam-card__no">Q${String(idx + 1).padStart(2, '0')} / ${total}</span>
                        <span class="exam-card__type-badge exam-card__type-badge--game">🎮 ${qObj.unitLabel}（8 分）</span>
                        <span class="exam-card__topic">${done ? '✓ 已完成操作' : '尚未完成'}</span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button type="button" class="igame-reset-btn" data-reset-game="${idx}">↺ 重置</button>
                        <button type="button" class="exam-card__flag ${flagged ? 'is-flagged' : ''}" data-flag-idx="${idx}">
                            🚩 ${flagged ? '已標記' : '標記'}
                        </button>
                    </div>
                </div>

                <h3 class="exam-card__q">${qObj.q}</h3>
                ${gameBodyHTML}
                ${buildFooterNavHTML(idx)}
            </article>
        `;
    }

    function buildQuestionCardHTML(qObj, idx) {
        return qObj.type === 'game' ? buildGameCardHTML(qObj, idx) : buildMCQCardHTML(qObj, idx);
    }

    function renderStage() {
        if (!dom.stage) return;
        if (state.viewMode === 'single') {
            const qObj = state.questions[state.currentIndex];
            dom.stage.innerHTML = buildQuestionCardHTML(qObj, state.currentIndex);
        } else {
            dom.stage.innerHTML = state.questions
                .map((qObj, idx) => buildQuestionCardHTML(qObj, idx))
                .join('');
        }
    }

    function rerenderSingleCard(qIdx) {
        renderPalette();
        updateHUDStats();
        if (state.viewMode === 'single' && qIdx === state.currentIndex) {
            renderStage();
            return;
        }
        const existing = $(`#exam-q-${qIdx}`);
        if (existing) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = buildQuestionCardHTML(state.questions[qIdx], qIdx).trim();
            const newCard = wrapper.firstElementChild;
            if (newCard) existing.replaceWith(newCard);
        }
    }

    /* ---------- 互動操作處理 ---------- */
    function selectMCQAnswer(qIdx, optIdx) {
        if (!state.isRunning || state.isSubmitted) return;
        const qObj = state.questions[qIdx];
        if (!qObj || qObj.type !== 'mcq') return;

        state.answers[qIdx] = optIdx;
        renderPalette();
        updateHUDStats();

        const card = $(`#exam-q-${qIdx}`);
        if (card) {
            card.querySelectorAll('.exam-opt').forEach((btn, idx) => {
                const isSel = idx === optIdx;
                btn.classList.toggle('is-selected', isSel);
                const chk = btn.querySelector('.exam-opt__check');
                if (chk) chk.textContent = isSel ? '✓' : '';
            });
        }
    }

    function assignCardToSlot(qIdx, slotId, cardId) {
        if (!state.isRunning || state.isSubmitted) return;
        const map = state.answers[qIdx] || (state.answers[qIdx] = {});
        const prevSlot = Object.keys(map).find((k) => map[k] === cardId);
        const targetOld = map[slotId];

        if (prevSlot && prevSlot !== slotId) {
            if (targetOld) map[prevSlot] = targetOld;
            else delete map[prevSlot];
        }
        map[slotId] = cardId;
        state.pickedCard = null;
        rerenderSingleCard(qIdx);
    }

    function toggleFlag(qIdx) {
        if (!state.isRunning || state.isSubmitted) return;
        state.flags[qIdx] = !state.flags[qIdx];
        rerenderSingleCard(qIdx);
    }

    function goToQuestion(idx) {
        if (idx < 0 || idx >= state.questions.length) return;
        state.currentIndex = idx;
        state.pickedCard = null;
        renderPalette();
        if (state.viewMode === 'single') {
            renderStage();
        } else {
            const target = $(`#exam-q-${idx}`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /* ---------- 交卷、雙門檻檢核與成績診斷報告 ---------- */
    function requestSubmitExam() {
        if (!state.isRunning || state.isSubmitted) return;
        const unansweredIndices = [];
        state.questions.forEach((_, idx) => {
            if (!isQuestionAnswered(idx)) unansweredIndices.push(idx);
        });

        if (unansweredIndices.length > 0) {
            const firstMissingIdx = unansweredIndices[0];
            const ok = window.confirm(
                `您還有 ${unansweredIndices.length} 題尚未完成作答（例如第 ${firstMissingIdx + 1} 題）。\n提醒您：需「選擇題答對至少 6 題」且「互動題答對至少 3 題」才算通過！\n確定要現在送出考卷嗎？`
            );
            if (!ok) {
                goToQuestion(firstMissingIdx);
                return;
            }
        }
        submitExam(false);
    }

    function submitExam(isTimeout = false) {
        if (state.isSubmitted) return;
        stopTimer();
        state.isRunning = false;
        state.isSubmitted = true;

        const elapsedSec = Math.max(1, Math.min(state.modeSec, Math.floor((Date.now() - state.startTimeMs) / 1000)));
        state.spentSec = isTimeout ? state.modeSec : elapsedSec;

        let mcqCorrect = 0;
        let gameCorrect = 0;

        const unitStats = {
            1: { name: '單元一｜認識十三行', total: 0, correct: 0, link: 'unit1.html' },
            2: { name: '單元二｜工藝與生活', total: 0, correct: 0, link: 'unit2.html' },
            3: { name: '單元三｜社會與傳承', total: 0, correct: 0, link: 'unit3.html' }
        };

        state.questions.forEach((qObj, idx) => {
            const isOk = isQuestionCorrect(idx);
            if (qObj.type === 'mcq') {
                if (isOk) mcqCorrect++;
            } else {
                if (isOk) gameCorrect++;
            }
            if (unitStats[qObj.unit]) {
                unitStats[qObj.unit].total++;
                if (isOk) unitStats[qObj.unit].correct++;
            }
        });

        const score = (mcqCorrect * 6) + (gameCorrect * 8);
        const mcqPassed = mcqCorrect >= PASS_MCQ_MIN;
        const gamePassed = gameCorrect >= PASS_GAME_MIN;
        const isPassed = mcqPassed && gamePassed;

        saveBestRecord(score, mcqCorrect, gameCorrect, isPassed, state.spentSec);

        if (dom.arenaSection) dom.arenaSection.hidden = true;
        if (dom.reportSection) dom.reportSection.hidden = false;
        if (dom.timeoutBanner) dom.timeoutBanner.hidden = !isTimeout;
        if (dom.reportHero) dom.reportHero.classList.toggle('is-failed-hero', !isPassed);

        let rank = '';
        let title = '';
        let desc = '';

        if (isPassed) {
            if (score >= 92) {
                rank = '🎉 考核通過｜🏆 榮譽考古院士・十三行守護者';
                title = '太神啦！選擇題與互動遊戲雙雙高分通過！';
                desc = '你同時通過了「選擇題 ≥ 6 題」與「互動題 ≥ 3 題」雙重門檻，無論是人面陶罐拼圖、羅盤探測、圖片配對或貿易船裝載都難不倒你！';
            } else {
                rank = '🎉 考核通過｜🥇 合格田野考古隊員';
                title = '恭喜通過十三行終極總測驗！';
                desc = `你已達成「選擇題答對 ${mcqCorrect}/10 題（門檻 6 題）」與「互動遊戲題答對 ${gameCorrect}/5 題（門檻 3 題）」的通過標準！`;
            }
        } else {
            rank = '⚠️ 尚未通過考核｜請完成錯題檢討後再次挑戰';
            title = '差一點點！尚未達成雙門檻通過標準';
            const reasons = [];
            if (!mcqPassed) reasons.push(`選擇題僅答對 ${mcqCorrect}/10 題（需至少 ${PASS_MCQ_MIN} 題）`);
            if (!gamePassed) reasons.push(`互動遊戲題僅答對 ${gameCorrect}/5 題（需至少 ${PASS_GAME_MIN} 題）`);
            desc = `未通過原因：${reasons.join('、')}。系統已為您在下方展開「錯題檢討專區」，請對照您的作答與正確答案後，點擊「再次作答」重新挑戰！`;
        }

        if (dom.reportRankBadge) dom.reportRankBadge.textContent = rank;
        if (dom.reportHeroTitle) dom.reportHeroTitle.textContent = title;
        if (dom.reportHeroDesc) dom.reportHeroDesc.textContent = desc;
        if (dom.metricCorrect) dom.metricCorrect.textContent = `選擇 ${mcqCorrect}/10・互動 ${gameCorrect}/5`;
        if (dom.metricAccuracy) dom.metricAccuracy.textContent = isPassed ? '✓ 通過' : '✗ 未通過';
        if (dom.metricTimeSpent) dom.metricTimeSpent.textContent = formatDurationText(state.spentSec);
        if (dom.metricModeName) dom.metricModeName.textContent = getModeLabel(state.modeSec);

        if (dom.passGrid) {
            dom.passGrid.innerHTML = `
                <div class="report-threshold-card ${mcqPassed ? 'is-pass' : 'is-fail'}">
                    <div>
                        <h3 class="report-threshold-card__title">📝 門檻一：綜合選擇題（共 10 題）</h3>
                        <p class="report-threshold-card__rule">通過條件：至少需答對 <b>${PASS_MCQ_MIN} 題</b>（每題 6 分）</p>
                    </div>
                    <span class="report-threshold-card__badge">
                        答對 ${mcqCorrect} / 10 題（${mcqPassed ? '✓ 達標' : '✗ 未達標'}）
                    </span>
                </div>
                <div class="report-threshold-card ${gamePassed ? 'is-pass' : 'is-fail'}">
                    <div>
                        <h3 class="report-threshold-card__title">🎮 門檻二：視覺互動遊戲題（共 5 題）</h3>
                        <p class="report-threshold-card__rule">通過條件：至少需完成並答對 <b>${PASS_GAME_MIN} 題</b>（每題 8 分）</p>
                    </div>
                    <span class="report-threshold-card__badge">
                        答對 ${gameCorrect} / 5 題（${gamePassed ? '✓ 達標' : '✗ 未達標'}）
                    </span>
                </div>
            `;
        }

        if (dom.failCallout) {
            dom.failCallout.hidden = isPassed;
        }

        animateScoreCounter(score);
        renderUnitBreakdown(unitStats);

        state.reviewFilter = isPassed ? 'all' : 'wrong';
        dom.filterBtns.forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.filter === state.reviewFilter);
        });
        renderReviewList();

        if (isPassed) {
            launchConfetti();
        }

        if (dom.reportSection) {
            dom.reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function animateScoreCounter(targetScore) {
        if (!dom.reportScoreNum) return;
        const duration = 900;
        const start = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            dom.reportScoreNum.textContent = String(Math.round(targetScore * eased));
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    function renderUnitBreakdown(unitStats) {
        if (!dom.reportUnits) return;
        dom.reportUnits.innerHTML = [1, 2, 3].map((u) => {
            const st = unitStats[u];
            const pct = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
            return `
                <div class="report-unit-card">
                    <div class="report-unit-card__head">
                        <span class="report-unit-card__name">${st.name}</span>
                        <span class="report-unit-card__pct">${pct}%</span>
                    </div>
                    <div class="report-unit-card__bar">
                        <span style="width: ${pct}%"></span>
                    </div>
                    <div class="report-unit-card__foot">
                        <span>答對 ${st.correct} / ${st.total} 題</span>
                        <a href="${st.link}">前往單元複習 →</a>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ---------- 渲染逐題詳解與錯題檢討列表 ---------- */
    function buildGameReviewHTML(qObj, ans, isOk) {
        if (qObj.gameKind === 'pot-puzzle' || qObj.gameKind === 'pic-match') {
            const list = qObj.pieces || qObj.cards;
            return `<div class="review-slots-grid">` + qObj.slots.map((s) => {
                const uId = ans ? ans[s.id] : null;
                const uItem = list.find((i) => i.id === uId);
                const cItem = list.find((i) => i.id === s.accept);
                const ok = uId === s.accept;
                return `
                    <div class="review-slot-box ${ok ? '' : 'is-slot-bad'}">
                        <div class="review-slot-box__target">${s.label}</div>
                        <div class="review-slot-box__user">${ok ? '✓' : '✗'} 你的答案：${uItem ? (uItem.label || uItem.name) : '（未放置）'}</div>
                        ${!ok ? `<div class="review-slot-box__ans">👉 正確答案：<b>${cItem ? (cItem.label || cItem.name) : ''}</b></div>` : ''}
                    </div>
                `;
            }).join('') + `</div>`;
        }

        if (qObj.gameKind === 'radar-compass') {
            const uPt = qObj.points.find((p) => p.id === (ans && ans.point));
            const uCa = qObj.causes.find((c) => c.id === (ans && ans.cause));
            return `
                <div class="review-item__ans-row">
                    <div>
                        <span>你的探測結果</span>
                        <div class="review-item__ans-user ${isOk ? 'is-ok' : 'is-bad'}">
                            航點：${uPt ? uPt.name : '未選'} ／ 物質：${uCa ? uCa.name : '未選'}
                        </div>
                    </div>
                    <div>
                        <span>正確解答</span>
                        <div class="review-item__ans-correct">航點：B 八里十三行 ／ 物質：🧲 鐵砂與爐渣</div>
                    </div>
                </div>
            `;
        }

        if (qObj.gameKind === 'ship-cargo') {
            const selIds = (ans && Array.isArray(ans.selected)) ? ans.selected : [];
            const uNames = selIds.map((id) => {
                const it = qObj.items.find((i) => i.id === id);
                return it ? it.name : '';
            }).filter(Boolean).join('、') || '（未裝載滿 3 件）';
            return `
                <div class="review-item__ans-row">
                    <div>
                        <span>你裝上船的物品</span>
                        <div class="review-item__ans-user ${isOk ? 'is-ok' : 'is-bad'}">${uNames}</div>
                    </div>
                    <div>
                        <span>正確外來貿易品（3 件）</span>
                        <div class="review-item__ans-correct">東南亞玻璃珠、唐宋開元通寶、中國唐宋青瓷</div>
                    </div>
                </div>
            `;
        }

        if (qObj.gameKind === 'house-lab') {
            const uR = qObj.roofOpts.find((r) => r.id === (ans && ans.roof));
            const uS = qObj.stiltOpts.find((s) => s.id === (ans && ans.stilt));
            return `
                <div class="review-item__ans-row">
                    <div>
                        <span>你的木屋設定</span>
                        <div class="review-item__ans-user ${isOk ? 'is-ok' : 'is-bad'}">
                            ${uR ? uR.label : '未選屋頂'} ＋ ${uS ? uS.label : '未選木柱'}
                        </div>
                    </div>
                    <div>
                        <span>正確十三行構造</span>
                        <div class="review-item__ans-correct">50° 陡斜屋頂 ＋ 2m 木柱架高</div>
                    </div>
                </div>
            `;
        }
        return '';
    }

    function renderReviewList() {
        if (!dom.reviewList) return;
        const letters = ['A', 'B', 'C', 'D'];
        const total = state.questions.length;

        const filtered = state.questions
            .map((qObj, idx) => ({ qObj, idx, isOk: isQuestionCorrect(idx) }))
            .filter(({ idx, isOk }) => {
                if (state.reviewFilter === 'wrong') return !isOk;
                if (state.reviewFilter === 'correct') return isOk;
                if (state.reviewFilter === 'flagged') return Boolean(state.flags[idx]);
                return true;
            });

        if (filtered.length === 0) {
            dom.reviewList.innerHTML = `
                <div class="review-item" style="border-left-color: var(--c-sky); text-align:center; padding: 32px;">
                    <p style="font-size:16px; color:var(--c-text-soft);">目前篩選條件下沒有符合的題目喔！請切換其他篩選標籤查看。</p>
                </div>
            `;
            return;
        }

        dom.reviewList.innerHTML = filtered.map(({ qObj, idx, isOk }) => {
            const flagBadge = state.flags[idx] ? `<span style="font-size:12px; color:#B8541A;">🚩 標記</span>` : '';
            const typeBadge = qObj.type === 'game'
                ? `<span class="exam-card__type-badge exam-card__type-badge--game">🎮 互動遊戲題</span>`
                : `<span class="exam-card__type-badge exam-card__type-badge--mcq">📝 選擇題</span>`;
            const pts = qObj.type === 'game' ? 8 : 6;

            let comparisonHTML = '';
            if (qObj.type === 'mcq') {
                const chosen = state.answers[idx];
                const userText = chosen !== undefined
                    ? `${letters[chosen]}. ${qObj.opts[chosen]}`
                    : '（未作答）';
                const correctText = `${letters[qObj.ans]}. ${qObj.opts[qObj.ans]}`;
                comparisonHTML = `
                    <div class="review-item__ans-row">
                        <div>
                            <span>你的作答</span>
                            <div class="review-item__ans-user ${isOk ? 'is-ok' : 'is-bad'}">${userText}</div>
                        </div>
                        <div>
                            <span>正確解答</span>
                            <div class="review-item__ans-correct">${correctText}</div>
                        </div>
                    </div>
                `;
            } else {
                comparisonHTML = buildGameReviewHTML(qObj, state.answers[idx], isOk);
            }

            return `
                <article class="review-item ${isOk ? 'is-correct' : 'is-wrong'}">
                    <div class="review-item__top">
                        <div class="exam-card__badges">
                            <span class="exam-card__no">Q${String(idx + 1).padStart(2, '0')} / ${total}</span>
                            ${typeBadge}
                            <span class="exam-card__unit">${qObj.unitLabel}</span>
                            ${flagBadge}
                        </div>
                        <span class="review-item__status">
                            ${isOk ? `✓ 答對（+${pts} 分）` : '✗ 答錯或未完成（0 分）'}
                        </span>
                    </div>
                    <h4 class="review-item__q">${qObj.q}</h4>
                    ${comparisonHTML}
                    <p class="review-item__exp"><strong>💡 解析：</strong>${qObj.exp}</p>
                    <a class="review-item__link" href="${qObj.link}">📖 ${qObj.linkText} →</a>
                </article>
            `;
        }).join('');
    }

    function launchConfetti() {
        if (window.ShihsanhangAudio) window.ShihsanhangAudio.playSFX('fanfare');
        const box = $('#celebrate');
        if (!box) return;
        box.innerHTML = '';
        const colors = ['#1F3A5F', '#4A6FA5', '#B08968', '#C46D3B', '#FFD86E', '#2E8B57'];
        for (let i = 0; i < 42; i++) {
            const piece = document.createElement('i');
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.top = `${-10 - Math.random() * 20}px`;
            piece.style.background = colors[i % colors.length];
            piece.style.animationDelay = `${Math.random() * 450}ms`;
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            box.appendChild(piece);
        }
        window.setTimeout(() => { box.innerHTML = ''; }, 2400);
    }

    /* ---------- 事件綁定 ---------- */
    function bindEvents() {
        dom.modeBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                state.modeSec = Number(btn.dataset.sec || 600);
                dom.modeBtns.forEach((b) => b.classList.toggle('is-selected', b === btn));
            });
        });

        if (dom.startBtn) dom.startBtn.addEventListener('click', startExam);

        if (dom.modeToggleBtn) {
            dom.modeToggleBtn.addEventListener('click', () => {
                if (!state.isRunning) return;
                state.viewMode = state.viewMode === 'single' ? 'all' : 'single';
                state.pickedCard = null;
                updateModeToggleText();
                renderPalette();
                renderStage();
            });
        }

        if (dom.submitExamBtn) dom.submitExamBtn.addEventListener('click', requestSubmitExam);

        if (dom.paletteGrid) {
            dom.paletteGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-q-idx]');
                if (btn) goToQuestion(Number(btn.dataset.qIdx));
            });
        }

        if (dom.stage) {
            dom.stage.addEventListener('click', (e) => {
                // 1. 單選題
                const optBtn = e.target.closest('.exam-opt');
                if (optBtn) {
                    selectMCQAnswer(Number(optBtn.dataset.qIdx), Number(optBtn.dataset.optIdx));
                    return;
                }

                // 2. 清除拼圖或配對槽
                const clearBtn = e.target.closest('[data-clear-slot]');
                if (clearBtn) {
                    e.stopPropagation();
                    const qIdx = Number(clearBtn.dataset.qIdx);
                    const slotId = clearBtn.dataset.clearSlot;
                    if (state.answers[qIdx]) delete state.answers[qIdx][slotId];
                    rerenderSingleCard(qIdx);
                    return;
                }

                // 3. 重置單一互動題
                const resetBtn = e.target.closest('[data-reset-game]');
                if (resetBtn) {
                    const qIdx = Number(resetBtn.dataset.resetGame);
                    const qObj = state.questions[qIdx];
                    state.answers[qIdx] = (qObj && qObj.gameKind === 'ship-cargo') ? { selected: [] } : {};
                    state.pickedCard = null;
                    rerenderSingleCard(qIdx);
                    return;
                }

                // 4. 拼圖／圖卡點選
                const dragCard = e.target.closest('[data-drag-card]');
                if (dragCard) {
                    const qIdx = Number(dragCard.dataset.qIdx);
                    const cardId = dragCard.dataset.dragCard;
                    if (state.pickedCard && state.pickedCard.qIdx === qIdx && state.pickedCard.cardId === cardId) {
                        state.pickedCard = null;
                    } else {
                        state.pickedCard = { qIdx, cardId };
                    }
                    rerenderSingleCard(qIdx);
                    return;
                }

                // 5. 目標槽點擊放入
                const dropSlot = e.target.closest('[data-drop-slot]');
                if (dropSlot) {
                    const qIdx = Number(dropSlot.dataset.qIdx);
                    const slotId = dropSlot.dataset.dropSlot;
                    if (state.pickedCard && state.pickedCard.qIdx === qIdx) {
                        assignCardToSlot(qIdx, slotId, state.pickedCard.cardId);
                    }
                    return;
                }

                // 6. 遊戲 2：雷達航點與磁場原因
                const radarPt = e.target.closest('[data-radar-pt]');
                if (radarPt) {
                    const qIdx = Number(radarPt.dataset.qIdx);
                    state.answers[qIdx] = { ...(state.answers[qIdx] || {}), point: radarPt.dataset.radarPt };
                    rerenderSingleCard(qIdx);
                    return;
                }
                const radarCause = e.target.closest('[data-radar-cause]');
                if (radarCause) {
                    const qIdx = Number(radarCause.dataset.qIdx);
                    state.answers[qIdx] = { ...(state.answers[qIdx] || {}), cause: radarCause.dataset.radarCause };
                    rerenderSingleCard(qIdx);
                    return;
                }

                // 7. 遊戲 4：貿易帆船 6 選 3
                const shipItem = e.target.closest('[data-ship-item]');
                if (shipItem) {
                    const qIdx = Number(shipItem.dataset.qIdx);
                    const itemId = shipItem.dataset.shipItem;
                    const cur = (state.answers[qIdx] && Array.isArray(state.answers[qIdx].selected))
                        ? state.answers[qIdx].selected.slice()
                        : [];
                    const pos = cur.indexOf(itemId);
                    if (pos >= 0) {
                        cur.splice(pos, 1);
                    } else if (cur.length < 3) {
                        cur.push(itemId);
                    } else {
                        cur.shift();
                        cur.push(itemId);
                    }
                    state.answers[qIdx] = { selected: cur };
                    rerenderSingleCard(qIdx);
                    return;
                }

                // 8. 遊戲 5：木屋參數切換
                const roofBtn = e.target.closest('[data-house-roof]');
                if (roofBtn) {
                    const qIdx = Number(roofBtn.dataset.qIdx);
                    state.answers[qIdx] = { ...(state.answers[qIdx] || {}), roof: roofBtn.dataset.houseRoof };
                    rerenderSingleCard(qIdx);
                    return;
                }
                const stiltBtn = e.target.closest('[data-house-stilt]');
                if (stiltBtn) {
                    const qIdx = Number(stiltBtn.dataset.qIdx);
                    state.answers[qIdx] = { ...(state.answers[qIdx] || {}), stilt: stiltBtn.dataset.houseStilt };
                    rerenderSingleCard(qIdx);
                    return;
                }

                // 9. 標記與上下題導覽
                const flagBtn = e.target.closest('[data-flag-idx]');
                if (flagBtn) {
                    toggleFlag(Number(flagBtn.dataset.flagIdx));
                    return;
                }

                const navBtn = e.target.closest('[data-nav]');
                if (navBtn) {
                    const action = navBtn.dataset.nav;
                    if (action === 'prev') goToQuestion(state.currentIndex - 1);
                    if (action === 'next') goToQuestion(state.currentIndex + 1);
                    if (action === 'submit') requestSubmitExam();
                }
            });

            // HTML5 拖曳支援（供遊戲 1 陶罐拼圖 與 遊戲 3 圖片配圖片 使用）
            dom.stage.addEventListener('dragstart', (e) => {
                const card = e.target.closest('[data-drag-card]');
                if (!card || !e.dataTransfer) return;
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    qIdx: Number(card.dataset.qIdx),
                    cardId: card.dataset.dragCard
                }));
                e.dataTransfer.effectAllowed = 'move';
            });

            dom.stage.addEventListener('dragover', (e) => {
                const slot = e.target.closest('[data-drop-slot]');
                if (!slot) return;
                e.preventDefault();
                slot.classList.add('is-dragover');
            });

            dom.stage.addEventListener('dragleave', (e) => {
                const slot = e.target.closest('[data-drop-slot]');
                if (slot) slot.classList.remove('is-dragover');
            });

            dom.stage.addEventListener('drop', (e) => {
                const slot = e.target.closest('[data-drop-slot]');
                if (!slot || !e.dataTransfer) return;
                e.preventDefault();
                slot.classList.remove('is-dragover');
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const slotQIdx = Number(slot.dataset.qIdx);
                    if (data && data.qIdx === slotQIdx && data.cardId) {
                        assignCardToSlot(slotQIdx, slot.dataset.dropSlot, data.cardId);
                    }
                } catch (_) {}
            });

            // 行動裝置（手機／平板）觸控滑動拖曳支援（同時保留點擊配對雙模式）
            let touchDrag = null;

            dom.stage.addEventListener('touchstart', (e) => {
                if (!state.isRunning || state.isSubmitted) return;
                if (e.touches.length !== 1) return;
                const card = e.target.closest('[data-drag-card]');
                if (!card) return;
                const t = e.touches[0];
                touchDrag = {
                    cardEl: card,
                    qIdx: Number(card.dataset.qIdx),
                    cardId: card.dataset.dragCard,
                    startX: t.clientX,
                    startY: t.clientY,
                    isDragging: false,
                    ghostEl: null,
                    hoverSlot: null
                };
            }, { passive: true });

            dom.stage.addEventListener('touchmove', (e) => {
                if (!touchDrag || e.touches.length !== 1) return;
                const t = e.touches[0];
                const dx = t.clientX - touchDrag.startX;
                const dy = t.clientY - touchDrag.startY;

                if (!touchDrag.isDragging) {
                    if (Math.hypot(dx, dy) < 10) return;
                    touchDrag.isDragging = true;
                    const rect = touchDrag.cardEl.getBoundingClientRect();
                    const ghost = touchDrag.cardEl.cloneNode(true);
                    ghost.classList.add('mg-touch-ghost');
                    ghost.style.width = `${Math.max(110, Math.min(180, rect.width))}px`;
                    document.body.appendChild(ghost);
                    touchDrag.ghostEl = ghost;
                    touchDrag.cardEl.classList.add('is-picked');
                }

                if (e.cancelable) e.preventDefault();

                if (touchDrag.ghostEl) {
                    touchDrag.ghostEl.style.left = `${t.clientX}px`;
                    touchDrag.ghostEl.style.top = `${t.clientY}px`;
                }

                // 偵測手指下方的目標槽位
                if (touchDrag.ghostEl) touchDrag.ghostEl.style.display = 'none';
                const underEl = document.elementFromPoint(t.clientX, t.clientY);
                if (touchDrag.ghostEl) touchDrag.ghostEl.style.display = '';

                const slot = underEl ? underEl.closest('[data-drop-slot]') : null;
                if (touchDrag.hoverSlot && touchDrag.hoverSlot !== slot) {
                    touchDrag.hoverSlot.classList.remove('is-dragover');
                }
                if (slot && Number(slot.dataset.qIdx) === touchDrag.qIdx) {
                    slot.classList.add('is-dragover');
                    touchDrag.hoverSlot = slot;
                } else {
                    touchDrag.hoverSlot = null;
                }
            }, { passive: false });

            const finishTouchDrag = () => {
                if (!touchDrag) return;
                const { isDragging, qIdx, cardId, ghostEl, hoverSlot, cardEl } = touchDrag;
                if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
                if (cardEl) cardEl.classList.remove('is-picked');
                if (hoverSlot) hoverSlot.classList.remove('is-dragover');
                touchDrag = null;

                if (isDragging && hoverSlot && Number(hoverSlot.dataset.qIdx) === qIdx) {
                    assignCardToSlot(qIdx, hoverSlot.dataset.dropSlot, cardId);
                }
            };

            dom.stage.addEventListener('touchend', finishTouchDrag);
            dom.stage.addEventListener('touchcancel', finishTouchDrag);
        }

        dom.filterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                state.reviewFilter = btn.dataset.filter || 'all';
                dom.filterBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
                renderReviewList();
            });
        });

        if (dom.retryBtn) dom.retryBtn.addEventListener('click', startExam);
        if (dom.failRetryBtn) dom.failRetryBtn.addEventListener('click', startExam);
        if (dom.backPrepBtn) {
            dom.backPrepBtn.addEventListener('click', () => {
                stopTimer();
                state.isRunning = false;
                if (dom.arenaSection) dom.arenaSection.hidden = true;
                if (dom.reportSection) dom.reportSection.hidden = true;
                if (dom.prepSection) {
                    dom.prepSection.hidden = false;
                    dom.prepSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            if (!state.isRunning || state.isSubmitted) return;
            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            const key = e.key.toUpperCase();
            if (state.viewMode === 'single') {
                const currentQ = state.questions[state.currentIndex];
                if (currentQ && currentQ.type === 'mcq') {
                    if (key === '1' || key === 'A') selectMCQAnswer(state.currentIndex, 0);
                    else if (key === '2' || key === 'B') selectMCQAnswer(state.currentIndex, 1);
                    else if (key === '3' || key === 'C') selectMCQAnswer(state.currentIndex, 2);
                    else if (key === '4' || key === 'D') selectMCQAnswer(state.currentIndex, 3);
                }
                if (e.key === 'ArrowLeft') goToQuestion(state.currentIndex - 1);
                else if (e.key === 'ArrowRight') goToQuestion(state.currentIndex + 1);
                else if (key === 'F') toggleFlag(state.currentIndex);
            }
        });
    }

    loadBestRecord();
    bindEvents();
})();
