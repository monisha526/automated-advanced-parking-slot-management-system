# 🎯 Quick Reference Guide

## File Structure Overview

```
Website/
├── HTML Pages
│   ├── parking.html              Main parking search page
│   ├── payment.html              Payment form page
│   ├── confirmation.html         Booking confirmation
│   ├── slot-exit.html            Vehicle exit/fine calculation
│   ├── login.html                Customer login
│   ├── dashboard.html            Lot availability dashboard
│   ├── owner-login.html          Owner authentication
│   ├── owner-dashboard.html      Owner earnings page
│   ├── admin-login.html          Admin authentication [NEW]
│   └── admin-dashboard.html      Admin control panel [NEW]
│
├── JavaScript
│   └── parking.js                Core logic (1400+ lines with cloud features)
│
├── Documentation
│   ├── TESTING_GUIDE.md          Complete testing procedures
│   ├── FIREBASE_SETUP.md         Firebase configuration guide
│   ├── IMPLEMENTATION_CHECKLIST.md Full deployment checklist
│   └── Code Citations.md         Attribution & references
│
└── Supporting Files
    └── (CSS styles embedded in HTML files)
```

---

## Key Functions Reference

### 🔐 Authentication & User Management

```javascript
// Save customer data to Firestore
saveCustomerData({name, email, phone})

// Update customer booking count
updateCustomerAfterBooking(customerId, amount)

// Owner login handling
handleOwnerLogin(email, password)

// Admin dashboard access
checkAdminAccess()
```

### 🅿️ Parking Management

```javascript
// Book parking slots
function bookParking()

// Get overstay details
function getOverstayDetails(bookingEndTime, actualExitTime)

// Calculate late fees
function calculateLateFee(bookingEndTime, actualExitTime)
// Returns: ₹20 base + ₹2/minute for minutes > 10min overstay

// Exit parking and record
function saveExitRecord(bookingId, exitTime)
```

### 💳 Payment Processing

```javascript
// Main payment handler with 6 gateway options
function payOnline()
  // Supports: Razorpay, Paytm, Stripe, Google Pay, PhonePe, Net Banking

// Save booking to Firestore
function saveBooking(bookingData)

// Generate receipt
function generateReceipt(bookingData, paymentData)

// Download receipt as PDF
function downloadReceipt()
```

### 📧 Notifications & Alerts

```javascript
// Browser notifications
function sendBookingNotification(bookingData)
function sendSlotAlert(lotName)
function requestNotificationPermission()

// Email notifications (demo mode)
function sendEmailNotification(email, subject, message)

// Advanced email with HTML templates
function sendEmailViaBrevo(email, subject, htmlMessage)
function getBookingConfirmationEmail(bookingData)
function getReceiptEmail(receiptData)

// SMS notifications (requires backend)
function sendSMSViaTwilio(phone, message)
```

### 📊 Analytics & Tracking

```javascript
// Log analytics events
function logAnalyticsEvent(eventName, eventData)

// Track specific events
function trackBookingEvent(bookingData)
function trackPaymentEvent(paymentData)
function trackExitEvent(exitData)
function trackLateFeEvent(lateData)

// User action logging
function logUserAction(action, details)
function logPaymentAction(paymentData)
function logBookingAction(bookingData)

// Error reporting
function reportError(errorCode, errorMessage, context)
```

### 🗺️ Location & Maps

```javascript
// Initialize Google Map
function initMap()

// Get real-time location
function startRealTimeLocationTracking()

// Show directions
function getDirections()

// Get distance between points
function getDistance(lat1, lng1, lat2, lng2)
```

### 🎟️ QR Codes & Receipts

```javascript
// Generate QR code
function generateQRCode()

// Generate booking QR
function generateBookingQR(bookingData)

// Draw QR on confirmation page
function drawConfirmationQRCode()

// Download receipt
function downloadReceipt()
```

### 👥 Customer Preferences

```javascript
// Save notification preferences
function saveNotificationPreferences(preferences)
  // Options: { email, sms, push }

// Get notification preferences
function getNotificationPreferences()
```

### 💰 Owner & Admin Functions

