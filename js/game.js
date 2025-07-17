var mymap = L.map('mapid').setView([50.4501, 30.5234], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mymap);

L.marker([50.4501, 30.5234]).addTo(mymap)
    .bindPopup("<b>Ціль</b><br>Тест").openPopup();