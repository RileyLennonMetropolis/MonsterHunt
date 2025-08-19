// Categories of monster parts
const categories = ['body','eyes','mouth','leftarm','rightarm','leftleg','rightleg','nose','accessory'];
let selectedParts = {}; // Stores Konva.Image objects

// Get category from URL
const urlParams = new URLSearchParams(window.location.search);
let currentCategory = urlParams.get('category') || 'body';

// Get canvas container
const container = document.getElementById('canvas-container');
const stageWidth = container.clientWidth || 800;
const stageHeight = container.clientHeight || 800;

// Create Konva stage
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: stageWidth,
  height: stageHeight
});

const layer = new Konva.Layer();
stage.add(layer);

// Load image function (no crossOrigin, works locally)
function loadImage(src, callback) {
  const img = new Image();
  img.src = src;
  img.onload = () => callback(img);
  img.onerror = () => console.error("Failed to load image:", src);
}

// Create buttons for a category
function createButtons(category) {
  const partsContainer = document.getElementById('parts-container');
  partsContainer.innerHTML = `<h3>Select ${category}</h3>`;
  for (let i = 1; i <= 4; i++) {
    const btn = document.createElement('button');
    btn.innerText = `${category} ${i}`;
    btn.onclick = () => selectPart(category, i);
    partsContainer.appendChild(btn);
  }
}

// Add/load a part
function selectPart(category, option) {
  const src = `images/${category}/${category}${option}.png`;

  const savedParts = JSON.parse(localStorage.getItem('monsterParts')) || {};
  let x = stage.width()/2 - 50;
  let y = stage.height()/2 - 50;
  if (savedParts[category]) {
    x = savedParts[category].x;
    y = savedParts[category].y;
  }

  loadImage(src, (img) => {
    if (selectedParts[category]) selectedParts[category].destroy();

    const konvaImg = new Konva.Image({
      image: img,
      x: x,
      y: y,
      draggable: true
    });

    konvaImg.on('dragmove', () => {
      const pos = konvaImg.position();
      const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
      saved[category] = { src: src, x: pos.x, y: pos.y };
      localStorage.setItem('monsterParts', JSON.stringify(saved));
    });

    layer.add(konvaImg);
    layer.draw();
    selectedParts[category] = konvaImg;

    if (!savedParts[category]) {
      savedParts[category] = { src: src, x: x, y: y };
      localStorage.setItem('monsterParts', JSON.stringify(savedParts));
    }
  });
}

// Restore saved parts & setup buttons and export
window.addEventListener('load', () => {
  const savedParts = JSON.parse(localStorage.getItem('monsterParts')) || {};
  for (let cat in savedParts) {
    const part = savedParts[cat];
    loadImage(part.src, (img) => {
      const konvaImg = new Konva.Image({
        image: img,
        x: part.x,
        y: part.y,
        draggable: true
      });

      konvaImg.on('dragmove', () => {
        const pos = konvaImg.position();
        const saved = JSON.parse(localStorage.getItem('monsterParts')) || {};
        saved[cat] = { src: part.src, x: pos.x, y: pos.y };
        localStorage.setItem('monsterParts', JSON.stringify(saved));
      });

      layer.add(konvaImg);
      layer.draw();
      selectedParts[cat] = konvaImg;
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