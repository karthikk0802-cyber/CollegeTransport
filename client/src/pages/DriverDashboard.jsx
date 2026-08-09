import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import axios from 'axios';

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const { location, error: gpsError, isTracking, startTracking, stopTracking } = useGeolocation();
  
  const [assignedBus, setAssignedBus] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [tripTime, setTripTime] = useState('00:00:00');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Fetch assigned bus and check for active trip on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const busRes = await axios.get('/driver/assigned-bus');
        if (busRes.data?.success) {
          setAssignedBus(busRes.data.data);
        }

        const tripRes = await axios.get('/driver/active-trip');
        if (tripRes.data?.success && tripRes.data.data) {
          const trip = tripRes.data.data;
          setActiveTrip(trip);
          
          // Re-establish socket connection and start GPS tracking
          const token = localStorage.getItem('token');
          const socket = connectSocket(token);

          socket.on('connect', () => setSocketConnected(true));
          socket.on('disconnect', () => setSocketConnected(false));
          
          addLog('Resumed active trip tracking.');
          startGpsTracking(socket);
        }
      } catch (err) {
        console.error('Driver initialization error:', err.response?.data?.message || err.message);
        setApiError(err.response?.data?.message || 'Failed to load driver assignment details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      stopTracking();
      disconnectSocket();
    };
  }, []);

  // Update Trip timer interval
  useEffect(() => {
    let interval = null;
    if (activeTrip) {
      interval = setInterval(() => {
        const start = new Date(activeTrip.startTime);
        const diffMs = new Date() - start;
        const diffSecs = Math.floor(diffMs / 1000);
        const hours = String(Math.floor(diffSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(diffSecs % 60).padStart(2, '0');
        setTripTime(`${hours}:${mins}:${secs}`);
      }, 1000);
    } else {
      setTripTime('00:00:00');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTrip]);

  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 19)]);
  };

  const startGpsTracking = (activeSocket) => {
    addLog('Starting browser GPS Geolocation...');
    startTracking((coords) => {
      // Emit location details to backend
      const socketObj = activeSocket || getSocket();
      if (socketObj && socketObj.connected) {
        socketObj.emit('driver:locationUpdate', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: coords.speed || 0
        });
        addLog(`GPS Sent: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
      } else {
        addLog('GPS lag: Socket offline, caching locally...');
      }
    });
  };

  const handleStartTrip = async () => {
    setApiError('');
    setActionLoading(true);
    try {
      // Request permission or start tracking check first
      if (!navigator.geolocation) {
        setApiError('Geolocation not supported in this browser.');
        setActionLoading(false);
        return;
      }

      const res = await axios.post('/driver/start-trip');
      if (res.data?.success) {
        const trip = res.data.data;
        setActiveTrip(trip);
        addLog('Trip started successfully on server.');

        // Initialize Sockets
        const token = localStorage.getItem('token');
        const socket = connectSocket(token);

        socket.on('connect', () => {
          setSocketConnected(true);
          addLog('Realtime transmission link online.');
        });
        
        socket.on('disconnect', () => {
          setSocketConnected(false);
          addLog('Realtime transmission offline.');
        });

        startGpsTracking(socket);
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Could not start trip');
      addLog(`Error starting trip: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndTrip = async () => {
    setApiError('');
    setActionLoading(true);
    try {
      const res = await axios.post('/driver/end-trip');
      if (res.data?.success) {
        setActiveTrip(null);
        stopTracking();
        disconnectSocket();
        setSocketConnected(false);
        addLog('Trip ended successfully.');
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Could not end trip');
      addLog(`Error ending trip: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <p className="text-zinc-500">Loading driver terminal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Driver Terminal</span>
          <h1 className="text-lg font-bold">{user?.name}</h1>
        </div>
        <button
          onClick={logout}
          className="text-xs uppercase tracking-wider font-semibold border border-zinc-800 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all"
        >
          Sign Out
        </button>
      </header>

      {/* Main Terminal Grid */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {apiError && (
          <div className="bg-zinc-900 border border-zinc-800 text-xs text-white p-4 rounded-xl text-center">
            {apiError}
          </div>
        )}

        {gpsError && (
          <div className="bg-zinc-900 border border-zinc-800 text-xs text-white p-4 rounded-xl text-center font-semibold">
            ⚠️ GPS: {gpsError}
          </div>
        )}

        {/* Bus Information Panel */}
        <div className="glass-panel p-6 border-zinc-800">
          {assignedBus ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Assigned Vehicle</span>
                <div className="flex items-baseline justify-between mt-1">
                  <h2 className="text-3xl font-extrabold text-white">{assignedBus.busCode}</h2>
                  <span className="text-sm font-mono text-zinc-400 bg-zinc-900/50 border border-zinc-800 px-2 py-0.5 rounded">
                    {assignedBus.plateNumber}
                  </span>
                </div>
              </div>

              {assignedBus.assignedRoute ? (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Route Assigned</span>
                  <p className="text-sm font-semibold text-white mt-0.5">{assignedBus.assignedRoute.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {assignedBus.assignedRoute.stops?.length || 0} designated stops along route
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No route assigned by administration yet</p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500">
              <p className="font-semibold text-sm">No vehicle assigned to you.</p>
              <p className="text-xs mt-1">Contact your transport administrator for bus assignment.</p>
            </div>
          )}
        </div>

        {/* Mobile-First Big Buttons Control Panel */}
        {assignedBus && (
          <div className="glass-panel p-6 border-zinc-800 flex flex-col items-center justify-center space-y-6">
            {!activeTrip ? (
              <button
                onClick={handleStartTrip}
                disabled={actionLoading}
                className="w-full h-40 glass-button-primary flex-col rounded-3xl"
              >
                <span className="text-4xl">🚀</span>
                <span className="text-xl font-bold tracking-wider uppercase mt-2">Start Today's Trip</span>
              </button>
            ) : (
              <div className="w-full space-y-6">
                {/* Status Indicator Bar */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
                    <span className="block text-xs uppercase tracking-wider text-zinc-500">Duration</span>
                    <span className="text-lg font-bold font-mono">{tripTime}</span>
                  </div>
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-center">
                    <span className="block text-xs uppercase tracking-wider text-zinc-500">GPS Link</span>
                    <span className="text-sm font-bold flex items-center justify-center gap-1.5 mt-0.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${socketConnected && isTracking ? 'bg-white' : 'bg-zinc-700 animate-pulse'}`} />
                      {socketConnected && isTracking ? 'ACTIVE' : 'LOCKED'}
                    </span>
                  </div>
                </div>

                {/* Simulated Geolocation Status */}
                {location && (
                  <div className="text-center text-xs text-zinc-500 space-y-1 font-mono">
                    <p>Lat: {location.latitude.toFixed(6)} | Lng: {location.longitude.toFixed(6)}</p>
                    <p>Current Speed: {Math.round((location.speed || 0) * 3.6)} km/h</p>
                  </div>
                )}

                <button
                  onClick={handleEndTrip}
                  disabled={actionLoading}
                  className="w-full h-40 bg-zinc-950 text-white font-bold border border-zinc-800 hover:bg-white hover:text-black hover:border-white transition-all rounded-3xl flex flex-col items-center justify-center active:scale-95 duration-200"
                >
                  <span className="text-4xl">🏁</span>
                  <span className="text-xl font-bold tracking-wider uppercase mt-2">End Trip</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live GPS Console Logs Panel */}
        {activeTrip && (
          <div className="glass-panel p-4 border-zinc-800 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">GPS Transmission Log</span>
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1 custom-scrollbar">
              {logs.length === 0 ? (
                <p className="text-zinc-600 italic">Waiting for initial coordinate updates...</p>
              ) : (
                logs.map((log, idx) => <p key={idx}>{log}</p>)
              )}
            </div>
          </div>
        )}

        {/* Note on GPS Behavior */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 text-[11px] text-zinc-500 space-y-2">
          <p className="font-semibold">⚠️ GPS RELIABILITY NOTE:</p>
          <p>
            Background tracking on mobile browsers is subject to operating system constraints. If you lock your screen, open another application, or enter low-battery mode, the OS may throttle background processes and interrupt coordinates.
          </p>
          <p>
            For reliable, production-grade tracking, a native Android/iOS app utilizing a foreground background service is recommended.
          </p>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
