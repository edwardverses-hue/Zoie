import asyncio, http.server, threading, functools, json
from playwright.async_api import async_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8876),functools.partial(Q,directory='/home/claude/zoie')); threading.Thread(target=srv.serve_forever,daemon=True).start()
U='http://127.0.0.1:8876/'
async def drag(pg,x0,y0,x1,y1,steps=12):
    # real touch drag via pointer events (what the site listens to)
    await pg.evaluate("""([x0,y0,x1,y1,n])=>new Promise(res=>{const t=document.elementFromPoint(x0,y0);const ev=(k,x,y)=>t.dispatchEvent(new PointerEvent(k,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));ev('pointerdown',x0,y0);let i=0;const f=()=>{i++;const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;ev('pointermove',x,y);if(i<n)requestAnimationFrame(f);else{ev('pointerup',x,y);res()}};requestAnimationFrame(f)})""",[x0,y0,x1,y1,steps])
async def run(p,name,eng,land=False):
    dev=dict(p.devices[name])
    if land: dev['viewport']={'width':dev['viewport']['height'],'height':dev['viewport']['width']}
    b=await getattr(p,eng).launch(); ctx=await b.new_context(**dev); pg=await ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
    tag=name.replace(' ','')+('_land' if land else '')
    W,H=dev['viewport']['width'],dev['viewport']['height']
    await pg.goto(U); await pg.wait_for_timeout(1800); await pg.screenshot(path=f'/tmp/mob/{tag}_1intro.png')
    await pg.wait_for_timeout(6500); await pg.screenshot(path=f'/tmp/mob/{tag}_2gallery.png')
    info=await pg.evaluate("""()=>({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,iw:innerWidth,ih:innerHeight,
      hdr:[...document.querySelectorAll('header > *')].map(e=>{const r=e.getBoundingClientRect();return [e.textContent.trim().slice(0,20),Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]}),
      head:(()=>{const r=document.getElementById('headline').getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]})(),
      mm:(()=>{const r=document.getElementById('minimap').getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]})(),
      hint:(()=>{const e=document.getElementById('hint');const r=e.getBoundingClientRect();return [e.textContent,getComputedStyle(e).opacity,Math.round(r.top),Math.round(r.bottom)]})(),
      zoom:getComputedStyle(document.getElementById('zoom')).display,
      fs:[...document.querySelectorAll('header a')].map(a=>getComputedStyle(a).fontSize)})""")
    await drag(pg,W*0.7,H*0.6,W*0.2,H*0.3); await pg.wait_for_timeout(900); await pg.screenshot(path=f'/tmp/mob/{tag}_3panned.png')
    for i in range(8): await drag(pg,W*0.8,H*0.8,W*0.1,H*0.1,6)
    await pg.wait_for_timeout(1200); await pg.screenshot(path=f'/tmp/mob/{tag}_4edge.png')
    # tap a photo near centre
    pt=await pg.evaluate("""()=>{const ps=[...document.querySelectorAll('#plane .photo')].map(e=>e.getBoundingClientRect()).filter(r=>r.left>20&&r.right<innerWidth-20&&r.top>90&&r.bottom<innerHeight-60);if(!ps.length)return null;const r=ps[0];return [r.left+r.width/2,r.top+r.height/2]}""")
    if pt:
        await pg.touchscreen.tap(pt[0],pt[1]); await pg.wait_for_timeout(900); await pg.screenshot(path=f'/tmp/mob/{tag}_5viewer.png')
        v=await pg.evaluate("()=>document.body.classList.contains('viewing')")
        await drag(pg,W*0.8,H*0.5,W*0.2,H*0.5); await pg.wait_for_timeout(700); await pg.screenshot(path=f'/tmp/mob/{tag}_6swipe.png')
        cl=await pg.query_selector('#viewer .close'); cb=await cl.bounding_box()
        await pg.touchscreen.tap(cb['x']+cb['width']/2,cb['y']+cb['height']/2); await pg.wait_for_timeout(700)
        v2=await pg.evaluate("()=>document.body.classList.contains('viewing')")
    else: v=v2='no photo'
    bl=await pg.query_selector('header a[data-view=birthday]'); bb=await bl.bounding_box()
    await pg.touchscreen.tap(bb['x']+bb['width']/2,bb['y']+bb['height']/2); await pg.wait_for_timeout(2000); await pg.screenshot(path=f'/tmp/mob/{tag}_7keychain.png')
    st=await pg.query_selector_all('.kc-strips span'); sb=await st[2].bounding_box()
    await pg.touchscreen.tap(sb['x']+sb['width']/2,sb['y']+sb['height']*0.5); await pg.wait_for_timeout(1300); await pg.screenshot(path=f'/tmp/mob/{tag}_8kctap.png')
    kc=await pg.evaluate("()=>{const r=document.getElementById('keychain').getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]}")
    gl=await pg.query_selector('header a[data-view=gallery]'); gb=await gl.bounding_box()
    await pg.touchscreen.tap(gb['x']+gb['width']/2,gb['y']+gb['height']/2); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'/tmp/mob/{tag}_9replay.png')
    replay=await pg.evaluate("()=>document.body.classList.contains('intro')")
    print(json.dumps({'dev':tag,'info':info,'viewer_opened':v,'viewer_closed':not v2 if v2!='no photo' else v2,'keychain':kc,'replaying':replay,'errors':errs}))
    await b.close()
async def main():
    async with async_playwright() as p:
        for n,e,l in [('iPhone SE','webkit',False),('iPhone 15','webkit',False),('iPhone 15 Pro Max','webkit',False),('Pixel 7','chromium',False),('iPhone 15','webkit',True)]:
            try: await run(p,n,e,l)
            except Exception as ex: print('FAIL',n,l,ex)
asyncio.run(main())
