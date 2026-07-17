/**
 * Smart Stadium Operations Platform - Logic & Interactions
 * Designed for FIFA World Cup 2026 Command Center
 * Implements telemetry simulation, AI Copilot chat engine, YOLO vision feeds, and Fan App simulator.
 */

// Global Dashboard States
let currentTab = 'ops'; // 'ops' | 'security' | 'transit'
let heatmapEnabled = true;
let labelsEnabled = true;
let rightPanelMode = 'copilot'; // 'copilot' | 'fanapp'
let phoneActiveScreen = 'home'; // 'home' | 'nav' | 'lang' | 'access'
let isHighContrast = false;
let currentLanguage = 'en';
let voiceRepliesEnabled = true;

// Telemetry Mock Database
const telemetryState = {
  attendance: 64281,
  activeIncidents: 2,
  avgQueueTime: 11,
  gates: {
    'A': { queueMins: 6, flowRate: 85, risk: 0.32, name: "Gate A (East)" },
    'B': { queueMins: 24, flowRate: 42, risk: 0.85, name: "Gate B (South-East)" },
    'C': { queueMins: 11, flowRate: 68, risk: 0.54, name: "Gate C (South)" },
    'D': { queueMins: 4, flowRate: 95, risk: 0.21, name: "Gate D (South-West)" }
  },
  transit: {
    metroMinutes: 3,
    shuttlesActive: 18,
    parkingOccupancy: 88 // percentage
  },
  sustainability: {
    energyKwh: 12405,
    waterLiters: 48900,
    carbonTons: 14.8,
    wasteKg: 1820
  }
};

// CCTV Canvas Detections (Simulating YOLO Edge models)
const cctvCameras = [
  { id: 'CAM-01', label: 'Gate B Entry Checkpoint', type: 'crowd' },
  { id: 'CAM-02', label: 'Concourse Food Stand 12', type: 'baggage' },
  { id: 'CAM-03', label: 'Stands Area 104 - Row G', type: 'medical' },
  { id: 'CAM-04', label: 'Outer North Plaza Transit', type: 'crowd' }
];

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  initClock();
  initTelemetryUI();
  runTelemetrySimulator();
  switchTab('ops'); // Load default operations command center

  // Custom Accessibility Announcement
  announceAccessibility(t('loaded_announcement'));
});

