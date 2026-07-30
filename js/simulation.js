// js/simulation.js - 3D Acoustofluidic Simulation Engine using Three.js & OrbitControls
(function (global) {
  let container, scene, camera, renderer, controls;
  let standingWaveGroup, particleGroup, transducerGroup;
  let boundingBoxContainer;

  // State Variables
  const state = {
    isRunning: true,
    standingWaveActive: true,
    aiVisionActive: true,
    flowSpeed: 0.12, // velocity units per frame
    acousticPower: 1.0, // force multiplier
    frequency: 3.25, // MHz (Resonance frequency locked by channel width w = 230 um, f = c / 2w)
    channelWidthMicrons: 230,
    totalParticles: 0,
    exosomesSeparated: 0,
    cellsSeparated: 0,
    purity: 98.4,
    confidence: 99.2,
    fps: 60
  };

  const particles = [];
  const MAX_PARTICLES = 180;
  let frameCount = 0;
  let lastTime = performance.now();

  // Three.js Materials & Geometries
  const cellGeo = new THREE.SphereGeometry(0.32, 16, 16);
  const exosomeGeo = new THREE.SphereGeometry(0.12, 12, 12);

  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.5
  });

  const exosomeMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xdb2777,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.3
  });

  function initSimulation() {
    container = document.getElementById('sim-canvas-container');
    boundingBoxContainer = document.getElementById('ai-bbox-layer');
    if (!container) return;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.018);

    // Camera
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 22);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x030712, 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    if (window.THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xec4899, 1.2);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // Build 3D Models
    buildMicrofluidicChannel();
    buildTransducers();
    buildStandingWaveRegion();

    particleGroup = new THREE.Group();
    scene.add(particleGroup);

    // Pre-populate particles
    for (let i = 0; i < 60; i++) {
      spawnParticle(true);
    }

    // Window Resize Handler
    window.addEventListener('resize', onWindowResize);

    // Start Loop
    animate();
  }

  // 1. Build Transparent Glass Microfluidic Channel
  function buildMicrofluidicChannel() {
    const channelGroup = new THREE.Group();

    // Glass material
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      transmission: 0.85,
      thickness: 1.0,
      side: THREE.DoubleSide
    });

    const borderLineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.6
    });

    // Main Channel Box (Left to Middle)
    const mainGeo = new THREE.BoxGeometry(16, 4, 2);
    const mainMesh = new THREE.Mesh(mainGeo, glassMat);
    mainMesh.position.set(-4, 0, 0);
    channelGroup.add(mainMesh);

    // Wireframe outline for main channel
    const mainEdges = new THREE.EdgesGeometry(mainGeo);
    const mainLines = new THREE.LineSegments(mainEdges, borderLineMat);
    mainLines.position.set(-4, 0, 0);
    channelGroup.add(mainLines);

    // 3 Outlet Channels (Right Branching)
    // Top Outlet (Nanoparticles Outlet)
    const topOutletGeo = new THREE.BoxGeometry(8, 1.2, 1.6);
    const topOutletMesh = new THREE.Mesh(topOutletGeo, glassMat);
    topOutletMesh.position.set(8, 2.2, 0);
    topOutletMesh.rotation.z = 0.15;
    channelGroup.add(topOutletMesh);

    // Center Outlet (Cell Outlet)
    const centerOutletGeo = new THREE.BoxGeometry(8, 1.2, 1.6);
    const centerOutletMesh = new THREE.Mesh(centerOutletGeo, glassMat);
    centerOutletMesh.position.set(8, 0, 0);
    channelGroup.add(centerOutletMesh);

    // Bottom Outlet (Nanoparticles Outlet)
    const botOutletGeo = new THREE.BoxGeometry(8, 1.2, 1.6);
    const botOutletMesh = new THREE.Mesh(botOutletGeo, glassMat);
    botOutletMesh.position.set(8, -2.2, 0);
    botOutletMesh.rotation.z = -0.15;
    channelGroup.add(botOutletMesh);

    // Channel Inlet Housing (Far Left)
    const inletGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 16);
    const inletMesh = new THREE.Mesh(inletGeo, glassMat);
    inletMesh.position.set(-12, 0, 0);
    inletMesh.rotation.z = Math.PI / 2;
    channelGroup.add(inletMesh);

    scene.add(channelGroup);
  }

  // 2. Build Dual Ultrasonic Transducers (Top & Bottom PZT Blocks)
  function buildTransducers() {
    transducerGroup = new THREE.Group();

    const pztGeo = new THREE.BoxGeometry(8, 0.8, 2.4);
    const pztMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.3
    });

    // Top Transducer
    const topPZT = new THREE.Mesh(pztGeo, pztMat);
    topPZT.position.set(0, 2.6, 0);
    transducerGroup.add(topPZT);

    // Bottom Transducer
    const botPZT = new THREE.Mesh(pztGeo, pztMat);
    botPZT.position.set(0, -2.6, 0);
    transducerGroup.add(botPZT);

    // Transducer Electrodes / Wiring Highlights
    const electrodeGeo = new THREE.BoxGeometry(7.6, 0.1, 2.2);
    const electrodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    
    const topEl = new THREE.Mesh(electrodeGeo, electrodeMat);
    topEl.position.set(0, 2.15, 0);
    transducerGroup.add(topEl);

    const botEl = new THREE.Mesh(electrodeGeo, electrodeMat);
    botEl.position.set(0, -2.15, 0);
    transducerGroup.add(botEl);

    scene.add(transducerGroup);
  }

  // 3. Build 3D Standing Wave Visual Interference Planes
  function buildStandingWaveRegion() {
    standingWaveGroup = new THREE.Group();

    const waveCount = 9;
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < waveCount; i++) {
      const planeGeo = new THREE.PlaneGeometry(0.3, 3.8);
      const waveMesh = new THREE.Mesh(planeGeo, waveMat);
      waveMesh.position.set(-3.5 + i * 0.87, 0, 0);
      standingWaveGroup.add(waveMesh);
    }

    // Central Nodal Pressure Line (Gold Glowing Line)
    const nodeGeo = new THREE.BoxGeometry(8, 0.08, 0.08);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    nodeMesh.position.set(0, 0, 0);
    standingWaveGroup.add(nodeMesh);

    scene.add(standingWaveGroup);
  }

  // 4. Particle Spawner
  function spawnParticle(randomizeX = false) {
    const isLargeCell = Math.random() < 0.35; // 35% large cells, 65% exosomes
    const mesh = new THREE.Mesh(isLargeCell ? cellGeo : exosomeGeo, isLargeCell ? cellMat : exosomeMat);

    const startX = randomizeX ? -12 + Math.random() * 22 : -12;
    // Initial Y distribution across whole channel height
    const startY = (Math.random() - 0.5) * 3.2;
    const startZ = (Math.random() - 0.5) * 1.4;

    mesh.position.set(startX, startY, startZ);

    const particleObj = {
      mesh: mesh,
      type: isLargeCell ? 'CELL' : 'EXOSOME',
      vx: state.flowSpeed * (0.8 + Math.random() * 0.4),
      vy: 0,
      vz: 0,
      id: Math.floor(1000 + Math.random() * 9000),
      confidence: (96 + Math.random() * 3.8).toFixed(1),
      counted: false
    };

    particleGroup.add(mesh);
    particles.push(particleObj);
  }

  // 5. Physics Update Step
  function updatePhysics() {
    if (!state.isRunning) return;

    // Spawn new particles to maintain density
    if (particles.length < MAX_PARTICLES && Math.random() < 0.4) {
      spawnParticle(false);
    }

    const acousticZoneMinX = -4.0;
    const acousticZoneMaxX = 4.0;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Base fluid flow forward velocity
      p.mesh.position.x += p.vx * (state.flowSpeed / 0.12);

      // Acoustic Radiation Force calculation
      if (state.standingWaveActive && p.mesh.position.x >= acousticZoneMinX && p.mesh.position.x <= acousticZoneMaxX) {
        // Frad is strongly dependent on particle radius (Frad ~ r^3)
        // Large cells experience high acoustic radiation force pushing them to nodal center (Y = 0)
        // Nanoparticles experience negligible acoustic force relative to fluid drag force
        if (p.type === 'CELL') {
          const distToNode = 0 - p.mesh.position.y;
          // Acoustic restoring force towards Y=0
          const fAcoustic = distToNode * 0.18 * state.acousticPower * (state.frequency / 3.2);
          p.mesh.position.y += fAcoustic;
        } else {
          // Nanoparticles drift slightly due to parabolic flow velocity profile towards outer walls
          const wallRepulsion = p.mesh.position.y > 0 ? 0.005 : -0.005;
          p.mesh.position.y += wallRepulsion;
        }
      } else if (!state.standingWaveActive && p.mesh.position.x >= acousticZoneMinX) {
        // Without standing wave, particles maintain slight random laminar dispersion
        p.mesh.position.y += (Math.random() - 0.5) * 0.01;
      }

      // Outlet Divergence physics (X > 4.5)
      if (p.mesh.position.x > 4.5) {
        if (p.mesh.position.y > 0.8) {
          p.mesh.position.y += 0.025; // Top outlet stream
        } else if (p.mesh.position.y < -0.8) {
          p.mesh.position.y -= 0.025; // Bottom outlet stream
        } else {
          // Center outlet stream
          p.mesh.position.y *= 0.95;
        }
      }

      // Counting logic when particle passes X = 10
      if (!p.counted && p.mesh.position.x > 9.5) {
        p.counted = true;
        state.totalParticles++;
        if (p.type === 'CELL' && Math.abs(p.mesh.position.y) < 1.2) {
          state.cellsSeparated++;
        } else if (p.type === 'EXOSOME' && Math.abs(p.mesh.position.y) >= 1.0) {
          state.exosomesSeparated++;
        }
        updateTelemetryData();
      }

      // Remove particles exiting the screen (X > 14)
      if (p.mesh.position.x > 14) {
        particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        particles.splice(i, 1);
      }
    }

    // Animate standing wave glow pulsing effect
    if (standingWaveGroup) {
      standingWaveGroup.visible = state.standingWaveActive;
      if (state.standingWaveActive) {
        const time = Date.now() * 0.005;
        standingWaveGroup.children.forEach((child, idx) => {
          if (child.material) {
            child.material.opacity = 0.25 + Math.sin(time + idx * 0.8) * 0.15;
          }
        });
      }
    }
  }

  // 6. Update AI Vision 2D Bounding Boxes Over 3D Canvas
  function updateAIBoundingBoxes() {
    if (!boundingBoxContainer) return;

    if (!state.aiVisionActive || !state.isRunning) {
      boundingBoxContainer.innerHTML = '';
      return;
    }

    let html = '';
    const tempV = new THREE.Vector3();
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Filter particles in AI inspection zone (X between 0 and 7)
    const trackedParticles = particles.filter(p => p.mesh.position.x >= -1.0 && p.mesh.position.x <= 7.5).slice(0, 10);

    trackedParticles.forEach(p => {
      p.mesh.getWorldPosition(tempV);
      tempV.project(camera);

      // Check if inside camera view frustum
      if (tempV.z < 1) {
        const x = (tempV.x * 0.5 + 0.5) * width;
        const y = (tempV.y * -0.5 + 0.5) * height;

        const isCell = p.type === 'CELL';
        const boxSize = isCell ? 36 : 24;
        const cssClass = isCell ? 'ai-bbox ai-bbox-cell' : 'ai-bbox';
        const labelText = isCell ? `CELL #${p.id} [${p.confidence}%]` : `NANO #${p.id} [${p.confidence}%]`;

        html += `
          <div class="${cssClass}" style="left: ${x}px; top: ${y}px; width: ${boxSize}px; height: ${boxSize}px;">
            <div class="ai-label">${labelText}</div>
          </div>
        `;
      }
    });

    boundingBoxContainer.innerHTML = html;
  }

  // 7. Telemetry Metrics Calculator & UI Sync
  function updateTelemetryData() {
    if (state.totalParticles > 0) {
      const targetNanoParticles = state.exosomesSeparated;
      const targetCells = state.cellsSeparated;
      const totalSeparated = targetNanoParticles + targetCells;
      if (totalSeparated > 0) {
        state.purity = Math.min(99.8, (94.0 + (targetNanoParticles / totalSeparated) * 5.8)).toFixed(1);
      }
    }

    // Global UI update dispatch
    if (global.onSimulationTelemetryUpdate) {
      global.onSimulationTelemetryUpdate(state);
    }
  }

  // 8. Main Render & Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    // Calculate FPS
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      state.fps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${state.fps} FPS`;
    }

    if (controls) controls.update();
    updatePhysics();
    updateAIBoundingBoxes();

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // Exported Public Controls Object
  const simControls = {
    init: initSimulation,
    togglePlay: function () {
      state.isRunning = !state.isRunning;
      return state.isRunning;
    },
    toggleStandingWave: function () {
      state.standingWaveActive = !state.standingWaveActive;
      return state.standingWaveActive;
    },
    toggleAIVision: function () {
      state.aiVisionActive = !state.aiVisionActive;
      return state.aiVisionActive;
    },
    reset: function () {
      particles.forEach(p => {
        particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
      });
      particles.length = 0;
      state.totalParticles = 0;
      state.exosomesSeparated = 0;
      state.cellsSeparated = 0;
      state.purity = 98.4;
      updateTelemetryData();
      for (let i = 0; i < 60; i++) spawnParticle(true);
    },
    setFlowSpeed: function (val) {
      state.flowSpeed = parseFloat(val);
    },
    setAcousticPower: function (val) {
      state.acousticPower = parseFloat(val);
    },
    setFrequency: function (val) {
      state.frequency = parseFloat(val);
    },
    setCameraPreset: function (preset) {
      if (!camera || !controls) return;
      if (preset === 'top') {
        camera.position.set(0, 24, 0.1);
      } else if (preset === 'side') {
        camera.position.set(0, 0, 24);
      } else if (preset === 'iso') {
        camera.position.set(12, 14, 18);
      } else {
        // Default reset
        camera.position.set(0, 8, 22);
      }
      controls.target.set(0, 0, 0);
      controls.update();
    },
    getState: function () {
      return state;
    }
  };

  global.AcoustoSim = simControls;
})(window);
