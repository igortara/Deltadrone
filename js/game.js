// === Инициализация карты ===
const mymap = L.map('mapid').setView([49, 32], 6); // Центр Украины
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mymap);

function initMap() {
    // This is the URL for MapTiler Satellite-v2.
    // **IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your actual MapTiler API key!**
    var maptilerSatelliteUrl = 'https://api.maptiler.com/maps/streets-v2-dark/?key=KblwSJyQeoJq77gnaqQx#1.0/0.00000/0.00000';

    L.tileLayer(maptilerSatelliteUrl, {
        // Attribution is crucial for compliance with MapTiler's terms of use.
        // This typically includes MapTiler and OpenStreetMap contributors.
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
        maxZoom: 19 // satellite-v2 usually supports up to zoom 19
        
    }).addTo(mymap);
    console.log("Map initialized with MapTiler Satellite-v2.");
}

initMap();

// === Точка старта — Курск ===
const kursk = [51.7306, 36.1939];
const orel = [52.8915, 35.8594];

// === Запасные границы Украины (упрощенно) ===
const ukraineBounds = {
    minLat: 44.38,
    maxLat: 52.38,
    minLng: 22.14,
    maxLng: 40.23
};

// === Случайная точка в пределах запасных границ Украины ===
function getRandomUkrainePoint() {
    const lat = ukraineBounds.minLat + Math.random() * (ukraineBounds.maxLat - ukraineBounds.minLat);
    const lng = ukraineBounds.minLng + Math.random() * (ukraineBounds.maxLng - ukraineBounds.minLng);
    return [lat, lng];
}

// === Функция запуска БПЛА ===
function flyDrone(from, to) {
    const droneIcon = L.divIcon({
        className: "drone-icon",
        html: `<img src="images/geran.png" width="32" height="32" />`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const marker = L.marker(from, { icon: droneIcon }).addTo(mymap);
    
    // Отображаем цель на карте
    const targetMarker = L.marker(to).addTo(mymap).bindPopup("🎯 Ціль").openPopup();

    const speed = 0.0010; // шаг движения

    function move() {
        const lat = marker.getLatLng().lat;
        const lng = marker.getLatLng().lng;

        const dLat = to[0] - lat;
        const dLng = to[1] - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.01) {
            marker.setLatLng(to);
            marker.bindPopup("💥 Вибух!").openPopup();
            
            // Удаляем маркер дрона и маркер цели после взрыва
            setTimeout(() => {
                mymap.removeLayer(marker);
                mymap.removeLayer(targetMarker); // Удаляем маркер цели
            }, 1500);
            return;
        }

        const normLat = dLat / dist;
        const normLng = dLng / dist;

        marker.setLatLng([lat + normLat * speed, lng + normLng * speed]);

        // Поворот по направлению
        const angleRad = Math.atan2(dLng, dLat);
        const angleDeg = angleRad * (180 / Math.PI);
        const img = marker.getElement()?.querySelector('img');
        if (img) img.style.transform = `rotate(${angleDeg}deg)`;

        requestAnimationFrame(move);
    }

    move();
}

// === Функция для спавна Шахеда ===
function spawnShahed() {
    const target = getRandomUkrainePoint();
    let posi; // Оголошуємо posi як let, бо її значення буде змінюватися

    // Генеруємо випадкове число 0 або 1
    // Math.random() повертає число від 0 (включно) до 1 (не включно)
    // Math.floor(Math.random() * 2) дасть 0 або 1
    let rand = Math.floor(Math.random() * 2);

    if (rand === 0) { // Використовуємо === для порівняння
        posi = kursk;
        console.log(`Запущен Шахед из Курска в [${target[0].toFixed(4)}, ${target[1].toFixed(4)}]`);
    } else { // Якщо rand не 0, то це 1
        posi = orel;
        console.log(`Запущен Шахед из Орла в [${target[0].toFixed(4)}, ${target[1].toFixed(4)}]`);
    }
    
    flyDrone(posi, target);
}


spawnShahed();
setInterval(spawnShahed, 10000); // Запускать новый дрон каждые 10 секунд (10000 миллисекунд)