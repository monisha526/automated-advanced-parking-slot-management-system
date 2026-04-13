const ratePerSlot = 100;
let parkingLots = [
  {name: "City Center Parking", location: "Downtown", slots: 5, lat: 40.7128, lng: -74.0060},
  {name: "Airport Parking", location: "Airport Road", slots: 8, lat: 40.6413, lng: -73.7781},
  {name: "Mall Parking", location: "Beach Street", slots: 3, lat: 40.7589, lng: -73.9851}
];
let selectedLotIndex = null;
let currentUser = null;
let map;
let userLocation = null;
let directionsService;
let directionsRenderer;

function updatePrice() {
  const duration = parseInt(document.getElementById("duration").value);
  const basePrices = {1: 100, 2: 200, 3: 400};
  const basePrice = basePrices[duration] || 100;
  const gst = 50;
  const totalBase = basePrice * selectedSlots.length;
  const total = totalBase + gst;
  document.getElementById("totalBasePrice").textContent = totalBase;
  // Store for payment
  localStorage.setItem('totalAmount', total);
  localStorage.setItem('duration', duration);
}

function getSlotPrice(distance) {
  let price = 100; // Base price
  if (distance < 20) {
    price += 100;
  } else {
    price += 200; // Assuming for >20km add 200, as per common logic
  }
  return price;
}

function showDirections() {
  if (!userLocation || selectedLotIndex === null) {
    showNotification("Please select a parking lot and set your location.");
    return;
  }
  const lot = parkingLots[selectedLotIndex];
  const request = {
    origin: userLocation,
    destination: {lat: lot.lat, lng: lot.lng},
    travelMode: 'DRIVING'
  };
  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      const route = result.routes[0];
      const duration = route.legs[0].duration.text;
      const distance = route.legs[0].distance.text;
      showNotification(`ETA: ${duration}, Distance: ${distance}`);
    } else {
      showNotification("Directions request failed.");
    }
  });
}

function updatePaymentFields() {
  const gateway = document.getElementById("paymentGateway").value;
  const fieldsDiv = document.getElementById("paymentFields");
  let fields = `
    <label for="payerName">Name on payment:</label><br>
    <input type="text" id="payerName" placeholder="Your name"><br>
    <label for="payerEmail">Email:</label><br>
    <input type="email" id="payerEmail" placeholder="you@example.com"><br>
  `;
  if (gateway === 'netbanking') {
    fields += `
      <label for="bankName">Bank Name:</label><br>
      <input type="text" id="bankName" placeholder="Your bank"><br>
      <label for="accountNumber">Account Number:</label><br>
      <input type="text" id="accountNumber" placeholder="Account number"><br>
    `;
  } else if (['razorpay', 'paytm', 'gpay', 'phonepe'].includes(gateway)) {
    fields += `
      <label for="upiId">UPI ID:</label><br>
      <input type="text" id="upiId" placeholder="yourname@upi"><br>
    `;
  } else {
    fields += `
      <label for="cardNumber">Card number:</label><br>
      <input type="text" id="cardNumber" placeholder="0000 0000 0000 0000"><br>
    `;
  }
  fieldsDiv.innerHTML = fields;
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 40.7128, lng: -74.0060},
    zoom: 12
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
  updateMapMarkers();
}

function updateMapMarkers() {
  if (!map) return;
  parkingLots.forEach((lot, index) => {
    const marker = new google.maps.Marker({
      position: {lat: lot.lat, lng: lot.lng},
      map: map,
      title: lot.name
    });
    marker.addListener('click', () => {
      selectedLotIndex = index;
      showNotification(`Selected: ${lot.name}`);
    });
  });
}

let userMarker;

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      if (userMarker) {
        userMarker.setMap(null);
      }
      userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'Your Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      });
      map.setCenter(userLocation);
      map.setZoom(15);
      showNotification("Map centered on your location.");
      updatePrices();
    }, () => {
      showNotification("Geolocation failed.");
    });
  } else {
    showNotification("Geolocation not supported.");
  }
}

function renderParkingLots(filterText = "") {
  const list = document.getElementById("parkingList");
  if (!list) return;

  const normalizedFilter = filterText.trim().toLowerCase();
  const visibleLots = parkingLots.filter(lot =>
    !normalizedFilter || lot.location.toLowerCase().includes(normalizedFilter) || lot.name.toLowerCase().includes(normalizedFilter)
  );

  list.innerHTML = visibleLots.length ? "" : "<p>No parking lots found.</p>";

  visibleLots.forEach((lot, index) => {
    const originalIndex = parkingLots.indexOf(lot);
    const price = lot.price || 100;
    const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, lot.lat, lot.lng).toFixed(1) : 'N/A';
    list.innerHTML += `
      <div class="parking-lot">
        <h3>${lot.name}</h3>
        <p>Location: ${lot.location}</p>
        <p>Distance: ${distance} km</p>
        <p>Price per slot: ₹${price}</p>
        <p>Slots Available: <span class="available">${lot.slots}</span></p>
        <div class="button-group">
          <button class="book-btn" ${lot.slots === 0 ? "disabled" : ""} onclick="openBooking(${originalIndex})">Select Slot</button>
        </div>
      </div>
    `;
  });
}

