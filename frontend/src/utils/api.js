import { getErrorMessage } from "./errorMessage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const config = { headers, ...options };
  const res = await fetch(url, config);
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(getErrorMessage({ response: { data } }, "Request failed"));
  }
  return data;
}

export function createItinerary(payload) {
  return request("/itinerary/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getWeather(district) {
  return request(`/weather/${encodeURIComponent(district)}`);
}

export function getPlacesByDistrict(district) {
  return request(`/places/district/${encodeURIComponent(district)}`);
}

export function getRecommendedPlaces(preferenceId) {
  return request(`/places/recommend/${preferenceId}`);
}

export function getHotelsByPreference(preferenceId) {
  return request(`/hotels/preference/${preferenceId}`);
}

export function getItineraryMap(preferenceId) {
  return request(`/itinerary/map/${preferenceId}`);
}

export function createPreference(payload) {
  return request("/itinerary/create-preference", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateFromHotel(preferenceId, startingHotelId, { includeTransit = false, transitDistricts = [] } = {}) {
  return request(`/itinerary/${preferenceId}/generate`, {
    method: "POST",
    body: JSON.stringify({
      starting_hotel_id: startingHotelId,
      include_transit: includeTransit,
      transit_districts: transitDistricts,
    }),
  });
}

export function getNearbyDistricts(districts) {
  return request("/itinerary/nearby-districts", {
    method: "POST",
    body: JSON.stringify({ districts }),
  });
}

export function getTrekOptions(endingDistrict) {
  return request("/itinerary/get-trek-options", {
    method: "POST",
    body: JSON.stringify({ ending_district: endingDistrict }),
  });
}

export function generateTrek(placeId, travelDays) {
  return request("/itinerary/generate-trek", {
    method: "POST",
    body: JSON.stringify({ place_id: placeId, travel_days: travelDays }),
  });
}

export function selectTrekHotel(preferenceId, dayNumber, hotelId) {
  return request("/itinerary/select-trek-hotel", {
    method: "POST",
    body: JSON.stringify({ preference_id: preferenceId, day_number: dayNumber, hotel_id: hotelId }),
  });
}
