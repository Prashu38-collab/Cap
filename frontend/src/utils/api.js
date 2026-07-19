const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || "Request failed");
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

export function generateFromHotel(preferenceId, startingHotelId) {
  return request(`/itinerary/${preferenceId}/generate`, {
    method: "POST",
    body: JSON.stringify({ starting_hotel_id: startingHotelId }),
  });
}

export function saveSavedItinerary(payload) {
  return request("/saved-itineraries/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listSavedItineraries(preferenceId = null) {
  const query = preferenceId ? `?preference_id=${encodeURIComponent(preferenceId)}` : "";
  return request(`/saved-itineraries/${query}`);
}

export function updateSavedItinerary(itineraryId, payload) {
  return request(`/saved-itineraries/${itineraryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSavedItinerary(itineraryId) {
  return request(`/saved-itineraries/${itineraryId}`, {
    method: "DELETE",
  });
}
