// Categories of monster parts
const categories = ['body','eyes','mouth','leftarm','rightarm','leftleg','rightleg','nose','accessory'];
let selectedParts = {}; // Stores chosen images for each category

// Get canvas container size dynamically
const container = document.getElementById('canvas-container');
const width = container.clientWidth;
const height = container.clientHeight;

// Create Konva stage
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: width,
  height: height
});

const layer = new Konva.Layer();
stage.add(layer);

// Function to load image
function loadImage(src, callback) {
  const img = new Image();
  img.src = src;
  img.onload = () => callback(img);
}

// When a part is selected
function selectPart(category, option) {
  const src = `images/${category}/${category}${option}.png`;
  loadImage(src, (img) => {
    // Remove old part if exists
    if (selectedParts[category]) selectedParts[category].destroy();

    // Add new draggable part
    const konvaImg = new Konva.Image({
      image: img,
      x: stage.width() / 2 - img.width / 2,
      y: stage.height() / 2 - img.height / 2,
      draggable: true
    });
    layer.add(konvaImg);
    layer.draw();
    selectedParts[category] = konvaImg;

    // Save selection to localStorage
    localStorage.setItem(category, option);
  });
}

// Create buttons for a category
function createButtons(category) {
  const containerDiv = document.getElementById('parts-container');
  containerDiv.innerHTML = `<h3>Select ${category}</h3>`;
  for (let i = 1; i <= 4; i++) {
    const btn = document.createElement('button');
    btn.innerText = `${category} ${i}`;
    btn.onclick = () => selectPart(category, i);
    containerDiv.appendChild(btn);
  }
}

// Load saved parts from localStorage on page load
categories.forEach(category => {
  const savedOption = localStorage.getItem(category);
  if (savedOption) {
    selectPart(category, parseInt(savedOption));
  }
});

// Show category based on URL (from QR code), or default to first
const urlParams = new URLSearchParams(window.location.search);
const categoryFromURL = urlParams.get('category');

if (categoryFromURL && categories.includes(categoryFromURL)) {
  createButtons(categoryFromURL);
} else {
  createButtons(categories[0]);
}

// Optional: Change category using ArrowRight key
let currentIndex = 0;
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    currentIndex = (currentIndex + 1) % categories.length;
    createButtons(categories[currentIndex]);
  }
});

// Export monster image
document.getElementById('export-btn').addEventListener('click', () => {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = 'monster.png';
  link.href = dataURL;
  link.click();
});

// Optional: Reset monster (if you want a "start over" button)
function resetMonster() {
  localStorage.clear();
  Object.values(selectedParts).forEach(part => part.destroy());
  selectedParts = {};
  layer.draw();
}

// Resize stage if window resizes
window.addEventListener('resize', () => {
  const newWidth = container.clientWidth;
  const newHeight = container.clientHeight;
  stage.width(newWidth);
  stage.height(newHeight);
  layer.draw();
});