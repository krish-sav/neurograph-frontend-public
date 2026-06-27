/*
  NeuroGraph 3D Brain UI Logic
  Loads neurograph.json and renders evidence-linked neuroscience relationships
  as a Three.js brain map with clickable regions, directional pathways, filters,
  selection details, camera controls, and JSON export.
*/

import * as THREE from "./three.module.js";

const state = {
  graph: { nodes: [], edges: [] },
  filteredNodes: [],
  filteredEdges: [],
  selectedEdge: null,
  selectedTypes: new Set(),
  query: "",
  minConfidence: 0,
  maxYear: 2023,
  scene: null,
  camera: null,
  renderer: null,
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  brainGroup: new THREE.Group(),
  nodeGroup: new THREE.Group(),
  edgeGroup: new THREE.Group(),
  labelGroup: new THREE.Group(),
  nodeObjects: new Map(),
  edgeObjects: new Map(),
  width: 0,
  height: 0,
  orbit: {
    yaw: -0.42,
    pitch: 0.22,
    radius: 7.4,
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  },
};

const colors = {
  Excitatory: 0x4f9cff,
  Inhibitory: 0xef5b5b,
  Modulatory: 0xd6a83f,
  Unknown: 0x9aa4a0,
};

const cssColors = {
  Excitatory: "#4f9cff",
  Inhibitory: "#ef5b5b",
  Modulatory: "#d6a83f",
  Unknown: "#9aa4a0",
};

const nodeColors = {
  brain_region: 0x14b8a6,
  cell_type: 0x8bdb81,
  disease: 0xef5b5b,
  concept: 0x9aa4a0,
};

const brainPositions = {
  Amygdala: [-1.05, -0.55, 0.2],
  Hippocampus: [-0.72, -0.36, -0.92],
  "Prefrontal Cortex": [0.0, 0.36, 1.95],
  Retina: [-2.55, -0.72, 2.25],
  "Retinal Ganglion Cells": [-2.35, -0.58, 2.05],
  "Optic Nerve": [-1.72, -0.48, 1.55],
  LGN: [-0.62, -0.12, 0.66],
  "Primary Visual Cortex": [-0.18, 0.16, -2.12],
  "Superior Colliculus": [0.08, -0.48, -0.38],
  "Motor Cortex": [0.78, 0.88, 0.36],
  "Dorsolateral Striatum": [0.92, -0.18, 0.02],
  "Layer V Pyramidal Neurons": [0.66, 1.1, 0.48],
  VTA: [0.0, -0.88, 0.1],
  SNc: [0.38, -0.86, -0.12],
  "Parkinson's Disease": [2.48, -0.18, -0.36],
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  initThree();
  bindEvents();

  try {
    const response = await fetch("neurograph.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load graph: ${response.status}`);
    }
    state.graph = await response.json();
    prepareGraph();
    buildTypeFilters();
    updateMetrics();
    applyFilters();
    animate();
  } catch (error) {
    els.emptyState.hidden = false;
    els.emptyState.querySelector("strong").textContent = "Graph data did not load";
    els.emptyState.querySelector("span").textContent = error.message;
  }
}

function cacheElements() {
  els.canvas = document.getElementById("brainCanvas");
  els.searchInput = document.getElementById("searchInput");
  els.confidenceSlider = document.getElementById("confidenceSlider");
  els.confidenceValue = document.getElementById("confidenceValue");
  els.yearSlider = document.getElementById("yearSlider");
  els.yearValue = document.getElementById("yearValue");
  els.typeFilters = document.getElementById("typeFilters");
  els.nodeCount = document.getElementById("nodeCount");
  els.edgeCount = document.getElementById("edgeCount");
  els.paperCount = document.getElementById("paperCount");
  els.conflictCount = document.getElementById("conflictCount");
  els.viewTitle = document.getElementById("viewTitle");
  els.emptyState = document.getElementById("emptyState");
  els.detailTitle = document.getElementById("detailTitle");
  els.detailMeta = document.getElementById("detailMeta");
  els.detailSummary = document.getElementById("detailSummary");
  els.evidenceCount = document.getElementById("evidenceCount");
  els.evidenceList = document.getElementById("evidenceList");
  els.pathList = document.getElementById("pathList");
  els.fitButton = document.getElementById("fitButton");
  els.resetButton = document.getElementById("resetButton");
  els.exportButton = document.getElementById("exportButton");
}

