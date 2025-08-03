const map = L.map('mapid').setView([49, 32], 6);
let dronespath = false; // Установите true, если хотите видеть пути дронов

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=aKi8preB5xn8tulgCx5z';
L.tileLayer(maptilerSatelliteUrl, {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright/" target="_blank">&copy; OpenStreetMap contributors</a>',
    maxZoom: 19
}).addTo(map);

const launchPoints = [
    { name: "Kursk", coords: [51.7306, 36.1939], type: "shahed" },
    { name: "Orel", coords: [52.8915, 35.8594], type: "shahed" },
    { name: "Navlya", coords: [52.81163, 34.50643], type: "shahed" },
    { name: "Chatalovo", coords: [54.3103, 32.4962], type: "shahed" },
    { name: "Gvardeyskoe", coords: [45.11678, 33.97634], type: "shahed" },
    { name: "Chauda", coords: [45.00529, 35.84238], type: "shahed" },
    { name: "Millerovo", coords: [48.8000, 39.5000], type: "shahed" },
    { name: "Belgorod", coords: [50.6056, 36.5778], type: "iskander" },
    { name: "Voronezh", coords: [51.6607, 39.2003], type: "iskander" },
    { name: "Primorsko-Akhtarsk", coords: [46.043509, 38.177654], type: "shahed" },
];

// === Переменные для Украины и шахедов ===
let ukraineGeoJson = null;
let dronesEnteredUkraine = 0;
const activeDrones = [];

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

// Новая функция для отслеживания пути дрона
function trackDronePath(marker) {
    const pathCoords = [marker.getLatLng()];
    const polyline = L.polyline(pathCoords, {
        color: '#f21f1f',
        weight: 3,
        opacity: 0.7
    }).addTo(map);

    marker._dronePath = polyline;

    marker._pathTracking = setInterval(() => {
        if (!marker._map) {
            clearInterval(marker._pathTracking);
            map.removeLayer(polyline);
            return;
        }
        const currentPos = marker.getLatLng();
        pathCoords.push(currentPos);
        polyline.setLatLngs(pathCoords);
    }, 300);
}

function launchDrone(from, to) {
    const droneIcon = L.divIcon({
        className: "drone-icon",
        html: `<img src="images/geran.png" width="32" height="32" />`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const marker = L.marker(from, { icon: droneIcon }).addTo(map);
    if (dronespath === true) {
        trackDronePath(marker);
    }

    const targetMarker = L.marker(to).addTo(map);

    const speed = 0.0010;
    const maneuverStrength = 0.06;
    let maneuverAngle = 0;
    let enteredUkraine = false;
    let finished = false;
    marker._isShahed = true;
    activeDrones.push(marker);

    function move() {
        if (!marker._map) return;
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                tryShootDownThreat(marker, layer);
            }
        });

        const isInUkraine = ukraineGeoJson && turf.booleanPointInPolygon(turf.point([lng, lat]), ukraineGeoJson);

        if (!enteredUkraine && isInUkraine) {
            enteredUkraine = true;
            dronesEnteredUkraine++;
            if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
        }

        if (enteredUkraine && !isInUkraine) {
            if (!finished) {
                finished = true;
                if (dronesEnteredUkraine > 0) dronesEnteredUkraine--;
                if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
                marker.bindPopup("🛑 Drone stopped at border!");
                showNotification({
                    image: 'images/geran.png',
                    title: 'Drone stopped at border',
                    description: 'The drone has stopped at the border of Ukraine.',
                    duration: 3000
                });
                setTimeout(() => {
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
                        if (marker._dronePath) {
                            map.removeLayer(marker._dronePath);
                            clearInterval(marker._pathTracking);
                        }
                    }
                    if (map.hasLayer(targetMarker)) map.removeLayer(targetMarker);
                }, 1500);
            }
            return;
        }

        if (dist < 0.01 && enteredUkraine && !finished) {
            finished = true;
            if (dronesEnteredUkraine > 0) dronesEnteredUkraine--;
            if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
            marker.setLatLng(to);
            marker.bindPopup("💥 Explosion!");
            showNotification({
                image: 'images/geran.png',
                title: 'Drone reached target',
                description: `The drone has reached its target in ${targetMarker.getLatLng().lat.toFixed(4)}, ${targetMarker.getLatLng().lng.toFixed(4)}.`,
                duration: 3000
            });
            createExplosionCircle(to, 1200, '#ff6600');
            setTimeout(() => {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                    if (marker._dronePath) {
                        map.removeLayer(marker._dronePath);
                        clearInterval(marker._pathTracking);
                    }
                }
                if (map.hasLayer(targetMarker)) map.removeLayer(targetMarker);
            }, 1500);
            return;
        }

        let angle = Math.atan2(dLng, dLat);

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

