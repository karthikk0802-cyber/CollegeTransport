import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';
import Map from '../components/Map';
import axios from 'axios';

const AdminDashboard = () => {
  const { logout } = useAuth();
  
  // Navigation tab
  const [activeTab, setActiveTab] = useState('live'); // live, buses, drivers, students, routes, stops, history

  // Data States
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);

  // Form / Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Trip for Live Tracking Map
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedTripLocation, setSelectedTripLocation] = useState(null);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // createBus, editBus, createDriver, editDriver, createStudent, editStudent, createRoute, editRoute, createStop, editStop
  const [formData, setFormData] = useState({});

  // Fetch initial data
  const fetchData = async () => {
    setError('');
    try {
      const busesRes = await axios.get('/admin/buses');
      const driversRes = await axios.get('/admin/drivers');
      const studentsRes = await axios.get('/admin/students');
      const routesRes = await axios.get('/admin/routes');
      const stopsRes = await axios.get('/admin/stops');
      const activeTripsRes = await axios.get('/admin/trips/active');
      const historyRes = await axios.get('/admin/trips/history');

      setBuses(busesRes.data.data || []);
      setDrivers(driversRes.data.data || []);
      setStudents(studentsRes.data.data || []);
      setRoutes(routesRes.data.data || []);
      setStops(stopsRes.data.data || []);
      setActiveTrips(activeTripsRes.data.data || []);
      setTripHistory(historyRes.data.data || []);

      // If there are active trips and none selected, select the first one by default
      if (activeTripsRes.data.data?.length > 0 && !selectedTrip) {
        handleSelectTrip(activeTripsRes.data.data[0]);
      }
    } catch (err) {
      console.error('Admin fetch error:', err.message);
      setError('Failed to fetch administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Connect to Sockets for Live Monitoring
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    socket.on('connect', () => {
      // Admins automatically joined 'admins' room in server
    });

    // Listen for live bus coordinate movements
    socket.on('admin:busLocationChanged', (payload) => {
      // Update active trips list coordinates
      setActiveTrips((prev) =>
        prev.map((trip) => {
          if (trip._id === payload.tripId) {
            // Update current bus status in nested schema
            const updatedBus = { ...trip.bus, status: payload.status };
            return {
              ...trip,
              bus: updatedBus,
              lastLocation: {
                latitude: payload.latitude,
                longitude: payload.longitude,
                speed: payload.speed,
                timestamp: payload.timestamp
              }
            };
          }
          return trip;
        })
      );

      // If this is the currently selected trip, update map location coordinates
      if (selectedTrip && selectedTrip._id === payload.tripId) {
        setSelectedTripLocation({
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          timestamp: payload.timestamp
        });
        setSelectedTrip((prev) => ({
          ...prev,
          bus: { ...prev.bus, status: payload.status }
        }));
      }
    });

    socket.on('trip:started', () => fetchData());
    socket.on('trip:ended', () => {
      fetchData();
      // Reset selected trip if it just ended
      setSelectedTrip(null);
      setSelectedTripLocation(null);
    });
    socket.on('trip:forceStopped', () => fetchData());
    socket.on('trip:autoExpired', () => fetchData());

    return () => {
      disconnectSocket();
    };
  }, [selectedTrip]);

  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    // Find last location for this trip from DB or use the existing populated one
    try {
      const res = await axios.get(`/student/buses/${trip.bus._id}`);
      if (res.data?.success && res.data.data?.lastLocation) {
        setSelectedTripLocation(res.data.data.lastLocation);
      } else {
        setSelectedTripLocation(null);
      }
    } catch (err) {
      setSelectedTripLocation(null);
    }
  };

  const handleForceStop = async (tripId) => {
    if (!window.confirm('Are you sure you want to force-stop this trip? This will end location updates immediately.')) return;
    try {
      const res = await axios.post(`/admin/trips/${tripId}/force-stop`);
      if (res.data?.success) {
        setSuccess('Trip force-stopped successfully');
        fetchData();
        if (selectedTrip && selectedTrip._id === tripId) {
          setSelectedTrip(null);
          setSelectedTripLocation(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not force-stop trip');
    }
  };

  // Form CRUD Operations
  const handleOpenCreateModal = (type) => {
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleOpenEditModal = (type, item) => {
    setModalType(type);
    
    // Prepare form data based on type
    if (type === 'editBus') {
      setFormData({
        id: item._id,
        busCode: item.busCode,
        plateNumber: item.plateNumber,
        assignedDriver: item.assignedDriver?._id || '',
        assignedRoute: item.assignedRoute?._id || '',
      });
    } else if (type === 'editDriver') {
      setFormData({
        id: item._id,
        name: item.name,
        email: item.email,
        phone: item.phone || '',
      });
    } else if (type === 'editStudent') {
      setFormData({
        id: item._id,
        name: item.name,
        email: item.email,
        rollNumber: item.rollNumber || '',
        phone: item.phone || '',
        assignedBus: item.assignedBus?._id || '',
      });
    } else if (type === 'editRoute') {
      setFormData({
        id: item._id,
        name: item.name,
        description: item.description || '',
        stops: item.stops.map(s => ({ stop: s.stop._id || s.stop, sequence: s.sequence }))
      });
    } else if (type === 'editStop') {
      setFormData({
        id: item._id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
      });
    }
    
    setShowModal(true);
  };

  const handleDeleteItem = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item? This action is irreversible.')) return;
    try {
      let url = '';
      if (type === 'bus') url = `/admin/buses/${id}`;
      else if (type === 'driver') url = `/admin/drivers/${id}`;
      else if (type === 'student') url = `/admin/students/${id}`;
      else if (type === 'route') url = `/admin/routes/${id}`;
      else if (type === 'stop') url = `/admin/stops/${id}`;

      const res = await axios.delete(url);
      if (res.data?.success) {
        setSuccess('Item deleted successfully.');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let res;
      // Buses
      if (modalType === 'createBus') {
        res = await axios.post('/admin/buses', formData);
      } else if (modalType === 'editBus') {
        res = await axios.put(`/admin/buses/${formData.id}`, formData);
      }
      // Drivers
      else if (modalType === 'createDriver') {
        res = await axios.post('/admin/drivers', formData);
      } else if (modalType === 'editDriver') {
        res = await axios.put(`/admin/drivers/${formData.id}`, formData);
      }
      // Students
      else if (modalType === 'createStudent') {
        res = await axios.post('/admin/students', formData);
      } else if (modalType === 'editStudent') {
        res = await axios.put(`/admin/students/${formData.id}`, formData);
      }
      // Stops
      else if (modalType === 'createStop') {
        res = await axios.post('/admin/stops', formData);
      } else if (modalType === 'editStop') {
        res = await axios.put(`/admin/stops/${formData.id}`, formData);
      }
      // Routes
      else if (modalType === 'createRoute') {
        res = await axios.post('/admin/routes', formData);
      } else if (modalType === 'editRoute') {
        res = await axios.put(`/admin/routes/${formData.id}`, formData);
      }

      if (res?.data?.success) {
        setSuccess('Operation completed successfully.');
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error executing request.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-black flex items-center justify-center font-sans">
        <p className="text-zinc-500">Loading admin command center...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-black font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/70 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-sm">
            CT
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Command Center</span>
            <h1 className="text-md font-bold">Transport Administration</h1>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs uppercase tracking-wider font-semibold border border-zinc-300 px-3 py-1.5 rounded-lg hover:bg-black hover:text-white transition-all"
        >
          Sign Out
        </button>
      </header>

      {/* Admin Tab Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 border-r border-zinc-200 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('live')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'live' ? 'bg-black text-white' : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'}`}
          >
            Live Tracking ({activeTrips.length})
          </button>
          <button
            onClick={() => setActiveTab('buses')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'buses' ? 'bg-black text-white' : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'}`}
          >
            Buses CRUD ({buses.length})
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'drivers' ? 'bg-black text-white' : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'}`}
          >
            Drivers CRUD ({drivers.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'students' ? 'bg-black text-white' : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'}`}
          >
            Students CRUD ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'routes' ? 'bg-black text-white' : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'}`}
          >
            Routes & Stops
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'history' ? 'bg-black text-white' : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'}`}
          >
            Trip History
          </button>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="bg-zinc-100 border border-zinc-300 text-xs text-black p-4 rounded-xl text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-black border border-black text-xs text-white p-4 rounded-xl text-center font-bold">
              {success}
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. LIVE TRACKING TAB */}
          {/* ======================================================== */}
          {activeTab === 'live' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
              {/* Active Trip List */}
              <div className="lg:col-span-1 glass-panel p-4 border-zinc-200 flex flex-col space-y-4 overflow-hidden h-full">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Transit Trips</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {activeTrips.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 italic text-xs">
                      No active trips running currently
                    </div>
                  ) : (
                    activeTrips.map((trip) => (
                      <div
                        key={trip._id}
                        onClick={() => handleSelectTrip(trip)}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedTrip?._id === trip._id ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 text-black hover:border-zinc-400'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold text-lg">{trip.bus.busCode}</p>
                            <p className={`text-[10px] uppercase font-mono ${selectedTrip?._id === trip._id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {trip.bus.plateNumber}
                            </p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${trip.bus.status === 'LIVE' ? (selectedTrip?._id === trip._id ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : 'bg-zinc-100 border-zinc-300 text-zinc-500'}`}>
                            {trip.bus.status}
                          </span>
                        </div>
                        <div className={`mt-3 pt-3 border-t text-xs space-y-1 ${selectedTrip?._id === trip._id ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-650'}`}>
                          <p><strong>Driver:</strong> {trip.driver?.name}</p>
                          <p><strong>Started:</strong> {new Date(trip.startTime).toLocaleTimeString()}</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForceStop(trip._id);
                            }}
                            className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-all ${selectedTrip?._id === trip._id ? 'bg-white text-black border-white hover:bg-zinc-100' : 'bg-black text-white border-black hover:bg-zinc-800'}`}
                          >
                            Force Stop
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Map display */}
              <div className="lg:col-span-2 glass-panel p-2 border-zinc-200 h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Satellite Display</span>
                  {selectedTrip && (
                    <span className="text-xs font-bold text-black">
                      Monitoring {selectedTrip.bus.busCode}
                    </span>
                  )}
                </div>
                <div className="flex-1 p-2">
                  <Map
                    busLocation={selectedTripLocation}
                    stops={selectedTrip?.bus?.assignedRoute?.stops || []}
                    status={selectedTrip?.bus?.status || 'NOT_STARTED'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. BUSES CRUD TAB */}
          {/* ======================================================== */}
          {activeTab === 'buses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Manage Buses</h2>
                <button
                  onClick={() => handleOpenCreateModal('createBus')}
                  className="glass-button-primary text-xs"
                >
                  + Add New Bus
                </button>
              </div>

              <div className="glass-panel overflow-hidden border-zinc-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs text-zinc-650 font-semibold uppercase bg-zinc-100/40">
                      <th className="p-4">Bus Code</th>
                      <th className="p-4">Plate Number</th>
                      <th className="p-4">Assigned Driver</th>
                      <th className="p-4">Assigned Route</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs">
                    {buses.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-zinc-500 italic">No buses configured</td>
                      </tr>
                    ) : (
                      buses.map((bus) => (
                        <tr key={bus._id} className="hover:bg-zinc-100/10">
                          <td className="p-4 font-bold text-black">{bus.busCode}</td>
                          <td className="p-4 font-mono text-zinc-600">{bus.plateNumber}</td>
                          <td className="p-4">{bus.assignedDriver?.name || 'Unassigned'}</td>
                          <td className="p-4">{bus.assignedRoute?.name || 'Unassigned'}</td>
                          <td className="p-4">
                            <span className="bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded text-[10px]">
                              {bus.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditModal('editBus', bus)}
                              className="text-zinc-600 hover:text-black underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem('bus', bus._id)}
                              className="text-zinc-500 hover:text-black underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. DRIVERS CRUD TAB */}
          {/* ======================================================== */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Manage Drivers & Conductors</h2>
                <button
                  onClick={() => handleOpenCreateModal('createDriver')}
                  className="glass-button-primary text-xs"
                >
                  + Add Driver
                </button>
              </div>

              <div className="glass-panel overflow-hidden border-zinc-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs text-zinc-650 font-semibold uppercase bg-zinc-100/40">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Assigned Bus</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs">
                    {drivers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-zinc-500 italic">No drivers registered</td>
                      </tr>
                    ) : (
                      drivers.map((driver) => (
                        <tr key={driver._id} className="hover:bg-zinc-100/10">
                          <td className="p-4 font-bold text-black">{driver.name}</td>
                          <td className="p-4 text-zinc-600">{driver.email}</td>
                          <td className="p-4">{driver.phone || 'N/A'}</td>
                          <td className="p-4 font-bold">{driver.assignedBus?.busCode || 'None'}</td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditModal('editDriver', driver)}
                              className="text-zinc-600 hover:text-black underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem('driver', driver._id)}
                              className="text-zinc-500 hover:text-black underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. STUDENTS CRUD TAB */}
          {/* ======================================================== */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Manage Students</h2>
                <button
                  onClick={() => handleOpenCreateModal('createStudent')}
                  className="glass-button-primary text-xs"
                >
                  + Add Student
                </button>
              </div>

              <div className="glass-panel overflow-hidden border-zinc-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs text-zinc-650 font-semibold uppercase bg-zinc-100/40">
                      <th className="p-4">Name</th>
                      <th className="p-4">Roll Number</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Assigned Bus</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-zinc-500 italic">No students registered</td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student._id} className="hover:bg-zinc-100/10">
                          <td className="p-4 font-bold text-black">{student.name}</td>
                          <td className="p-4 font-mono text-zinc-600">{student.rollNumber || 'N/A'}</td>
                          <td className="p-4 text-zinc-500">{student.email}</td>
                          <td className="p-4 font-bold">{student.assignedBus?.busCode || 'None'}</td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditModal('editStudent', student)}
                              className="text-zinc-600 hover:text-black underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem('student', student._id)}
                              className="text-zinc-500 hover:text-black underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. ROUTES & STOPS TAB */}
          {/* ======================================================== */}
          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Routes CRUD */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Routes</h2>
                  <button
                    onClick={() => handleOpenCreateModal('createRoute')}
                    className="glass-button-primary text-xs"
                  >
                    + Create Route
                  </button>
                </div>

                <div className="space-y-4">
                  {routes.length === 0 ? (
                    <div className="glass-panel p-6 border-zinc-200 text-center text-zinc-500 italic text-xs">
                      No routes defined yet
                    </div>
                  ) : (
                    routes.map((route) => (
                      <div key={route._id} className="glass-panel p-5 border-zinc-200 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm text-black">{route.name}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{route.description || 'No description'}</p>
                          </div>
                          <div className="space-x-3 text-xs">
                            <button
                              onClick={() => handleOpenEditModal('editRoute', route)}
                              className="text-zinc-600 hover:text-black underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem('route', route._id)}
                              className="text-zinc-500 hover:text-black underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Stop Order list */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-250">
                          {route.stops
                            ?.sort((a, b) => a.sequence - b.sequence)
                            .map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded font-medium"
                              >
                                {idx + 1}. {s.stop?.name || 'Unknown stop'}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stops CRUD */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Stops Waypoints</h2>
                  <button
                    onClick={() => handleOpenCreateModal('createStop')}
                    className="glass-button-primary text-xs"
                  >
                    + Create Stop
                  </button>
                </div>

                <div className="glass-panel overflow-hidden border-zinc-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs text-zinc-650 font-semibold uppercase bg-zinc-100/40">
                        <th className="p-4">Name</th>
                        <th className="p-4">Latitude</th>
                        <th className="p-4">Longitude</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-xs">
                      {stops.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-6 text-center text-zinc-500 italic">No stops configured</td>
                        </tr>
                      ) : (
                        stops.map((stop) => (
                          <tr key={stop._id} className="hover:bg-zinc-100/10">
                            <td className="p-4 font-bold text-black">{stop.name}</td>
                            <td className="p-4 font-mono text-zinc-600">{stop.latitude.toFixed(6)}</td>
                            <td className="p-4 font-mono text-zinc-600">{stop.longitude.toFixed(6)}</td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditModal('editStop', stop)}
                                className="text-zinc-600 hover:text-black underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteItem('stop', stop._id)}
                                className="text-zinc-500 hover:text-black underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. TRIP HISTORY TAB */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Past Trips History Logs</h2>
              <div className="glass-panel overflow-hidden border-zinc-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs text-zinc-655 font-semibold uppercase bg-zinc-100/40">
                      <th className="p-4">Bus</th>
                      <th className="p-4">Driver</th>
                      <th className="p-4">Start Time</th>
                      <th className="p-4">End Time</th>
                      <th className="p-4">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                    {tripHistory.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-zinc-500 font-sans italic">No trip history recorded</td>
                      </tr>
                    ) : (
                      tripHistory.map((trip) => (
                        <tr key={trip._id} className="hover:bg-zinc-100/10">
                          <td className="p-4 font-bold text-black font-sans">{trip.bus?.busCode || 'Deleted Bus'}</td>
                          <td className="p-4 font-sans">{trip.driver?.name || 'Deleted Driver'}</td>
                          <td className="p-4 text-zinc-500">{new Date(trip.startTime).toLocaleString()}</td>
                          <td className="p-4 text-zinc-500">{trip.endTime ? new Date(trip.endTime).toLocaleString() : 'N/A'}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold font-sans uppercase ${trip.status === 'COMPLETED' ? 'text-zinc-500' : 'text-zinc-800'}`}>
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MONOCHROME DIALOG MODAL LAYOUT */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg glass-panel p-6 border-zinc-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-zinc-200">
              <h3 className="font-bold text-md capitalize text-black">
                {modalType.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-black font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-1">
              
              {/* --- BUS FORM --- */}
              {(modalType === 'createBus' || modalType === 'editBus') && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Bus Code *</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="e.g. C10"
                      value={formData.busCode || ''}
                      onChange={(e) => setFormData({ ...formData, busCode: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Plate Number *</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="e.g. KA-01-ME-1234"
                      value={formData.plateNumber || ''}
                      onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Assign Driver</label>
                    <select
                      className="glass-input"
                      value={formData.assignedDriver || ''}
                      onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
                    >
                      <option value="" className="bg-white text-black">Select Driver (Optional)</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d._id} className="bg-white text-black">{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Assign Route</label>
                    <select
                      className="glass-input"
                      value={formData.assignedRoute || ''}
                      onChange={(e) => setFormData({ ...formData, assignedRoute: e.target.value })}
                    >
                      <option value="" className="bg-white text-black">Select Route (Optional)</option>
                      {routes.map((r) => (
                        <option key={r._id} value={r._id} className="bg-white text-black">{r.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* --- DRIVER FORM --- */}
              {(modalType === 'createDriver' || modalType === 'editDriver') && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Full Name *</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="Name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Email Address *</label>
                    <input
                      type="email"
                      className="glass-input"
                      placeholder="email@college.edu"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  {modalType === 'createDriver' && (
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Password *</label>
                      <input
                        type="password"
                        className="glass-input"
                        placeholder="Password (min 6 chars)"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Phone Number</label>
                    <input
                      type="tel"
                      className="glass-input"
                      placeholder="Phone"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* --- STUDENT FORM --- */}
              {(modalType === 'createStudent' || modalType === 'editStudent') && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Full Name *</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="Name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Roll Number</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="e.g. 20BCE0123"
                      value={formData.rollNumber || ''}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Email Address *</label>
                    <input
                      type="email"
                      className="glass-input"
                      placeholder="email@college.edu"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  {modalType === 'createStudent' && (
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Password *</label>
                      <input
                        type="password"
                        className="glass-input"
                        placeholder="Password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Phone Number</label>
                    <input
                      type="tel"
                      className="glass-input"
                      placeholder="Phone"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-655 font-semibold mb-2">Assign Bus</label>
                    <select
                      className="glass-input"
                      value={formData.assignedBus || ''}
                      onChange={(e) => setFormData({ ...formData, assignedBus: e.target.value })}
                    >
                      <option value="" className="bg-white text-black">Select Bus (Optional)</option>
                      {buses.map((b) => (
                        <option key={b._id} value={b._id} className="bg-white text-black">{b.busCode}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* --- STOP FORM --- */}
              {(modalType === 'createStop' || modalType === 'editStop') && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Stop Name *</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="e.g. Main Gate"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      className="glass-input"
                      placeholder="e.g. 12.9716"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      className="glass-input"
                      placeholder="e.g. 77.5946"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </>
              )}

              {/* --- ROUTE FORM --- */}
              {(modalType === 'createRoute' || modalType === 'editRoute') && (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Route Name *</label>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="e.g. Route 1 - North Campus"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Description</label>
                    <textarea
                      className="glass-input h-20"
                      placeholder="Route path details"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  
                  {/* Stops sequencing select */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-zinc-650 font-semibold mb-2">Configure Waypoints (Sequence)</label>
                    {stops.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">Please configure Stops first before building routes</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto bg-zinc-100/60 p-3 rounded-xl border border-zinc-200 custom-scrollbar">
                        {stops.map((stop) => {
                          // Find existing stop sequence if editing
                          const existingStop = formData.stops?.find(s => s.stop === stop._id);
                          const currentSeqVal = existingStop ? existingStop.sequence : '';

                          return (
                            <div key={stop._id} className="flex items-center justify-between gap-4 text-xs text-black">
                              <span className="truncate font-semibold">{stop.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Seq:</span>
                                <input
                                  type="number"
                                  placeholder="none"
                                  className="w-16 bg-white border border-zinc-300 rounded px-2 py-1 text-center text-black"
                                  value={currentSeqVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    let newStops = [...(formData.stops || [])];
                                    
                                    if (val === '') {
                                      // Remove stop from list if sequence is cleared
                                      newStops = newStops.filter(s => s.stop !== stop._id);
                                    } else {
                                      const seqNum = parseInt(val);
                                      const idx = newStops.findIndex(s => s.stop === stop._id);
                                      if (idx > -1) {
                                        newStops[idx].sequence = seqNum;
                                      } else {
                                        newStops.push({ stop: stop._id, sequence: seqNum });
                                      }
                                    }
                                    setFormData({ ...formData, stops: newStops });
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="glass-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
