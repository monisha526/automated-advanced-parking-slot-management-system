# 🚀 Advanced Features Integration Guide

## Overview

This guide explains how to use and integrate the 7 advanced features added to Smart Parking System:

1. ✅ **Email Notifications** - Brevo API integration
2. ✅ **SMS Notifications** - Twilio backend setup
3. ✅ **Analytics Tracking** - Event logging
4. ✅ **Audit Logging** - Action tracking
5. ✅ **Error Reporting** - Error tracking
6. ✅ **Customer Feedback** - Rating collection
7. ✅ **Notification Preferences** - User preferences

---

## 1. 📧 Email Notifications

### What It Does
Sends beautiful HTML-formatted emails to users for:
- Booking confirmations
- Receipts
- Custom notifications

### Where It's Implemented
- **File**: `parking.js` (lines 1040-1105)
- **Functions**:
  - `sendEmailViaBrevo()` - Sends emails
  - `getBookingConfirmationEmail()` - Email template
  - `getReceiptEmail()` - Receipt template
  - `sendEmailNotification()` - Default notification

### How to Use It

#### 1. Get Brevo API Key
```
1. Sign up at https://www.brevo.com
2. Go to Settings → SMTP & API
3. Create API key
4. Copy the key (starts with xkeysib-)
```

#### 2. Store API Key
**In Browser Console:**
```javascript
localStorage.setItem('brevoApiKey', 'xkeysib-xxxxxxxxxxxxx');
localStorage.setItem('senderEmail', 'noreply@yourcompany.com');
```

**Or Use Settings Page:**
- Go to `settings.html`
- Enter Brevo API Key
- Enter sender email
- Click "Save Settings"

#### 3. Send Email
```javascript
// In your code:
const bookingData = {
  customerName: "John Doe",
  lotName: "City Center",
  duration: "2 hours",
  amount: 150,
  bookingId: "BOOK-123"
};

const htmlEmail = getBookingConfirmationEmail(bookingData);
sendEmailViaBrevo('john@example.com', 'Booking Confirmed', htmlEmail);
```

#### 4. Test Email
```javascript
// Send yourself a test email
testBrevoEmail();
```

### After Booking
```javascript
// Automatically called in payOnline():
const htmlTemplate = getBookingConfirmationEmail(bookingData);
sendEmailViaBrevo(payerEmail, 'Parking Booking Confirmed', htmlTemplate);
```

### Console Output
```
Email sent successfully via Brevo
Analytics event logged: email_sent_brevo
```

### Firestore Record
**Collection:** `customer_outreach` (optional to create)
```javascript
{
  recipient: "john@example.com",
  subject: "Parking Booking Confirmed",
  sentAt: Timestamp,
  status: "delivered"
}
```

---

## 2. 📱 SMS Notifications

### What It Does
Sends SMS text messages for:
- Booking confirmations
- Exit reminders
- Payment confirmations

### Where It's Implemented
- **File**: `parking.js` (lines 1120-1130)
- **Function**: `sendSMSViaTwilio()`

### Why Backend is Required
⚠️ **Security Note:** You CANNOT call Twilio directly from frontend (would expose credentials).  
✅ **Solution:** Use Firebase Cloud Function (backend)

### How to Set Up

#### Step 1: Create Twilio Account
```
1. Sign up at https://www.twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number for SMS
```

#### Step 2: Create Firebase Cloud Function
**Create file:** `functions/send-sms.js`

