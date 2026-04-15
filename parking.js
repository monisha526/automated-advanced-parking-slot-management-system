const firebaseConfig = {
  apiKey: "AIzaSyDfJfJfJfJfJfJfJfJfJfJfJfJfJfJfJfJf",
  projectId: "groundstation-494",
  authDomain: "groundstation-494.firebaseapp.com",
  storageBucket: "groundstation-494.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:groundstation-494"
};

// Debug logging
console.log("🚗 Parking.js loaded - Version with GPS Tracking");

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();  // ← ADD THIS LINE
const auth = firebase.auth();      // ← ADD THIS LINE

// Declare missing variables
let selectedSlots = [];
let userMarker = null;

// Map and Navigation variables
let map = null;
let userLocation = null;
let selectedLotIndex = null;
let directionsService = null;
let directionsRenderer = null;
let currentUser = null;

// ============ GPS TRACKING SYSTEM ============
// GPS Configuration
const gpsConfig = {
  trackingInterval: 5000, // Update every 5 seconds
  highAccuracyMode: true,
  geofenceRadius: 100, // 100 meters for arrival detection
  maxSpeedThreshold: 150, // km/h - for anomaly detection
  accuracyThreshold: 50 // meters
};

// GPS tracking variables
let gpsEnabled = false;
let currentSpeed = 0;
let currentHeading = 0;
let gpsAccuracy = 0;
let locationHistory = [];
let gpsWatchId = null;
let lastPosition = null;
let movementTracker = {
  totalDistance: 0,
  maxSpeed: 0,
  avgSpeed: 0,
  startTime: null,
  path: []
};
let headingMarker = null;
let arrivalDetected = false;

// Initialize GPS tracking
function initializeGPSTracking() {
  console.log("[GPS] Initializing GPS tracking...");
  
  if (!navigator.geolocation) {
    console.error("[GPS] Geolocation API not supported");
    showNotification("❌ GPS not supported on this device.");
    return false;
  }
  
  console.log("[GPS] Geolocation API available");
  gpsEnabled = true;
  showNotification("📍 GPS Tracking Started");
  
  // Start watching location with high accuracy
  gpsWatchId = navigator.geolocation.watchPosition(
    handleGPSSuccess,
    handleGPSError,
    {
      enableHighAccuracy: gpsConfig.highAccuracyMode,
      timeout: 10000,
      maximumAge: 0
    }
  );
  
  console.log("[GPS] Watch ID:", gpsWatchId);
  
  // Update GPS status display
  updateGPSStatusDisplay();
  return true;
}

// Handle successful GPS position update
function handleGPSSuccess(position) {
  const newLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    timestamp: position.timestamp
  };
  
  // Update GPS accuracy and heading
  gpsAccuracy = position.coords.accuracy;
  currentHeading = position.coords.heading || 0;
  
  console.log("[GPS] Position update:", {
    lat: newLocation.lat.toFixed(6),
    lng: newLocation.lng.toFixed(6),
    accuracy: gpsAccuracy.toFixed(2),
    heading: currentHeading.toFixed(2)
  });
  
  // Calculate speed if available
  if (position.coords.speed !== null) {
    currentSpeed = position.coords.speed * 3.6; // Convert m/s to km/h
    movementTracker.maxSpeed = Math.max(movementTracker.maxSpeed, currentSpeed);
  }
  
  // Calculate distance and bearing from last position
  if (lastPosition) {
    const distance = calculateDistance(
      lastPosition.lat,
      lastPosition.lng,
      newLocation.lat,
      newLocation.lng
    );
    movementTracker.totalDistance += distance;
    
    // Calculate heading based on position change if device heading not available
    if (!position.coords.heading) {
      currentHeading = calculateBearing(
        lastPosition.lat,
        lastPosition.lng,
        newLocation.lat,
        newLocation.lng
      );
    }
  }
  
  // Add to location history
  locationHistory.push({
    ...newLocation,
    speed: currentSpeed,
    accuracy: gpsAccuracy,
    heading: currentHeading
  });
  
  // Keep only last 100 points
  if (locationHistory.length > 100) {
    locationHistory.shift();
  }
  
  // Update user location
  lastPosition = newLocation;
  userLocation = newLocation;
  
  // Update GPS data in local storage
  localStorage.setItem('lastGPSData', JSON.stringify({
    location: newLocation,
    speed: currentSpeed,
    accuracy: gpsAccuracy,
    heading: currentHeading,
    timestamp: new Date().toISOString()
  }));
  
  // Update map marker and accuracy circle
  if (map) {
    updateUserLocationMarker();
    updateGPSStatusDisplay();
  }
  
  // Check for lot arrival (geofencing)
  if (selectedLotIndex !== null) {
    checkLotArrival(newLocation);
  }
}

// Handle GPS error
function handleGPSError(error) {
  let errorMessage = "❌ GPS Error: ";
  switch(error.code) {
    case error.PERMISSION_DENIED:
      errorMessage += "Permission denied. Please enable location access.";
      break;
    case error.POSITION_UNAVAILABLE:
      errorMessage += "Position unavailable. Check GPS signal.";
      break;
    case error.TIMEOUT:
      errorMessage += "GPS request timed out.";
      break;
    default:
      errorMessage += "Unknown GPS error.";
  }
  showNotification(errorMessage);
  console.error("GPS Error:", error);
}

// Calculate bearing between two points
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return bearing;
}

// Check if user has arrived at parking lot (geofencing)
function checkLotArrival(currentPos) {
  if (arrivalDetected || selectedLotIndex === null) return;
  
  const lot = parkingLots[selectedLotIndex];
  const distance = calculateDistance(
    currentPos.lat,
    currentPos.lng,
    lot.lat,
    lot.lng
  ) * 1000; // Convert to meters
  
  if (distance <= gpsConfig.geofenceRadius) {
    arrivalDetected = true;
    
    // Trigger arrival notification
    const notification = `🎯 You've arrived at ${lot.name}! Your location: ${distance.toFixed(1)}m away`;
    showNotification(notification);
    
    // Log arrival in Firestore
    logLotArrival(lot.name, distance);
    
    // Play arrival sound if available
    playArrivalSound();
  }
}

