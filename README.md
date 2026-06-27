# NeuroGraph MVP

This folder contains a local browser demo for NeuroGraph, an evidence-linked neuroscience knowledge graph.

## Files

- `index.html` - Main website entry point and UI structure.
- `styles.css` - Visual design for the dashboard, graph canvas, controls, and detail panels.
- `app.js` - Browser logic for loading graph data, drawing the interactive Three.js brain map, filtering, selection, camera controls, paths, and export.
- `three.module.js` - Local Three.js library used by `app.js` for the 3D brain scene.
- `script1.py` - Python knowledge extraction prototype and CLI. It builds the demo graph from sample neuroscience paper passages.
- `neurograph.json` - Generated graph data consumed by the website. Regenerate it with `python3 script1.py export neurograph.json`.
- `script.py` - Older experimental Python file unrelated to the current web demo.

## Run

```bash
python3 script1.py export neurograph.json
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/index.html
```