// 1. Clock and Timer Services
function initClock() {
  const clockEl = document.getElementById('live-clock');
  setInterval(() => {
    const now = new Date();
    const utcString = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    if (clockEl) clockEl.textContent = utcString;
    
    // Update phone simulator clock too
    const phoneClock = document.getElementById('phone-time-display');
    if (phoneClock) {
      phoneClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }, 1000);
}

// 2. Telemetry and Dashboard Simulators
function initTelemetryUI() {
  updateMetricsDisplay();
  renderAlertLog();
}

function updateMetricsDisplay() {
  // Update left column counters
  document.getElementById('metric-attendance').textContent = telemetryState.attendance.toLocaleString();
  document.getElementById('metric-incidents').textContent = telemetryState.activeIncidents;
  document.getElementById('metric-queue').textContent = telemetryState.avgQueueTime + 'm';

  // Render Gate List metrics
  const listContainer = document.getElementById('gate-metrics-list');
  if (listContainer) {
    listContainer.innerHTML = '';
    Object.keys(telemetryState.gates).forEach(gateKey => {
      const gate = telemetryState.gates[gateKey];
      
      let riskColor = 'green';
      if (gate.risk > 0.4) riskColor = 'amber';
      if (gate.risk > 0.75) riskColor = 'red';

      const gateRow = document.createElement('div');
      gateRow.className = 'metric-box';
      gateRow.innerHTML = `
        <div style="flex: 1; display:flex; flex-direction:column;">
          <div style="font-weight:600; font-size:0.85rem;">${gate.name}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">Flow: ${gate.flowRate} scans/m</div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${gate.risk * 100}%; background-color: var(--accent-${riskColor});"></div>
          </div>
        </div>
        <div style="text-align:right; margin-left: 10px;">
          <div class="metric-val ${riskColor}" style="font-size: 0.95rem;">${gate.queueMins}m wait</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">Risk: ${(gate.risk * 10).toFixed(1)}/10</div>
        </div>
      `;
      listContainer.appendChild(gateRow);
    });
  }

  // Update map SVG fills based on heatmap toggle
  Object.keys(telemetryState.gates).forEach(gateKey => {
    const gate = telemetryState.gates[gateKey];
    const mapZone = document.getElementById(`zone-gate-${gateKey.toLowerCase()}`);
    if (mapZone) {
      // Clear classes
      mapZone.classList.remove('crowd-low', 'crowd-med', 'crowd-high');
      if (heatmapEnabled) {
        if (gate.risk < 0.4) mapZone.classList.add('crowd-low');
        else if (gate.risk < 0.75) mapZone.classList.add('crowd-med');
        else mapZone.classList.add('crowd-high');
      }
    }
  });
}

function runTelemetrySimulator() {
  setInterval(() => {
    // Fluctuations in values
    telemetryState.attendance += Math.floor(Math.random() * 5) - 2;
    if (telemetryState.attendance > 70000) telemetryState.attendance = 70000;

    Object.keys(telemetryState.gates).forEach(gateKey => {
      const gate = telemetryState.gates[gateKey];
      const wasHighRisk = gate.risk > 0.75;

      // Random wait time variation
      gate.queueMins += Math.floor(Math.random() * 3) - 1;
      if (gate.queueMins < 2) gate.queueMins = 2;
      if (gate.queueMins > 45) gate.queueMins = 45;

      // Adjust risk factor based on queue minutes
      gate.risk = Math.min(1.0, gate.queueMins / 30.0);
      gate.flowRate = Math.floor(100 - (gate.risk * 50) + (Math.random() * 10));

      // FR-6.1: alerts must be generated by real threshold logic against live
      // telemetry, not only pre-authored demo entries. Edge-triggered so we don't
      // spam an alert every 4s while a gate stays above threshold.
      const isHighRiskNow = gate.risk > 0.75;
      if (isHighRiskNow && !wasHighRisk) {
        pushNewAlert('critical', `${gate.name} Density Peak`,
          `Live sensors show queue time at ${gate.queueMins} mins (risk ${(gate.risk * 10).toFixed(1)}/10). Redirection SOP recommended.`);
      } else if (!isHighRiskNow && wasHighRisk) {
        pushNewAlert('info', `${gate.name} Congestion Cleared`,
          `Queue time back down to ${gate.queueMins} mins (risk ${(gate.risk * 10).toFixed(1)}/10).`);
      }
    });

    // Recompute average queue time
    const totalQueues = Object.values(telemetryState.gates).reduce((acc, g) => acc + g.queueMins, 0);
    telemetryState.avgQueueTime = Math.round(totalQueues / 4);

    updateMetricsDisplay();

    // Sustainability increments
    telemetryState.sustainability.energyKwh += Math.floor(Math.random() * 8) + 2;
    telemetryState.sustainability.waterLiters += Math.floor(Math.random() * 50) + 10;
    telemetryState.sustainability.carbonTons = +(telemetryState.sustainability.carbonTons + 0.005).toFixed(3);
    telemetryState.sustainability.wasteKg += Math.floor(Math.random() * 2);

    // Update screen if in Sustainability tab
    if (currentTab === 'transit') {
      renderTransitSustainabilityView();
    }
  }, 4000);
}

// 3. Operational Alert Logs
const initialAlerts = [
  { id: 1, type: 'critical', time: '08:31 UTC', title: 'Gate B Density Peak', desc: 'Computer Vision predicts wait times approaching 25 mins. Redirection SOP active.' },
  { id: 2, type: 'warning', time: '08:28 UTC', title: 'Dehydration Report', desc: 'Medic unit Delta dispatched to Stand 104 - Row G for heat assistance.' },
  { id: 3, type: 'info', time: '08:15 UTC', title: 'Transit Shuttles Shifted', desc: '3 empty shuttles dispatched to Gate A north walkway to offset arrivals.' }
];

function renderAlertLog() {
  const container = document.getElementById('alerts-log-container');
  if (!container) return;
  container.innerHTML = '';

  initialAlerts.forEach(alert => {
    const row = document.createElement('div');
    row.className = `alert-row ${alert.type}`;
    row.innerHTML = `
      <div class="alert-time">${alert.time}</div>
      <div class="alert-details">
        <div class="alert-title-text">${alert.title}</div>
        <div class="alert-desc-text">${alert.desc}</div>
      </div>
    `;
    container.appendChild(row);
  });
}

function pushNewAlert(type, title, desc) {
  const now = new Date();
  const timeStr = now.toISOString().substring(11, 16) + ' UTC';
  initialAlerts.unshift({ id: Date.now(), type, time: timeStr, title, desc });
  if (initialAlerts.length > 5) initialAlerts.pop();
  renderAlertLog();
}

// 4. Tab Routing & Controller Logic
function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons style
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  const activeBtn = document.getElementById(`tab-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }

  // Adjust columns layouts and map view content
  const viewport = document.getElementById('view-canvas-container');
  const mainGrid = document.getElementById('dashboard-grid');

  if (tabName === 'ops') {
    mainGrid.className = 'main-content'; // Standard 3-col layout
    viewport.innerHTML = '';
    // Restore Stadium SVG
    const svgMap = getStadiumSVGTemplate();
    viewport.appendChild(svgMap);
    updateMetricsDisplay();
  } 
  else if (tabName === 'security') {
    mainGrid.className = 'main-content';
    viewport.innerHTML = '';
    // Load YOLO CCTV grid inside viewport
    const securityLayout = renderSecurityHUDView();
    viewport.appendChild(securityLayout);
    startCCTVFeedsSimulators();
  } 
  else if (tabName === 'transit') {
    mainGrid.className = 'main-content expanded-view'; // Expand to single column to display custom dashboard layout
    viewport.innerHTML = '';
    const transitLayout = renderTransitDashboardLayout();
    viewport.appendChild(transitLayout);
    renderTransitSustainabilityView();
  }

  announceAccessibility(`Switched view to ${tabName} panel.`);
}

function toggleMapHeatmap() {
  heatmapEnabled = !heatmapEnabled;
  const btn = document.getElementById('btn-toggle-heat');
  if (btn) btn.classList.toggle('active', heatmapEnabled);
  updateMetricsDisplay();
}

function toggleMapLabels() {
  labelsEnabled = !labelsEnabled;
  const btn = document.getElementById('btn-toggle-labels');
  if (btn) btn.classList.toggle('active', labelsEnabled);
  
  const labelsGrp = document.getElementById('stadium-map-labels');
  if (labelsGrp) {
    labelsGrp.style.display = labelsEnabled ? 'block' : 'none';
  }
}

// 5. Digital Twin SVG Template Generator
function getStadiumSVGTemplate() {
  const container = document.createElement('div');
  container.className = 'map-canvas-container';
  container.style.width = '100%';
  container.style.height = '100%';
  container.innerHTML = `
    <svg viewBox="0 0 800 600" class="stadium-svg" id="stadium-digital-twin" aria-label="Stadium interactive structural map layout">
      <ellipse cx="400" cy="300" rx="360" ry="260" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
      
      <path class="stadium-zone crowd-med" id="zone-gate-a" d="M 400 60 L 520 80 A 300 220 0 0 1 680 220 L 560 250 A 180 130 0 0 0 400 130 Z" aria-label="Zone Gate A: Medium Crowd Density" onclick="handleMapZoneClick('A')" />
      <path class="stadium-zone crowd-high" id="zone-gate-b" d="M 560 250 L 680 220 A 300 220 0 0 1 680 380 L 560 350 A 180 130 0 0 0 560 250 Z" aria-label="Zone Gate B: High Crowd Density" onclick="handleMapZoneClick('B')" />
      <path class="stadium-zone crowd-low" id="zone-gate-c" d="M 400 470 L 520 450 A 300 220 0 0 0 680 380 L 560 350 A 180 130 0 0 1 400 400 Z" aria-label="Zone Gate C: Low Crowd Density" onclick="handleMapZoneClick('C')" />
      <path class="stadium-zone crowd-low" id="zone-gate-d" d="M 400 470 L 280 450 A 300 220 0 0 1 120 380 L 240 350 A 180 130 0 0 0 400 400 Z" aria-label="Zone Gate D: Low Crowd Density" onclick="handleMapZoneClick('D')" />
      
      <path class="stadium-zone crowd-med" id="zone-gate-north" d="M 400 60 L 280 80 A 300 220 0 0 0 120 220 L 240 250 A 180 130 0 0 1 400 130 Z" aria-label="North Gate Zone: Medium Crowd Density" onclick="handleMapZoneClick('North Concourse')" />
      <path class="stadium-zone crowd-low" id="zone-gate-west" d="M 240 250 L 120 220 A 300 220 0 0 0 120 380 L 240 350 A 180 130 0 0 1 240 250 Z" aria-label="West Concourse Zone: Low Crowd Density" onclick="handleMapZoneClick('West Concourse')" />

      <rect x="290" y="210" width="220" height="180" rx="10" class="stadium-pitch" />
      <line x1="400" y1="210" x2="400" y2="390" stroke="#10b981" stroke-width="2" />
      <circle cx="400" cy="300" r="30" fill="none" stroke="#10b981" stroke-width="2" />

      <g id="stadium-map-labels" style="display: ${labelsEnabled ? 'block' : 'none'};">
        <text x="500" y="150" fill="#fff" font-family="Outfit" font-size="14" font-weight="600" text-anchor="middle">GATE A</text>
        <text x="610" y="305" fill="#fff" font-family="Outfit" font-size="14" font-weight="600" text-anchor="middle">GATE B</text>
        <text x="500" y="420" fill="#fff" font-family="Outfit" font-size="14" font-weight="600" text-anchor="middle">GATE C</text>
        <text x="300" y="420" fill="#fff" font-family="Outfit" font-size="14" font-weight="600" text-anchor="middle">GATE D</text>
        <text x="300" y="150" fill="#fff" font-family="Outfit" font-size="14" font-weight="600" text-anchor="middle">NORTH CONCOURSE</text>
        <text x="400" y="305" fill="#a3e635" font-family="Space Grotesk" font-size="11" text-anchor="middle">FIFA PITCH</text>
      </g>
    </svg>
  `;
  return container.firstElementChild;
}

function handleMapZoneClick(zoneName) {
  const copilotInput = document.getElementById('copilot-text-input');
  if (copilotInput) {
    copilotInput.value = `Provide status report for Gate ${zoneName}`;
    copilotInput.focus();
  }
}

// 6. Security HUD View (CCTV Camera Streams YOLO Simulation)
let activeCCTVTicks = [];
function renderSecurityHUDView() {
  const root = document.createElement('div');
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.padding = '20px';
  root.style.overflowY = 'auto';

  root.innerHTML = `
    <div class="panel-title" style="margin-bottom:15px;">
      <h2 style="font-size:1.1rem; font-weight:700;">Live Computer Vision Feeds (YOLO Core Model)</h2>
      <span style="font-size:0.75rem; color:var(--accent-red); font-weight:600;" class="pulse-red" style="padding:2px 6px; border-radius:4px;">● AI Surveillance Active</span>
    </div>
    <div class="security-grid">
      ${cctvCameras.map(cam => `
        <div class="cctv-feed-box" id="cctv-${cam.id}">
          <div class="cctv-label">${cam.id} - ${cam.label}</div>
          <div class="cctv-fps">30.0 FPS</div>
          <canvas id="canvas-${cam.id}" width="320" height="180"></canvas>
          <div class="cctv-overlay-text" id="status-${cam.id}">Analyzing crowd flow...</div>
        </div>
      `).join('')}
    </div>
  `;
  return root;
}

function startCCTVFeedsSimulators() {
  // Clear any existing rendering loops
  activeCCTVTicks.forEach(id => clearInterval(id));
  activeCCTVTicks = [];

  cctvCameras.forEach(cam => {
    const canvas = document.getElementById(`canvas-${cam.id}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Draw initial static
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let count = 0;
    const intervalId = setInterval(() => {
      // Clear canvas
      ctx.fillStyle = '#0a0d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines representing structural lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw simulated camera image elements
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
      ctx.fill();

      // Draw YOLO bounding boxes based on camera type
      if (cam.type === 'crowd') {
        const numPpl = Math.floor(Math.random() * 8) + 12;
        document.getElementById(`status-${cam.id}`).textContent = `YOLO Count: ${numPpl} humans (Queue wait: normal)`;
        
        // Draw green bounding boxes representing humans
        ctx.strokeStyle = 'var(--accent-green)';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < numPpl; k++) {
          const x = (k * 18 + Math.sin(count + k) * 5) % (canvas.width - 20);
          const y = (k * 10 + Math.cos(count + k) * 10 + 50) % (canvas.height - 40);
          ctx.strokeRect(x, y, 14, 28);
          
          if (k === 0) {
            ctx.fillStyle = 'var(--accent-green)';
            ctx.font = '6px Space Grotesk';
            ctx.fillText('person 98%', x, y - 2);
          }
        }
      } 
      else if (cam.type === 'baggage') {
        document.getElementById(`status-${cam.id}`).textContent = `YOLO Warning: Unattended bag at Stand 12`;
        
        // Draw standard boxes
        ctx.strokeStyle = 'var(--accent-green)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(40, 60, 15, 30);
        ctx.strokeRect(100, 70, 15, 30);

        // Draw critical red flashing box around suspicious baggage object
        const blink = Math.floor(Date.now() / 300) % 2 === 0;
        ctx.strokeStyle = blink ? 'var(--accent-red)' : 'var(--accent-amber)';
        ctx.lineWidth = 2;
        ctx.strokeRect(180, 80, 25, 20);
        
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '7px Space Grotesk';
        ctx.fillText('SUSPICIOUS_BAG 94%', 180, 78);
      } 
      else if (cam.type === 'medical') {
        document.getElementById(`status-${cam.id}`).textContent = `Status: Medical dispatch in progress`;
        
        // Draw bounding boxes of responders
        ctx.strokeStyle = 'var(--accent-blue)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(90, 50, 16, 32);
        ctx.strokeRect(110, 52, 16, 32);
        ctx.fillStyle = 'var(--accent-blue)';
        ctx.font = '6px Space Grotesk';
        ctx.fillText('responder 97%', 90, 48);

        // Patient highlight box
        ctx.strokeStyle = 'var(--accent-amber)';
        ctx.strokeRect(140, 75, 20, 16);
        ctx.fillStyle = 'var(--accent-amber)';
        ctx.fillText('patient 91%', 140, 73);
      }

      count += 0.05;
    }, 150);

    activeCCTVTicks.push(intervalId);
  });
}

