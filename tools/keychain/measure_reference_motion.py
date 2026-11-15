import asyncio, json
from playwright.async_api import async_playwright
JS_SETUP = """() => {
  const els=[...document.querySelectorAll('img')].filter(i=>/1200&height=1200/.test(i.src)).slice(0,6).map(i=>i.parentElement.parentElement);
  window.__els=els; window.__log=[]; window.__t0=performance.now(); window.__last=els.map(()=> '');
  const tick=()=>{els.forEach((e,i)=>{const m=getComputedStyle(e).transform; if(m!==window.__last[i]){window.__last[i]=m; window.__log.push([Math.round(performance.now()-window.__t0),i,m, e.style.transform])}}); requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
  return els.map(e=>[e.className, e.getAttribute('style'), JSON.stringify(e.getBoundingClientRect())]);
}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.goto('https://www.wildyriftian.com/',wait_until='networkidle',timeout=60000); await pg.wait_for_timeout(4000)
        info=await pg.evaluate(JS_SETUP); print(json.dumps(info,indent=0)[:3000])
        await pg.mouse.move(50,850); await pg.wait_for_timeout(4000)
        idle=await pg.evaluate("()=>{const l=window.__log; window.__log=[]; window.__t0=performance.now(); return l}")
        json.dump(idle,open('/tmp/wr_idle.json','w'))
        # hover zones: find any elements on top of the keychain area that react to hover
        hz=await pg.evaluate("""()=>{const out=[];for(let x=300;x<=1140;x+=20){const e=document.elementFromPoint(x,600);out.push([x,e.tagName,(e.className+'').slice(0,50),JSON.stringify(e.getBoundingClientRect())])}return out}""")
        json.dump(hz,open('/tmp/wr_hz.json','w'))
        res={}
        for x in range(380,1080,40):
            await pg.mouse.move(50,850); await pg.wait_for_timeout(1500)
            await pg.evaluate("()=>{window.__log=[]; window.__t0=performance.now()}")
            await pg.mouse.move(x,600); await pg.wait_for_timeout(1600)
            res[x]=await pg.evaluate("()=>window.__log")
        json.dump(res,open('/tmp/wr_hover.json','w'))
        await b.close()
asyncio.run(main())
