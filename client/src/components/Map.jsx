import React, { useEffect, useRef, useState } from 'react';

const Map = ({ busLocation, stops = [], status = 'NOT_STARTED' }) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const busMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const stopMarkersRef = useRef([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Programmatically load Google Maps Script if not already loaded
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initGoogleMapsCallback`;
      script.async = true;
      script.defer = true;

      window.initGoogleMapsCallback = () => {
        setMapLoaded(true);
      };

      script.onerror = () => {
        setLoadError('Failed to load Google Maps SDK. Please check your internet connection or API key configuration.');
      };

      document.head.appendChild(script);
    } else {
      // Script tag exists, wait for load
      const interval = setInterval(() => {
        if (window.google && window.google.maps) {
          setMapLoaded(true);
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [googleMapsApiKey]);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Default center at college campus / generic default coordinates
    const defaultCenter = { lat: 12.9716, lng: 77.5946 }; // Bangalore coords as fallback
    const mapOptions = {
      center: defaultCenter,
      zoom: 14,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: true,
      styles: [
        {
          "elementType": "geometry",
          "stylers": [{ "color": "#f5f5f5" }]
        },
        {
          "elementType": "labels.icon",
          "stylers": [{ "visibility": "on" }, { "saturation": -100 }]
        },
        {
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#616161" }]
        },
        {
          "elementType": "labels.text.stroke",
          "stylers": [{ "color": "#f5f5f5" }]
        },
        {
          "featureType": "administrative",
          "elementType": "geometry",
          "stylers": [{ "color": "#bdbdbd" }]
        },
        {
          "featureType": "poi",
          "elementType": "geometry",
          "stylers": [{ "color": "#eeeeee" }]
        },
        {
          "featureType": "road",
          "elementType": "geometry",
          "stylers": [{ "color": "#ffffff" }]
        },
        {
          "featureType": "road.arterial",
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#757575" }]
        },
        {
          "featureType": "road.highway",
          "elementType": "geometry",
          "stylers": [{ "color": "#dadada" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#c9c9c9" }]
        }
      ] // Light monochrome style map configuration
    };

    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    googleMapRef.current = map;

    // If there are stops, center the map to fit bounds
    if (stops.length > 0) {
      fitRouteBounds();
    }
  }, [mapLoaded]);

  // Handle Route Stops and Polyline Rendering
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    const map = googleMapRef.current;

    // Clear old stop markers
    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = [];

    // Clear old polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    if (stops.length === 0) return;

    // Sort stops by sequence
    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
    const pathCoordinates = sortedStops.map(s => ({
      lat: s.stop.latitude,
      lng: s.stop.longitude
    }));

    // Draw Stop Markers (Strict Monochrome style: black circle with index)
    sortedStops.forEach((item, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: item.stop.latitude, lng: item.stop.longitude },
        map: map,
        title: item.stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#ffffff',
          fillOpacity: 0.9,
          strokeColor: '#000000',
          strokeWeight: 3,
          scale: 12,
        },
        label: {
          text: (index + 1).toString(),
          color: '#000000',
          fontWeight: 'bold',
          fontSize: '11px'
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:black; font-family:Poppins,sans-serif; padding:5px;">
                    <strong>Stop ${index + 1}: ${item.stop.name}</strong>
                  </div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      stopMarkersRef.current.push(marker);
    });

    // Draw Polyline (Solid black line for high-contrast monochrome design)
    const polyline = new window.google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#000000',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: map
    });

    routePolylineRef.current = polyline;

    fitRouteBounds();
  }, [mapLoaded, stops]);

  // Handle live bus marker placement and updates
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    const map = googleMapRef.current;

    // If bus goes offline or trip ended, clean up bus marker
    if (status === 'NOT_STARTED' || status === 'OFFLINE' || !busLocation) {
      if (busMarkerRef.current) {
        busMarkerRef.current.setMap(null);
        busMarkerRef.current = null;
      }
      return;
    }

    const busPos = { lat: busLocation.latitude, lng: busLocation.longitude };

    // Choose marker style based on status
    let fillColor = '#000000'; // LIVE
    let strokeColor = '#ffffff';
    let strokeWidth = 3;

    if (status === 'STALE') {
      fillColor = '#525252'; // Greyed out for lagging status
      strokeColor = '#a3a3a3';
    }

    if (!busMarkerRef.current) {
      // Create new bus marker
      const busMarker = new window.google.maps.Marker({
        position: busPos,
        map: map,
        title: 'Live Bus Location',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, // Arrow representing direction/movement
          fillColor: fillColor,
          fillOpacity: 1,
          strokeColor: strokeColor,
          strokeWeight: strokeWidth,
          scale: 7,
          rotation: busLocation.heading || 0
        },
        zIndex: 999
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:black; font-family:Poppins,sans-serif; padding:5px;">
                    <strong>Bus Status: ${status}</strong>
                  </div>`
      });

      busMarker.addListener('click', () => {
        infoWindow.open(map, busMarker);
      });

      busMarkerRef.current = busMarker;
      map.panTo(busPos); // Auto center on initial load
    } else {
      // Update existing marker position
      busMarkerRef.current.setPosition(busPos);
      
      // Update marker icon colors if status changed
      busMarkerRef.current.setIcon({
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: fillColor,
        fillOpacity: 1,
        strokeColor: strokeColor,
        strokeWeight: strokeWidth,
        scale: 7
      });
    }
  }, [mapLoaded, busLocation, status]);

  const fitRouteBounds = () => {
    if (!googleMapRef.current || stops.length === 0) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    stops.forEach(s => {
      bounds.extend(new window.google.maps.LatLng(s.stop.latitude, s.stop.longitude));
    });

    if (busLocation) {
      bounds.extend(new window.google.maps.LatLng(busLocation.latitude, busLocation.longitude));
    }

    googleMapRef.current.fitBounds(bounds);
    
    // Set a maximum zoom level if bounds fit too closely (e.g. single stop)
    const listener = window.google.maps.event.addListener(googleMapRef.current, 'bounds_changed', () => {
      if (googleMapRef.current.getZoom() > 16) {
        googleMapRef.current.setZoom(15);
      }
      window.google.maps.event.removeListener(listener);
    });
  };

  const handleRecenter = () => {
    if (googleMapRef.current && busLocation) {
      googleMapRef.current.panTo({
        lat: busLocation.latitude,
        lng: busLocation.longitude
      });
      googleMapRef.current.setZoom(16);
    } else if (googleMapRef.current && stops.length > 0) {
      fitRouteBounds();
    }
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center">
        <p className="text-zinc-400 mb-4">{loadError}</p>
        <div className="text-xs text-zinc-600 max-w-md">
          To display Google Maps, ensure <code className="bg-zinc-900 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="bg-zinc-900 px-1 py-0.5 rounded">.env</code> is populated with a valid key.
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-zinc-800">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500 z-10 font-medium">
          Loading Map Display...
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '350px' }} />
      
      {mapLoaded && (busLocation || stops.length > 0) && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition-colors shadow-lg active:scale-95 z-10"
          title="Recenter Map"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.98 0-5.682-1.089-7.843-2.918m15.686 0A8.996 8.996 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Map;
