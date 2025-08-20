// Categories of monster parts
const categories = ['body','eyes','mouth','leftarm','rightarm','leftleg','rightleg','nose','accessory'];
let selectedParts = {}; // Stores Konva.Image objects
let nameText = null;    // Konva.Text for the monster name

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

// Fit parts within a fraction of the stage (no upscaling above 1)
const FIT_FRACTION = 1.5; // 150% of stage size; tweak to taste

function computeScale(img) {
  const maxW = stage.width() * FIT_FRACTION;
  const maxH = stage.height() * FIT_FRACTION;
  const s = Math.min(maxW / img.width, maxH / img.height);
  return Math.min(1, s); // never upscale above 1
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
  const img = node.image();
  if (!img) return;
  const scale = node.scaleX() || 1;
  const { x, y } = centerPosition(img, scale);
  node.position({ x, y });
}

/* ===================== Monster Name helpers ===================== */

// Dynamic font size based on stage width (nice on mobile & desktop)
function computeNameFontSize() {
  const s = Math.round(stage.width() * 0.08); // ~8% of stage width
  return Math.max(18, Math.min(s, 72));       // clamp 18–72px
}

// Ensure there is a Konva.Text for the name; create if needed
function ensureNameText() {
  if (nameText) {
    // update width & font each time we call this
    nameText.width(stage.width());
    nameText.fontSize(computeNameFontSize());
    nameText.position({ x: 0, y: 8 }); // top with small padding
    layer.batchDraw();
    return nameText;
  }

nameText = new Konva.Text({
  text: '',
  x: 0,
  y: 8,
  width: stage.width(),
  align: 'center',
  fontSize: computeNameFontSize(),
  fontFamily: 'Avengeance Mightiest Avenger',
  fill: '#000',       // black text only
  listening: false
});

  layer.add(nameText);
  layer.moveToTop(); // keep name above parts
  layer.batchDraw();
  return nameText;
}

function setMonsterName(text) {
  const t = ensureNameText();
  t.text(text || '');
  layer.batchDraw();

  // Persist
  const saved = JSON.parse(localStorage.getItem('monsterName')) || {};
  localStorage.setItem('monsterName', JSON.stringify({ text: t.text() }));
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
      saved[category] = { src, x: pos.x, y: pos.y };
      localStorage.setItem('monsterParts', JSON.stringify(saved));
    });

    // On drop: just save — no clamping (prevents snapping)
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

/* ========================= Image loader ======================== */

function loadImage(src, callback) {
  const img = new Image();
  img.src = src;
  img.onload = () => callback(img);
  img.onerror = () => console.error("Failed to load image:", src);
}

/* ============ Restore saved parts & set up buttons/export/name ============ */

window.addEventListener('load', () => {
  // Restore parts
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

      // If off-screen (or now off after scaling), recenter it once
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

  // Restore name (if any)
  const savedName = JSON.parse(localStorage.getItem('monsterName'));
  ensureNameText();
  if (savedName && savedName.text) {
    nameText.text(savedName.text);
    layer.batchDraw();
  }

  createButtons(currentCategory);

  // Export button
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

  // Name button: prompt and set
  const nameBtn = document.getElementById('name-btn');
  if (nameBtn) {
    nameBtn.addEventListener('click', () => {
      const current = (nameText && nameText.text()) || '';
      const value = window.prompt("Name your monster:", current);
      if (value !== null) {
        setMonsterName(value.trim());
      }
    });
  }
});

/* ============ Keep stage responsive; rescale parts & name on resize ============ */

window.addEventListener('resize', () => {
  const { width, height } = getStageSize();
  stage.width(width);
  stage.height(height);

  // Parts: recompute scale; keep visual center; rescue if off-stage
  Object.entries(selectedParts).forEach(([cat, node]) => {
    const img = node.image();
    if (!img) return;

    const oldScale = node.scaleX() || 1;
    const oldW = img.width * oldScale;
    const oldH = img.height * oldScale;
    const oldCenter = { cx: node.x() + oldW / 2, cy: node.y() + oldH / 2 };

    const newScale = computeScale(img);
    node.scaleX(newScale);
    node.scaleY(newScale);

    const newW = img.width * newScale;
    const newH = img.height * newScale;

    node.position({ x: oldCenter.cx - newW / 2, y: oldCenter.cy - newH / 2 });

    const rect = getRect(node);
    if (!isRectOnStage(rect)) {
      bringOnStage(node);
    }
  });

  // Name: stretch to stage width and recompute font size
  ensureNameText();
  if (nameText) {
    nameText.width(stage.width());
    nameText.fontSize(computeNameFontSize());
    nameText.y(8);
  }

  stage.batchDraw();
});