```javascript
const functions = require('firebase-functions');
const twilio = require('twilio');

// Initialize Twilio
const account_sid = 'your-account-sid';
const auth_token = 'your-auth-token';
const client = twilio(account_sid, auth_token);
const from_number = '+1234567890'; // Your Twilio number

exports.sendSMS = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { phone, message } = data;

  try {
    const result = await client.messages.create({
      body: message,
      from: from_number,
      to: phone
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### Step 3: Deploy Function
```bash
cd functions
npm install twilio
firebase deploy --only functions
```

#### Step 4: Call from Frontend
```javascript
// In parking.js:
firebase.functions().httpsCallable('sendSMS')({
  phone: '+919876543210',
  message: 'Parking slot booked at City Center for 2 hours. Amount: ₹150'
})
.then(result => {
  console.log('SMS sent:', result.data.sid);
  logAnalyticsEvent('sms_sent', { recipient: phone });
})
.catch(error => {
  console.error('SMS error:', error.message);
  reportError('SMS_ERROR', error.message);
});
```

### Usage Example
```javascript
// Send SMS on booking
function onBookingSuccess(bookingData) {
  const message = `✓ Parking booked at ${bookingData.lotName} for ${bookingData.duration}. 
Amount: ₹${bookingData.amount}. 
Ref: ${bookingData.bookingId}`;
  
  sendSMSViaTwilio(customerPhone, message);
}
```

---

## 3. 📊 Analytics Tracking

### What It Does
Tracks user actions and bookings in Firebase Analytics:
- Booking creation
- Payment completion
- Parking exits
- Late fee charges
- Email sends
- Feedback submissions

### Where It's Implemented
- **File**: `parking.js` (lines 1140-1180)
- **Functions**:
  - `logAnalyticsEvent()` - Core logging
  - `trackBookingEvent()`
  - `trackPaymentEvent()`
  - `trackExitEvent()`
  - `trackLateFeEvent()`

### How to Use It

#### 1. Enable Analytics in Firebase
```
1. Go to Firebase Console → Analytics
2. Analytics is auto-enabled with Firebase SDK
3. Wait 24 hours for data to appear
```

#### 2. Log Custom Events Anywhere
```javascript
// Simple event
logAnalyticsEvent('custom_event');

// Event with data
logAnalyticsEvent('parking_booked', {
  lot_name: 'City Center',
  amount: 150,
  slots: 2,
  duration: '2 hours',
  payment_method: 'razorpay'
});
```

#### 3. View in Firebase Console
```
Firebase Console → Analytics → Custom Events
(Wait 24 hours for data to populate)
```

### Automatic Events Logged

**When Booking Created:**
```javascript
logAnalyticsEvent('parking_booked', {
  lot_name: "City Center Parking",
  amount: 150,
  slots: 2,
  duration: "2 hours",
  payment_method: "razorpay"
});
```

**When Payment Processed:**
```javascript
logAnalyticsEvent('payment_completed', {
  amount: 150,
  gateway: "razorpay",
  customer_email: "john@example.com"
});
```

**When Exit Recorded:**
```javascript
logAnalyticsEvent('parking_exit', {
  lot_name: "City Center Parking",
  late_fee: 40,
  overstay_minutes: 15,
  total_amount: 190
});
```

**When Late Fee Applied:**
```javascript
logAnalyticsEvent('late_fee_charged', {
  booking_id: "BOOK-123",
  fine_amount: 40,
  overstay_duration: "15 minutes"
});
```

### Console Output
```
Analytics event logged: parking_booked {
  lot_name: "City Center Parking",
  amount: 150,
  ...
}
```

---

## 4. 📋 Audit Logging

### What It Does
Logs all user actions for security and compliance:
- Payment attempts
- Booking creations
- Slot exits
- Admin access
- Data modifications

### Where It's Implemented
- **File**: `parking.js` (lines 1230-1255)
- **Functions**:
  - `logUserAction()` - Main logger
  - `logPaymentAction()`
  - `logBookingAction()`

### How to Use It

#### 1. Log Action
```javascript
// Simple log
logUserAction('booking_created', {
  lot: "City Center",
  slots: 2,
  amount: 150
});

// Automatic logging
logPaymentAction({
  gateway: 'razorpay',
  amount: 150,
  customerName: 'John Doe'
});
```

#### 2. View Logs in Firestore
```
Firebase Console 
→ Firestore Database 
→ Collection: audit_logs
```

#### 3. Each Log Contains
```javascript
{
  action: "payment_processing",
  details: {
    gateway: "razorpay",
    amount: 150,
    customer: "John Doe"
  },
  timestamp: "2026-04-15T10:30:00Z",
  userEmail: "john@example.com"
}
```

### Query Recent Logs
```javascript
db.collection('audit_logs')
  .where('userEmail', '==', 'john@example.com')
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log(doc.data());
    });
  });
