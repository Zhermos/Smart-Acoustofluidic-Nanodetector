// js/hero3d.js - Interactive Hero 3D Background Canvas
(function () {
  const container = document.getElementById('hero-3d-canvas');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 18;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Group to rotate with mouse
  const mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Outer Holographic Wireframe Chip Shell
  const chipGeo = new THREE.BoxGeometry(12, 6, 1.2);
  const chipMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  const chipMesh = new THREE.Mesh(chipGeo, chipMat);
  mainGroup.add(chipMesh);

  // Inner Core Glowing Glass Block
  const coreGeo = new THREE.BoxGeometry(10, 4.5, 0.8);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x032b43,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 1.2,
    transparent: true,
    opacity: 0.4
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  mainGroup.add(coreMesh);

  // Glowing Micro-channel Lines
  const channelGroup = new THREE.Group();
  const points = [];
  points.push(new THREE.Vector3(-5, 0, 0));
  points.push(new THREE.Vector3(-1, 0, 0));
  points.push(new THREE.Vector3(1, 1.2, 0));
  points.push(new THREE.Vector3(5, 1.8, 0));
  
  const pointsCenter = [];
  pointsCenter.push(new THREE.Vector3(-1, 0, 0));
  pointsCenter.push(new THREE.Vector3(5, 0, 0));

  const pointsBottom = [];
  pointsBottom.push(new THREE.Vector3(-1, 0, 0));
  pointsBottom.push(new THREE.Vector3(1, -1.2, 0));
  pointsBottom.push(new THREE.Vector3(5, -1.8, 0));

  const lineMatTop = new THREE.LineBasicMaterial({ color: 0xec4899, linewidth: 2 });
  const lineMatCenter = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
  const lineMatBottom = new THREE.LineBasicMaterial({ color: 0xec4899, linewidth: 2 });

  const geoTop = new THREE.BufferGeometry().setFromPoints(points);
  const geoCenter = new THREE.BufferGeometry().setFromPoints(pointsCenter);
  const geoBottom = new THREE.BufferGeometry().setFromPoints(pointsBottom);

  channelGroup.add(new THREE.Line(geoTop, lineMatTop));
  channelGroup.add(new THREE.Line(geoCenter, lineMatCenter));
  channelGroup.add(new THREE.Line(geoBottom, lineMatBottom));
  mainGroup.add(channelGroup);

  // Floating Nanoparticle Ring (Points system)
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const cyan = new THREE.Color(0x06b6d4);
  const pink = new THREE.Color(0xec4899);

  for (let i = 0; i < particleCount; i++) {
    const radius = 7 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.5;

    positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
    positions[i * 3 + 1] = radius * Math.sin(phi);
    positions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

    const c = Math.random() > 0.4 ? cyan : pink;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  mainGroup.add(particleSystem);

  // Animation Loop - Smooth Continuous Autonomous Rotation
  function animate() {
    requestAnimationFrame(animate);

    // Continuous slow rotation
    mainGroup.rotation.y += 0.004;
    mainGroup.rotation.x = Math.sin(Date.now() * 0.0005) * 0.15; // Gentle floating pitch movement

    particleSystem.rotation.y -= 0.002;
    particleSystem.rotation.z += 0.0008;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
})();
