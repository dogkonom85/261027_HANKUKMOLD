import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EMPLOYEES } from './employees.js';

const canvas = document.getElementById('scene');
const labelsEl = document.getElementById('labels');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ee);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(7, 6, 8);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 3;
controls.maxDistance = 20;

// ---- 조명 ----
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
scene.add(sun);

// ---- 공용 도우미 ----
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---- 사무실 방 ----
const ROOM = 12;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), mat(0xc9b79c));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(ROOM, ROOM, 0xb8a687, 0xb8a687);
grid.position.y = 0.01;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

const wallColor = 0xf2efe8;
scene.add(box(ROOM, 4, 0.2, wallColor, 0, 2, -ROOM / 2));
scene.add(box(0.2, 4, ROOM, wallColor, -ROOM / 2, 2, 0));

// 벽면 창문
const windowFrame = box(3, 1.8, 0.05, 0x9fc4e8, -2, 2.2, -ROOM / 2 + 0.12);
windowFrame.material = mat(0x9fc4e8, { emissive: 0x9fc4e8, emissiveIntensity: 0.4 });
scene.add(windowFrame);

// ---- 책상 / 의자 / 모니터 ----
function makeDesk() {
  const g = new THREE.Group();
  g.add(box(2.2, 0.08, 1, 0xa57c52, 0, 0.8, 0));
  for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
    g.add(box(0.08, 0.8, 0.08, 0x6e5238, x, 0.4, z));
  }
  g.add(box(0.7, 0.03, 0.25, 0x30343c, 0, 0.855, 0.25)); // 키보드
  const base = box(0.25, 0.04, 0.2, 0x30343c, 0, 0.86, -0.25);
  const stand = box(0.05, 0.25, 0.05, 0x30343c, 0, 0.99, -0.25);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x101418, emissive: 0x2a4a8a, emissiveIntensity: 0.6,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.05), screenMat);
  screen.position.set(0, 1.4, -0.3);
  screen.castShadow = true;
  g.add(base, stand, screen);
  g.userData.screenMat = screenMat;
  return g;
}

function makeChair() {
  const g = new THREE.Group();
  g.add(box(0.6, 0.08, 0.6, 0x3a3f4a, 0, 0.5, 0));
  g.add(box(0.6, 0.7, 0.08, 0x3a3f4a, 0, 0.9, 0.3));
  g.add(box(0.06, 0.5, 0.06, 0x2a2e36, 0, 0.25, 0));
  g.add(box(0.5, 0.05, 0.05, 0x2a2e36, 0, 0.03, 0));
  return g;
}

function makePlant(x, z) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 16), mat(0xb5654a));
  pot.position.y = 0.2;
  pot.castShadow = true;
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), mat(0x3f8f4f));
  leaves.position.y = 0.75;
  leaves.castShadow = true;
  g.add(pot, leaves);
  g.position.set(x, 0, z);
  return g;
}

scene.add(makePlant(-5, -5), makePlant(5, 5));

// 장식용 빈 책상
for (const [x, z, ry] of [[-3.5, -2, Math.PI / 2], [-3.5, 2.5, Math.PI / 2]]) {
  const d = makeDesk();
  d.position.set(x, 0, z);
  d.rotation.y = ry;
  scene.add(d);
  const c = makeChair();
  c.position.set(x + 0.9, 0, z);
  c.rotation.y = ry;
  scene.add(c);
}

// ---- AI 직원 ----
const workers = new Map();
const clickable = [];