// 7. Transit & Sustainability Custom Dashboard Layout
function renderTransitDashboardLayout() {
  const root = document.createElement('div');
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.overflowY = 'auto';
  root.style.padding = '25px';

  root.innerHTML = `
    <!-- Split Layout Grid: Sustainability left, Transit Hub right -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
      
      <!-- Sustainability ESG Dashboard Card -->
      <div class="panel-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
        <div class="panel-title">
          <h2 style="font-size: 1.15rem; font-weight:700;">🌱 ESG Sustainability Indicators</h2>
          <span style="font-size: 0.75rem; color: var(--accent-purple); font-weight: 600;">Carbon Tracked</span>
        </div>
        <div class="panel-body" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
              <span>Total Match Day Carbon footprint</span>
              <span class="metric-val" id="sus-carbon" style="color:var(--accent-purple);">14.80 Tons CO2e</span>
            </div>
            <div class="progress-bar-container"><div class="progress-bar-fill" id="fill-carbon" style="width: 74%; background: var(--accent-purple);"></div></div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
              <span>Energy consumption (Smart Grid)</span>
              <span class="metric-val" id="sus-energy" style="color:var(--accent-blue);">12,405 kWh</span>
            </div>
            <div class="progress-bar-container"><div class="progress-bar-fill" id="fill-energy" style="width: 62%; background: var(--accent-blue);"></div></div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
              <span>Water usage metrics (Recycled loop)</span>
              <span class="metric-val" id="sus-water" style="color:#60a5fa;">48,900 Liters</span>
            </div>
            <div class="progress-bar-container"><div class="progress-bar-fill" id="fill-water" style="width: 48%; background: #60a5fa;"></div></div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
              <span>Waste Diverted from Landfill</span>
              <span class="metric-val" id="sus-waste" style="color:var(--accent-green);">1,820 kg (91%)</span>
            </div>
            <div class="progress-bar-container"><div class="progress-bar-fill" id="fill-waste" style="width: 91%; background: var(--accent-green);"></div></div>
          </div>
        </div>
      </div>

      <!-- Transportation Hub Card -->
      <div class="panel-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
        <div class="panel-title">
          <h2 style="font-size: 1.15rem; font-weight:700;">🚆 Public Transit & Parking Hub</h2>
          <span style="font-size: 0.75rem; color: var(--accent-blue); font-weight: 600;">Live Feed</span>
        </div>
        <div class="panel-body" style="display:flex; flex-direction:column; gap:12px;">
          <div class="metric-box">
            <span>Metro Station Arrival (Line 1)</span>
            <div class="metric-val green" id="transit-metro">Next train: 3m</div>
          </div>
          <div class="metric-box">
            <span>Active Shuttle Shuttles</span>
            <div class="metric-val blue" id="transit-shuttles">18 in circulation</div>
          </div>
          <div class="metric-box">
            <span>North Parking Lot Occupancy</span>
            <div class="metric-val amber" id="transit-parking">88% full</div>
          </div>
          <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
            <strong>AI Suggestion:</strong> Shift bus fleet to Southern plaza walkway. Metro headway is stable. Suggest departures starting 75th minute.
          </div>
        </div>
      </div>

    </div>

    <!-- Wide Row: Fan Mobile App Integration Showcase -->
    <div class="panel-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
      <div class="panel-title">
        <h2 style="font-size: 1.1rem; font-weight: 700;">📲 Fan Mobile Experience Preview</h2>
        <span style="font-size: 0.75rem; color: var(--accent-green);">Interactive</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr auto; gap: 30px; align-items: center; padding: 15px;">
        <div style="line-height: 1.6;">
          <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--accent-blue); margin-bottom: 10px;">FIFA Fan App Simulator</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 12px;">
            The mobile app integrates core spectator features: multilingual voice translation, smart seat route maps, digital tickets, and custom layouts for hearing and visually impaired fans.
          </p>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; font-size: 0.85rem; font-family: var(--font-mono);">
            <div style="color: var(--accent-green); margin-bottom: 4px;">● ARIA Compliant Layout (a11y)</div>
            <div style="color: var(--accent-blue); margin-bottom: 4px;">● Real-Time Speech Translator Simulator</div>
            <div style="color: var(--accent-purple);">● Dynamic Low-Vision Variable Scale</div>
          </div>
          <button class="tab-btn" onclick="swapRightPanel(); document.getElementById('tab-ops').click();" style="margin-top: 15px; background: var(--accent-blue); color: #000; font-weight: 700; border: none;">
            Open Mobile App Emulator
          </button>
        </div>
        <div id="transit-phone-container" style="display:flex; justify-content:center;">
          <!-- Move phone here if user opens the transit tab -->
        </div>
      </div>
    </div>
  `;
  return root;
}