```

---

## 5. 🐛 Error Reporting

### What It Does
Automatically captures and tracks errors:
- Error messages
- Stack traces
- Browser information
- User context
- Timestamp

### Where It's Implemented
- **File**: `parking.js` (lines 1260-1280)
- **Function**: `reportError()`

### How to Use It

#### 1. Report Error
```javascript
try {
  // Your code
  db.collection('bookings').add(data);
} catch (error) {
  reportError('BOOKING_ERROR', error.message, {
    lotName: 'City Center',
    amount: 150
  });
}
```

#### 2. Automatic Error Capture
```javascript
// In catch blocks throughout parking.js:
.catch(error => {
  reportError('FIRESTORE_ERROR', error.message, {
    collection: 'bookings',
    operation: 'add'
  });
});
```

#### 3. View Errors in Firestore
```
Firebase Console 
→ Firestore Database 
→ Collection: error_logs
```

#### 4. Error Record Structure
```javascript
{
  code: "BOOKING_ERROR",
  message: "Failed to save booking",
  context: {
    lotName: "City Center",
    amount: 150
  },
  timestamp: "2026-04-15T10:30:00Z",
  url: "http://localhost/payment.html",
  userAgent: "Mozilla/5.0..."
}
```

### Query Errors by Code
```javascript
db.collection('error_logs')
  .where('code', '==', 'BOOKING_ERROR')
  .orderBy('timestamp', 'desc')
  .limit(50)
  .get()
  .then(snapshot => {
    console.log(`Found ${snapshot.size} errors`);
  });
```

---

## 6. 😊 Customer Feedback

### What It Does
Collects customer ratings and comments:
- 5-star rating system
- Optional comments
- Email tracking
- Timestamp recording

### Where It's Implemented
- **File**: `parking.js` (lines 1290-1315)
- **Function**: `submitFeedback()`
- **UI Page**: `settings.html` (Feedback section)

### How to Use It

#### 1. Show Feedback Form
```html
<div>
  <label>Rate Your Experience:</label>
  <select id="feedbackRating">
    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
    <option value="4">⭐⭐⭐⭐ Very Good</option>
    <option value="3">⭐⭐⭐ Good</option>
    <option value="2">⭐⭐ Needs Improvement</option>
    <option value="1">⭐ Poor</option>
  </select>

  <label>Comments:</label>
  <textarea id="feedbackComment" placeholder="Tell us..."></textarea>

  <button onclick="submitFeedback()">Submit</button>
</div>
```

#### 2. Submit Feedback
```javascript
// From JavaScript
const rating = 5;
const comment = "Great service!";
const email = localStorage.getItem('userEmail');

const feedback = {
  rating: rating,
  comment: comment,
  customerEmail: email,
  timestamp: new Date().toISOString()
};

db.collection('customer_feedback').add(feedback)
  .then(() => {
    console.log('Feedback submitted');
    logAnalyticsEvent('feedback_submitted', { rating: rating });
  });
```

#### 3. View Feedback in Firestore
```
Firebase Console 
→ Firestore Database 
→ Collection: customer_feedback
```

#### 4. Feedback Record
```javascript
{
  rating: 5,
  comment: "Excellent parking experience!",
  customerEmail: "john@example.com",
  timestamp: "2026-04-15T10:30:00Z"
}
```

### Get Feedback Statistics
```javascript
// Get all feedback for a customer
db.collection('customer_feedback')
  .where('customerEmail', '==', 'john@example.com')
  .get()
  .then(snapshot => {
    let ratings = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    snapshot.forEach(doc => {
      ratings[doc.data().rating]++;
    });
    console.log('Rating breakdown:', ratings);
  });
```

---

## 7. ⚙️ Notification Preferences

### What It Does
Allows users to customize notification settings:
- Email notifications on/off
- SMS notifications on/off
- Push notifications on/off
- Analytics tracking on/off
- Audit logging on/off

### Where It's Implemented
- **File**: `parking.js` (lines 1190-1215)
- **Functions**:
  - `saveNotificationPreferences()`
  - `getNotificationPreferences()`
- **UI Page**: `settings.html` (whole page)

### How to Use It

#### 1. Save User Preferences
```javascript
const preferences = {
  email: true,
  sms: false,
  push: true,
  analytics: true,
  audit: true
};