function makeWorker(cfg) {
  const root = new THREE.Group();
  root.position.set(cfg.position[0], 0, cfg.position[1]);
  root.rotation.y = cfg.facing;

  const desk = makeDesk();
  root.add(desk);
  const chair = makeChair();
  chair.position.set(0, 0, 0.95);
  root.add(chair);

  // 캐릭터는 의자에 앉아 책상(-z 방향)을 바라봅니다.
  const body = new THREE.Group();
  body.position.set(0, 0, 0.95);
  const torso = box(0.5, 0.65, 0.3, cfg.color, 0, 1.0, 0.05);
  const legs = box(0.46, 0.14, 0.55, 0x2c3140, 0, 0.62, -0.18);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), mat(0xf0c8a0));
  head.position.set(0, 1.55, 0.02);
  head.castShadow = true;
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  for (const [arm, x] of [[armL, -0.32], [armR, 0.32]]) {
    arm.position.set(x, 1.25, 0.05);
    const a = box(0.12, 0.12, 0.6, cfg.color, 0, 0, -0.3);
    arm.add(a);
    body.add(arm);
  }
  body.add(torso, legs, head);
  root.add(body);

  // 클릭 판정용 투명 상자
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.8, 1.2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(0, 1, 0.7);
  hit.userData.workerId = cfg.id;
  root.add(hit);
  clickable.push(hit);

  scene.add(root);

  const label = document.createElement('div');
  label.className = 'label';
  label.innerHTML = `<strong>${cfg.name}</strong> · ${cfg.role}<small>대기 중</small>`;
  labelsEl.appendChild(label);

  workers.set(cfg.id, {
    cfg, root, head, armL, armR, label,
    screenMat: desk.userData.screenMat,
    state: 'idle',
    history: [],
  });
}

EMPLOYEES.forEach(makeWorker);

function setState(worker, state) {
  worker.state = state;
  worker.label.classList.toggle('working', state === 'working');
  worker.label.querySelector('small').textContent = state === 'working' ? '작업 중…' : '대기 중';
}

// ---- 애니메이션 ----
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();

function animate() {
  const t = clock.getElapsedTime();
  for (const w of workers.values()) {
    w.head.position.y = 1.55 + Math.sin(t * 1.5) * 0.01;
    if (w.state === 'working') {
      w.armL.rotation.x = Math.sin(t * 18) * 0.12;
      w.armR.rotation.x = Math.sin(t * 18 + 1.7) * 0.12;
      w.head.rotation.x = 0.1;
      w.screenMat.emissiveIntensity = 0.8 + Math.sin(t * 14) * 0.25;
    } else {
      w.armL.rotation.x = 0;
      w.armR.rotation.x = 0;
      w.head.rotation.x = 0;
      w.screenMat.emissiveIntensity = 0.6;
    }
    // 머리 위 이름표 위치
    w.head.getWorldPosition(tmp);
    tmp.y += 0.5;
    tmp.project(camera);
    const visible = tmp.z < 1;
    w.label.style.display = visible ? '' : 'none';
    w.label.style.left = `${(tmp.x * 0.5 + 0.5) * window.innerWidth}px`;
    w.label.style.top = `${(-tmp.y * 0.5 + 0.5) * window.innerHeight}px`;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
animate();

// ---- 직원 클릭 ----
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; // 드래그는 무시
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  if (hit) openChat(hit.object.userData.workerId);
});

// ---- 채팅 ----
const chatEl = document.getElementById('chat');
const logEl = document.getElementById('chat-log');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('chat-input');
const sendEl = document.getElementById('chat-send');
let active = null;

function addMsg(kind, text) {
  const div = document.createElement('div');
  div.className = `msg ${kind}`;
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
  return div;
}

function openChat(id) {
  active = workers.get(id);
  document.getElementById('chat-name').textContent = active.cfg.name;
  document.getElementById('chat-role').textContent = active.cfg.role;
  logEl.replaceChildren();
  addMsg('assistant', active.cfg.greeting);
  for (const m of active.history) addMsg(m.role, m.content);
  chatEl.hidden = false;
  inputEl.focus();
}

document.getElementById('chat-close').addEventListener('click', () => {
  chatEl.hidden = true;
  active = null;
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const worker = active;
  const text = inputEl.value.trim();
  if (!worker || !text) return;

  inputEl.value = '';
  worker.history.push({ role: 'user', content: text });
  addMsg('user', text);
  sendEl.disabled = true;
  setState(worker, 'working');
  const pending = addMsg('assistant', '…');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: worker.cfg.id, messages: worker.history }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
    worker.history.push({ role: 'assistant', content: data.reply });
    pending.textContent = data.reply;
  } catch (err) {
    worker.history.pop(); // 실패한 질문은 기록에서 제거
    pending.className = 'msg error';
    pending.textContent = err.message;
  } finally {
    setState(worker, 'idle');
    sendEl.disabled = false;
    logEl.scrollTop = logEl.scrollHeight;
  }
});
