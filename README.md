# Simple Login & Register System

A minimal authentication system with Express backend (in-memory storage) and vanilla HTML/CSS/JS frontend.

## 🚀 Quick Start

### Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend folder:
```bash
cd frontend
```

2. Open `register.html` in your browser to get started, or use a simple HTTP server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server -p 8000
```

3. Access the frontend at `http://localhost:8000`

## 📁 Project Structure

```
invex/
├── backend/
│   ├── server.js          # Express server with auth endpoints
│   └── package.json       # Dependencies
└── frontend/
    ├── register.html      # Registration page
    ├── login.html         # Login page
    ├── dashboard.html     # Dashboard after login
    └── styles.css         # Shared styles
```

## 🔌 API Endpoints

### Register
- **POST** `/api/register`
- Body: `{ "username": "string", "email": "string", "password": "string" }`
- Response: `{ "success": true, "message": "...", "user": {...} }`

### Login
- **POST** `/api/login`
- Body: `{ "email": "string", "password": "string" }`
- Response: `{ "success": true, "message": "...", "user": {...} }`

### Health Check
- **GET** `/api/health`
- Response: `{ "status": "ok", "users": 0, "timestamp": "..." }`

## ✨ Features

- ✅ User registration with validation
- ✅ User login with authentication
- ✅ In-memory storage (no database needed)
- ✅ CORS enabled for cross-origin requests
- ✅ Modern, responsive UI with animations
- ✅ Client-side form validation
- ✅ Success/error messaging
- ✅ Protected dashboard page

## ⚠️ Important Notes

- **No Database**: User data is stored in-memory and will be lost when the server restarts
- **Simple Hashing**: Uses a basic hash function (NOT suitable for production)
- **No JWT**: Authentication is handled via localStorage (for demo purposes)

## 🎯 Usage Flow

1. Open `register.html` in your browser
2. Create a new account with username, email, and password
3. You'll be redirected to the login page
4. Login with your credentials
5. You'll be redirected to the dashboard

## 🔧 Development

The backend runs on port **3001** and the frontend can be served on any port (e.g., 8000).

Make sure the backend is running before testing the frontend!

## 📝 Next Steps

This is a minimal implementation. To build a production-ready system, you would need to:
- Add a real database (MongoDB, PostgreSQL, etc.)
- Implement proper password hashing (bcrypt)
- Add JWT tokens for authentication
- Add input sanitization and validation
- Implement rate limiting
- Add email verification
- Add password reset functionality
