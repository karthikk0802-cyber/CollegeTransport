import { useState, useRef, useEffect } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const THROTTLE_INTERVAL_MS = 8000; // Throttle socket updates to ~8 seconds to save driver battery & limit backend load

  // Check permission status on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        setPermissionStatus(status.state);
        status.onchange = () => {
          setPermissionStatus(status.state);
        };
      }).catch(err => {
        console.warn('Permissions API not fully supported for geolocation:', err.message);
      });
    }
  }, []);

  const startTracking = (onLocationUpdate) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    if (isTracking) return;

    setError(null);
    setIsTracking(true);

    const successHandler = (position) => {
      const { latitude, longitude, speed } = position.coords;
      const coords = { latitude, longitude, speed: speed || 0 };
      
      setLocation(coords);

      // Throttling mechanism for callbacks (e.g. socket emits)
      const now = Date.now();
      if (now - lastUpdateRef.current >= THROTTLE_INTERVAL_MS) {
        if (onLocationUpdate) {
          onLocationUpdate(coords);
        }
        lastUpdateRef.current = now;
      }
    };

    const errorHandler = (err) => {
      let msg = 'An unknown error occurred while retrieving location';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          msg = 'Location access denied. Please enable GPS permissions.';
          setPermissionStatus('denied');
          break;
        case err.POSITION_UNAVAILABLE:
          msg = 'Location information is unavailable.';
          break;
        case err.TIMEOUT:
          msg = 'Location request timed out. Retrying...';
          break;
      }
      setError(msg);
      console.error('Geolocation tracking error:', err);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setLocation(null);
    lastUpdateRef.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    error,
    isTracking,
    permissionStatus,
    startTracking,
    stopTracking,
  };
};
