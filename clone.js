/* jshint esversion: 6 */
'use strict';

var map;
var markers = [];
var guess_coordinates = [];
var true_location = [];
var accumulated_distance = 0;
var current_name = '';
var distance_from_guess = [];
var check_count = 0;

var world_city_set = [
  { lat: 22.5448, lon: 88.3426 },
  { lat: 27.1751, lon: 78.0421 },
  { lat: 40.6892, lon: -74.0445 },
  { lat: 48.8584, lon: 2.2945 },
  { lat: -33.8568, lon: 151.2153 },
   { lat: 22.5448, lon: 88.3426 }, // Victoria Memorial, Kolkata
  { lat: 22.5850, lon: 88.3466 }, // Howrah Bridge, Kolkata
  { lat: 22.5626, lon: 88.3510 }, // Indian Museum, Kolkata
  { lat: 22.6556, lon: 88.3575 }, // Dakshineswar Kali Temple, Kolkata
 // { lat: 22.5395, lon: 88.4072 },  // Science City, Kolkata
  { lat: 22.5756, lon: 88.3642 }, // College Street
  //{ lat: 22.4610, lon: 88.3915 }, // Meghnad Saha Institute of Technology
  { lat: 22.5646, lon: 88.3433 }, // Eden Gardens
 // { lat: 22.5395, lon: 88.4072 },  // Science City
  { lat: 21.8380, lon: 73.7191 }, // Statue of Unity
  { lat: 27.1751, lon: 78.0421 }, // Taj Mahal
  { lat: 18.9220, lon: 72.8347 }, // Gateway of India
  { lat: 28.5245, lon: 77.1855 }, // Qutub Minar
  { lat: 28.6129, lon: 77.2295 }, // India Gate
  { lat: 30.7352, lon: 79.0669 }, // Kedarnath Temple
  { lat: 28.6562, lon: 77.2410 }, // Red Fort
 // { lat: 28.5933, lon: 77.2507 }, // Humayun’s Tomb
  { lat: 20.5519, lon: 75.7033 }, // Ajanta Caves
  { lat: 20.0268, lon: 75.1791 }, // Ellora Caves
  { lat: 12.3052, lon: 76.6551 }, // Mysore Palace
  { lat: 25.3012, lon: 83.0063 }, // Varanasi Ghats
  { lat: 40.4319, lon: 116.5704 }, // Great Wall of China
  { lat: -22.9519, lon: -43.2105 }, // Christ the Redeemer
  { lat: -13.1631, lon: -72.5450 }, // Machu Picchu
  { lat: 41.8902, lon: 12.4922 }, // Colosseum
  { lat: 30.3285, lon: 35.4444 }, // Petra
  { lat: 20.6843, lon: -88.5678 }, // Chichen Itza
  { lat: 29.9792, lon: 31.1342 }, // Great Pyramid of Giza
  { lat: 40.6892, lon: -74.0445 }, // Statue of Liberty
  { lat: 48.8584, lon: 2.2945 }, // Eiffel Tower
  { lat: -33.8568, lon: 151.2153 }  // Sydney Opera Housess
];

var index = -1;
var maxRounds = 5;

shuffleArray(world_city_set);

async function getData(url) {
  return fetch(url)
    .then(response => response.json())
    .catch(error => console.log(error));
}

