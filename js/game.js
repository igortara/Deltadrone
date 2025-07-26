// === Map Initialization ===
const spawnInterval = Math.random() * 10000 + 3000;
const map = L.map('mapid').setView([49, 32], 6);
const activeDrones = [];
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=xpum0XQiGdzHO7iEg7wl';
L.tileLayer(maptilerSatelliteUrl, {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    maxZoom: 19
}).addTo(map);

// === Starting Points - Kursk and Orel ===
const launchPoints = [
    { name: "Kursk", coords: [51.7306, 36.1939] },
    { name: "Orel", coords: [52.8915, 35.8594] },
    { name: "Navlya", coords: [52.81163, 34.50643] },
    { name: "Chatalovo", coords: [54.3103, 32.4962] },
    { name: "Gvardeyskoe", coords: [45.11678, 33.97634] },
    { name: "Chauda", coords: [45.00529, 35.84238] },
    { name: "Millerovo", coords: [48.8000, 39.5000] }
];

// === Variable to store Ukraine's GeoJSON ===
let ukraineGeoJson = null;

// === Function to get a random point within Ukraine's borders ===
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

let dronesEnteredUkraine = 0;
function tryShootDownDrone(droneMarker, ppoCircle) {
    if (!droneMarker._ppoTargeting) {
        droneMarker._ppoTargeting = true;
        setTimeout(() => {
            const dronePos = droneMarker.getLatLng();
            const ppoPos = ppoCircle.getLatLng();
            const dist = map.distance(dronePos, ppoPos);
            if (dist <= ppoCircle.getRadius()) {
                // 40% шанс сбить
                if (Math.random() < 0.4) {
                    showNotification({
                        image: 'images/Pvo/mobile-group.png',
                        title: 'Shahed shot down!',
                        description: 'Air defense successfully intercepted the drone.',
                        duration: 2500
                    });
                    map.removeLayer(droneMarker);
                } else {
                    // Не сбили, пробуем снова через 1 сек
                    droneMarker._ppoTargeting = false;
                    tryShootDownDrone(droneMarker, ppoCircle);
                }
            } else {
                droneMarker._ppoTargeting = false;
            }
        }, 1200); // время наводки
    }
}
function getDronesEnteredUkraine() {
    return dronesEnteredUkraine;
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

    const speed = 0.0010;
    const maneuverStrength = 0.06;
    let maneuverAngle = 0;
    let enteredUkraine = false;
    let finished = false;
    activeDrones.push(marker);

    function move() {
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        map.eachLayer(layer => {
        if (layer instanceof L.Circle && layer.options.color === '#ff0000ab') {
            tryShootDownDrone(marker, layer);
        }
        });
        const isInUkraine = turf.booleanPointInPolygon(turf.point([lng, lat]), ukraineGeoJson);

        // Check if drone entered Ukraine
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

        // Stop drone if it tries to leave Ukraine after entering
        if (enteredUkraine && !isInUkraine) {
            marker.bindPopup("🛑 Drone stopped at border!");
            setTimeout(() => {
                map.removeLayer(marker);
                map.removeLayer(targetMarker);
            }, 1500);
            return;
        }

        // When drone reaches the target, decrease the counter
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

        // Maneuver only inside Ukraine
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

// === Shahed Spawn Function ===
async function spawnShahed() {
    const target = await getRandomPointInUkraine();
    if (!target) return;

    const index = Math.floor(Math.random() * launchPoints.length);
    const start = launchPoints[index];
    console.log(`Shahed launched from ${start.name} to point [${target[0].toFixed(4)}, ${target[1].toFixed(4)}]`);

    launchDrone(start.coords, target);
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
            spawnShahed();
            setInterval(spawnShahed, spawnInterval);
            console.log(`Shahed will be launched every ${spawnInterval.toFixed(0)} milliseconds.`);
        }
    })
    .catch(error => {
        console.error('Error loading or processing GeoJSON:', error);
    });

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

function spawnPPO(Cordinate){
    const simpleppoIcon = L.divIcon({
        className: "ppo-icon",
        html: `<img src="images/Pvo/mobile-group.png" width="32" height="32" alt="Mobile air defense group vehicle positioned for deployment on a map, surrounded by a digital mapping interface. No visible text. Neutral and functional tone." />`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    const marker = L.marker(Cordinate, { icon: simpleppoIcon }).addTo(map); 
    const circle = L.circle(Cordinate, {
        color: '#ff0000ab',
        fillColor: '#ff000004',
        fillOpacity: 0.001,

        radius: 2500
    }).addTo(map);
    marker.bindPopup("PPO deployed!").openPopup();
}


// Example usage of spawnPPO function
spawnPPO([49.0, 32.0]);
// Example usage of showNotification function
//showNotification({
//    image: 'images/geran.png',
//    title: 'Shahed entered Ukraine',
//     description: 'A drone has crossed the border.',
//     duration: 3000
// });