```javascript
// Update owner earnings
function updateOwnerEarnings(ownerUid, amount)

// Load owner dashboard
function loadOwnerDashboard()

// Load admin dashboard
function loadDashboardData()

// View booking details
function viewBooking(bookingId)

// Filter bookings
function filterBookings()
```

---

## Firestore Collections Schema

### customers
```javascript
{
  name: String,
  email: String,
  phone: String,
  createdAt: Timestamp,
  totalBookings: Number,
  totalSpent: Number,
  notificationPreferences: Object
}
```

### bookings
```javascript
{
  bookingId: String,
  lotName: String,
  slots: Number,
  amount: Number,
  lateFee: Number,
  customerName: String,
  customerEmail: String,
  entryTime: Timestamp,
  bookingEndTime: Timestamp,
  actualExitTime: Timestamp (nullable),
  paymentMethod: String,
  status: String, // "Active", "Completed", "ExitComplete"
  description: String
}
```

### receipts
```javascript
{
  receiptId: String,
  bookingId: String,
  customerName: String,
  customerEmail: String,
  lotName: String,
  amount: Number,
  lateFee: Number,
  totalAmount: Number,
  paymentMethod: String,
  bookingDate: Timestamp,
  exitDate: Timestamp (nullable)
}
```

### owners
```javascript
{
  ownerName: String,
  email: String,
  parkingLots: Array<String>,
  totalEarnings: Number,
  availableBalance: Number,
  bankAccountNumber: String,
  createdAt: Timestamp
}
```

### slots
```javascript
{
  lotName: String,
  slotNumber: String,
  status: String, // "Available", "Occupied", "Reserved"
  currentBookingId: String (nullable),
  pricePerHour: Number,
  type: String // "regular", "handicap", "vip"
}
```

---

## Code Flow Diagrams

### 1️⃣ Booking Flow
```
parking.html
    ↓
[User selects lot]
    ↓
payment.html
    ↓
[User enters payment details]
    ↓
payOnline() function
    ↓
[Cloud features triggered]
├─→ saveCustomerData()
├─→ generateReceipt()
├─→ saveBooking()
├─→ sendBookingNotification()
├─→ sendEmailNotification()
├─→ logAnalyticsEvent()
└─→ logUserAction()
    ↓
confirmation.html
    ↓
[Display receipt with QR Code]
```

### 2️⃣ Exit Flow
```
confirmation.html
    ↓
[Click "Exit Parking"]
    ↓
slot-exit.html
    ↓
[Load booking by ID]
    ↓
[Calculate overstay time]
    ↓
[Calculate late fee]
├─→ Base: ₹20
└─→ Overstay: ₹2/minute (after 10 min)
    ↓
[Click "EXIT VEHICLE"]
    ↓
saveExitRecord() function
    ↓
[Update Firestore with exit]
├─→ Update bookings.status = "ExitComplete"
├─→ Update bookings.lateFee
├─→ Create exit record
├─→ Save receipt
└─→ Track analytics
    ↓
[Show receipt with total charges]
```

### 3️⃣ Payment Gateway Decision
```
payOnline()
    ↓
[Get selected gateway from dropdown]
    ↓
Gateway Selection:
├─→ Razorpay/Paytm/GPay/PhonePe → Ask for UPI ID
├─→ Stripe → Ask for Card Details
├─→ Net Banking → Ask for Bank Details
└─→ All → Validate input
    ↓
[Simulate payment processing]
    ↓
[Save payment record]
    ↓
[Update Firestore]
    ↓
[Redirect to confirmation]
```

---

## Environment Variables & Keys