// Log lot arrival to Firestore
function logLotArrival(lotName, distance) {
  if (!db || !auth.currentUser) return;
  
  db.collection('lot_arrivals').add({
    lotName: lotName,
    userId: auth.currentUser.uid,
    arrivalTime: new Date(),
    distance: distance,
    accuracy: gpsAccuracy
  }).catch(error => {
    console.error("Error logging arrival:", error);
  });
}

// Play arrival notification sound
function playArrivalSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log("Audio context not available");
  }
}

// Update GPS status display UI
function updateGPSStatusDisplay() {
  // Ensure DOM is ready
  if (!document.body) {
    setTimeout(() => updateGPSStatusDisplay(), 100);
    return;
  }
  
  let statusDiv = document.getElementById('gpsStatusDisplay');
  
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'gpsStatusDisplay';
    statusDiv.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: monospace;
      font-size: 12px;
      z-index: 9998;
      min-width: 280px;
      border: 2px solid #4facfe;
    `;
    document.body.appendChild(statusDiv);
  }
  
  const speedColor = currentSpeed > 80 ? '#f44336' : '#4caf50';
  const accuracyColor = gpsAccuracy < 50 ? '#4caf50' : (gpsAccuracy < 100 ? '#ff9800' : '#f44336');
  
  statusDiv.innerHTML = `
    <div style="font-weight: bold; color: #333; margin-bottom: 10px;">📍 GPS Status</div>
    <div style="margin: 5px 0;">
      <strong>Status:</strong> <span style="color: ${gpsEnabled ? '#4caf50' : '#f44336'};"> ${gpsEnabled ? '🔴 Active' : '⚪ Inactive'}</span>
    </div>
    <div style="margin: 5px 0;">
      <strong>Accuracy:</strong> <span style="color: ${accuracyColor};">${gpsAccuracy.toFixed(1)}m</span>
    </div>
    <div style="margin: 5px 0;">
      <strong>Speed:</strong> <span style="color: ${speedColor};">${currentSpeed.toFixed(1)} km/h</span>
    </div>
    <div style="margin: 5px 0;">
      <strong>Heading:</strong> ${currentHeading.toFixed(0)}° <span style="font-size: 10px;">(${getHeadingDirection(currentHeading)})</span>
    </div>
    <div style="margin: 5px 0;">
      <strong>Distance Traveled:</strong> ${movementTracker.totalDistance.toFixed(2)} km
    </div>
    <div style="margin: 5px 0; font-size: 11px; color: #666;">
      Lat: ${userLocation?.lat?.toFixed(6) || 'N/A'}<br>
      Lng: ${userLocation?.lng?.toFixed(6) || 'N/A'}
    </div>
    <button onclick="toggleGPSTracking()" style="
      width: 100%;
      margin-top: 10px;
      padding: 6px;
      background: ${gpsEnabled ? '#f44336' : '#4caf50'};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    ">${gpsEnabled ? 'Stop GPS' : 'Start GPS'}</button>
  `;
}

// Convert heading degrees to compass direction
function getHeadingDirection(heading) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}

// Toggle GPS tracking on/off
function toggleGPSTracking() {
  if (gpsEnabled) {
    stopGPSTracking();
  } else {
    initializeGPSTracking();
  }
}

// Stop GPS tracking
function stopGPSTracking() {
  if (gpsWatchId) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    gpsEnabled = false;
    showNotification("📍 GPS Tracking Stopped");
    updateGPSStatusDisplay();
  }
}

// Get GPS data for current session
function getGPSSessionData() {
  return {
    gpsEnabled: gpsEnabled,
    currentSpeed: currentSpeed,
    currentHeading: currentHeading,
    accuracy: gpsAccuracy,
    totalDistance: movementTracker.totalDistance,
    maxSpeed: movementTracker.maxSpeed,
    locationHistory: locationHistory,
    arrivalDetected: arrivalDetected
  };
}

// Save GPS session data to Firebase
function saveGPSSessionData(bookingId) {
  if (!db || !bookingId) return;
  
  const sessionData = getGPSSessionData();
  
  db.collection('bookings').doc(bookingId).update({
    gpsTrackingData: {
      enabled: sessionData.gpsEnabled,
      totalDistance: sessionData.totalDistance,
      maxSpeed: sessionData.maxSpeed,
      pointCount: sessionData.locationHistory.length,
      arrivalDetected: sessionData.arrivalDetected,
      endTime: new Date()
    }
  }).then(() => {
    console.log("GPS session data saved for booking:", bookingId);
  }).catch(error => {
    console.error("Error saving GPS data:", error);
  });
}

// ============ END GPS TRACKING SYSTEM ============

// ============ LATE FEE SYSTEM ============
// Late fee configuration
const LATE_FEE_CONFIG = {
  minimumChargeAmount: 20, // ₹20 base charge
  minimumChargeMinutes: 10, // For first 10 minutes
  chargePerMinute: 2 // ₹2 per minute after 10 minutes
};

// Calculate late fee based on overstay duration
function calculateLateFee(bookingEndTime, actualExitTime) {
  const endTime = new Date(bookingEndTime);
  const exitTime = new Date(actualExitTime);
  
  // Calculate overstay in minutes
  const overstayMinutes = Math.ceil((exitTime - endTime) / (1000 * 60));
  
  if (overstayMinutes <= 0) {
    return 0; // No overstay, no fine
  }
  
  // Minimum charge: ₹20 for 10 minutes
  // Then ₹2 per minute for additional time
  let lateFee = LATE_FEE_CONFIG.minimumChargeAmount; // Base ₹20
  
  if (overstayMinutes > LATE_FEE_CONFIG.minimumChargeMinutes) {
    const additionalMinutes = overstayMinutes - LATE_FEE_CONFIG.minimumChargeMinutes;
    lateFee += additionalMinutes * LATE_FEE_CONFIG.chargePerMinute;
  }
  
  return lateFee;
}

// Get overstay details for display
function getOverstayDetails(bookingEndTime, actualExitTime) {
  const endTime = new Date(bookingEndTime);
  const exitTime = new Date(actualExitTime);
  
  const overstayMinutes = Math.ceil((exitTime - endTime) / (1000 * 60));
  const overstayHours = Math.floor(overstayMinutes / 60);
  const overstayMinsRemainder = overstayMinutes % 60;
  
  return {
    totalMinutes: overstayMinutes,
    hours: overstayHours,
    minutes: overstayMinsRemainder,
    formattedTime: overstayHours > 0 ? `${overstayHours}h ${overstayMinsRemainder}m` : `${overstayMinutes}m`
  };
}

// Record slot exit and calculate fine
function exitSlot(bookingId, bookingEndTime) {
  const actualExitTime = new Date();
  const lateFee = calculateLateFee(bookingEndTime, actualExitTime);
  const overstayDetails = getOverstayDetails(bookingEndTime, actualExitTime);
  
  let message = '';
  if (lateFee > 0) {
    message = `⚠️ OVERSTAY FINE\n\nYou exceeded your parking time by ${overstayDetails.formattedTime}\n\nFine: ₹${lateFee}\n\nThis will be added to your total bill.`;
  } else {
    message = `✓ Thank you for using Smart Parking!\n\nYour parking time was: ${overstayDetails.formattedTime}\n\nNo extra charges.`;
  }
  
  // Save exit details to Firestore
  saveExitRecord(bookingId, actualExitTime, lateFee, overstayDetails);
  
  // Show notification
  showNotification(message);
  
  return {
    lateFee: lateFee,
    overstayDetails: overstayDetails,
    message: message
  };
}

// Save exit record and update booking with fine
function saveExitRecord(bookingId, exitTime, lateFee, overstayDetails) {
  db.collection('bookings').doc(bookingId).update({
    actualExitTime: exitTime,
    lateFee: lateFee,
    overstayMinutes: overstayDetails.totalMinutes,
    totalAmount: firebase.firestore.FieldValue.increment(lateFee),
    status: 'ExitComplete'
  }).then(() => {
    console.log('Exit recorded with fine: ₹' + lateFee);
  }).catch(error => {
    console.error('Error recording exit:', error);
  });
}

// Display fine in UI
function displayFineNotification(lateFee, overstayDetails) {
  const fineDiv = document.createElement('div');
  fineDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${lateFee > 0 ? '#ffebee' : '#e8f5e9'};
    border: 2px solid ${lateFee > 0 ? '#f44336' : '#4caf50'};
    border-radius: 10px;
    padding: 20px;
    max-width: 400px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  
  if (lateFee > 0) {
    fineDiv.innerHTML = `
      <h3 style="color:#f44336; margin-top:0;">⚠️ Overstay Fine Applied</h3>
      <p><strong>Overstay Duration:</strong> ${overstayDetails.formattedTime}</p>
      <p><strong>Fine Amount:</strong> <span style="font-size:24px; color:#f44336;">₹${lateFee}</span></p>
      <p style="color:#666; font-size:12px; margin-bottom:0;">Minimum ₹20 for 10 minutes + ₹2/minute</p>
    `;
  } else {
    fineDiv.innerHTML = `
      <h3 style="color:#4caf50; margin-top:0;">✓ No Overstay</h3>
      <p>You returned on time. Thank you!</p>
    `;
  }
  
  document.body.appendChild(fineDiv);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    fineDiv.remove();
  }, 8000);
}

// ============ END LATE FEE SYSTEM ============


// Firebase Parking Slots Functions
function addParkingSlot(slotNumber, status = "available", lotId = null) {
  db.collection("slots").add({
    slotNumber: slotNumber,
    status: status,
    lotId: lotId,
    createdAt: new Date()
  }).then((docRef) => {
    console.log("Slot added with ID:", docRef.id);
  }).catch((error) => {
    console.error("Error adding slot:", error);
  });
}

function initializeParkingSlots(lotIndex) {
  const lot = parkingLots[lotIndex];
  const slotLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  for (let i = 1; i <= lot.slots; i++) {
    const slotLetter = slotLetters[Math.floor((i - 1) / 10) % slotLetters.length];
    const slotNumber = slotLetter + i;
    addParkingSlot(slotNumber, "available", lot.name);
  }
}

function updateSlotStatus(slotNumber, newStatus) {
  db.collection("slots").where("slotNumber", "==", slotNumber).get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      db.collection("slots").doc(doc.id).update({
        status: newStatus
      }).then(() => {
        console.log("Slot status updated:", slotNumber, newStatus);
      }).catch((error) => {
        console.error("Error updating slot:", error);
      });
    });
  });
}

function changeSlotStatus(slotNumber, newStatus) {
  updateSlotStatus(slotNumber, newStatus);
}

function getParkingSlotsFromFirestore(lotName, callback) {
  db.collection("slots").where("lotId", "==", lotName).get().then((querySnapshot) => {
    const slots = [];
    querySnapshot.forEach((doc) => {
      slots.push({id: doc.id, ...doc.data()});
    });
    callback(slots);
  }).catch((error) => {
    console.error("Error fetching slots:", error);
  });
}

// Real-time listener for parking slots
function listenToSlotsRealTime(lotName = null) {
  let query = db.collection("slots");
  
  if (lotName) {
    query = query.where("lotId", "==", lotName);
  }
  
  return query.onSnapshot(snapshot => {
    snapshot.forEach(doc => {
      const slot = doc.data();
      console.log("Slot Update:", slot.slotNumber, slot.status);
      
      // Update UI with real-time slot status
      updateSlotUIRealTime(doc.id, slot);
    });
  }, (error) => {
    console.error("Error listening to slots:", error);
  });
}

// Listen to all slots in real-time
function listenToAllSlotsRealTime() {
  db.collection("slots").onSnapshot(snapshot => {
    snapshot.forEach(doc => {
      const slot = doc.data();
      console.log("Slot ID:", doc.id, "Data:", slot);
      
      // Update UI with real-time slot status
      updateSlotUIRealTime(doc.id, slot);
    });
  }, (error) => {
    console.error("Error listening to all slots:", error);
  });
}

// Helper function to update UI when slots change in real-time
function updateSlotUIRealTime(slotId, slotData) {
  const slotElement = document.getElementById(`slot-${slotId}`);
  if (slotElement) {
    slotElement.textContent = slotData.status === "available" ? "✓ Available" : "✗ Booked";
    slotElement.style.color = slotData.status === "available" ? "green" : "red";
  }
}

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
  // Map styling for better appearance
  const mapStyle = [
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{color: "#e0e0e0"}]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{color: "#a2d4ff"}]
    },
    {
      featureType: "poi",
      stylers: [{visibility: "off"}]
    }
  ];

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 40.7128, lng: -74.0060},
    zoom: 13,
    styles: mapStyle,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#4facfe',
      strokeWeight: 4
    }
  });

  updateMapMarkers();
  initializeGPSTracking();
  listenToAllSlotsRealTime();
  
  showNotification("Map loaded. Click 'Use My Location' to start.");
}

// Real-time location tracking
function startRealTimeLocationTracking() {
  // This function is deprecated - use initializeGPSTracking() instead
  console.log("startRealTimeLocationTracking() is deprecated. Using enhanced GPS system.");
}


// Update user location marker
function updateUserLocationMarker() {
  if (!map || !userLocation) return;

  if (userMarker) {
    userMarker.setPosition(userLocation);
    // Rotate marker based on heading if available
    if (currentHeading) {
      userMarker.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        rotation: currentHeading,
        fillColor: '#4facfe',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 1
      });
    }
  } else {
    userMarker = new google.maps.Marker({
      position: userLocation,
      map: map,
      title: 'Your Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      animation: google.maps.Animation.DROP
    });
  }

  // Add accuracy circle based on GPS accuracy
  if (window.accuracyCircle) {
    window.accuracyCircle.setMap(null);
  }

  // Use actual GPS accuracy or fallback to 100 meters
  const radius = gpsAccuracy || 100;
  window.accuracyCircle = new google.maps.Circle({
    map: map,
    center: userLocation,
    radius: radius,
    fillColor: '#4facfe',
    fillOpacity: 0.15,
    strokeColor: '#4facfe',
    strokeOpacity: 0.4,
    strokeWeight: 1
  });

  map.setCenter(userLocation);
  updateDistancesToLots();
}

function updateMapMarkers() {
  if (!map) return;

  const infoWindows = [];

  parkingLots.forEach((lot, index) => {
    // Create custom marker icon
    const markerColor = lot.slots > 0 ? '#4CAF50' : '#f44336';
    const marker = new google.maps.Marker({
      position: {lat: lot.lat, lng: lot.lng},
      map: map,
      title: lot.name,
      animation: google.maps.Animation.DROP,
      label: {
        text: lot.slots.toString(),
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    });

    // Create info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="color:black; padding:10px; font-family:Arial;">
          <h4 style="margin:0 0 8px 0;">${lot.name}</h4>
          <p style="margin:3px 0;"><strong>Location:</strong> ${lot.location}</p>
          <p style="margin:3px 0;"><strong>Available Slots:</strong> <span style="color:${lot.slots > 0 ? 'green' : 'red'}; font-weight:bold;">${lot.slots}</span></p>
          <p style="margin:3px 0;"><strong>Price:</strong> ₹${lot.price || 100}/slot</p>
          ${userLocation ? `<p style="margin:3px 0;"><strong>Distance:</strong> <span id="distance-${index}">Calculating...</span></p>` : ''}
          <button style="margin-top:8px; padding:6px 12px; background:#4facfe; color:white; border:none; border-radius:3px; cursor:pointer;" onclick="openBooking(${index})">
            Book Now
          </button>
        </div>
      `
    });

    infoWindows.push(infoWindow);

    // Click listener
    marker.addListener('click', () => {
      // Close all info windows
      infoWindows.forEach(iw => iw.close());
      // Open this one
      infoWindow.open(map, marker);
      selectedLotIndex = index;
    });

    // Hover listener
    marker.addListener('mouseover', () => {
      marker.setAnimation(google.maps.Animation.BOUNCE);
    });
    marker.addListener('mouseout', () => {
      marker.setAnimation(null);
    });
  });
}

