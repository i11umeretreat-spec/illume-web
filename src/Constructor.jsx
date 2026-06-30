import { useState, useEffect, useMemo } from "react";

/* ═══ ДИЗАЙН-СИСТЕМА (та же что в App.jsx) ═══════════════ */
const C = {
  bg:"#0A1420", surf:"#0E1A2A",
  p:"#FF6B4A",
  cy:"#3DBFA8",
  s:"#7B4FE8", a:"#FF6B4A",
  t:"#EAE2D6",
  dim:"#6A7E92",
  gold:"#E0A93A",
  body:"#9AAEBE",
};
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* ═══ МОДУЛИ — перенесены из старого конструктора ═══════ */
const MODULES = [
  { id:"banya",   name:"Аутентичная баня",      category:"i11ume Core", type:"core",
    desc:"Терапевтический контраст для неокортекса. Выпариваем кортизольный спазм из фасций эвкалиптовыми вениками.",
    master:"i11ume Founders", time:2.5, price:2500, icon:"🔥" },
  { id:"havan",   name:"Ритуал Огня (Хаван)",    category:"i11ume Core", type:"core",
    desc:"Кнопка «Delete» для психики. Сжигаем старые гештальты и освобождаем оперативную память.",
    master:"Nadi", time:2, price:1500, icon:"⚡" },
  { id:"melukat", name:"Церемония Мелукат",      category:"i11ume Core", type:"core",
    desc:"Гидро-релиз блуждающего нерва на святых источниках. Смываем эмпатический перегруз.",
    master:"Local Priest", time:3, price:1500, icon:"💧" },
  { id:"topo",    name:"Сакральная Топография",  category:"Syndicate", type:"syn",
    desc:"Сенсорная депривация в дикой природе. Восстановление перегруженных дофаминовых рецепторов.",
    master:"Guest Guide", time:5, price:3000, icon:"🌿" },
  { id:"dance",   name:"Соматический Танец",     category:"Syndicate", type:"syn",
    desc:"Интуитивная распаковка застрявших эмоций. Здесь можно — и нужно — выглядеть странно.",
    master:"Guest Master", time:2, price:2000, icon:"🌊" },
  { id:"breath",  name:"Клиническое Дыхание",    category:"Syndicate", type:"syn",
    desc:"Глубокая нейромодуляция через работу с CO2. Легальный выход за пределы защитных механизмов ума.",
    master:"Guest Master", time:1.5, price:1800, icon:"🌬️" },
  { id:"voice",   name:"Интеграция Голоса",      category:"Syndicate", type:"syn",
    desc:"Снятие горловых блоков. Возвращаем право на здоровую злость, громкость и масштаб.",
    master:"Guest Master", time:1.5, price:1800, icon:"🗣️" },
];

function getDiscount(peopleCount, promoActive){
  let base = 0;
  if(peopleCount===2) base=0.10;
  else if(peopleCount===3) base=0.25;
  else if(peopleCount>=4) base=0.50;
  if(promoActive) base += 0.10;
  return Math.min(base, 0.50);
}

function calculateSynergy(sel){
  if(sel.length===0) return null;
  const has=id=>sel.includes(id);
  if(has("banya")&&has("havan")&&has("melukat")) return "Архитектура Возрождения: Полный сброс";
  if(has("banya")&&has("havan")) return "День Огня: Тотальное очищение";
  if(has("topo")&&has("melukat")) return "Сакральная Экспедиция: Элемент Воды";
  if(has("breath")&&has("voice")) return "Нейро-Вокальная Интеграция";
  if(sel.length>3) return "Сложный ретрит: Архитектура состояний";
  return "Индивидуальный соматический контур";
}

function useIsMobile(){
  const [m,setM]=useState(typeof window!=="undefined"&&window.innerWidth<760);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<760);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return m;
}

