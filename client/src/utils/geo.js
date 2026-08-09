/**
 * Calculate the distance between two coordinates in kilometers using the Haversine formula.
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Estimate the ETA to a target stop.
 * @param {Number} busLat Current bus latitude
 * @param {Number} busLon Current bus longitude
 * @param {Number} stopLat Stop latitude
 * @param {Number} stopLon Stop longitude
 * @param {Number} speedInMps Speed in meters per second
 * @returns {Number} ETA in minutes
 */
export const calculateETA = (busLat, busLon, stopLat, stopLon, speedInMps) => {
  const distance = calculateDistance(busLat, busLon, stopLat, stopLon);
  
  // Convert speed from m/s to km/h
  let speedKmh = (speedInMps || 0) * 3.6;

  // If bus is stationary or speed is extremely low, assume average city bus speed (20 km/h) for practical ETA
  if (speedKmh < 5) {
    speedKmh = 20; 
  }

  const timeHours = distance / speedKmh;
  const timeMinutes = Math.round(timeHours * 60);

  // Buffer of 2 minutes for stops/traffic
  return Math.max(1, timeMinutes + 2);
};