// Calculate distances to all lots
function updateDistancesToLots() {
  if (!userLocation || !map) return;

  parkingLots.forEach((lot, index) => {
    const distance = calculateDistance(
      userLocation.lat, 
      userLocation.lng, 
      lot.lat, 
      lot.lng
    ).toFixed(1);

    const distanceElement = document.getElementById(`distance-${index}`);
    if (distanceElement) {
      distanceElement.textContent = distance + ' km';
    }
  });
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get directions to parking lot
function getDirections(lotIndex) {
  if (!userLocation || lotIndex === null) {
    showNotification("Please select a parking lot and enable location");
    return;
  }

  const lot = parkingLots[lotIndex];
  const request = {
    origin: userLocation,
    destination: {lat: lot.lat, lng: lot.lng},
    travelMode: 'DRIVING'
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      const route = result.routes[0];
      const distance = route.legs[0].distance.text;
      const duration = route.legs[0].duration.text;
      showNotification(`Route: ${distance} | ETA: ${duration}`);
    } else {
      showNotification("Could not calculate route: " + status);
    }
  });
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      updateUserLocationMarker();
      updateDistancesToLots();
      showNotification("Location found. Showing nearby parking...");
    }, (error) => {
      console.error(error);
      showNotification("Unable to get your location. " + error.message);
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  } else {
    showNotification("Geolocation not supported on your device.");
  }
}

