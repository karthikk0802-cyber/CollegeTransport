import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { calculateETA } from '../utils/geo';
import Map from '../components/Map';
import axios from 'axios';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  
  const [assignedBusInfo, setAssignedBusInfo] = useState(null);
  const [trackedBus, setTrackedBus] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [busStatus, setBusStatus] = useState('NOT_STARTED');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [allBuses, setAllBuses] = useState([]);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch assigned bus details on mount
  useEffect(() => {
    const fetchAssignedBus = async () => {
      try {
        const res = await axios.get('/student/bus');
        if (res.data?.success && res.data.data) {
          const { bus, lastLocation } = res.data.data;
          setAssignedBusInfo(bus);
          setTrackedBus(bus);
          setBusStatus(bus.status);
          
          if (lastLocation) {
            setBusLocation(lastLocation);
          }
        }
      } catch (err) {
        console.error('Error fetching assigned bus:', err.message);
        setError('Failed to fetch assigned bus details.');
      } finally {
        setLoading(false);
      }
    };

    const fetchAllBusesList = async () => {
      try {
        const res = await axios.get('/student/buses/search');
        if (res.data?.success) {
          setAllBuses(res.data.data);
          setFilteredBuses(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching all buses:', err.message);
      }
    };

    fetchAssignedBus();
    fetchAllBusesList();

    return () => {
      cleanupSocketConnection();
    };
  }, []);

  // Set up socket subscription for current tracked bus
  useEffect(() => {
    if (!trackedBus) return;

    cleanupSocketConnection();

    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    socket.on('connect', () => {
      socket.emit('student:joinBus', { busId: trackedBus._id });
    });

    socket.on('bus:locationChanged', (payload) => {
      if (payload.busId === trackedBus._id) {
        if (payload.status === 'OFFLINE') {
          setBusLocation(null);
          setBusStatus('OFFLINE');
        } else {
          setBusLocation({
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed || 0,
            timestamp: payload.timestamp
          });
          setBusStatus(payload.status);
        }
      }
    });

    return () => {
      cleanupSocketConnection();
    };
  }, [trackedBus]);

  const cleanupSocketConnection = () => {
    const socket = getSocket();
    if (socket && trackedBus) {
      socket.emit('student:leaveBus', { busId: trackedBus._id });
    }
    disconnectSocket();
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setFilteredBuses(allBuses);
      setShowSearchResults(false);
    } else {
      const filtered = allBuses.filter(
        b => b.busCode.toLowerCase().includes(val.toLowerCase()) || 
             (b.assignedRoute && b.assignedRoute.name.toLowerCase().includes(val.toLowerCase()))
      );
      setFilteredBuses(filtered);
      setShowSearchResults(true);
    }
  };

  const handleSelectBus = async (bus) => {
    setLoading(true);
    setShowSearchResults(false);
    setSearchQuery('');
    
    try {
      const res = await axios.get(`/student/buses/${bus._id}`);
      if (res.data?.success && res.data.data) {
        const { bus: busDetails, lastLocation } = res.data.data;
        setTrackedBus(busDetails);
        setBusStatus(busDetails.status);
        if (lastLocation) {
          setBusLocation(lastLocation);
        } else {
          setBusLocation(null);
        }
      }
    } catch (err) {
      console.error('Error fetching bus tracking details:', err.message);
      setError('Could not switch bus tracking views');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'LIVE':
        return { text: 'LIVE TRACKING', bg: 'bg-black text-white border border-black' };
      case 'STALE':
        return { text: 'WEAK GPS SIGNAL', bg: 'bg-zinc-100 border border-zinc-300 text-zinc-800' };
      case 'OFFLINE':
        return { text: 'OFFLINE', bg: 'bg-zinc-100 border border-zinc-200 text-zinc-400' };
      case 'NOT_STARTED':
      default:
        return { text: 'NOT STARTED', bg: 'bg-zinc-100 border border-zinc-200 text-zinc-550' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-black flex items-center justify-center font-sans">
        <p className="text-zinc-500">Loading tracking system...</p>
      </div>
    );
  }

  const stopsList = trackedBus?.assignedRoute?.stops || [];
  const statusLabel = getStatusLabel(busStatus);

  return (
    <div className="min-h-screen bg-zinc-50 text-black font-sans flex flex-col">
      {/* Navbar */}
      <header className="border-b border-zinc-200 bg-white/70 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-sm">
            CT
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Student Panel</span>
            <h1 className="text-md font-bold">{user?.name}</h1>
          </div>
        </div>

        {/* Global Search Interface */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search alternative buses..."
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => setShowSearchResults(true)}
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2 text-xs placeholder-zinc-400 text-black focus:outline-none focus:border-black"
          />
          {showSearchResults && filteredBuses.length > 0 && (
            <div className="absolute top-full right-0 w-full mt-2 glass-panel border-zinc-200 p-2 max-h-60 overflow-y-auto custom-scrollbar z-50">
              {filteredBuses.map((bus) => (
                <button
                  key={bus._id}
                  onClick={() => handleSelectBus(bus)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-black hover:text-white rounded-lg transition-colors flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold">{bus.busCode}</p>
                    <p className="text-[10px] text-zinc-500 font-sans tracking-wide">
                      {bus.assignedRoute?.name || 'No Route'}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-zinc-300 bg-zinc-150">
                    {bus.status}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showSearchResults && filteredBuses.length === 0 && (
            <div className="absolute top-full right-0 w-full mt-2 bg-white border border-zinc-200 rounded-xl p-3 text-xs text-zinc-500 text-center z-50">
              No matching buses found
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="text-xs uppercase tracking-wider font-semibold border border-zinc-300 px-3 py-1.5 rounded-lg hover:bg-black hover:text-white transition-all"
        >
          Sign Out
        </button>
      </header>

      {/* Main Student Console */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Bus Tracking Detail Dashboard */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          {error && (
            <div className="bg-zinc-100 border border-zinc-300 text-xs text-black p-4 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Active Vehicle Status */}
          <div className="glass-panel p-6 border-zinc-200 space-y-5">
            {trackedBus ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tracking Vehicle</span>
                    <h2 className="text-3xl font-extrabold mt-1">{trackedBus.busCode}</h2>
                    <p className="text-xs text-zinc-650 font-mono mt-0.5">{trackedBus.plateNumber}</p>
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider rounded-full px-3 py-1 font-sans ${statusLabel.bg}`}>
                    {statusLabel.text}
                  </span>
                </div>

                <div className="border-t border-zinc-200 pt-4 space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Driver</span>
                    <p className="text-sm font-semibold mt-0.5">
                      {trackedBus.assignedDriver?.name || 'No driver assigned'}
                    </p>
                    {trackedBus.assignedDriver?.phone && (
                      <a
                        href={`tel:${trackedBus.assignedDriver.phone}`}
                        className="text-xs text-zinc-600 hover:text-black transition-colors underline mt-0.5 block"
                      >
                        📞 Call Driver: {trackedBus.assignedDriver.phone}
                      </a>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Current Route</span>
                    <p className="text-sm font-semibold mt-0.5">
                      {trackedBus.assignedRoute?.name || 'No route assigned'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {trackedBus.assignedRoute?.description || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Simulated live speed/freshness ping detail */}
                {busLocation && (busStatus === 'LIVE' || busStatus === 'STALE') && (
                  <div className="bg-zinc-100/50 border border-zinc-200 rounded-xl p-3 text-[10px] text-zinc-600 space-y-1 font-mono">
                    <p>Live Speed: {Math.round((busLocation.speed || 0) * 3.6)} km/h</p>
                    <p>Last Ping: {new Date(busLocation.timestamp).toLocaleTimeString()}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-zinc-500">
                <p className="font-bold text-sm">No bus currently selected for tracking.</p>
                <p className="text-xs mt-1">Please use the search bar above to look up college transit routes.</p>
              </div>
            )}
          </div>

          {/* Stops List & Dynamic Speed-based ETAs */}
          {trackedBus && stopsList.length > 0 && (
            <div className="glass-panel p-6 border-zinc-200 flex-1 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Route Waypoints & ETAs</h3>
              
              <div className="relative border-l border-zinc-200 pl-5 ml-2 space-y-6 custom-scrollbar max-h-[350px] overflow-y-auto">
                {stopsList
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((item, idx) => {
                    // Compute ETA if bus location is available
                    let etaMinutes = null;
                    if (busLocation && (busStatus === 'LIVE' || busStatus === 'STALE')) {
                      etaMinutes = calculateETA(
                        busLocation.latitude,
                        busLocation.longitude,
                        item.stop.latitude,
                        item.stop.longitude,
                        busLocation.speed
                      );
                    }

                    return (
                      <div key={item._id} className="relative">
                        {/* Bullet point indicator */}
                        <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-white border border-zinc-300 flex items-center justify-center">
                          <span className="w-1 h-1 rounded-full bg-black" />
                        </span>
                        
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                              Stop {item.sequence}
                            </span>
                            <p className="text-sm font-semibold">{item.stop.name}</p>
                          </div>
                          
                          {etaMinutes !== null ? (
                            <span className="text-xs font-mono font-bold bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded text-black whitespace-nowrap">
                              ~{etaMinutes} mins
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-zinc-400 italic">--</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Map Canvas display (taking 2 cols) */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-[450px]">
          <div className="flex-1 glass-panel p-2 border-zinc-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Satellite tracking</span>
              {assignedBusInfo && trackedBus?._id !== assignedBusInfo?._id && (
                <button
                  onClick={() => handleSelectBus(assignedBusInfo)}
                  className="text-[10px] uppercase font-bold text-black hover:underline"
                >
                  Back to Assigned Bus ({assignedBusInfo.busCode})
                </button>
              )}
            </div>
            
            <div className="flex-1 p-2">
              <Map
                busLocation={busLocation}
                stops={stopsList}
                status={busStatus}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