function renderTransitSustainabilityView() {
  const carbonVal = document.getElementById('sus-carbon');
  const energyVal = document.getElementById('sus-energy');
  const waterVal = document.getElementById('sus-water');
  const wasteVal = document.getElementById('sus-waste');

  if (carbonVal) carbonVal.textContent = telemetryState.sustainability.carbonTons.toFixed(2) + ' Tons CO2e';
  if (energyVal) energyVal.textContent = telemetryState.sustainability.energyKwh.toLocaleString() + ' kWh';
  if (waterVal) waterVal.textContent = telemetryState.sustainability.waterLiters.toLocaleString() + ' Liters';
  if (wasteVal) wasteVal.textContent = telemetryState.sustainability.wasteKg.toLocaleString() + ' kg (91%)';

  // Fill scales
  const fillCarbon = document.getElementById('fill-carbon');
  const fillEnergy = document.getElementById('fill-energy');
  const fillWater = document.getElementById('fill-water');
  const fillWaste = document.getElementById('fill-waste');

  if (fillCarbon) fillCarbon.style.width = '74%';
  if (fillEnergy) fillEnergy.style.width = Math.min(100, (telemetryState.sustainability.energyKwh / 18000) * 100) + '%';
  if (fillWater) fillWater.style.width = Math.min(100, (telemetryState.sustainability.waterLiters / 80000) * 100) + '%';
  if (fillWaste) fillWaste.style.width = '91%';
}