function searchParking() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    renderParkingLots(searchInput.value);
  }
}

function filterByLocation(location) {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.value = location;
    renderParkingLots(location);
    // Scroll to results
    document.getElementById("parkingList").scrollIntoView({ behavior: "smooth" });
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
    const slotsColor = lot.slots > 0 ? 'green' : 'red';
    
    // Generate slot display
    let slotDisplay = '';
    const totalSlots = 12; // Display up to 12 slots per lot
    const occupiedSlots = Math.max(0, totalSlots - lot.slots);
    
    for (let i = 1; i <= totalSlots; i++) {
      const isAvailable = i <= lot.slots;
      const slotLetter = String.fromCharCode(64 + Math.ceil(i / 6)); // A, B
      const slotNumber = ((i - 1) % 6) + 1;
      const slotName = `${slotLetter}${slotNumber}`;
      const slotColor = isAvailable ? '#4caf50' : '#f44336';
      const slotBg = isAvailable ? '#e8f5e9' : '#ffebee';
      
      slotDisplay += `<span style="display:inline-block; width:28px; height:28px; margin:3px; background:${slotBg}; border:2px solid ${slotColor}; border-radius:3px; text-align:center; line-height:24px; font-size:11px; font-weight:bold; color:${slotColor}; cursor:pointer;" title="${slotName} - ${isAvailable ? 'Available' : 'Occupied'}">${slotName}</span>`;
    }
    
    list.innerHTML += `
      <div class="parking-lot">
        <h3>📍 ${lot.name}</h3>
        <p><strong>Location:</strong> ${lot.location}</p>
        <p><strong>Distance:</strong> <span style="color:#4facfe; font-weight:bold;">${distance} km</span></p>
        <p><strong>Price per slot:</strong> ₹${price}</p>
        <p><strong>Slots Available:</strong> <span class="available" style="color:${slotsColor};">${lot.slots} / ${totalSlots} slots</span></p>
        <p><strong>Slot Map:</strong></p>
        <div style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 3px; overflow-x: auto;">
          ${slotDisplay}
        </div>
        <div class="button-group">
          <button class="book-btn" ${lot.slots === 0 ? "disabled" : ""} onclick="openBooking(${originalIndex})">Book Now</button>
          <button class="book-btn" style="background: #FF9800; margin-left:5px;" onclick="getDirections(${originalIndex})">Get Directions</button>
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
  // Log to console as fallback
  console.log("[Notification]", message);
  
  const notification = document.getElementById("notification");
  if (notification) {
    notification.textContent = message;
    notification.classList.remove("hidden");
    setTimeout(() => notification.classList.add("hidden"), 3000);
  }
}

// QR Code Generation Functions
function generateQRCode(element, text, width = 220, height = 220) {
  if (!element) return;
  
  // Clear previous QR code
  element.innerHTML = "";
  
  // Check if QRCode library is loaded
  if (typeof QRCode === 'undefined') {
    console.error("QRCode library not loaded. Add CDN: https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js");
    element.textContent = "QR Code library not available";
    return;
  }
  
  // Generate new QR code
  try {
    new QRCode(element, {
      text: text,
      width: width,
      height: height,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    console.log("QR Code generated successfully");
  } catch (error) {
    console.error("Error generating QR code:", error);
    element.textContent = "Error generating QR code";
  }
}

function generateBookingQR(bookingData) {
  const canvas = document.getElementById("qrCanvas");
  if (!canvas) return;
  
  // Create booking string for QR code
  const bookingString = `Booking ID:${bookingData.bookingId || 'PARK-' + Date.now()}|Lot:${bookingData.lotName}|User:${bookingData.user}|Date:${bookingData.bookingDate}|Slots:${bookingData.slots}`;
  
  generateQRCode(canvas, bookingString, 220, 220);
}

function generatePaymentQRWithUPI(payerName, amount, gateway) {
  const upiString = `upi://pay?pa=parking@upi&pn=${payerName}&am=${amount}&tn=Parking%20Booking&tr=PARK${Date.now()}`;
  return upiString;
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

// Save booking to Firebase and track owner earnings
function saveBooking(bookingData) {
  db.collection("bookings").add({
    ...bookingData,
    date: new Date(),
    status: 'Completed'
  }).then(docRef => {
    console.log("Booking saved with ID:", docRef.id);
    
    // Update owner earnings
    if (bookingData.ownerUid) {
      updateOwnerEarnings(bookingData.ownerUid, bookingData.amount);
    }
  }).catch(error => {
    console.error("Error saving booking:", error);
  });
}

// Update owner's total earnings
function updateOwnerEarnings(ownerUid, amount) {
  db.collection("owners").doc(ownerUid).update({
    totalEarnings: firebase.firestore.FieldValue.increment(amount)
  }).then(() => {
    console.log("Owner earnings updated: ₹" + amount);
  }).catch(error => {
    console.error("Error updating earnings:", error);
  });
}

function payOnline() {
  const payerName = document.getElementById("payerName").value.trim();
  const payerEmail = document.getElementById("payerEmail").value.trim();
  const gateway = document.getElementById("paymentGateway").value;

  if (!payerName || !payerEmail) {
    alert("Please fill in name and email.");
    return;
  }

  // Validate payment details
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

  // Simulate payment processing
  alert(`Processing payment via ${gateway}...`);
  
  setTimeout(() => {
    const lotIndex = parseInt(localStorage.getItem('selectedLotIndex'), 10);
    const slots = JSON.parse(localStorage.getItem('selectedSlots'));
    const bookingDate = localStorage.getItem('bookingDate');
    const duration = localStorage.getItem('duration');
    const amount = parseInt(localStorage.getItem('totalAmount'), 10);

    // Update parking lot slots
    parkingLots[lotIndex].slots -= slots.length;
    localStorage.setItem('parkingLots', JSON.stringify(parkingLots));

    // Create booking data
    const bookingData = {
      lot: parkingLots[lotIndex].name,
      lotName: parkingLots[lotIndex].name,
      slots: slots.length,
      date: bookingDate,
      duration: duration + ' hours',
      amount: amount,
      name: payerName,
      payment: gateway,
      customerEmail: payerEmail
    };

    // Save booking to localStorage for confirmation
    localStorage.setItem('confirmation', JSON.stringify(bookingData));

    // Add to history
    const history = JSON.parse(localStorage.getItem('bookingHistory')) || [];
    history.push(bookingData);
    localStorage.setItem('bookingHistory', JSON.stringify(history));

    // ===== CLOUD FEATURES INTEGRATION =====
    // 1. Save customer data
    saveCustomerData({
      name: payerName,
      email: payerEmail,
      phone: '' // Add phone field if available
    }).then(customerId => {
      // 2. Update customer after booking
      updateCustomerAfterBooking(customerId, amount);
    });

    // 3. Generate and save receipt
    const paymentData = {
      payerName: payerName,
      payerEmail: payerEmail,
      gateway: gateway
    };
    generateReceipt(bookingData, paymentData);

    // 4. Send notifications
    sendBookingNotification(bookingData);
    sendEmailNotification(payerEmail, 'Parking Booking Confirmed', 
      `Your parking slot at ${bookingData.lotName} is confirmed. Amount: ₹${amount}`);

    // Redirect to confirmation
    window.location.href = 'confirmation.html';
  }, 2000);
}

// ============ END CLOUD FEATURES ============

// ============ CUSTOMER DATA MANAGEMENT ============
// Save customer data to Firestore
function saveCustomerData(customerInfo) {
  return db.collection("customers").add({
    ...customerInfo,
    createdAt: new Date(),
    totalBookings: 0,
    totalSpent: 0
  }).then(docRef => {
    console.log("Customer saved with ID:", docRef.id);
    return docRef.id;
  }).catch(error => {
    console.error("Error saving customer:", error);
  });
}

// Update customer after booking
function updateCustomerAfterBooking(customerId, bookingAmount) {
  if (!customerId) return;
  db.collection("customers").doc(customerId).update({
    totalBookings: firebase.firestore.FieldValue.increment(1),
    totalSpent: firebase.firestore.FieldValue.increment(bookingAmount),
    lastBooking: new Date()
  }).then(() => {
    console.log("Customer updated after booking");
  }).catch(error => {
    console.error("Error updating customer:", error);
  });
}

// ============ BILLING RECEIPTS ============
// Generate and save receipt
function generateReceipt(bookingData, paymentData) {
  const receipt = {
    receiptId: 'REC-' + Date.now(),
    customerName: paymentData.payerName,
    customerEmail: paymentData.payerEmail,
    lotName: bookingData.lotName,
    amount: bookingData.amount,
    paymentMethod: paymentData.gateway,
    bookingDate: new Date(),
    qrCodeData: `Receipt:${receipt.receiptId}|Amount:${bookingData.amount}`
  };

  // Save to Firestore
  db.collection("receipts").add(receipt).then(docRef => {
    console.log("Receipt saved:", docRef.id);
    // Store for confirmation page
    localStorage.setItem('receipt', JSON.stringify(receipt));
  }).catch(error => {
    console.error("Error saving receipt:", error);
  });

  return receipt;
}

// Display receipt in confirmation page
function displayReceipt(receipt) {
  const receiptDiv = document.createElement('div');
  receiptDiv.style.cssText = `
    margin: 20px 0;
    padding: 20px;
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 5px;
  `;
  receiptDiv.innerHTML = `
    <h3>📄 Billing Receipt</h3>
    <p><strong>Receipt ID:</strong> ${receipt.receiptId}</p>
    <p><strong>Customer:</strong> ${receipt.customerName}</p>
    <p><strong>Parking Lot:</strong> ${receipt.lotName}</p>
    <p><strong>Amount Paid:</strong> ₹${receipt.amount}</p>
    <p><strong>Payment Method:</strong> ${receipt.paymentMethod}</p>
    <p><strong>Date:</strong> ${receipt.bookingDate.toLocaleString()}</p>
    <button onclick="downloadReceipt('${receipt.receiptId}')">Download Receipt</button>
  `;
  document.body.appendChild(receiptDiv);
}

// Download receipt as text file
function downloadReceipt(receiptId) {
  const receipt = JSON.parse(localStorage.getItem('receipt'));
  if (!receipt) return;
  
  const receiptText = `
SMART PARKING RECEIPT
=====================
Receipt ID: ${receipt.receiptId}
Customer: ${receipt.customerName}
Email: ${receipt.customerEmail}
Parking Lot: ${receipt.lotName}
Amount Paid: ₹${receipt.amount}
Payment Method: ${receipt.paymentMethod}
Date: ${new Date(receipt.bookingDate).toLocaleString()}

Thank you for using Smart Parking!
  `;
  
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(receiptText));
  element.setAttribute("download", `receipt-${receiptId}.txt`);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// ============ ALERTING NOTIFICATIONS ============
// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    });
  }
}

