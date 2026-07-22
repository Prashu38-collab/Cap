import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

const catColors = {
  nature: "#16a34a",
  religious: "#d97706",
  cultural: "#7c3aed",
  adventure: "#dc2626",
  hotel: "#2563eb",
};

function getCatColor(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("nature")) return catColors.nature;
  if (c.includes("religious")) return catColors.religious;
  if (c.includes("cultural")) return catColors.cultural;
  if (c.includes("adventure")) return catColors.adventure;
  return "#6b7280";
}

const markerIcon = (color, label, active = true) => {
  const sz = active ? 28 : 20;
  const fs = active ? 10 : 8;
  return L.divIcon({
    html: `<div style="background:${color};width:${sz}px;height:${sz}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:${active?2:1}px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"><div style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:${fs}px">${label}</div></div>`,
    className: "place-pin",
    iconSize: [sz, sz + 5],
    iconAnchor: [sz / 2, sz + 5],
    popupAnchor: [0, -(sz + 5)],
  });
};

function buildPopupHTML({ type, name, district, category, duration, hotelName, order, lat, lon }) {
  if (type === "hotel") {
    return `<div style="font-family:system-ui,sans-serif;min-width:180px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#2563eb;font-weight:700;margin-bottom:3px">Hotel</div>
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">${hotelName || name}</div>
      <div style="font-size:11px;color:#475569;margin-bottom:2px">${district || ""}</div>
      ${lat && lon ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>` : ""}
    </div>`;
  }
  const durText = duration ? `${duration}` : "";
  const catText = category || "";
  const orderText = order ? `#${order}` : "";
  return `<div style="font-family:system-ui,sans-serif;min-width:180px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:${getCatColor(category)};font-weight:700;margin-bottom:3px">Place ${orderText}</div>
    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">${name}</div>
    <div style="font-size:11px;color:#475569;margin-bottom:2px">${district || ""}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${catText ? `<span style="font-size:10px;background:#f1f5f9;padding:1px 5px;border-radius:3px;color:#475569">${catText}</span>` : ""}
      ${durText ? `<span style="font-size:10px;background:#f1f5f9;padding:1px 5px;border-radius:3px;color:#475569">${durText}</span>` : ""}
    </div>
    ${lat && lon ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>` : ""}
  </div>`;
}

function MapCtrl({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || 15);
    else if (bounds?.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [center, zoom, bounds, map]);
  return null;
}

function placeDurationLabel(place) {
  const val = place.estimated_duration_value;
  const unit = (place.estimated_duration_unit || "hours").toLowerCase();
  if (val) return `${val} ${unit}`;
  return null;
}

function advanceTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildSchedule(day, dayIndex, totalDays) {
  const places = day.places || [];
  const isFirst = dayIndex === 0 && totalDays > 1;
  const isLast = dayIndex === totalDays - 1 && totalDays > 1;
  const isSingle = totalDays === 1;
  const isExploredAll = day.day_type === "explored_all";
  const items = [];

  if (isExploredAll) {
    items.push({ time: "07:30", label: "Breakfast", type: "meal", icon: "meal" });
    items.push({ time: "09:00", label: "Your planned sightseeing has been completed. Enjoy a relaxed day at your own pace.", type: "activity", icon: "explore" });
    items.push({ time: "12:30", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  if (isFirst) {
    items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });
    items.push({ time: "08:00", label: "Depart for destination", type: "activity", icon: "depart" });
    items.push({ time: "09:00", label: "Arrive and check in", type: "activity", icon: "hotel" });
    if (places.length > 0) {
      let t = "10:00";
      places.forEach((p, i) => {
        items.push({ time: t, label: p.name, type: "place", place: p, icon: "place", order: i + 1 });
        const durMin = Math.ceil((p.estimated_duration_value || 2) * 60);
        t = advanceTime(t, durMin + 20);
      });
    } else {
      items.push({ time: "11:00", label: "Explore nearby area", type: "activity", icon: "explore" });
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
        items.push({ time: t, label: p.name, type: "place", place: p, icon: "place", order: i + 1 });
        const durMin = Math.ceil((p.estimated_duration_value || 2) * 60);
        t = advanceTime(t, durMin + 20);
      });
    }
    items.push({ time: "12:00", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "13:30", label: "Begin return journey", type: "activity", icon: "return" });
    return items;
  }

  if (isSingle) {
    items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });
    if (places.length > 0) {
      let t = "09:00";
      places.forEach((p, i) => {
        items.push({ time: t, label: p.name, type: "place", place: p, icon: "place", order: i + 1 });
        const durMin = Math.ceil((p.estimated_duration_value || 2) * 60);
        t = advanceTime(t, durMin + 20);
      });
    }
    items.push({ time: "13:00", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  // ── Middle / Sightseeing day ──
  items.push({ time: "07:00", label: "Breakfast", type: "meal", icon: "meal" });

  if (places.length === 0) {
    items.push({ time: "09:00", label: "Free day — revisit favourites or relax", type: "activity", icon: "explore" });
    items.push({ time: "12:30", label: "Lunch", type: "meal", icon: "meal" });
    items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
    return items;
  }

  const half = Math.ceil(places.length / 2);
  const morning = places.slice(0, half);
  const afternoon = places.slice(half);

  let t = "09:00";
  morning.forEach((p) => {
    items.push({ time: t, label: p.name, type: "place", place: p, icon: "place" });
    const durMin = Math.ceil((p.estimated_duration_value || 2) * 60);
    t = advanceTime(t, durMin + 20);
  });

  items.push({ time: "13:00", label: "Lunch", type: "meal", icon: "meal" });

  let t2 = "14:00";
  afternoon.forEach((p) => {
    items.push({ time: t2, label: p.name, type: "place", place: p, icon: "place" });
    const durMin = Math.ceil((p.estimated_duration_value || 2) * 60);
    t2 = advanceTime(t2, durMin + 20);
  });

  items.push({ time: "17:00", label: "Return to hotel", type: "activity", icon: "hotel" });
  items.push({ time: "19:00", label: "Dinner", type: "meal", icon: "meal" });
  return items;
}

const tlIcon = (isPlace, isMeal, isTransit, isActivity, iconType, catColor) => {
  if (isPlace) return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${catColor}"/></svg>`;
  if (isMeal) return `<svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="${catColor}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  if (isTransit) return `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 7,5 5,2" fill="none" stroke="${catColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (iconType === "hotel") return `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="3" width="8" height="5" rx="1" fill="none" stroke="${catColor}" stroke-width="1.2"/><line x1="1" y1="6" x2="9" y2="6" stroke="${catColor}" stroke-width="1.2"/></svg>`;
  if (iconType === "depart") return `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="3,3 7,3 7,7" fill="none" stroke="${catColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (iconType === "return") return `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="7,3 3,3 3,7" fill="none" stroke="${catColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (iconType === "explore") return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="none" stroke="${catColor}" stroke-width="1.2"/><circle cx="5" cy="5" r="1" fill="${catColor}"/></svg>`;
  return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="1.5" fill="${catColor}"/></svg>`;
};

function downloadItinerary(days, corridor, preferenceId) {
  const data = { preferenceId, corridor, itinerary: days.map((d) => ({ day: d.day, district: d.district, hotel: d.hotel, places: d.places, total_places: d.total_places, day_type: d.day_type })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `itinerary-${preferenceId || "trip"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function ItineraryResult({ itinerary, weatherForecast, preferenceId, corridor }) {
  const [activeDay, setActiveDay] = useState(1);
  const [animDir, setAnimDir] = useState("next");
  const [highlightedId, setHighlightedId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const markerRefs = useRef({});

  if (!itinerary?.itinerary) return null;

  const days = itinerary.itinerary;
  const currentDay = days.find((d) => d.day === activeDay) || days[0];
  if (!currentDay) return null;

  const changeDay = (day) => {
    setMapCenter(null);
    setHighlightedId(null);
    setAnimDir(day > activeDay ? "next" : "prev");
    setActiveDay(day);
  };

  const allMarkers = [];
  days.forEach((d) => {
    if (d.hotel?.latitude && d.hotel?.longitude) {
      allMarkers.push({
        id: `hotel-${d.day}`,
        name: d.hotel.hotel_name,
        lat: parseFloat(d.hotel.latitude),
        lon: parseFloat(d.hotel.longitude),
        day: d.day,
        type: "hotel",
        district: d.hotel.district || d.district || "",
      });
    }
    (d.places || []).forEach((p, i) => {
      if (p.latitude && p.longitude) {
        allMarkers.push({
          id: p.place_id || `p-${d.day}-${i}`,
          name: p.name,
          lat: parseFloat(p.latitude),
          lon: parseFloat(p.longitude),
          day: d.day,
          type: "place",
          category: p.category,
          district: p.district || d.district || "",
          duration: placeDurationLabel(p),
          order: i + 1,
        });
      }
    });
  });

  const activeBounds = allMarkers.filter((m) => m.day === activeDay).map((m) => [m.lat, m.lon]);
  const activeDayPts = [];
  if (currentDay.hotel?.latitude) activeDayPts.push([parseFloat(currentDay.hotel.latitude), parseFloat(currentDay.hotel.longitude)]);
  (currentDay.places || []).forEach((p) => { if (p.latitude && p.longitude) activeDayPts.push([parseFloat(p.latitude), parseFloat(p.longitude)]); });

  const schedule = buildSchedule(currentDay, activeDay - 1, days.length);
  const sightseeingPlaces = (currentDay.places || []).filter((p) => p.type !== "meal");
  const totalDist = currentDay.total_travel_km || (currentDay.places || []).reduce((sum, p) => sum + (p.travel_dist_km || 0), 0) || 0;

  // Build per-segment data for the active day's route (hotel → place[0] → place[1] → ...)
  const segments = [];
  for (let i = 0; i < activeDayPoints.length - 1; i++) {
    const destPlace = currentDay.places[i];
    segments.push({
      from: activeDayPoints[i],
      to: activeDayPoints[i + 1],
      travelTime: destPlace?.travel_from_prev_min,
    });
  }

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

  const focusHotel = (hotel, day) => {
    setHighlightedId(`hotel-${day}`);
    setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
    setMapZoom(15);
    setTimeout(() => { markerRefs.current[`hotel-${day}`]?.openPopup(); }, 100);
  };

  const focusMarker = (id) => {
    setHighlightedId(id);
    const el = document.getElementById(`tl-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="ir-layout">
      <div className="ir-left">
        <div className="ir-hdr">
          <div className="ir-hdr-row">
            <div>
              <h1 className="ir-hdr-title">Journey Overview</h1>
              {corridor?.length > 1 && <p className="ir-hdr-route">{corridor.join(" / ")}</p>}
              <p className="ir-hdr-sub">{days.length} day{days.length > 1 ? "s" : ""}</p>
            </div>
            <button className="ir-save-btn" onClick={() => downloadItinerary(days, corridor, preferenceId)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          </div>
        </div>

        <div className="ir-tabs">
          {days.map((d) => (
            <button key={d.day} className={`ir-tab ${activeDay === d.day ? "on" : ""}`} onClick={() => changeDay(d.day)}>
              <span className="ir-tab-n">{d.day}</span>
              <span className="ir-tab-l">{`Day ${d.day}`}</span>
            </button>
          ))}
        </div>

        <div key={activeDay} className={`ir-dc slide-${animDir}`}>
          <div className="ir-summary">
            <div className="ir-sum-item"><span className="ir-sum-val">{sightseeingPlaces.length}</span><span className="ir-sum-lbl">Places</span></div>
            <div className="ir-sum-item"><span className="ir-sum-val">{totalDist > 0 ? `${totalDist} km` : "\u2014"}</span><span className="ir-sum-lbl">Distance</span></div>
            <div className="ir-sum-item"><span className="ir-sum-val">{currentDay.hotel?.hotel_name?.split(" ").slice(0, 2).join(" ") || "\u2014"}</span><span className="ir-sum-lbl">Hotel</span></div>
          </div>

          {weatherForecast?.find((w) => w.day === activeDay)?.is_bad_weather && (
            <div className="ir-weather">Rain expected — pack an umbrella.</div>
          )}

          <div className="ir-tl">
            {schedule.map((item, i) => {
              const isPlace = item.type === "place";
              const isMeal = item.type === "meal";
              const isTransit = item.type === "transit";
              const isActivity = item.type === "activity";
              const place = item.place;
              const catColor = isPlace ? getCatColor(place?.category) : isMeal ? "#f59e0b" : isActivity ? "#3b82f6" : "#94a3b8";
              const hl = highlightedId === place?.place_id;
              const icon = tlIcon(isPlace, isMeal, isTransit, isActivity, item.icon, catColor);

              return (
                <div key={i} id={`tl-${place?.place_id || item.type + i}`} className={`ir-tl-row ${hl ? "hl" : ""}`}>
                  <div className="ir-tl-time">{item.time}</div>
                  <div className="ir-tl-dot" style={{ background: catColor }} />
                  <div className="ir-tl-line" />
                  <div
                    className={`ir-tl-card ${isPlace ? "clickable" : ""}`}
                    onClick={isPlace ? () => focusPlace(place) : isActivity && item.icon === "hotel" ? () => focusHotel(currentDay.hotel, activeDay) : undefined}
                  >
                    <div className="ir-tl-card-top">
                      <span className="ir-tl-icon" style={{ background: catColor + "15" }} dangerouslySetInnerHTML={{ __html: icon }} />
                      <span className="ir-tl-label">{item.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {currentDay.day_type === "explored_all" && (
            <div className="ir-empty">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 4 }}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              <p>Your planned sightseeing has been completed. Enjoy a relaxed day at your own pace.</p>
            </div>
          )}

          <div className="ir-bottom-actions">
            {currentDay.hotel && (
              <div className="ir-hotel-line" onClick={() => focusHotel(currentDay.hotel, activeDay)}>
                <span className="ir-hotel-dot" />
                <span className="ir-hotel-name">{currentDay.hotel.hotel_name}</span>
                <span className="ir-hotel-hint">view on map</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ir-right">
        <MapContainer center={activeBounds[0] || [27.7, 85.3]} zoom={12} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {allMarkers.map((m) => {
            const isToday = m.day === activeDay;
            const c = m.type === "hotel" ? (isToday ? "#2563eb" : "rgba(37,99,235,.35)") : (isToday ? getCatColor(m.category) : "rgba(107,114,128,.35)");
            const label = m.type === "hotel" ? "H" : (m.order || ".");
            const popup = buildPopupHTML({ type: m.type, name: m.name, district: m.district, category: m.category, duration: m.duration, hotelName: m.name, order: m.order, lat: m.lat, lon: m.lon });
            return (
              <Marker key={m.id} position={[m.lat, m.lon]} icon={markerIcon(c, label, isToday)} ref={(el) => { if (el) markerRefs.current[m.id] = el; }} eventHandlers={{ click: () => focusMarker(m.id) }}>
                <Popup><div dangerouslySetInnerHTML={{ __html: popup }} /></Popup>
              </Marker>
            );
          })}
          {days.map((d) => {
            if (d.day === activeDay) return null;
            const pts = [];
            if (d.hotel?.latitude && d.hotel?.longitude) pts.push([parseFloat(d.hotel.latitude), parseFloat(d.hotel.longitude)]);
            (d.places || []).forEach((p) => { if (p.latitude && p.longitude) pts.push([parseFloat(p.latitude), parseFloat(p.longitude)]); });
            return pts.length > 1 ? <Polyline key={`route-${d.day}`} positions={pts} color="#cbd5e1" weight={2} opacity={0.5} dashArray="6 4" /> : null;
          })}
          {activeDayPts.length > 1 && <Polyline positions={activeDayPts} color="#3b82f6" weight={3.5} opacity={0.85} />}
          <MapCtrl center={mapCenter} zoom={mapZoom} bounds={activeBounds} />
        </MapContainer>
      </div>
    </div>
  );
}

export default ItineraryResult;
