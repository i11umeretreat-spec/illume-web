import { useState, useEffect, useRef, useMemo } from "react";

/* v3.1 — hero animations: mount-stagger, breath-glow, parallax, scroll-fade
/* ═══ ДИЗАЙН-СИСТЕМА ═══════════════════════════════════ */
/* ═══ SUPABASE — waitlist аудио-протоколов ═══════════════ */
const SUPABASE_URL = "https://udwvfmunprcrcwyhccad.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_34PuejyiaxEoIlQ0ktvjbg_yXB-DBDZ";

async function submitWaitlist({name, contact, stateCode, trackName}){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      name: name || null,
      contact,
      state_code: stateCode || null,
      track_name: trackName || null,
      source: "scanner",
    }),
  });
  if(!res.ok) throw new Error(`Supabase insert failed: ${res.status}`);
  return true;
}

const C = {
  bg:"#0A1420", surf:"#0E1A2A",        // глубокий тёплый navy
  p:"#FF6B4A",                          // коралл — UI-акценты: кнопки, лейблы, бейджи (мелкий текст)
  terra:"#B5583A",                      // терракота — приглушённая версия для крупного текста (заголовки)
  cy:"#3DBFA8",                         // приглушённый тил — голос сферы (cold)
  s:"#7B4FE8", a:"#FF6B4A",
  t:"#EAE2D6",                          // тёплый кремовый текст
  dim:"#6A7E92",
  gold:"#E0A93A",                       // тёплое золото
  body:"#9AAEBE",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700" +
  "&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,400" +
  "&family=Inter:wght@300;400&display=swap";

const KEYS = `
  @keyframes qFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes rFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
`;

/* ═══ ХУКИ ══════════════════════════════════════════════ */
function useIsMobile() {
  const [m, setM] = useState(
    typeof window !== "undefined" && window.innerWidth < 680
  );
  useEffect(() => {
    const h = () => setM(window.innerWidth < 680);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

/* ═══ ДАННЫЕ ════════════════════════════════════════════ */
const QUESTIONS = [
  { block:"ТЕЛО", n:"1 / 6",
    text:"На последнем ретрите или интенсиве сон был:",
    opts:[
      {text:"Меньше 5 часов почти каждую ночь. Держался на кофе и адреналине.",sc:{E:2}},
      {text:"Урывками. Просыпался от малейшего шороха в доме — на всякий случай.",sc:{P:2}},
      {text:"Нормально. Умею восстанавливаться даже в процессе.",sc:{B:2}},
      {text:"Не помню, если честно. Дни слиплись в один.",sc:{I:2}},
    ]},
  { block:"ТЕЛО", n:"2 / 6",
    text:"Тело после того как группа разъезжается обычно:",
    opts:[
      {text:"Продолжает «держать» ещё несколько дней. Расслабиться сразу не получается.",sc:{F:2}},
      {text:"Просто выключается. Хочу лишь спать и никого не видеть.",sc:{E:2}},
      {text:"Быстро приходит в норму. Есть чёткая граница «работа закончилась».",sc:{B:2}},
      {text:"Странно спокойное. Как будто ничего не было — но и радости тоже нет.",sc:{A:2}},
    ]},
  { block:"ГРАНИЦЫ", n:"3 / 6",
    text:"Когда у кого-то из группы случается кризис посреди процесса:",
    opts:[
      {text:"Беру это на себя полностью, пока человек не выйдет из состояния.",sc:{W:2}},
      {text:"Различаю: помогаю, но ухожу домой без этого груза.",sc:{B:2}},
      {text:"Раздражение приходит раньше сострадания — и потом стыжусь этого.",sc:{F:2}},
      {text:"Отстраняюсь автоматически. Работаю по протоколу, не включаюсь.",sc:{A:2}},
    ]},
  { block:"ГРАНИЦЫ", n:"4 / 6",
    text:"Сколько раз за последний ретрит хотелось незаметно исчезнуть хотя бы на час:",
    opts:[
      {text:"Считать сбился.",sc:{I:2}},
      {text:"Пару раз — в моменты когда стало совсем тяжело.",sc:{P:2}},
      {text:"Не возникало. Обычно есть где выдохнуть в процессе.",sc:{B:2}},
      {text:"Всё время. Но я умею не показывать этого группе.",sc:{W:2}},
    ]},
  { block:"ВЕКТОР", n:"5 / 6",
    text:"Мысль «смогу ли я делать это ещё пять лет» вызывает:",
    opts:[
      {text:"Тревогу. Чаще думаю — смогу ли ещё раз в этом году.",sc:{E:2}},
      {text:"Ничего особенного. Это моя профессия, я в ней.",sc:{B:2}},
      {text:"Странное безразличие. Раньше волновало сильнее.",sc:{I:2}},
      {text:"Азарт вперемешку с усталостью. Хочу расти, но топливо на исходе.",sc:{P:2}},
    ]},
  { block:"ВЕКТОР", n:"6 / 6",
    text:"Что чаще всего приводит вас к решению провести ещё один ретрит:",
    opts:[
      {text:"Финансовая необходимость — прежде всего.",sc:{E:2}},
      {text:"Люблю то что делаю, и это по-прежнему даёт энергию.",sc:{B:2}},
      {text:"Не уверен уже. Делаю по инерции.",sc:{I:2}},
      {text:"Ищу что-то новое — старый формат перестал откликаться.",sc:{T:2}},
    ]},
];

const MODULES = {
  banya:{ic:"🔥",nm:"Баня"}, havan:{ic:"⚡",nm:"Хаван"},
  melukat:{ic:"💧",nm:"Мелукат"}, topo:{ic:"🌿",nm:"Топография"},
  dance:{ic:"🌊",nm:"Танец"}, breath:{ic:"🌬️",nm:"Дыхание"},
  voice:{ic:"🗣️",nm:"Голос"},
};

const STATES = {
  B:{color:"#3DBFA8",sec:"#7FE0CC",code:"В балансе",
     name:"Держите себя и группу одновременно",sub:"Редкое состояние. Без иронии.",
     body:"Вы отдаёте энергию группе и при этом не пустеете. Умеете различать чужое состояние и своё, знаете где граница между заботой и самопожертвованием. Это не значит что помощь не нужна — это значит что сейчас хороший момент укрепить то, что уже работает, а не latать дыры.",
     bali:"Личная забота уровня Tier 1 — на случай следующего интенсивного сезона. Встреча, баня, протокол между сессиями.",
     remote:"Мобильный аудио-модуль на вилле. Профилактика — не спасение.",
     service:"massage",style:"full",
     mods:["banya","havan","melukat"],synergy:"Поддержание формы",
     track:{name:"Профилактический протокол",bundle:false}},
  E:{color:"#C07A28",sec:"#D4581C",code:"Резерв на нуле",
     name:"Топливо кончилось раньше ретрита",sub:"Держитесь на том чего уже нет.",
     body:"Вы даёте группе то, чего у вас самих давно не осталось. Это не слабость и не неопытность — это математика: сколько лет подряд отдавать без восполнения, прежде чем резерв обнулится. Сейчас не время для ещё одного героического ретрита на морально-волевых. Нужна пауза и забота, направленная именно на вас.",
     bali:"Встреча в аэропорту, баня и массаж в первый же день — до начала работы с группой, не после.",
     remote:"Мобильный аудио-кокон в вашей комнате. Сорок минут тишины между сессиями, без необходимости куда-то ехать.",
     service:"banya",style:"compressed",
     mods:["banya","melukat"],synergy:"Экстренное восполнение",
     track:{name:"Нейро Кокон: Гравитация",bundle:false}},
  W:{color:"#2D7FFF",sec:"#6BB8FF",code:"Растворились в группе",
     name:"Держите чужое состояние как своё",sub:"Граница между вами и группой стала тонкой.",
     body:"Кризис любого участника вы принимаете на себя целиком, пока человек не выйдет из состояния. Это качество которое делает вас хорошим фасилитатором — и оно же незаметно вас опустошает. Забота о вас должна начинаться до того как группа приедет, чтобы было из чего отдавать.",
     bali:"Личный протокол с чёткой границей: время которое принадлежит только вам, не группе.",
     remote:"Аудио-модуль как способ физически выйти из общего поля хотя бы на час.",
     service:"online",style:"wavy",
     mods:["melukat","breath"],synergy:"Восстановление границы",
     track:{name:"Глубокая Вода",bundle:false}},
  F:{color:"#FF6B4A",sec:"#FF9060",code:"Заряжены, разрядки нет",
     name:"Энергия есть. Отпустить её некуда.",sub:"Держите слишком многое одновременно.",
     body:"Раздражение приходит быстрее сострадания, и потом накрывает стыд за это. Тело продолжает «держать» ещё несколько дней после того как группа разъехалась. Это не про характер — это про накопленное напряжение которому давно нужен физический выход, не ещё одна попытка справиться усилием воли.",
     bali:"Баня и контрастные практики — не для расслабления, а чтобы энергия наконец получила выход.",
     remote:"Катализатор. Формат для тех кому нужна разрядка, не убаюкивание.",
     service:"banya",style:"energetic",
     mods:["banya","havan"],synergy:"Точка приземления",
     track:{name:"Катализатор",bundle:false}},
  A:{color:"#3DBFA8",sec:"#7FE0CC",code:"Работаете из головы",
     name:"Тело отключено, чтобы не мешало",sub:"Функционируете отлично. Ценой контакта с собой.",
     body:"Вы отстраняетесь автоматически, работаете по протоколу, эмоционально не включаетесь — и это работает, группа получает всё что нужно. Но где-то по дороге тело стало просто инструментом для того чтобы держать поле. Заземление — не роскошь, а то что возвращает вам ощущение что вы тоже здесь.",
     bali:"Телесная работа без слов. Массаж и баня — вернуть контакт с телом, не разговоры о нём.",
     remote:"Тишина без задач и целей. Только про то, чтобы снова быть в теле.",
     service:"massage",style:"crystalline",
     mods:["banya","dance"],synergy:"Возврат в тело",
     track:{name:"Сенсорный Вакуум",bundle:false}},
  I:{color:"#A8C4D0",sec:"#C8E0EC",code:"Система встала",
     name:"Автопилот перестал справляться",sub:"Это не лень и не выгорание в привычном смысле.",
     body:"Дни ретритов слиплись в один, вы не помните деталей, и мысль о следующем сезоне вызывает странное безразличие вместо тревоги. Система исчерпала способы держаться и остановилась сама. Здесь не нужен ещё один рывок — нужна забота без требований и без давления вернуться в строй немедленно.",
     bali:"Тёплая баня, мягкий темп, без плотного расписания. Личная сессия без цели что-то «проработать».",
     remote:"Мобильный кокон без структуры. Просто пространство где ничего не нужно.",
     service:"banya",style:"still",
     mods:["banya"],synergy:"Без давления",
     track:{name:"Нейро Кокон: Гравитация",bundle:false}},
  P:{color:"#9B68F0",sec:"#7B4FE8",code:"На автомате",
     name:"Функционируете. Топливо — в долг.",sub:"Снаружи всё нормально. Внутри дефицит.",
     body:"Остановка пугает больше чем продолжение, поэтому вы продолжаете — и группа этого не видит, вы умеете не показывать. Но топливо занимается не из ресурса, а в долг у будущего себя. Вопрос не в том выдержите ли вы этот сезон. Вопрос в том, на чём вы будете работать в следующем.",
     bali:"Хаван и декомпрессия — сбросить давление до того как оно станет привычным фоном.",
     remote:"Катализатор, затем Сенсорный Вакуум. Сначала выпустить, потом остановиться.",
     service:"online",style:"tight",
     mods:["havan","breath"],synergy:"Сброс долга",
     track:{name:"Катализатор + Сенсорный Вакуум",bundle:true}},
  T:{color:"#E0C040",sec:"#F0D860",code:"На развилке",
     name:"Старый формат больше не откликается",sub:"Между тем что было и тем что будет.",
     body:"Вы ищете что-то новое — не потому что старое сломалось, а потому что оно перестало быть живым. Это неудобное но важное окно: пересобрать не только программу для группы, но и то, как вы сами в ней участвуете. Редкий момент когда стоит остановиться и посмотреть, а не торопиться заполнить паузу следующим проектом.",
     bali:"Топография и интеграционная сессия — пространство подумать, не расписание которое нужно выполнить.",
     remote:"Глубокая Вода, затем интеграция. Пройти через переход, а не обогнуть его.",
     service:"melukat",style:"transition",
     mods:["topo","melukat"],synergy:"Пересборка подхода",
     track:{name:"Глубокая Вода + интеграция",bundle:true}},
};

/* ═══ УТИЛИТЫ ═══════════════════════════════════════════ */
function computeScores(a){
  const s={E:0,W:0,F:0,A:0,I:0,P:0,T:0,B:0};
  a.forEach(x=>Object.entries(x.sc).forEach(([k,v])=>{s[k]=(s[k]||0)+v;}));
  return s;
}
function getDominant(s){
  return Object.entries(s).sort((a,b)=>b[1]-a[1])[0]?.[0]||"B";
}
function buildWA(name,contact,st,secSt){
  const msg=encodeURIComponent(
    `Здравствуйте. Хочу записаться на бесплатный чекап.\n`+
    `Имя: ${name}\n`+
    `Контакт: ${contact}\n\n`+
    `Результат диагностики: ${st.code} — ${st.name}.\n`+
    (secSt?`Рядом идёт: ${secSt.code} — ${secSt.name}.\n`:``)+
    `Рекомендация: ${st.bali}`
  );
  return `https://wa.me/6281339630129?text=${msg}`;
}
function deepLink(state,st){
  return `https://royalmassage.i11ume.com?service=${st.service}&state=${state}&from=scanner`;
}
function constructorLink(st){
  return `/constructor?modules=${st.mods.join(",")}&promo=10`;
}

/* ═══ SVG HELPERS ════════════════════════════════════════ */
function wavyPath(cx,cy,r,amp,freq){
  return Array.from({length:101},(_,i)=>{
    const a=(i/100)*2*Math.PI,w=amp*Math.sin(a*freq);
    return `${i===0?"M":"L"} ${(cx+(r+w)*Math.cos(a)).toFixed(1)} ${(cy+(r+w*.65)*Math.sin(a)).toFixed(1)}`;
  }).join(" ")+" Z";
}
function polyPath(cx,cy,r,sides,rot=0){
  return Array.from({length:sides+1},(_,i)=>{
    const a=(i/sides)*2*Math.PI+rot;
    return `${i===0?"M":"L"} ${(cx+r*Math.cos(a)).toFixed(1)} ${(cy+r*Math.sin(a)).toFixed(1)}`;
  }).join(" ")+" Z";
}

/* ═══ ХИРО-СФЕРА ════════════════════════════════════════ */
function IdleSphere({size=186}){
  const cx=120, cy=120, R=106;
  // Vesica Piscis: arc radius r=(30²+106²)/(2×106)=57.25
  // Left L(90,120), Right R(150,120), Top T(120,14), Bottom B(120,226)
  const vR="57.25", vL=90, vRx=150;

  return(
    <svg viewBox="0 0 240 240" style={{width:size,height:size}}>
      <defs>
        <clipPath id="id-cl"><circle cx={cx} cy={cy} r={R+2}/></clipPath>
        <radialGradient id="id-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.surf}/><stop offset="100%" stopColor={C.bg}/>
        </radialGradient>
        <radialGradient id="id-cg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.92"/>
          <stop offset="25%"  stopColor={C.cy}    stopOpacity="0.48"/>
          <stop offset="60%"  stopColor={C.cy}    stopOpacity="0.11"/>
          <stop offset="100%" stopColor={C.cy}    stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="id-mg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={C.cy} stopOpacity="0.10"/>
          <stop offset="100%" stopColor={C.cy} stopOpacity="0"/>
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={R+14} fill={C.bg}/>
      <circle cx={cx} cy={cy} r={R+2}  fill="url(#id-bg)"/>

      <g clipPath="url(#id-cl)">
        <circle cx={cx} cy={cy} r={R} fill="url(#id-mg)"/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.cy} strokeWidth="0.5" opacity="0.24"/>

        {/* ── VESICA PISCIS вертикальная — истинные дуги окружностей ── */}
        {/* Заливка линзы */}
        <path
          d={`M ${vL} ${cy} A ${vR} ${vR} 0 1 1 ${vRx} ${cy} A ${vR} ${vR} 0 1 1 ${vL} ${cy} Z`}
          fill={C.cy} opacity="0.05"
        />
        {/* Верхняя дуга L→R через T(120,14), large-arc=1 sweep=1 */}
        <path d={`M ${vL} ${cy} A ${vR} ${vR} 0 1 1 ${vRx} ${cy}`}
          fill="none" stroke={C.cy} strokeWidth="0.85" opacity="0.58"/>
        {/* Нижняя дуга R→L через B(120,226) */}
        <path d={`M ${vRx} ${cy} A ${vR} ${vR} 0 1 1 ${vL} ${cy}`}
          fill="none" stroke={C.cy} strokeWidth="0.85" opacity="0.58"/>

        {/* ── INNER HORIZONTAL IRIS — горизонтальный глаз ── */}
        <path d={`M 68 ${cy} Q ${cx} 68 172 ${cy}`}
          fill="none" stroke="white" strokeWidth="0.95" opacity="0.48"/>
        <path d={`M 68 ${cy} Q ${cx} 172 172 ${cy}`}
          fill="none" stroke="white" strokeWidth="0.95" opacity="0.48"/>

        {/* ── КОНЦЕНТРИЧЕСКИЕ — золотое сечение r × 0.618 ── */}
        {/* 65.4 → 40.4 → 25.0 → 15.4 */}
        <circle cx={cx} cy={cy} r="65.4" fill="none" stroke="white" strokeWidth="0.55" opacity="0.28"/>
        <circle cx={cx} cy={cy} r="40.4" fill="none" stroke="white" strokeWidth="0.65" opacity="0.38"/>
        <circle cx={cx} cy={cy} r="25.0" fill="none" stroke="white" strokeWidth="0.75" opacity="0.48"/>
        <circle cx={cx} cy={cy} r="15.4" fill="none" stroke="white" strokeWidth="0.85" opacity="0.58"/>

        {/* ── НАКЛОННЫЕ ОРБИТЫ — создают 3D-ощущение (GLM) ── */}
        {/* Начальный tilt встроен в from= */}
        <ellipse cx={cx} cy={cy} rx="56" ry="16" fill="none"
          stroke={C.cy} strokeWidth="0.6" opacity="0.20">
          <animateTransform attributeName="transform" type="rotate"
            from={`20 ${cx} ${cy}`} to={`380 ${cx} ${cy}`}
            dur="60s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx={cx} cy={cy} rx="78" ry="20" fill="none"
          stroke={C.cy} strokeWidth="0.4" opacity="0.11">
          <animateTransform attributeName="transform" type="rotate"
            from={`-35 ${cx} ${cy}`} to={`-395 ${cx} ${cy}`}
            dur="90s" repeatCount="indefinite"/>
        </ellipse>

        {/* ── ЦЕНТРАЛЬНОЕ СВЕЧЕНИЕ + ПУЛЬС ── */}
        <circle cx={cx} cy={cy} r="22" fill="url(#id-cg)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="8s" repeatCount="indefinite"/>
        </circle>
        <circle cx={cx} cy={cy} r="5" fill={C.cy} opacity="0.20">
          <animate attributeName="r" values="4;6.5;4" dur="8s" repeatCount="indefinite"/>
        </circle>
        <circle cx={cx} cy={cy} r="2" fill="white" opacity="0.96"/>
      </g>

      <circle cx={cx} cy={cy} r={R+2} fill="none" stroke={C.gold} strokeWidth="0.7" opacity="0.20"/>
    </svg>
  );
}

function DiagSphere({dominant,progress,size=240}){
  const st=STATES[dominant]||STATES.B;
  const{color,sec,style}=st;
  const rings=[15,28,42,56,70,84,97];
  const vis=Math.min(rings.length,Math.max(3,Math.ceil(progress*rings.length+.5)));
  const intf=progress>.35,nShow=progress>.65;
  const nCnt=Math.min(8,Math.floor((Math.max(0,progress-.65)/.35)*8+1));
  const nPts=[[120,22],[120,218],[22,120],[218,120],[76,76],[164,76],[76,164],[164,164]];
  const ring=(r,i)=>{
    const sw=i%2===0?1.3:.6,op=.1+i*.1;
    switch(style){
      case"wavy":return <path key={i} d={wavyPath(120,120,r,r*.14,5)} fill="none" stroke={color} strokeWidth={sw} opacity={op}/>;
      case"crystalline":return <path key={i} d={polyPath(120,120,r,i%2===0?6:8,i*.22)} fill="none" stroke={color} strokeWidth={sw} opacity={op}/>;
      case"compressed":return <ellipse key={i} cx="120" cy={124+i*2} rx={r} ry={r*.72-i} fill="none" stroke={color} strokeWidth={sw} opacity={op}/>;
      case"still":return <circle key={i} cx="120" cy="120" r={r} fill="none" stroke={color} strokeWidth={.4} opacity={.04+i*.04}/>;
      case"tight":return <circle key={i} cx="120" cy="120" r={r} fill="none" stroke={color} strokeWidth={sw*1.3} opacity={op*1.2}/>;
      case"energetic":return <path key={i} d={wavyPath(120,120,r,r*.07,9)} fill="none" stroke={color} strokeWidth={sw*1.1} opacity={op}/>;
      case"transition":return i%2===0
        ?<path key={i} d={`M ${120-r},120 A ${r},${r} 0 0,1 ${120+r},120`} fill="none" stroke={color} strokeWidth={sw} opacity={op}/>
        :<path key={i} d={`M ${120-r},120 A ${r},${r} 0 0,0 ${120+r},120`} fill="none" stroke={sec} strokeWidth={sw} opacity={op}/>;
      default:return <circle key={i} cx="120" cy="120" r={r} fill="none" stroke={color} strokeWidth={sw} opacity={op}/>;
    }
  };
  const circ=2*Math.PI*110;
  return(
    <svg viewBox="0 0 240 240" style={{width:size,height:size}}>
      <defs>
        <clipPath id="ds-cl"><circle cx="120" cy="120" r="107"/></clipPath>
        <radialGradient id="ds-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.surf}/><stop offset="100%" stopColor={C.bg}/>
        </radialGradient>
        <radialGradient id="ds-gw" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={progress>.5?.24:.16}/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill={C.bg}/>
      <circle cx="120" cy="120" r="107" fill="url(#ds-bg)"/>
      <g clipPath="url(#ds-cl)">
        <circle cx="120" cy="120" r="90" fill="url(#ds-gw)"/>
        {rings.slice(0,vis).map((r,i)=>ring(r,i))}
        {intf&&style!=="crystalline"&&style!=="still"&&rings.slice(0,Math.min(4,vis)).map((r,i)=>(
          <ellipse key={`h${i}`} cx="120" cy="120" rx={r} ry={r*.26} fill="none" stroke={sec} strokeWidth=".5" opacity={.05+i*.04}/>
        ))}
        {intf&&style!=="crystalline"&&style!=="still"&&rings.slice(0,Math.min(4,vis)).map((r,i)=>(
          <ellipse key={`v${i}`} cx="120" cy="120" rx={r*.26} ry={r} fill="none" stroke={sec} strokeWidth=".5" opacity={.05+i*.04}/>
        ))}
        {nShow&&nPts.slice(0,nCnt).map(([x,y],i)=>(
          <g key={i}>
            <circle cx={x} cy={y} r={i<4?7:5} fill={color} opacity={.12}/>
            <circle cx={x} cy={y} r={i<4?3.5:2.5} fill={color} opacity={.95}/>
          </g>
        ))}
      </g>
      <circle cx="120" cy="120" r="110" fill="none" stroke={color} strokeWidth="1.5" opacity=".1"/>
      {progress>0&&(
        <circle cx="120" cy="120" r="110" fill="none" stroke={color} strokeWidth="1.5" opacity=".5"
          strokeDasharray={`${progress*circ} ${circ}`}
          strokeLinecap="round" transform="rotate(-90,120,120)"/>
      )}
      <circle cx="120" cy="120" r={progress>.8?10:7} fill={color} opacity={progress>.8?.6:.5}/>
      <circle cx="120" cy="120" r={progress>.8?4:2.5} fill="#FFF" opacity=".95"/>
    </svg>
  );
}

/* ═══ NAV ════════════════════════════════════════════════ */
function Nav({isMobile}){
  const [sy,setSy] = useState(0);
  useEffect(()=>{
    const h=()=>setSy(window.scrollY);
    window.addEventListener('scroll',h,{passive:true});
    return()=>window.removeEventListener('scroll',h);
  },[]);
  const scrollY=sy;
  return(
    <nav style={{
      position:"fixed",top:0,left:0,right:0,zIndex:100,
      display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:isMobile?"12px 20px":"14px 40px",
      background:`${C.bg}D0`,
      backdropFilter:"blur(16px)",
      WebkitBackdropFilter:"blur(16px)",
      borderBottom:`1px solid ${C.gold}${scrollY>20?'28':'00'}`,
      transition:'border-color 400ms ease',
    }}>
      <div style={{
        fontFamily:"'Space Grotesk',sans-serif",
        fontWeight:700,fontSize:isMobile?15:17,
        letterSpacing:"0.12em",color:C.gold,
      }}>
        i11ume
      </div>
      {!isMobile&&(
        <div style={{display:"flex",gap:32,alignItems:"center"}}>
          {["Сессии","Протоколы","B2B"].map(l=>(
            <a key={l} href="#" style={{
              fontFamily:"'Space Grotesk',sans-serif",
              fontWeight:400,fontSize:10,letterSpacing:"0.22em",
              color:C.dim,textDecoration:"none",textTransform:"uppercase",
            }}>{l}</a>
          ))}
          <div style={{
            display:"flex",gap:10,
            borderLeft:`1px solid ${C.gold}30`,paddingLeft:24,
          }}>
            {["RU","EN","ID","CN"].map((l,i)=>(
              <span key={l} style={{
                fontFamily:"'Space Grotesk',sans-serif",
                fontSize:10,letterSpacing:"0.15em",
                color:i===0?C.cy:C.dim,cursor:"pointer",
              }}>{l}</span>
            ))}
          </div>
        </div>
      )}
      {isMobile&&(
        <div style={{display:"flex",gap:12}}>
          {["RU","EN"].map((l,i)=>(
            <span key={l} style={{
              fontFamily:"'Space Grotesk',sans-serif",
              fontSize:10,letterSpacing:"0.15em",
              color:i===0?C.cy:C.dim,cursor:"pointer",
            }}>{l}</span>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ═══ ХИРО ═══════════════════════════════════════════════ */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const HERO_KEYS = `
  @keyframes i11umeBreath {
     0%, 100% { transform: scale(1.00); opacity: 0.42; }
     50%       { transform: scale(1.03); opacity: 0.62; }
  }
  @keyframes i11umeSphereIn {
     0%  { opacity: 0; transform: scale(0.92); }
    60%  { opacity: 1; transform: scale(1); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

function Hero({onStart,isMobile}){
  const [mounted,setMounted] = useState(false);
  const [scrollY,setScrollY]  = useState(0);
  const [sphereHov,setSphereHov] = useState(false);
  const [hovAct,setHovAct]    = useState(null);
  const [act,setAct]          = useState(0);
  const [tagsVis,setTagsVis]  = useState(false);
  const [painIdx,setPainIdx]  = useState(0);
  const [painVis,setPainVis]  = useState(true);

  // Реальность фасилитатора — не пользователя. Ротируются рядом со сферой.
  const PAINS = [
    "Первым встаёте. Последним ложитесь.",
    "На своём же ретрите вы — на работе.",
    "Группе дали всё. Себе — ничего.",
    "Кто-то держит поле. Вас никто не держит.",
  ];

  useEffect(()=>{
    let r1,r2;
    r1=requestAnimationFrame(()=>{r2=requestAnimationFrame(()=>setMounted(true));});
    return()=>{cancelAnimationFrame(r1);cancelAnimationFrame(r2);};
  },[]);

  useEffect(()=>{
    if(!mounted) return;
    const t=[
      setTimeout(()=>setAct(1), 800),
      setTimeout(()=>setAct(2), 2000),
      setTimeout(()=>setAct(3), 3200),
    ];
    return()=>t.forEach(clearTimeout);
  },[mounted]);

  useEffect(()=>{
    if(act<3) return;
    const t=setTimeout(()=>setTagsVis(true), 900);
    return()=>clearTimeout(t);
  },[act]);

  useEffect(()=>{
    if(act<3) return;
    const iv=setInterval(()=>{
      setPainVis(false);
      setTimeout(()=>{setPainIdx(i=>(i+1)%PAINS.length);setPainVis(true);},500);
    },3500);
    return()=>clearInterval(iv);
  },[act]);

  useEffect(()=>{
    let raf=null;
    const h=()=>{if(raf)return;raf=requestAnimationFrame(()=>{setScrollY(window.scrollY);raf=null;});};
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);

  const heroProgress=Math.min(scrollY/600,1);
  const anim=(delay)=>({
    opacity:mounted?1:0,
    transform:mounted?"translateY(0)":"translateY(24px)",
    transition:`opacity 900ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms`,
  });

  const elLayer=(vis,grad,extra={})=>({
    position:"absolute",inset:0,pointerEvents:"none",
    opacity:vis?1:0,
    transition:`opacity 1800ms ${EASE}`,
    background:grad,...extra,
  });

  return(
    <section style={{
      minHeight:"100vh",position:"relative",overflow:"hidden",
      display:"grid",
      gridTemplateColumns:isMobile?"1fr":"1.1fr 1fr",
      alignItems:"center",
      padding:isMobile?"100px 24px 110px":"100px 56px 120px",
      gap:isMobile?40:48,
      boxSizing:"border-box",
    }}>

      {/* ═══ СТИХИИ ═══ */}
      <div style={elLayer(act>=1,
        `radial-gradient(ellipse 80% 60% at 20% 100%, ${C.p}20 0%, ${C.gold}0E 30%, transparent 65%)`
      )}/>
      <div style={elLayer(act>=2,
        `radial-gradient(circle at 22% 50%, transparent 0%, ${C.cy}12 20%, ${C.cy}00 32%, transparent 45%, ${C.cy}0A 56%, transparent 68%)`
      )}/>
      <div style={elLayer(act>=3,
        `radial-gradient(ellipse 90% 70% at 30% 75%, ${C.gold}16 0%, ${C.p}0C 35%, transparent 60%)`,
        {transition:`opacity 2200ms ${EASE}`}
      )}/>
      <div style={elLayer(act>=1,
        `radial-gradient(circle at 78% 52%, ${C.cy}0E 0%, ${C.cy}00 38%, transparent 55%)`,
        {transition:`opacity 2400ms ${EASE}`}
      )}/>

      {/* ═══ ЛЕВАЯ КОЛОННА ═══ */}
      <div style={{
        position:"relative",zIndex:2,
        order:1,
        opacity:1-heroProgress*0.5,
        transition:`opacity 600ms ${EASE}`,
      }}>

        {/* Диагноз — их реальность */}
        <div style={{...anim(0),marginBottom:isMobile?28:36}}>
          <div style={{
            fontFamily:"'Fraunces',serif",fontWeight:400,fontStyle:"normal",
            fontSize:isMobile?"clamp(32px,8.4vw,46px)":"clamp(42px,4.4vw,66px)",
            letterSpacing:"-0.02em",color:C.t,lineHeight:1.06,
          }}>
            Пока вы ведёте группу —<br/>
            <span style={{color:C.terra}}>мы заботимся о вас</span>
          </div>
        </div>

        {/* Встреча — hover меняет цвет P1 */}
        <div
          onMouseEnter={()=>setHovAct(1)}
          onMouseLeave={()=>setHovAct(null)}
          style={{
            opacity:act>=1?1:0,
            transform:act>=1?"translateY(0)":"translateY(20px)",
            transition:`opacity 900ms ${EASE}, transform 900ms ${EASE}`,
            marginBottom:isMobile?20:26,cursor:"default",
          }}
        >
          <div style={{
            fontFamily:"'Fraunces',serif",fontWeight:400,
            fontSize:isMobile?"clamp(20px,5vw,26px)":"clamp(23px,2.2vw,31px)",
            letterSpacing:"-0.005em",
            color:hovAct===1?C.t:C.dim,
            transition:"color 250ms ease",
            marginBottom:6,
          }}>
            Личная забота
          </div>
          <div style={{
            fontFamily:"'Inter',sans-serif",fontWeight:300,
            fontSize:isMobile?12:13,letterSpacing:"0.04em",
            color:hovAct===1?C.dim:C.dim+"66",
            transition:"color 250ms ease",
          }}>
            встреча в аэропорту · баня и массаж по приезду · протокол на время ретрита
          </div>
        </div>

        {/* Курирование — hover меняет цвет P1 */}
        <div
          onMouseEnter={()=>setHovAct(2)}
          onMouseLeave={()=>setHovAct(null)}
          style={{
            opacity:act>=2?1:0,
            transform:act>=2?"translateY(0)":"translateY(20px)",
            transition:`opacity 900ms ${EASE}, transform 900ms ${EASE}`,
            marginBottom:isMobile?28:36,cursor:"default",
          }}
        >
          <div style={{
            fontFamily:"'Fraunces',serif",fontWeight:400,
            fontSize:isMobile?"clamp(20px,5vw,26px)":"clamp(23px,2.2vw,31px)",
            letterSpacing:"-0.005em",
            color:hovAct===2?C.t:C.dim,
            transition:"color 250ms ease",
            marginBottom:6,
          }}>
            Курирование и легалити
          </div>
          <div style={{
            fontFamily:"'Inter',sans-serif",fontWeight:300,
            fontSize:isMobile?12:13,letterSpacing:"0.04em",
            color:hovAct===2?C.dim:C.dim+"66",
            transition:"color 250ms ease",
          }}>
            проверенные виллы и персонал · документы · сеть на Бали
          </div>
        </div>

        {/* Результат — гибкость тиров */}
        <div style={{
          opacity:act>=3?1:0,
          transform:act>=3?"translateY(0)":"translateY(16px)",
          transition:`opacity 1000ms ${EASE}, transform 1000ms ${EASE}`,
          marginBottom:isMobile?22:28,
        }}>
          <div style={{
            fontFamily:"'Fraunces',serif",fontWeight:400,fontStyle:"italic",
            fontSize:isMobile?"clamp(15px,3.8vw,20px)":"clamp(17px,1.7vw,23px)",
            letterSpacing:"0.005em",color:C.t,lineHeight:1.4,
          }}>
            От личной заботы о вас — до полного сопровождения группы.<br/>Вы выбираете уровень.
          </div>
        </div>

        {/* Антиконцепты — их реальность, не гуру-язык */}
        <div style={{
          opacity:tagsVis?1:0,
          transform:tagsVis?"translateY(0)":"translateY(8px)",
          transition:`opacity 900ms ${EASE}, transform 900ms ${EASE}`,
          display:"flex",gap:isMobile?12:20,flexWrap:"wrap",
          marginBottom:isMobile?32:0,
        }}>
          {["Без чужого персонала в последний момент","Без логистики которая рушится","Без ретрита где вы работаете больше всех"].map((x,i)=>(
            <span key={i} style={{
              fontFamily:"'Space Grotesk',sans-serif",fontWeight:400,
              fontSize:9,letterSpacing:"0.2em",
              color:C.dim+"77",textTransform:"uppercase",
            }}>{x}</span>
          ))}
        </div>
      </div>

      {/* ═══ ПРАВАЯ КОЛОННА: сфера + боль ═══ */}
      <div style={{
        position:"relative",zIndex:2,
        order:2,
        display:"flex",flexDirection:"column",
        alignItems:isMobile?"flex-start":"center",
        gap:20,
        opacity:1-heroProgress*0.4,
      }}>

        <div style={{
          animation:mounted?"i11umeSphereIn 1200ms cubic-bezier(0.22,1,0.36,1) both":"none",
        }}>
          <div
            onClick={onStart}
            onMouseEnter={()=>setSphereHov(true)}
            onMouseLeave={()=>setSphereHov(false)}
            style={{
              cursor:"pointer",
              transform:sphereHov?"scale(1.04)":"scale(1)",
              transition:`transform 500ms ${EASE}`,
              position:"relative",
            }}
          >
            <IdleSphere size={isMobile?130:186}/>
            <div style={{
              position:"absolute",inset:"-28%",
              display:"flex",alignItems:"center",justifyContent:"center",
              pointerEvents:"none",
              animation:mounted?"i11umeBreath 8s cubic-bezier(0.45,0,0.55,1) 1.2s infinite":"none",
            }}>
              <div style={{
                width:"58%",height:"58%",borderRadius:"50%",
                background:sphereHov
                  ?`radial-gradient(circle, ${C.cy}66 0%, ${C.cy}00 70%)`
                  :`radial-gradient(circle, ${C.cy}3A 0%, ${C.cy}00 70%)`,
                filter:"blur(18px)",mixBlendMode:"screen",
                transition:"background 400ms ease",
              }}/>
            </div>
            <div style={{
              position:"absolute",
              inset:sphereHov?"-6px":"-1px",
              borderRadius:"50%",
              border:`1px solid ${C.cy}${sphereHov?"44":"00"}`,
              transition:`all 500ms ${EASE}`,
              pointerEvents:"none",
            }}/>
          </div>
        </div>

        {/* CTA — калькулятор истощения, не диагностика тела */}
        <button
          onClick={onStart}
          style={{
            padding:"10px 22px",
            border:`1px solid ${C.cy}44`,
            borderRadius:100,
            background:`${C.cy}0D`,
            color:C.cy,
            fontFamily:"'Space Grotesk',sans-serif",
            fontWeight:500,fontSize:10,
            letterSpacing:"0.2em",textTransform:"uppercase",
            cursor:"pointer",
            opacity:mounted?1:0,
            transition:`opacity 900ms ${EASE} 800ms, background 250ms ease, border-color 250ms ease`,
            outline:"none",
            textAlign:"center",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background=`${C.cy}1A`;e.currentTarget.style.borderColor=`${C.cy}77`;}}
          onMouseLeave={e=>{e.currentTarget.style.background=`${C.cy}0D`;e.currentTarget.style.borderColor=`${C.cy}44`;}}
        >
          Узнать свой индекс истощения →
        </button>

        {/* Боль-контейнер — реальность вожака */}
        <div style={{
          opacity:act>=3?1:0,
          transition:`opacity 1200ms ${EASE}`,
          maxWidth:isMobile?"100%":230,
          textAlign:isMobile?"left":"center",
        }}>
          <div style={{
            fontFamily:"'Fraunces',serif",fontWeight:400,
            fontSize:isMobile?14:15,letterSpacing:"0.005em",
            color:C.dim,lineHeight:1.5,fontStyle:"italic",
            opacity:painVis?1:0,
            transition:"opacity 500ms ease",
            marginBottom:8,
          }}>
            {PAINS[painIdx]}
          </div>
          <div style={{
            fontFamily:"'Space Grotesk',sans-serif",
            fontSize:9,letterSpacing:"0.2em",
            color:C.dim+"55",textTransform:"uppercase",
          }}>
            6 вопросов о вашем ресурсе
          </div>
        </div>
      </div>

      {/* Координаты */}
      <div style={{
        position:"absolute",bottom:isMobile?24:36,
        left:isMobile?24:56,zIndex:3,
        ...anim(1000),
        fontSize:9,letterSpacing:"0.35em",
        color:C.dim+"66",textTransform:"uppercase",lineHeight:1.9,
      }}>
        Убуд, Бали<br/>
        <span style={{opacity:0.55}}>04°33′N 115°12′E</span>
      </div>
    </section>
  );
}

/* ═══ ФОРМА ЧЕКАПА ═══════════════════════════════════════ */
/* ═══ ФОРМА WAITLIST — аудио-протоколы (Supabase) ═══════ */
function WaitlistForm({st,stKey,onClose}){
  const [contact,setContact]=useState("");
  const [sent,setSent]=useState(false);
  const [sending,setSending]=useState(false);
  const [err,setErr]=useState(false);

  const send=async()=>{
    if(!contact.trim()) return;
    setSending(true);setErr(false);
    try{
      await submitWaitlist({
        contact,
        stateCode:stKey,
        trackName:st.track.name,
      });
      setSent(true);
    }catch(e){
      setErr(true);
    }finally{
      setSending(false);
    }
  };

  const inputStyle={
    width:"100%",padding:"12px 14px",
    background:C.bg,border:`1px solid ${C.dim}33`,
    borderRadius:8,color:C.t,marginBottom:8,
    fontSize:13,fontFamily:"'Inter',sans-serif",
    outline:"none",boxSizing:"border-box",
  };

  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{
      position:"fixed",inset:0,zIndex:200,
      background:`${C.bg}E0`,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",
    }}>
      <div style={{
        background:C.surf,border:`1px solid ${C.p}33`,borderRadius:16,
        padding:32,maxWidth:380,width:"100%",position:"relative",
      }}>
        <button onClick={onClose} style={{
          position:"absolute",top:16,right:16,background:"transparent",border:"none",
          color:C.dim,fontSize:18,cursor:"pointer",lineHeight:1,
        }}>×</button>

        {!sent?(
          <>
            <div style={{fontSize:9,letterSpacing:".4em",color:C.p,textTransform:"uppercase",marginBottom:8}}>
              Скоро в релизе
            </div>
            <h4 style={{
              fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:19,
              color:C.t,marginBottom:8,
            }}>
              {st.track.name}
            </h4>
            <p style={{
              fontSize:13,color:C.body,lineHeight:1.65,marginBottom:22,
              fontFamily:"'Inter',sans-serif",fontWeight:300,
            }}>
              Сферический звук, разработанный под ваше состояние. Оставьте контакт — напишем первыми, как только {st.track.bundle?"бандл":"трек"} будет готов. Со скидкой 10%.
            </p>
            <input
              placeholder="WhatsApp, Telegram или email"
              value={contact}
              onChange={e=>setContact(e.target.value)}
              style={{...inputStyle,marginBottom:16}}/>
            {err&&(
              <div style={{fontSize:11,color:"#FF6B4A",marginBottom:12}}>
                Не получилось отправить. Попробуйте ещё раз.
              </div>
            )}
            <button onClick={send} disabled={sending} style={{
              width:"100%",padding:"13px",border:"none",borderRadius:100,
              background:C.p,color:C.bg,fontSize:11,
              letterSpacing:"0.2em",textTransform:"uppercase",fontWeight:600,
              cursor:sending?"default":"pointer",opacity:sending?0.6:1,
              fontFamily:"'Space Grotesk',sans-serif",
            }}>
              {sending?"Отправляем…":"Узнать первым"}
            </button>
          </>
        ):(
          <>
            <div style={{fontSize:9,letterSpacing:".4em",color:C.p,textTransform:"uppercase",marginBottom:10}}>
              Готово
            </div>
            <p style={{
              fontSize:14,color:C.t,lineHeight:1.65,
              fontFamily:"'Fraunces',serif",fontWeight:400,fontStyle:"italic",
            }}>
              Напишем первыми, как только {st.track.name} выйдет в релиз.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CheckupForm({st,stKey,secSt,onClose}){
  const [name,setName]=useState("");
  const [contact,setContact]=useState("");
  const [sent,setSent]=useState(false);

  const send=()=>{
    if(!name.trim()||!contact.trim()) return;
    window.open(buildWA(name,contact,st,secSt),"_blank");
    setSent(true);
  };

  const inputStyle={
    width:"100%",padding:"12px 14px",
    background:C.bg,border:`1px solid ${C.dim}33`,
    borderRadius:8,color:C.t,marginBottom:8,
    fontSize:13,fontFamily:"'Inter',sans-serif",
    outline:"none",boxSizing:"border-box",
  };

  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{
      position:"fixed",inset:0,zIndex:200,
      background:`${C.bg}E0`,
      backdropFilter:"blur(8px)",
      WebkitBackdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"20px",
    }}>
      <div style={{
        background:C.surf,
        border:`1px solid ${st.color}33`,
        borderRadius:16,padding:32,
        maxWidth:380,width:"100%",
        position:"relative",
      }}>
        <button onClick={onClose} style={{
          position:"absolute",top:16,right:16,
          background:"transparent",border:"none",
          color:C.dim,fontSize:18,cursor:"pointer",
          lineHeight:1,
        }}>×</button>

        {!sent?(
          <>
            <div style={{
              fontSize:9,letterSpacing:".4em",
              color:st.color,textTransform:"uppercase",marginBottom:8,
            }}>Бесплатный чекап</div>
            <h4 style={{
              fontFamily:"'Space Grotesk',sans-serif",
              fontWeight:600,fontSize:18,
              color:C.t,marginBottom:8,
            }}>20 минут с Нади</h4>
            <p style={{
              fontSize:13,color:C.body,
              lineHeight:1.65,marginBottom:22,
              fontFamily:"'Inter',sans-serif",fontWeight:300,
            }}>
              Разберём ваш результат. Нади свяжется в WhatsApp в течение дня.
            </p>
            <input
              placeholder="Имя"
              value={name}
              onChange={e=>setName(e.target.value)}
              style={inputStyle}/>
            <input
              placeholder="WhatsApp или Telegram"
              value={contact}
              onChange={e=>setContact(e.target.value)}
              style={{...inputStyle,marginBottom:16}}/>
            <button onClick={send} style={{
              width:"100%",padding:"13px",
              border:"none",borderRadius:100,
              background:st.color,
              color:C.bg,fontSize:11,
              letterSpacing:"0.2em",textTransform:"uppercase",
              fontWeight:600,cursor:"pointer",
              fontFamily:"'Space Grotesk',sans-serif",
            }}>
              Отправить
            </button>
            <div style={{
              fontSize:9,color:C.dim,
              textAlign:"center",marginTop:10,
              letterSpacing:"0.15em",textTransform:"uppercase",
            }}>
              Нади напишет в течение дня
            </div>
          </>
        ):(
          <>
            <div style={{
              fontSize:9,letterSpacing:".4em",
              color:st.color,textTransform:"uppercase",marginBottom:10,
            }}>Отправлено</div>
            <p style={{
              fontSize:14,color:C.t,
              lineHeight:1.65,marginBottom:20,
              fontFamily:"'Space Grotesk',sans-serif",fontWeight:300,
            }}>
              Нади свяжется с вами в течение дня.
            </p>
            <div style={{
              fontSize:9,letterSpacing:"0.3em",
              color:C.dim,textTransform:"uppercase",marginBottom:8,
            }}>
              Пока ждёте
            </div>
            <p style={{
              fontSize:13,color:C.body,
              lineHeight:1.7,marginBottom:20,
              fontFamily:"'Inter',sans-serif",fontWeight:300,
            }}>
              Можете посмотреть что входит в рекомендованный протокол.
            </p>
            <a href={deepLink(stKey,st)} target="_blank" rel="noreferrer" style={{
              display:"block",padding:"12px 24px",
              border:`1px solid ${st.color}55`,borderRadius:100,
              background:st.color+"14",color:st.color,
              fontFamily:"'Space Grotesk',sans-serif",
              fontWeight:500,fontSize:10,letterSpacing:"0.22em",
              textTransform:"uppercase",textDecoration:"none",
              textAlign:"center",
            }}>
              Посмотреть протокол
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ СКАНЕР ═════════════════════════════════════════════ */
function Scanner({phase,setPhase,answers,setAnswers,isMobile}){
  const [hovered,setHovered]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [showWaitlist,setShowWaitlist]=useState(false);

  const scores=useMemo(()=>computeScores(answers),[answers]);
  const dominant=answers.length>=3?getDominant(scores):"B";
  const progress=answers.length/QUESTIONS.length;
  const stColor=STATES[dominant]?.color||C.p;
  const curQ=QUESTIONS[answers.length];

  const handleAnswer=opt=>{
    const next=[...answers,opt];
    setAnswers(next);
    if(next.length>=QUESTIONS.length) setPhase("result");
  };

  const handleBack=()=>{
    if(answers.length>0) setAnswers(answers.slice(0,-1));
    if(phase==="result") setPhase("idle");
  };

  const reset=()=>{setAnswers([]);setPhase("idle");setHovered(null);};

  const resultKey=getDominant(scores);
  const resultSt=STATES[resultKey]||STATES.B;
  const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const secKey=ranked[1]?.[0];
  const showSec=phase==="result"&&secKey&&(ranked[0][1]-ranked[1][1])<=3&&secKey!==resultKey&&STATES[secKey];

  const sphereSize=isMobile?170:230;

  return(
    <>
      {showForm&&(
        <CheckupForm
          st={resultSt}
          stKey={resultKey}
          secSt={showSec?STATES[secKey]:null}
          onClose={()=>setShowForm(false)}/>
      )}
      {showWaitlist&&(
        <WaitlistForm
          st={resultSt}
          stKey={resultKey}
          onClose={()=>setShowWaitlist(false)}/>
      )}

      <section id="scanner-section" style={{
        minHeight:"100vh",
        padding:isMobile?"72px 20px 48px":"80px 40px 60px",
        borderTop:`1px solid ${C.p}16`,
        boxSizing:"border-box",
      }}>
        {/* Заголовок */}
        <div style={{
          display:"flex",justifyContent:"space-between",
          alignItems:"flex-end",marginBottom:40,
        }}>
          <div>
            <div style={{
              fontSize:9,letterSpacing:"0.42em",
              color:C.dim,textTransform:"uppercase",marginBottom:10,
            }}>Диагностика</div>
            <h2 style={{
              fontFamily:"'Space Grotesk',sans-serif",
              fontWeight:700,letterSpacing:"-.02em",
              fontSize:isMobile?"clamp(22px,6vw,32px)":"clamp(26px,4vw,44px)",
              color:C.t,margin:0,lineHeight:1,
            }}>Какой у вас запас?</h2>
          </div>
          {phase==="quiz"&&(
            <div style={{
              fontSize:9,letterSpacing:"0.3em",
              color:answers.length>=3?stColor:C.dim+"55",
              textTransform:"uppercase",transition:"color .5s",
              textAlign:"right",
            }}>
              {answers.length>=3?STATES[dominant]?.code.toUpperCase():""}
              {" "}{answers.length}/{QUESTIONS.length}
            </div>
          )}
        </div>

        {/* Основная сетка */}
        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile?"1fr":"minmax(190px,240px) 1fr",
          gap:isMobile?28:52,
          alignItems:"start",
        }}>

          {/* Сфера */}
          <div style={{
            position:isMobile?"static":"sticky",
            top:isMobile?0:80,
            display:"flex",flexDirection:"column",
            alignItems:"center",
          }}>
            <DiagSphere
              dominant={phase==="result"?resultKey:dominant}
              progress={phase==="result"?1:phase==="intro"?.35:progress}
              size={sphereSize}/>
            {phase==="quiz"&&(
              <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:12}}>
                {QUESTIONS.map((_,i)=>(
                  <div key={i} style={{
                    height:3,borderRadius:3,
                    width:i<answers.length?14:i===answers.length?7:3,
                    background:i<answers.length?stColor:i===answers.length?C.dim+"88":C.dim+"28",
                    transition:"all .3s",
                  }}/>
                ))}
              </div>
            )}
          </div>

          {/* Контент */}
          <div>


            {/* ИНТРО */}
            {phase==="intro"&&(
              <div>
                <p style={{
                  fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:300,fontSize:15,lineHeight:1.9,
                  color:"#6A8A9A",maxWidth:400,marginBottom:28,
                }}>
                  12 вопросов. Честная картина того, что с вами происходит прямо сейчас. И конкретный следующий шаг.
                </p>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:32}}>
                  {["Физическое состояние","Нервная система","Уровень ресурса"].map(tag=>(
                    <span key={tag} style={{
                      border:`1px solid ${C.p}22`,borderRadius:100,
                      padding:"5px 14px",fontSize:9,
                      letterSpacing:"0.15em",color:C.dim,
                      textTransform:"uppercase",
                    }}>{tag}</span>
                  ))}
                </div>
                <button onClick={()=>setPhase("quiz")} style={{
                  padding:"13px 36px",
                  border:`1px solid ${C.p}55`,borderRadius:100,
                  background:C.p+"14",color:C.p,
                  fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:500,fontSize:10,
                  letterSpacing:"0.26em",textTransform:"uppercase",
                  cursor:"pointer",display:"block",marginBottom:10,
                }}>Начать</button>
                <div style={{
                  fontSize:9,color:C.dim,
                  letterSpacing:"0.2em",textTransform:"uppercase",
                }}>3 минуты, анонимно</div>
              </div>
            )}
            {/* ИНТРО (idle) */}
            {phase==="idle"&&(
              <div>
                <p style={{
                  fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:300,fontSize:15,
                  lineHeight:1.9,color:C.body,
                  maxWidth:400,marginBottom:28,
                }}>
                  6 вопросов о том, что ретриты забирают у вас лично. Результат — конкретное состояние и что с ним делать.
                </p>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:32}}>
                  {["Тело","Границы","Вектор"].map(tag=>(
                    <span key={tag} style={{
                      border:`1px solid ${C.p}22`,borderRadius:100,
                      padding:"5px 14px",fontSize:9,letterSpacing:"0.15em",
                      color:C.dim,textTransform:"uppercase",
                    }}>{tag}</span>
                  ))}
                </div>
                <button onClick={()=>setPhase("quiz")} style={{
                  padding:"12px 36px",
                  border:`1px solid ${C.p}88`,borderRadius:100,
                  background:C.p+"18",color:C.p,
                  fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:500,fontSize:11,
                  letterSpacing:"0.26em",textTransform:"uppercase",
                  cursor:"pointer",display:"block",marginBottom:10,
                }}>
                  Начать
                </button>
                <div style={{fontSize:9,color:C.dim,letterSpacing:"0.2em",textTransform:"uppercase"}}>
                  3 минуты, анонимно
                </div>
              </div>
            )}

            {/* КВИЗ */}
            {phase==="quiz"&&curQ&&(
              <div key={answers.length} style={{animation:"qFade 0.28s ease"}}>
                <div style={{
                  display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:14,
                }}>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <span style={{fontSize:9,letterSpacing:".38em",color:C.dim,textTransform:"uppercase"}}>
                      {curQ.block}
                    </span>
                    <span style={{fontSize:9,letterSpacing:".2em",color:C.dim+"55"}}>
                      {curQ.n}
                    </span>
                  </div>
                  {answers.length>0&&(
                    <button onClick={handleBack} style={{
                      fontSize:9,letterSpacing:"0.2em",color:C.dim,
                      textTransform:"uppercase",cursor:"pointer",
                      border:"none",background:"transparent",
                      fontFamily:"'Space Grotesk',sans-serif",
                    }}>← Назад</button>
                  )}
                </div>

                <div style={{
                  fontFamily:"'Space Grotesk',sans-serif",fontWeight:400,
                  fontSize:isMobile?"clamp(15px,4vw,19px)":"clamp(16px,2.4vw,20px)",
                  color:C.t,lineHeight:1.4,marginBottom:20,
                }}>
                  {curQ.text}
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {curQ.opts.map((opt,i)=>(
                    <button key={i}
                      onClick={()=>handleAnswer(opt)}
                      onMouseEnter={()=>setHovered(i)}
                      onMouseLeave={()=>setHovered(null)}
                      style={{
                        padding:"14px 17px",
                        border:`1px solid ${hovered===i?stColor+"55":C.p+"28"}`,
                        borderRadius:11,
                        background:hovered===i?stColor+"0D":C.surf+"44",
                        color:hovered===i?C.t:C.body,
                        fontFamily:"'Inter',sans-serif",
                        fontWeight:300,fontSize:13,lineHeight:1.6,
                        textAlign:"left",cursor:"pointer",transition:"all .16s",
                      }}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* РЕЗУЛЬТАТ */}
            {phase==="result"&&(
              <div style={{animation:"rFade 0.4s ease"}}>
                <div style={{
                  fontSize:9,letterSpacing:".45em",
                  color:resultSt.color,textTransform:"uppercase",marginBottom:10,
                }}>
                  {resultSt.code}
                </div>
                <h3 style={{
                  fontFamily:"'Space Grotesk',sans-serif",
                  fontWeight:700,letterSpacing:"-.02em",
                  fontSize:isMobile?"clamp(18px,5vw,28px)":"clamp(20px,3.2vw,32px)",
                  color:C.t,margin:"0 0 6px",
                }}>
                  {resultSt.name}
                </h3>
                <div style={{fontSize:13,color:resultSt.color+"CC",marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>
                  {resultSt.sub}
                </div>

                <p style={{
                  fontFamily:"'Space Grotesk',sans-serif",fontWeight:300,
                  fontSize:14,lineHeight:1.85,color:C.body,
                  marginBottom:24,maxWidth:420,
                }}>
                  {resultSt.body}
                </p>

                {/* ЧТО МОЖЕТ ПОМОЧЬ — два равноценных пути */}
                <div style={{
                  fontSize:9,letterSpacing:"0.3em",
                  color:C.dim,textTransform:"uppercase",
                  margin:"0 0 12px",
                }}>
                  Что может помочь
                </div>

                <div style={{
                  display:"grid",
                  gridTemplateColumns:isMobile?"1fr":"1fr 1fr",
                  gap:12,marginBottom:20,
                }}>
                  {/* НА МЕСТЕ — личная забота, не модульный конструктор */}
                  <div style={{
                    border:`1px solid ${resultSt.color}4D`,borderRadius:16,
                    padding:"18px 18px 16px",
                    background:`linear-gradient(135deg, ${resultSt.color}0F, ${resultSt.color}03)`,
                    display:"flex",flexDirection:"column",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}>
                      <span style={{fontSize:13}}>🏝</span>
                      <span style={{
                        fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,
                        fontSize:9,letterSpacing:".2em",color:resultSt.color,textTransform:"uppercase",
                      }}>На месте</span>
                    </div>
                    <div style={{
                      display:"inline-flex",alignItems:"center",gap:5,
                      background:resultSt.color+"1F",border:`1px solid ${resultSt.color}55`,
                      borderRadius:100,padding:"4px 10px",marginBottom:12,width:"fit-content",
                    }}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:resultSt.color}}/>
                      <span style={{
                        fontFamily:"'Space Grotesk',sans-serif",fontSize:8,letterSpacing:".12em",
                        color:resultSt.color,textTransform:"uppercase",fontWeight:500,
                      }}>Личная забота · Tier 1</span>
                    </div>
                    <div style={{
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:13,
                      color:C.t,marginBottom:6,
                    }}>
                      {resultSt.synergy}
                    </div>
                    <div style={{
                      fontSize:11,color:C.dim,lineHeight:1.55,marginBottom:12,flexGrow:1,
                      fontFamily:"'Inter',sans-serif",
                    }}>
                      {resultSt.bali}
                    </div>
                    <a
                      href={`https://wa.me/6281339630129?text=${encodeURIComponent(
                        `Здравствуйте! Организую ретрит на Бали.\n\nПрошёл диагностику i11ume: ${resultSt.code} — ${resultSt.name}.\nХочу обсудить личную заботу (Tier 1) на время моего ретрита.`
                      )}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                        padding:"10px 16px",border:`1px solid ${resultSt.color}77`,borderRadius:100,
                        background:resultSt.color+"16",color:resultSt.color,
                        fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:9.5,
                        letterSpacing:"0.14em",textTransform:"uppercase",textDecoration:"none",
                      }}>
                      Обсудить заботу о вас →
                    </a>
                  </div>

                  {/* МЕЖДУ СЕССИЯМИ — мобильный кокон на вилле */}
                  <div style={{
                    border:`1px solid ${C.p}48`,borderRadius:16,
                    padding:"18px 18px 16px",
                    background:`linear-gradient(135deg, ${C.p}0F, ${C.p}03)`,
                    display:"flex",flexDirection:"column",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:11}}>
                      <span style={{fontSize:13}}>🎧</span>
                      <span style={{
                        fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,
                        fontSize:9,letterSpacing:".2em",color:C.p,textTransform:"uppercase",
                      }}>Между сессиями</span>
                    </div>
                    <div style={{
                      display:"inline-flex",alignItems:"center",gap:5,
                      background:C.p+"1A",border:`1px solid ${C.p}4D`,
                      borderRadius:100,padding:"4px 10px",marginBottom:12,width:"fit-content",
                    }}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:C.p}}/>
                      <span style={{
                        fontFamily:"'Space Grotesk',sans-serif",fontSize:8,letterSpacing:".12em",
                        color:C.p,textTransform:"uppercase",fontWeight:500,
                      }}>Мобильный кокон · скоро</span>
                    </div>
                    <div style={{
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:13,
                      color:C.t,marginBottom:6,
                    }}>
                      {resultSt.track.name}
                    </div>
                    <div style={{
                      fontSize:11,color:C.dim,lineHeight:1.55,marginBottom:12,flexGrow:1,
                      fontFamily:"'Inter',sans-serif",
                    }}>
                      {resultSt.remote}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                      <div style={{
                        display:"flex",alignItems:"center",gap:4,
                        background:C.bg+"99",border:`1px solid ${C.dim}3A`,
                        borderRadius:100,padding:"4px 9px",
                      }}>
                        <span style={{fontSize:10}}>🌀</span>
                        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:9.5,color:C.t}}>
                          {resultSt.track.bundle?"2 трека":"1 трек"}
                        </span>
                      </div>
                    </div>
                    <button onClick={()=>setShowWaitlist(true)} style={{
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                      padding:"10px 16px",border:`1px solid ${C.p}88`,borderRadius:100,
                      background:C.p+"18",color:C.p,
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:9.5,
                      letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",
                    }}>
                      Узнать о запуске →
                    </button>
                    {resultSt.track.bundle&&(
                      <div style={{
                        marginTop:8,fontSize:9.5,color:C.dim+"99",
                        fontFamily:"'Inter',sans-serif",fontStyle:"italic",
                      }}>
                        Бандл из двух протоколов — последовательность важна
                      </div>
                    )}
                  </div>
                </div>

                {/* Тихий апселл — группа целиком */}
                <div style={{
                  display:"flex",alignItems:"center",gap:8,
                  marginBottom:18,flexWrap:"wrap",
                }}>
                  <span style={{
                    fontSize:11.5,color:C.dim+"BB",lineHeight:1.6,
                    fontFamily:"'Inter',sans-serif",
                  }}>
                    Планируете привезти группу целиком? Мы берём на себя и логистику —
                  </span>
                  <a
                    onClick={e=>{e.preventDefault();document.getElementById("tiers-section")?.scrollIntoView({behavior:"smooth"});}}
                    href="#tiers-section"
                    style={{
                      fontSize:11.5,color:C.cy,cursor:"pointer",
                      fontFamily:"'Inter',sans-serif",
                      textDecoration:"none",
                      borderBottom:`1px solid ${C.cy}55`,
                    }}>
                    три уровня поддержки ↑
                  </a>
                </div>

                <div style={{
                  display:"flex",alignItems:isMobile?"flex-start":"center",
                  justifyContent:"space-between",flexDirection:isMobile?"column":"row",
                  gap:14,
                  borderTop:`1px solid ${C.dim}24`,paddingTop:18,marginBottom:18,
                }}>
                  <div style={{
                    fontSize:11.5,color:C.dim,lineHeight:1.6,maxWidth:340,
                    fontFamily:"'Inter',sans-serif",
                  }}>
                    Не уверены что выбрать? 20 минут с Нади, бесплатно — разберём именно ваш случай.
                  </div>
                  <button onClick={()=>setShowForm(true)} style={{
                    flexShrink:0,padding:"10px 20px",
                    border:`1px solid ${C.gold}55`,borderRadius:100,
                    background:C.gold+"12",color:C.gold,
                    fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:9.5,
                    letterSpacing:"0.16em",textTransform:"uppercase",
                    cursor:"pointer",whiteSpace:"nowrap",
                  }}>
                    Написать в WhatsApp
                  </button>
                </div>

                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <a href={`https://wa.me/6281339630129?text=${encodeURIComponent(
                    `Здравствуйте. Результат диагностики i11ume: ${resultSt.code}. Хочу записаться.`
                  )}`}
                    target="_blank" rel="noreferrer" style={{
                      padding:"11px 24px",
                      border:`1px solid ${resultSt.color}44`,borderRadius:100,
                      background:"transparent",color:resultSt.color,
                      fontFamily:"'Space Grotesk',sans-serif",
                      fontWeight:500,fontSize:10,letterSpacing:"0.2em",
                      textTransform:"uppercase",textDecoration:"none",
                    }}>
                    Написать напрямую
                  </a>
                  <button onClick={reset} style={{
                    padding:"11px 22px",
                    border:`1px solid ${C.dim}32`,borderRadius:100,
                    background:"transparent",color:C.dim,
                    fontFamily:"'Space Grotesk',sans-serif",
                    fontWeight:400,fontSize:10,letterSpacing:"0.2em",
                    textTransform:"uppercase",cursor:"pointer",
                  }}>
                    Заново
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/* ═══ APP ════════════════════════════════════════════════ */
/* ═══ ТИРЫ — уровни поддержки фасилитатора ═══════════════ */
const TIERS = [
  {
    n:"01",
    name:"Личная забота",
    tag:"Входит всегда",
    price:"от $400",
    desc:"Наш сигнатурный слой. Работает даже если всё остальное вы решаете сами.",
    items:[
      "Встреча в аэропорту",
      "Баня и массаж по приезду",
      "Личный протокол между вашими сессиями с группой",
      "Легалити лично для вас, если нужно",
    ],
    accent:C.p,
  },
  {
    n:"02",
    name:"Курирование",
    tag:"Мы на связи, не операторы",
    price:"от $1200",
    desc:"Проверенная сеть вместо поиска вслепую. Бронируете сами — с нашими контактами и рекомендациями.",
    items:[
      "Виллы и площадки из нашей базы",
      "Проверенный персонал — повара, водители, помощники",
      "Всё что входит в Tier 1",
    ],
    accent:C.cy,
  },
  {
    n:"03",
    name:"Полное сопровождение",
    tag:"Для тех кто не хочет думать об этом вообще",
    price:"по запросу",
    desc:"Операционная часть группы — на нас. Чёткие границы ответственности, прозрачный бюджет.",
    items:[
      "Полная логистика группы",
      "Координация на месте весь ретрит",
      "Всё что входит в Tier 1 и 2",
    ],
    accent:C.gold,
  },
];

function Tiers({isMobile}){
  const [mounted,setMounted] = useState(false);
  const [hovT,setHovT] = useState(null);
  const ref = useRef(null);

  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{
      if(e.isIntersecting) setMounted(true);
    },{threshold:0.15});
    if(ref.current) obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);

  return(
    <section id="tiers-section" ref={ref} style={{
      position:"relative",
      padding:isMobile?"96px 20px 80px":"140px 56px 120px",
      boxSizing:"border-box",
      background:C.surf,
      clipPath:isMobile
        ?"polygon(0 40px, 100% 0, 100% 100%, 0 100%)"
        :"polygon(0 90px, 100% 0, 100% 100%, 0 100%)",
      marginTop:isMobile?"-40px":"-90px",
    }}>
      <div style={{
        opacity:mounted?1:0,
        transform:mounted?"translateY(0)":"translateY(20px)",
        transition:`opacity 800ms ${EASE}, transform 800ms ${EASE}`,
        marginBottom:isMobile?36:52,
        maxWidth:560,
      }}>
        <div style={{
          fontSize:9,letterSpacing:"0.35em",color:C.dim,
          textTransform:"uppercase",marginBottom:14,
          fontFamily:"'Space Grotesk',sans-serif",
        }}>
          Уровни поддержки
        </div>
        <h2 style={{
          fontFamily:"'Fraunces',serif",fontWeight:500,
          fontSize:isMobile?"clamp(26px,7vw,36px)":"clamp(32px,3vw,44px)",
          letterSpacing:"-0.015em",color:C.t,lineHeight:1.1,marginBottom:14,
        }}>
          Вы решаете сколько передать нам.
        </h2>
        <p style={{
          fontFamily:"'Inter',sans-serif",fontWeight:300,fontSize:13.5,
          color:C.dim,lineHeight:1.7,
        }}>
          Мы не берём вашу группу под управление по умолчанию. Мы начинаем с заботы о вас — дальше вы сами выбираете, сколько операционной части хотите передать.
        </p>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:isMobile?"1fr":"repeat(3, 1fr)",
        gap:isMobile?16:20,
      }}>
        {TIERS.map((t,i)=>{
          const hov = hovT===i;
          // Асимметричный въезд: слева / снизу-крупнее / справа
          const fromX = i===0?-36:i===2?36:0;
          const fromY = i===1?34:14;
          const delay = i===0?0:i===1?160:80;
          const dur = i===1?900:760;
          return(
            <div key={i}
              onMouseEnter={()=>setHovT(i)}
              onMouseLeave={()=>setHovT(null)}
              style={{
                opacity:mounted?1:0,
                transform:mounted
                  ?"translate(0,0)"
                  :`translate(${fromX}px,${fromY}px)`,
                transition:`opacity ${dur}ms ${EASE} ${delay}ms, transform ${dur}ms ${EASE} ${delay}ms, border-color 300ms ease, background 300ms ease`,
                position:"relative",
                borderTop:`1px solid ${hov?t.accent+"77":C.dim+"22"}`,
                borderRight:`1px solid ${hov?t.accent+"77":C.dim+"22"}`,
                borderBottom:`1px solid ${hov?t.accent+"77":C.dim+"22"}`,
                borderLeft:`2px solid ${t.accent}${hov?"CC":"55"}`,
                borderRadius:"4px 20px 20px 4px",
                padding:isMobile?"24px 22px":"28px 26px",
                background:hov?`${t.accent}0A`:`${C.surf}66`,
                overflow:"hidden",
              }}
            >
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                marginBottom:18,
              }}>
                <div style={{
                  fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,
                  color:C.t,
                }}>
                  {t.name}
                </div>
                <span style={{
                  fontFamily:"'Space Grotesk',sans-serif",fontSize:8,
                  letterSpacing:"0.14em",color:C.dim,textTransform:"uppercase",
                  border:`1px solid ${C.dim}33`,borderRadius:100,
                  padding:"3px 9px",textAlign:"right",whiteSpace:"nowrap",
                  flexShrink:0,marginLeft:10,
                }}>
                  {t.tag}
                </span>
              </div>

              <div style={{
                fontFamily:"'Space Grotesk',sans-serif",fontSize:13,
                color:t.accent,marginBottom:14,
              }}>
                {t.price}
              </div>
              <p style={{
                fontFamily:"'Inter',sans-serif",fontWeight:300,fontSize:12,
                color:C.dim,lineHeight:1.6,marginBottom:18,
              }}>
                {t.desc}
              </p>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {t.items.map((item,j)=>(
                  <div key={j} style={{
                    display:"flex",alignItems:"flex-start",gap:8,
                  }}>
                    <span style={{
                      color:t.accent,fontSize:11,marginTop:2,flexShrink:0,
                    }}>—</span>
                    <span style={{
                      fontFamily:"'Inter',sans-serif",fontWeight:300,fontSize:12,
                      color:C.body,lineHeight:1.5,
                    }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        opacity:mounted?1:0,
        transition:`opacity 1000ms ${EASE} 500ms`,
        marginTop:isMobile?32:44,
        display:"flex",alignItems:"center",gap:14,
        flexWrap:"wrap",
      }}>
        <a href="https://wa.me/6281339630129?text=Здравствуйте!%20Организую%20ретрит%20на%20Бали%2C%20хочу%20обсудить%20уровни%20поддержки%20i11ume."
          target="_blank" rel="noreferrer"
          style={{
            padding:"12px 26px",
            border:`1px solid ${C.p}77`,borderRadius:100,
            background:C.p+"14",color:C.p,
            fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:11,
            letterSpacing:"0.16em",textTransform:"uppercase",
            textDecoration:"none",
          }}>
          Обсудить ваш ретрит →
        </a>
        <span style={{
          fontFamily:"'Inter',sans-serif",fontWeight:300,fontSize:12,
          color:C.dim+"99",
        }}>
          Ответим в течение дня
        </span>
      </div>
    </section>
  );
}

export default function App(){
  const [phase,setPhase]=useState("idle");
  const [answers,setAnswers]=useState([]);
  const isMobile=useIsMobile();
  const scannerRef=useRef(null);

  useEffect(()=>{
    const l=document.createElement("link");
    l.rel="stylesheet";l.href=FONTS;
    document.head.appendChild(l);
    const s=document.createElement("style");
    s.textContent=KEYS;
    document.head.appendChild(s);
    return()=>{
      try{document.head.removeChild(l);}catch(e){}
      try{document.head.removeChild(s);}catch(e){}
    };
  },[]);

  const startQuiz=()=>{
    setPhase("quiz");
    setAnswers([]);
    setTimeout(()=>{
      scannerRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
    },50);
  };

  return(
    <div style={{background:C.bg,color:C.t,minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>
      <Nav isMobile={isMobile}/>
      <Hero onStart={startQuiz} isMobile={isMobile}/>
      <Tiers isMobile={isMobile}/>
      <div ref={scannerRef}>
        <Scanner
          phase={phase}
          setPhase={setPhase}
          answers={answers}
          setAnswers={setAnswers}
          isMobile={isMobile}/>
      </div>
    </div>
  );
}
