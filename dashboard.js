// Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Static Slots Array (Fallback data / Local data)
const slots = [
  { id: 1, status: "available" },
  { id: 2, status: "occupied" },
  { id: 3, status: "available" },
  { id: 4, status: "occupied" }
];

// Dashboard Statistics
let totalSlots = 0;
let availableSlots = 0;
let occupiedSlots = 0;
let myChart = null; // Chart instance

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", function() {
  updateDashboard(); // Update with static data first
  initializeChart(); // Initialize Chart.js
  initializeRealtimeDashboard(); // Start real-time listener
});
function updateDashboard() {
  let total = slots.length;
  let available = slots.filter(s => s.status === "available").length;
  let occupied = slots.filter(s => s.status === "occupied").length;

  document.getElementById("total").innerText = total;
  document.getElementById("available").innerText = available;
  document.getElementById("occupied").innerText = occupied;
  
  // Update global counters
  totalSlots = total;
  availableSlots = available;
  occupiedSlots = occupied;
  
  // Update chart if it exists
  updateChart(available, occupied);
}

// Change slot status
function changeSlotStatus(slotId, newStatus) {
  const slot = slots.find(s => s.id === slotId);
  if (slot) {
    slot.status = newStatus;
    updateDashboard();
    console.log(`Slot ${slotId} status changed to ${newStatus}`);
  }
}

// Initialize Chart.js Pie Chart
function initializeChart() {
  const ctx = document.getElementById('myChart');
  if (!ctx) return;
  
  myChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Available', 'Occupied'],
      datasets: [{
        data: [availableSlots, occupiedSlots],
        backgroundColor: ['#4CAF50', '#f44336'],
        borderColor: ['#45a049', '#da190b'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Parking Slot Distribution'
        }
      }
    }
  });
}

// Update chart with new data
function updateChart(available, occupied) {
  if (myChart) {
    myChart.data.datasets[0].data = [available, occupied];
    myChart.update();
  }
}

// Real-time Firestore listener - efficiently updates dashboard
function initializeRealtimeDashboard() {
  db.collection("slots").onSnapshot(snapshot => {
    let total = 0;
    let available = 0;
    let occupied = 0;

    snapshot.forEach(doc => {
      total++;
      if (doc.data().status === "available") available++;
      else occupied++;
    });

    document.getElementById("total").innerText = total;
    document.getElementById("available").innerText = available;
    document.getElementById("occupied").innerText = occupied;
    
    // Update global counters
    totalSlots = total;
    availableSlots = available;
    occupiedSlots = occupied;
    
    // Update the pie chart
    updateChart(available, occupied);
    
    // Display slots list
    displaySlotsList(snapshot);
  }, (error) => {
    console.error("Error listening to slots:", error);
  });
}

// Load initial dashboard data (fallback)
function loadDashboardData() {
  db.collection("slots").get().then((querySnapshot) => {
    totalSlots = querySnapshot.size;
    availableSlots = 0;
    occupiedSlots = 0;

    querySnapshot.forEach((doc) => {
      const slot = doc.data();
      if (slot.status === "available") {
        availableSlots++;
      } else {
        occupiedSlots++;
      }
    });

    updateDashboard();
  }).catch((error) => {
    console.error("Error loading dashboard data:", error);
  });
}

// Update dashboard display
function updateDashboard() {
  document.getElementById("total").textContent = totalSlots;
  document.getElementById("available").textContent = availableSlots;
  document.getElementById("occupied").textContent = occupiedSlots;
}

// Display list of all slots
function displaySlotsList(snapshot) {
  const slotsList = document.getElementById("slotsList");
  let slotsHTML = "<table style='width:100%; border-collapse:collapse;'>";
  slotsHTML += "<tr style='background:#ddd;'><th style='padding:8px; border:1px solid #ccc;'>Slot #</th><th style='padding:8px; border:1px solid #ccc;'>Status</th></tr>";

  const slots = [];
  snapshot.forEach(doc => {
    slots.push(doc.data());
  });

  slots.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber));

  slots.forEach(slot => {
    const statusColor = slot.status === "available" ? "green" : "red";
    const statusText = slot.status === "available" ? "✓ Available" : "✗ Occupied";
    slotsHTML += `<tr>
      <td style='padding:8px; border:1px solid #ccc; text-align:left;'>${slot.slotNumber}</td>
      <td style='padding:8px; border:1px solid #ccc; color:${statusColor}; font-weight:bold;'>${statusText}</td>
    </tr>`;
  });

  slotsHTML += "</table>";
  slotsList.innerHTML = slotsHTML;
}
