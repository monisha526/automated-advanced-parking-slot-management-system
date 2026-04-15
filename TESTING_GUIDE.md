# Smart Parking System - Complete Testing Guide

## 📋 Table of Contents
1. [Firebase Setup](#firebase-setup)
2. [Payment Flow Testing](#payment-flow-testing)
3. [Data Verification](#data-verification)
4. [Advanced Features Testing](#advanced-features-testing)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a new project" or select existing project
3. Name: `groundstation-494` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore Database
1. In Firebase Console, go to **Build → Firestore Database**
2. Click **Create database**
3. Choose location (prefer closest to your users)
4. Select **Start in test mode** (for testing only)
5. Click **Create**

### Step 3: Enable Authentication
1. Go to **Build → Authentication**
2. Click **Get Started**
3. Enable these providers:
   - Email/Password
   - Google (optional)
   - Phone (optional)

### Step 4: Set Up Firestore Collections
Your app will auto-create these collections when data is inserted:
- `customers` - Customer profiles
- `bookings` - Parking bookings
- `receipts` - Billing receipts
- `owners` - Parking lot owners
- `slots` - Individual parking slots
- `payouts` - Owner payouts
- `notifications` - System notifications

---

## 🚗 Payment Flow Testing

### Test Scenario 1: Complete Booking Flow

**Steps:**
1. Open `parking.html` in browser
2. Login with any username/password (e.g., `testuser`/`password123`)
3. Click "Find Nearby Parking"
4. Select a parking lot (e.g., "City Center Parking")
5. Click "Book Now"
6. Select slots and booking date
7. Click "Prepare Payment"
8. Fill payment details:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Payment Method: `Razorpay`
   - UPI ID: `john@upi`
9. Click "Pay Now"
10. Confirm payment processing

**Expected Data in Firestore:**

```
bookings/{bookingId}
├── lotName: "City Center Parking"
├── slots: 1
├── amount: 150
├── customerName: "John Doe"
├── customerEmail: "john@example.com"
├── entryTime: {timestamp}
├── bookingEndTime: {timestamp + duration}
├── status: "Active"
├── lateFee: 0

customers/{customerId}
├── name: "John Doe"
├── email: "john@example.com"
├── createdAt: {timestamp}
├── totalBookings: 1
├── totalSpent: 150

receipts/{receiptId}
├── receiptId: "REC-1639587234567"
├── customerName: "John Doe"
├── customerEmail: "john@example.com"
├── lotName: "City Center Parking"
├── amount: 150
├── paymentMethod: "razorpay"
├── bookingDate: {timestamp}
```

### Test Scenario 2: Overstay Fine Calculation

**Steps:**
1. Complete booking (Scenario 1)
2. Go to confirmation page
3. Click "Exit Parking"
4. Verify booking details are loaded
5. Wait for timer to count down (or manually test)
6. Click "EXIT VEHICLE"

**Expected Data Update:**

```
bookings/{bookingId}
├── actualExitTime: {current timestamp}
├── lateFee: 40 (if overstayed 10+ minutes)
├── totalAmount: 190 (150 + 40)
├── status: "Completed"
```

---

## ✅ Data Verification

### Check Firestore Console

1. **In Firebase Console:**
   - Go to **Firestore Database**
   - Click on `bookings` collection
   - Inspect document structure
   - Verify all fields are populated

2. **View Customer Data:**
   - Click on `customers` collection
   - Verify `totalBookings` incremented
   - Verify `totalSpent` updated

3. **Check Receipts:**
   - Click on `receipts` collection
   - Verify receipt data saved correctly
   - Check `receiptId` format: `REC-{timestamp}`

### Console Logs to Monitor

Open **Browser DevTools (F12)** and check Console tab:

```
✅ Success Messages:
- "Customer saved with ID: abc123"
- "Booking saved with ID: xyz789"
- "Receipt saved: receipt-id"
- "Customer updated after booking"

❌ Error Messages to Fix:
- "Error saving customer: [error]"
- "Error saving booking: [error]"
- "Firebase initialization error"
```

---

## 🚀 Advanced Features Testing

### 1. Email Notifications

**Test Setup:**
- Need Firebase Cloud Functions or SendGrid integration
- Current implementation logs emails to console (development mode)

**Test Email Notification:**
```javascript
// Run in browser console after payment:
sendEmailNotification(
  'john@example.com',
  'Parking Booking Confirmed',
  'Your slot is confirmed. Amount: ₹150'
);
```

**Expected Output in Console:**
```
Email to john@example.com: Parking Booking Confirmed - Your slot is confirmed...
```

### 2. Browser Notifications

**Test Setup:**
1. Allow notifications when browser asks
2. Complete a booking

**Expected Result:**
- Browser notification appears: "Parking Booked Successfully!"
- Shows lot name and amount

**Test in Console:**
```javascript
requestNotificationPermission();
sendBookingNotification({
  lotName: "City Center Parking",
  amount: 150
});
```

### 3. Real-time Slot Updates

**Test Setup:**
1. Open parking.html in two browser tabs
2. In Tab 1: Book a slot
3. In Tab 2: Observe slots count decrease in real-time

**Expected Result:**
- Slot availability updates instantly
- No page refresh needed

---

## 🔍 Troubleshooting

### Issue 1: Firebase not initialized error

**Error:** `db is not defined`

**Fix:**
```javascript
// Verify in parking.js:
const db = firebase.firestore(); // Must exist
```

Check that Firebase SDK scripts are loaded in HTML:
```html
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
```

### Issue 2: Permission denied error in Firestore

**Error:** `Missing or insufficient permissions`

**Fix:** Update Firestore security rules (see rules below)

### Issue 3: Data not appearing in Firestore

**Reasons:**
- Firebase not initialized before DOM loads
- Collection name mismatch
- Async operations not completing

**Fix:**
```javascript
// Add error handling:
db.collection("bookings").add(data)
  .then(docRef => console.log("Success:", docRef.id))
  .catch(error => console.error("Error:", error.message));
```

### Issue 4: Notifications not showing

**Check:** Browser has allowed notifications
```javascript
// In console:
Notification.permission // Should be "granted"
```

---

## 📊 Firestore Security Rules

**Add these rules to Firestore:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow reads for authenticated users
    match /customers/{customerId} {
      allow read, write: if request.auth.uid == customerId;
    }
    
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null;
    }
    
    match /receipts/{receiptId} {
      allow read, write: if request.auth != null;
    }
    
    match /owners/{ownerId} {
      allow read, write: if request.auth.uid == ownerId;
    }
    
    match /slots/{slotId} {
      allow read: if true; // Anyone can view slots
      allow write: if request.auth != null;
    }
  }
}
```

---

## ✨ Testing Checklist

- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Authentication enabled
- [ ] Firebase SDK loaded in all HTML files
- [ ] Payment flow completes without errors
- [ ] Booking data appears in `bookings` collection
- [ ] Customer data appears in `customers` collection
- [ ] Receipt data appears in `receipts` collection
- [ ] Browser notifications work
- [ ] Email notifications logged (console)
- [ ] Slot availability updates in real-time
- [ ] Late fees calculated correctly on exit
- [ ] Confirmation page loads booking data
- [ ] Admin dashboard shows all bookings (future feature)
- [ ] No console errors

---

## 📞 Support

For issues, check:
1. Browser console (F12 → Console tab)
2. Firebase Console → Firestore → check data
3. Network tab → verify API calls succeed
4. Verify Firebase config matches your project credentials

**Next Steps:**
- Implement email notifications with SendGrid
- Create admin dashboard
- Set up SMS alerts
- Deploy to production

