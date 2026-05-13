import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const wrap = document.getElementById('viewer-wrap');
const msg = document.getElementById('loader-msg');
const modelFile = wrap.dataset.model;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFAEEDA);

const camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(wrap.clientWidth, wrap.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.6, 0);
controls.minDistance = 1.5;
controls.maxDistance = 8;

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const spot = new THREE.SpotLight(0xffffff, 2);
spot.position.set(3, 5, 4);
spot.angle = Math.PI / 5;
spot.penumbra = 0.4;
scene.add(spot);

// headlight on the camera
const headlight = new THREE.DirectionalLight(0xffffff, 0.8);
headlight.position.set(0, 1, 5);
camera.add(headlight);
scene.add(camera);

let model = null;
let mixer = null;
let lidAction = null;
let wf = false;
let rotating = false;
let lidOpen = false;
const clock = new THREE.Clock();
const loader = new GLTFLoader();

loader.load(
  `models/${modelFile}.glb`,
  (gltf) => {
    model = gltf.scene;

    // centre and scale to fit the viewer
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(s);
    model.position.x -= c.x * s;
    model.position.z -= c.z * s;
    model.position.y -= box.min.y * s;

    scene.add(model);

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      lidAction = mixer.clipAction(gltf.animations[0]);
      lidAction.setLoop(THREE.LoopOnce);
      lidAction.clampWhenFinished = true;
      lidAction.play();
      lidAction.paused = true;
      lidAction.time = 0;
    }

    console.log('loaded', modelFile);
    msg.style.display = 'none';
  },
  undefined,
  (err) => {
    console.error('load failed', err);
    msg.textContent = 'Could not load model.';
  }
);

function setWireframe(on) {
  wf = on;
  if (!model) return;
  model.traverse(o => {
    if (o.isMesh) o.material.wireframe = on;
  });
}

document.getElementById('btn-wireframe').addEventListener('click', (e) => {
  setWireframe(!wf);
  e.target.classList.toggle('active', wf);
});

document.getElementById('btn-animate').addEventListener('click', (e) => {
  if (!lidAction) return;

  if (!lidOpen) {
    lidAction.paused = false;
    lidAction.timeScale = 1;
    if (lidAction.time >= lidAction.getClip().duration) {
      lidAction.time = 0;
      lidAction.reset();
      lidAction.play();
    }
    e.target.textContent = 'Close Lid';
    lidOpen = true;
  } else {
    lidAction.paused = false;
    lidAction.timeScale = -1;
    if (lidAction.time <= 0) lidAction.time = lidAction.getClip().duration;
    lidAction.play();
    e.target.textContent = 'Open Lid';
    lidOpen = false;
  }
});

document.getElementById('btn-rotate').addEventListener('click', (e) => {
  rotating = !rotating;
  controls.autoRotate = rotating;
  controls.autoRotateSpeed = 1.5;
  e.target.classList.toggle('active', rotating);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  camera.position.set(0, 1.2, 4);
  controls.target.set(0, 0.6, 0);
  controls.update();
});

document.getElementById('light-ambient').addEventListener('input', (e) => {
  ambient.intensity = parseFloat(e.target.value);
});
document.getElementById('light-spot').addEventListener('input', (e) => {
  spot.intensity = parseFloat(e.target.value);
});
document.getElementById('btn-headlight').addEventListener('click', (e) => {
  headlight.visible = !headlight.visible;
  e.target.textContent = `Headlight: ${headlight.visible ? 'ON' : 'OFF'}`;
});


function animate() {
  requestAnimationFrame(animate);
  if (mixer) mixer.update(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = wrap.clientWidth / wrap.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
});

animate();