function initThree() {
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x111816);
  state.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  state.renderer = new THREE.WebGLRenderer({
    canvas: els.canvas,
    antialias: true,
    alpha: false,
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;

  const ambient = new THREE.HemisphereLight(0xdff8f3, 0x0f1412, 1.6);
  state.scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 5, 7);
  state.scene.add(key);

  const rim = new THREE.PointLight(0x14b8a6, 20, 10);
  rim.position.set(-3.6, 2.2, -3.0);
  state.scene.add(rim);

  state.scene.add(state.brainGroup, state.edgeGroup, state.nodeGroup, state.labelGroup);
  buildBrainModel();
  resizeRenderer();
  updateCamera();
}

function buildBrainModel() {
  state.brainGroup.clear();

  const hemisphereMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd9fff7,
    transparent: true,
    opacity: 0.14,
    roughness: 0.38,
    metalness: 0.02,
    transmission: 0.12,
    depthWrite: false,
  });
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x7edbd0,
    transparent: true,
    opacity: 0.16,
    wireframe: true,
  });

  const left = createHemisphere(-0.58, hemisphereMaterial, wireMaterial);
  const right = createHemisphere(0.58, hemisphereMaterial, wireMaterial);
  state.brainGroup.add(left, right);

  const midline = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 2.05, 4.35),
    new THREE.MeshBasicMaterial({ color: 0xdff8f3, transparent: true, opacity: 0.15 })
  );
  midline.position.set(0, 0.08, 0);
  state.brainGroup.add(midline);

  const brainStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 1.35, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xb3dfd7, transparent: true, opacity: 0.22, roughness: 0.5 })
  );
  brainStem.position.set(0.18, -1.28, -0.34);
  brainStem.rotation.x = -0.2;
  state.brainGroup.add(brainStem);

  const cerebellum = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 40, 24),
    new THREE.MeshPhysicalMaterial({ color: 0x9fe6dc, transparent: true, opacity: 0.14, roughness: 0.5 })
  );
  cerebellum.scale.set(1.55, 0.72, 0.82);
  cerebellum.position.set(0.1, -0.7, -1.72);
  state.brainGroup.add(cerebellum);
}

function createHemisphere(x, material, wireMaterial) {
  const group = new THREE.Group();
  const surface = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 36), material.clone());
  surface.scale.set(0.9, 0.78, 1.82);
  surface.position.x = x;
  surface.rotation.z = x < 0 ? 0.08 : -0.08;

  const wire = new THREE.Mesh(surface.geometry, wireMaterial.clone());
  wire.scale.copy(surface.scale);
  wire.position.copy(surface.position);
  wire.rotation.copy(surface.rotation);

  group.add(surface, wire);
  return group;
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  els.confidenceSlider.addEventListener("input", () => {
    state.minConfidence = Number(els.confidenceSlider.value);
    els.confidenceValue.textContent = `${state.minConfidence}%`;
    applyFilters();
  });

  els.yearSlider.addEventListener("input", () => {
    state.maxYear = Number(els.yearSlider.value);
    els.yearValue.textContent = String(state.maxYear);
    applyFilters();
  });

  els.fitButton.addEventListener("click", () => {
    state.orbit.yaw = -0.42;
    state.orbit.pitch = 0.22;
    state.orbit.radius = 7.4;
    updateCamera();
  });

  els.resetButton.addEventListener("click", () => {
    state.query = "";
    state.minConfidence = 0;
    state.maxYear = Number(els.yearSlider.max);
    state.selectedTypes.clear();
    els.searchInput.value = "";
    els.confidenceSlider.value = "0";
    els.confidenceValue.textContent = "0%";
    els.yearSlider.value = String(state.maxYear);
    els.yearValue.textContent = String(state.maxYear);
    buildTypeFilters();
    applyFilters();
  });

  els.exportButton.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.graph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neurograph-export.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  els.canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  els.canvas.addEventListener("wheel", onWheel, { passive: false });
  els.canvas.addEventListener("click", onCanvasClick);

  window.addEventListener("resize", debounce(() => {
    resizeRenderer();
    updateCamera();
  }, 120));
}

function prepareGraph() {
  const years = new Set();
  state.graph.edges = state.graph.edges.map((edge, index) => {
    edge.id = `${edge.source}-${edge.target}-${edge.relation}-${index}`;
    edge.evidence.forEach((item) => years.add(item.paper.year));
    return edge;
  });

  state.graph.nodes = state.graph.nodes.map((node, index) => ({
    ...node,
    position: getBrainPosition(node.id, index),
  }));

  state.maxYear = Math.max(...years);
  els.yearSlider.min = String(Math.min(...years));
  els.yearSlider.max = String(state.maxYear);
  els.yearSlider.value = String(state.maxYear);
  els.yearValue.textContent = String(state.maxYear);
}

