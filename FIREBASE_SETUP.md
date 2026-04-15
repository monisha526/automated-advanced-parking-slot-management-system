# Firebase Setup & Configuration Guide

## 🔑 Firebase Project Configuration

### 1. Firebase Config Object

Your Firebase configuration should look like this (update with YOUR credentials):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDfJfJfJfJfJfJfJfJfJfJfJfJfJfJfJf",        // Your API Key
  projectId: "groundstation-494",                             // Your Project ID
  authDomain: "groundstation-494.firebaseapp.com",           // Your Auth Domain
  storageBucket: "groundstation-494.appspot.com",            // Your Storage Bucket
  messagingSenderId: "123456789",                             // Your Messaging Sender ID
  appId: "1:123456789:web:groundstation-494"                 // Your App ID
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
```

### 2. Get Your Credentials

**Steps to find your Firebase credentials:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Settings** (top right)
4. Go to **Project settings** tab
5. Scroll down to **Your apps** section
6. Select your web app or create one
7. Copy the config object
8. Paste it into your HTML files

---

## 📊 Firestore Database Structure

### Collections to Create

Your app uses these collections. They **auto-create** when data is first inserted, but you can pre-create them for organization:

#### 1. `bookings` Collection
```javascript
{
  bookingId: "BOOK-1234567890",
  lotName: "City Center Parking",
  slots: 2,
  amount: 150,
  lateFee: 0,
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "9876543210",
  entryTime: Timestamp,
  bookingEndTime: Timestamp,
  actualExitTime: null,
  paymentMethod: "razorpay",
  status: "Active",    // Active, Completed, ExitComplete
  description: "Monthly parking"
}
```

#### 2. `customers` Collection
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  phone: "9876543210",
  createdAt: Timestamp,
  totalBookings: 5,
  totalSpent: 750,
  lastBookingDate: Timestamp,
  preferredLot: "City Center Parking"
}
```

#### 3. `receipts` Collection
```javascript
{
  receiptId: "REC-1234567890",
  bookingId: "BOOK-1234567890",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  lotName: "City Center Parking",
  slots: 2,
  amount: 150,
  lateFee: 0,
  totalAmount: 150,
  paymentMethod: "razorpay",
  paymentStatus: "Success",
  bookingDate: Timestamp,
  exitDate: null,
  description: "Parking charges"
}
```

#### 4. `owners` Collection
```javascript
{
  ownerName: "Lot Owner Name",
  email: "owner@example.com",
  parkingLots: ["City Center Parking", "Airport Parking"],
  totalEarnings: 5000,
  availableBalance: 3500,
  bankAccountNumber: "XXXXXXXXXX",
  bankCode: "IFSC123456",
  createdAt: Timestamp
}
```

#### 5. `slots` Collection
```javascript
{
  lotName: "City Center Parking",
  slotNumber: "A-101",
  status: "Available",    // Available, Occupied, Reserved
  currentBookingId: null,
  reservedUntil: null,
  pricePerHour: 50,
  type: "regular"         // regular, handicap, vip
}
```

#### 6. `payouts` Collection
```javascript
{
  ownerEmail: "owner@example.com",
  amount: 1500,
  requestDate: Timestamp,
  status: "Pending",      // Pending, Approved, Completed
  bankAccount: "XXXXXXXXXX",
  transactionId: null
}
```

---

## 🔐 Firestore Security Rules

**Add these rules to your Firestore Security:**

1. Go to **Firestore Database** → **Rules** tab
2. Replace entire content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow read/write for authenticated users
    match /customers/{customerId} {
      allow read: if request.auth.uid == customerId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == customerId;
    }
    
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    match /receipts/{receiptId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    match /owners/{ownerId} {
      allow read: if request.auth.uid == ownerId;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == ownerId;
    }
    
    match /slots/{slotId} {
      allow read: if true;  // Anyone can view slots
      allow write: if request.auth != null;
    }
    
    match /payouts/{payoutId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

---

## 🔔 Enable Cloud Messaging

For push notifications:

1. Go to **Cloud Messaging** tab
2. Copy your **Server API Key** (for backend use)
3. Click **Web Configuration**
4. Add to your web app config:

```javascript
// Add to HTML before closing body
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('firebase-messaging-sw.js');
  }
</script>
```

Create file `firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging.js');

const firebaseConfig = {
  // your config here
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification.title,
    { body: payload.notification.body }
  );
});
```

---

## 📧 Email Notifications Setup

### Option 1: Brevo (Sendinblue) - Free

1. Sign up at [Brevo.com](https://www.brevo.com)
2. Create API key
3. Add to `parking.js`:

```javascript
const BREVO_API_KEY = "your-api-key-here";

async function sendEmailNotificationBrevo(email, subject, message) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { email: "noreply@parking.com", name: "Smart Parking" },
        to: [{ email: email }],
        subject: subject,
        htmlContent: message
      })
    });
    console.log('Email sent:', response.status);
  } catch (error) {
    console.error('Email error:', error);
  }
}
```

### Option 2: SendGrid

1. Sign up at [SendGrid.com](https://www.sendgrid.com)
2. Create API key
3. Use similar approach as above

---

## 📱 SMS Notifications Setup

### Using Twilio

1. Sign up at [Twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token
3. Create SMS function in `parking.js`:

```javascript
async function sendSMSNotification(phone, message) {
  // Backend call (requires Node.js server)
  // Frontend alone cannot send SMS securely
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    });
    console.log('SMS sent:', response.status);
  } catch (error) {
    console.error('SMS error:', error);
  }
}
```

---

## 📊 Analytics Setup

### Add Firebase Analytics

```html
<!-- Add to your HTML head -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-analytics.js"></script>

<script>
  const analytics = firebase.analytics();
  
  // Log events
  analytics.logEvent('parking_booked', {
    lot_name: 'City Center Parking',
    amount: 150,
    slots: 2
  });
  
  analytics.logEvent('payment_completed', {
    method: 'razorpay',
    amount: 150
  });
  
  analytics.logEvent('slot_exited', {
    lot_name: 'City Center Parking',
    late_fee: 0
  });
</script>
```

---

## 🚀 Deployment Checklist

- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Authentication enabled (Email/Password)
- [ ] Security rules published
- [ ] Firebase config updated in all HTML files
- [ ] API keys restricted to Web domain only
- [ ] Google Maps API key created and restricted
- [ ] All SDK scripts added to HTML
- [ ] Testing completed (payment flow, data storage, notifications)
- [ ] Admin dashboard accessible
- [ ] Email notifications configured
- [ ] SMS notifications configured (optional)
- [ ] Analytics events logging
- [ ] Database backups enabled
- [ ] CORS configured if needed

---

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Brevo Email API](https://developers.brevo.com/)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [Google Maps API](https://developers.google.com/maps/documentation)

---

**Last Updated:** April 2026
**Version:** 2.0
