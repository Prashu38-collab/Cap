import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

const transportIcons = {
  "Walk / Local Taxi": "🚶",
  "Private Car / Local Bus": "🚗",
  "Tourist Bus / Micro": "🚌",
  "Flight / Long-distance Bus": "✈️",
  "Walk (Trek)": "🥾",
};

const categoryConfig = {
  nature: { color: "#22c55e", bg: "#052e16", icon: "🌿", img: "/images/lake.jpg" },
  religious: { color: "#f59e0b", bg: "#451a03", icon: "🛕", img: "/images/changunarayan.jpg" },
  cultural: { color: "#8b5cf6", bg: "#2e1065", icon: "🏛️", img: "/images/bhaktapur.png" },
  adventure: { color: "#ef4444", bg: "#450a0a", icon: "⛰️", img: "/images/trekking.png" },
};

function getCategoryKey(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("nature")) return "nature";
  if (c.includes("religious")) return "religious";
  if (c.includes("cultural")) return "cultural";
  if (c.includes("adventure")) return "adventure";
  return null;
}

function getDistrictImage(district) {
  const map = {
    kathmandu: "/images/kathmandu.png",
    lalitpur: "/images/lalitpur.jpg",
    bhaktapur: "/images/bhaktapur.png",
    chitwan: "/images/chitwan.jpg",
    dolakha: "/images/dolakha.jpg",
    kavrepalanchowk: "/images/kavre.png",
    nuwakot: "/images/nuwakot.jpg",
    rasuwa: "/images/rasuwa.jpg",
    sindhuli: "/images/sindhuli.jpg",
    sindhupalchowk: "/images/sindhupalchowk.jpg",
  };
  return map[(district || "").toLowerCase().replace(/\s/g, "")] || "/images/lake.jpg";
}

function AnimatedCounter({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = Math.max(1, Math.floor(value / 20));
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(start);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

// Leaflet custom marker generator with dynamic size and opacity
const getCustomIcon = (color, label, isActive = true, isSecondary = false) => {
  const size = isActive ? 32 : 22;
  const fontSize = isActive ? 11 : 9;
  const opacity = isSecondary ? 0.5 : 1.0;

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${isActive ? '2px' : '1px'} solid #fff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        opacity: ${opacity};
        transition: all 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          color: #fff;
          font-weight: bold;
          font-size: ${fontSize}px;
          font-family: sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    className: "place-pin",
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -(size + 6)]
  });
};

// Map view controller for panning, zooming, and bounding
function MapController({ center, zoom, activeBounds, activeDay }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 15);
    } else if (activeBounds && activeBounds.length > 0) {
      map.fitBounds(activeBounds, { padding: [50, 50] });
    }
  }, [center, zoom, activeBounds, activeDay, map]);
  return null;
}

