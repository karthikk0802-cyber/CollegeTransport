# College Bus Live Tracking & Transport Management System

A production-quality web application built using the **MERN** stack (MongoDB, Express, React, Node.js) with **Socket.IO** for real-time tracking and **Google Maps API** for dynamic visual display. 

Drivers use their phone's browser GPS as the tracking device (no dedicated hardware required), transport administrators manage route/stop assignments and live tracking status, and students track their assigned bus real-time.

---

## 🎨 Design System & Theme
- **Color Palette**: Strict Monochrome (Pure Black, Pure White, and Greyscale). Status variations are represented using outline structures, text indicators, or greyscale contrasts.
- **Typography**: Poppins globally configured.
- **Visual Style**: Sleek Glassmorphism (semi-transparent frosted containers, `backdrop-filter: blur`, thin borders, soft shadows).
- **Responsiveness**: Mobile-first layouts optimized for driver phones and student tracking screens.

---

## 🏗️ Core Features
1. **Student Dashboard**: Live map tracking, assigned bus status (LIVE / STALE / OFFLINE), sequential stops, and speed-based ETAs. Autocomplete search to lookup other buses.
2. **Driver Terminal**: Extremely simple, mobile-first big buttons. Start/End trip lifecycle controls, automatic location updates with throttled sending (every 8 seconds).
3. **Transport Admin Dashboard**: Full CRUD management of buses, drivers, students, routes, and stops. Dynamic driver-to-bus and student-to-bus assignments. Live monitoring map of all active buses with real-time socket updates and Admin Force-Stop controls. Past Trip logs.
4. **Freshness & Heartbeat Logic**:
   - **LIVE**: Location update received within last 30s.
   - **STALE**: No update for >= 30s (indicates browser throttling or network lag).
   - **OFFLINE**: No update for >= 3m, or driver socket disconnected, or trip closed.
5. **Auto-Expiry**: Backend worker automatically terminates active trips that are inactive for over 20 minutes or exceed 4 hours.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or a remote URI string)
- NPM (v9+)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd CollegeTransport
   ```

2. Run the root helper command to install dependencies across the monorepo:
   ```bash
   npm run install:all
   ```
   *(This will run `npm install` in the root, client, and server folders).*

### Environment Configuration

Configure `.env` files for both server and client.

#### Server Configuration (`server/.env`)
Create a file named `.env` in the `server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college-bus-tracking
JWT_SECRET=development_secret_key_1234567890_college_bus
NODE_ENV=development
MAX_TRIP_DURATION_HOURS=4
AUTO_EXPIRE_INACTIVE_MINUTES=20
```

#### Client Configuration (`client/.env`)
Create a file named `.env` in the `client` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```
*Note: If no Google Maps API key is provided, the client will display a placeholder warning with instructions, but the rest of the application will work normally.*

---

## 🖥️ Running the Application

To run the server and client concurrently in development mode, run the following command from the root workspace directory:
```bash
npm run dev
```

- **Client dashboard** will launch on: [http://localhost:5173](http://localhost:5173)
- **Backend API server** will run on: [http://localhost:5000](http://localhost:5000)

---

## 🧪 Simulation & Testing Guide

For complete manual verification, perform the following sequence:

### 1. Account Setup
1. Open the login page at `http://localhost:5173`.
2. Click **Create user login** at the bottom to register accounts:
   - Create an **Admin** user.
   - Create a **Driver** user.
   - Create a **Student** user.
3. Sign in as **Admin**. Go to the tabs:
   - **Stops Waypoints**: Create 3-4 stops with realistic local coordinates (e.g. your local city coords).
   - **Routes**: Create a Route and sequence the stops.
   - **Buses**: Create a Bus (e.g. "C10") and assign it the driver and route you created.
   - **Students**: Edit your student user and assign them to Bus "C10".

### 2. Driver Trip Execution
1. Open a new Incognito browser window or separate browser, and log in as the **Driver**.
2. You will see your assigned bus details and a huge black button: **Start Today's Trip**.
3. Tap **Start Today's Trip**. Allow the browser geolocation popup.
4. Once started, a live log board will display coordinates and show socket connections status.

### 3. Student Tracking
1. Log in as the **Student** in another window.
2. The student is automatically connected to Bus "C10". You will see the live status indicator `LIVE TRACKING`, the sequential stops, and the dynamic ETA in minutes to each stop.

### 4. Simulating GPS Movement & Freshness States
- **Simulating Motion**: To test movement, open Chrome DevTools in the Driver window, press `Esc` to open the drawer, click the triple-dot menu, select **Sensors**, and change **Location** to "City Running" or manually override coordinates. Watch the student map update in real-time.
- **STALE status**: Minimize/background the driver browser window or disconnect the internet. Within 30 seconds, the Student dashboard status will transition to `WEAK GPS SIGNAL`.
- **OFFLINE status**: End the trip on the driver terminal or close the window for over 3 minutes. The student tracking status will update to `OFFLINE`.

---

## ⚠️ Browser Geolocation Limitations (Production Successor)

Transmission of GPS coordinates via a mobile browser's Geolocation API is highly unreliable for long-term production use. Mobile operating systems (iOS and Android) aggressively put background browsers to sleep to save battery, lock CPU clocks, and throttle network access when screens are locked or other apps are running.

**Production Successor**: For a production-grade rollout, the driver terminal must be built as a native application (e.g., React Native, Flutter, or native Kotlin/Swift) that registers a **Foreground Service** with a sticky status notification. This registers the app as a high-priority system service, preventing the OS from reclaiming its memory or disabling the GPS chip during background journeys.