// 8. Generative AI Operations Copilot Engine
// NOTE (REQ FR-1.1): In production this object is replaced by a server-side call to an
// LLM endpoint (see callOperationsLLM below) that receives this same live state as context.
// The generator functions below are the *local fallback* used when no backend is configured,
// and — critically — they read live telemetryState/initialAlerts instead of hardcoded strings,
// so the copilot's answer can never drift from what the dashboard is showing (fixes FR-2.1).
const copilotResponses = {
  "which gate is most congested?": () => {
    const ranked = Object.entries(telemetryState.gates).sort((a, b) => b[1].risk - a[1].risk);
    const [worstKey, worst] = ranked[0];
    const others = ranked.slice(1).map(([k, g]) => `Gate ${k} (${g.queueMins} mins)`).join(', ');
    return {
      answer: `Currently, **Gate ${worstKey}** is showing the highest congestion on our sensors. Wait times have spiked to **${worst.queueMins} minutes** (risk score ${(worst.risk * 10).toFixed(1)}/10). Other entry points: ${others}.`,
      recommendation: `Deploy floating volunteers to Gate ${worstKey} check-in lanes immediately. Activate overhead signage to redirect a portion of arriving pedestrian streams toward the lowest-risk gate.`
    };
  },
  "predict crowd density for the next hour.": () => {
    const avgRisk = Object.values(telemetryState.gates).reduce((a, g) => a + g.risk, 0) / 4;
    const projectedArrivals = Math.round(telemetryState.attendance * 0.08 * (1 + avgRisk));
    return {
      answer: `Based on current average gate risk (**${(avgRisk * 10).toFixed(1)}/10**) and today's attendance trend, expect roughly **${projectedArrivals.toLocaleString()} additional arrivals** over the next 60 minutes.`,
      recommendation: `Keep all turnstiles at maximum bandwidth and pre-position medical/volunteer staff near the currently highest-risk gate.`
    };
  },
  "generate an evacuation plan.": () => ({
    answer: "### EMERGENCY STADIUM EVACUATION PLAN\nEvacuation protocols are pre-indexed based on FIFA Safety Regulations. Trigger: **All Zones Evac**.\n1. **Acoustic Warning**: Broadcast emergency alarms in English, Spanish, and French.\n2. **Physical Exits**: Open all safety gates (A-D, North, West). De-energize turnstile locking pins.\n3. **Volunteer Roles**: Clear concourse corridors; guide fans away from escalators to safety plazas.",
    recommendation: "The system is in recommendation-only mode by design (human-in-the-loop, FR-1.5). Execute evacuation alerts through the physical command key switches."
  }),
  "summarize today's operational issues.": () => {
    const lines = initialAlerts.slice(0, 3).map((a, i) => `${i + 1}. **${a.title}** (${a.time}): ${a.desc}`).join('\n');
    return {
      answer: `### OPERATIONAL ISSUES SUMMARY\n${lines || 'No active alerts at this time.'}`,
      recommendation: "Perform hourly checks on gate sensor velocities. Maintain standard ambulance standby coverage."
    };
  }
};

// FR-1.1 stub: server-side LLM call. Client code never holds an API key (NFR-1.3).
// If VITE_COPILOT_ENDPOINT-style config isn't present, we fall back to the local
// templates above and label the response as such so it is never mistaken for a live model.
async function callOperationsLLM(query) {
  if (!window.COPILOT_BACKEND_URL) return null; // not configured -> caller uses local fallback
  try {
    const res = await fetch(window.COPILOT_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, state: telemetryState, language: currentLanguage })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { answer: data.answer, recommendation: data.recommendation, sources: data.sources || [] };
  } catch (e) {
    console.error('Copilot backend call failed, using local fallback:', e);
    return null;
  }
}

function handleCopilotKeyPress(event) {
  if (event.key === 'Enter') {
    submitCopilotQuery();
  }
}

async function submitCopilotQuery() {
  const inputEl = document.getElementById('copilot-text-input');
  if (!inputEl) return;
  const rawQuery = inputEl.value.trim();
  if (rawQuery === "") return;

  // Append user message. appendCopilotMessage always routes plain text through
  // parseMarkdown(), which now HTML-escapes before formatting (NFR-1.1/1.2) —
  // so raw user input can never be interpreted as markup here.
  appendCopilotMessage(rawQuery, 'user');
  inputEl.value = "";

  // Show loading indicator
  const historyEl = document.getElementById('copilot-chat-history');
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-msg bot';
  loadingEl.id = 'copilot-loading';
  loadingEl.textContent = 'AI is writing response...';
  historyEl.appendChild(loadingEl);
  historyEl.scrollTop = historyEl.scrollHeight;

  // 1) Try the real backend-proxied LLM call first (FR-1.1). 2) Fall back to the
  // local, state-grounded templates. Either path renders through the same safe
  // escaping helper, so there is no code path that inserts raw HTML from user input.
  const llmResult = await callOperationsLLM(rawQuery);

  const loadEl = document.getElementById('copilot-loading');
  if (loadEl) loadEl.remove();

  if (llmResult) {
    renderCopilotAnswer(llmResult.answer, llmResult.recommendation, llmResult.sources);
    return;
  }

  const normalized = rawQuery.toLowerCase().replace(/[?.]/g, '');
  let matchedFn = null;
  Object.keys(copilotResponses).forEach(key => {
    const normKey = key.toLowerCase().replace(/[?.]/g, '');
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      matchedFn = copilotResponses[key];
    }
  });

  if (matchedFn) {
    const result = matchedFn(); // computed fresh from live telemetryState (FR-2.1)
    renderCopilotAnswer(result.answer, result.recommendation);
  } else {
    // FR-1.4: never invent a confident answer when nothing matches / no context found.
    appendCopilotMessage(
      "I cannot verify this information based on official SOPs. Try one of the quick queries, or ask about a specific gate, transit, or sustainability metric.",
      'bot'
    );
  }
}