function ItineraryResult({ itinerary, weatherForecast, preferenceId, corridor }) {
  const [activeDay, setActiveDay] = useState(1);
  const [animDir, setAnimDir] = useState("next");

  // Map linking states
  const [highlightedPlaceId, setHighlightedPlaceId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const markerRefs = useRef({});

  if (!itinerary || !itinerary.itinerary) return null;

  const days = itinerary.itinerary;
  const currentDay = days.find((d) => d.day === activeDay) || days[0];
  const weatherToday = weatherForecast?.find((w) => w.day === activeDay);

  if (!currentDay) return null;

  const changeDay = (day) => {
    setMapCenter(null); // Reset manual zoom on day change to let fitBounds work
    setHighlightedPlaceId(null);
    setAnimDir(day > activeDay ? "next" : "prev");
    setActiveDay(day);
  };

  // Compile all places across the entire itinerary to show on map
  const allPlaces = [];
  days.forEach((d) => {
    // Add hotel stay as a marker
    if (d.hotel && d.hotel.latitude && d.hotel.longitude) {
      allPlaces.push({
        id: `hotel-${d.day}`,
        name: d.hotel.hotel_name,
        latitude: parseFloat(d.hotel.latitude),
        longitude: parseFloat(d.hotel.longitude),
        type: "hotel",
        day: d.day,
        category: "hotel",
      });
    }
    // Add attractions/destinations as markers
    d.places.forEach((p, idx) => {
      if (p.latitude && p.longitude) {
        allPlaces.push({
          id: p.place_id || `place-${d.day}-${idx}`,
          name: p.name,
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude),
          type: "place",
          category: p.category,
          day: d.day,
          order: idx + 1,
        });
      }
    });
  });

  // Extract points for active day's polyline path
  const activeDayPoints = [];
  if (currentDay.hotel && currentDay.hotel.latitude && currentDay.hotel.longitude) {
    activeDayPoints.push([parseFloat(currentDay.hotel.latitude), parseFloat(currentDay.hotel.longitude)]);
  }
  currentDay.places.forEach((p) => {
    if (p.latitude && p.longitude) {
      activeDayPoints.push([parseFloat(p.latitude), parseFloat(p.longitude)]);
    }
  });

  // Extract bounds for active day's coordinates
  const activeBounds = allPlaces
    .filter((p) => p.day === activeDay)
    .map((p) => [p.latitude, p.longitude]);

  // Click card zooms to marker and opens popup
  const handlePlaceCardClick = (place) => {
    setHighlightedPlaceId(place.place_id);
    if (place.latitude && place.longitude) {
      setMapCenter([parseFloat(place.latitude), parseFloat(place.longitude)]);
      setMapZoom(15);
      setTimeout(() => {
        const marker = markerRefs.current[place.place_id];
        if (marker) {
          marker.openPopup();
        }
      }, 100);
    }
  };

  const handleHotelCardClick = (hotel, dayNum) => {
    setHighlightedPlaceId(`hotel-${dayNum}`);
    if (hotel.latitude && hotel.longitude) {
      setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
      setMapZoom(15);
      setTimeout(() => {
        const marker = markerRefs.current[`hotel-${dayNum}`];
        if (marker) {
          marker.openPopup();
        }
      }, 100);
    }
  };

  const handleMarkerClick = (markerId) => {
    setHighlightedPlaceId(markerId);
    const elementId = markerId.toString().startsWith("hotel") ? "hotel-card-active" : `place-card-${markerId}`;
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div className="itinerary-split-layout">
      {/* LEFT COLUMN: Travel Timeline */}
      <div className="itinerary-timeline-side">
        {/* HEADER */}
        <div className="ir-header">
          <div className="ir-header-bg" />
          <div className="ir-header-content">
            <h1 className="ir-title">
              <span className="ir-title-icon">🗺️</span>
              Your Journey
            </h1>
            {corridor && corridor.length > 1 && (
              <p className="ir-corridor">
                {corridor.join("  →  ")}
              </p>
            )}
            <p className="ir-subtitle">
              {days.length} {days.length === 1 ? "day" : "days"} of adventure across Nepal
            </p>
            <span className="ir-badge">Trip #{preferenceId}</span>
          </div>
        </div>

        {/* DAY TABS */}
        <div className="ir-day-tabs">
          {days.map((d, idx) => (
            <button
              key={d.day}
              className={`ir-day-tab ${activeDay === d.day ? "active" : ""}`}
              onClick={() => changeDay(d.day)}
              style={{
                "--tab-color": `hsl(${(idx * 35 + 200) % 360}, 70%, 50%)`,
              }}
            >
              <span className="ir-day-num">{d.day}</span>
              <span className="ir-day-label">
                {d.district?.substring(0, 6) || `Day ${d.day}`}
              </span>
              {d.weather_day_warning && <span className="ir-day-warn">⚠️</span>}
            </button>
          ))}
        </div>

        {/* DAY CONTENT with slide animation */}
        <div key={activeDay} className={`ir-day-content slide-${animDir}`}>
          {/* DISTRICT HERO */}
          <div
            className="ir-district-hero"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${getDistrictImage(currentDay.district)})`,
            }}
          >
            <div className="ir-district-info">
              <h2>{currentDay.district || "Kathmandu"}</h2>
              <div className="ir-district-stats">
                <span>📍 {currentDay.places.filter(p => p.type !== "meal").length} places</span>
                <span>🚗 {currentDay.total_travel_km} km</span>
              </div>
            </div>
          </div>

          {/* WEATHER */}
          {weatherToday?.is_bad_weather && (
            <div className="ir-weather-banner">
              <span className="ir-weather-icon">🌧️</span>
              <span>Bad weather forecast — pack an umbrella!</span>
            </div>
          )}
          {currentDay.weather_day_warning && (
            <div className="ir-weather-banner warning">
              <span className="ir-weather-icon">⚠️</span>
              <span>{currentDay.weather_day_warning}</span>
            </div>
          )}

          {/* TRAVEL TIMELINE HEADER & STATS */}
          <div className="itinerary-day-title-wrap">
            <h2>Day {currentDay.day}: {currentDay.district}</h2>
            <div className="itinerary-day-stats">
              <span><i className="fa-solid fa-location-dot"></i> {currentDay.places.filter(p => p.type !== "place").length ? currentDay.places.filter(p => p.type !== "meal").length : 0} destinations</span>
              <span><i className="fa-solid fa-car"></i> {currentDay.total_travel_km} km travel</span>
              {currentDay.places.length > 0 && currentDay.places.some(p => p.transport_mode) && (
                <span>
                  <i className="fa-solid fa-bus"></i> {currentDay.places.find(p => p.transport_mode)?.transport_mode}
                </span>
              )}
            </div>
          </div>

          {/* HOTEL CARD STAY */}
          {currentDay.hotel && (
            <div 
              id="hotel-card-active" 
              className={`ir-hotel-card ${highlightedPlaceId === `hotel-${activeDay}` ? "highlighted-card" : ""}`}
              onClick={() => handleHotelCardClick(currentDay.hotel, activeDay)}
              style={{ cursor: "pointer" }}
            >
              <div className="ir-hotel-icon-wrap">
                <span className="ir-hotel-emoji">🏨</span>
              </div>
              <div className="ir-hotel-body">
                <span className="ir-hotel-label">Overnight Stay</span>
                <h3>{currentDay.hotel.hotel_name}</h3>
                {currentDay.hotel.note && <p className="ir-hotel-note">{currentDay.hotel.note}</p>}
              </div>
              <div className="ir-hotel-stars">
                {"★".repeat(4)}{"☆".repeat(1)}
              </div>
            </div>
          )}

          {/* TIMELINE PLACES */}
          <div className="ir-timeline">
            {currentDay.places.map((place, idx) => {
              const isMeal = place.type === "meal";

              // Travel route connector details between cards
              const showConnector = idx === 0 || (!isMeal && currentDay.places[idx - 1]?.type !== "meal");
              const dist = place.travel_dist_km || 0;
              const mode = place.transport_mode || "Drive";

              if (isMeal) {
                const mealColors = {
                  Breakfast: { bg: "linear-gradient(135deg, #D4973C33, #9B1B3011)", border: "#D4973C", text: "#F5E6C8" },
                  Lunch: { bg: "linear-gradient(135deg, #1B9B8A33, #D4973C11)", border: "#1B9B8A", text: "#A8E6CF" },
                  Dinner: { bg: "linear-gradient(135deg, #9B1B3033, #1B1A1811)", border: "#9B1B30", text: "#F5C6C6" },
                };
                const mc = mealColors[place.name] || mealColors.Lunch;
                return (
                  <div 
                    key={idx} 
                    id={`place-card-${place.place_id || idx}`}
                    className={`ir-timeline-item ir-meal-item ${highlightedPlaceId === place.place_id ? "highlighted-card" : ""}`}
                  >
                    <div className="ir-timeline-node" style={{ "--node-color": mc.border }}>
                      <span style={{ background: mc.border, fontSize: 16 }}>{place.icon}</span>
                    </div>
                    <div className="ir-meal-card" style={{ background: mc.bg, borderColor: mc.border }}>
                      <div className="ir-meal-body">
                        <h4 style={{ color: mc.text }}>
                          {place.start_time && <span className="ir-time">{place.start_time}</span>}
                          {place.icon} {place.name}
                        </h4>
                      </div>
                    </div>
                  </div>
                );
              }

              const catKey = getCategoryKey(place.category);
              const cfg = categoryConfig[catKey] || { color: "#6b7280", bg: "#1f2937", icon: "📍", img: "/images/lake.jpg" };
              return (
                <React.Fragment key={idx}>
                  {showConnector && (
                    <div className="timeline-travel-connector">
                      <i className="fa-solid fa-route"></i>
                      <span>{mode} {dist > 0 ? `(${dist} km)` : ""}</span>
                    </div>
                  )}

                  <div 
                    id={`place-card-${place.place_id}`} 
                    className={`ir-timeline-item ${highlightedPlaceId === place.place_id ? "highlighted-card" : ""}`}
                    onClick={() => handlePlaceCardClick(place)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="ir-timeline-node" style={{ "--node-color": cfg.color }}>
                      <span>{idx + 1}</span>
                    </div>
                    <div className="ir-timeline-card" style={{ borderColor: cfg.color }}>
                      <div className="ir-place-img-wrap">
                        <div className="ir-place-img" style={{ backgroundImage: `url(${cfg.img})` }} />
                        <span className="ir-place-cat-badge" style={{ background: cfg.color }}>{cfg.icon} {place.category}</span>
                      </div>
                      <div className="ir-place-body">
                        <h4>
                          {place.start_time && <span className="ir-time">{place.start_time}</span>}
                          {place.name}
                        </h4>
                        <div className="ir-place-meta">
                          <span className="ir-meta-chip" style={{ background: "#3b82f622", color: "#3b82f6" }}>
                            {transportIcons[place.transport_mode] || "🚗"} {place.transport_mode}
                          </span>
                          {place.travel_dist_km > 0 && (
                            <span className="ir-meta-chip" style={{ background: "#10b98122", color: "#10b981" }}>
                              📍 {place.travel_dist_km} km
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {currentDay.places.length === 0 && (
              <div className="ir-empty">
                <span className="ir-empty-icon">🏝️</span>
                <p>A well-deserved rest day. Relax and explore at your own pace!</p>
              </div>
            )}
          </div>

          {/* STATS SUMMARY BOTTOM ROW */}
          {(() => {
            const realPlaces = currentDay.places.filter(p => p.type !== "meal");
            return (
              <div className="ir-stats-row">
                <div className="ir-stat">
                  <span className="ir-stat-icon">📍</span>
                  <span className="ir-stat-val"><AnimatedCounter value={realPlaces.length} /></span>
                  <span className="ir-stat-lbl">Places</span>
                </div>
                <div className="ir-stat">
                  <span className="ir-stat-icon">🚗</span>
                  <span className="ir-stat-val"><AnimatedCounter value={currentDay.total_travel_km} suffix="km" /></span>
                  <span className="ir-stat-lbl">Travel</span>
                </div>
                <div className="ir-stat">
                  <span className="ir-stat-icon">🏨</span>
                  <span className="ir-stat-val">{currentDay.hotel?.hotel_name?.substring(0, 10) || "None"}</span>
                  <span className="ir-stat-lbl">Hotel</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Leaflet Map */}
      <div className="itinerary-map-side">
        <MapContainer
          center={activeBounds.length > 0 ? activeBounds[0] : [27.7, 85.3]}
          zoom={12}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {allPlaces.map((place) => {
            const isToday = place.day === activeDay;
            const isHighlighted = highlightedPlaceId === place.id || highlightedPlaceId === place.order;

            // Define coloring based on type and category
            let color = "#6b7280"; // Muted gray for inactive day
            if (isToday) {
              if (place.type === "hotel") {
                color = "#D4973C"; // Active Gold for hotel
              } else {
                const catKey = getCategoryKey(place.category);
                color = categoryConfig[catKey]?.color || "#3b82f6"; // Active color
              }
            } else {
              // Lighter/semi-transparent color for other days
              if (place.type === "hotel") {
                color = "rgba(212, 151, 60, 0.4)";
              } else {
                color = "rgba(100, 116, 139, 0.4)";
              }
            }

            const label = place.type === "hotel" ? "🏨" : (place.order || "•");

            return (
              <Marker
                key={place.id}
                position={[place.latitude, place.longitude]}
                icon={getCustomIcon(color, label, isToday, !isToday)}
                ref={(el) => {
                  if (el) markerRefs.current[place.id] = el;
                }}
                eventHandlers={{
                  click: () => {
                    handleMarkerClick(place.id);
                  }
                }}
              >
                <Popup>
                  <div style={{ color: "#000", fontFamily: "sans-serif", padding: "5px" }}>
                    <strong style={{ fontSize: "14px" }}>{place.name}</strong><br/>
                    <span style={{ fontSize: "12px", color: "#555" }}>Day {place.day} • {place.type === "hotel" ? "Hotel stay" : place.category}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {activeDayPoints.length > 1 && (
            <Polyline
              positions={activeDayPoints}
              color="#D4973C"
              weight={4}
              opacity={0.8}
            />
          )}

          <MapController
            center={mapCenter}
            zoom={mapZoom}
            activeBounds={activeBounds}
            activeDay={activeDay}
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default ItineraryResult;
