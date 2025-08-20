// Categories of monster parts
const categories = ['body','eyes','mouth','leftarm','rightarm','leftleg','rightleg','nose','accessory'];
let selectedParts = {}; // Stores Konva.Image objects

// Get category from URL (kept for future navigation)
const urlParams = new URLSearchParams(window.location.search);
let currentCategory = urlParams.get('category') || 'body';

// Get canvas container
const container = document.getElementById('canvas-container');

// Keep stage square and responsive
function getStageSize() {
  const width = container.clientWidth;
  return { width, height: width }; // square stage
}

let { width: stageWidth, height: stageHeight } = getStageSize();

// Create Konva stage
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: stageWidth,
  height: stageHeight
});

const layer = new Konva.Layer();
stage.add(layer);

/* =========================== Helpers =========================== */

// Fit parts within a fraction of the stage (no upscaling beyond 1)
const FIT_FRACTION = 1.7; // 170% of stage size; tweak to taste

function computeScale(img) {
  const maxW = stage.width() * FIT_FRACTION;
  const maxH = stage.height() * FIT_FRACTION;
  const s = Math.min(maxW / img.width, maxH / img.height);
  return Math.min(1, s); // never upscale above 1 (keeps exports sharp)
}

function centerPosition(img, scale) {
  const sw = img.width * scale;
  const sh = img.height * scale;
  return {
    x: (stage.width() - sw) / 2,
    y: (stage.height() - sh) / 2
  };
}

function getRect(node) {
  // getClientRect accounts for scale/rotation; perfect for visibility checks
  return node.getClientRect();
}

function isRectOnStage(rect) {
  return (
    rect.x + rect.width > 0 &&
    rect.y + rect.height > 0 &&
    rect.x < stage.width() &&
    rect.y < stage.height()
  );
}

function bringOnStage(node) {
  // If off-screen, gently recenter
  const img = node.image();
  if (!img) return;
  const scale = node.scaleX() || 1;
  const { x, y } = centerPosition(img, scale);
  node.position({ x, y });
}

/* ========================= Image loader ======================== */

function loadImage(src, callback) {
  const img = new Image();
  img.src = src;
  img.onload = () => callback(img);
  img.onerror = () => console.error("Failed to load image:", src);
}

/* ============ Buttons (thumbnail images instead of text) ============ */

function createButtons(category) {
  const partsContainer = document.getElementById('parts-container');
  partsContainer.innerHTML = `<h3>Select ${category}</h3>`;

  for (let i = 1; i <= 4; i++) {
    const btn = document.createElement('button');

    const img = document.createElement('img');
    img.src = `images/${category}/${category}${i}.png`;
    img.alt = `${category} ${i}`;
    img.style.pointerEvents = "none";

    btn.appendChild(img);
    btn.onclick = () => selectPart(category, i);
    partsContainer.appendChild(btn);
  }
}

/* ============ Add/load a part (center + auto-scale) ============ */

function selectPart(category, option) {
  const src = `images/${category}/${category}${option}.png`;

  loadImage(src, (img) => {
    // Remove prior part for this category
    if (selectedParts[category]) selectedParts[category].destroy();

    const scale = computeScale(img);

    const konvaImg = new Konva.Image({
      image: img,
      draggable: true,
      scaleX: scale,
      scaleY: scale
    });

    // Center based on scaled size
    const { x, y } = centerPosition(img, scale);
    konvaImg.position({ x, y });

    // Save while dragging
    konvaImg.on('dragmove', () => {
      const pos = konvaImg.position();
      const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
      // We only store position; scale is recomputed from stage size each time
      saved[category] = { src, x: pos.x, y: pos.y };
      localStorage.setItem('monsterParts', JSON.stringify(saved));
    });

    // On drop: just save (no snapping/clamping)
    konvaImg.on('dragend', () => {
      const pos = konvaImg.position();
      const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
      saved[category] = { src, x: pos.x, y: pos.y };
      localStorage.setItem('monsterParts', JSON.stringify(saved));
    });

    layer.add(konvaImg);
    layer.draw();
    selectedParts[category] = konvaImg;

    // Save centered position immediately
    const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
    saved[category] = { src, x, y };
    localStorage.setItem('monsterParts', JSON.stringify(saved));
  });
}

/* ============ Restore saved parts (rescale; rescue if off-screen) ============ */

window.addEventListener('load', () => {
  const savedParts = JSON.parse(localStorage.getItem('monsterParts')) || {};

  for (let cat in savedParts) {
    const part = savedParts[cat];

    loadImage(part.src, (img) => {
      const scale = computeScale(img);

      const konvaImg = new Konva.Image({
        image: img,
        x: part.x ?? 0,
        y: part.y ?? 0,
        draggable: true,
        scaleX: scale,
        scaleY: scale
      });

      layer.add(konvaImg);

      // If previously saved position is off-screen (or now off after scaling), recenter it once
      const rect = getRect(konvaImg);
      if (!isRectOnStage(rect)) {
        const { x, y } = centerPosition(img, scale);
        konvaImg.position({ x, y });
      }

      // Save during/after drag
      konvaImg.on('dragmove', () => {
        const pos = konvaImg.position();
        const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
        saved[cat] = { src: part.src, x: pos.x, y: pos.y };
        localStorage.setItem('monsterParts', JSON.stringify(saved));
      });

      konvaImg.on('dragend', () => {
        const pos = konvaImg.position();
        const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
        saved[cat] = { src: part.src, x: pos.x, y: pos.y };
        localStorage.setItem('monsterParts', JSON.stringify(saved));
      });

      selectedParts[cat] = konvaImg;
      layer.draw();
    });
  }

  createButtons(currentCategory);

  // Export button (Konva)
  document.getElementById('export-btn').addEventListener('click', () => {
    try {
      const dataURL = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'monster.png';
      link.href = dataURL;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for errors.");
    }
  });
});

/* ============ Keep stage responsive; rescale parts on resize ============ */

window.addEventListener('resize', () => {
  const { width, height } = getStageSize();
  stage.width(width);
  stage.height(height);

  // For each part: recompute scale based on new stage size,
  // keep the visual center in roughly the same place, and ensure it's visible.
  Object.entries(selectedParts).forEach(([cat, node]) => {
    const img = node.image();
    if (!img) return;

    // current visual center
    const oldScale = node.scaleX() || 1;
    const oldW = img.width * oldScale;
    const oldH = img.height * oldScale;
    const oldCenter = { cx: node.x() + oldW / 2, cy: node.y() + oldH / 2 };

    // new scale
    const newScale = computeScale(img);
    node.scaleX(newScale);
    node.scaleY(newScale);

    const newW = img.width * newScale;
    const newH = img.height * newScale;

    // keep center stable
    const newX = oldCenter.cx - newW / 2;
    const newY = oldCenter.cy - newH / 2;
    node.position({ x: newX, y: newY });

    // if off-stage after resize, bring back to center
    const rect = getRect(node);
    if (!isRectOnStage(rect)) {
      bringOnStage(node);
    }
  });

  stage.batchDraw();
});