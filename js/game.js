// === Карта и слои ===
const map = L.map('mapid').setView([49, 32], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=aKi8preB5xn8tulgCx5z';
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
        }

        // Остановка на границе
        if (enteredUkraine && !isInUkraine) {
            marker.bindPopup("🛑 Drone stopped at border!");
            setTimeout(() => {
                map.removeLayer(marker);
                map.removeLayer(targetMarker);
            }, 1500);
            return;
            showNotification({
                image: 'images/geran.png',
                title: 'Drone stopped at border',
                description: 'The drone has stopped at the border of Ukraine.',
                duration: 3000
            });
        }

        // Прилет к цели
        if (dist < 0.01 && enteredUkraine && !finished) {
            finished = true;
            dronesEnteredUkraine--;
            if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
            marker.setLatLng(to);
            marker.bindPopup("💥 Explosion!");
            showNotification({
                image: 'images/geran.png',
                title: 'Drone reached target',
                description: `The drone has reached its target in ${targetMarker.getLatLng().lat.toFixed(4)}, ${targetMarker.getLatLng().lng.toFixed(4)}.`,
                duration: 3000
            });
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

// === Массив городов-целей ===
const TARGET_CITIES = [
    { name: "Kyiv", coords: [50.4501, 30.5234], radius: 12000 },
    { name: "Starokonstantinov", coords: [49.7556, 27.2061], radius: 8000 },
    { name: "Dnipro", coords: [48.4647, 35.0462], radius: 10000 }, 
    { name: "Kharkiv", coords: [49.9935, 36.2304], radius: 12000 },
    { name: "Odesa", coords: [46.4825, 30.7233], radius: 15000 },
    { name: "Zaporizhzhia", coords: [47.8388, 35.1396], radius: 10000 },
    { name: "Mykolaiv", coords: [46.9750, 31.9946], radius: 8000 },
    { name: "Lviv", coords: [49.8397, 24.0297], radius: 9000 },
    { name: "Vinnytsia", coords: [49.2328, 28.4682], radius: 8000 },
    { name: "Kremenchuk", coords: [49.0709, 33.4164], radius: 7000 }
    // Добавляйте новые города сюда
];

// === Отрисовка кругов целей на карте ===
TARGET_CITIES.forEach(city => {
    L.circle(city.coords, {
        color: '#00ff0009',
        fillColor: '#00ff0044',
        fillOpacity: 0.18,
        radius: city.radius
    }).addTo(map).bindPopup(city.name);
});

// === Получить случайную точку внутри круга города ===
function getRandomPointInCity(city) {
    const R = city.radius / 111320; // радиус в градусах (примерно)
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.sqrt(Math.random()) * R;
    const lat = city.coords[0] + dist * Math.cos(angle);
    const lng = city.coords[1] + dist * Math.sin(angle);
    return [lat, lng];
}

// === Функция для спавна шахеда в случайный город ===
async function spawnShahed() {
    const city = TARGET_CITIES[Math.floor(Math.random() * TARGET_CITIES.length)];
    const target = getRandomPointInCity(city);
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
        radius: ppo.radius,
        interactive: true
    }).addTo(map);
    circle._ppoType = ppo; // <-- Сохраняем тип ПВО в объекте круга!
    circle._ppoMarker = marker;
    marker.bindPopup(`${ppo.name} deployed!`).openPopup();

    // Добавляем обработчик контекстного меню
    circle.on('contextmenu', function(e) {
        const point = map.latLngToContainerPoint(e.latlng);
        showPPOContextMenu(point, circle);
        L.DomEvent.stopPropagation(e);
    });
    marker.on('contextmenu', function(e) {
        const point = map.latLngToContainerPoint(e.latlng);
        showPPOContextMenu(point, circle);
        L.DomEvent.stopPropagation(e);
    });
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

// === Кастомное контекстное меню для удаления ПВО ===
let ppoContextMenu = null;
let ppoCircleToDelete = null;

// Создание меню
function showPPOContextMenu(latlng, circle) {
    hidePPOContextMenu();
    ppoCircleToDelete = circle;

    ppoContextMenu = document.createElement('div');
    ppoContextMenu.id = 'ppo-context-menu';
    ppoContextMenu.style.position = 'fixed';
    ppoContextMenu.style.left = latlng.x + 'px';
    ppoContextMenu.style.top = latlng.y + 'px';
    ppoContextMenu.style.background = '#252B36';
    ppoContextMenu.style.color = '#cfcfcf';
    ppoContextMenu.style.borderRadius = '8px';
    ppoContextMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
    ppoContextMenu.style.padding = '10px 18px';
    ppoContextMenu.style.fontFamily = 'Segoe UI, Arial, sans-serif';
    ppoContextMenu.style.fontSize = '15px';
    ppoContextMenu.style.zIndex = '4000';

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Удалить ПВО';
    delBtn.style.background = '#ff3b3b';
    delBtn.style.color = '#fff';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '6px';
    delBtn.style.padding = '7px 18px';
    delBtn.style.fontWeight = 'bold';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = function() {
        if (ppoCircleToDelete) {
            map.removeLayer(ppoCircleToDelete);
            if (ppoCircleToDelete._ppoMarker) map.removeLayer(ppoCircleToDelete._ppoMarker);
        }
        hidePPOContextMenu();
    };

    ppoContextMenu.appendChild(delBtn);
    document.body.appendChild(ppoContextMenu);

    // Закрытие меню при клике вне его
    setTimeout(() => {
        document.addEventListener('mousedown', hidePPOContextMenu, { once: true });
    }, 0);
}

function hidePPOContextMenu() {
    if (ppoContextMenu) {
        ppoContextMenu.remove();
        ppoContextMenu = null;
        ppoCircleToDelete = null;
    }
}

// Стили для меню (можно добавить в index.html <style>)
if (!document.getElementById('ppo-context-menu-style')) {
    const style = document.createElement('style');
    style.id = 'ppo-context-menu-style';
    style.textContent = `
        #ppo-context-menu button:hover {
            background: #d32f2f;
        }
    `;
    document.head.appendChild(style);
}

// === Режим удаления ПВО по клику ===
function enablePPODeleteMode() {
    map.getContainer().style.cursor = 'not-allowed';
    let handler = function(e) {
        // Ищем круг ПВО под курсором
        let found = null;
        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                const latlng = layer.getLatLng();
                const radius = layer.getRadius();
                const dist = map.distance(e.latlng, latlng);
                if (dist <= radius) found = layer;
            }
        });
        if (found) {
            // Удаляем круг и маркер
            map.removeLayer(found);
            if (found._ppoMarker) map.removeLayer(found._ppoMarker);
        }
        map.getContainer().style.cursor = '';
        map.off('click', handler);
    };
    map.on('click', handler);
}

// Пример использования:
// enablePPODeleteMode(); // После вызова кликните по кругу ПВО для удаления