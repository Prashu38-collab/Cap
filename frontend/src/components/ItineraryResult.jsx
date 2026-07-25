import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import SplitLayout from "./SplitLayout";
import { getOSRMRoute, saveItinerary } from "../utils/api";
import "../styles/itineraryresult.css";

const catColors = {
  nature: "#059669",
  religious: "#d97706",
  cultural: "#7c3aed",
  adventure: "#dc2626",
  hotel: "#2563eb",
  transit: "#8b5cf6",
  meal: "#f59e0b",
  activity: "#3b82f6",
};

function getCatColor(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("nature")) return catColors.nature;
  if (c.includes("religious")) return catColors.religious;
  if (c.includes("cultural")) return catColors.cultural;
  if (c.includes("adventure")) return catColors.adventure;
  return "#6b7280";
}

function getCategoryDescription(cat, indoorOutdoor) {
  const c = (cat || "").toLowerCase();
  const isOutdoor = (indoorOutdoor || "").toLowerCase() === "outdoor";
  if (c.includes("nature")) return isOutdoor ? "Scenic natural site. Take in the views and surroundings." : "Natural attraction. Enjoy the environment and scenery.";
  if (c.includes("religious")) return "Religious and spiritual site. Observe local customs and traditions.";
  if (c.includes("cultural")) return "Cultural and heritage attraction. Learn about local history and traditions.";
  if (c.includes("adventure")) return "Adventure activity. Prepare for an active experience.";
  return "Point of interest. Take your time exploring the area.";
}