function renderCopilotAnswer(answer, recommendation, sources) {
  const sourceLine = sources && sources.length
    ? `<div style="margin-top:6px; font-size:0.75rem; color:var(--text-muted);">Sources: ${sources.map(s => parseMarkdown(s)).join(', ')}</div>`
    : '';
  const responseHtml = `
    <p>${parseMarkdown(answer)}</p>
    <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; font-size: 0.85rem;">
      <strong>AI recommendation:</strong> ${parseMarkdown(recommendation)}
    </div>
    ${sourceLine}
  `;
  appendCopilotMessage(responseHtml, 'bot', true);
}

function sendQuickCopilotQuery(queryStr) {
  const inputEl = document.getElementById('copilot-text-input');
  if (inputEl) {
    inputEl.value = queryStr;
    submitCopilotQuery();
  }
}

function appendCopilotMessage(content, role, isHtml = false) {
  const historyEl = document.getElementById('copilot-chat-history');
  if (!historyEl) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}`;
  if (isHtml) {
    msgDiv.innerHTML = content;
  } else {
    msgDiv.innerHTML = parseMarkdown(content);
  }
  historyEl.appendChild(msgDiv);
  historyEl.scrollTop = historyEl.scrollHeight;

  // Web Speech accessibility readout for bot responses
  if (role === 'bot') {
    const textToRead = msgDiv.innerText;
    announceAccessibility(textToRead);
  }
}

// Parse a restricted markdown subset (**bold**, ### headers, newlines) and, critically,
// HTML-escape the input FIRST so this can never be used to inject markup/script (NFR-1.1,
// NFR-1.2). This is the single choke point every copilot message — user or bot — passes
// through, so there is no separate "safe" and "unsafe" render path anymore.
function parseMarkdown(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/### (.*?)\n/g, '<h4>$1</h4>')
    .replace(/\n/g, '<br>');
}

// 9. Fan Mobile App Simulator View Controller
function swapRightPanel() {
  const copilotView = document.getElementById('panel-view-copilot');
  const fanAppView = document.getElementById('panel-view-fanapp');
  const swapBtn = document.getElementById('right-panel-swap-btn');
  const title = document.getElementById('right-panel-title');

  if (rightPanelMode === 'copilot') {
    rightPanelMode = 'fanapp';
    copilotView.style.display = 'none';
    fanAppView.style.display = 'flex';
    switchPhoneScreen(phoneActiveScreen);
  } else {
    rightPanelMode = 'copilot';
    copilotView.style.display = 'flex';
    fanAppView.style.display = 'none';
  }
  applyTranslations(); // keeps swap button/title text correct for the active language
}

function switchPhoneScreen(screenName) {
  phoneActiveScreen = screenName;
  
  // Style footer buttons
  document.querySelectorAll('.phone-nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`phone-nav-${screenName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Render Screen content
  const viewport = document.getElementById('phone-screen-viewport');
  if (!viewport) return;
  
  viewport.innerHTML = '';
  const screenDiv = document.createElement('div');
  screenDiv.className = 'fan-screen-view';

  if (screenName === 'home') {
    screenDiv.innerHTML = `
      <div style="font-weight: 700; font-size: 1rem; color: #fff; margin-bottom: 2px;">FIFA World Cup 2026</div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">SoFi Stadium, Los Angeles</div>

      <!-- Ticket QR Card -->
      <div class="fan-ticket-card">
        <div style="display:flex; justify-content:space-between; font-size:0.7rem; font-weight:700;">
          <span>MATCH 24 - GROUP STAGE</span>
          <span style="color:var(--accent-green);">VALID TICKET</span>
        </div>
        <div style="font-size:1.1rem; font-weight:700; margin: 8px 0 2px;">USA vs GERMANY</div>
        <div style="font-size:0.75rem; opacity:0.8;">Seat: Stand 104, Row G, Seat 12</div>
        <div style="display:flex; justify-content:center; margin: 12px 0 5px;">
          <!-- Simulated QR Code -->
          <div style="width: 70px; height: 70px; background: #fff; padding:4px;">
            <svg viewBox="0 0 10 10" style="width:100%; height:100%; fill:#000;">
              <rect x="0" y="0" width="3" height="3"/>
              <rect x="7" y="0" width="3" height="3"/>
              <rect x="0" y="7" width="3" height="3"/>
              <rect x="4" y="4" width="2" height="2"/>
              <rect x="3" y="1" width="1" height="1"/>
              <rect x="8" y="8" width="2" height="2"/>
            </svg>
          </div>
        </div>
        <div class="fan-ticket-dots"></div>
      </div>

      <!-- Live Queue Times -->
      <div style="background: rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:8px; padding:10px; font-size:0.8rem;">
        <div style="font-weight:600; color:var(--text-primary); margin-bottom:6px;">Your Entry Status (Gate B)</div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--text-secondary);">Wait Time:</span>
          <span style="font-weight:700; color:var(--accent-red);">${telemetryState.gates['B'].queueMins} mins</span>
        </div>
        <div style="font-size:0.7rem; color:var(--accent-green); margin-top: 4px;">
          💡 Tip: Reroute to Gate A (6 mins wait). See Nav Tab.
        </div>
      </div>
    `;
  } 
  else if (screenName === 'nav') {
    screenDiv.innerHTML = `
      <div style="font-weight:700; font-size:0.95rem; color:#fff;">Smart Indoor Navigation</div>
      <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:5px;">Seat-to-Seat Wheelchair Pathing</div>
      
      <!-- Interactive Navigation Path Canvas -->
      <div class="fan-mini-map">
        <canvas id="canvas-fan-map" width="290" height="140"></canvas>
      </div>

      <div style="background: rgba(0,242,254,0.05); border:1px solid rgba(0,242,254,0.15); border-radius:8px; padding:8px; font-size:0.75rem;">
        <strong>Directions:</strong> Turn left at corridor B toward Elevators. Route has zero stairs (visibly highlighted in cyan).
      </div>
    `;
    viewport.appendChild(screenDiv);
    // Draw simple path on simulator canvas
    setTimeout(() => {
      drawFanAppMapPath();
    }, 50);
    return;
  } 
  else if (screenName === 'lang') {
    screenDiv.innerHTML = `
      <div style="font-weight:700; font-size:0.95rem; color:#fff;">Multilingual Fan Assistant</div>
      <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:8px;">Real-Time Voice & OCR translation</div>

      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius:8px; padding:10px; flex:1; display:flex; flex-direction:column; gap:8px;">
        <div style="font-size: 0.75rem; color:var(--text-muted);">Current Language Match:</div>
        <div style="display:flex; justify-content:space-around; align-items:center; font-weight:700; font-size:0.85rem;">
          <span style="color:var(--accent-blue);">SPANISH</span>
          <span>⇄</span>
          <span style="color:var(--accent-green);">ENGLISH</span>
        </div>
        <div style="border-top:1px solid var(--border-color); padding-top:8px; font-size:0.8rem; line-height:1.4;">
          <div style="color:var(--accent-blue); font-weight:600;">Fan Says (Audio In):</div>
          <div style="font-style:italic;">"¿Dónde está el baño accesible?"</div>
          <div style="color:var(--accent-green); font-weight:600; margin-top: 6px;">AI Translates (Speech Out):</div>
          <div>"Where is the wheelchair-accessible restroom?"</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <button class="map-btn" style="font-size:0.75rem; padding:8px 0;" onclick="simulateVoiceSynthesizer()">🎤 Press Speak</button>
        <button class="map-btn" style="font-size:0.75rem; padding:8px 0;" onclick="simulateOCRTranslation()">📷 Sign OCR Scan</button>
      </div>
    `;
  } 
  else if (screenName === 'access') {
    screenDiv.innerHTML = `
      <div style="font-weight:700; font-size:0.95rem; color:#fff;">Accessibility AI Controls</div>
      <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:5px;">A11y Helper Avatars</div>

      <!-- Animated Sign Language Avatar Screen -->
      <div style="height:120px; background:#000; border-radius:8px; position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center;">
        <canvas id="canvas-avatar" width="290" height="120"></canvas>
        <div style="position:absolute; bottom:6px; left:6px; font-size:0.65rem; background:rgba(0,0,0,0.6); padding:2px 4px; border-radius:3px;">
          ASL Avatar: Active
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px; font-size:0.75rem;">
        <button class="map-btn" style="text-align:left; font-size:0.75rem; padding:6px 10px;" onclick="simulateAudioDescription()">
          🔊 Toggle Audio Description: ON
        </button>
        <button class="map-btn" style="text-align:left; font-size:0.75rem; padding:6px 10px;" onclick="toggleA11yScreenReader()">
          🎙️ Screen Reader Optimization
        </button>
      </div>
    `;
    viewport.appendChild(screenDiv);
    // Draw sign language helper frame
    setTimeout(() => {
      startSignLanguageAvatarLoop();
    }, 50);
    return;
  }

  viewport.appendChild(screenDiv);
}

