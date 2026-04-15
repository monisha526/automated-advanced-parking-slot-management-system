// ============ AI CHAT KNOWLEDGE BASE ============
const chatKnowledgeBase = {
  // Booking Related Questions
  booking: [
    {
      keywords: ['book', 'booking', 'reserve', 'how do i book'],
      response: `📍 **How to Book a Parking Spot:**

1. **Login** to your account (or sign up if new)
2. **Select Location** - Choose your desired parking area on the map
3. **Pick a Slot** - Click on available green slots
4. **Set Duration** - Enter your parking duration
5. **Confirm** - Review booking details
6. **Payment** - Choose payment method and complete transaction
7. **Confirmation** - You'll get booking details and QR code

**Pro Tip:** Book at least 15 minutes before arrival for better slot selection!`
    }
  ],

  payment: [
    {
      keywords: ['payment', 'pay', 'how to pay', 'payment methods', 'gateway', 'credit card', 'debit card', 'upi', 'wallet'],
      response: `💳 **Available Payment Methods:**

1. **Credit/Debit Card** - Visa, Mastercard, RuPay
2. **UPI** - Google Pay, PhonePe, Paytm
3. **Digital Wallet** - Amazon Pay, Paytm Wallet
4. **Net Banking** - All major Indian banks
5. **Mobile Wallet** - Airtel Money, JioMoney
6. **AEPS** - Using ATM card

All payments are processed through **secure gateways** with SSL encryption. Your transaction is 100% safe! 🔒`
    }
  ],

  lateFees: [
    {
      keywords: ['late fee', 'overstay', 'fine', 'penalty', 'charge', 'exceed', 'overtime'],
      response: `⏰ **Late Fee Structure:**

**Minimum Charge:** ₹20 for up to 10 minutes of overstay
**Additional Rate:** ₹2 per minute after 10 minutes

**Example:**
- Booked until 5:00 PM, leave at 5:15 PM
- Overstay: 15 minutes
- Late Fee: ₹20 (minimum charge)

- Booked until 5:00 PM, leave at 5:45 PM
- Overstay: 45 minutes
- Late Fee: ₹20 + (35 × ₹2) = ₹90

**Tip:** Set a phone reminder before your booking ends to avoid late fees! ⏱️`
    }
  ],

  cancellation: [
    {
      keywords: ['cancel', 'cancellation', 'refund', 'how to cancel', 'cancel booking'],
      response: `❌ **Cancellation Policy:**

**Up to 30 minutes before booking:**
- ✅ Full refund (100%)

**15-30 minutes before booking:**
- 💰 80% refund, 20% cancellation fee

**0-15 minutes before booking:**
- 💰 50% refund, 50% cancellation fee

**After booking started:**
- ❌ No refund

**How to Cancel:**
1. Go to "My Bookings"
2. Select active booking
3. Click "Cancel Booking"
4. Confirm cancellation

Refunds are processed within 3-5 business days!`
    }
  ],

  // Account & Login
  account: [
    {
      keywords: ['login', 'sign up', 'register', 'account', 'password', 'forgot password', 'reset password'],
      response: `🔐 **Account Management:**

**Signing Up:**
1. Click "Get Started" on home page
2. Enter email and create password
3. Verify OTP sent to your email
4. Set your profile details
5. Ready to book!

**Forgot Password:**
1. Click "Forgot Password" on login page
2. Enter your email
3. Click "Reset" button in verification email
4. Create new password
5. Login with new password

**Update Profile:**
- Go to Settings (gear icon)
- Update name, phone, preferences
- Changes save automatically ✅`
    }
  ],

  // Location & Maps
  location: [
    {
      keywords: ['location', 'find', 'maps', 'where', 'available spots', 'search', 'gps'],
      response: `🗺️ **Finding Parking Near You:**

**Using the Map:**
1. Allow location access when prompted
2. Your location appears as a blue dot
3. Parking zones shown in different colors:
   - 🟢 Green = Available spots
   - 🔴 Red = Occupied
   - 🟠 Orange = Reserved (yours)

**Current Status:**
- Real-time availability updates every 30 seconds
- Shows distance to each parking zone
- Filter by price range or amenities

**Pro Tips:**
- Search off-peak hours (12-3 PM) for more options
- Subscribe for area notifications
- Book nearby alternatives if preferred spot full`
    }
  ],

  // QR Code & Exit
  qrcode: [
    {
      keywords: ['qr code', 'exit', 'slot exit', 'how to exit', 'leave parking', 'scan qr'],
      response: `🔲 **QR Code & Exit Process:**

**Getting Your QR Code:**
- Shown immediately after booking confirmation
- Sent via email & SMS
- Available in "My Bookings" section

**Exiting the Parking:**
1. Go to "Slot Exit" page
2. Scan your booking QR code
3. Or click "Exit Without Scan"
4. Confirm exit time
5. If overstay detected, pay late fee
6. Exit receipt generated

**Parking Exit Booths:**
- Scan QR at exit gate
- Barrier automatically opens
- Fast exit (usually <10 seconds)

**Note:** Always exit before booking time to avoid late charges! ⏰`
    }
  ],

  // Ratings & Reviews
  reviews: [
    {
      keywords: ['rating', 'review', 'feedback', 'rate', 'quality'],
      response: `⭐ **Rate Your Experience:**

After every booking, you can rate:
- **Spot Cleanliness** 🧹
- **Safety & Security** 🔒
- **Location Accuracy** 📍
- **Ease of Booking** ✅

**Earn Rewards:**
- Write detailed review → +50 points
- Rate parking → +10 points
- Refer friend → +200 points

**Your Feedback Helps Us:**
- Improve service quality
- Fix issues faster
- Reward good parking zones

Every review matters! 💙`
    }
  ],

  // General Help
  general: [
    {
      keywords: ['help', 'support', 'issue', 'problem', 'contact', 'reach', 'emergency'],
      response: `🆘 **Need More Help?**

**Immediate Support:**
- 📞 Call us: 1-800-PARKING (1-800-727-5464)
- 💬 Chat with agent (business hours)
- 📧 Email: support@smartparking.com

**Common Issues & Solutions:**

1. **Booking not confirmed?**
   - Check internet connection
   - Refresh page
   - Try different payment method

2. **Payment failed?**
   - Verify card details
   - Check account balance
   - Try UPI or net banking

3. **Can't find spot?**
   - Expand search radius
   - Adjust duration
   - Try nearby zones

4. **Lost QR code?**
   - Check email/SMS
   - Open "My Bookings"
   - Book reference number works too

**Emergency?** Call +91-0-EMERGENCY for assistance!`
    }
  ]
};