function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (username && password) {
    currentUser = {username};
    document.getElementById("userStatus").textContent = `Logged in as ${username}`;
    showNotification("Login successful!");
  } else {
    showNotification("Please enter username and password.");
  }
}

function signupUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (username && password) {
    currentUser = {username};
    document.getElementById("userStatus").textContent = `Logged in as ${username}`;
    showNotification("Signup successful!");
  } else {
    showNotification("Please enter username and password.");
  }
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  if (notification) {
    notification.textContent = message;
    notification.classList.remove("hidden");
    setTimeout(() => notification.classList.add("hidden"), 3000);
  }
}

function resetSearch() {
  document.getElementById("searchInput").value = "";
  renderParkingLots();
}

function openBooking(index) {
  localStorage.setItem('selectedLotIndex', index);
  window.location.href = 'booking.html';
}

function preparePayment() {
  const selectedDate = document.getElementById("bookingDate").value;
  if (!selectedDate) {
    alert("Please choose a booking date and time.");
    return;
  }
  if (selectedSlots.length === 0) {
    alert("Please select at least one slot.");
    return;
  }
  updatePrice(); // Ensure price is updated
  localStorage.setItem('selectedSlots', JSON.stringify(selectedSlots));
  localStorage.setItem('bookingDate', selectedDate);
  window.location.href = 'payment.html';
}

function payOnline() {
  const payerName = document.getElementById("payerName").value.trim();
  const payerEmail = document.getElementById("payerEmail").value.trim();
  const gateway = document.getElementById("paymentGateway").value;

  if (!payerName || !payerEmail) {
    alert("Please fill in name and email.");
    return;
  }

  let paymentDetail = "";
  if (gateway === 'netbanking') {
    const bankName = document.getElementById("bankName").value.trim();
    const accountNumber = document.getElementById("accountNumber").value.trim();
    if (!bankName || !accountNumber) {
      alert("Please fill in bank details.");
      return;
    }
    paymentDetail = `Bank: ${bankName}, Account: ${accountNumber}`;
  } else if (['razorpay', 'paytm', 'gpay', 'phonepe'].includes(gateway)) {
    const upiId = document.getElementById("upiId").value.trim();
    if (!upiId) {
      alert("Please enter UPI ID.");
      return;
    }
    paymentDetail = `UPI: ${upiId}`;
  } else {
    const cardNumber = document.getElementById("cardNumber").value.trim();
    if (!cardNumber || cardNumber.replace(/\s+/g, "").length < 12) {
      alert("Please enter a valid card number.");
      return;
    }
    paymentDetail = `Card: **** **** **** ${cardNumber.slice(-4)}`;
  }

  // Simulate payment
  alert(`Processing payment via ${gateway}...`);
  setTimeout(() => {
    const lotIndex = parseInt(localStorage.getItem('selectedLotIndex'), 10);
    const slots = JSON.parse(localStorage.getItem('selectedSlots'));
    const bookingDate = localStorage.getItem('bookingDate');
    const duration = localStorage.getItem('duration');
    const amount = parseInt(localStorage.getItem('totalAmount'), 10);

    parkingLots[lotIndex].slots -= slots.length;
    localStorage.setItem('parkingLots', JSON.stringify(parkingLots));
    const booking = {lot: parkingLots[lotIndex].name, slots: slots.length, date: bookingDate, duration: duration + ' hours', amount, name: payerName, payment: gateway};
    localStorage.setItem('confirmation', JSON.stringify(booking));
    // Add to history
    const history = JSON.parse(localStorage.getItem('bookingHistory')) || [];
    history.push(booking);
    localStorage.setItem('bookingHistory', JSON.stringify(history));
    window.location.href = 'confirmation.html';
  }, 2000);
}

function goBack() {
  window.history.back();
}

function renderSlotGrid(totalSlots, bookedSlots = []) {
  const grid = document.getElementById('slotGrid');
  if (!grid) return;
  grid.innerHTML = '';
  selectedSlots = [];
  for (let i = 1; i <= totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = i;
    if (bookedSlots.includes(i)) {
      slot.classList.add('booked');
    } else {
      slot.classList.add('available');
      slot.onclick = () => toggleSlotSelection(i, slot);
    }
    grid.appendChild(slot);
  }
  updateSelectedCount();
}

function toggleSlotSelection(slotNumber, element) {
  if (selectedSlots.includes(slotNumber)) {
    selectedSlots = selectedSlots.filter(s => s !== slotNumber);
    element.classList.remove('selected');
    element.classList.add('available');
  } else {
    selectedSlots.push(slotNumber);
    element.classList.remove('available');
    element.classList.add('selected');
  }
  updateSelectedCount();
}

