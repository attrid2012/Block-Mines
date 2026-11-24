import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// SCENE

const sceneRoot = document.querySelector("#scene");

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x78c9ed);

scene.fog = new THREE.Fog(0x9bc9d9, 24, 85);

// CAMERA

const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  150
);

camera.position.set(0, 3, 10);

// RENDERER

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(
  Math.min(devicePixelRatio, 2)
);

renderer.setSize(innerWidth, innerHeight);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.15;

sceneRoot.appendChild(renderer.domElement);

// LIGHTING

scene.add(
  new THREE.HemisphereLight(
    0xe5f5ff,
    0x486342,
    2.1
  )
);

const sun = new THREE.DirectionalLight(
  0xffe3a1,
  3.2
);

sun.position.set(-18, 30, 12);

sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);

sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;

scene.add(sun);

// BLOCK MATERIALS

const mats = {

  grass: new THREE.MeshStandardMaterial({
    color: 0x70b94f,
    roughness: 1
  }),

  dirt: new THREE.MeshStandardMaterial({
    color: 0x96613d,
    roughness: 1
  }),

  stone: new THREE.MeshStandardMaterial({
    color: 0x929b9c,
    roughness: 0.95
  }),

  wood: new THREE.MeshStandardMaterial({
    color: 0x87512e,
    roughness: 1
  }),

  leaves: new THREE.MeshStandardMaterial({
    color: 0x368c48,
    roughness: 1
  }),

  sand: new THREE.MeshStandardMaterial({
    color: 0xe5cc83,
    roughness: 1
  }),

  brick: new THREE.MeshStandardMaterial({
    color: 0xc77a55,
    roughness: 0.9
  })

};

// BLOCK SYSTEM

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

const blocks = new Map();

const key = (x, y, z) =>
  `${x},${y},${z}`;

function addBlock(x, y, z, type = "grass") {

  const id = key(x, y, z);

  if (blocks.has(id)) return;

  const mesh = new THREE.Mesh(
    cubeGeo,
    mats[type] || mats.grass
  );

  mesh.position.set(x, y, z);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = {
    x,
    y,
    z,
    type
  };

  scene.add(mesh);

  blocks.set(id, mesh);

  return mesh;
}

function removeBlock(mesh) {

  const d = mesh.userData;

  scene.remove(mesh);

  blocks.delete(
    key(d.x, d.y, d.z)
  );

}

// TERRAIN

function heightAt(x, z) {

  return Math.floor(
    1.2 * Math.sin(x * 0.19) *
    Math.cos(z * 0.16) +
    0.8 * Math.sin(z * 0.25)
  );

}

for (let x = -22; x <= 22; x++) {

  for (let z = -22; z <= 22; z++) {

    const h = heightAt(x, z);

    for (let y = -2; y <= h; y++) {

      addBlock(
        x,
        y,
        z,
        y === h
          ? (Math.abs(h) < 0.2 ? "sand" : "grass")
          : (y < -1 ? "stone" : "dirt")
      );

    }

    if (
      Math.abs(x * 7 + z * 13) % 97 === 0 &&
      Math.abs(x) > 3 &&
      Math.abs(z) > 3
    ) {

      tree(x, h + 1, z);

    }

  }

}

// TREES

function tree(x, y, z) {

  for (let i = 0; i < 4; i++) {

    addBlock(x, y + i, z, "wood");

  }

  for (let dx = -2; dx <= 2; dx++) {

    for (let dz = -2; dz <= 2; dz++) {

      for (let dy = 2; dy <= 4; dy++) {

        if (
          Math.abs(dx) +
          Math.abs(dz) +
          (dy === 4 ? 1 : 0) < 5 &&
          Math.random() > 0.12
        ) {

          addBlock(
            x + dx,
            y + dy,
            z + dz,
            "leaves"
          );

        }

      }

    }

  }

}

// WATER

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(28, 10),

  new THREE.MeshStandardMaterial({
    color: 0x3dadd2,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85
  })
);

water.rotation.x = -Math.PI / 2;

