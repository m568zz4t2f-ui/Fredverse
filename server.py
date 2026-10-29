"""The Fred Verse: local, host-authoritative RPG. Python 3.12+, no packages."""
import argparse
import copy
import json
import math
import os
from pathlib import Path
import secrets
import socket
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
WEAPONS = {
    'nerf': {'name': "Owen's Sidearm", 'damage': 12, 'cooldown': .32, 'range': 460},
    'saber': {'name': "Owen's Blue Blade", 'damage': 19, 'cooldown': .38, 'range': 86},
    'bat': {'name': 'MLB Prospect', 'damage': 34, 'cooldown': .85, 'range': 110},
}
GEAR = {
    'hoodie': {'name': 'Personal Space Hoodie', 'slot': 'body', 'defense': 3, 'set': 'space'},
    'jersey': {'name': 'MLB Prospect Jersey', 'slot': 'body', 'defense': 1, 'power': 4},
    'shoes': {'name': 'Black Air Forces', 'slot': 'shoes', 'defense': 2, 'set': 'space'},
    'chain': {'name': 'Chain of Personal Space', 'slot': 'accessory', 'defense': 2, 'set': 'space'},
}
# Map-relative positions, not measured footprints. All interiors are approximations.
BUILDINGS = [
    {'id': 'west', 'name': 'Nutwood West', 'x': 800, 'y': 180, 'w': 250, 'h': 160, 'letter': 'A'},
    {'id': 'chapel', 'name': 'Pacific Auditorium', 'x': 1370, 'y': 170, 'w': 290, 'h': 185, 'letter': 'B'},
    {'id': 'library', 'name': 'Darling Library', 'x': 1080, 'y': 400, 'w': 240, 'h': 210, 'letter': 'C'},
    {'id': 'east', 'name': 'Nutwood East', 'x': 1430, 'y': 640, 'w': 235, 'h': 165, 'letter': 'D'},
    {'id': 'gym', 'name': 'Darling Pavilion', 'x': 980, 'y': 930, 'w': 350, 'h': 240, 'letter': 'E'},
    {'id': 'hub', 'name': 'Lawson-Fulton Center', 'x': 1000, 'y': 1260, 'w': 320, 'h': 190, 'letter': 'F'},
    {'id': 'omega', 'name': 'Omega Residence Hall', 'x': 280, 'y': 860, 'w': 300, 'h': 200, 'letter': 'G'},
    {'id': 'alpha', 'name': 'Alpha Residence Hall', 'x': 280, 'y': 1440, 'w': 300, 'h': 220, 'letter': 'H'},
]
ZONES = {'campus': (1920, 1920), 'alpha': (880, 660), 'gym': (1360, 1000), 'chapel': (1140, 1100)}
OBSTACLES = {
    'campus': [(b['x'], b['y'], b['w'], b['h']) for b in BUILDINGS] + [(300, 1150, 260, 150)],
    'alpha': [(50, 85, 175, 190), (50, 340, 175, 190), (640, 80, 170, 80), (650, 320, 150, 115), (350, 60, 150, 55)],
    'gym': [(60, 110, 100, 740), (1200, 110, 100, 740)],
    'chapel': [(x, y, 280, 40) for x in (100, 730) for y in range(330, 900, 85)] + [(160, 65, 820, 130)],
}

def dist(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])

def solid(zone, x, y):
    w, h = ZONES[zone]
    return x < 22 or y < 42 or x > w - 22 or y > h - 22 or any(
        a - 13 < x < a + c + 13 and b - 10 < y < b + d + 10 for a, b, c, d in OBSTACLES[zone])