### Firebase Config (Required)
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Google Maps API Key (Required)
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"></script>
```

### Brevo API Key (Optional - for email)
```javascript
localStorage.setItem('brevoApiKey', 'YOUR_BREVO_KEY');
```

### Payment Gateway Keys (Secure Backend)
- Razorpay: Key ID + Secret
- Paytm: Merchant ID + API Key
- Stripe: Publishable Key + Secret Key
- PhonePe: Merchant ID + API Key

---

## LocalStorage Keys Used

| Key | Purpose | Format |
|-----|---------|--------|
| `userEmail` | Current user email | String |
| `username` | Current user name | String |
| `selectedLotIndex` | Index of selected parking lot | Number |
| `selectedSlots` | Array of selected slot numbers | JSON Array |
| `bookingDate` | Selected booking date | String (YYYY-MM-DD) |
| `duration` | Booking duration in hours | String |
| `totalAmount` | Total parking amount | String (number) |
| `confirmation` | Booking confirmation data | JSON Object |
| `bookingHistory` | Array of past bookings | JSON Array |
| `notificationPrefs` | User notification preferences | JSON Object |
| `adminEmail` | Admin user email (session) | String |
| `brevoApiKey` | Brevo API key (for demo) | String |
| `parkingLots` | Array of available parking lots | JSON Array |

---

## Console Log Patterns

### Success Indicators ✅
```
Customer saved with ID: [customerId]
Booking saved with ID: [bookingId]
Receipt saved: [receiptId]
Customer updated after booking
Owner earnings updated: ₹[amount]
Email to [email]: [subject]
Analytics event logged: [eventName]
```

### Error Indicators ❌
```
Error saving customer: [error]
Error saving booking: [error]
Error saving receipt: [error]
Error updating earnings: [error]
Error: [functionName] is not defined
Firebase initialization error
```

---

## Testing Common Scenarios

### ✅ Successful Booking
1. Login with any username
2. Select lot and slots
3. Choose 1-2 hour duration
4. Enter payment details
5. Check console for: "Booking saved with ID"
6. Check Firestore bookings collection

### ✅ Late Fee Calculation
1. Complete booking
2. Go to slot-exit.html
3. Set time 15 minutes after booking end
4. Click EXIT
5. See fine = ₹20 + (5 × ₹2) = ₹30

### ✅ Real-Time Updates
1. Open parking.html in 2 tabs
2. Book in Tab 1
3. Observe lot availability decrease in Tab 2

### ✅ Admin Dashboard
1. Go to admin-login.html
2. Sign up with email/password
3. Access admin-dashboard.html
4. View bookings, customers, statistics

### ✅ Notifications
1. Allow permissions when asked
2. Complete booking
3. See browser notification

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| `db is not defined` | Add `const db = firebase.firestore();` after firebase.initializeApp() |
| Firebase scripts not loading | Ensure script src is correct and placed before parking.js |
| Maps not showing | Check Google Maps API key and enable required APIs |
| Permissions denied in Firestore | Update security rules in Firebase Console |
| QR code not displaying | Verify QRCode.js CDN link is working |
| Notifications not showing | Check browser permissions and JavaScript enabled |
| Late fees not calculating | Check timestamp format (should be .toDate().getTime()) |
| Payment not processing | Verify payment gateway credentials in code |

---

## Useful Links & Resources

**Firebase**
- Console: https://console.firebase.google.com
- Firestore Docs: https://firebase.google.com/docs/firestore
- Auth Docs: https://firebase.google.com/docs/auth

**Google Maps**
- API Console: https://console.cloud.google.com
- API Docs: https://developers.google.com/maps

**Payment Gateways**
- Razorpay: https://razorpay.com/docs
- Paytm: https://developer.paytm.com
- Stripe: https://stripe.com/docs

**Email Services**
- Brevo: https://www.brevo.com
- SendGrid: https://sendgrid.com
- Twilio: https://www.twilio.com

**Frontend Tools**
- MDN Docs: https://developer.mozilla.org
- Can I Use: https://caniuse.com

---

## Developer Checklist for New Features

Before adding a new feature:
- [ ] Create function in parking.js
- [ ] Add Firestore collection if needed
- [ ] Add security rules for collection
- [ ] Add error handling and logging
- [ ] Add analytics event tracking
- [ ] Update documentation (this file)
- [ ] Test in console
- [ ] Test in browser with data
- [ ] Check Firestore for data persistence
- [ ] Verify no console errors

---

**Last Updated:** April 2026  
**Maintained By:** Smart Parking Development Team  
**Version:** 1.0
