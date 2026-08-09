# Google Maps API Guidelines & Pricing Structure

This document details the pricing model, usage quotas, and recommended security restrictions for Google Maps JavaScript API.

## API Key Security & Restrictions

To prevent theft and unauthorized use of your Google Maps API key, implement the following restrictions in the **Google Cloud Console**:

1. **HTTP Referrer Restriction**: 
   - Restrict the key to web browsers.
   - Add your local dev URL (e.g. `http://localhost:5173/*`) and your production domain (e.g., `https://yourcollege.edu/*`).
2. **API Restrictions**:
   - Limit the key so it can only query the **Maps JavaScript API**.

---

## Cost Analysis & Quotas (Monthly)

Google provides a **$200 free monthly credit** per billing account, which resets every month. This is sufficient for development, testing, and small deployments.

| API / Feature | Cost per 1,000 requests | Volume covered by $200 free tier |
|---|---|---|
| **Maps JavaScript API (Dynamic Map Load)** | $7.00 | **28,500 loads / month** |
| **Directions API (Route Pathing)** | $5.00 | **40,000 requests / month** |
| **Distance Matrix API (Speed/Traffic ETA)** | $7.00 | **28,500 requests / month** |

### Cost Optimization in this Application

- **Display Layer Only**: The core business logic, stops, and latitude/longitude storage are completely provider-agnostic. We only load Google Maps on the client side to render the HTML5 canvas, markers, and polyline.
- **Polyline rendering**: Instead of querying Directions API on every location update (which costs $5/1K requests), we draw a static polyline path connecting the sequential route stop coordinates directly using standard SVG canvas overlays (`google.maps.Polyline`). This reduces external API calls to **zero**, incurring charges only for the initial map page load.
- **Dynamic speed-based ETA**: To avoid Distance Matrix API queries ($7/1K requests), we calculate the remaining time on the client side using the **Haversine formula** and the vehicle's actual speed reported by the browser GPS.