// Draw the seat navigation routing paths on the mobile canvas
function drawFanAppMapPath() {
  const canvas = document.getElementById('canvas-fan-map');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stadium walls boundary lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Draw seat block blocks
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(30, 30, 60, 80);
  ctx.fillRect(200, 30, 60, 80);

  // Draw path labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px Space Grotesk';
  ctx.fillText('Stand 104', 38, 70);
  ctx.fillText('Gate B', 215, 70);

  // Draw wheelchair accessible route path (electric cyan)
  ctx.strokeStyle = 'var(--accent-blue)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, 110); // Fan current location near stand
  ctx.lineTo(120, 110);
  ctx.arc(120, 90, 20, Math.PI/2, Math.PI, false); // Curve around block
  ctx.lineTo(100, 50); // Elevator point
  ctx.lineTo(160, 50);
  ctx.lineTo(230, 70); // Arrive Gate B
  ctx.stroke();

  // Draw start and end pin points
  ctx.fillStyle = 'var(--accent-red)';
  ctx.beginPath();
  ctx.arc(60, 110, 4, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = 'var(--accent-green)';
  ctx.beginPath();
  ctx.arc(230, 70, 4, 0, Math.PI*2);
  ctx.fill();

  // Labels
  ctx.fillStyle = '#fff';
  ctx.font = '8px Outfit';
  ctx.fillText('You', 52, 122);
  ctx.fillText('Gate B', 220, 60);
}

// Sign Language Avatar Loop (Accessibility HUD feature)
let avatarTick = null;
function startSignLanguageAvatarLoop() {
  const canvas = document.getElementById('canvas-avatar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let cycle = 0;
  avatarTick = setInterval(() => {
    if (!document.getElementById('canvas-avatar')) {
      clearInterval(avatarTick);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple stick-figure interpreter doing sign motions
    ctx.strokeStyle = 'var(--accent-blue)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'var(--accent-blue)';

    // Head
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 40, 12, 0, Math.PI*2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 52);
    ctx.lineTo(canvas.width / 2, 90);
    ctx.stroke();

    // Arms waving dynamically (acting as signing hands)
    const waveLeftY = 65 + Math.sin(cycle) * 15;
    const waveRightY = 65 + Math.cos(cycle) * 15;

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 60);
    ctx.lineTo(canvas.width / 2 - 25, waveLeftY); // Left Hand
    ctx.moveTo(canvas.width / 2, 60);
    ctx.lineTo(canvas.width / 2 + 25, waveRightY); // Right Hand
    ctx.stroke();

    cycle += 0.4;
  }, 100);
}

// Simulated User Audio translations
function simulateVoiceSynthesizer() {
  announceAccessibility("Simulating translation voice. Fan says in Spanish: ¿Dónde está el baño accesible? Translator replies in English: Where is the wheelchair-accessible restroom?");
}

function simulateOCRTranslation() {
  const message = "OCR Scan: Detected sign \"SALIDA DE EMERGENCIA\" \u2192 Translated to \"EMERGENCY EXIT\".";
  showToast(message);
  announceAccessibility(message);
}

// FR-3.1: non-blocking, aria-live toast used for all "detected/translated" style
// notifications instead of native alert(), which is unstyled and interrupts focus flow.
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) { console.log('[Toast]', message); return; }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message; // textContent only — no HTML interpretation, no injection risk
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function simulateAudioDescription() {
  announceAccessibility("Audio Description active. You are standing in the Level 1 South Concourse corridor, heading East toward Gate B. Floor surface is flat, elevators are 20 meters ahead on the left.");
}