class World:
    def __init__(self, save_path):
        self.path = Path(save_path)
        self.lock = threading.RLock()
        self.players = {}
        self.boss = None
        self.projectiles = []
        self.effects = []
        self.clock = 0
        self.encounters = 0
        self.save_error = None
        if self.path.exists():
            data = json.loads(self.path.read_text())
            if data.get('version') != 1 or not isinstance(data.get('players'), dict):
                raise ValueError('Unsupported or invalid save. Preserve it and choose a different --save path.')
            self.encounters = data.get('encounters', 0)
            for token, p in data['players'].items():
                p.update(online=False, seen=0, input={}, swing=0, invuln=0, shield=0, attack_cd=0,
                         dodge_cd=0, heal_cd=0, ability_cd=0, reload=0, revive=0, ready=False, notice='Rejoined at Alpha. Your gear is safe.')
                p['zone'], p['x'], p['y'] = 'alpha', 440, 560
                # A downed character stays downed across restart; resting is an explicit action.
                self.players[token] = p

    def fresh(self, name, variant):
        return dict(name=name, variant=variant, zone='alpha', x=440., y=560., hp=100., focus=100.,
                    xp=0, level=1, materials=0, upgrade=0, weapon='nerf' if variant == 'Dorm Fred' else 'bat',
                    gear=['hoodie', 'jersey', 'shoes'], equipped={'body': 'hoodie' if variant == 'Dorm Fred' else 'jersey', 'shoes': 'shoes'},
                    titles=[], title='', quest=0, wins=0, chips=3, ammo=8, angle=-math.pi/2, online=True,
                    seen=time.monotonic(), input={}, swing=0, invuln=0, shield=0, attack_cd=0, dodge_cd=0,
                    heal_cd=0, ability_cd=0, reload=0, revive=0, ready=False, notice='E: recover the remote beside the TV. The bed is off limits.')

    def join(self, token, name, variant):
        with self.lock:
            if token in self.players:
                p = self.players[token]
                if not p['online']:
                    p['zone'], p['x'], p['y'] = 'alpha', 440, 560
                    p['ready'] = False
                p.update(online=True, seen=time.monotonic(), input={})
                return token
            if sum(p['online'] for p in self.players.values()) >= 4:
                raise ValueError('Campus is full (4 Freds).')
            if len(self.players) >= 100:
                raise ValueError('Character limit reached. Ask the host to archive old saves.')
            token = secrets.token_urlsafe(24)
            self.players[token] = self.fresh(name, variant)
            self.save()
            return token

    def save(self):
        with self.lock:
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                tmp = self.path.with_suffix('.tmp')
                tmp.write_text(json.dumps({'version': 1, 'encounters': self.encounters, 'players': self.players}))
                with tmp.open('rb') as f:
                    os.fsync(f.fileno())
                tmp.replace(self.path)
                self.save_error = None
            except OSError as e:
                self.save_error = f'Host could not save: {e.strerror}'

    def stats(self, p):
        items = [GEAR[g] for g in p['equipped'].values()]
        return {'defense': sum(g.get('defense', 0) for g in items) + p['upgrade'],
                'power': sum(g.get('power', 0) for g in items) + p['upgrade'] * 2 + p['level'] * 2,
                'set': sum(g.get('set') == 'space' for g in items) >= 2}

    def snapshot(self, token):
        with self.lock:
            p = self.players.get(token)
            if p is None:
                raise ValueError('Enter campus first.')
            fields = ['name', 'variant', 'zone', 'x', 'y', 'hp', 'focus', 'level', 'weapon', 'equipped', 'angle', 'swing', 'invuln', 'shield', 'title', 'revive', 'ready']
            boss = {k: v for k, v in self.boss.items() if k != 'participants'} if self.boss else None
            return copy.deepcopy(dict(self={**{k: v for k, v in p.items() if k not in ('input', 'seen')}, 'stats': self.stats(p)},
                players=[{'id': t[:8], **{k: q[k] for k in fields}} for t, q in self.players.items() if q['online']],
                boss=boss, projectiles=self.projectiles, effects=self.effects, clock=self.clock,
                save_error=self.save_error))

    def input(self, token, data):
        with self.lock:
            p = self.players.get(token)
            if p is None or not p['online']:
                raise ValueError('Session expired. Rejoin to continue.')
            keys = data.get('keys', [])
            if not isinstance(keys, list) or len(keys) > 12 or not all(isinstance(k, str) for k in keys):
                raise ValueError('Invalid controls.')
            angle = data.get('angle', p['angle'])
            if not isinstance(angle, (int, float)) or not math.isfinite(angle):
                raise ValueError('Invalid aim.')
            p['input'] = dict(keys=keys, attack=data.get('attack') is True, block=data.get('block') is True)
            p['angle'] = angle % (2 * math.pi)
            p['seen'] = time.monotonic()
            action = data.get('action')
            if action:
                self.action(token, action, data.get('value'))

    def action(self, token, action, value=None):
        p = self.players[token]
        if action == 'rest' and p['zone'] == 'alpha' and dist(p, {'x': 440, 'y': 560}) < 170:
            if self.boss and token in self.boss['participants']:
                p['notice'] = 'Finish or abandon the practice encounter before resting.'
                return
            p.update(hp=100, focus=100, chips=3, ammo=8)
            p['notice'] = 'Well rested—for once. Chips and darts restocked.'
        elif action == 'recover' and p['hp'] <= 0:
            if self.boss and token in self.boss['participants']:
                p['notice'] = 'Hold E near a teammate for a revive, or wait for the challenge to reset.'
                return
            p.update(zone='alpha', x=440, y=560, hp=100, chips=3)
        elif p['hp'] <= 0:
            return
        elif action == 'weapon' and value in WEAPONS:
            p['weapon'] = value
        elif action == 'equip' and value in p['gear']:
            p['equipped'][GEAR[value]['slot']] = value
        elif action == 'upgrade':
            if p['zone'] != 'alpha':
                p['notice'] = 'Use the workbench in Alpha to upgrade.'
            elif p['materials'] >= 3 and p['upgrade'] < 5:
                p['materials'] -= 3
                p['upgrade'] += 1
                p['notice'] = 'Dorm-workbench upgrade: +2 power, +1 defense.'
            else:
                p['notice'] = 'Upgrade needs 3 practice materials. Maximum tier: 5.'
        elif action == 'title' and value in p['titles']:
            p['title'] = value
        elif action == 'interact':
            self.interact(token)
        elif action == 'reload' and p['ammo'] < 8 and p['reload'] <= 0:
            p['reload'] = 1.3
        elif action == 'heal' and p['chips'] > 0 and p['heal_cd'] <= 0 and p['hp'] < 100:
            p['hp'] = min(100, p['hp'] + 38)
            p['chips'] -= 1
            p['heal_cd'] = 3
            self.fx(p, 'heal', 45, .6)
        elif action == 'dodge' and p['dodge_cd'] <= 0 and p['focus'] >= 12:
            p['focus'] -= 12
            p['dodge_cd'], p['invuln'] = 1.8, .28
            for _ in range(12):
                self.move(p, math.cos(p['angle']) * 10, math.sin(p['angle']) * 10)
        elif action == 'space' and p['ability_cd'] <= 0 and p['focus'] >= 25:
            p['focus'] -= 25
            p['ability_cd'] = 6
            self.fx(p, 'space', 170, .7)
            for q in self.players.values():
                if q['online'] and q['zone'] == p['zone'] and dist(p, q) < 170:
                    q['shield'] = max(q['shield'], 3 if p['variant'] == 'Dorm Fred' else 2)
                    q['focus'] = min(100, q['focus'] + 8)
            b = self.boss
            if b and p['zone'] == 'gym' and dist(p, b) < 170:
                self.hit(b, 18 + self.stats(p)['power'])
        self.save()

    def interact(self, token):
        p = self.players[token]
        if p['zone'] == 'campus':
            for b in BUILDINGS:
                door = {'x': b['x'] + b['w']/2, 'y': b['y'] + b['h'] + 35}
                if dist(p, door) < 100:
                    if b['id'] in ('alpha', 'gym', 'chapel'):
                        if b['id'] == 'gym' and self.boss and token not in self.boss['participants']:
                            p['notice'] = 'Practice is underway. Join the next round.'
                            return
                        w, h = ZONES[b['id']]
                        p.update(zone=b['id'], x=w/2, y=h-65)
                    else:
                        p['notice'] = b['name'] + ': interior reserved for a later chapter.'
                    return
        else:
            w, h = ZONES[p['zone']]
            if dist(p, {'x': w/2, 'y': h-35}) < 90:
                if p['zone'] == 'gym' and self.boss and token in self.boss['participants']:
                    p['notice'] = 'Practice boundaries are active. Finish the challenge or recover after defeat.'
                    return
                b = next(b for b in BUILDINGS if b['id'] == p['zone'])
                p.update(zone='campus', x=b['x']+b['w']/2, y=b['y']+b['h']+45)
                return
            if p['zone'] == 'alpha':
                if dist(p, {'x': 700, 'y': 230}) < 135 and p['quest'] == 0:
                    p['quest'], p['xp'] = 1, p['xp'] + 20
                    p['notice'] = 'Remote recovered. Leave it safe in Alpha. Head to Darling Pavilion for the Three-Point Practice.'
                elif dist(p, {'x': 440, 'y': 560}) < 170:
                    self.action(token, 'rest')
                else:
                    p['notice'] = 'Fred mumbles: “My bed. My remote. Clear boundaries.”'
            elif p['zone'] == 'gym' and dist(p, {'x': 680, 'y': 300}) < 175 and not self.boss:
                if p['quest'] == 0:
                    p['notice'] = 'Recover the remote in Alpha first. Preparation counts.'
                else:
                    p['ready'] = True
                    self.start_boss()
            elif p['zone'] == 'chapel':
                p['notice'] = 'Big P — The President: “Prepare well, Fred. We will meet at convocation.” Fictional dialogue; final challenge comes later.'

    def start_boss(self):
        members = [t for t, p in self.players.items() if p['online'] and p['zone'] == 'gym' and p['hp'] > 0]
        if not members:
            return
        if not all(self.players[t]['ready'] for t in members):
            for t in members:
                self.players[t]['notice'] = 'Ready check: all living Freds in the gym must approach the marker and press E.'
            return
        self.encounters += 1
        hp = 260 + 145 * (len(members)-1)
        self.boss = dict(name='Robbie Phillips · Three-Point Practice', x=680., y=300., hp=hp, max_hp=hp,
                         participants=members, encounter=self.encounters, age=0, next=1.8, hazards=[], phase=1)
        for t in members:
            self.players[t]['notice'] = 'Fictional, nonlethal faculty practice. Watch the red floor marks; attack between patterns.'

    def fx(self, p, kind, radius, ttl):
        self.effects.append(dict(x=p['x'], y=p['y'], zone=p['zone'], kind=kind, r=radius, ttl=ttl))

    def hit(self, boss, amount):
        boss['hp'] = max(0, boss['hp'] - amount)
        if boss['hp'] == 0:
            for t in boss['participants']:
                p = self.players[t]
                p['wins'] += 1
                p['xp'] += 90
                p['level'] = 1 + p['xp']//120
                p['materials'] += 3
                p['quest'] = 2
                p['ready'] = False
                if 'chain' not in p['gear']:
                    p['gear'].append('chain')
                if 'An Hour Early' not in p['titles']:
                    p['titles'].append('An Hour Early')
                    p['title'] = 'An Hour Early'
                p['notice'] = 'Practice complete! +90 XP, +3 materials, Chain of Personal Space. Robbie Phillips: “Good preparation. Try a new build.”'
            self.boss = None
            self.projectiles.clear()
            self.save()

    def move(self, p, dx, dy):
        if not solid(p['zone'], p['x']+dx, p['y']):
            p['x'] += dx
        if not solid(p['zone'], p['x'], p['y']+dy):
            p['y'] += dy

    def tick(self, dt):
        with self.lock:
            self.clock += dt
            for t, p in self.players.items():
                if time.monotonic()-p['seen'] > 5:
                    p.update(online=False, input={})
                if not p['online']:
                    continue
                for cd in ('swing', 'invuln', 'shield', 'attack_cd', 'dodge_cd', 'heal_cd', 'ability_cd'):
                    p[cd] = max(0, p[cd]-dt)
                if p['reload'] > 0:
                    p['reload'] -= dt
                    if p['reload'] <= 0:
                        p['ammo'] = 8
                keys = p['input'].get('keys', []) if time.monotonic()-p['seen'] < .5 else []
                if p['hp'] <= 0:
                    p['revive'] = 0
                    for q in self.players.values():
                        revive_keys = q['input'].get('keys', [])
                        stationary = not any(k in revive_keys for k in ('w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'))
                        if q is not p and q['online'] and q['hp'] > 0 and q['invuln'] <= 0 and not q['input'].get('attack') and stationary and q['zone'] == p['zone'] and dist(p, q) < 85 and 'e' in revive_keys and time.monotonic()-q['seen'] < .5:
                            p['revive'] = p.get('revive_time', 0) + dt
                            break
                    p['revive_time'] = p['revive']
                    if p['revive'] >= 2.5:
                        p.update(hp=45, invuln=2, revive=0, revive_time=0)
                    continue
                p['focus'] = min(100, p['focus'] + dt*6)
                dx = int('d' in keys or 'ArrowRight' in keys)-int('a' in keys or 'ArrowLeft' in keys)
                dy = int('s' in keys or 'ArrowDown' in keys)-int('w' in keys or 'ArrowUp' in keys)
                length = math.hypot(dx, dy) or 1
                speed = 175 if not p['input'].get('block') else 85
                self.move(p, dx/length*speed*dt, dy/length*speed*dt)
                if p['input'].get('attack') and time.monotonic()-p['seen'] < .5 and p['attack_cd'] <= 0:
                    w = WEAPONS[p['weapon']]
                    p['attack_cd'], p['swing'] = w['cooldown'], .22
                    bonus = self.stats(p)['power'] + (5 if p['variant'] == 'MLB Fred' and p['weapon'] == 'bat' else 0)
                    if p['weapon'] == 'nerf':
                        if p['ammo'] > 0 and p['reload'] <= 0:
                            p['ammo'] -= 1
                            self.projectiles.append(dict(x=p['x'], y=p['y'], zone=p['zone'], angle=p['angle'], life=.8, damage=w['damage']+bonus))
                    elif self.boss and p['zone'] == 'gym' and dist(p, self.boss) < w['range']:
                        angle = math.atan2(self.boss['y']-p['y'], self.boss['x']-p['x'])
                        arc = abs((angle-p['angle']+math.pi) % (2*math.pi)-math.pi)
                        if arc < (1.4 if p['weapon'] == 'bat' else 1):
                            self.hit(self.boss, w['damage']+bonus)
            for dart in self.projectiles[:]:
                dart['x'] += math.cos(dart['angle'])*590*dt
                dart['y'] += math.sin(dart['angle'])*590*dt
                dart['life'] -= dt
                if solid(dart['zone'], dart['x'], dart['y']):
                    dart['life'] = 0
                if dart['life'] > 0 and self.boss and dart['zone'] == 'gym' and dist(dart, self.boss) < 34:
                    self.hit(self.boss, dart['damage'])
                    dart['life'] = 0
            self.projectiles = [d for d in self.projectiles if d['life'] > 0]
            for fx in self.effects:
                fx['ttl'] -= dt
            self.effects = [e for e in self.effects if e['ttl'] > 0][-100:]
            b = self.boss
            if b:
                active = [self.players[t] for t in b['participants'] if self.players[t]['online'] and self.players[t]['zone'] == 'gym' and self.players[t]['hp'] > 0]
                if not active:
                    for t in b['participants']:
                        self.players[t]['notice'] = 'Practice paused after defeat. Recover at Alpha, prepare, and try again. Gear retained.'
                    self.boss = None
                    self.projectiles.clear()
                    self.save()
                    return
                b['age'] += dt
                b['phase'] = 1 + int(b['hp'] < b['max_hp']*.65) + int(b['hp'] < b['max_hp']*.3)
                if b['age'] >= b['next']:
                    target = active[int(b['age']) % len(active)]
                    count = min(len(active), 2) if b['phase'] == 1 else min(len(active), 3)
                    for q in ([target] if count == 1 else active[:count]):
                        b['hazards'].append(dict(x=q['x'], y=q['y'], r=70+10*b['phase'], time=1.05, fired=False))
                    if b['phase'] >= 2:
                        b['hazards'].append(dict(x=680, y=500, r=125, time=1.5, fired=False))
                    b['next'] = b['age'] + (2.7-.4*b['phase'])
                for h in b['hazards']:
                    h['time'] -= dt
                    if h['time'] <= 0 and not h['fired']:
                        h['fired'] = True
                        for q in active:
                            if dist(q, h) < h['r'] and q['invuln'] <= 0:
                                damage = max(4, 24-self.stats(q)['defense'])
                                if q['shield'] > 0:
                                    damage *= .35
                                if q['input'].get('block'):
                                    damage *= .45
                                    if self.stats(q)['set']:
                                        q['shield'] = 2
                                q['hp'] = max(0, q['hp']-damage)
                                q['invuln'] = .35
                b['hazards'] = [h for h in b['hazards'] if h['time'] > -.3]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT/'web'), **kwargs)

    def log_message(self, fmt, *args):
        # Tokens are sent in headers, never query strings or access logs.
        if self.path.startswith('/api/'):
            return
        super().log_message(fmt, *args)

    def json_response(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/state':
            try:
                self.json_response(200, self.server.world.snapshot(self.headers.get('X-Fred-Token', '')))
            except ValueError as e:
                self.json_response(401, {'error': str(e)})
        elif self.path == '/api/info':
            self.json_response(200, {'name': 'The Fred Verse', 'version': 1, 'capacity': 4})
        elif self.path.startswith('/api/'):
            self.json_response(404, {'error': 'Unknown endpoint'})
        else:
            super().do_GET()

    def do_POST(self):
        # Local-network trust model: no accounts. Reject cross-origin browser writes.
        origin = self.headers.get('Origin')
        if origin and origin not in ('http://'+self.headers.get('Host', ''), 'https://'+self.headers.get('Host', '')):
            self.json_response(403, {'error': 'Cross-origin request rejected'})
            return
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 4096:
                raise ValueError('Message must be 1–4096 bytes.')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Expected an object.')
            token = self.headers.get('X-Fred-Token', '')
            if self.path == '/api/join':
                name = data.get('name', 'Fred')
                if not isinstance(name, str) or not 1 <= len(name.strip()) <= 24:
                    raise ValueError('Name must contain 1–24 characters.')
                variant = data.get('variant')
                if variant not in ('Dorm Fred', 'MLB Fred'):
                    raise ValueError('Choose a Fred variant.')
                token = self.server.world.join(token, name.strip(), variant)
                self.json_response(200, {'token': token})
            elif self.path == '/api/input':
                self.server.world.input(token, data)
                self.json_response(200, {'ok': True})
            else:
                self.json_response(404, {'error': 'Unknown endpoint'})
        except (ValueError, TypeError, KeyError) as e:
            self.json_response(400, {'error': str(e)})

def discover(timeout=2):
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.settimeout(timeout)
        s.sendto(b'FREDVERSE_DISCOVER_V1', ('255.255.255.255', 47654))
        found = set()
        while True:
            try:
                data, addr = s.recvfrom(1024)
                if data.startswith(b'FREDVERSE_HOST_V1:'):
                    found.add(f'http://{addr[0]}:{int(data.split(b":")[1])}')
            except socket.timeout:
                break
        print('\n'.join(sorted(found)) or 'No LAN hosts found. Open the host IP and port directly; Wi-Fi may block broadcasts.')

def advertise(port, stop):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(('', 47654))
            s.settimeout(.5)
            while not stop.is_set():
                try:
                    data, addr = s.recvfrom(128)
                    if data == b'FREDVERSE_DISCOVER_V1':
                        s.sendto(f'FREDVERSE_HOST_V1:{port}'.encode(), addr)
                except socket.timeout:
                    pass
    except OSError as e:
        print('LAN broadcast discovery unavailable; direct host address still works:', e)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--save', default=str(ROOT/'data/world.json'))
    parser.add_argument('--discover', action='store_true')
    parser.add_argument('--open', action='store_true', help='Open the game in this computer’s default browser')
    args = parser.parse_args()
    if args.discover:
        discover()
        return
    world = World(args.save)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.world = world
    stop = threading.Event()
    def simulation():
        previous, saved = time.monotonic(), time.monotonic()
        while not stop.wait(1/30):
            now = time.monotonic()
            world.tick(min(.1, now-previous))
            previous = now
            if now-saved >= 5:
                world.save()
                saved = now
    threading.Thread(target=simulation, daemon=True).start()
    threading.Thread(target=advertise, args=(args.port, stop), daemon=True).start()
    print(f'The Fred Verse listening on {args.host}:{args.port}. LAN friends open this machine’s IP on port {args.port}.', flush=True)
    if args.open:
        threading.Timer(.8, webbrowser.open, args=(f'http://127.0.0.1:{args.port}',)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        world.save()
        server.server_close()

if __name__ == '__main__':
    main()
