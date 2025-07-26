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

// === Drone Flight Function ===
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
    const maneuverStrength = 0.07; // Increase for more visible maneuvering
    let maneuverAngle = 0;
    activeDrones.push(marker);

    function move() {
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;
        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.01) {
            marker.setLatLng(to);
            marker.bindPopup("💥 Explosion!");
            setTimeout(() => {
                map.removeLayer(marker);
                map.removeLayer(targetMarker);
            }, 1500);
            return;
        }

        let angle = Math.atan2(dLng, dLat);

        // Add maneuvering: random smooth change to angle
        maneuverAngle += (Math.random() - 0.5) * maneuverStrength;
        angle += maneuverAngle;

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