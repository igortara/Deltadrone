const map = L.map('mapid').setView([49, 32], 6);
let dronespath = true; // This variable seems to control if drone paths are tracked
let selectedDrone = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18
}).addTo(map);
//const maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=jfX0aBkIvFWzEw6s5flj';
//L.tileLayer(maptilerSatelliteUrl, {
//    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright/" target="_blank">&copy; OpenStreetMap contributors</a>',
//    maxZoom: 19
//}).addTo(map);

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
    { name: "Black Sea", coords: [44.5, 36.5], type: "kalibr" },
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

function launchDrone(from, to) {
    const droneIcon = L.divIcon({
        className: "drone-icon",
        html: `<img src="images/geran.png" width="32" height="32" />`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const marker = L.marker(from, { icon: droneIcon }).addTo(map);
    const targetMarker = L.marker(to).addTo(map);

    const callsign = "Shahed-" + Math.floor(1000 + Math.random() * 9000);

    marker._data = {
        model: "Shahed-136",
        name: callsign,
        altitude: Math.floor(200 + Math.random() * 200),
        lastPos: from,
        lastTime: performance.now()
    };

    marker.on('click', () => {
        selectedDrone = marker;
        document.getElementById("delta-panel").style.display = "block";
        document.getElementById("delta-open").style.display = "none";
    });

    const speed = 0.00045;
    const maneuverStrength = 0.06;
    let maneuverAngle = 0;
    let enteredUkraine = false;
    let finished = false;
    marker._isShahed = true;
    activeDrones.push(marker);

    // === Линия следа за дроном ===
    const pathCoords = [L.latLng(from[0], from[1])];
    const droneTrail = L.polyline(pathCoords, {
        color: '#ff7800',
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5'
    }).addTo(map);

    // -------------------- Airfield launch notifications & scheduled spawns --------------------

// 1) Иконка неизвестной цели (если не объявлена раньше)
const ICON_UNKNOWN = L.icon({
  iconUrl: 'images/unknown_target.png', // замени путь, если у тебя другое имя
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// 2) Обязательно: чтобы мы могли получить маркер от launchDrone, верни его.
// Найди конец функции launchDrone(...) и добавь сразу после вызова move(); строку:
//    return marker;
// (Если уже есть return — оставь.)
//
// Пример: (внутри launchDrone, в самом конце)
//    move();
//    return marker;

// 3) Функции уведомления + последовательного запуска группы из аэродрома
function notifyAirfieldLaunch(airfield, count = 3, delayBetween = 800) {
  // Показываем уведомление о пуске
  showNotification({
    image: 'images/rocket-launch.png', // или любая иконка уведомления
    title: `Launch from ${airfield.name}`,
    description: `${count} targets launched from ${airfield.name}`,
    duration: 3500
  });

  // Через небольшой таймаут начнём реальную отправку дронов (даём время для "уведомления")
  setTimeout(() => {
    spawnAirfieldGroup(airfield, count, delayBetween);
  }, 800);
}

/**
 * spawnAirfieldGroup - запустить группу дронов/ракeт с аэродрома
 * - airfield: объект из launchPoints
 * - count: кол-во единиц
 * - delayBetween: ms между запусками
 *
 * Стартуем от координат аэродрома (airfield.coords) и летим к случайным точкам внутри Украины.
 * При создании каждый маркер помечается: _fromAirfield = true, _spawnTime, _isDetected = false, и получает ICON_UNKNOWN.
 */
async function spawnAirfieldGroup(airfield, count = 3, delayBetween = 800) {
  // если гео-границы Украины не загружены — отмена
  if (!ukraineGeoJson) {
    console.warn("Ukraine geojson not loaded — cannot spawn targets into Ukraine.");
    return;
  }

  for (let i = 0; i < count; i++) {
    setTimeout(async () => {
      // получаем случайную точку внутри Украины
      const targetInside = await getRandomPointInUkraine();
      if (!targetInside) {
        console.warn("Failed to find random point in Ukraine for airfield spawn.");
        return;
      }

      // используем исходную логику: если тип аэродрома в launchPoints указан как shahed/kalibr/iskander, браcаем его,
      // иначе по умолчанию shahed
      const type = airfield.type || 'shahed';

      // Запускаем соответствующий старт (launchDrone теперь возвращает маркер)
      let marker = null;
      if (type === 'shahed') {
        marker = launchDrone(airfield.coords, targetInside);
      } else if (type === 'kalibr') {
        marker = launchKalibr(airfield.coords, targetInside);
      } else if (type === 'iskander') {
        marker = launchIskander(airfield.coords, targetInside);
      } else {
        // fallback на drone
        marker = launchDrone(airfield.coords, targetInside);
      }

      // Если launch... вернул маркер — настраиваем флаги, иконку и время старта
      if (marker) {
        try {
          marker._fromAirfield = true;
          marker._spawnTime = performance.now();
          marker._isDetected = false;
          // помечаем и ставим неизвестный значок (если хочешь, используем ICON_UNKNOWN)
          if (typeof marker.setIcon === 'function') {
            marker.setIcon(ICON_UNKNOWN);
          }
          // если есть _data — можно обнулить модель/название до опознания
          if (marker._data) {
            marker._data.model = "Unknown";
            marker._data.name = "Unidentified";
          }
        } catch (err) {
          console.warn("Failed to tag airfield marker:", err);
        }
      }
    }, i * delayBetween);
  }
}

// 4) Пример автоматического триггера: случайный аэродром каждые 25–45 сек
//    (если хочешь, отключи/измени или привяжи к системе волн)
setInterval(() => {
  // 30% шанс — запуск с аэродрома (иначе ничего)
  if (Math.random() > 0.35) return;

  // выбираем случайный аэродром
  const airports = launchPoints.filter(p => p.airport);
  if (!airports || airports.length === 0) return;

  const chosen = airports[Math.floor(Math.random() * airports.length)];
  // количество от 2 до 5
  const cnt = 2 + Math.floor(Math.random() * 4);
  // интервал между пусками 600-1200ms
  const intervalMs = 600 + Math.floor(Math.random() * 700);

  notifyAirfieldLaunch(chosen, cnt, intervalMs);
}, 25000 + Math.floor(Math.random() * 20000)); // срабатывает каждые 25-45 секунд (пример)

    function move() {
        if (!marker._map) {
            if (map.hasLayer(droneTrail)) map.removeLayer(droneTrail);
            return;
        }
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        // Добавьте эти строки:
        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // ...остальной код...

        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                tryShootDownThreat(marker, layer);
            }
        });

        const isInUkraine = ukraineGeoJson && turf.booleanPointInPolygon(turf.point([lng, lat]), ukraineGeoJson);

        if (enteredUkraine && !isInUkraine) {
            if (!finished) {
                finished = true;
                if (dronesEnteredUkraine > 0) dronesEnteredUkraine--;
                marker.bindPopup("🛑 Drone stopped at border!");
                showNotification({
                    image: 'images/geran.png',
                    title: 'Drone stopped at border',
                    description: 'The drone has stopped at the border of Ukraine.',
                    duration: 3000
                });
                setTimeout(() => {
                    if (map.hasLayer(marker)) map.removeLayer(marker);
                    if (map.hasLayer(targetMarker)) map.removeLayer(targetMarker);
                    if (map.hasLayer(droneTrail)) map.removeLayer(droneTrail);
                }, 1500);
            }
            return;
        }

        if (!enteredUkraine && isInUkraine) {
            enteredUkraine = true;
            dronesEnteredUkraine++;
        }

        if (dist < 0.01 && enteredUkraine && !finished) {
            finished = true;
            if (dronesEnteredUkraine > 0) dronesEnteredUkraine--;
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
                if (map.hasLayer(marker)) map.removeLayer(marker);
                if (map.hasLayer(targetMarker)) map.removeLayer(targetMarker);
                if (map.hasLayer(droneTrail)) map.removeLayer(droneTrail);
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

    let iskanderPathPolyline = trackIskanderPath(marker);

    const speed = 0.005;
    let enteredUkraine = false;
    let finished = false;
    marker._isIskander = true;

    // Вычисляем угол один раз для прямолинейного движения
    const dLat = to[0] - from[0];
    const dLng = to[1] - from[1];
    const distTotal = Math.sqrt(dLat * dLat + dLng * dLng);
    const normLat = dLat / distTotal;
    const normLng = dLng / distTotal;

    function move() {
        if (!marker._map) return;
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLatCur = to[0] - lat;
        const dLngCur = to[1] - lng;
        const dist = Math.sqrt(dLatCur * dLatCur + dLngCur * dLngCur);

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
                if (iskanderPathPolyline && map.hasLayer(iskanderPathPolyline)) map.removeLayer(iskanderPathPolyline);
            }, 1000);
            return;
        }

        // Движение строго по прямой
        marker.setLatLng([lat + normLat * speed, lng + normLng * speed]);

        const angleDeg = Math.atan2(normLng, normLat) * (180 / Math.PI);
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
    let isIskander = false;
    if (rand < 0.3) isIskander = true;

    const possibleLaunchPoints = launchPoints.filter(point =>
        isIskander ? point.type === "iskander" : point.type === "shahed"
    );
    if (possibleLaunchPoints.length === 0) {
        console.warn(`No suitable launch points found for ${isIskander ? 'Iskander' : 'Shahed'}`);
        return;
    }

    const start = possibleLaunchPoints[Math.floor(Math.random() * possibleLaunchPoints.length)];

    if (isIskander) {
        launchIskander(start.coords, target);
    } else {
        launchDrone(start.coords, target);
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

// === Детерминированный перехват — замените старую функцию tryShootDownThreat ===
function tryShootDownThreat(threatMarker, ppoCircle) {
    if (threatMarker._ppoTargeting || !threatMarker._map) return;

    const threatPos = threatMarker.getLatLng();
    const ppoPos = ppoCircle.getLatLng();
    const dist = map.distance(threatPos, ppoPos);
    const ppoType = ppoCircle._ppoType;

    if (dist > ppoCircle.getRadius()) return;
    threatMarker._ppoTargeting = true;

    let canIntercept = false;
    let targetType = "Shahed";

    if (threatMarker._isIskander) {
        targetType = "Iskander";
        canIntercept = !!ppoType.canInterceptIskander;
    } else if (threatMarker._isShahed) {
        targetType = "Shahed";
        canIntercept = true;
    } else if (threatMarker._isKalibr) {
        targetType = "Kalibr";
        const good = ["Patriot", "SAMP/T", "S-300", "NASAMS"];
        canIntercept = good.includes(ppoType.name);
    } else {
        canIntercept = true;
    }

    if (!canIntercept) {
        showNotification({
            image: ppoType.image,
            title: `${ppoType.name} cannot intercept ${targetType}!`,
            description: `${targetType} flew past.`,
            duration: 1800
        });
        threatMarker._ppoTargeting = false;
        return;
    }

    // Пуск перехватчика
    showNotification({
        image: ppoType.image,
        title: `${ppoType.name} engaging ${targetType}`,
        description: `Interceptor launched.`,
        duration: 1000
    });

    const from = [ppoPos.lat, ppoPos.lng];
    const to = [threatPos.lat, threatPos.lng];
    launchInterceptor(from, to, ppoType.image || "images/interceptor.png");

    // 💥 Мгновенное сбитие через короткое время (1–1.5 сек)
    setTimeout(() => {
        if (!threatMarker._map) return;
        createExplosionCircle([threatPos.lat, threatPos.lng], 800, '#ffff00');
        showNotification({
            image: ppoType.image,
            title: `${ppoType.name} shot down ${targetType}!`,
            description: `${targetType} destroyed.`,
            duration: 1500
        });

        if (threatMarker._isShahed && dronesEnteredUkraine > 0) dronesEnteredUkraine--;
        if (map.hasLayer(threatMarker)) map.removeLayer(threatMarker);

        threatMarker._ppoTargeting = false;
    }, 1200); // время “долёта” ракеты — можно регулировать
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
        // Проверяем, находится ли точка клика в пределах Украины
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

function showPPOContextMenu(point, circle) {
    hidePPOContextMenu();
    ppoCircleToDelete = circle;

    ppoContextMenu = document.createElement('div');
    ppoContextMenu.id = 'ppo-context-menu';
    ppoContextMenu.style.position = 'fixed';
    ppoContextMenu.style.left = point.x + 'px';
    ppoContextMenu.style.top = point.y + 'px';
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

function trackDroneData(marker) {
    const update = () => {
        if (!marker._map || selectedDrone !== marker) return;

        const now = performance.now();
        const pos = marker.getLatLng();
        const last = marker._data.lastPos;
        const deltaTime = (now - marker._data.lastTime) / 1000;
        const distance = map.distance(pos, last);
        const speed = (distance / deltaTime) * 3.6;

        const headingRad = Math.atan2(pos.lng - last.lng, pos.lat - last.lat);
        const headingDeg = (headingRad * 180 / Math.PI + 360) % 360;

        document.getElementById("dp-model").textContent = marker._data.model;
        document.getElementById("dp-name").textContent = marker._data.name;
        document.getElementById("dp-speed").textContent = speed.toFixed(1);
        document.getElementById("dp-altitude").textContent = marker._data.altitude;
        document.getElementById("dp-heading").textContent = headingDeg.toFixed(1);
        document.getElementById("dp-lat").textContent = pos.lat.toFixed(5);
        document.getElementById("dp-lng").textContent = pos.lng.toFixed(5);

        marker._data.lastPos = pos;
        marker._data.lastTime = now;
    };

    marker._deltaUpdater = setInterval(update, 1000);
}


// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', (event) => {
    const deltaToggle = document.getElementById("delta-toggle");
    const deltaOpen = document.getElementById("delta-open");

    if (deltaToggle) {
        deltaToggle.onclick = () => {
            document.getElementById("delta-panel").style.display = "none";
            document.getElementById("delta-open").style.display = "block";
        };
    } else {
        console.warn("Element with ID 'delta-toggle' not found.");
    }

    if (deltaOpen) {
        deltaOpen.onclick = () => {
            document.getElementById("delta-panel").style.display = "block";
            document.getElementById("delta-open").style.display = "none";
        };
    } else {
        console.warn("Element with ID 'delta-open' not found.");
    }
});

function trackIskanderPath(marker) {
    const pathCoords = [marker.getLatLng()];
    const polyline = L.polyline(pathCoords, {
        color: 'red',
        weight: 2.8,
        opacity: 0.9,
        dashArray: '4, 6',
        smoothFactor: 1.3
    }).addTo(map);

    marker._iskanderPath = polyline;

    function updatePath() {
        if (!marker._map) {
            if (map.hasLayer(polyline)) map.removeLayer(polyline);
            return;
        }

        const currentPos = marker.getLatLng();
        const last = pathCoords[pathCoords.length - 1];

        if (currentPos.lat !== last.lat || currentPos.lng !== last.lng) {
            pathCoords.push(currentPos);
            polyline.setLatLngs(pathCoords);
        }

        requestAnimationFrame(updatePath);
    }

    updatePath();
    return polyline; // Возвращаем полилинию, чтобы ее можно было удалить
}

// Добавляем трек дрона на карту
function drawDronePath(startCoords, endCoords, options = {}) {
    const defaultOptions = {
        color: '#f200ff',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5',
        animate: true,
        duration: 3000,
        pulseEffect: true
    };
    
    const settings = {...defaultOptions, ...options};

    // Создаём линию только с начальной точкой
    const path = L.polyline([startCoords], {
        color: settings.color,
        weight: settings.weight,
        opacity: settings.opacity,
        dashArray: settings.dashArray
    }).addTo(map);

    // Анимация прорисовки
    if (settings.animate) {
        let currentIndex = 0;
        const points = [];
        const steps = 100;
        
        // Генерируем промежуточные точки
        for (let i = 0; i <= steps; i++) {
            const lat = startCoords.lat + (endCoords.lat - startCoords.lat) * (i / steps);
            const lng = startCoords.lng + (endCoords.lng - startCoords.lng) * (i / steps);
            points.push([lat, lng]);
        }

        // Постепенное отображение
        const interval = setInterval(() => {
            if (currentIndex >= points.length) {
                clearInterval(interval);
                
                // Эффект пульсации при завершении
                if (settings.pulseEffect) {
                    path.setStyle({dashArray: null});
                    setTimeout(() => {
                        path.setStyle({opacity: 0.3});
                        setTimeout(() => path.setStyle({opacity: 0.7}), 500);
                    }, 500);
                }
                return;
            }
            
            path.setLatLngs(points.slice(0, currentIndex + 1));
            currentIndex++;
        }, settings.duration / steps);
    }

    return path;
}

function launchInterceptor(from, to, image = "images/interceptor.png") {
    const interceptorIcon = L.divIcon({
        className: "interceptor-icon",
        html: `<img src="${image}" width="16" height="16" />`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const marker = L.marker(from, { icon: interceptorIcon }).addTo(map);

    const speed = 0.01; // скорость полёта ракеты
    let finished = false;

    const dLat = to[0] - from[0];
    const dLng = to[1] - from[1];
    const distTotal = Math.sqrt(dLat * dLat + dLng * dLng);
    const normLat = dLat / distTotal;
    const normLng = dLng / distTotal;

    function move() {
        if (!marker._map || finished) return;

        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLatCur = to[0] - lat;
        const dLngCur = to[1] - lng;
        const dist = Math.sqrt(dLatCur * dLatCur + dLngCur * dLngCur);

        if (dist < 0.01) {
            finished = true;
            createExplosionCircle(to, 800, "#ffff00"); // эффект взрыва
            if (map.hasLayer(marker)) map.removeLayer(marker);
            return;
        }

        marker.setLatLng([lat + normLat * speed, lng + normLng * speed]);

        requestAnimationFrame(move);
    }

    move();
}

function launchKalibr(from, to) {
    const kalibrIcon = L.divIcon({
        className: "kalibr-icon",
        html: `<img src="images/kalibr.png" width="28" height="28" />`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker(from, { icon: kalibrIcon }).addTo(map);
    const targetMarker = L.marker(to).addTo(map);

    let enteredUkraine = false;
    let finished = false;

    const speed = 0.0015; // медленнее чем Искандер
    const maneuverStrength = 0.04;
    let maneuverAngle = 0;
    const dLat = to[0] - from[0];
    const dLng = to[1] - from[1];
    const distTotal = Math.sqrt(dLat * dLat + dLng * dLng);
    const normLat = dLat / distTotal;
    const normLng = dLng / distTotal;

    // === Траектория ===
    const pathCoords = [L.latLng(from[0], from[1])];
    const kalibrTrail = L.polyline(pathCoords, {
        color: '#00bfff',
        weight: 2,
        opacity: 0.8,
        dashArray: '4, 4'
    }).addTo(map);

    marker._isKalibr = true;

    function move() {
        if (!marker._map) return;
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;

        // Проверка на попадание в радиус ПВО
        map.eachLayer(layer => {
            if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
                tryShootDownThreat(marker, layer);
            }
        });

        const isInUkraine = ukraineGeoJson && turf.booleanPointInPolygon(turf.point([lng, lat]), ukraineGeoJson);
        if (!enteredUkraine && isInUkraine) {
            enteredUkraine = true;
            showNotification({
                image: 'images/kalibr.png',
                title: 'Kalibr entered Ukraine!',
                description: 'A cruise missile has entered Ukrainian airspace.',
                duration: 3500
            });
        }

        // Конец маршрута
        const distToTarget = Math.sqrt((to[0]-lat)**2 + (to[1]-lng)**2);
        if (distToTarget < 0.005 && !finished) {
            finished = true;
            showNotification({
                image: 'images/kalibr.png',
                title: 'Kalibr impact!',
                description: 'A Kalibr missile hit its target.',
                duration: 4000
            });
            createExplosionCircle(to, 2000, '#00bfff');
            if (map.hasLayer(marker)) map.removeLayer(marker);
            if (map.hasLayer(targetMarker)) map.removeLayer(targetMarker);
            if (map.hasLayer(kalibrTrail)) map.removeLayer(kalibrTrail);
            return;
        }

        // Плавное движение с "манёврами"
        maneuverAngle += (Math.random() - 0.5) * maneuverStrength;
        const latStep = normLat * speed + maneuverAngle * 0.0001;
        const lngStep = normLng * speed + maneuverAngle * 0.0001;

        marker.setLatLng([lat + latStep, lng + lngStep]);
        pathCoords.push(marker.getLatLng());
        kalibrTrail.setLatLngs(pathCoords);

        requestAnimationFrame(move);
    }

    move();
}

if (rand < 0.3) isIskander = true;

let threatType = "shahed";
if (rand < 0.2) threatType = "iskander";
else if (rand < 0.4) threatType = "kalibr";

if (threatType === "iskander") {
    launchIskander(start.coords, target);
} else if (threatType === "kalibr") {
    launchKalibr(start.coords, target);
} else {
    launchDrone(start.coords, target);
}

function createExplosionEffect(latlng, color = '#ff6600') {
  const explosion = L.circle(latlng, {
    radius: 2000,
    color: color,
    fillColor: color,
    fillOpacity: 0.8
  }).addTo(map);

  let opacity = 0.8;
  const fade = setInterval(() => {
    opacity -= 0.05;
    explosion.setStyle({ fillOpacity: opacity, opacity });
    if (opacity <= 0) {
      clearInterval(fade);
      map.removeLayer(explosion);
    }
  }, 50);
}

function drawMissileTrail(from, to, color = '#ffff00') {
  const trail = L.polyline([from], { color, weight: 2, opacity: 0.8 }).addTo(map);
  let progress = 0;
  const steps = 30;
  const interval = setInterval(() => {
    progress++;
    const lat = from[0] + (to[0] - from[0]) * (progress / steps);
    const lng = from[1] + (to[1] - from[1]) * (progress / steps);
    trail.addLatLng([lat, lng]);
    if (progress >= steps) clearInterval(interval);
  }, 30);
  setTimeout(() => map.removeLayer(trail), 2000);
}

function screenFlash(color = 'rgba(255, 120, 0, 0.2)') {
  const flash = document.createElement('div');
  flash.style.position = 'fixed';
  flash.style.top = '0';
  flash.style.left = '0';
  flash.style.width = '100vw';
  flash.style.height = '100vh';
  flash.style.background = color;
  flash.style.zIndex = '5000';
  flash.style.pointerEvents = 'none';
  flash.style.transition = 'opacity 0.4s';
  document.body.appendChild(flash);
  setTimeout(() => flash.style.opacity = '0', 50);
  setTimeout(() => flash.remove(), 500);
}

// ----------------------- Radar Centers: Start -----------------------
/*
  Radar centers detect targets automatically, can be upgraded (radius/scan speed),
  and can engage a detected target by launching an interceptor.
*/

// Player money (if not defined elsewhere)
window.playerMoney = window.playerMoney || 500;
function updateMoneyUI() {
  const ui = document.getElementById('ui-money') || document.getElementById('player-money');
  if (ui) ui.textContent = Math.max(0, Math.floor(window.playerMoney));
}

function updateHud() {
  document.getElementById('hud-pvo').textContent = document.getElementById('ui-pvo').textContent;
  document.getElementById('hud-money').textContent = document.getElementById('ui-money').textContent;
  document.getElementById('hud-drones').textContent = document.getElementById('ui-drones').textContent;
}

setInterval(updateHud, 500);

// Cities where radar centers will be placed (you can customize)
const RADAR_CITIES = [
  { name: "Kyiv", coords: [50.4501, 30.5234] },
  { name: "Kharkiv", coords: [49.9935, 36.2304] },
  { name: "Odesa", coords: [46.4825, 30.7233] },
  { name: "Dnipro", coords: [48.4647, 35.0462] }
];

// Storage for radar centers
const radarCenters = [];

/**
 * Создаёт визуальный маркер радарного центра и запускает сканирование
 * options: { radius, scanSpeed (deg per second), level }
 */
function spawnRadarCenter(city, options = {}) {
  const base = {
    level: options.level || 1,
    radius: options.radius || 30000, // meters
    scanSpeed: options.scanSpeed || 90, // degrees per second (how fast the sector rotates)
    sweepAngle: options.sweepAngle || 60,
    costNextLevel: options.costNextLevel || 200
  };

  const iconHtml = `<div class="radar-center-icon" title="${city.name}"></div>`;
  const icon = L.divIcon({ className: 'radar-center-divicon', html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14] });
  const marker = L.marker(city.coords, { icon }).addTo(map);
  marker._radarState = { ...base, cityName: city.name };

  // Hidden circular zone for detection (used by toggle ranges to show/hide)
  const circle = L.circle(city.coords, {
    color: '#00ff0088',
    fillColor: '#00ff0044',
    fillOpacity: 0.12,
    radius: marker._radarState.radius,
    interactive: false
  }).addTo(map);
  // Start hidden if showPpoRanges is false
  circle.setStyle({ opacity: (typeof showPpoRanges !== 'undefined' && showPpoRanges) ? 0.12 : 0 });

  circle._isRadarRange = true;
  circle._ownerMarker = marker;

  // Create rotating sector using L.semiCircle (ensure leaflet-semicircle is included)
  const radarArc = L.semiCircle(city.coords, {
    radius: marker._radarState.radius,
    startAngle: 0,
    stopAngle: marker._radarState.sweepAngle,
    direction: 0,
    color: '#00ff66',
    fillColor: '#00ff6644',
    fillOpacity: 0.12,
    weight: 1.2,
    interactive: false
  }).addTo(map);
  // Hide arc if ranges hidden
  radarArc.setStyle({ opacity: (typeof showPpoRanges !== 'undefined' && showPpoRanges) ? 1 : 0 });

  marker._radarCircle = circle;
  marker._radarArc = radarArc;

  // scanning state
  marker._radarState._direction = 0; // degrees
  marker._radarState._scanning = true;

  // animation loop: rotate arc
  function rotateRadar() {
    if (!marker._map) {
      if (map.hasLayer(radarArc)) map.removeLayer(radarArc);
      if (map.hasLayer(circle)) map.removeLayer(circle);
      return;
    }
    const st = marker._radarState;
    st._direction = (st._direction + st.scanSpeed * (1/60)) % 360;
    radarArc.setDirection(st._direction);
    // update arc radius/angles if upgraded
    radarArc.setRadius(st.radius);
    radarArc.options.stopAngle = st.sweepAngle;
    circle.setRadius(st.radius);

    requestAnimationFrame(rotateRadar);
  }
  rotateRadar();

  // Click opens small HUD for upgrades/engage
  marker.on('click', (e) => {
    openRadarHUD(marker);
    L.DomEvent.stopPropagation(e);
  });

  // store
  radarCenters.push(marker);
  return marker;
}

// Auto-detect targets inside arc (called periodically)
function detectTargetsByRadarArc(arcMarker) {
  if (!arcMarker || !arcMarker._radarArc || !arcMarker._radarState) return;
  const arc = arcMarker._radarArc;
  const st = arcMarker._radarState;
  const center = arc.getLatLng();
  const direction = st._direction || 0;
  const sweep = st.sweepAngle || 60;
  const radius = st.radius;

  // iterate markers (threats) on map
  map.eachLayer(layer => {
    if (!(layer instanceof L.Marker)) return;
    if (!(layer._isShahed || layer._isIskander || layer._isKalibr)) return;
    if (!layer._map) return;

    const pos = layer.getLatLng();
    const dist = map.distance(pos, center);
    if (dist > radius) return;

    // compute angle from center to target (deg)
    const dx = pos.lng - center.lng;
    const dy = pos.lat - center.lat;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const rel = (angle - direction + 360) % 360; // relative to radar direction

    if (rel <= sweep) {
      // detected by this radar
      if (!layer._isDetected) {
        layer._isDetected = true;
        updateMarkerVisibility(layer);
        showNotification({
          image: 'images/radar.png',
          title: `Radar @ ${arcMarker._radarState.cityName}: target detected`,
          description: `${layer._data?.model || 'Unknown'} at ${pos.lat.toFixed(2)}, ${pos.lng.toFixed(2)}`,
          duration: 2500
        });
      }
    }
  });
}

// Periodic scan across all radar centers
setInterval(() => {
  radarCenters.forEach(r => detectTargetsByRadarArc(r));
}, 1000); // каждую секунду

// HUD panel for radar (upgrade / show info / engage)
let openRadarPanel = null;
function openRadarHUD(marker) {
  // close existing
  if (openRadarPanel) openRadarPanel.remove();

  const st = marker._radarState;
  const screen = map.latLngToContainerPoint(marker.getLatLng());
  const panel = document.createElement('div');
  panel.className = 'radar-hud';
  panel.style.left = `${screen.x + 16}px`;
  panel.style.top = `${screen.y - 8}px`;
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">${st.cityName} Radar (Lv ${st.level})</div>
    <div style="font-size:13px">Radius: ${Math.round(st.radius)} m</div>
    <div style="font-size:13px">Scan speed: ${Math.round(st.scanSpeed)}°/s</div>
    <div style="font-size:13px;margin-bottom:8px">Next upgrade: ${st.costNextLevel} 💰</div>
    <div style="display:flex;gap:6px">
      <button id="radar-upgrade-btn" class="ui-btn small">Upgrade</button>
      <button id="radar-toggle-range-btn" class="ui-btn small">Toggle Range</button>
      <button id="radar-engage-btn" class="ui-btn small">Engage</button>
    </div>
  `;
  document.body.appendChild(panel);
  openRadarPanel = panel;

  // handlers
  document.getElementById('radar-upgrade-btn').onclick = () => {
    if (window.playerMoney >= st.costNextLevel) {
      window.playerMoney -= st.costNextLevel;
      st.level += 1;
      st.radius = Math.round(st.radius * 1.35);
      st.scanSpeed = Math.min(400, st.scanSpeed * 1.15);
      st.costNextLevel = Math.round(st.costNextLevel * 1.8);
      // update visuals
      marker._radarCircle.setRadius(st.radius);
      marker._radarArc.setRadius(st.radius);
      updateMoneyUI();
      panel.querySelector('div:nth-child(1)');
      panel.querySelector('div:nth-child(2)').textContent = `Radius: ${Math.round(st.radius)} m`;
      panel.querySelector('div:nth-child(3)').textContent = `Scan speed: ${Math.round(st.scanSpeed)}°/s`;
      panel.querySelector('div:nth-child(4)').textContent = `Next upgrade: ${st.costNextLevel} 💰`;
      showNotification({ title: `${st.cityName} Radar upgraded!`, duration: 1800 });
    } else {
      showNotification({ title: 'Not enough funds', description: `Need ${st.costNextLevel} 💰`, duration: 1600 });
    }
  };

  document.getElementById('radar-toggle-range-btn').onclick = () => {
    // toggle the visibility of this radar's circle/arc (independent of global toggle)
    const cur = marker._radarCircle.options.opacity > 0;
    marker._radarCircle.setStyle({ opacity: cur ? 0 : 0.12, fillOpacity: cur ? 0 : 0.12 });
    marker._radarArc.setStyle({ opacity: cur ? 0 : 1 });
  };

  document.getElementById('radar-engage-btn').onclick = () => {
    // find nearest detected target
    let nearest = null;
    const center = marker.getLatLng();
    map.eachLayer(layer => {
      if (!(layer instanceof L.Marker)) return;
      if (!(layer._isDetected && (layer._isShahed || layer._isKalibr || layer._isIskander))) return;
      const dist = map.distance(center, layer.getLatLng());
      if (dist <= marker._radarState.radius) {
        if (!nearest || dist < nearest.dist) nearest = { layer, dist };
      }
    });
    if (nearest) {
      // launch interceptor from radar center
      const from = [center.lat, center.lng];
      const to = [nearest.layer.getLatLng().lat, nearest.layer.getLatLng().lng];
      launchInterceptor(from, to);
      showNotification({ title: `Interceptor launched from ${marker._radarState.cityName}`, duration: 1800 });
    } else {
      showNotification({ title: 'No detected targets in range', duration: 1400 });
    }
  };

  // close panel if click outside
  setTimeout(() => {
    document.addEventListener('mousedown', closeRadarPanelOnClickOutside, { once: true });
  }, 10);
}

function closeRadarPanelOnClickOutside(e) {
  if (!openRadarPanel) return;
  if (!openRadarPanel.contains(e.target)) {
    openRadarPanel.remove();
    openRadarPanel = null;
  }
}

// spawn radars on load (after map and countries loaded)
function spawnAllRadars() {
  RADAR_CITIES.forEach(city => {
    spawnRadarCenter(city, { radius: 25000 + Math.random() * 15000, scanSpeed: 80 + Math.random() * 60, sweepAngle: 60, costNextLevel: 200 });
  });
}

// call once UKR geojson loaded (you already call spawnThreat() after loading geojson).
// If you want to spawn radars immediately after map load, call spawnAllRadars() there.
spawnAllRadars();
updateMoneyUI();
// ----------------------- Radar Centers: End -----------------------

map.on('zoomend', () => {
  const zoom = map.getZoom();
  const scale = Math.max(0.4, Math.min(1, (zoom - 5) / 5)); // от 0.4 до 1
  const size = 24 * scale;
  shahedIcon.options.iconSize = [size, size];
  shahedIcon.options.iconAnchor = [size / 2, size / 2];
});

// === HUD обновление DeltaDrone ===

// Функция, которая синхронизирует нижний HUD с верхними показателями
function updateHud() {
  const pvo = document.getElementById('ui-pvo');
  const money = document.getElementById('ui-money');
  const drones = document.getElementById('ui-drones');

  if (!pvo || !money || !drones) return;

  // Обновляем нижние значения
  const hudPvo = document.getElementById('hud-pvo');
  const hudMoney = document.getElementById('hud-money');
  const hudDrones = document.getElementById('hud-drones');

  if (hudPvo) hudPvo.textContent = pvo.textContent;
  if (hudMoney) hudMoney.textContent = money.textContent;
  if (hudDrones) hudDrones.textContent = drones.textContent;
}

// Запускаем обновление каждые полсекунды
setInterval(updateHud, 500);

// ===== Логика стартового меню =====
document.getElementById('start-btn').addEventListener('click', () => {
  const menu = document.getElementById('start-menu');
  menu.classList.add('hidden'); // плавно скрывает меню

  // если у тебя есть функция initGame() — можно запустить её тут:
  if (typeof initGame === 'function') initGame();

  // или просто активировать спавн целей / карту
  if (typeof startSpawning === 'function') startSpawning();
});