const createMarkerPin = (color, label, active = true) => {
  const sz = active ? 32 : 24;
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${sz}px;
        height: ${sz}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${active ? '2.5px' : '1.5px'} solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          color: #ffffff;
          font-weight: 800;
          font-size: ${active ? '11px' : '9px'};
          font-family: system-ui, -apple-system, sans-serif;
        ">${label}</div>
      </div>
    `,
    className: "custom-map-pin",
    iconSize: [sz, sz + 6],
    iconAnchor: [sz / 2, sz + 6],
    popupAnchor: [0, -(sz + 6)],
  });
};

function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 15);
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function EventIcon({ type, category }) {
  if (type === "meal") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    );
  }
  if (type === "transit") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="14" rx="2"/>
        <path d="M7 21l2-4"/><path d="M17 21l-2-4"/>
        <circle cx="7" cy="13" r="1"/><circle cx="17" cy="13" r="1"/>
      </svg>
    );
  }
  if (type === "activity" || type === "hotel") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
        <path d="M9 21V11h6v10"/>
      </svg>
    );
  }
  const color = getCatColor(category);
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function placeDurationLabel(place) {
  const val = place.estimated_duration_value;
  const unit = (place.estimated_duration_unit || "hours").toLowerCase();
  if (val) return `${val} ${unit}`;
  return null;
}

function placeDurationMinutes(place) {
  if (place.estimated_duration_value) {
    const val = parseFloat(place.estimated_duration_value);
    const unit = (place.estimated_duration_unit || "hours").toLowerCase();
    if (unit.includes("min")) return Math.round(val);
    return Math.round(val * 60);
  }
  if (place.duration) return Math.round(place.duration * 60);
  return 120;
}

function advanceTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildSchedule(day, dayIndex, totalDays, corridor) {
  const places = (day.places || []).filter(p => p.latitude && p.longitude);
  const isFirst = dayIndex === 0 && totalDays > 1;
  const isLast = dayIndex === totalDays - 1 && totalDays > 1;
  const isSingle = totalDays === 1;
  const isExploredAll = day.day_type === "explored_all";
  const hasTransit = corridor && corridor.length > 1;
  const items = [];

  const addPlaceVisit = (place, t, order) => {
    const durMin = placeDurationMinutes(place);
    const actLabel = place.activity_label || getCategoryDescription(place.category, place.indoor_outdoor).split(".")[0];
    items.push({
      time: t,
      label: `${actLabel} ${place.name}`,
      type: "place",
      place,
      icon: "place",
      description: getCategoryDescription(place.category, place.indoor_outdoor),
      estimatedDuration: `${durMin} minutes`,
      order,
    });
  };

  const addTransit = (fromName, toName, t, travelMin) => {
    items.push({
      time: t,
      label: `Travel to ${toName}`,
      type: "transit",
      icon: "transit",
      transitMinutes: travelMin,
    });
  };

  if (isExploredAll) {
    items.push({ time: "07:30", label: "Breakfast", type: "meal", icon: "meal" });
    items.push({ time: "09:00", label: "Continue sightseeing", type: "activity", icon: "explore", description: "Your planned sightseeing has been completed. Enjoy a relaxed day at your own pace." });
    items.push({ time: "12:30", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  if (isFirst) {
    items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });
    if (hasTransit) {
      items.push({ time: "08:00", label: "Depart for destination", type: "activity", icon: "depart", description: "Begin your journey towards the destination." });
      items.push({ time: "09:00", label: "Arrive and check in", type: "activity", icon: "hotel", description: "Arrive at your hotel and settle in." });
    }
    if (places.length > 0) {
      let t = hasTransit ? "10:00" : "09:00";
      places.forEach((p, i) => {
        if (i > 0) {
          const travelMin = p.travel_time_to_next_min || 20;
          addTransit(places[i - 1].name, p.name, t, travelMin);
          t = advanceTime(t, travelMin);
        }
        addPlaceVisit(p, t, i + 1);
        t = advanceTime(t, placeDurationMinutes(p) + 10);
      });
    } else {
      items.push({ time: "11:00", label: "Explore nearby area", type: "activity", icon: "explore", description: "Look around the neighbourhood and get oriented." });
    }
    items.push({ time: "13:00", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  if (isLast) {
    items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });
    if (places.length > 0) {
      let t = "08:30";
      places.forEach((p, i) => {
        if (i > 0) {
          const travelMin = p.travel_time_to_next_min || 20;
          addTransit(places[i - 1].name, p.name, t, travelMin);
          t = advanceTime(t, travelMin);
        }
        addPlaceVisit(p, t, i + 1);
        t = advanceTime(t, placeDurationMinutes(p) + 10);
      });
    }
    items.push({ time: "12:00", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "13:30", label: "Begin return journey", type: "activity", icon: "return", description: "Check out and head home." });
    return items;
  }

  if (isSingle) {
    items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });
    if (places.length > 0) {
      let t = "09:00";
      places.forEach((p, i) => {
        if (i > 0) {
          const travelMin = p.travel_time_to_next_min || 20;
          addTransit(places[i - 1].name, p.name, t, travelMin);
          t = advanceTime(t, travelMin);
        }
        addPlaceVisit(p, t, i + 1);
        t = advanceTime(t, placeDurationMinutes(p) + 10);
      });
    }
    items.push({ time: "13:00", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });

  if (places.length === 0) {
    items.push({ time: "09:00", label: "Continue sightseeing", type: "activity", icon: "explore", description: "Free day — revisit favourites or relax." });
    items.push({ time: "12:30", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  const half = Math.ceil(places.length / 2);
  const morning = places.slice(0, half);
  const afternoon = places.slice(half);

  let t = "09:00";
  morning.forEach((p, i) => {
    if (i > 0) {
      const travelMin = p.travel_time_to_next_min || 20;
      addTransit(morning[i - 1].name, p.name, t, travelMin);
      t = advanceTime(t, travelMin);
    }
    addPlaceVisit(p, t, i + 1);
    t = advanceTime(t, placeDurationMinutes(p) + 10);
  });

  items.push({ time: "13:00", label: "Lunch", type: "meal", icon: "meal" });

  let t2 = "14:00";
  afternoon.forEach((p, i) => {
    if (i > 0) {
      const travelMin = p.travel_time_to_next_min || 20;
      addTransit(afternoon[i - 1].name, p.name, t2, travelMin);
      t2 = advanceTime(t2, travelMin);
    }
    addPlaceVisit(p, t2, morning.length + i + 1);
    t2 = advanceTime(t2, placeDurationMinutes(p) + 10);
  });

  items.push({ time: "17:00", label: "Return to hotel", type: "activity", icon: "hotel", description: "Head back to your hotel and rest." });
  items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
  return items;
}

function downloadItineraryJSON(days, corridor, preferenceId) {
  const data = { preferenceId, corridor, itinerary: days };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `itinerary-${preferenceId || "trip"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPopupHTML({ type, name, district, category, duration, hotelName, order, lat, lon, travelTime, activityLabel }) {
  if (type === "hotel") {
    return `<div style="font-family:system-ui,sans-serif;min-width:200px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#2563eb;font-weight:700;margin-bottom:3px">Hotel</div>
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">${hotelName || name}</div>
      <div style="font-size:11px;color:#475569;margin-bottom:2px">${district || ""}</div>
      ${lat && lon ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>` : ""}
    </div>`;
  }
  const actText = activityLabel || "Visit";
  const durText = duration || "";
  const travelText = travelTime ? `${travelTime} min` : "";
  const catText = category || "";
  const orderText = order ? `#${order}` : "";
  return `<div style="font-family:system-ui,sans-serif;min-width:200px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:${getCatColor(category)};font-weight:700;margin-bottom:3px">${actText} ${orderText}</div>
    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">${name}</div>
    <div style="font-size:11px;color:#475569;margin-bottom:4px">${district || ""}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
      ${catText ? `<span style="font-size:10px;background:#f1f5f9;padding:2px 6px;border-radius:3px;color:#475569">${catText}</span>` : ""}
      ${durText ? `<span style="font-size:10px;background:#f1f5f9;padding:2px 6px;border-radius:3px;color:#475569">~${durText}</span>` : ""}
      ${travelText ? `<span style="font-size:10px;background:#eff6ff;padding:2px 6px;border-radius:3px;color:#2563eb">~${travelText} drive</span>` : ""}
    </div>
    ${lat && lon ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>` : ""}
  </div>`;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT — renders via SplitLayout
   ───────────────────────────────────────────── */
export default function ItineraryResult({ itinerary, weatherForecast, preferenceId, corridor, onReset }) {
  const [activeDay, setActiveDay] = useState(1);
  const [animDir, setAnimDir] = useState("next");
  const [highlightedId, setHighlightedId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedHotelIds, setSelectedHotelIds] = useState({});
  const markerRefs = useRef({});

  const selectHotel = (dayNum, hotel) => {
    setSelectedHotelIds(prev => ({ ...prev, [dayNum]: hotel.hotel_id }));
  };

  if (!itinerary?.itinerary) return null;
  const days = itinerary.itinerary;
  const currentDay = days.find((d) => d.day === activeDay) || days[0];
  if (!currentDay) return null;

  const selectedHotelId = selectedHotelIds[activeDay];
  const displayHotel = selectedHotelId && currentDay.hotel_options
    ? currentDay.hotel_options.find(h => h.hotel_id === selectedHotelId) || currentDay.hotel
    : currentDay.hotel;

  const changeDay = (day) => {
    setMapCenter(null);
    setHighlightedId(null);
    setAnimDir(day > activeDay ? "next" : "prev");
    setActiveDay(day);
  };

  const allMarkers = [];
  let markerCounter = 1;
  days.forEach((d) => {
    const dayHotel = d.day === activeDay ? displayHotel : d.hotel;
    if (dayHotel?.latitude && dayHotel?.longitude) {
      allMarkers.push({
        id: `hotel-${d.day}`,
        name: dayHotel.hotel_name,
        lat: parseFloat(dayHotel.latitude),
        lon: parseFloat(dayHotel.longitude),
        day: d.day,
        type: "hotel",
        category: "hotel",
        district: d.hotel.district || d.district || "",
        label: "H",
        order: null,
        duration: null,
        travelTime: null,
        activityLabel: "Hotel",
      });
    }
    (d.places || []).forEach((p) => {
      if (p.latitude && p.longitude) {
        allMarkers.push({
          id: p.place_id || `p-${d.day}-${markerCounter}`,
          name: p.name || p.place_name,
          lat: parseFloat(p.latitude),
          lon: parseFloat(p.longitude),
          day: d.day,
          type: "place",
          category: p.category,
          district: p.district || d.district || "",
          label: `${markerCounter}`,
          order: markerCounter,
          duration: placeDurationLabel(p),
          travelTime: p.travel_time_to_next_min,
          activityLabel: p.activity_label || "Visit",
        });
        markerCounter++;
      }
    });
  });

  const activeBounds = allMarkers.filter((m) => m.day === activeDay).map((m) => [m.lat, m.lon]);
  const activeDayPts = [];
  if (displayHotel?.latitude) activeDayPts.push([parseFloat(displayHotel.latitude), parseFloat(displayHotel.longitude)]);
  (currentDay.places || []).forEach((p) => { if (p.latitude && p.longitude) activeDayPts.push([parseFloat(p.latitude), parseFloat(p.longitude)]); });

  const schedule = buildSchedule(currentDay, activeDay - 1, days.length, corridor);
  const sightseeingPlaces = (currentDay.places || []).filter((p) => p.latitude && p.longitude);
  const totalDist = currentDay.total_travel_km || (currentDay.places || []).reduce((sum, p) => sum + (p.travel_dist_km || 0), 0) || 0;
  const recommendedTransport = (currentDay.places || []).find((p) => p.transport_mode)?.transport_mode || "Private Car / Local Bus";

  const focusPlace = (place) => {
    setHighlightedId(place.id);
    setMapCenter([place.lat, place.lon]);
    setMapZoom(15);
    setTimeout(() => { markerRefs.current[place.id]?.openPopup(); }, 100);
  };

  const focusHotel = (hotel, day) => {
    const id = `hotel-${day}`;
    setHighlightedId(id);
    setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
    setMapZoom(15);
    setTimeout(() => { markerRefs.current[id]?.openPopup(); }, 100);
  };

  const hoverPlace = (place) => {
    if (!place) return;
    setHighlightedId(place.id);
    setMapCenter([place.lat, place.lon]);
    setMapZoom(15);
    setTimeout(() => { markerRefs.current[place.id]?.openPopup(); }, 50);
  };

  const unhoverPlace = () => {
    setHighlightedId(null);
  };

  const focusMarker = (id) => {
    setHighlightedId(id);
    const el = document.getElementById(`tl-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const weather = weatherForecast?.[activeDay - 1] || null;

  const leftPanel = (
    <div className="ir-main-container">
      {/* Header Card */}
      <div className="ir-header-card sl-card">
        <div className="ir-header-top-row">
          <div>
            <h2 className="ir-header-title">Your Journey Itinerary</h2>
            {corridor?.length > 0 && (
              <div className="ir-header-corridor">Route: {corridor.join(" → ")}</div>
            )}
          </div>
          <button className="ir-save-btn" onClick={() => downloadItineraryJSON(days, corridor, preferenceId)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            Download
          </button>
        </div>
        <div className="ir-stats-bar">
          <div className="ir-stat-item">
            <span className="ir-stat-val">{totalDist > 0 ? `${totalDist.toFixed(1)} km` : "—"}</span>
            <span className="ir-stat-lbl">Total Distance</span>
          </div>
          <div className="ir-stat-item">
            <span className="ir-stat-val" style={{ fontSize: "12px" }}>{recommendedTransport}</span>
            <span className="ir-stat-lbl">Transport</span>
          </div>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="ir-tabs-row sl-card" style={{ padding: "12px 16px" }}>
        {days.map((d) => (
          <button
            key={d.day}
            className={`ir-day-tab ${activeDay === d.day ? "is-active" : ""}`}
            onClick={() => changeDay(d.day)}
          >
            <span className="ir-day-tab-num">Day {d.day}</span>
            <span className="ir-day-tab-lbl">{d.day_title || d.district}</span>
          </button>
        ))}
      </div>

      {/* Day Content with Animation */}
      <div key={activeDay} className={`ir-day-content slide-${animDir}`}>
        {/* Day Header */}
        <div className="ir-day-header-card">
          <div className="ir-day-header-row">
            <div className="ir-day-header-left">
              <span className="ir-day-number-badge">Day {currentDay.day}</span>
              <div>
                <h3 className="ir-day-title">{currentDay.day_title || currentDay.district}</h3>
                {displayHotel && (
                  <span className="ir-day-hotel">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
                      <path d="M9 21V11h6v10"/>
                    </svg>
                    {displayHotel.hotel_name}
                  </span>
                )}
              </div>
            </div>
            {weather && (
              <div className="ir-weather-badge">
                <span className="ir-weather-icon">{weather.icon || "☀️"}</span>
                <span className="ir-weather-temp">{weather.temp || "24°C"}</span>
                <span className="ir-weather-desc">{weather.description || "Clear"}</span>
              </div>
            )}
          </div>
        </div>

        {weather?.is_bad_weather && (
          <div className="ir-weather-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Rain expected — pack an umbrella.
          </div>
        )}

        {currentDay.hotel_options && currentDay.hotel_options.length > 0 && (
          <div className="ir-hotel-options">
            <div className="ir-hotel-options-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
                <path d="M9 21V11h6v10"/>
              </svg>
              <span>Hotels in {currentDay.district}</span>
            </div>
            <div className="ir-hotel-options-list">
              {currentDay.hotel_options.map((h) => {
                const isSelected = selectedHotelId === h.hotel_id || (!selectedHotelId && currentDay.hotel?.hotel_id === h.hotel_id);
                return (
                  <div
                    key={h.hotel_id}
                    className={`ir-hotel-option-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectHotel(activeDay, h)}
                  >
                    <div className="ir-hotel-option-info">
                      <span className="ir-hotel-option-name">{h.hotel_name}</span>
                      <span className="ir-hotel-option-meta">
                        {h.review_score > 0 && <span className="ir-hotel-option-rating">★ {h.review_score.toFixed(1)}</span>}
                        {h.budget > 0 && <span className="ir-hotel-option-price">NPR {Math.round(h.budget).toLocaleString()}</span>}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="ir-hotel-option-check">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule Timeline */}
        <div className="ir-timeline-container">
          {schedule.map((item, idx) => {
            const isPlace = item.type === "place";
            const isMeal = item.type === "meal";
            const isTransit = item.type === "transit";
            const isActivity = item.type === "activity";
            const place = item.place;
            const itemId = place?.place_id || `${item.type}-${activeDay}-${idx}`;
            const isHighlighted = highlightedId === itemId;
            const color = isPlace ? getCatColor(place?.category) : isMeal ? "#f59e0b" : isTransit ? "#8b5cf6" : "#3b82f6";

            return (
              <div key={idx} id={`tl-${itemId}`} className={`ir-tl-item ${isHighlighted ? "is-focused" : ""}`}>
                <div className="ir-tl-node">
                  <EventIcon type={item.type} category={place?.category} />
                </div>
                <div
                  className={`ir-tl-card ${isPlace ? "is-clickable" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
                  onClick={isPlace ? () => focusPlace({ id: itemId, lat: place.latitude, lon: place.longitude }) : isActivity && item.icon === "hotel" ? () => focusHotel(displayHotel, activeDay) : undefined}
                  onMouseEnter={isPlace ? () => hoverPlace({ id: itemId, lat: place.latitude, lon: place.longitude }) : undefined}
                  onMouseLeave={isPlace ? unhoverPlace : undefined}
                >
                  <div className="ir-tl-card-header">
                    <span className="ir-tl-time-badge">{item.time}</span>
                    {isPlace && place?.category && (
                      <span className="ir-meta-chip" style={{ background: color + "15", color }}>
                        {place.category}
                      </span>
                    )}
                    {isTransit && (
                      <span className="ir-meta-chip transit">Drive</span>
                    )}
                    {isMeal && (
                      <span className="ir-meta-chip" style={{ background: "#fef3c7", color: "#92400e" }}>Meal</span>
                    )}
                    {isActivity && (
                      <span className="ir-meta-chip" style={{ background: "#eff6ff", color: "#2563eb" }}>Activity</span>
                    )}
                  </div>

                  <h4 className="ir-tl-title">{item.label}</h4>
                  {item.description && <p className="ir-tl-desc">{item.description}</p>}

                  {item.estimatedDuration && (
                    <div className="ir-tl-meta-row">
                      <span className="ir-meta-chip">~{item.estimatedDuration}</span>
                    </div>
                  )}
                  {isTransit && item.transitMinutes && (
                    <div className="ir-tl-meta-row">
                      <span className="ir-meta-chip transit">~{item.transitMinutes} min travel</span>
                    </div>
                  )}
                  {isPlace && place && (
                    <div className="ir-tl-meta-row">
                      {place.duration && <span className="ir-meta-chip">{place.duration} hrs</span>}
                      {place.travel_dist_km > 0 && (
                        <span className="ir-meta-chip">{place.travel_dist_km} km</span>
                      )}
                      {place.district && <span className="ir-meta-chip">{place.district}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hotel / Reset Bar */}
        <div className="ir-bottom-actions">
          {displayHotel && (
            <div
              className="ir-hotel-line"
              onClick={() => focusHotel(displayHotel, activeDay)}
              onMouseEnter={() => { setHighlightedId(`hotel-${activeDay}`); setTimeout(() => { markerRefs.current[`hotel-${activeDay}`]?.openPopup(); }, 50); }}
              onMouseLeave={() => setHighlightedId(null)}
            >
              <div className="ir-hotel-dot" />
              <span className="ir-hotel-name">{displayHotel.hotel_name}</span>
              <span className="ir-hotel-hint">view on map</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="sl-bottom-actions">
        {onReset && (
          <button className="sl-btn sl-btn-secondary" onClick={onReset}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Plan Another Trip
          </button>
        )}
        <button
          className="sl-btn sl-btn-primary"
          onClick={async () => {
            try {
              await saveItinerary(preferenceId, itinerary);
              alert("Itinerary saved successfully!");
            } catch (err) {
              alert("Failed to save: " + (err.message || "Unknown error"));
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Itinerary
        </button>
      </div>
    </div>
  );

  return (
    <SplitLayout
      leftContent={leftPanel}
      rightContent={
        <ItineraryRightMap
          itinerary={itinerary}
          activeDay={activeDay}
          highlightedId={highlightedId}
          onSelectMarker={focusMarker}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          allMarkers={allMarkers}
          markerRefs={markerRefs}
          days={days}
          activeDayPts={activeDayPts}
          currentDay={currentDay}
          activeBounds={activeBounds}
        />
      }
    />
  );
}

/* ─────────────────────────────────────────────
   Google Encoded Polyline decoder
   ───────────────────────────────────────────── */
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/* ─────────────────────────────────────────────
   RIGHT MAP — used by SplitLayout
   Fetches OSRM road route and draws real polyline
   Shows all days' markers (dimmed for non-active)
   ───────────────────────────────────────────── */
function ItineraryMapInner({ itinerary, activeDay, highlightedId, onSelectMarker, mapCenter, mapZoom, allMarkers, markerRefs, days, activeDayPts, currentDay, activeBounds }) {
  const [routeGeometry, setRouteGeometry] = useState(null);

  useEffect(() => {
    if (activeDayPts.length < 2) {
      setRouteGeometry(null);
      return;
    }
    let cancelled = false;
    getOSRMRoute(activeDayPts)
      .then((data) => {
        if (!cancelled && data?.geometry) {
          let decoded;
          if (typeof data.geometry === "string") {
            decoded = decodePolyline(data.geometry);
          } else if (data.geometry?.coordinates) {
            decoded = data.geometry.coordinates.map((c) => [c[1], c[0]]);
          } else {
            decoded = null;
          }
          setRouteGeometry(decoded);
        } else if (!cancelled) {
          setRouteGeometry(null);
        }
      })
      .catch(() => { if (!cancelled) setRouteGeometry(null); });
    return () => { cancelled = true; };
  }, [activeDay, activeDayPts.length]);

  if (!itinerary?.itinerary) return null;

  return (
    <MapContainer
      center={mapCenter || (activeBounds.length > 0 ? activeBounds[0] : [27.7, 85.3])}
      zoom={mapZoom || 13}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {allMarkers.map((m) => {
        const isToday = m.day === activeDay;
        const isHighlighted = highlightedId === m.id;
        const color = m.type === "hotel"
          ? (isToday ? "#2563eb" : "rgba(37,99,235,.35)")
          : (isToday ? getCatColor(m.category) : "rgba(107,114,128,.35)");
        const label = m.type === "hotel" ? "H" : (m.order || ".");
        return (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={createMarkerPin(isHighlighted ? "#ef4444" : color, label, isToday || isHighlighted)}
            ref={(el) => { if (el) markerRefs.current[m.id] = el; }}
            eventHandlers={{ click: () => onSelectMarker && onSelectMarker(m.id) }}
          >
            <Popup>
              <div className="ir-map-popup">
                <div className="ir-popup-cat" style={{ color }}>
                  {m.type === "hotel" ? "Hotel" : `Stop #${m.order}`}
                </div>
                <div className="ir-popup-title">{m.name}</div>
                <div className="ir-popup-district">{m.district}</div>
                {m.duration && <div className="ir-popup-duration">Duration: {m.duration}</div>}
                {m.travelTime && <div className="ir-popup-travel">~{m.travelTime} min drive</div>}
                <div className="ir-popup-coords">{m.lat.toFixed(4)}, {m.lon.toFixed(4)}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {days.map((d) => {
        if (d.day === activeDay) return null;
        const pts = [];
        if (d.hotel?.latitude && d.hotel?.longitude) pts.push([parseFloat(d.hotel.latitude), parseFloat(d.hotel.longitude)]);
        (d.places || []).forEach((p) => { if (p.latitude && p.longitude) pts.push([parseFloat(p.latitude), parseFloat(p.longitude)]); });
        return pts.length > 1 ? <Polyline key={`route-${d.day}`} positions={pts} color="#cbd5e1" weight={2} opacity={0.4} dashArray="6 4" /> : null;
      })}
      {routeGeometry && routeGeometry.length > 1 ? (
        <Polyline positions={routeGeometry} color="#2563eb" weight={4} opacity={0.9} />
      ) : (
        activeDayPts.length > 1 && (
          <Polyline positions={activeDayPts} color="#2563eb" weight={3.5} opacity={0.85} dashArray="6, 6" />
        )
      )}
      <MapController center={mapCenter} zoom={mapZoom} bounds={activeBounds} />
    </MapContainer>
  );
}

export function ItineraryRightMap(props) {
  return <ItineraryMapInner {...props} />;
}