// Send booking confirmation notification
function sendBookingNotification(bookingData) {
  if (Notification.permission === 'granted') {
    const notification = new Notification('Parking Booked Successfully!', {
      body: `Your slot at ${bookingData.lotName} is confirmed. Amount: ₹${bookingData.amount}`,
      icon: '/icon.png' // Add your icon path
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// Alert for slot availability
function sendSlotAlert(lotName) {
  if (Notification.permission === 'granted') {
    const notification = new Notification('Parking Slot Available!', {
      body: `Slots are now available at ${lotName}`,
      icon: '/icon.png'
    });
    
    notification.onclick = () => {
      window.location.href = 'parking.html';
      notification.close();
    };
  }
}

// Send email notification (requires backend service)
function sendEmailNotification(email, subject, message) {
  // This would typically be done via a backend service
  // For demo, we'll log it
  console.log(`Email to ${email}: ${subject} - ${message}`);
  
  // In production, use a service like SendGrid, Mailgun, or Firebase Functions
  // Example with Firebase Functions:
  // firebase.functions().httpsCallable('sendEmail')({email, subject, message});
  
  // Event tracking for analytics
  logAnalyticsEvent('email_sent', {
    recipient: email,
    subject: subject
  });
}

// ============ ADVANCED EMAIL NOTIFICATIONS ============
// Send email via Brevo (Sendinblue)
function sendEmailViaBrevo(email, subject, htmlMessage) {
  const BREVO_API_KEY = localStorage.getItem('brevoApiKey'); // Store in localStorage
  if (!BREVO_API_KEY) {
    console.warn('Brevo API key not configured');
    return;
  }

  const payload = {
    sender: {
      email: "noreply@smartparking.com",
      name: "Smart Parking System"
    },
    to: [{ email: email }],
    subject: subject,
    htmlContent: htmlMessage
  };

  fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (response.ok) {
      console.log('Email sent successfully via Brevo');
      logAnalyticsEvent('email_sent_brevo', { recipient: email });
    }
  })
  .catch(error => console.error('Brevo email error:', error));
}

// HTML email templates
function getBookingConfirmationEmail(bookingData) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #667eea;">Parking Booking Confirmed ✓</h2>
          <p>Dear ${bookingData.customerName},</p>
          <p>Your parking slot has been successfully booked!</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Booking Details:</strong><br>
            Lot: ${bookingData.lotName}<br>
            Duration: ${bookingData.duration}<br>
            Amount: ₹${bookingData.amount}<br>
            Booking ID: ${bookingData.bookingId || 'PENDING'}
          </div>
          
          <p>Please arrive 10 minutes before your scheduled time.</p>
          <p>For support, contact us at support@smartparking.com</p>
          <p>Best regards,<br>Smart Parking Team</p>
        </div>
      </body>
    </html>
  `;
}

function getReceiptEmail(receiptData) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #667eea;">Parking Receipt</h2>
          <p>Dear ${receiptData.customerName},</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Receipt ID:</strong> ${receiptData.receiptId}<br>
            <strong>Amount:</strong> ₹${receiptData.amount}<br>
            <strong>Late Fee:</strong> ₹${receiptData.lateFee || 0}<br>
            <strong>Total:</strong> ₹${(receiptData.amount || 0) + (receiptData.lateFee || 0)}<br>
            <strong>Payment Method:</strong> ${receiptData.paymentMethod}
          </div>
          
          <p>Your receipt has been generated. Please keep it for your records.</p>
          <p>Thank you for using Smart Parking!</p>
        </div>
      </body>
    </html>
  `;
}

// ============ SMS NOTIFICATIONS ============
// Send SMS via Twilio
function sendSMSViaTwilio(phone, message) {
  // Note: This requires a backend server due to security constraints
  // Frontend cannot directly call Twilio APIs without exposing credentials
  console.log(`SMS to ${phone}: ${message}`);
  
  // For production, use Firebase Cloud Function:
  // firebase.functions().httpsCallable('sendSMS')({phone, message});
}

// ============ ANALYTICS & TRACKING ============
// Log event to Firebase Analytics
function logAnalyticsEvent(eventName, eventData = {}) {
  try {
    if (typeof firebase !== 'undefined' && firebase.analytics) {
      firebase.analytics().logEvent(eventName, eventData);
      console.log(`Analytics event logged: ${eventName}`, eventData);
    }
  } catch (error) {
    console.warn('Analytics logging error:', error);
  }
}

// Track parking booking
function trackBookingEvent(bookingData) {
  logAnalyticsEvent('parking_booked', {
    lot_name: bookingData.lotName,
    amount: bookingData.amount,
    slots: bookingData.slots,
    duration: bookingData.duration,
    payment_method: bookingData.paymentMethod
  });
}

// Track payment completion
function trackPaymentEvent(paymentData) {
  logAnalyticsEvent('payment_completed', {
    amount: paymentData.amount,
    gateway: paymentData.gateway,
    customer_email: paymentData.customerEmail
  });
}

// Track slot exit
function trackExitEvent(exitData) {
  logAnalyticsEvent('parking_exit', {
    lot_name: exitData.lotName,
    late_fee: exitData.lateFee,
    overstay_minutes: exitData.overstayMinutes,
    total_amount: exitData.totalAmount
  });
}

// Track late fee
function trackLateFeEvent(lateData) {
  logAnalyticsEvent('late_fee_charged', {
    booking_id: lateData.bookingId,
    fine_amount: lateData.fineAmount,
    overstay_duration: lateData.overstayDuration
  });
}

// ============ NOTIFICATION PREFERENCES ============
// Save user notification preferences
function saveNotificationPreferences(preferences) {
  const prefs = {
    emailNotifications: preferences.email || true,
    smsNotifications: preferences.sms || false,
    pushNotifications: preferences.push || true,
    savedAt: new Date().toISOString()
  };
  
  localStorage.setItem('notificationPrefs', JSON.stringify(prefs));
  
  if (typeof db !== 'undefined') {
    const customerEmail = localStorage.getItem('userEmail');
    if (customerEmail) {
      db.collection('customers').doc(customerEmail).update({
        notificationPreferences: prefs
      }).catch(error => console.warn('Error saving preferences:', error));
    }
  }
}

// Get user notification preferences
function getNotificationPreferences() {
  const stored = localStorage.getItem('notificationPrefs');
  return stored ? JSON.parse(stored) : {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  };
}

// ============ AUDIT LOGGING ============
// Log user actions for security and analytics
function logUserAction(action, details = {}) {
  const actionLog = {
    action: action,
    details: details,
    timestamp: new Date().toISOString(),
    userEmail: localStorage.getItem('userEmail') || 'unknown'
  };
  
  console.log('[AUDIT LOG]', actionLog);
  
  // Save to Firestore if available
  if (typeof db !== 'undefined') {
    db.collection('audit_logs').add(actionLog)
      .catch(error => console.warn('Audit logging error:', error));
  }
}

// Log payment action
function logPaymentAction(paymentData) {
  logUserAction('payment_processing', {
    gateway: paymentData.gateway,
    amount: paymentData.amount,
    customer: paymentData.customerName
  });
}

// Log booking action
function logBookingAction(bookingData) {
  logUserAction('booking_created', {
    lot: bookingData.lotName,
    slots: bookingData.slots,
    amount: bookingData.amount
  });
}

// ============ ERROR REPORTING ============
// Report errors to console and optionally to server
function reportError(errorCode, errorMessage, context = {}) {
  const errorReport = {
    code: errorCode,
    message: errorMessage,
    context: context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  console.error('[ERROR REPORT]', errorReport);
  
  // Save to Firestore if available
  if (typeof db !== 'undefined') {
    db.collection('error_logs').add(errorReport)
      .catch(error => console.warn('Error reporting failed:', error));
  }
}

// ============ CUSTOMER FEEDBACK ============
// Send customer feedback
function submitFeedback(rating, comment) {
  const feedback = {
    rating: rating,
    comment: comment,
    customerEmail: localStorage.getItem('userEmail'),
    timestamp: new Date().toISOString()
  };
  
  if (typeof db !== 'undefined') {
    db.collection('customer_feedback').add(feedback)
      .then(() => {
        console.log('Feedback submitted successfully');
        alert('Thank you for your feedback!');
        logAnalyticsEvent('feedback_submitted', { rating: rating });
      })
      .catch(error => {
        console.error('Error submitting feedback:', error);
        reportError('FEEDBACK_ERROR', error.message);
      });
  } else {
    console.log('Feedback (offline):', feedback);
  }
}

// ============ INTEGRATION WITH PAYMENT FLOW ============
// Enhanced payOnline function with cloud features
function payOnline() {
  const payerName = document.getElementById("payerName").value.trim();
  const payerEmail = document.getElementById("payerEmail").value.trim();
  const gateway = document.getElementById("paymentGateway").value;

  if (!payerName || !payerEmail) {
    alert("Please fill in name and email.");
    return;
  }

  // Validate payment details
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

  // Simulate payment processing
  alert(`Processing payment via ${gateway}...`);
  
  setTimeout(() => {
    const lotIndex = parseInt(localStorage.getItem('selectedLotIndex'), 10);
    const slots = JSON.parse(localStorage.getItem('selectedSlots'));
    const bookingDate = localStorage.getItem('bookingDate');
    const duration = localStorage.getItem('duration');
    const amount = parseInt(localStorage.getItem('totalAmount'), 10);

    // Update parking lot slots
    parkingLots[lotIndex].slots -= slots.length;
    localStorage.setItem('parkingLots', JSON.stringify(parkingLots));

    // Create booking data
    const bookingData = {
      lot: parkingLots[lotIndex].name,
      lotName: parkingLots[lotIndex].name,
      slots: slots.length,
      date: bookingDate,
      duration: duration + ' hours',
      amount: amount,
      name: payerName,
      payment: gateway,
      customerEmail: payerEmail
    };

    // Save booking to localStorage for confirmation
    localStorage.setItem('confirmation', JSON.stringify(bookingData));

    // Add to history
    const history = JSON.parse(localStorage.getItem('bookingHistory')) || [];
    history.push(bookingData);
    localStorage.setItem('bookingHistory', JSON.stringify(history));

    // ===== CLOUD FEATURES INTEGRATION =====
    // 1. Save customer data
    saveCustomerData({
      name: payerName,
      email: payerEmail,
      phone: '' // Add phone field if available
    }).then(customerId => {
      // 2. Update customer after booking
      updateCustomerAfterBooking(customerId, amount);
    });

    // 3. Generate and save receipt
    const paymentData = {
      payerName: payerName,
      payerEmail: payerEmail,
      gateway: gateway
    };
    generateReceipt(bookingData, paymentData);

    // 4. Send notifications
    sendBookingNotification(bookingData);
    sendEmailNotification(payerEmail, 'Parking Booking Confirmed', 
      `Your parking slot at ${bookingData.lotName} is confirmed. Amount: ₹${amount}`);

    // Redirect to confirmation
    window.location.href = 'confirmation.html';
  }, 2000);
}

// ============ END CLOUD FEATURES ============

// ============ EXIT PARKING INTEGRATION ============

// Store exit data before leaving for exit page
function initiateExit(bookingId) {
  if (!bookingId || !db) {
    showNotification("❌ Cannot initiate exit without booking data");
    return;
  }
  
  // Fetch booking details from Firebase
  db.collection('bookings').doc(bookingId).get().then(doc => {
    if (doc.exists) {
      const booking = {id: bookingId, ...doc.data()};
      
      // Store in localStorage for the exit page
      localStorage.setItem('exitBooking', JSON.stringify(booking));
      
      console.log("[EXIT] Initiating exit for booking:", bookingId);
      
      // Navigate to exit page
      window.location.href = `slot-exit.html?bookingId=${bookingId}`;
    } else {
      showNotification("❌ Booking not found");
    }
  }).catch(error => {
    console.error("Error fetching booking:", error);
    showNotification("❌ Error loading booking data");
  });
}

// Handle exit completion and return to parking page
function handleExitCompletion(bookingId, exitData) {
  if (!db) return;
  
  // Update Firebase with exit data
  db.collection('bookings').doc(bookingId).update({
    actualExitTime: new Date(),
    lateFee: exitData.lateFee || 0,
    totalAmount: exitData.totalAmount || 0,
    status: 'ExitComplete'
  }).then(() => {
    console.log("[EXIT] Exit recorded successfully");
    
    // Save to GPS tracking
    if (gpsEnabled) {
      saveGPSSessionData(bookingId);
    }
    
    showNotification("✓ Exit recorded successfully!");
    
    // Return to main page after delay
    setTimeout(() => {
      window.location.href = 'parking.html';
    }, 3000);
  }).catch(error => {
    console.error("Error recording exit:", error);
  });
}

// ============ END EXIT PARKING INTEGRATION ============