water.position.set(5, -0.25, -9);

scene.add(water);

// MOUNTAINS

const mountains = new THREE.Group();

const mountainMat = new THREE.MeshStandardMaterial({
  color: 0x7f9e91,
  roughness: 1
});

for (let i = 0; i < 13; i++) {

  const h = 9 + Math.random() * 13;

  const m = new THREE.Mesh(
    new THREE.ConeGeometry(
      5 + Math.random() * 4,
      h,
      5
    ),
    mountainMat
  );

  m.position.set(
    -45 + i * 8,
    h / 2 - 2,
    -43 - Math.random() * 9
  );

  m.rotation.y = Math.random();

  mountains.add(m);

}

scene.add(mountains);

// PLAYER

const player = {

  x: 0,
  y: 4,
  z: 8,

  vx: 0,
  vy: 0,
  vz: 0,

  yaw: 0,
  pitch: 0,

  onGround: false

};

let playing = false;
let locked = false;
let selected = 0;

// HOTBAR

const types = [
  "grass",
  "dirt",
  "stone",
  "wood",
  "leaves",
  "brick"
];

const icons = [
  "▧",
  "▪",
  "◈",
  "▥",
  "✿",
  "▦"
];

const hotbar = document.querySelector("#hotbar");

types.forEach((type, i) => {

  const slot = document.createElement("div");

  slot.className =
    "slot" + (i === 0 ? " active" : "");

  slot.innerHTML =
    `<small>${i + 1}</small>${icons[i]}`;

  slot.addEventListener("click", () => {
    select(i);
  });

  hotbar.appendChild(slot);

});

function select(i) {

  selected = (i + types.length) % types.length;

  [...hotbar.children].forEach((element, n) => {

    element.classList.toggle(
      "active",
      n === selected
    );

  });

}

// BLOCK TARGETING

const raycaster = new THREE.Raycaster();

raycaster.far = 7;

function targetBlock() {

  raycaster.setFromCamera(
    new THREE.Vector2(0, 0),
    camera
  );

  const hits = raycaster.intersectObjects(
    [...blocks.values()]
  );

  return hits[0] || null;

}

// BREAK BLOCK

function breakBlock() {

  const hit = targetBlock();

  if (hit && hit.object.userData.y > -2) {

    removeBlock(hit.object);

  }

}

// PLACE BLOCK

function placeBlock() {

  const hit = targetBlock();

  if (!hit) return;

  const p = hit.object.position
    .clone()
    .add(hit.face.normal);

  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const z = Math.round(p.z);

  if (
    Math.abs(x - player.x) < 1 &&
    Math.abs(z - player.z) < 1 &&
    Math.abs(y - (player.y - 1)) < 2
  ) return;

  addBlock(
    x,
    y,
    z,
    types[selected]
  );

}

// MOUSE CONTROLS

renderer.domElement.addEventListener(
  "click",
  () => {

    if (playing && !locked) {

      renderer.domElement.requestPointerLock();

    }

  }
);

document.addEventListener(
  "pointerlockchange",
  () => {

    locked =
      document.pointerLockElement === renderer.domElement;

    document.querySelector("#tip").textContent =
      locked
        ? "LEFT CLICK: BREAK · RIGHT CLICK: PLACE"
        : "CLICK TO CAPTURE MOUSE";

    if (playing && !locked) {

      document
        .querySelector("#pausePanel")
        .classList.remove("hidden");

    }

  }
);

document.addEventListener(
  "mousemove",
  (e) => {

    if (!locked) return;

    player.yaw -= e.movementX * 0.0022;

    player.pitch -= e.movementY * 0.0022;

    player.pitch = Math.max(
      -1.45,
      Math.min(1.45, player.pitch)
    );

  }
);

document.addEventListener(
  "contextmenu",
  (e) => {

    if (playing) e.preventDefault();

  }
);

document.addEventListener(
  "mousedown",
  (e) => {

    if (!playing || !locked) return;

    if (e.button === 0) breakBlock();

    if (e.button === 2) placeBlock();

  }
);

