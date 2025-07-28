// === Карта и слои ===
const map = L.map('mapid').setView([49, 32], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=xpum0XQiGdzHO7iEg7wl';
L.tileLayer(maptilerSatelliteUrl, {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    maxZoom: 19
}).addTo(map);

// === Точки запуска шахедов ===
const launchPoints = [
    { name: "Kursk", coords: [51.7306, 36.1939] },
    { name: "Orel", coords: [52.8915, 35.8594] },
    { name: "Navlya", coords: [52.81163, 34.50643] },
    { name: "Chatalovo", coords: [54.3103, 32.4962] },
    { name: "Gvardeyskoe", coords: [45.11678, 33.97634] },
    { name: "Chauda", coords: [45.00529, 35.84238] },
    { name: "Millerovo", coords: [48.8000, 39.5000] }
];

// === Переменные для Украины и шахедов ===
let ukraineGeoJson = null;
let dronesEnteredUkraine = 0;
const activeDrones = [];

// === Получить случайную точку в Украине ===
async function getRandomPointInUkraine() {
    if (!ukraineGeoJson) return null;
    let randomPoint = null;
    let pointInUkraine = false;
    let bounds = L.geoJSON(ukraineGeoJson).getBounds();
    let attempts = 0;
    const maxAttempts = 5000;
    while (!pointInUkraine && attempts < maxAttempts) {
        const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
        const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
        randomPoint = turf.point([lng, lat]);
        pointInUkraine = turf.booleanPointInPolygon(randomPoint, ukraineGeoJson);
        attempts++;
    }
    if (pointInUkraine) {
        return [randomPoint.geometry.coordinates[1], randomPoint.geometry.coordinates[0]];
    } else {
        return null;
    }
}

// === Функция для отображения уведомлений ===
function showNotification({ image = '', title = '', description = '', duration = 3000 }) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '18px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '3000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '14px';
        container.style.pointerEvents = 'none';
        container.style.width = '100%';
        container.style.maxWidth = '400px';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.background = 'rgba(37,43,54,0.97)';
    notification.style.borderRadius = '16px';
    notification.style.boxShadow = '0 4px 16px rgba(0,0,0,0.13)';
    notification.style.padding = '14px 18px 14px 12px';
    notification.style.margin = '0 auto';
    notification.style.minWidth = '180px';
    notification.style.maxWidth = '96vw';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.35s, transform 0.35s';
    notification.style.transform = 'translateY(-24px)';
    notification.style.fontFamily = 'Segoe UI, Arial, sans-serif';
    notification.style.border = '1.5px solid #2e3440';

    if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.style.width = '44px';
        img.style.height = '44px';
        img.style.borderRadius = '12px';
        img.style.objectFit = 'cover';
        img.style.marginRight = '12px';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
        notification.appendChild(img);
    }

    const textBlock = document.createElement('div');
    textBlock.style.display = 'flex';
    textBlock.style.flexDirection = 'column';
    textBlock.style.justifyContent = 'center';

    if (title) {
        const titleElem = document.createElement('div');
        titleElem.textContent = title;
        titleElem.style.fontWeight = '600';
        titleElem.style.color = '#fff';
        titleElem.style.fontSize = '16px';
        titleElem.style.marginBottom = '3px';
        titleElem.style.letterSpacing = '0.02em';
        titleElem.style.wordBreak = 'break-word';
        textBlock.appendChild(titleElem);
    }
    if (description) {
        const descElem = document.createElement('div');
        descElem.textContent = description;
        descElem.style.fontSize = '14px';
        descElem.style.color = '#bfc4d1';
        descElem.style.lineHeight = '1.3';
        descElem.style.wordBreak = 'break-word';
        textBlock.appendChild(descElem);
    }

    notification.appendChild(textBlock);
    container.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 60);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-24px)';
        setTimeout(() => {
            notification.remove();
        }, 350);
    }, duration);
}

// === Функция спавна шахеда ===
function launchDrone(from, to) {
    const droneIcon = L.divIcon({
        className: "drone-icon",
        html: `<img src="images/geran.png" width="32" height="32" />`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const marker = L.marker(from, { icon: droneIcon }).addTo(map);
    const targetMarker = L.marker(to).addTo(map);

    const speed = 0.0010;
    const maneuverStrength = 0.06;
    let maneuverAngle = 0;
    let enteredUkraine = false;
    let finished = false;
    activeDrones.push(marker);

    function move() {
        if (!marker._map) return;
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // Проверка на ПВО
        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                tryShootDownDrone(marker, layer);
            }
        });

        const isInUkraine = turf.booleanPointInPolygon(turf.point([lng, lat]), ukraineGeoJson);

        // Вход в Украину
        if (!enteredUkraine && isInUkraine) {
            enteredUkraine = true;
            dronesEnteredUkraine++;
            if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
            showNotification({
                image: 'images/geran.png',
                title: 'Shahed entered Ukraine',
                description: 'A drone has crossed the border.',
                duration: 3000
            });
        }

        // Остановка на границе
        if (enteredUkraine && !isInUkraine) {
            marker.bindPopup("🛑 Drone stopped at border!");
            setTimeout(() => {
                map.removeLayer(marker);
                map.removeLayer(targetMarker);
            }, 1500);
            return;
        }

        // Прилет к цели
        if (dist < 0.01 && enteredUkraine && !finished) {
            finished = true;
            dronesEnteredUkraine--;
            if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
            marker.setLatLng(to);
            marker.bindPopup("💥 Explosion!");
            setTimeout(() => {
                map.removeLayer(marker);
                map.removeLayer(targetMarker);
            }, 1500);
            return;
        }

        let angle = Math.atan2(dLng, dLat);

        // Маневр только в Украине
        if (isInUkraine) {
            maneuverAngle += (Math.random() - 0.5) * maneuverStrength;
            angle += maneuverAngle;
        }

        let normLat = Math.cos(angle);
        let normLng = Math.sin(angle);

        marker.setLatLng([lat + normLat * speed, lng + normLng * speed]);

        const angleDeg = angle * (180 / Math.PI);
        const img = marker.getElement()?.querySelector('img');
        if (img) img.style.transform = `rotate(${angleDeg}deg)`;

        requestAnimationFrame(move);
    }

    move();
}