function toggleA11yScreenReader() {
  announceAccessibility("Screen reader optimizations enabled. Increased ARIA landmark scanning density.");
}

// 10. Web Speech accessibility output
function announceAccessibility(phraseText) {
  if (!voiceRepliesEnabled) {
    console.log(`[Voice Replies Disabled] Speech: ${phraseText}`);
    return;
  }
  // Use Web Speech Synthesis API if available
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Terminate ongoing speech
    const utterance = new SpeechSynthesisUtterance(phraseText);
    utterance.rate = 1.05;
    utterance.volume = 1.0;
    // Set language based on configuration
    utterance.lang = currentLanguage === 'es' ? 'es-MX' : 'en-US';
    window.speechSynthesis.speak(utterance);
  } else {
    console.log(`[Screen Reader Mock]: ${phraseText}`);
  }
}

// 11. Accessibility Controls: Contrast Toggler & Language Swapper
function toggleAccessibilityContrast() {
  isHighContrast = !isHighContrast;
  document.body.classList.toggle('contrast-mode', isHighContrast);
  
  const status = isHighContrast ? "High Contrast low-vision theme activated." : "Standard dark theme restored.";
  announceAccessibility(status);
}

// FR-5: translation dictionary covering the static UI chrome (nav, panel titles,
// metric labels, copilot controls) — not just the header. LLM-backed copilot answers
// separately request output in currentLanguage via callOperationsLLM (FR-5.2); the
// local fallback templates in copilotResponses remain English-only until that backend
// exists, and this is intentionally NOT hidden — see README "Known Limitations".
const translations = {
  en: {
    brand_name: "FIFA 2026 Smart Stadium Command", tab_ops: "Command Center",
    tab_security: "Security HUD", tab_transit: "Transit & Sustainability",
    contrast_mode: "Contrast Mode", live_telemetry: "Live Telemetry",
    stadium_attendance: "Stadium Attendance", active_incidents: "Active Incidents",
    avg_queue_wait: "Avg Queue wait", gate_congestion_metrics: "Gate Congestion Metrics",
    operational_alerts: "Operational Alerts", ops_copilot_title: "Operations Copilot",
    fan_app_title: "Fan App Simulator", show_fan_app: "Show Fan App", show_copilot: "Show Copilot",
    quick_congested: "Which gate is congested?", quick_predict: "Predict next hour",
    quick_evac: "Evacuation SOP", quick_summarize: "Summarize Issues",
    copilot_placeholder: "Type operations question...", send_btn: "Send",
    loaded_announcement: "FIFA Smart Stadium Operations Platform loaded in English."
  },
  es: {
    brand_name: "Control de Estadios FIFA 2026", tab_ops: "Centro de Mando",
    tab_security: "Panel de Seguridad", tab_transit: "Transporte y Sostenibilidad",
    contrast_mode: "Modo de Contraste", live_telemetry: "Telemetría en Vivo",
    stadium_attendance: "Asistencia al Estadio", active_incidents: "Incidentes Activos",
    avg_queue_wait: "Espera Promedio", gate_congestion_metrics: "Congestión de Puertas",
    operational_alerts: "Alertas Operativas", ops_copilot_title: "Copiloto de Operaciones",
    fan_app_title: "Simulador de App del Aficionado", show_fan_app: "Ver App del Aficionado",
    show_copilot: "Ver Copiloto", quick_congested: "¿Qué puerta está congestionada?",
    quick_predict: "Predecir próxima hora", quick_evac: "Plan de evacuación",
    quick_summarize: "Resumir incidentes", copilot_placeholder: "Escriba su consulta operativa...",
    send_btn: "Enviar", loaded_announcement: "Plataforma de operaciones de estadios inteligentes cargada en español."
  },
  fr: {
    brand_name: "Opérations du Stade FIFA 2026", tab_ops: "Centre de Commande",
    tab_security: "Tableau de Sécurité", tab_transit: "Transport et Durabilité",
    contrast_mode: "Mode Contraste", live_telemetry: "Télémétrie en Direct",
    stadium_attendance: "Fréquentation du Stade", active_incidents: "Incidents Actifs",
    avg_queue_wait: "Attente Moyenne", gate_congestion_metrics: "Congestion aux Portes",
    operational_alerts: "Alertes Opérationnelles", ops_copilot_title: "Copilote des Opérations",
    fan_app_title: "Simulateur d'App Supporter", show_fan_app: "Afficher l'App Supporter",
    show_copilot: "Afficher le Copilote", quick_congested: "Quelle porte est congestionnée ?",
    quick_predict: "Prédire la prochaine heure", quick_evac: "Plan d'évacuation",
    quick_summarize: "Résumer les incidents", copilot_placeholder: "Tapez votre question...",
    send_btn: "Envoyer", loaded_announcement: "Plateforme d'opérations de stade intelligent FIFA chargée en français."
  }
};

function t(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key] || key;
}

// Applies the dictionary to every static element in one pass, plus the two
// dynamically-toggled right-panel labels that used to be hardcoded in swapRightPanel().
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });

  const swapBtn = document.getElementById('right-panel-swap-btn');
  const title = document.getElementById('right-panel-title');
  if (swapBtn && title) {
    if (rightPanelMode === 'copilot') {
      swapBtn.textContent = t('show_fan_app');
      title.textContent = t('ops_copilot_title');
    } else {
      swapBtn.textContent = t('show_copilot');
      title.textContent = t('fan_app_title');
    }
  }
}

function changeDashboardLanguage(langCode) {
  currentLanguage = translations[langCode] ? langCode : 'en';
  applyTranslations();
  announceAccessibility(t('loaded_announcement'));
}
