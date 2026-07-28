const viewport = document.getElementById("mapViewport");
const stage = document.getElementById("mapStage");
const overlay = document.getElementById("zonesLayer");
const editorToggle = document.getElementById("editorToggle");
const dialog = document.getElementById("zoneDialog");
const zoneName = document.getElementById("zoneName");
const zoneRadius = document.getElementById("zoneRadius");

const MAP_W = 1408;
const MAP_H = 1082;

let scale = 1;
let x = 0;
let y = 0;
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let startX = 0;
let startY = 0;
let editorMode = false;
let pendingPoint = null;

let zones = JSON.parse(localStorage.getItem("fivemCrashZones") || "[]");

function saveZones() {
  localStorage.setItem("fivemCrashZones", JSON.stringify(zones));
}

function renderZones() {
  overlay.innerHTML = "";

  zones.forEach((zone, index) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", zone.x);
    circle.setAttribute("cy", zone.y);
    circle.setAttribute("r", zone.radius);
    circle.setAttribute("class", "crash-zone");
    circle.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = prompt(
        `${zone.name}\n\nType DELETE to remove this zone, or press Cancel to keep it.`
      );
      if (action === "DELETE") {
        zones.splice(index, 1);
        saveZones();
        renderZones();
      }
    });

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = zone.name;
    circle.appendChild(title);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", zone.x);
    label.setAttribute("y", zone.y - zone.radius - 12);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "zone-label");
    label.textContent = zone.name;

    group.appendChild(circle);
    group.appendChild(label);
    overlay.appendChild(group);
  });
}

function fitMap() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  scale = Math.max(vw / MAP_W, vh / MAP_H);
  x = (vw - MAP_W * scale) / 2;
  y = (vh - MAP_H * scale) / 2;
  applyTransform();
}

function applyTransform() {
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function zoomAt(factor, clientX, clientY) {
  const oldScale = scale;
  scale = Math.min(5, Math.max(0.5, scale * factor));

  const worldX = (clientX - x) / oldScale;
  const worldY = (clientY - y) / oldScale;

  x = clientX - worldX * scale;
  y = clientY - worldY * scale;

  applyTransform();
}

viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX, event.clientY);
}, { passive: false });

viewport.addEventListener("pointerdown", (event) => {
  if (editorMode) return;
  dragging = true;
  viewport.classList.add("dragging");
  viewport.setPointerCapture(event.pointerId);
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  startX = x;
  startY = y;
});

viewport.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  x = startX + event.clientX - dragStartX;
  y = startY + event.clientY - dragStartY;
  applyTransform();
});

viewport.addEventListener("pointerup", () => {
  dragging = false;
  viewport.classList.remove("dragging");
});

viewport.addEventListener("click", (event) => {
  if (!editorMode) return;
  if (event.target.closest("#toolbar")) return;

  const rect = viewport.getBoundingClientRect();
  pendingPoint = {
    x: (event.clientX - x) / scale,
    y: (event.clientY - y) / scale
  };

  if (
    pendingPoint.x < 0 || pendingPoint.x > MAP_W ||
    pendingPoint.y < 0 || pendingPoint.y > MAP_H
  ) return;

  zoneName.value = `Crash zone ${zones.length + 1}`;
  zoneRadius.value = 70;
  dialog.showModal();
});

dialog.addEventListener("close", () => {
  if (dialog.returnValue !== "default" || !pendingPoint) {
    pendingPoint = null;
    return;
  }

  zones.push({
    x: Math.round(pendingPoint.x),
    y: Math.round(pendingPoint.y),
    radius: Number(zoneRadius.value),
    name: zoneName.value.trim() || `Crash zone ${zones.length + 1}`
  });

  saveZones();
  renderZones();
  pendingPoint = null;
});

editorToggle.addEventListener("click", () => {
  editorMode = !editorMode;
  editorToggle.textContent = `Add zones: ${editorMode ? "ON" : "OFF"}`;
  editorToggle.classList.toggle("active", editorMode);
  viewport.style.cursor = editorMode ? "crosshair" : "grab";
});

document.getElementById("zoomIn").addEventListener("click", () => {
  zoomAt(1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  zoomAt(0.83, viewport.clientWidth / 2, viewport.clientHeight / 2);
});

document.getElementById("resetView").addEventListener("click", fitMap);

window.addEventListener("resize", fitMap);

renderZones();
fitMap();