// KEYBOARD

const keys = {};

document.addEventListener(
  "keydown",
  (e) => {

    keys[e.code] = true;

    if (e.code.startsWith("Digit")) {

      select(
        Number(e.code.slice(5)) - 1
      );

    }

    if (
      e.code === "Escape" &&
      playing &&
      !locked
    ) {

      document
        .querySelector("#pausePanel")
        .classList.remove("hidden");

    }

  }
);

document.addEventListener(
  "keyup",
  (e) => {

    keys[e.code] = false;

  }
);

// START GAME

function startGame() {

  playing = true;

  document
    .querySelector("#menu")
    .classList.add("hidden");

  document
    .querySelector("#hud")
    .classList.remove("hidden");

  document
    .querySelector("#pausePanel")
    .classList.add("hidden");

  player.x = 0;
  player.y = 5;
  player.z = 8;

  renderer.domElement.requestPointerLock();

}

document
  .querySelector("#playBtn")
  .addEventListener("click", startGame);

// HOW TO PLAY

document
  .querySelector("#howBtn")
  .addEventListener("click", () => {

    document
      .querySelector("#howPanel")
      .classList.remove("hidden");

  });

document
  .querySelector("#closeHow")
  .addEventListener("click", () => {

    document
      .querySelector("#howPanel")
      .classList.add("hidden");

  });

// RESUME

document
  .querySelector("#resumeBtn")
  .addEventListener("click", () => {

    document
      .querySelector("#pausePanel")
      .classList.add("hidden");

    renderer.domElement.requestPointerLock();

  });

// BACK TO MENU

document
  .querySelector("#menuBtn")
  .addEventListener("click", () => {

    playing = false;

    document.exitPointerLock();

    document
      .querySelector("#pausePanel")
      .classList.add("hidden");

    document
      .querySelector("#hud")
      .classList.add("hidden");

    document
      .querySelector("#menu")
      .classList.remove("hidden");

  });

// GAME LOOP

let last = performance.now();

function animate(now) {

  requestAnimationFrame(animate);

  const dt = Math.min(
    (now - last) / 1000,
    0.04
  );

  last = now;

  if (playing && locked) {

    const forward =
      (keys.KeyW ? 1 : 0) -
      (keys.KeyS ? 1 : 0);

    const side =
      (keys.KeyD ? 1 : 0) -
      (keys.KeyA ? 1 : 0);

    const speed = keys.ShiftLeft ? 9 : 5.5;

    const dx =
      (
        -Math.sin(player.yaw) * forward +
        Math.cos(player.yaw) * side
      ) * speed * dt;

    const dz =
      (
        -Math.cos(player.yaw) * forward -
        Math.sin(player.yaw) * side
      ) * speed * dt;

    player.x += dx;
    player.z += dz;

    // JUMP

    if (keys.Space && player.onGround) {

      player.vy = 7.5;

      player.onGround = false;

    }

    player.vy -= 19 * dt;

    player.y += player.vy * dt;

    // GROUND

    const ground =
      heightAt(
        Math.round(player.x),
        Math.round(player.z)
      ) + 2.65;

    if (player.y < ground) {

      player.y = ground;

      player.vy = 0;

      player.onGround = true;

    }

    // CAMERA

    camera.position.set(
      player.x,
      player.y,
      player.z
    );

    camera.rotation.order = "YXZ";

    camera.rotation.y = player.yaw;

    camera.rotation.x = player.pitch;

    // COORDINATES

    document.querySelector("#coords").textContent =
      `X ${Math.round(player.x)} · Y ${Math.round(player.y)} · Z ${Math.round(player.z)}`;

  }

  // WATER MOVEMENT

  water.position.z =
    -9 + Math.sin(now * 0.0005) * 0.18;

  sun.position.x =
    -18 + Math.sin(now * 0.00004) * 8;

  renderer.render(scene, camera);

}

requestAnimationFrame(animate);

// RESIZE

addEventListener(
  "resize",
  () => {

    camera.aspect =
      innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );

  }
);
