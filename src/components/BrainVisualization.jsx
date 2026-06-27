import React, { useEffect, useRef } from 'react';
import './BrainVisualization.css';
import * as THREE from 'three';

const BrainVisualization = ({ graph, selectedEdge, onEdgeSelect }) => {
  const containerRef = useRef(null);
  const stateRef = useRef({
    graph: graph || { nodes: [], edges: [] },
    filteredNodes: [],
    filteredEdges: [],
    selectedEdge: selectedEdge,
    selectedTypes: new Set(),
    query: '',
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
  });

  const colors = {
    Excitatory: 0x4f9cff,
    Inhibitory: 0xef5b5b,
    Modulatory: 0xd6a83f,
    Unknown: 0x9aa4a0,
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
    'Prefrontal Cortex': [0.0, 0.36, 1.95],
    Retina: [-2.55, -0.72, 2.25],
    'Retinal Ganglion Cells': [-2.35, -0.58, 2.05],
    'Optic Nerve': [-1.72, -0.48, 1.55],
    LGN: [-0.62, -0.12, 0.66],
    'Primary Visual Cortex': [-0.18, 0.16, -2.12],
    'Superior Colliculus': [0.08, -0.48, -0.38],
    'Motor Cortex': [0.78, 0.88, 0.36],
    'Dorsolateral Striatum': [0.92, -0.18, 0.02],
    'Layer V Pyramidal Neurons': [0.66, 1.1, 0.48],
    VTA: [0.0, -0.88, 0.1],
    SNc: [0.38, -0.86, -0.12],
    "Parkinson's Disease": [2.48, -0.18, -0.36],
  };

  useEffect(() => {
    initThreeJS();
    return () => {
      if (stateRef.current.renderer) {
        stateRef.current.renderer.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (graph) {
      stateRef.current.graph = graph;
      updateVisualization();
    }
  }, [graph]);

  useEffect(() => {
    if (selectedEdge) {
      stateRef.current.selectedEdge = selectedEdge;
      highlightSelection();
    }
  }, [selectedEdge]);

  const initThreeJS = () => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!container) return;

    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x111816);

    state.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    state.renderer = new THREE.WebGLRenderer({
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

    container.appendChild(state.renderer.domElement);
    resizeRenderer();
    updateCamera();
    bindEvents();
    animate();
  };

   const buildBrainModel = () => {
     const state = stateRef.current;
     state.brainGroup.clear();

     const brainMaterial = new THREE.MeshPhysicalMaterial({
       color: 0xc9b8d4,
       roughness: 0.6,
       metalness: 0.0,
       emissive: 0x4a3f5c,
       emissiveIntensity: 0.15,
     });

     // Create realistic brain mesh
     const brainGeometry = createRealisticBrainGeometry();
     const brain = new THREE.Mesh(brainGeometry, brainMaterial);
     brain.scale.set(1.2, 1.15, 1.3);
     state.brainGroup.add(brain);
   };

   const createRealisticBrainGeometry = () => {
     const geometry = new THREE.BufferGeometry();
     const vertices = [];
     const indices = [];

     // Create two hemispheres with realistic cortical folds
     const hemispheres = [
       { x: -0.6, segments: 48 },
       { x: 0.6, segments: 48 }
     ];

     let vertexIndex = 0;

     hemispheres.forEach(({ x, segments }) => {
       // Base hemisphere with detailed folding
       for (let lat = 0; lat <= segments; lat++) {
         for (let lon = 0; lon <= segments; lon++) {
           const latRad = (lat / segments) * Math.PI;
           const lonRad = (lon / segments) * Math.PI * 2;

           // Complex surface variations for realistic cortical folds
           const foldNoise1 = Math.sin(lat * 3) * Math.sin(lon * 4) * 0.06;
           const foldNoise2 = Math.sin(lat * 5) * Math.cos(lon * 6) * 0.04;
           const foldNoise3 = Math.cos(lat * 2) * Math.sin(lon * 3) * 0.03;
           const heightVariation = 0.2 * Math.sin(lat * 5) * Math.cos(lon * 3) * Math.sin(lat * 2);

           const radius = 1.15 + foldNoise1 + foldNoise2 + foldNoise3 + heightVariation;

           const vx = Math.sin(latRad) * Math.cos(lonRad) * radius;
           const vy = Math.cos(latRad) * radius * 0.82;
           const vz = Math.sin(latRad) * Math.sin(lonRad) * radius * 1.25;

           vertices.push(vx + x, vy - 0.15, vz);
         }
       }

       // Create faces for this hemisphere
       for (let lat = 0; lat < segments; lat++) {
         for (let lon = 0; lon < segments; lon++) {
           const a = vertexIndex + lat * (segments + 1) + lon;
           const b = a + 1;
           const c = a + (segments + 1);
           const d = c + 1;

           indices.push(a, c, b);
           indices.push(b, c, d);
         }
       }

       vertexIndex += (segments + 1) * (segments + 1);
     });

     geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
     geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
     geometry.computeVertexNormals();

     return geometry;
   };

  const updateVisualization = () => {
    const state = stateRef.current;
    state.nodeGroup.clear();
    state.edgeGroup.clear();
    state.labelGroup.clear();
    state.nodeObjects.clear();
    state.edgeObjects.clear();

    if (!state.graph.edges || state.graph.edges.length === 0) return;

    state.filteredNodes = state.graph.nodes || [];
    state.filteredEdges = state.graph.edges || [];

    state.filteredEdges.forEach((edge) => {
      const source = state.filteredNodes.find(n => n.id === edge.source);
      const target = state.filteredNodes.find(n => n.id === edge.target);
      if (!source || !target) return;
      addRelationship(edge, source, target);
    });

    state.filteredNodes.forEach((node) => addNode(node));
  };

  const addNode = (node) => {
    const state = stateRef.current;
    const position = new THREE.Vector3(...getBrainPosition(node.id));
    const degree = state.filteredEdges.filter(
      (edge) => edge.source === node.id || edge.target === node.id
    ).length;
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
    mesh.userData = { type: 'node', node };
    state.nodeGroup.add(mesh);
    state.nodeObjects.set(node.id, mesh);
  };

  const addRelationship = (edge, source, target) => {
    const state = stateRef.current;
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
    mesh.userData = { type: 'edge', edge };
    state.edgeGroup.add(mesh);
    state.edgeObjects.set(edge.id, mesh);
  };

  const getBrainPosition = (name) => {
    if (brainPositions[name]) {
      return brainPositions[name];
    }
    const angle = hashString(name) * Math.PI * 2;
    const index = Object.keys(brainPositions).indexOf(name);
    const z = -1.8 + (index % 7) * 0.58;
    return [Math.cos(angle) * 1.4, -0.35 + Math.sin(angle) * 0.85, z];
  };

  const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return (hash % 1000) / 1000;
  };

  const highlightSelection = () => {
    const state = stateRef.current;
    state.edgeObjects.forEach((object) => {
      const isSelected = state.selectedEdge && state.selectedEdge.id === object.userData.edge.id;
      object.material.opacity = isSelected ? 1 : 0.78;
    });

    state.nodeObjects.forEach((object) => {
      const isSelected = state.selectedEdge &&
        (state.selectedEdge.source === object.userData.node.id ||
         state.selectedEdge.target === object.userData.node.id);
      object.scale.setScalar(isSelected ? 1.35 : 1);
    });
  };

  const resizeRenderer = () => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    state.width = rect.width || 900;
    state.height = rect.height || 700;
    state.renderer.setSize(state.width, state.height, false);
    state.camera.aspect = state.width / state.height;
    state.camera.updateProjectionMatrix();
  };

  const updateCamera = () => {
    const state = stateRef.current;
    const { yaw, pitch, radius } = state.orbit;
    const x = Math.sin(yaw) * Math.cos(pitch) * radius;
    const y = Math.sin(pitch) * radius;
    const z = Math.cos(yaw) * Math.cos(pitch) * radius;
    state.camera.position.set(x, y, z);
    state.camera.lookAt(0, 0, 0);
  };

  const animate = () => {
    requestAnimationFrame(animate);
    const state = stateRef.current;
    if (state.renderer && state.camera && state.scene) {
      state.renderer.render(state.scene, state.camera);
    }
  };

  const bindEvents = () => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (event) => {
      stateRef.current.orbit.dragging = true;
      stateRef.current.orbit.moved = false;
      stateRef.current.orbit.lastX = event.clientX;
      stateRef.current.orbit.lastY = event.clientY;
    };

    const handlePointerMove = (event) => {
      const state = stateRef.current;
      if (!state.orbit.dragging) return;

      const dx = event.clientX - state.orbit.lastX;
      const dy = event.clientY - state.orbit.lastY;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        state.orbit.moved = true;
      }

      state.orbit.lastX = event.clientX;
      state.orbit.lastY = event.clientY;
      state.orbit.yaw -= dx * 0.006;
      state.orbit.pitch = Math.max(-0.82, Math.min(0.82, state.orbit.pitch - dy * 0.004));
      updateCamera();
    };

    const handlePointerUp = () => {
      stateRef.current.orbit.dragging = false;
    };

    const handleWheel = (event) => {
      event.preventDefault();
      const state = stateRef.current;
      state.orbit.radius = Math.max(4.6, Math.min(12, state.orbit.radius + event.deltaY * 0.006));
      updateCamera();
    };

    const handleClick = (event) => {
      const state = stateRef.current;
      if (state.orbit.moved) return;

      const rect = container.getBoundingClientRect();
      state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      state.raycaster.setFromCamera(state.pointer, state.camera);
      const objects = [...state.nodeGroup.children, ...state.edgeGroup.children];
      const hit = state.raycaster.intersectObjects(objects, false)[0];

      if (!hit) return;

      if (hit.object.userData.type === 'edge') {
        onEdgeSelect(hit.object.userData.edge);
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);
  };

  return <div ref={containerRef} className="brain-visualization" />;
};

export default BrainVisualization;

