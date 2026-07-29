// js/app.js - Main Application UI Controller & Event Handlers
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Initialize 3D Simulation Engine
  if (window.AcoustoSim) {
    window.AcoustoSim.init();
  }

  // UI Element References
  const btnToggleSim = document.getElementById('btn-toggle-sim');
  const btnToggleWave = document.getElementById('btn-toggle-wave');
  const btnToggleAI = document.getElementById('btn-toggle-ai');
  const btnResetSim = document.getElementById('btn-reset-sim');

  const sliderFlow = document.getElementById('slider-flow');
  const sliderPower = document.getElementById('slider-power');

  const valFlow = document.getElementById('val-flow');
  const valPower = document.getElementById('val-power');
  const valFreq = document.getElementById('val-freq');

  // Telemetry Elements
  const statTotal = document.getElementById('stat-total');
  const statExo = document.getElementById('stat-exo');
  const statCells = document.getElementById('stat-cells');
  const statPurity = document.getElementById('stat-purity');
  const statConfidence = document.getElementById('stat-confidence');
  const waveStatusBadge = document.getElementById('wave-status-badge');

  // Simulation Controls Event Listeners
  if (btnToggleSim) {
    btnToggleSim.addEventListener('click', () => {
      const isRunning = window.AcoustoSim.togglePlay();
      btnToggleSim.innerHTML = isRunning 
        ? `<i data-lucide="pause" class="w-4 h-4 mr-2"></i> Pause Simulation`
        : `<i data-lucide="play" class="w-4 h-4 mr-2"></i> Resume Simulation`;
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (btnToggleWave) {
    btnToggleWave.addEventListener('click', () => {
      const isActive = window.AcoustoSim.toggleStandingWave();
      if (waveStatusBadge) {
        waveStatusBadge.textContent = isActive ? 'ACTIVE (STANDING WAVE ON)' : 'DISABLED (NO FOCUSING)';
        waveStatusBadge.className = isActive 
          ? 'px-3 py-1 text-xs font-mono rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse'
          : 'px-3 py-1 text-xs font-mono rounded-full bg-red-500/20 text-red-400 border border-red-500/40';
      }
      btnToggleWave.className = isActive
        ? 'cyber-btn px-4 py-2 text-xs font-mono rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30'
        : 'cyber-btn px-4 py-2 text-xs font-mono rounded-lg bg-gray-800 border border-gray-600 text-gray-400 hover:bg-gray-700';
    });
  }

  if (btnToggleAI) {
    btnToggleAI.addEventListener('click', () => {
      const isAIOn = window.AcoustoSim.toggleAIVision();
      btnToggleAI.className = isAIOn
        ? 'cyber-btn px-4 py-2 text-xs font-mono rounded-lg bg-pink-500/20 border border-pink-400 text-pink-300 hover:bg-pink-500/30'
        : 'cyber-btn px-4 py-2 text-xs font-mono rounded-lg bg-gray-800 border border-gray-600 text-gray-400 hover:bg-gray-700';
    });
  }

  if (btnResetSim) {
    btnResetSim.addEventListener('click', () => {
      window.AcoustoSim.reset();
    });
  }

  // Slider Input Listeners
  if (sliderFlow) {
    sliderFlow.addEventListener('input', (e) => {
      const val = e.target.value;
      if (valFlow) valFlow.textContent = `${val} µL/min`;
      window.AcoustoSim.setFlowSpeed(val / 250);
    });
  }

  if (sliderPower) {
    sliderPower.addEventListener('input', (e) => {
      const val = e.target.value;
      if (valPower) valPower.textContent = `${val} Vpp`;
      window.AcoustoSim.setAcousticPower(val / 25);
    });
  }


  // Camera Presets
  const cameraBtns = document.querySelectorAll('[data-camera]');
  cameraBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-camera');
      window.AcoustoSim.setCameraPreset(preset);
      cameraBtns.forEach(b => b.classList.remove('border-cyan-400', 'text-cyan-300', 'bg-cyan-500/20'));
      btn.classList.add('border-cyan-400', 'text-cyan-300', 'bg-cyan-500/20');
    });
  });

  // Telemetry Callback Function
  window.onSimulationTelemetryUpdate = function (state) {
    if (statTotal) statTotal.textContent = state.totalParticles.toLocaleString();
    if (statExo) statExo.textContent = state.exosomesSeparated.toLocaleString();
    if (statCells) statCells.textContent = state.cellsSeparated.toLocaleString();
    if (statPurity) statPurity.textContent = `${state.purity}%`;
    if (statConfidence) statConfidence.textContent = `${state.confidence}%`;
  };

  // Smooth Scroll Navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});
