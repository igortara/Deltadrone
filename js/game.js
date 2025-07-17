var mymap = L.map('mapid').setView([50.4501, 30.5234], 13);
function initMap() {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mymap);
}
function addMarker(pos, tit, desc) {
    L.marker(pos).addTo(mymap)
        .bindPopup(`<b>${tit}</b><br>${desc}`); 
}

initMap()


addMarker([51.09775, 29.59541], "Ціль", "g")
addMarker([51.252, 36.947], "Ціль", "test" )