function renderBookingHistory() {
  const historyEl = document.getElementById('bookingHistory');
  if (!historyEl) return;
  const history = JSON.parse(localStorage.getItem('bookingHistory')) || [];
  historyEl.innerHTML = history.length ? '' : '<p>No bookings yet.</p>';
  history.forEach((booking, index) => {
    historyEl.innerHTML += `
      <div class="booking-item">
        <p><strong>Lot:</strong> ${booking.lot}</p>
        <p><strong>Slots:</strong> ${booking.slots}</p>
        <p><strong>Duration:</strong> ${booking.duration || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date(booking.date).toLocaleString()}</p>
        <p><strong>Amount:</strong> ₹${booking.amount}</p>
        <button onclick="cancelBooking(${index})">Cancel</button>
      </div>
    `;
  });
}

function cancelBooking(index) {
  const history = JSON.parse(localStorage.getItem('bookingHistory')) || [];
  const booking = history.splice(index, 1)[0];
  localStorage.setItem('bookingHistory', JSON.stringify(history));
  // Refund slots
  const lotIndex = parkingLots.findIndex(l => l.name === booking.lot);
  if (lotIndex >= 0) {
    parkingLots[lotIndex].slots += booking.slots;
    localStorage.setItem('parkingLots', JSON.stringify(parkingLots));
  }
  renderBookingHistory();
  alert('Booking cancelled.');
}

function hashString(text) {
  return Array.from(text).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function drawConfirmationQRCode(text) {
  const canvas = document.getElementById("qrCanvas");
  const ctx = canvas.getContext("2d");
  const size = 20;
  const gridSize = 10;
  const seed = hashString(text);
  let value = seed;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function nextBit() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value & 1;
  }

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      ctx.fillStyle = nextBit() ? "#000000" : "#ffffff";
      ctx.fillRect(col * size + 10, row * size + 10, size - 2, size - 2);
    }
  }

  ctx.fillStyle = "#000000";
  ctx.font = "14px Arial";
  ctx.fillText("QR CONFIRM", 20, canvas.height - 10);
}

window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    currentUser = user;
    if (document.getElementById('userName')) {
      document.getElementById('userName').textContent = user.username;
    }
  }

  // Load parking lots from localStorage if available
  const storedLots = JSON.parse(localStorage.getItem('parkingLots'));
  if (storedLots) {
    parkingLots = storedLots;
  } else {
    // Set default prices
    parkingLots.forEach(lot => lot.price = 100);
  }

  if (document.getElementById('parkingList')) {
    renderParkingLots();
    // Simulate real-time updates
    setInterval(() => {
      // Randomly change availability for demo
      parkingLots.forEach(lot => {
        if (Math.random() < 0.1) { // 10% chance
          lot.slots = Math.max(0, lot.slots + (Math.random() > 0.5 ? 1 : -1));
        }
      });
      renderParkingLots(document.getElementById("searchInput")?.value || "");
    }, 10000); // Update every 10 seconds
  }

  if (document.getElementById('selectedLotName')) {
    const index = parseInt(localStorage.getItem('selectedLotIndex'), 10);
    const lot = parkingLots[index];
    document.getElementById("selectedLotName").textContent = lot.name;
    document.getElementById("selectedLotLocation").textContent = lot.location;
    document.getElementById("selectedLotPrice").textContent = lot.price || 100;
    document.getElementById("selectedLotSlots").textContent = lot.slots;
    // Assume some slots are booked, for demo
    const booked = lot.slots < 5 ? [1, 2] : []; // Example
    renderSlotGrid(10, booked); // Assume 10 total slots per lot
  }

  if (document.getElementById('paymentLotName')) {
    const index = parseInt(localStorage.getItem('selectedLotIndex'), 10);
    const lot = parkingLots[index];
    const amount = parseInt(localStorage.getItem('totalAmount'), 10) || 0;
    document.getElementById("paymentLotName").textContent = lot.name;
    document.getElementById("paymentAmount").textContent = amount;
  }

  if (document.getElementById('confirmationText')) {
    const conf = JSON.parse(localStorage.getItem('confirmation'));
    const confirmation = `Booking confirmed for ${conf.slots} ${conf.slots === 1 ? "slot" : "slots"} at ${conf.lot} on ${new Date(conf.date).toLocaleString()} for ${conf.duration}. Amount paid: ₹${conf.amount}.`;
    document.getElementById("confirmationText").textContent = confirmation;
    drawConfirmationQRCode(`lot=${conf.lot}|slots=${conf.slots}|date=${conf.date}|amount=${conf.amount}|name=${conf.name}`);
  }

  if (document.getElementById('bookingHistory')) {
    renderBookingHistory();
  }

  if (typeof google !== 'undefined' && document.getElementById('map')) {
    initMap();
  }
});
