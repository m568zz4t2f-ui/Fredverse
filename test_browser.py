"""Optional developer checks: Python + Playwright + installed Chromium. Not needed to play."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import json
import shutil
import threading
import tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
STATIC_BASE = ''

def load_page(page, url):
    # Managed Chromium blocks file:// by policy. Serve the exact standalone bytes,
    # then cut networking for solo; do not bypass the browser policy.
    page.context.set_offline(False)
    page.goto(url)
    page.context.set_offline(True)

def run():
    with sync_playwright() as pw, tempfile.TemporaryDirectory() as tmp:
        import sys
        if '--rtc-only' not in sys.argv:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            context = browser.new_context(viewport={'width':1440,'height':960}, accept_downloads=True)
            context.set_offline(True)
            page=context.new_page();errors=[];external=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
            load_page(page, STATIC_BASE+'/The-Fred-Verse.html')
            page.locator('#join-form button[type=submit]').click()
            page.wait_for_function('state && state.self.name === "Fred"')
            assert page.locator('#connection').inner_text()=='OFFLINE SOLO'
            start=page.evaluate('state.self.x')
            page.keyboard.down('d');page.wait_for_timeout(400);page.keyboard.up('d');page.wait_for_timeout(150)
            assert page.evaluate('state.self.x')>start+30
            page.keyboard.press('2');page.wait_for_timeout(150);assert 'Blue Blade' in page.locator('#weapon-name').inner_text()
            page.keyboard.press('i');before=page.evaluate('session.world.clock');page.wait_for_timeout(250)
            assert abs(page.evaluate('session.world.clock')-before)<.08,'Solo menus must pause simulation'
            page.get_by_role('button',name='Equip',exact=True).click();page.wait_for_timeout(150)
            assert page.evaluate('state.self.equipped.body')=='jersey'
            page.locator('#inventory [data-close]').click()
            # Use the same UI input state as the keyboard, with real-time ticks and collision.
            page.evaluate('''window.walkTo=async(x,y)=>{const end=performance.now()+12000;while(performance.now()<end){const p=state.self;if(Math.hypot(p.x-x,p.y-y)<9){keys.clear();return;}keys.clear();if(p.x<x-5)keys.add('d');if(p.x>x+5)keys.add('a');if(p.y<y-5)keys.add('s');if(p.y>y+5)keys.add('w');await new Promise(r=>setTimeout(r,35));}throw Error('Walking blocked to '+x+','+y+' at '+state.self.x+','+state.self.y);};void 0;''')
            def walk(x,y):page.evaluate('([x,y])=>walkTo(x,y)',[x,y])
            def interact():page.keyboard.press('e');page.wait_for_timeout(180)
            walk(430,230);walk(700,230);interact();assert page.evaluate('state.self.quest')==1
            walk(430,230);walk(440,610);interact();assert page.evaluate('state.self.zone')=='campus'
            walk(680,1705);walk(680,1210);walk(1155,1210);interact();assert page.evaluate('state.self.zone')=='gym'
            walk(680,440);interact();assert page.evaluate('!!state.boss')
            page.screenshot(path='/tmp/fredverse-browser-fight.png')
            page.evaluate('''async()=>{const start=performance.now();while(state.boss&&performance.now()-start<45000){const p=state.self,b=state.boss,age=(performance.now()-start)/1000,weapon=['nerf','saber','bat'][Math.floor(age/2)%3];if(p.weapon!==weapon)queue('weapon',weapon);const radius=weapon==='nerf'?190:60,tx=b.x+Math.cos(age*1.6)*radius,ty=b.y+Math.sin(age*1.6)*radius;keys.clear();if(p.x<tx-5)keys.add('d');if(p.x>tx+5)keys.add('a');if(p.y<ty-5)keys.add('s');if(p.y>ty+5)keys.add('w');aim=Math.atan2(b.y-p.y,b.x-p.x);attack=true;if(p.ammo===0&&p.reload<=0)queue('reload');if(p.hp<65&&p.chips>0&&p.heal_cd<=0)queue('heal');if(p.hp<=0)throw Error('Solo player downed');await new Promise(r=>setTimeout(r,60));}attack=false;keys.clear();if(state.boss)throw Error('Fight timeout');}''')
            assert page.evaluate('state.self.wins')==1
            walk(680,940);interact();walk(680,1210);walk(680,1705);walk(430,1705);interact()
            page.keyboard.press('i');page.locator('#upgrade').click();page.wait_for_timeout(200);assert page.evaluate('state.self.upgrade')==1
            page.locator('#inventory [data-close]').click()
            walk(440,610);interact();walk(680,1705);walk(680,875);walk(1730,875);walk(1730,395);walk(1515,395);interact();assert page.evaluate('state.self.zone')=='chapel'
            walk(570,250);interact();assert page.evaluate('state.self.chapter')==1
            page.screenshot(path='/tmp/fredverse-browser-chapter.png')
            page.locator('#menu-open').click()
            with page.expect_download() as download_info:page.locator('#export-save').click()
            save=Path(tmp)/'save.json';download_info.value.save_as(save)
            assert json.loads(save.read_text())['version']==2
            with page.expect_download() as download_info:page.locator('#download-game').click()
            html=Path(tmp)/'The-Fred-Verse.html';download_info.value.save_as(html);shutil.copyfile(html,Path(STATIC_DIRECTORY)/'Downloaded.html')
            assert len(html.read_bytes())>70000
            # Invalid import cannot mutate progress or disconnect the current world.
            invalid=Path(tmp)/'invalid.json';invalid.write_text('{"version":999}')
            page.locator('#import-file').set_input_files(invalid);page.wait_for_timeout(200);assert page.evaluate('state.self.chapter')==1
            page.once('dialog',lambda d:d.accept());page.locator('#import-file').set_input_files(save);page.wait_for_timeout(250)
            assert page.evaluate('state.self.chapter')==1 and page.evaluate('state.self.zone')=='alpha'
            page.context.set_offline(False);page.reload();page.context.set_offline(True);page.locator('#continue-game').click();page.wait_for_timeout(200);assert page.evaluate('state.self.chapter')==1
            reopened=browser.new_context(viewport={'width':1200,'height':800});reopened.set_offline(True);rp=reopened.new_page();rp.on('pageerror',lambda e:errors.append(str(e)));load_page(rp, STATIC_BASE+'/Downloaded.html');rp.locator('#join-form button[type=submit]').click();rp.wait_for_timeout(150);assert rp.evaluate('state.self.quest')==0
            assert all(url.startswith(STATIC_BASE) for url in external),external
            mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);mobile.set_offline(True);mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)));load_page(mp, STATIC_BASE+'/The-Fred-Verse.html');mp.locator('#join-form button[type=submit]').click();mp.wait_for_timeout(150)
            assert mp.locator('.touch-move').is_visible() and mp.locator('.touch-weapons').is_visible()
            assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
            for selector in ['.touch-move','.touch-actions','.hotbar']:
                assert mp.locator(selector).bounding_box()['y']>=65
            boxes=[mp.locator(s).bounding_box() for s in ['.touch-move','.touch-actions','.hotbar']]
            for i,a in enumerate(boxes):
                for b in boxes[i+1:]:
                    assert not (a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']), 'Touch control groups overlap'
            cdp=mobile.new_cdp_session(mp);box=mp.locator('[data-key=d]').bounding_box();before=mp.evaluate('state.self.x')
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]});mp.wait_for_timeout(450)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});mp.wait_for_timeout(150)
            assert mp.evaluate('state.self.x')>before+30
            assert mp.evaluate('scrollY')==0
            mp.screenshot(path='/tmp/fredverse-browser-mobile.png')
            # Storage denial is a supported memory-only game with export fallback.
            mem=browser.new_context();mem.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})");mem.set_offline(True);mempage=mem.new_page();load_page(mempage, STATIC_BASE+'/The-Fred-Verse.html');mempage.locator('#join-form button[type=submit]').click();mempage.wait_for_timeout(150);assert 'MEMORY ONLY' in mempage.locator('#save-status').inner_text()
            assert not errors,errors
            print('PASS: exact standalone HTML served statically then offline (file:// blocked by managed browser policy), real-time complete solo chapter, weapons, gear, pause, export/import/reload, self-download/reopen, mobile and storage-denied fallback.',flush=True)
            browser.close()
            if '--solo-only' in sys.argv:
                return True

        errors=[]
        # Separate browser processes, real WebRTC data channel, manually exchanged codes.
        host_browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        guest_browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        host=host_browser.new_page(viewport={'width':1440,'height':960});guest=guest_browser.new_page(viewport={'width':1440,'height':960})
        for pg in (host,guest):pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(STATIC_BASE+'/The-Fred-Verse.html')
        host.locator('#join-form button[type=submit]').click();host.locator('#lan-open').click();host.locator('#create-invite').click()
        host.wait_for_function('document.querySelector("#invite-output").value.length>100 || document.querySelector("#lan-status").textContent.includes("No direct connection candidates")',timeout=15000)
        if not host.locator('#invite-output').input_value():
            assert host.evaluate('session.role')=='solo', 'Failed host setup must safely return to solo.'
            print('BLOCKED: WebRTC candidate gathering returned zero candidates. This environment disables non-proxied WebRTC UDP. Browser co-op is NOT verified; no policies were changed.',flush=True)
            host_browser.close();guest_browser.close()
            return False
        invite=host.locator('#invite-output').input_value();guest.locator('#welcome-lan').click();guest.locator('#lan details').nth(1).locator('summary').click();guest.locator('#guest-name').fill('Guest Fred');guest.locator('#guest-variant').select_option('MLB Fred');guest.locator('#invite-input').fill(invite);guest.locator('#create-reply').click()
        guest.wait_for_function('document.querySelector("#reply-output").value.length>100',timeout=15000)
        host.locator('#reply-input').fill(guest.locator('#reply-output').input_value());host.locator('#accept-reply').click()
        try:
            host.wait_for_function('state.players.length===2',timeout=20000);guest.wait_for_function('state && state.players.length===2',timeout=20000)
        except Exception:
            for label,pg in [('host',host),('guest',guest)]:
                print(label,pg.evaluate('''({status:session.status,visible:document.querySelector('#lan-status').textContent,peers:[...session.peers.values()].map(p=>({ready:p.ready,connection:p.pc.connectionState,ice:p.pc.iceConnectionState,gathering:p.pc.iceGatheringState,channel:p.channel.readyState,candidates:(p.pc.localDescription?.sdp.match(/a=candidate:/g)||[]).length})),pending:[...session.pending.values()].map(p=>({connection:p.pc.connectionState,ice:p.pc.iceConnectionState,candidates:(p.pc.localDescription?.sdp.match(/a=candidate:/g)||[]).length}))})'''),flush=True)
                pg.screenshot(path='/tmp/fredverse-rtc-'+label+'.png')
            raise
        for pg in (host,guest):pg.locator('#lan [data-close]').click()
        assert guest.locator('#player-name').inner_text()=='Guest Fred'
        before=guest.evaluate('state.self.x');guest.keyboard.down('d');guest.wait_for_timeout(450);guest.keyboard.up('d');guest.wait_for_timeout(150)
        assert guest.evaluate('state.self.x')>before+30
        guest.keyboard.press('2');guest.wait_for_timeout(200)
        assert host.evaluate('state.players.some(p=>p.name==="Guest Fred"&&p.weapon==="saber")')
        # Host-controlled encounter fixture: all gameplay thereafter crosses real channels.
        host.evaluate('''()=>{for(const p of session.world.players.values())Object.assign(p,{zone:'gym',x:680,y:395,quest:1,hp:100,ready:false});}''');host.wait_for_timeout(250)
        host.keyboard.press('e');host.wait_for_timeout(150);assert not host.evaluate('!!state.boss')
        guest.keyboard.press('e');host.wait_for_function('!!state.boss');guest.wait_for_function('!!state.boss')
        assert host.evaluate('state.boss.max_hp')==405
        # Avoid hazards through a host-owned fixture, isolating replicated damage/loot from solo AI tests.
        host.evaluate('session.world.boss.next=1000');host.keyboard.press('1');guest.keyboard.press('3')
        for pg in (host,guest):pg.evaluate('aim=-Math.PI/2;attack=true;')
        for _ in range(100):
            host.wait_for_timeout(100)
            if not host.evaluate('!!state.boss'):break
            host.evaluate("if(state.self.ammo===0&&state.self.reload<=0)queue('reload')")
        for pg in (host,guest):pg.evaluate('attack=false;')
        guest.wait_for_function('state.self.wins===1')
        assert host.evaluate('state.self.wins')==1 and guest.evaluate('state.self.materials')==3
        host_state=host.evaluate('state.self.wins');guest_state=guest.evaluate('state.self.wins');assert host_state==guest_state
        # Reconnect the same guest without reviving or duplicating encounter credit.
        guest_key=guest.evaluate('session.localToken');host.evaluate('session.world.players.get([...session.world.players.keys()].find(t=>t!==session.localToken)).hp=0');host.wait_for_timeout(200)
        guest.reload();host.wait_for_timeout(300)
        host.locator('#lan-open').click();host.locator('#create-invite').click();host.wait_for_function('document.querySelector("#invite-output").value.length>100');invite2=host.locator('#invite-output').input_value()
        assert invite2!=invite
        guest.locator('#welcome-lan').click();guest.locator('#lan details').nth(1).locator('summary').click();guest.locator('#invite-input').fill(invite2);guest.locator('#create-reply').click();guest.wait_for_function('document.querySelector("#reply-output").value.length>100')
        host.locator('#reply-input').fill(guest.locator('#reply-output').input_value());host.locator('#accept-reply').click();guest.wait_for_function('state && state.self.wins===1')
        assert guest.evaluate('session.localToken')==guest_key
        assert guest.evaluate('state.self.hp')==0
        assert guest.evaluate('state.self.zone')=='alpha'
        assert not errors,errors
        print('PASS: two separate Chromium processes exchange manual WebRTC codes, movement/gear replication, ready check, shared boss damage/rewards and downed rejoin with no duplicate credit.',flush=True)
        host_browser.close();guest_browser.close()

if __name__=='__main__':
    with tempfile.TemporaryDirectory() as directory:
        STATIC_DIRECTORY=directory
        shutil.copyfile(ROOT/'The-Fred-Verse.html',Path(directory)/'The-Fred-Verse.html')
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=directory))
        STATIC_BASE=f'http://127.0.0.1:{server.server_port}'
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            import sys
            sys.exit(0 if run() is not False else 2)
        finally:server.shutdown();server.server_close()