function launchIskander(from, to) {
    const iskanderIcon = L.divIcon({
        className: "iskander-icon",
        html: `<img src="images/iskander.png" width="24" height="24" />`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker(from, { icon: iskanderIcon }).addTo(map);
    const targetMarker = L.marker(to).addTo(map);

    const speed = 0.005;
    const maneuverStrength = 0.08;
    let maneuverAngle = 0;
    let enteredUkraine = false;
    let finished = false;
    marker._isIskander = true;

    function move() {
        if (!marker._map) return;
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                tryShootDownThreat(marker, layer);
            }
        });

        const isInUkraine = ukraineGeoJson && turf.booleanPointInPolygon(turf.point([lng, lat]), ukraineGeoJson);

        if (!enteredUkraine && isInUkraine) {
            enteredUkraine = true;
            showNotification({
                image: 'images/iskander.png',
                title: 'Iskander entered Ukraine!',
                description: 'A ballistic missile has entered Ukrainian airspace.',
                duration: 3000
            });
        }

        if (dist < 0.005 && enteredUkraine && !finished) {
            finished = true;
            marker.setLatLng(to);
            marker.bindPopup("💥 Iskander Explosion!");
            showNotification({
                image: 'images/iskander.png',
                title: 'Iskander reached target!',
                description: `Iskander has struck its target in ${targetMarker.getLatLng().lat.toFixed(4)}, ${targetMarker.getLatLng().lng.toFixed(4)}.`,
                duration: 4000
            });
            createExplosionCircle(to, 3500, '#ff0000');
            setTimeout(() => {
                if (map.hasLayer(marker)) map.removeLayer(marker);
                if (map.hasLayer(targetMarker)) map.removeLayer(targetMarker);
            }, 1000);
            return;
        }

        let angle = Math.atan2(dLng, dLat);

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

// Новая функция для Орлана
function launchOrlan(from, targetCity) {
    const orlanIcon = L.divIcon({
        className: "orlan-icon",
        html: `<img src="images/orlan.png" width="32" height="32" />`, // Укажите правильный путь к иконке
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const marker = L.marker(from, { icon: orlanIcon }).addTo(map);
    marker._isOrlan = true;

    const speed = 0.0005; // Скорость Орлана
    const loiterRadius = 0.05; // Радиус кружения (в градусах широты/долготы)
    let phase = 'approach'; // Фазы: 'approach' (приближение), 'loiter' (кружение), 'return' (возврат)
    let currentTarget = targetCity.coords; // Текущая цель (сначала город)
    let loiterCenter = null; // Центр кружения
    let loiterAngle = Math.random() * Math.PI * 2; // Начальный угол для кружения

    let returnPoint = from; // Точка возврата

    function move() {
        if (!marker._map) return; // Если маркер удален, останавливаем движение

        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;

        let dLat = currentTarget[0] - lat;
        let dLng = currentTarget[1] - lng;
        let dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // Проверка на вхождение в зону ПВО
        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                tryShootDownThreat(marker, layer);
            }
        });

        if (phase === 'approach') {
            if (dist < loiterRadius * 0.5) { // Дрон достаточно близко к городу
                phase = 'loiter';
                loiterCenter = targetCity.coords;
                showNotification({
                    image: 'images/orlan.png',
                    title: 'БПЛА Орлан-10',
                    description: `Разведывательный Орлан-10 начал кружение над ${targetCity.name}.`,
                    duration: 3500
                });
                // Запланировать возврат через некоторое время (например, 20-40 секунд)
                setTimeout(() => {
                    phase = 'return';
                    currentTarget = returnPoint; // Цель становится точкой старта
                    showNotification({
                        image: 'images/orlan.png',
                        title: 'БПЛА Орлан-10',
                        description: `Орлан-10 возвращается на базу.`,
                        duration: 3000
                    });
                }, 20000 + Math.random() * 20000); // Кружение от 20 до 40 секунд
            }
        } else if (phase === 'loiter') {
            loiterAngle += speed * 5; // Скорость вращения
            dLat = loiterCenter[0] + Math.cos(loiterAngle) * loiterRadius - lat;
            dLng = loiterCenter[1] + Math.sin(loiterAngle) * loiterRadius - lng;
            dist = Math.sqrt(dLat * dLat + dLng * dLng); // Обновляем дистанцию для движения
        } else if (phase === 'return') {
            if (dist < 0.01) { // Дрон вернулся
                showNotification({
                    image: 'images/orlan.png',
                    title: 'БПЛА Орлан-10',
                    description: `Орлан-10 вернулся на базу.`,
                    duration: 3000
                });
                if (map.hasLayer(marker)) map.removeLayer(marker);
                return;
            }
        }

        let angle = Math.atan2(dLng, dLat);
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
];

TARGET_CITIES.forEach(city => {
    L.circle(city.coords, {
        color: '#00ff0009',
        fillColor: '#00ff0044',
        fillOpacity: 0.18,
        radius: city.radius
    }).addTo(map).bindPopup(city.name);
});

function getRandomPointInCity(city) {
    const R = city.radius / 111320;
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.sqrt(Math.random()) * R;
    const lat = city.coords[0] + dist * Math.cos(angle);
    const lng = city.coords[1] + dist * Math.sin(angle);
    return [lat, lng];
}

function createExplosionCircle(coords, radius, color = '#ff6600') {
    const circle = L.circle(coords, {
        color: color,
        fillColor: color + '44',
        fillOpacity: 0.25,
        radius: radius
    }).addTo(map);
    setTimeout(() => {
        if (map.hasLayer(circle)) map.removeLayer(circle);
    }, 2000);
}

async function spawnThreat() {
    const city = TARGET_CITIES[Math.floor(Math.random() * TARGET_CITIES.length)];
    const target = getRandomPointInCity(city);

    const rand = Math.random();
    let typeToSpawn;

    if (rand < 0.2) { // 20% шанс на Орлан
        typeToSpawn = "orlan";
    } else if (rand < 0.5) { // 30% шанс на Искандер
        typeToSpawn = "iskander";
    } else { // 50% шанс на Шахед
        typeToSpawn = "shahed";
    }

    const possibleLaunchPoints = launchPoints.filter(point =>
        (typeToSpawn === "iskander" && point.type === "iskander") ||
        (typeToSpawn === "shahed" && point.type === "shahed") ||
        (typeToSpawn === "orlan" && point.type === "shahed")
    );

    if (possibleLaunchPoints.length === 0) {
        console.warn(`No suitable launch points found for ${typeToSpawn}`);
        return;
    }

    const start = possibleLaunchPoints[Math.floor(Math.random() * possibleLaunchPoints.length)];

    if (typeToSpawn === "iskander") {
        launchIskander(start.coords, target);
    } else if (typeToSpawn === "shahed") {
        launchDrone(start.coords, target);
    } else if (typeToSpawn === "orlan") {
        launchOrlan(start.coords, city);
    }
}

const PPO_LIST = [
    { name: "Mobile Group", image: "images/Pvo/mobile-group.png", radius: 25000, canInterceptIskander: false },
    { name: "S-300", image: "images/Pvo/s300.png", radius: 4000, canInterceptIskander: false },
    { name: "Buk-M1", image: "images/Pvo/buk.png", radius: 3000, canInterceptIskander: false },
    { name: "Patriot", image: "images/Pvo/patriot.png", radius: 50000, canInterceptIskander: true },
    { name: "SAMP/T", image: "images/Pvo/sampt.png", radius: 45000, canInterceptIskander: true }
];

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
    circle._ppoType = ppo;
    circle._ppoMarker = marker;
    marker.bindPopup(`${ppo.name} deployed!`).openPopup();

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

function tryShootDownThreat(threatMarker, ppoCircle) {
    if (threatMarker._ppoTargeting || !threatMarker._map) return;

    threatMarker._ppoTargeting = true;

    setTimeout(() => {
        if (!threatMarker._map) return;

        const threatPos = threatMarker.getLatLng();
        const ppoPos = ppoCircle.getLatLng();
        const dist = map.distance(threatPos, ppoPos);
        const ppoType = ppoCircle._ppoType;

        if (dist <= ppoCircle.getRadius()) {
            let successRate = 0;
            let targetType = "Unknown Threat";

            if (threatMarker._isIskander) {
                targetType = "Iskander";
                if (!ppoType.canInterceptIskander) {
                    successRate = 0;
                    showNotification({
                        image: ppoType.image,
                        title: `${ppoType.name} cannot intercept Iskander!`,
                        description: `Iskander flew past.`,
                        duration: 2500
                    });
                } else {
                    if (ppoType.name === "Patriot" || ppoType.name === "SAMP/T") {
                        successRate = 0.6;
                    } else {
                        successRate = 0.1;
                    }
                }
            } else if (threatMarker._isShahed) {
                targetType = "Shahed";
                if (ppoType.name === "Patriot" || ppoType.name === "SAMP/T") {
                    successRate = 0.9;
                } else if (ppoType.name === "S-300" || ppoType.name === "Buk-M1") {
                    successRate = 0.7;
                } else if (ppoType.name === "Mobile Group") {
                    successRate = 0.8;
                }
            } else if (threatMarker._isOrlan) { // НОВОЕ УСЛОВИЕ ДЛЯ ОРЛАНА
                targetType = "Orlan-10";
                if (ppoType.name === "Patriot" || ppoType.name === "SAMP/T") {
                    successRate = 0.7;
                } else if (ppoType.name === "S-300" || ppoType.name === "Buk-M1") {
                    successRate = 0.6;
                } else if (ppoType.name === "Mobile Group") {
                    successRate = 0.9;
                }
            }

            if (Math.random() < successRate) {
                showNotification({
                    image: ppoType.image,
                    title: `${ppoType.name} shot down ${targetType}!`,
                    description: `${targetType} successfully intercepted!`,
                    duration: 2500
                });
                if (threatMarker._isShahed && dronesEnteredUkraine > 0) {
                    dronesEnteredUkraine--;
                    if (window.updateShahedCount) window.updateShahedCount(dronesEnteredUkraine);
                }
                if (map.hasLayer(threatMarker)) {
                    map.removeLayer(threatMarker);
                    if (threatMarker._dronePath) { // Удаляем путь Орлана, если он есть
                        map.removeLayer(threatMarker._dronePath);
                        clearInterval(threatMarker._pathTracking);
                    }
                }
            } else {
                showNotification({
                    image: ppoType.image,
                    title: `${ppoType.name} missed!`,
                    description: `${targetType} evaded interception.`,
                    duration: 2000
                });
                threatMarker._ppoTargeting = false;
            }
        } else {
            threatMarker._ppoTargeting = false;
        }
    }, threatMarker._isIskander ? 1500 : 1000);
}

function getDronesEnteredUkraine() {
    return dronesEnteredUkraine;
}

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
            spawnThreat();
            setInterval(spawnThreat, Math.random() * 8000 + 4000);
        }
    })
    .catch(error => {
        console.error('Error loading or processing GeoJSON:', error);
    });

