# 📓 Notebook App — Full Stack

A credential-based notebook app.
- **Frontend**: HTML/CSS/JS → hosted on Firebase Hosting (free)
- **Backend**: Java Spring Boot REST API → hosted on Railway (free tier)
- **Database**: Firebase Firestore (free tier)
- **Auth**: JWT tokens + BCrypt password encryption

---

## 🏗 Architecture

```
User (browser)
   │  Login/Register with username+password
   ▼
Firebase Hosting (frontend)
   │  Sends API calls with JWT token
   ▼
Railway (Java Spring Boot backend)
   │  Validates JWT, BCrypt verifies password
   ▼
Firebase Firestore (database)
   │
   ├── users/{username}           ← user doc (stores BCrypt hash, NOT plain password)
   └── notes/{username}/items/{}  ← notes subcollection, isolated per user
```

## 🔐 How password security works

1. **Register**: User types password → Spring Boot runs BCrypt (12 rounds) → stores `$2a$12$...` hash in Firestore. The plain password is **never stored**.
2. **Login**: User types password → BCrypt hashes it again → compares with stored hash → issues JWT token (valid 24h).
3. **API calls**: Every request sends `Authorization: Bearer <token>` → backend validates JWT → reads `username` from token → fetches only that user's notes.

---

## 📁 Project structure

```
notebook/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── app.js
│   │   └── config.js        ← Put your backend URL here
│   ├── firebase.json
│   └── .firebaserc
├── backend/
│   ├── src/main/java/com/notebook/
│   │   ├── NotebookApplication.java
│   │   ├── config/          ← Firebase + Security config
│   │   ├── controller/      ← REST endpoints
│   │   ├── model/           ← User, Note
│   │   ├── repository/      ← Firestore operations
│   │   ├── security/        ← JWT filter + util
│   │   └── service/         ← Business logic
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── pom.xml
│   └── Procfile             ← Railway deploy config
├── .gitignore
└── README.md
```

---

## 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

---

### STEP 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `my-notebook-app`) → Create
3. In the left sidebar → **Firestore Database** → Create database → **Start in test mode** → Choose a region → Done

---

### STEP 2 — Get Firebase Service Account Key

This lets the Java backend talk to Firestore.

1. In Firebase Console → ⚙️ Project Settings → **Service accounts** tab
2. Click **Generate new private key** → Download the JSON file
3. Rename it to `firebase-service-account.json`
4. Put it inside `backend/src/main/resources/`

> ⚠️ This file is in `.gitignore` — **never commit it to GitHub**!

---

### STEP 3 — Deploy Backend to Railway

Railway gives you a free Java hosting server.

1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select your repo
3. Choose the `backend` folder as the root directory
4. Add environment variables in Railway dashboard:

```
SPRING_APPLICATION_JSON={"jwt.secret":"YourLongRandomSecretKey123456789","cors.allowed-origins":"https://YOUR_PROJECT_ID.web.app"}
```

5. Also upload your Firebase service account as an environment variable:
   - Go to **Variables** → Add:
   ```
   FIREBASE_CREDENTIALS_JSON=<paste entire content of firebase-service-account.json>
   ```
   Then update `FirebaseConfig.java` to read from env var instead of file:
   ```java
   // In FirebaseConfig.java, replace the file reading with:
   String json = System.getenv("FIREBASE_CREDENTIALS_JSON");
   InputStream serviceAccount = new ByteArrayInputStream(json.getBytes());
   ```

6. Railway will build and deploy → copy the URL (e.g. `https://notebook-backend.up.railway.app`)

---

### STEP 4 — Update Frontend Config

Open `frontend/public/config.js` and update:

```javascript
const API_BASE = "https://notebook-backend.up.railway.app";
```

Also update `backend/src/main/resources/application.properties`:
```
cors.allowed-origins=https://YOUR_PROJECT_ID.web.app
```

---

### STEP 5 — Deploy Frontend to Firebase

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Login
firebase login

# Go to frontend folder
cd frontend

# Set your project
firebase use --add
# (select your Firebase project from the list)

# Deploy!
firebase deploy --only hosting
```

Your live URL: `https://YOUR_PROJECT_ID.web.app`

---

### STEP 6 — Push to GitHub

```bash
# From the root notebook/ folder
git init
git add .
git commit -m "Initial commit: Notebook app with auth"

# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/notebook-app.git
git branch -M main
git push -u origin main
```

---

### STEP 7 — Share on LinkedIn

Post template:
```
🚀 Just shipped my Notebook App!

Built with:
⚡ Java Spring Boot (REST API)
🔐 BCrypt password encryption + JWT authentication
🔥 Firebase Firestore (database) + Hosting
📝 Rich text editor with tags and search

🔗 Live app: https://YOUR_PROJECT_ID.web.app
💻 GitHub: https://github.com/YOUR_USERNAME/notebook-app

#Java #SpringBoot #Firebase #WebDevelopment #FullStack
```

---

## 🧪 Test the API locally

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secret123"}'

# Login → copy the token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secret123"}'

# Get notes (use token from above)
curl http://localhost:8080/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔥 Firebase Free Tier Limits

| Resource | Free limit |
|---|---|
| Firestore reads | 50,000 / day |
| Firestore writes | 20,000 / day |
| Firestore storage | 1 GB |
| Firebase Hosting | 10 GB / month |

More than enough for a portfolio project or small app!