async function initialize() {

  check_count = 0;
  disableButton('check');
  disableButton('next');

  document.getElementById("location").innerHTML = '';
  document.getElementById("distance").innerHTML = '';

  if (accumulated_distance === 0) {
    document.getElementById("totaldistance").innerHTML = 'Round Score: 0 Miles';
  }

  var locationData = randomLoc();
  if (!locationData) return;

  var number = await getData(
    `https://api.openweathermap.org/data/2.5/weather?lat=${locationData.lat}&lon=${locationData.lon}&APPID=2e35570eab59959f85e835dabdddc726`
  );

  true_location = [number.coord.lat, number.coord.lon];
  current_name = number.name + ", " + number.sys.country;

  var luther = { lat: 20, lng: 0 };

  // IMPORTANT: removed "var"
  map = new google.maps.Map(document.getElementById('map'), {
    center: luther,
    zoom: 2,
    streetViewControl: false,
  });

  google.maps.event.addListener(map, 'click', function (event) {
    placeMarker(event.latLng);
    if (check_count === 0) {
      enableButton('check');
      check_count++;
    }
  });

  var panorama = new google.maps.StreetViewPanorama(
    document.getElementById('pano'), {
      position: { lat: number.coord.lat, lng: number.coord.lon },
      pov: { heading: 34, pitch: 10 },
      addressControl: false
    }
  );

  map.setStreetView(panorama);
}

function placeMarker(location) {
  deleteMarkers();
  guess_coordinates = [];

  var marker = new google.maps.Marker({
    position: location,
    map: map,
  });

  markers.push(marker);
  guess_coordinates.push(marker.getPosition().lat(), marker.getPosition().lng());
}

function deleteMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function check() {

  enableButton('next');

  var guess_error = distance(
    guess_coordinates[0],
    guess_coordinates[1],
    true_location[0],
    true_location[1],
    'K'
  );

  accumulated_distance += parseFloat(guess_error);
  distance_from_guess = guess_error;

  var true_coords = { lat: true_location[0], lng: true_location[1] };
  var guess_coords = { lat: guess_coordinates[0], lng: guess_coordinates[1] };

  new google.maps.Marker({
    position: true_coords,
    map: map,
    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
  });

  new google.maps.Marker({
    position: guess_coords,
    map: map,
    icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
  });

  new google.maps.Polyline({
    path: [true_coords, guess_coords],
    geodesic: true,
    strokeColor: "#ffffff",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    map: map
  });

  var bounds = new google.maps.LatLngBounds();
  bounds.extend(true_coords);
  bounds.extend(guess_coords);
  map.fitBounds(bounds);

  display_location();
  disableButton('check');
}

function distance(lat1, lon1, lat2, lon2, unit) {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  var radlat1 = Math.PI * lat1 / 180;
  var radlat2 = Math.PI * lat2 / 180;
  var theta = lon1 - lon2;
  var radtheta = Math.PI * theta / 180;

  var dist = Math.sin(radlat1) * Math.sin(radlat2) +
             Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

  dist = Math.min(1, dist);
  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515;

  if (unit === "K") dist *= 1.609344;

  return (dist / 1.609).toFixed(1);
}

function randomLoc() {

  index++;

  if (index >= maxRounds) {
    swal({
      title: "Game Over!",
      icon: "success",
      text: "Your total guess error: " +
        accumulated_distance.toFixed(1) + " Miles!"
    });

    accumulated_distance = 0;
    index = -1;
    shuffleArray(world_city_set);

    document.getElementById("totaldistance").innerHTML =
      'Round Score: 0 Miles';

    document.getElementById('round').innerHTML =
      "Round: 0/" + maxRounds;

    document.getElementById("next").innerHTML = "Play Again";

    return null;
  }

  document.getElementById("next").innerHTML =
    index === maxRounds - 1 ? "Finish Round" : "Next Location";

  document.getElementById('round').innerHTML =
    "Round: " + (index + 1) + "/" + maxRounds;

  return world_city_set[index % world_city_set.length];
}

function display_location() {
  document.getElementById("location").innerHTML =
    "Correct Location: " + current_name;

  document.getElementById("distance").innerHTML =
    "Your Guess was " + distance_from_guess + " Miles away";

  document.getElementById("totaldistance").innerHTML =
    "Round Score: " + accumulated_distance.toFixed(1) + " Miles";
}

function disableButton(id) {
  document.getElementById(id).disabled = true;
}

function enableButton(id) {
  document.getElementById(id).disabled = false;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}