export default function Constructor(){
  const isMobile = useIsMobile();
  const params = useMemo(()=>new URLSearchParams(window.location.search),[]);
  const promoActive = params.get("promo")==="10";
  const presetParam = params.get("modules");

  const [selected,setSelected] = useState(()=>presetParam?presetParam.split(","):[]);
  const [people,setPeople] = useState(1);
  const [mounted,setMounted] = useState(false);

  useEffect(()=>{ setMounted(true); },[]);

  const toggle = id=>{
    setSelected(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  };

  const cart = selected.map(id=>MODULES.find(m=>m.id===id)).filter(Boolean);
  const totalTime = cart.reduce((a,m)=>a+m.time,0);
  const basePrice = cart.reduce((a,m)=>a+m.price,0);
  const subtotal = basePrice * people;
  const discount = getDiscount(people, promoActive);
  const finalPrice = Math.round(subtotal - subtotal*discount);
  const synergy = calculateSynergy(selected);

  const sendToWA = ()=>{
    let msg = `Здравствуйте, i11ume! Заявка на сборку протокола.\n\n`;
    if(promoActive) msg += `🎁 Промокод сферы активен: −10%\n\n`;
    msg += `Участников: ${people}\n`;
    if(synergy) msg += `Синергия: ${synergy}\n\n`;
    msg += `Модули:\n`;
    cart.forEach(m=>{ msg += `— ${m.name}\n`; });
    msg += `\nБюджет: ${finalPrice}k IDR\nЖду ответа консьержа!`;
    window.open(`https://wa.me/6281339630129?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const anim = (delay=0)=>({
    opacity:mounted?1:0,
    transform:mounted?"translateY(0)":"translateY(16px)",
    transition:`opacity 700ms ${EASE} ${delay}ms, transform 700ms ${EASE} ${delay}ms`,
  });

  return(
    <div style={{
      background:C.bg, color:C.t, minHeight:"100vh",
      fontFamily:"'Inter',sans-serif",
    }}>
      <style>{`
        @keyframes ctorGrain{0%{transform:translate(0,0)}100%{transform:translate(-4%,-4%)}}
        .mod-card{transition:border-color 280ms ${EASE}, background 280ms ${EASE}, transform 280ms ${EASE};}
        .mod-card:hover{transform:translateY(-2px);}
      `}</style>

      {/* Nav */}
      <nav style={{
        position:"sticky",top:0,zIndex:50,
        display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:isMobile?"14px 20px":"16px 48px",
        background:`${C.bg}E8`,backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",
        borderBottom:`1px solid ${C.gold}1A`,
      }}>
        <a href="/" style={{
          fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,
          fontSize:15,letterSpacing:"0.12em",color:C.gold,textDecoration:"none",
        }}>i11ume</a>
        <a href="/" style={{
          fontFamily:"'Space Grotesk',sans-serif",fontSize:9,letterSpacing:"0.2em",
          color:C.dim,textDecoration:"none",textTransform:"uppercase",
        }}>← К результату</a>
      </nav>

      <div style={{
        maxWidth:1180,margin:"0 auto",
        padding:isMobile?"36px 20px 80px":"56px 48px 100px",
      }}>
        {/* Заголовок */}
        <div style={{...anim(0),marginBottom:isMobile?28:40}}>
          <div style={{
            fontFamily:"'Space Grotesk',sans-serif",fontSize:9,letterSpacing:"0.3em",
            color:C.dim,textTransform:"uppercase",marginBottom:14,
          }}>
            Конструктор протокола
          </div>
          <h1 style={{
            fontFamily:"'Fraunces',serif",fontWeight:500,
            fontSize:isMobile?"clamp(32px,9vw,44px)":"clamp(40px,4.4vw,58px)",
            letterSpacing:"-0.02em",color:C.t,marginBottom:14,lineHeight:1.04,
          }}>
            Соберите своё
          </h1>
          <p style={{
            fontFamily:"'Inter',sans-serif",fontWeight:300,fontSize:13.5,
            color:C.dim,maxWidth:480,lineHeight:1.7,
          }}>
            {presetParam
              ? "Модули уже подобраны под ваш результат диагностики. Можно оставить как есть или донастроить вручную."
              : "Выберите модули которые нужны именно сейчас. Систему мгновенно рассчитает время, синергию и бюджет."}
          </p>
        </div>

        {/* Промо-баннер */}
        {promoActive&&(
          <div style={{
            ...anim(150),
            display:"flex",alignItems:"center",gap:12,
            background:`${C.cy}14`,border:`1px solid ${C.cy}4D`,
            borderRadius:14,padding:"14px 20px",marginBottom:32,maxWidth:480,
          }}>
            <span style={{fontSize:18}}>✨</span>
            <div>
              <div style={{
                fontFamily:"'Space Grotesk',sans-serif",fontSize:9.5,letterSpacing:"0.16em",
                color:C.cy,textTransform:"uppercase",fontWeight:600,marginBottom:2,
              }}>
                Промокод сферы активен
              </div>
              <div style={{fontSize:11.5,color:C.dim,fontFamily:"'Inter',sans-serif"}}>
                Дополнительная скидка 10% применена к финальной цене
              </div>
            </div>
          </div>
        )}

        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile?"1fr":"2fr 1fr",
          gap:isMobile?28:36,alignItems:"start",
        }}>
          {/* Сетка модулей */}
          <div style={{
            display:"grid",
            gridTemplateColumns:isMobile?"1fr":"1fr 1fr",
            gap:16,
          }}>
            {MODULES.map((m,i)=>{
              const active = selected.includes(m.id);
              return(
                <div key={m.id}
                  className="mod-card"
                  onClick={()=>toggle(m.id)}
                  style={{
                    ...anim(200+i*60),
                    background: active ? `${C.cy}0D` : `${C.surf}80`,
                    border:`1px solid ${active?C.cy+"8C":C.dim+"30"}`,
                    borderRadius:18,padding:22,cursor:"pointer",position:"relative",
                  }}
                >
                  <div style={{
                    position:"absolute",top:18,right:18,width:20,height:20,borderRadius:"50%",
                    border:`1px solid ${active?C.cy:C.dim+"55"}`,
                    background: active ? `${C.cy}26` : "transparent",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transition:`all 280ms ${EASE}`,
                  }}>
                    {active&&<span style={{color:C.cy,fontSize:11}}>✓</span>}
                  </div>

                  <div style={{fontSize:24,marginBottom:14}}>{m.icon}</div>
                  <div style={{
                    display:"inline-block",
                    fontFamily:"'Space Grotesk',sans-serif",fontSize:8,letterSpacing:"0.16em",
                    textTransform:"uppercase",color:C.gold,
                    border:`1px solid ${C.gold}4D`,borderRadius:100,
                    padding:"3px 9px",marginBottom:12,
                  }}>
                    {m.category}
                  </div>
                  <div style={{
                    fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:16,
                    color:C.t,marginBottom:8,
                  }}>
                    {m.name}
                  </div>
                  <div style={{
                    fontSize:11,color:C.dim,lineHeight:1.6,marginBottom:16,
                    fontFamily:"'Inter',sans-serif",fontWeight:300,
                  }}>
                    {m.desc}
                  </div>
                  <div style={{
                    display:"flex",justifyContent:"space-between",
                    borderTop:`1px solid ${C.dim}26`,paddingTop:12,
                    fontFamily:"'Space Grotesk',sans-serif",fontSize:9.5,
                    color:C.dim+"BB",textTransform:"uppercase",
                  }}>
                    <span>⏱ {m.time} ч</span>
                    <span>{m.price}k IDR / чел</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary sidebar */}
          <div style={{
            ...anim(300),
            position:isMobile?"static":"sticky",top:90,
            background:`${C.surf}A0`,border:`1px solid ${C.dim}2A`,
            borderRadius:20,padding:26,
          }}>
            <div style={{
              fontFamily:"'Space Grotesk',sans-serif",fontSize:9.5,letterSpacing:"0.2em",
              color:C.gold,textTransform:"uppercase",marginBottom:18,
              borderBottom:`1px solid ${C.gold}26`,paddingBottom:14,
            }}>
              Ваш протокол
            </div>

            {cart.length===0?(
              <p style={{
                fontSize:12.5,color:C.dim,fontStyle:"italic",
                fontFamily:"'Inter',sans-serif",marginBottom:8,
              }}>
                Выберите модули слева для начала сборки.
              </p>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                {cart.map(m=>(
                  <div key={m.id} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:C.bg+"99",border:`1px solid ${C.dim}26`,
                    borderRadius:10,padding:"10px 12px",
                  }}>
                    <div>
                      <div style={{fontSize:12,color:C.t,fontFamily:"'Inter',sans-serif",marginBottom:2}}>
                        {m.name}
                      </div>
                      <div style={{
                        fontFamily:"'Space Grotesk',sans-serif",fontSize:8.5,
                        color:C.dim,textTransform:"uppercase",
                      }}>
                        {m.master}
                      </div>
                    </div>
                    <div style={{
                      fontFamily:"'Space Grotesk',sans-serif",fontSize:10.5,color:C.cy,
                    }}>
                      {m.time}ч
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length>0&&(
              <>
                <div style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"14px 0",borderTop:`1px solid ${C.dim}26`,
                  fontSize:12.5,color:C.dim,fontFamily:"'Inter',sans-serif",
                }}>
                  <span>Участников</span>
                  <div style={{
                    display:"flex",alignItems:"center",gap:10,
                    background:C.bg,border:`1px solid ${C.dim}3A`,
                    borderRadius:10,padding:"4px 6px",
                  }}>
                    <button onClick={()=>setPeople(p=>Math.max(1,p-1))} style={{
                      width:24,height:24,borderRadius:6,border:"none",
                      background:C.dim+"22",color:C.t,cursor:"pointer",fontSize:13,
                    }}>−</button>
                    <span style={{
                      fontFamily:"'Space Grotesk',sans-serif",color:C.t,
                      width:14,textAlign:"center",fontSize:12,
                    }}>{people}</span>
                    <button onClick={()=>setPeople(p=>p+1)} style={{
                      width:24,height:24,borderRadius:6,border:"none",
                      background:C.dim+"22",color:C.t,cursor:"pointer",fontSize:13,
                    }}>+</button>
                  </div>
                </div>

                {synergy&&(
                  <div style={{
                    margin:"4px 0 16px",padding:"13px 15px",borderRadius:12,
                    border:`1px solid ${C.gold}3D`,background:`${C.gold}0D`,
                  }}>
                    <div style={{
                      fontFamily:"'Space Grotesk',sans-serif",fontSize:8,letterSpacing:"0.16em",
                      color:C.gold,textTransform:"uppercase",marginBottom:6,
                    }}>
                      Смысловая синергия
                    </div>
                    <div style={{
                      fontFamily:"'Fraunces',serif",fontSize:13,color:C.t,lineHeight:1.4,
                    }}>
                      {synergy}
                    </div>
                  </div>
                )}

                <div style={{
                  display:"flex",justifyContent:"space-between",fontSize:11.5,
                  color:C.dim,marginBottom:6,fontFamily:"'Inter',sans-serif",
                }}>
                  <span>Тайминг</span><span style={{color:C.t}}>{totalTime} ч</span>
                </div>
                {discount>0&&(
                  <div style={{
                    display:"flex",justifyContent:"space-between",fontSize:11.5,
                    color:C.dim,marginBottom:6,fontFamily:"'Inter',sans-serif",
                  }}>
                    <span>Скидка</span><span style={{color:C.cy}}>−{Math.round(discount*100)}%</span>
                  </div>
                )}

                <div style={{
                  display:"flex",justifyContent:"space-between",alignItems:"baseline",
                  paddingTop:14,marginTop:8,borderTop:`1px solid ${C.dim}26`,
                }}>
                  <span style={{fontSize:11.5,color:C.dim,fontFamily:"'Inter',sans-serif"}}>Бюджет</span>
                  <div style={{textAlign:"right"}}>
                    {discount>0&&(
                      <div style={{
                        fontSize:10.5,color:C.dim+"77",textDecoration:"line-through",
                        fontFamily:"'Space Grotesk',sans-serif",marginBottom:2,
                      }}>
                        {subtotal}k IDR
                      </div>
                    )}
                    <div style={{
                      fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:21,color:C.cy,
                    }}>
                      {finalPrice}k IDR
                    </div>
                  </div>
                </div>

                <button onClick={sendToWA} style={{
                  width:"100%",marginTop:18,padding:14,border:"none",borderRadius:100,
                  background:C.cy,color:C.bg,
                  fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,
                  letterSpacing:"0.18em",textTransform:"uppercase",cursor:"pointer",
                }}>
                  Отправить в WhatsApp →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
