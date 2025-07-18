// === Map Initialization ===
const mymap = L.map('mapid').setView([49, 32], 6); // Center of Ukraine, zoom for the whole country
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mymap);

// Add MapTiler satellite layer
const maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=xpum0XQiGdzHO7iEg7wl';
L.tileLayer(maptilerSatelliteUrl, {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    maxZoom: 19
}).addTo(mymap);

// === Starting Points - Kursk and Orel ===
const kursk = [51.7306, 36.1939];
const orel = [52.8915, 35.8594];

// === Variable to store Ukraine's GeoJSON ===
let ukraineGeoJson = null;

// === Function to get a random point within Ukraine's borders ===
async function getRandomUkrainePoint() {
    if (!ukraineGeoJson) {
        console.warn("Ukraine's GeoJSON not loaded yet. Trying to get point later.");
        return null;
    }

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
        console.error(`Failed to generate a point within Ukraine after ${maxAttempts} attempts.`);
        return null;
    }
}

// === Drone Flight Function ===
function flyDrone(from, to) {
    const droneIcon = L.divIcon({
        className: "drone-icon",
        html: `<img src="images/geran.png" width="32" height="32" />`,
        iconSize: [16, 16],  
        iconAnchor: [8, 8] 
    });

const marker = L.marker(from, { icon: droneIcon }).addTo(mymap);
    const targetMarker = L.marker(to).addTo(mymap); 

    const speed = 0.0010;
    const maneuverStrength = 0.1; 

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
                mymap.removeLayer(marker);
                mymap.removeLayer(targetMarker); 
            }, 1500);
            return;
        }

        let normLat = dLat / dist;
        let normLng = dLng / dist;


        const randomLatDeviation = (Math.random() - 0.5) * maneuverStrength; // От -0.5*strength до +0.5*strength
        const randomLngDeviation = (Math.random() - 0.5) * maneuverStrength;

        normLat += randomLatDeviation;
        normLng += randomLngDeviation;

  
        const newDist = Math.sqrt(normLat * normLat + normLng * normLng);
        normLat /= newDist;
        normLng /= newDist;
        // --- Конец маневров ---

        marker.setLatLng([lat + normLat * speed, lng + normLng * speed]);

        const angleRad = Math.atan2(dLng, dLat); 
        const angleDeg = angleRad * (180 / Math.PI);
        const img = marker.getElement()?.querySelector('img');
        if (img) img.style.transform = `rotate(${angleDeg}deg)`;

        requestAnimationFrame(move);
    }

    move();
}

// === Shahed Spawn Function ===
async function spawnShahed() { 
    const target = await getRandomUkrainePoint(); 
    if (!target) {
        console.error("Failed to generate target in Ukraine. Skipping Shahed spawn.");
        return;
    }

    let startPosition; 
    let rand = Math.floor(Math.random() * 2);

    if (rand === 0) {
        startPosition = kursk;
        console.log(`Shahed launched from Kursk to [${target[0].toFixed(4)}, ${target[1].toFixed(4)}]`);
    } else {
        startPosition = orel;
        console.log(`Shahed launched from Orel to [${target[0].toFixed(4)}, ${target[1].toFixed(4)}]`);
    }
    
    flyDrone(startPosition, target);
}


fetch('https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
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

            if (foundUkraine) {
                ukraineGeoJson = foundUkraine;
                 
            }

        } else if (data.type === "Feature" || data.type === "MultiPolygon" || data.type === "Polygon") {
            ukraineGeoJson = data;
        } 

        if (ukraineGeoJson) {
            L.geoJSON(ukraineGeoJson, {
                style: {
                    color: '#007bff0e', // Blue border
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.0090,
                    fillColor: '#007bff'
                }
            }).addTo(mymap);
            console.log('Ukraine GeoJSON successfully added to map.');
            
            spawnShahed(); // Запуск Шахедаf
            setInterval(spawnShahed, 10000); // Запускать каждые 10 секунд
        } else {
            console.error('Ukraine GeoJSON could not be processed or found.');
        }
    })
    .catch(error => {
        console.error('Error loading or processing GeoJSON:', error);
    });