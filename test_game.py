"""Run with python -m unittest -v. Uses only the Python standard library."""
import json
import math
from pathlib import Path
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

from server import World, Handler, ThreadingHTTPServer, solid


class GameChecks(unittest.TestCase):
    def test_solo_campaign_and_persistence(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'world.json'
            world = World(path)
            token = world.join('', 'Solo Fred', 'Dorm Fred')
            p = world.players[token]

            def step(keys=(), attack=False, action=None, value=None, angle=None):
                world.input(token, dict(keys=list(keys), attack=attack, angle=p['angle'] if angle is None else angle,
                                        action=action, value=value))
                world.tick(1/30)

            def walk(x, y):
                for _ in range(1200):
                    if math.hypot(p['x']-x, p['y']-y) < 7:
                        return
                    keys = []
                    if p['x'] < x-4: keys.append('d')
                    if p['x'] > x+4: keys.append('a')
                    if p['y'] < y-4: keys.append('s')
                    if p['y'] > y+4: keys.append('w')
                    step(keys)
                self.fail(f"Path blocked at {p['x']},{p['y']} en route to {x},{y}")

            # Real collision-aware movement from the dorm, collecting the personal quest.
            walk(430, 230)
            walk(700, 230)
            step(action='interact')
            self.assertEqual(p['quest'], 1)
            step(action='interact')
            self.assertEqual(p['xp'], 20, 'Remote quest may only award once')
            walk(430, 230)
            walk(440, 610)
            step(action='interact')
            self.assertEqual(p['zone'], 'campus')
            # Alpha -> main north/south path -> Pavilion entrance, avoiding the student center.
            walk(680, 1705)
            walk(680, 1210)
            walk(1155, 1210)
            step(action='interact')
            self.assertEqual(p['zone'], 'gym')
            walk(680, 440)
            step(action='interact')
            self.assertIsNotNone(world.boss)
            self.assertNotIn(token, json.dumps(world.snapshot(token)), 'Never publish rejoin keys')
            self.assertNotIn('participants', world.snapshot(token)['boss'])

            # Complete a real encounter using movement, all three attack families and healing.
            fired, weapons_used = 0, set()
            for frame in range(6000):
                if world.boss is None:
                    break
                weapon = ['nerf', 'saber', 'bat'][(frame//60) % 3]
                if p['weapon'] != weapon:
                    step(action='weapon', value=weapon)
                weapons_used.add(weapon)
                b = world.boss
                phase = frame/38
                radius = 200 if weapon == 'nerf' else 60
                tx, ty = b['x'] + math.cos(phase)*radius, b['y']+math.sin(phase)*radius
                movement = []
                if p['x'] < tx-4: movement.append('d')
                if p['x'] > tx+4: movement.append('a')
                if p['y'] < ty-4: movement.append('s')
                if p['y'] > ty+4: movement.append('w')
                action = 'reload' if p['ammo']==0 and p['reload']<=0 else 'heal' if p['hp']<65 else None
                step(movement, True, action, angle=math.atan2(b['y']-p['y'], b['x']-p['x']))
                fired += len(world.projectiles)>0
                if p['hp']<=0:
                    self.fail('Solo encounter became impossible for the movement bot')
            self.assertIsNone(world.boss, 'Solo practice must be completable')
            self.assertEqual(weapons_used, {'nerf', 'saber', 'bat'})
            self.assertGreater(fired, 0)
            self.assertEqual(p['wins'], 1)
            self.assertEqual(p['materials'], 3)
            self.assertIn('chain', p['gear'])
            self.assertIn('An Hour Early', p['titles'])
            for _ in range(30): step()
            self.assertEqual(p['wins'], 1, 'No duplicate kill credit')
            # Safe return, workbench and armor effects survive a server restart.
            walk(680, 940)
            step(action='interact')
            walk(680, 1210)
            walk(680, 1705)
            walk(430, 1705)
            step(action='interact')
            self.assertEqual(p['zone'], 'alpha')
            step(action='equip', value='chain')
            step(action='upgrade')
            self.assertEqual(p['materials'], 0)
            self.assertTrue(world.stats(p)['set'])
            self.assertEqual(p['upgrade'], 1)
            restored = World(path)
            self.assertEqual(restored.join(token, 'Ignored', 'MLB Fred'), token)
            self.assertEqual(restored.players[token]['wins'], 1)
            self.assertEqual(restored.players[token]['upgrade'], 1)
            self.assertEqual(restored.players[token]['equipped']['accessory'], 'chain')

    def test_party_rules_recovery_and_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            world = World(Path(directory)/'world.json')
            tokens = [world.join('', f'Fred {i}', 'Dorm Fred' if i%2==0 else 'MLB Fred') for i in range(4)]
            with self.assertRaises(ValueError): world.join('', 'Fifth', 'Dorm Fred')
            with self.assertRaises(ValueError): world.input(tokens[0], {'angle': float('nan')})
            for t in tokens:
                world.players[t].update(zone='gym', x=680, y=400, quest=1)
            for t in tokens[:3]: world.action(t, 'interact')
            self.assertIsNone(world.boss, 'Ready check waits for every Fred in the gym')
            world.action(tokens[3], 'interact')
            self.assertEqual(len(world.boss['participants']), 4)
            self.assertGreater(world.boss['max_hp'], 260)
            first, second = [world.players[t] for t in tokens[:2]]
            world.action(tokens[0], 'space')
            self.assertGreater(second['shield'], 0)
            world.action(tokens[0], 'space')
            self.assertEqual(first['focus'], 83, 'Ability cooldown blocks repeat casts; self field restores 8')
            second['hp'] = 0
            world.action(tokens[1], 'recover')
            self.assertEqual(second['hp'], 0, 'No mid-encounter self-revive')
            for _ in range(40):
                world.input(tokens[0], {'keys':['e'], 'angle':0})
                world.tick(1/30)
            self.assertGreater(second['revive'], 0)
            world.input(tokens[0], {'keys':['e','w'], 'angle':0})
            world.tick(1/30)
            self.assertEqual(second['revive'], 0, 'Moving interrupts revive')
            # Isolate revive from arena hazards, then verify the real hold interaction.
            world.boss['next'] = 1000
            world.boss['hazards'] = []
            first.update(x=680,y=400,invuln=0)
            for _ in range(80):
                world.input(tokens[0], {'keys':['e'], 'angle':0})
                world.tick(1/30)
            self.assertGreater(second['hp'], 0)
            second['hp'] = 0
            second['online'] = False
            world.join(tokens[1], 'Fred 1', 'Dorm Fred')
            self.assertEqual(second['hp'], 0, 'Reconnect never revives a downed character')
            self.assertEqual(second['zone'], 'alpha', 'Reconnect uses a safe point')
            world.hit(world.boss, 99999)
            self.assertTrue(all(world.players[t]['wins']==1 for t in tokens), 'Individual shared credit')
            self.assertTrue(all(world.players[t]['materials']==3 for t in tokens))
            # All-disconnected encounter resets rather than blocking future rounds.
            for t in tokens: world.players[t].update(zone='gym',hp=100,ready=True)
            world.start_boss()
            for t in tokens: world.players[t]['seen'] = 0
            world.tick(.1)
            self.assertIsNone(world.boss)
            self.assertFalse(world.projectiles)
            for zone, positions in {'alpha':[(100,100)], 'campus':[(900,200)], 'gym':[(100,200)], 'chapel':[(200,350)]}.items():
                self.assertTrue(all(solid(zone,x,y) for x,y in positions))

    def test_http_two_clients_share_authoritative_state(self):
        with tempfile.TemporaryDirectory() as directory:
            world=World(Path(directory)/'world.json')
            server=ThreadingHTTPServer(('127.0.0.1',0), Handler)
            server.world=world
            thread=threading.Thread(target=server.serve_forever,daemon=True)
            thread.start()
            base=f'http://127.0.0.1:{server.server_port}'
            def request(route, data=None, token='', origin=None):
                headers={'Content-Type':'application/json','X-Fred-Token':token}
                if origin: headers['Origin']=origin
                req=urllib.request.Request(base+route, json.dumps(data).encode() if data is not None else None, headers)
                # No external proxy is needed for a loopback-only integration test.
                with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req,timeout=3) as r:
                    return json.load(r)
            try:
                a=request('/api/join', {'name':'LAN A','variant':'Dorm Fred'})['token']
                b=request('/api/join', {'name':'LAN B','variant':'MLB Fred'})['token']
                request('/api/input', {'keys':['d'],'angle':0},a)
                world.tick(.1)
                sa,sb=request('/api/state',token=a),request('/api/state',token=b)
                self.assertEqual(sa['players'],sb['players'])
                self.assertGreater(sa['self']['x'],440)
                request('/api/input', {'keys':[],'angle':0,'action':'weapon','value':'saber'},a)
                self.assertEqual(request('/api/state',token=b)['players'][0]['weapon'],'saber')
                with self.assertRaises(urllib.error.HTTPError) as cm:
                    request('/api/input', {'keys':[]}, a, 'https://unrelated.example')
                self.assertEqual(cm.exception.code,403)
                with self.assertRaises(urllib.error.HTTPError): request('/api/state',token='not-a-player')
                # Guests cannot forge health, loot, coordinates, or damage.
                request('/api/input', {'keys':[],'angle':0,'hp':999,'materials':900,'x':9000},b)
                saved=request('/api/state',token=b)['self']
                self.assertEqual(saved['hp'],100)
                self.assertEqual(saved['materials'],0)
                self.assertEqual(saved['x'],440)
                # Two actual clients ready and fight the same host-owned encounter.
                for t in (a,b): world.players[t].update(zone='gym',x=680,y=400,quest=1)
                request('/api/input',{'keys':[],'action':'interact'},a)
                self.assertIsNone(request('/api/state',token=b)['boss'])
                request('/api/input',{'keys':[],'action':'interact'},b)
                self.assertEqual(request('/api/state',token=a)['boss']['max_hp'],405)
                world.boss['next']=1000  # Isolate network/combat agreement from hazard AI, tested above.
                request('/api/input',{'keys':[],'action':'weapon','value':'nerf'},a)
                request('/api/input',{'keys':[],'action':'weapon','value':'bat'},b)
                for _ in range(360):
                    if not world.boss: break
                    request('/api/input',{'keys':[],'angle':-math.pi/2,'attack':True,
                        'action':'reload' if world.players[a]['ammo']==0 else None},a)
                    request('/api/input',{'keys':[],'angle':-math.pi/2,'attack':True},b)
                    world.tick(1/30)
                sa,sb=request('/api/state',token=a),request('/api/state',token=b)
                self.assertIsNone(sa['boss'])
                self.assertIsNone(sb['boss'])
                self.assertEqual(sa['self']['wins'],1)
                self.assertEqual(sb['self']['wins'],1)
                self.assertEqual(sa['self']['materials'],sb['self']['materials'])
                self.assertEqual(sa['players'],sb['players'])
                world.players[a]['hp']=50
                request('/api/input',{'keys':[],'action':'heal'},a)
                self.assertEqual(request('/api/state',token=b)['players'][0]['hp'],88)
                self.assertEqual(request('/api/join',{'name':'Rejoin','variant':'Dorm Fred'},a)['token'],a)
                self.assertEqual(request('/api/state',token=a)['self']['wins'],1)
            finally:
                server.shutdown();server.server_close();thread.join()


if __name__=='__main__':
    unittest.main()
