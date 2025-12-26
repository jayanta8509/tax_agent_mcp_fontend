// Global variables
let userData = null;
let userSessionData = {}; // Store confirmed user data
const API_BASE_URL = 'https://arsalaanrasultax.bestworks.cloud';

// Response parser utilities
class ResponseParser {
    static parseResponse(response) {
        // Handle ITIN special case (keep this as it has functional buttons)
        if (response.includes('apply for ITIN')) {
            return {
                type: 'itin_application',
                message: this.formatMessage(response),
                needsUpload: true,
                uploadType: 'w7_form'
            };
        }

        // Return as simple message with markdown formatting
        return {
            type: 'message',
            text: this.formatMessage(response)
        };
    }

    static formatMessage(text) {
        if (!text) return '';
        return text
            // Bold: **text**
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            // Italic: *text*
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            // Bold: __text__
            .replace(/__(.*?)__/g, '<b>$1</b>')
            // Italic: _text_
            .replace(/_(.*?)_/g, '<i>$1</i>')
            // Newlines to <br>
            .replace(/\n/g, '<br>');
    }

    static extractFieldName(text) {
        // Convert phrases like "full legal name" to camelCase
        const mapping = {
            'full legal name': 'legalName',
            'date of birth': 'dateOfBirth',
            'us address': 'usAddress',
            'occupation or source of U.S. income': 'occupation',
            'itin number': 'itin',
            'w7 form uploaded': 'w7Form'
        };

        const lowerText = text.toLowerCase().replace(/^client\s+is\s+["']?/, '');
        return mapping[lowerText] || lowerText.replace(/\s+/g, '');
    }

    static cleanValue(value) {
        // Remove artifacts like "client is", bold markers, and quotes
        return value
            .replace(/^client\s+is\s+["']?/i, '')
            .replace(/^\*\*/, '')
            .replace(/\*\*$/, '')
            .replace(/^["']/, '')
            .replace(/["']$/, '')
            .trim();
    }
}

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
        user_id: formData.get('userId').trim(),
        client_id: formData.get('clientId').trim(),
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
        // Prepare API request with new parameters
        const requestData = {
            user_id: userData.user_id,
            client_id: userData.client_id,
            reference: userData.reference,
            human_response: "start"
        };

        // Send request to API
        const response = await fetch(`${API_BASE_URL}/tax/workflow`, {
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

        // Display question and ai_response from the new response structure
        addWorkflowResponse(data);

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
        // Prepare API request with new parameters
        const requestData = {
            user_id: userData.user_id,
            client_id: userData.client_id,
            reference: userData.reference,
            human_response: message
        };

        // Send request to API
        const response = await fetch(`${API_BASE_URL}/tax/workflow`, {
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

        // Display question and ai_response from the new response structure
        addWorkflowResponse(data);

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

// Add workflow response to chat (displays question and ai_response or final_response)
function addWorkflowResponse(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent';

    const avatar = 'ST';

    let contentHTML = '';

    // Check if response is completed status with final_response
    if (data.status === 'completed' && data.final_response) {
        contentHTML = `
            <div class="workflow-response">
                <div class="final-response-section">${ResponseParser.formatMessage(data.final_response)}</div>
            </div>
        `;
    } else {
        // Format the question and ai_response
        const question = data.question || '';
        const aiResponse = data.ai_response || '';

        contentHTML = `
            <div class="workflow-response">
                <div class="question-section">${ResponseParser.formatMessage(question)}</div>
                <div class="ai-response-section">${ResponseParser.formatMessage(aiResponse)}</div>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${contentHTML}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // If status is completed, send thank you message and disable input
    if (data.status === 'completed') {
        setTimeout(() => {
            addMessage('user', 'Thank you for your confirmations');
            disableUserInput();
        }, 500);
    }
}

// Disable user input after workflow completion
function disableUserInput() {
    messageInput.disabled = true;
    sendBtn.disabled = true;
    messageInput.placeholder = 'Workflow completed. Input disabled.';
}

// Add parsed message to chat
function addParsedMessage(type, parsedData, id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    if (id) messageDiv.id = id;

    const avatar = type === 'agent' ? 'ST' : 'U';
    let contentHTML = '';

    switch (parsedData.type) {
        case 'question':
            contentHTML = `
                <div class="question-message">
                    <p>${parsedData.question}</p>
                    <div class="current-value">
                        <span class="label">Current value:</span>
                        <span class="value">${parsedData.currentValue}</span>
                    </div>
                    <div class="confirmation-hint">
                        Reply with 'Yes' to confirm or provide the correct value
                    </div>
                </div>
            `;
            break;

        case 'confirmation':
            contentHTML = `
                <div class="confirmation-message">
                    <p>${parsedData.message}</p>
                </div>
            `;
            break;

        case 'request':
            contentHTML = `
                <div class="request-message">
                    <p>${parsedData.question}</p>
                </div>
            `;
            break;

        case 'update':
            contentHTML = `
                <div class="update-message">
                    <p>✓ Updated!</p>
                    <div class="updated-field">
                        <span class="label">Your ${parsedData.field.replace(/([A-Z])/g, ' $1').toLowerCase()} is now:</span>
                        <span class="value">${parsedData.newValue}</span>
                    </div>
                </div>
            `;
            break;

        case 'itin_application':
            contentHTML = `
                <div class="itin-message">
                    <p>${parsedData.message}</p>
                    <button class="upload-btn" onclick="handleFileUpload('w7_form')">
                        📄 Upload W7 Form
                    </button>
                </div>
            `;
            break;

        default:
            contentHTML = `<div class="simple-message">${parsedData.text || parsedData}</div>`;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${contentHTML}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add regular message to chat (fallback)
function addMessage(type, content, id = null, isWelcome = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    if (id) messageDiv.id = id;

    const avatar = type === 'agent' ? 'ST' : 'U';

    // Format content with markdown if it's a string
    let formattedContent = typeof content === 'string' ? ResponseParser.formatMessage(content) : content;

    // For welcome message, highlight text inside quotes
    if (isWelcome) {
        if (typeof content === 'string') {
            // Handle standard double quotes, curly quotes, etc.
            formattedContent = formattedContent.replace(/(["“])([^"”]+)(["”])/g, '<span class="highlight-text">"$2"</span>');
        }
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

// Handle file upload
function handleFileUpload(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'w7_form' ? '.pdf,.jpg,.jpeg,.png' : '*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show upload message
        addMessage('user', `📄 Uploaded ${file.name}`);

        // Show loading
        const loadingId = 'loading-upload';
        addMessage('agent', '<div class="loading"></div> Processing upload...', loadingId);

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userData.user_id);
        formData.append('client_id', userData.client_id);
        formData.append('reference', userData.reference);
        formData.append('document_type', type);

        try {
            const response = await fetch(`${API_BASE_URL}/upload/document`, {
                method: 'POST',
                body: formData
            });

            removeMessage(loadingId);

            if (response.ok) {
                const result = await response.json();
                addMessage('agent', `✓ Successfully uploaded ${file.name}. ${result.message || 'File processed successfully.'}`);

                // Store upload info
                userSessionData.w7Form = file.name;
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            removeMessage(loadingId);
            addMessage('agent', '❌ Upload failed. Please try again.');
        }
    };

    input.click();
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