function buildTypeFilters() {
  const types = unique(state.graph.edges.map((edge) => edge.connection_type)).sort();
  els.typeFilters.innerHTML = "";

  types.forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${state.selectedTypes.has(type) ? "active" : ""}`;
    button.textContent = type;
    button.addEventListener("click", () => {
      if (state.selectedTypes.has(type)) {
        state.selectedTypes.delete(type);
      } else {
        state.selectedTypes.add(type);
      }
      buildTypeFilters();
      applyFilters();
    });
    els.typeFilters.appendChild(button);
  });
}

function updateMetrics() {
  const papers = new Set();
  state.graph.edges.forEach((edge) => {
    edge.evidence.forEach((item) => papers.add(item.paper.doi));
  });

  els.nodeCount.textContent = state.graph.nodes.length;
  els.edgeCount.textContent = state.graph.edges.length;
  els.paperCount.textContent = papers.size;
  els.conflictCount.textContent = state.graph.edges.filter((edge) => edge.contradiction_count > 0).length;
}

function applyFilters() {
  const terms = state.query.split(/\s+/).filter(Boolean);
  state.filteredEdges = state.graph.edges.filter((edge) => {
    const yearOk = edge.evidence.some((item) => item.paper.year <= state.maxYear);
    const confidenceOk = edge.confidence >= state.minConfidence;
    const typeOk = state.selectedTypes.size === 0 || state.selectedTypes.has(edge.connection_type);
    const textOk = terms.length === 0 || terms.every((term) => edgeText(edge).includes(term));
    return yearOk && confidenceOk && typeOk && textOk;
  });

  const nodeIds = new Set();
  state.filteredEdges.forEach((edge) => {
    nodeIds.add(edge.source);
    nodeIds.add(edge.target);
  });
  state.filteredNodes = state.graph.nodes.filter((node) => nodeIds.has(node.id));

  if (!state.filteredEdges.includes(state.selectedEdge)) {
    state.selectedEdge = state.filteredEdges[0] || null;
  }

  els.viewTitle.textContent = state.query
    ? `Evidence matching "${state.query}"`
    : "3D brain relationship map";

  rebuildSceneGraph();
  renderDetails();
}

function rebuildSceneGraph() {
  state.nodeGroup.clear();
  state.edgeGroup.clear();
  state.labelGroup.clear();
  state.nodeObjects.clear();
  state.edgeObjects.clear();

  els.emptyState.hidden = state.filteredEdges.length > 0;
  if (state.filteredEdges.length === 0) {
    return;
  }

  const nodeMap = new Map(state.filteredNodes.map((node) => [node.id, node]));
  state.filteredEdges.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return;
    addRelationship(edge, source, target);
  });

  state.filteredNodes.forEach((node) => addNode(node));
}

function addNode(node) {
  const position = new THREE.Vector3(...node.position);
  const degree = state.filteredEdges.filter((edge) => edge.source === node.id || edge.target === node.id).length;
  const radius = 0.095 + Math.min(0.075, degree * 0.014);
  const material = new THREE.MeshPhysicalMaterial({
    color: nodeColors[node.kind] || nodeColors.concept,
    roughness: 0.34,
    metalness: 0.04,
    emissive: nodeColors[node.kind] || nodeColors.concept,
    emissiveIntensity: 0.22,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material);
  mesh.position.copy(position);
  mesh.userData = { type: "node", node };
  state.nodeGroup.add(mesh);
  state.nodeObjects.set(node.id, mesh);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.8, 32, 20),
    new THREE.MeshBasicMaterial({
      color: nodeColors[node.kind] || nodeColors.concept,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
    })
  );
  halo.position.copy(position);
  state.nodeGroup.add(halo);

  const label = makeLabelSprite(node.id);
  label.position.copy(position).add(new THREE.Vector3(0.12, 0.16, 0.04));
  state.labelGroup.add(label);
}

function addRelationship(edge, source, target) {
  const start = new THREE.Vector3(...source.position);
  const end = new THREE.Vector3(...target.position);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const lift = Math.max(0.32, start.distanceTo(end) * 0.32);
  const control = midpoint
    .clone()
    .normalize()
    .multiplyScalar(midpoint.length() + lift)
    .add(new THREE.Vector3(0, lift * 0.32, 0));
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  const color = colors[edge.connection_type] || colors.Unknown;
  const tube = new THREE.TubeGeometry(curve, 42, 0.012 + edge.confidence / 5500, 10, false);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: edge.contradiction_count > 0 ? 0.5 : 0.82,
  });
  const mesh = new THREE.Mesh(tube, material);
  mesh.userData = { type: "edge", edge };
  state.edgeGroup.add(mesh);
  state.edgeObjects.set(edge.id, mesh);

  if (edge.contradiction_count > 0) {
    addConflictMarkers(curve, color, edge);
  }

  addArrowHead(curve, color, edge);
}

function addConflictMarkers(curve, color, edge) {
  [0.34, 0.5, 0.66].forEach((t) => {
    const point = curve.getPoint(t);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    marker.position.copy(point);
    marker.userData = { type: "edge", edge };
    state.edgeGroup.add(marker);
  });
}

function addArrowHead(curve, color, edge) {
  const end = curve.getPoint(0.96);
  const next = curve.getPoint(1);
  const direction = next.clone().sub(end).normalize();
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.17, 20),
    new THREE.MeshBasicMaterial({ color })
  );
  arrow.position.copy(next);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  arrow.userData = { type: "edge", edge };
  state.edgeGroup.add(arrow);
}

function makeLabelSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = 34;
  context.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width + 34);
  canvas.height = 56;
  context.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  context.fillStyle = "rgba(9, 14, 12, 0.72)";
  roundRect(context, 0, 0, canvas.width, canvas.height, 12);
  context.fill();
  context.fillStyle = "#f4fffb";
  context.fillText(text, 17, 38);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 180, canvas.height / 180, 1);
  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function onPointerDown(event) {
  state.orbit.dragging = true;
  state.orbit.moved = false;
  state.orbit.lastX = event.clientX;
  state.orbit.lastY = event.clientY;
  els.canvas.classList.add("dragging");
}

function onPointerMove(event) {
  if (!state.orbit.dragging) return;
  const dx = event.clientX - state.orbit.lastX;
  const dy = event.clientY - state.orbit.lastY;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    state.orbit.moved = true;
  }
  state.orbit.lastX = event.clientX;
  state.orbit.lastY = event.clientY;
  state.orbit.yaw -= dx * 0.006;
  state.orbit.pitch = clamp(state.orbit.pitch - dy * 0.004, -0.82, 0.82);
  updateCamera();
}

function onPointerUp() {
  state.orbit.dragging = false;
  els.canvas.classList.remove("dragging");
}

function onWheel(event) {
  event.preventDefault();
  state.orbit.radius = clamp(state.orbit.radius + event.deltaY * 0.006, 4.6, 12);
  updateCamera();
}

function onCanvasClick(event) {
  if (state.orbit.moved) {
    return;
  }

  const rect = els.canvas.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);

  const objects = [...state.nodeGroup.children, ...state.edgeGroup.children];
  const hit = state.raycaster.intersectObjects(objects, false)[0];
  if (!hit) return;

  if (hit.object.userData.type === "edge") {
    state.selectedEdge = hit.object.userData.edge;
  } else if (hit.object.userData.type === "node") {
    selectBestEdgeForNode(hit.object.userData.node.id);
    return;
  }
  highlightSelection();
  renderDetails();
}

function selectBestEdgeForNode(nodeId) {
  const edge = state.filteredEdges
    .filter((item) => item.source === nodeId || item.target === nodeId)
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (edge) {
    state.selectedEdge = edge;
    highlightSelection();
    renderDetails();
  }
}

function highlightSelection() {
  state.edgeObjects.forEach((object, id) => {
    const selected = state.selectedEdge && state.selectedEdge.id === id;
    object.material.opacity = selected ? 1 : object.userData.edge.contradiction_count > 0 ? 0.5 : 0.78;
  });

  state.nodeObjects.forEach((object, id) => {
    const selected = state.selectedEdge && (state.selectedEdge.source === id || state.selectedEdge.target === id);
    object.scale.setScalar(selected ? 1.35 : 1);
  });
}

function resizeRenderer() {
  const rect = els.canvas.getBoundingClientRect();
  state.width = Math.max(640, rect.width || 900);
  state.height = Math.max(500, rect.height || 700);
  state.renderer.setSize(state.width, state.height, false);
  state.camera.aspect = state.width / state.height;
  state.camera.updateProjectionMatrix();
}

function updateCamera() {
  const { yaw, pitch, radius } = state.orbit;
  const x = Math.sin(yaw) * Math.cos(pitch) * radius;
  const y = Math.sin(pitch) * radius;
  const z = Math.cos(yaw) * Math.cos(pitch) * radius;
  state.camera.position.set(x, y, z);
  state.camera.lookAt(0, 0, 0);
}

function animate() {
  requestAnimationFrame(animate);
  state.renderer.render(state.scene, state.camera);
}

function renderDetails() {
  const edge = state.selectedEdge;
  highlightSelection();

  if (!edge) {
    els.detailTitle.textContent = "No edge selected";
    els.detailMeta.innerHTML = "";
    els.detailSummary.textContent = "No evidence matches the current filter set.";
    els.evidenceCount.textContent = "0 items";
    els.evidenceList.innerHTML = "";
    els.pathList.innerHTML = "";
    return;
  }

  els.detailTitle.textContent = `${edge.source} -> ${edge.target}`;
  els.detailMeta.innerHTML = "";
  [
    edge.relation,
    edge.connection_type,
    `${Math.round(edge.confidence)}% confidence`,
    `${edge.support_count} support`,
    `${edge.contradiction_count} contradict`,
  ].forEach((value) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = value;
    els.detailMeta.appendChild(pill);
  });

  els.detailSummary.textContent = buildSummary(edge);
  els.evidenceCount.textContent = `${edge.evidence.length} item${edge.evidence.length === 1 ? "" : "s"}`;
  els.evidenceList.innerHTML = "";

  edge.evidence.forEach((item) => {
    const card = document.createElement("article");
    card.className = "evidence-item";
    card.innerHTML = `
      <strong>${escapeHtml(item.polarity.toUpperCase())}: ${escapeHtml(item.paper.title)}</strong>
      <p>${escapeHtml(item.sentence)}</p>
      <span class="paper-meta">${escapeHtml(item.paper.journal)} - ${item.paper.year} - ${escapeHtml(item.paper.doi)} - ${escapeHtml(item.species || "Unknown species")}</span>
    `;
    els.evidenceList.appendChild(card);
  });

  renderPathSuggestions(edge);
}

function buildSummary(edge) {
  const best = edge.evidence.find((item) => item.polarity === "support") || edge.evidence[0];
  const conflict = edge.contradiction_count > 0
    ? " Conflicting evidence is present and should be reviewed before treating this as settled."
    : "";
  return `${edge.source} ${edge.relation.toLowerCase()} ${edge.target} with ${edge.connection_type.toLowerCase()} evidence. Strongest visible support comes from ${best.paper.title} (${best.paper.year}).${conflict}`;
}

function renderPathSuggestions(edge) {
  const paths = findOutgoingPaths(edge.source, 3)
    .filter((path) => path.length > 1)
    .slice(0, 4);

  els.pathList.innerHTML = "";
  if (paths.length === 0) {
    const item = document.createElement("div");
    item.className = "path-item";
    item.innerHTML = "<strong>No multi-step paths visible</strong><p>Expand filters to discover longer chains.</p>";
    els.pathList.appendChild(item);
    return;
  }

  paths.forEach((path) => {
    const item = document.createElement("div");
    item.className = "path-item";
    const route = [path[0].source, ...path.map((step) => step.target)].join(" -> ");
    const score = Math.round(path.reduce((sum, step) => sum + step.confidence, 0) / path.length);
    item.innerHTML = `<strong>${escapeHtml(route)}</strong><p>Average confidence ${score}% across ${path.length} edges.</p>`;
    els.pathList.appendChild(item);
  });
}

function findOutgoingPaths(start, maxDepth) {
  const results = [];

  function walk(nodeId, path, seen) {
    if (path.length >= maxDepth) {
      results.push(path);
      return;
    }

    const nextEdges = state.filteredEdges
      .filter((edge) => edge.source === nodeId && !seen.has(edge.target))
      .sort((a, b) => b.confidence - a.confidence);

    if (nextEdges.length === 0 && path.length > 0) {
      results.push(path);
    }

    nextEdges.forEach((edge) => {
      walk(edge.target, [...path, edge], new Set([...seen, edge.target]));
    });
  }

  walk(start, [], new Set([start]));
  return results.sort((a, b) => averageConfidence(b) - averageConfidence(a));
}

function getBrainPosition(name, index) {
  if (brainPositions[name]) {
    return brainPositions[name];
  }
  const angle = hashString(name) * Math.PI * 2;
  const z = -1.8 + (index % 7) * 0.58;
  return [Math.cos(angle) * 1.4, -0.35 + Math.sin(angle) * 0.85, z];
}

function edgeText(edge) {
  return [
    edge.source,
    edge.target,
    edge.relation,
    edge.connection_type,
    ...edge.evidence.map((item) => `${item.sentence} ${item.paper.title} ${item.paper.journal}`),
  ].join(" ").toLowerCase();
}

function averageConfidence(path) {
  if (path.length === 0) return 0;
  return path.reduce((sum, edge) => sum + edge.confidence, 0) / path.length;
}

function unique(values) {
  return [...new Set(values)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