// Flatten knowledge base for search
const flattenedKB = [];
Object.values(chatKnowledgeBase).forEach(category => {
  flattenedKB.push(...category);
});

/**
 * Find best matching response from knowledge base
 */
function findMatchingResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  let bestMatch = null;
  let highestScore = 0;

  for (const item of flattenedKB) {
    for (const keyword of item.keywords) {
      const keywordLower = keyword.toLowerCase();
      // Calculate match score
      if (lowerMessage.includes(keywordLower)) {
        const score = keywordLower.split(' ').length; // Longer matches score higher
        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      }
    }
  }

  return bestMatch || null;
}

/**
 * Generate default response if no match found
 */
function generateDefaultResponse(userMessage) {
  const responses = [
    `I understand you asked: "${userMessage}". \n\nWhile I don't have specific information about that, I can help with:
    \n✅ How to book parking
    \n✅ Payment methods
    \n✅ Late fee calculations
    \n✅ Cancellation policy
    \n✅ QR code & exit process
    \n\nWhat would you like to know?`,
    
    `That's a great question! 🤔 
    \nI'm still learning about all aspects of our service. For specific questions about "${userMessage}", please:
    \n📞 Call support: 1-800-PARKING
    \n📧 Email: support@smartparking.com
    \n💬 Chat with live agent
    \n\nCan I help with anything else?`,

    `I found your question interesting: "${userMessage}"
    \nWhile I don't have direct info on that, here are things I CAN help with:
    \n• Booking procedures
    \n• Payment & refunds
    \n• Late fees
    \n• Account management
    \n\nAsk me anything about these topics! 😊`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Send message and get AI response
 */
async function sendMessage(customMessage = null) {
  const messageInput = document.getElementById('messageInput');
  const messagesContainer = document.getElementById('messagesContainer');

  const message = customMessage || messageInput.value.trim();

  if (!message) return;

  // Clear input
  messageInput.value = '';

  // Add user message to chat
  addMessageToChat(message, 'user');

  // Show typing indicator
  const typingId = showTypingIndicator();

  // Simulate AI thinking (500ms delay)
  await new Promise(resolve => setTimeout(resolve, 500));

  // Remove typing indicator
  removeTypingIndicator(typingId);

  // Get response
  const response = await generateAIResponse(message);

  // Add bot response
  addMessageToChat(response, 'bot');

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Generate AI response
 */
async function generateAIResponse(userMessage) {
  // Try knowledge base first
  const match = findMatchingResponse(userMessage);
  if (match) {
    return match.response;
  }

  // Return default response
  return generateDefaultResponse(userMessage);
}

/**
 * Add message to chat display
 */
function addMessageToChat(text, sender) {
  const messagesContainer = document.getElementById('messagesContainer');

  // Remove empty state if exists
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = text; // Allows markdown-like formatting

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const messagesContainer = document.getElementById('messagesContainer');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  messageDiv.id = 'typing-indicator';

  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  messageDiv.appendChild(typingDiv);
  messagesContainer.appendChild(messageDiv);

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return 'typing-indicator';
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(id) {
  const element = document.getElementById(id);
  if (element) element.remove();
}

/**
 * Floating Chat Widget (for other pages)
 */
function createFloatingChatWidget() {
  // Create widget HTML
  const widgetHTML = `
    <div id="floatingChatWidget" class="floating-chat-widget">
      <div id="chatWidgetToggle" class="chat-widget-toggle" onclick="toggleChatWidget()">
        <span id="chatWidgetIcon">💬</span>
      </div>
      <div id="chatWidgetPanel" class="chat-widget-panel" style="display: none;">
        <div class="chat-widget-header">
          <h3>Chat Support</h3>
          <button onclick="toggleChatWidget()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <div id="chatWidgetMessages" class="chat-widget-messages"></div>
        <div class="chat-widget-input">
          <input 
            type="text" 
            id="chatWidgetInput" 
            placeholder="Ask something..."
            onkeypress="if(event.key==='Enter') sendWidgetMessage()"
          >
          <button onclick="sendWidgetMessage()">→</button>
        </div>
      </div>
    </div>
  `;

  // Create styles
  const widgetStyles = `
    <style>
      .floating-chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        z-index: 9999;
      }

      .chat-widget-toggle {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        font-size: 28px;
        transition: all 0.3s;
        border: none;
      }

      .chat-widget-toggle:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
      }

      .chat-widget-panel {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 450px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .chat-widget-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chat-widget-header h3 {
        margin: 0;
        font-size: 16px;
      }

      .chat-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        background: #f8f9fa;
      }

      .chat-widget-message {
        margin-bottom: 10px;
        display: flex;
        animation: slideIn 0.3s ease;
      }

      .chat-widget-message.user {
        justify-content: flex-end;
      }

      .chat-widget-message-content {
        max-width: 75%;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 13px;
        word-wrap: break-word;
      }

      .chat-widget-message.bot .chat-widget-message-content {
        background: white;
        color: #333;
        border-left: 3px solid #667eea;
      }

      .chat-widget-message.user .chat-widget-message-content {
        background: #667eea;
        color: white;
      }

      .chat-widget-input {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #eee;
        background: white;
        border-radius: 0 0 12px 12px;
      }

      .chat-widget-input input {
        flex: 1;
        border: 1px solid #ddd;
        border-radius: 15px;
        padding: 8px 12px;
        font-size: 13px;
        outline: none;
      }

      .chat-widget-input input:focus {
        border-color: #667eea;
      }

      .chat-widget-input button {
        background: #667eea;
        color: white;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .chat-widget-input button:hover {
        background: #764ba2;
      }

      @media (max-width: 480px) {
        .chat-widget-panel {
          width: 90vw;
          max-width: 350px;
        }
      }
    </style>
  `;

  // Insert into page
  document.body.insertAdjacentHTML('beforeend', widgetHTML + widgetStyles);

  // Initialize with welcome message
  const chatMessages = document.getElementById('chatWidgetMessages');
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'chat-widget-message bot';
  welcomeDiv.innerHTML = `
    <div class="chat-widget-message-content">
      Hi! 👋 How can I help?
    </div>
  `;
  chatMessages.appendChild(welcomeDiv);
}

/**
 * Toggle floating chat widget
 */
function toggleChatWidget() {
  const panel = document.getElementById('chatWidgetPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    if (panel.style.display === 'flex') {
      document.getElementById('chatWidgetInput').focus();
    }
  }
}

/**
 * Send message in floating widget
 */
async function sendWidgetMessage() {
  const input = document.getElementById('chatWidgetInput');
  const message = input.value.trim();

  if (!message) return;

  const chatMessages = document.getElementById('chatWidgetMessages');

  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-widget-message user';
  userMsg.innerHTML = `
    <div class="chat-widget-message-content">${message}</div>
  `;
  chatMessages.appendChild(userMsg);

  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Get response
  const response = await generateAIResponse(message);

  // Add bot message
  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-widget-message bot';
    botMsg.innerHTML = `
      <div class="chat-widget-message-content">${response}</div>
    `;
    chatMessages.appendChild(botMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 300);
}

// Auto-create floating widget on page load (for main pages)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Only create widget if we're not on the full chat page
    if (!window.location.pathname.includes('ai-chat.html')) {
      createFloatingChatWidget();
    }
  });
} else {
  // If script loads after DOM is ready
  if (!window.location.pathname.includes('ai-chat.html')) {
    createFloatingChatWidget();
  }
}
