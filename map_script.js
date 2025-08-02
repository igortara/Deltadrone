// Инициализация карты
// Центр карты может быть примерно между Харьковом и Днепром
// Текущее местоположение (Днепр): 48.4647° N, 35.0462° E
// Харьков: 49.9935° N, 36.2304° E
var map = L.map('mapid').setView([49.2, 35.6], 7); // [широта, долгота], зум

// Добавление базовой подложки (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Определения городов и их координат (примерные)
var cities = {
    kharkiv: {
        latlng: [49.9935, 36.2304], // Харьков
        name: 'Харьков'
    },
    dnipro: {
        latlng: [48.4647, 35.0462], // Днепр
        name: 'Днепр'
    }
};

// Функции для рисования кругов с определенным стилем
function drawCircle(latlng, radiusKm, options) {
    // Leaflet.js принимает радиус в метрах
    return L.circle(latlng, {radius: radiusKm * 1000, ...options}).addTo(map);
}

// Стили для зон
var redZoneStyle = {
    color: 'red',
    fillColor: 'red',
    fillOpacity: 0.3,
    weight: 2
};

var blueZoneStyle = {
    color: 'blue',
    fillColor: 'purple', // Или другой цвет для большей зоны, как на вашем изображении
    fillOpacity: 0.2,
    weight: 2,
    dashArray: '5, 10' // Пунктирная линия
};

var yellowZoneStyle = {
    color: 'orange',
    fillColor: 'yellow',
    fillOpacity: 0.5,
    weight: 2
};

// Рисование зон для Харькова
// Малая зона (красная)
drawCircle(cities.kharkiv.latlng, 50, redZoneStyle) // Пример: 50 км
    .bindTooltip(cities.kharkiv.name + '<br> Зона 1');

// Большая зона (фиолетовая/синяя)
drawCircle(cities.kharkiv.latlng, 150, blueZoneStyle) // Пример: 150 км
    .bindTooltip(cities.kharkiv.name + '<br> Зона 2');


// Рисование зон для Днепра
// Малая зона (красная)
drawCircle(cities.dnipro.latlng, 40, redZoneStyle) // Пример: 40 км
    .bindTooltip(cities.dnipro.name + '<br> Зона 1');

// Большая зона (фиолетовая/синяя)
drawCircle(cities.dnipro.latlng, 120, blueZoneStyle) // Пример: 120 км
    .bindTooltip(cities.dnipro.name + '<br> Зона 2');

// Дополнительная желтая зона вокруг Днепра (как на вашем изображении)
drawCircle(cities.dnipro.latlng, 20, yellowZoneStyle) // Пример: 20 км
    .bindTooltip(cities.dnipro.name + '<br> Доп. зона');


// Добавление маркеров с названиями городов
L.marker(cities.kharkiv.latlng).addTo(map)
    .bindTooltip(cities.kharkiv.name, {permanent: true, direction: 'center', className: 'city-label'}).openTooltip();

L.marker(cities.dnipro.latlng).addTo(map)
    .bindTooltip(cities.dnipro.name, {permanent: true, direction: 'center', className: 'city-label'}).openTooltip();

// Добавление CSS для меток городов (для более читаемого вида)
// Это можно добавить прямо в <style> в HTML или в отдельный CSS-файл
var style = document.createElement('style');
style.innerHTML = `
    .city-label {
        font-weight: bold;
        font-size: 16px;
        color: black;
        text-shadow: 1px 1px 2px white;
        background-color: transparent;
        border: none;
        box-shadow: none;
    }
    .leaflet-tooltip-bottom:before {
        border-bottom-color: transparent !important;
    }
    .leaflet-tooltip-top:before {
        border-top-color: transparent !important;
    }
    .leaflet-tooltip-left:before {
        border-left-color: transparent !important;
    }
    .leaflet-tooltip-right:before {
        border-right-color: transparent !important;
    }
`;
document.head.appendChild(style);