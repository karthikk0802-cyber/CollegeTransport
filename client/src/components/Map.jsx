import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const Map = ({ busLocation, stops = [], status = 'NOT_STARTED' }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const stopMarkersRef = useRef([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center at Bangalore (12.9716, 77.5946) or first stop
    const initialCenter = stops.length > 0 
      ? [stops[0].stop.latitude, stops[0].stop.longitude]
      : [12.9716, 77.5946];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    // Add Light Monochrome Tile Layer (CartoDB Positron - Free, no API Key needed)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Fit bounds on initial load if stops exist
    if (stops.length > 0) {
      fitRouteBounds();
    }

    // Cleanup map on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Stops and Route Polyline Drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing stop markers
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (stops.length === 0) return;

    // Sort stops and format coords
    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
    const coordinates = sortedStops.map(s => [s.stop.latitude, s.stop.longitude]);

    // Draw Stop Markers (Monochrome circles using Tailwind styled DivIcons)
    sortedStops.forEach((item, index) => {
      const stopIcon = L.divIcon({
        className: '', // Clear default styling
        html: `<div class="w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center font-bold text-xs text-black shadow-md transition-transform hover:scale-110">${index + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([item.stop.latitude, item.stop.longitude], { icon: stopIcon })
        .bindPopup(`<div class="font-sans text-xs text-black p-1"><strong>Stop ${index + 1}:</strong> ${item.stop.name}</div>`)
        .addTo(map);

      stopMarkersRef.current.push(marker);
    });

    // Draw Route Polyline (High-contrast solid black line)
    const polyline = L.polyline(coordinates, {
      color: '#000000',
      weight: 4,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(map);

    polylineRef.current = polyline;

    fitRouteBounds();
  }, [stops]);

  // Handle Live Bus Marker updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up marker if offline or not started
    if (status === 'NOT_STARTED' || status === 'OFFLINE' || !busLocation) {
      if (busMarkerRef.current) {
        busMarkerRef.current.remove();
        busMarkerRef.current = null;
      }
      return;
    }

    const busCoords = [busLocation.latitude, busLocation.longitude];

    // Determine status indicators
    const isStale = status === 'STALE';
    const bgClass = isStale ? 'bg-zinc-500' : 'bg-black animate-pulse';

    const busIcon = L.divIcon({
      className: '',
      html: `<div class="w-8 h-8 flex items-center justify-center">
               <div class="w-6 h-6 rounded-full ${bgClass} border-2 border-white flex items-center justify-center shadow-lg">
                 <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                 </svg>
               </div>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (!busMarkerRef.current) {
      // Create new bus marker
      const marker = L.marker(busCoords, { icon: busIcon })
        .bindPopup(`<div class="font-sans text-xs text-black p-1"><strong>Bus status:</strong> ${status}</div>`)
        .addTo(map);

      busMarkerRef.current = marker;
      map.panTo(busCoords);
    } else {
      // Move existing marker
      busMarkerRef.current.setLatLng(busCoords);
      busMarkerRef.current.setIcon(busIcon);
      busMarkerRef.current.setPopupContent(`<div class="font-sans text-xs text-black p-1"><strong>Bus status:</strong> ${status}</div>`);
    }
  }, [busLocation, status]);

  const fitRouteBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = [];
    
    stops.forEach(s => {
      bounds.push([s.stop.latitude, s.stop.longitude]);
    });

    if (busLocation && status !== 'OFFLINE') {
      bounds.push([busLocation.latitude, busLocation.longitude]);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (busLocation && status !== 'OFFLINE') {
      map.panTo([busLocation.latitude, busLocation.longitude]);
      map.setZoom(16);
    } else {
      fitRouteBounds();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-zinc-200">
      <div ref={mapContainerRef} className="w-full h-full z-10" style={{ minHeight: '350px' }} />
      
      {(busLocation || stops.length > 0) && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full hover:bg-zinc-150 transition-colors shadow-lg active:scale-95 z-[1000] border border-zinc-200"
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