let selectedPPOType = null;
let isSpawningPPO = false;

window.enablePPOPlacement = function(typeName) {
    selectedPPOType = typeName;
    isSpawningPPO = true;
    map.getContainer().style.cursor = 'crosshair';
};

map.on('click', function(e) {
    if (isSpawningPPO && selectedPPOType) {
        if (ukraineGeoJson && turf.booleanPointInPolygon(turf.point([e.latlng.lng, e.latlng.lat]), ukraineGeoJson)) {
            spawnPPO(selectedPPOType, [e.latlng.lat, e.latlng.lng]);
            isSpawningPPO = false;
            selectedPPOType = null;
            map.getContainer().style.cursor = '';
        } else {
            showNotification({
                title: 'Размещение ПВО невозможно',
                description: 'ПВО можно размещать только на территории Украины.',
                duration: 2000,
                image: 'images/warning.png'
            });
            console.log("Cannot place PPO outside Ukraine.");
        }
    }
});

let ppoContextMenu = null;
let ppoCircleToDelete = null;

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

function enablePPODeleteMode() {
    map.getContainer().style.cursor = 'not-allowed';
    let handler = function(e) {
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
            map.removeLayer(found);
            if (found._ppoMarker) map.removeLayer(found._ppoMarker);
        }
        map.getContainer().style.cursor = '';
        map.off('click', handler);
    };
    map.on('click', handler);
}