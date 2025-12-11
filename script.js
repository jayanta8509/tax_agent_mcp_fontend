// Global variables
let userData = null;
const API_BASE_URL = 'https://arsalaanrasultax.bestworks.cloud';

// DOM elements
const loginSection = document.getElementById('loginSection');
const chatSection = document.getElementById('chatSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const newChatBtn = document.getElementById('newChatBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const chatHistory = document.getElementById('chatHistory');
const chatTitle = document.getElementById('chatTitle');

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    newChatBtn.addEventListener('click', startNewChat);
    sendBtn.addEventListener('click', sendMessage);

    // Handle textarea auto-resize
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// Login functionality
async function handleLogin(e) {
    e.preventDefault();

    const formData = new FormData(loginForm);
    userData = {
        user_id: formData.get('userId'),
        client_id: parseInt(formData.get('clientId')),
        reference: formData.get('reference')
    };

    // Validate input
    if (!userData.user_id || !userData.client_id || !userData.reference) {
        showError('Please fill in all fields');
        return;
    }

    // Show chat section
    showChatInterface();
    addChatToHistory('New Chat');

    // Show loading message
    const loadingId = 'loading-welcome';
    addMessage('agent', '<div class="loading"></div> Loading...', loadingId);

    try {
        // Call welcome API
        const response = await fetch(`${API_BASE_URL}/welcome/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userData.user_id,
                client_id: userData.client_id,
                reference: userData.reference
            })
        });

        // Remove loading message
        removeMessage(loadingId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Add personalized welcome message
        addMessage('agent', data.response.welcome_message, null, true);

        // Store additional user info if needed
        userData.reference_id = data.response.reference_id;
        userData.first_name = data.response.first_name;
        localStorage.setItem('taxAgentUserData', JSON.stringify(userData));

        // Auto-send "start" message to chat agent
        setTimeout(() => {
            sendStartMessage();
        }, 1000);

    } catch (error) {
        console.error('Error fetching welcome message:', error);
        removeMessage(loadingId);
        addMessage('agent', 'Hello! I\'m SmartTax Guide. How can I help you today?');
        showError('Failed to load personalized welcome message.');
    }
}

// Logout functionality
function handleLogout() {
    userData = null;
    localStorage.removeItem('taxAgentUserData');
    showLoginInterface();
}

// Show chat interface
function showChatInterface() {
    loginSection.style.display = 'none';
    chatSection.style.display = 'flex';
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

// Show login interface
function showLoginInterface() {
    loginSection.style.display = 'flex';
    chatSection.style.display = 'none';
    loginForm.reset();
    chatMessages.innerHTML = '';
    chatHistory.innerHTML = '';
}

// Start new chat
function startNewChat() {
    chatMessages.innerHTML = '';
    addMessage('agent', 'Hello! I\'m SmartTax Guide. How can I help you today?');
    addChatToHistory('New Chat');
    messageInput.focus();
}

// Add chat to history
function addChatToHistory(title) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-history-item active';
    chatItem.textContent = title;

    // Remove active class from all items
    chatHistory.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add new item at the beginning
    chatHistory.insertBefore(chatItem, chatHistory.firstChild);

    // Add click event
    chatItem.addEventListener('click', () => {
        chatHistory.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });
        chatItem.classList.add('active');
    });
}

// Send "start" message to chat agent
async function sendStartMessage() {
    if (!userData) return;

    // Show loading indicator
    const loadingId = 'loading-start';
    addMessage('agent', '<div class="loading"></div> Thinking...', loadingId);

    try {
        // Prepare API request
        const requestData = {
            user_id: userData.user_id,
            client_id: userData.client_id,
            reference: userData.reference,
            query: "start",
            use_agent: true
        };

        // Send request to API
        const response = await fetch(`${API_BASE_URL}/chat/agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        // Remove loading message
        removeMessage(loadingId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Add agent response to chat
        addMessage('agent', data.response);

    } catch (error) {
        console.error('Error sending start message:', error);
        removeMessage(loadingId);
        addMessage('agent', 'Sorry, I encountered an error. Please try again later.');
    }
}

// Send message to API
async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message || !userData) return;

    // Add user message to chat
    addMessage('user', message);
    messageInput.value = '';

    // Disable input while processing
    messageInput.disabled = true;
    sendBtn.disabled = true;

    // Show loading indicator
    const loadingId = 'loading-' + Date.now();
    addMessage('agent', '<div class="loading"></div> Thinking...', loadingId);

    try {
        // Prepare API request
        const requestData = {
            user_id: userData.user_id,
            client_id: userData.client_id,
            reference: userData.reference,
            query: message,
            use_agent: true
        };

        // Send request to API
        const response = await fetch(`${API_BASE_URL}/chat/agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        // Remove loading message
        removeMessage(loadingId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Add agent response to chat
        addMessage('agent', data.response);

    } catch (error) {
        console.error('Error sending message:', error);
        removeMessage(loadingId);
        addMessage('agent', 'Sorry, I encountered an error. Please try again later.');
        showError('Failed to connect to the server. Please check your connection.');
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Add message to chat
function addMessage(type, content, id = null, isWelcome = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    if (id) messageDiv.id = id;

    const avatar = type === 'agent' ? 'ST' : 'U';

    // Format welcome message specially
    let formattedContent = content;
    if (isWelcome && typeof content === 'string') {
        // Parse welcome message to highlight important parts
        formattedContent = content.replace(/"(.*?)"/g, '<span class="highlight-text">"$1"</span>');
        formattedContent = `<div class="welcome-message">${formattedContent}</div>`;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${formattedContent}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove message from chat
function removeMessage(id) {
    if (id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }
}

// Show error message
function showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.error');
    if (existingError) {
        existingError.remove();
    }

    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Add to login form
    loginForm.appendChild(errorDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Check for existing login data on page load
window.addEventListener('load', async () => {
    const storedData = localStorage.getItem('taxAgentUserData');
    if (storedData) {
        userData = JSON.parse(storedData);
        showChatInterface();
        addChatToHistory('Previous Chat');

        // Show loading message
        const loadingId = 'loading-welcome';
        addMessage('agent', '<div class="loading"></div> Loading...', loadingId);

        try {
            // Call welcome API
            const response = await fetch(`${API_BASE_URL}/welcome/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userData.user_id,
                    client_id: userData.client_id,
                    reference: userData.reference
                })
            });

            // Remove loading message
            removeMessage(loadingId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Add personalized welcome message
            addMessage('agent', data.response.welcome_message, null, true);

            // Update stored user info if needed
            userData.reference_id = data.response.reference_id;
            userData.first_name = data.response.first_name;
            localStorage.setItem('taxAgentUserData', JSON.stringify(userData));

            // Auto-send "start" message to chat agent
            setTimeout(() => {
                sendStartMessage();
            }, 1000);

        } catch (error) {
            console.error('Error fetching welcome message:', error);
            removeMessage(loadingId);
            addMessage('agent', 'Welcome back! I\'m SmartTax Guide. How can I help you today?');
            showError('Failed to load personalized welcome message.');
        }
    }
});