saveNotificationPreferences(preferences);
```

#### 2. Get User Preferences
```javascript
const prefs = getNotificationPreferences();

if (prefs.emailNotifications) {
  // Send email
}

if (prefs.smsNotifications) {
  // Send SMS
}

if (prefs.pushNotifications) {
  // Send push notification
}
```

#### 3. Settings Page UI
**Go to:** `settings.html`

Features:
- Toggle notification types
- Configure email (Brevo)
- Configure SMS (Twilio)
- Test email sending
- View audit logs
- Submit feedback
- Feature status dashboard

#### 4. Firestore Storage
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  notificationPreferences: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    analyticsEnabled: true,
    auditEnabled: true,
    errorTrackingEnabled: true,
    savedAt: "2026-04-15T10:30:00Z"
  }
}
```

#### 5. Check Preferences Before Sending
```javascript
// Before sending notification
const prefs = getNotificationPreferences();

if (prefs.emailNotifications) {
  sendEmailViaBrevo(email, subject, htmlTemplate);
}

if (prefs.smsNotifications) {
  firebase.functions().httpsCallable('sendSMS')({
    phone: phone,
    message: message
  });
}

if (prefs.pushNotifications) {
  showBrowserNotification(title, body);
}
```

---

## Complete Integration Example

### Full Booking Flow with All Features

```javascript
function handleBookingComplete(bookingData) {
  const prefs = getNotificationPreferences();
  
  // 1. Log the booking
  logBookingAction(bookingData);
  
  // 2. Track analytics
  trackBookingEvent(bookingData);
  
  // 3. Save to Firestore
  saveBooking(bookingData);
  
  // 4. Send email if enabled
  if (prefs.emailNotifications) {
    const emailHTML = getBookingConfirmationEmail(bookingData);
    sendEmailViaBrevo(
      bookingData.customerEmail,
      'Parking Booking Confirmed',
      emailHTML
    );
  }
  
  // 5. Send SMS if enabled
  if (prefs.smsNotifications) {
    firebase.functions().httpsCallable('sendSMS')({
      phone: bookingData.customerPhone,
      message: `✓ Parking booked at ${bookingData.lotName} for ${bookingData.duration}`
    });
  }
  
  // 6. Push notification
  if (prefs.pushNotifications) {
    sendBookingNotification(bookingData);
  }
  
  // 7. Redirect
  window.location.href = 'confirmation.html';
}
```

---

## Integration Checklist

- [ ] Set up Brevo account & get API key
- [ ] Store Brevo key in localStorage
- [ ] Test email sending with `testBrevoEmail()`
- [ ] Set up Twilio account & Firebase Function
- [ ] Create SMS Firebase Cloud Function
- [ ] Deploy function with `firebase deploy`
- [ ] Enable Firebase Analytics in console
- [ ] Verify audit logs in Firestore
- [ ] Verify error logs in Firestore
- [ ] Add feedback form to pages
- [ ] Create settings.html page (✅ DONE)
- [ ] Configure your Firebase project
- [ ] Test all features end-to-end

---

## Testing Commands

**In Browser Console:**

```javascript
// Test email
testBrevoEmail();

// Test analytics
logAnalyticsEvent('test_event', { test: true });

// Test audit log
logUserAction('test_action', { test: true });

// Test error report
reportError('TEST_ERROR', 'This is a test');

// View preferences
console.log(getNotificationPreferences());

// Save test preferences
saveNotificationPreferences({
  email: true,
  sms: false,
  push: true,
  analytics: true,
  audit: true
});

// View audit logs
db.collection('audit_logs').orderBy('timestamp', 'desc').limit(10).get()
  .then(s => console.table(s.docs.map(d => d.data())));
```

---

## Support & Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check Brevo API key, verify sender email |
| SMS not sending | Deploy Firebase Function, check Twilio credentials |
| Analytics not showing | Wait 24 hours, check Firebase config |
| Audit logs empty | Check user is logged in, check Firestore rules |
| Errors not being tracked | Enable error tracking in settings.html |
| Preferences not saving | Verify user is authenticated |

---

**Last Updated:** April 2026  
**Version:** Final  
**Status:** Ready for Production
