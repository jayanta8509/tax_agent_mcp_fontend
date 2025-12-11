# Tax Agent Chat Application

A simple web application for tax agent consultation with login and chat functionality.

## Features

- User login form with User ID, Client ID, and Reference type
- Persistent login session (stored in localStorage)
- Real-time chat interface with tax agent
- Integration with backend API at `http://localhost:8002/chat/agent`

## How to Use

1. **Open the application**: Open `index.html` in your web browser

2. **Login**:
   - Enter your User ID
   - Enter your Client ID
   - Select your Reference type (Individual/Business/Other)
   - Click Login

3. **Chat**:
   - Type your tax-related questions in the input field
   - Press Enter or click Send to submit
   - View responses from the tax agent

4. **Logout**: Click the Logout button to return to the login screen

## API Integration

The application sends POST requests to:
```
POST http://localhost:8002/chat/agent
```

Request format:
```json
{
  "user_id": "ja123456w89",
  "client_id": 35,
  "reference": "individual",
  "query": "no",
  "use_agent": true
}
```

Response format:
```json
{
  "response": "Do you have U.S. income or business for this financial year?",
  "status_code": 200,
  "query": "no",
  "timestamp": 1765468329.3334484
}
```

## Files Structure

- `index.html` - Main HTML file with login and chat sections
- `styles.css` - CSS styling for the application
- `script.js` - JavaScript functionality for login and chat
- `README.md` - This file

## Browser Compatibility

This application works with all modern browsers that support:
- ES6 JavaScript
- Fetch API
- Local Storage
- CSS Grid and Flexbox

## Important Notes

- Make sure your backend API is running at `http://localhost:8002` before using the chat feature
- Login data is stored in browser's localStorage for session persistence
- The application handles network errors gracefully with user-friendly messages