// === Функция для спавна шахеда в случайную точку Украины ===
async function spawnShahed() {
    const target = await getRandomPointInUkraine();
    if (!target) return;
    const index = Math.floor(Math.random() * launchPoints.length);
    const start = launchPoints[index];
    launchDrone(start.coords, target);
}

// === Массив типов ПВО ===
const PPO_LIST = [
    { name: "Mobile Group", image: "images/Pvo/mobile-group.png", radius: 25000 },
    { name: "S-300", image: "images/Pvo/s300.png", radius: 4000 },
    { name: "Buk-M1", image: "images/Pvo/buk.png", radius: 3000 }
    // Добавляйте новые типы ПВО сюда
];

// === Функция спавна ПВО по названию и координатам ===
function spawnPPO(name, coords) {
    const ppo = PPO_LIST.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (!ppo) {
        console.warn(`PPO "${name}" not found in PPO_LIST`);
        return;
    }
    const icon = L.divIcon({
        className: "ppo-icon",
        html: `<img src="${ppo.image}" width="32" height="32" alt="${ppo.name}" />`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    const marker = L.marker(coords, { icon: icon }).addTo(map);
    const circle = L.circle(coords, {
        color: '#ff0000ab',
        fillColor: '#ff000004',
        fillOpacity: 0.15,
        radius: ppo.radius
    }).addTo(map);
    circle._ppoType = ppo; // <-- Сохраняем тип ПВО в объекте круга!
    marker.bindPopup(`${ppo.name} deployed!`).openPopup();
}

// В функции tryShootDownDrone используйте тип ПВО из круга:
function tryShootDownDrone(droneMarker, ppoCircle) {
    if (!droneMarker._ppoTargeting && droneMarker._map) { // проверяем, что дрон ещё на карте
        droneMarker._ppoTargeting = true;
        setTimeout(() => {
            if (!droneMarker._map) return; // если дрон уже удалён, ничего не делаем
            const dronePos = droneMarker.getLatLng();
            const ppoPos = ppoCircle.getLatLng();
            const dist = map.distance(dronePos, ppoPos);
            if (dist <= ppoCircle.getRadius()) {
                if (Math.random() < 0.7) {
                    const ppoType = ppoCircle._ppoType || { image: 'images/Pvo/mobile-group.png', name: 'Air Defense' };
                    showNotification({
                        image: ppoType.image,
                        title: `${ppoType.name} shot down Shahed!`,
                        description: 'Air defense successfully intercepted the drone.',
                        duration: 2500
                    });
                    map.removeLayer(droneMarker);
                } else {
                    droneMarker._ppoTargeting = false;
                    tryShootDownDrone(droneMarker, ppoCircle);
                }
            } else {
                droneMarker._ppoTargeting = false;
            }
        }, 1000); // время наводки
    }
}

// === Получить количество шахедов в Украине ===
function getDronesEnteredUkraine() {
    return dronesEnteredUkraine;
}

// === Загрузка границ Украины и запуск шахедов ===
fetch('https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.type === "FeatureCollection" && data.features && data.features.length > 0) {
            const foundUkraine = data.features.find(feature =>
                feature.properties.name === 'Ukraine' ||
                feature.properties.name_long === 'Ukraine' ||
                feature.properties.iso_a2 === 'UA' ||
                feature.properties.iso_a3 === 'UKR'
            );
            if (foundUkraine) ukraineGeoJson = foundUkraine;
        } else if (data.type === "Feature" || data.type === "MultiPolygon" || data.type === "Polygon") {
            ukraineGeoJson = data;
        }
        if (ukraineGeoJson) {
            L.geoJSON(ukraineGeoJson, {
                style: {
                    color: '#007bff0e',
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.0090,
                    fillColor: '#007bff'
                }
            }).addTo(map);
            spawnShahed();
            setInterval(spawnShahed, Math.random() * 10000 + 3000);
        }
    })
    .catch(error => {
        console.error('Error loading or processing GeoJSON:', error);
    });

// === Управление размещением ПВО ===
let selectedPPOType = null;
let isSpawningPPO = false;

window.enablePPOPlacement = function(typeName) {
    selectedPPOType = typeName;
    isSpawningPPO = true;
    map.getContainer().style.cursor = 'crosshair';
};

map.on('click', function(e) {
    if (isSpawningPPO && selectedPPOType) {
        spawnPPO(selectedPPOType, [e.latlng.lat, e.latlng.lng]);
        isSpawningPPO = false;
        selectedPPOType = null;
        map.getContainer().style.cursor = '';
    }
});