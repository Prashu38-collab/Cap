import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const hotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791",
  "https://images.unsplash.com/photo-1584132967334-10e028bd69f7",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
  "https://images.unsplash.com/photo-1549638441-b787c2e166f1",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6",
  "https://images.unsplash.com/photo-1568084680786-a84f91d1153c",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791",
  "https://images.unsplash.com/photo-1590490359683-658d3d23f972",
];

// Helper to generate a customizable elegant Leaflet icon
const getCustomIcon = (color, label, hovered = false) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${hovered ? '36px' : '30px'};
        height: ${hovered ? '36px' : '30px'};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      " class="${hovered ? 'bounce-marker' : ''}">
        <div style="
          transform: rotate(45deg);
          color: #fff;
          font-weight: bold;
          font-size: 11px;
          font-family: sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    className: "hotel-pin",
    iconSize: hovered ? [36, 42] : [30, 35],
    iconAnchor: hovered ? [18, 42] : [15, 35],
    popupAnchor: [0, -35]
  });
};

// Map controller to adjust center and zoom or fit bounds dynamically
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function StarRating({ score }) {
  const full = Math.round(score);
  return (
    <span className="hs-stars">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`hs-star ${i < full ? "filled" : "empty"}`}>
          {i < full ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function HotelCard({ hotel, index, selected, onSelect, onMouseEnter, onMouseLeave }) {
  const imgUrl = `${hotelImages[index % hotelImages.length]}?w=600&h=400&fit=crop`;
  return (
    <button
      id={`hotel-card-${hotel.hotel_id}`}
      className={`hs-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ "--i": index }}
    >
      <div className="hs-card-img">
        <img src={imgUrl} alt={hotel.hotel_name} loading="lazy" />
        <div className="hs-card-overlay" />
        <div className="hs-card-price">
          <span className="hs-price-amount">NPR {hotel.budget?.toLocaleString()}</span>
          <span className="hs-price-label">per night</span>
        </div>
      </div>
      <div className="hs-card-body">
        <h3 className="hs-card-name">{hotel.hotel_name}</h3>
        <div className="hs-card-meta">
          <StarRating score={hotel.review_score} />
          <span className="hs-card-score">{hotel.review_score?.toFixed(1)}</span>
        </div>
        <p className="hs-card-district">{hotel.district}</p>
      </div>
      {selected && (
        <div className="hs-card-check">
          <span>✓</span>
        </div>
      )}
    </button>
  );
}

export default function HotelSelection({ hotels, corridor, onSelect, loading }) {
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Map linking states
  const [hoveredHotelId, setHoveredHotelId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);
  const markerRefs = useRef({});

  const handleConfirm = () => {
    if (!selectedId) return;
    setSubmitting(true);
    onSelect(selectedId);
  };

  const handleCardClick = (hotel) => {
    setSelectedId(hotel.hotel_id);
    if (hotel.latitude && hotel.longitude) {
      setMapCenter([hotel.latitude, hotel.longitude]);
      setMapZoom(15);
      setTimeout(() => {
        const marker = markerRefs.current[hotel.hotel_id];
        if (marker) {
          marker.openPopup();
        }
      }, 100);
    }
  };

  const districtLabel = corridor?.[0] || "starting district";
  const routeText = corridor?.length > 1 ? corridor.join(" → ") : districtLabel;

  // Group hotels by district
  const grouped = {};
  for (const h of hotels) {
    const d = h.district || "Unknown";
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(h);
  }

  // Filter valid coordinates for markers and bounds
  const validHotels = hotels.filter((h) => h.latitude && h.longitude);
  const bounds = validHotels.map((h) => [h.latitude, h.longitude]);

  return (
    <div className="hs-wrap">
      <div className="hs-bg-ornament" />

      <div className="hs-header">
        <div className="hs-header-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/>
            <path d="M9 21V11h6v10"/>
            <path d="M3 21h18"/>
          </svg>
        </div>
        <h2 className="hs-title">Choose Your Sanctuary</h2>
        <p className="hs-subtitle">
          Pick where you'll rest in <strong>{routeText}</strong> — select a
          starting hotel and we'll assign others along your route.
        </p>
        {corridor?.length > 1 && (
          <p className="hs-corridor">
            Your route: {corridor.join("  →  ")}
          </p>
        )}
      </div>

      <div className="hs-layout">
        <div className="hs-left-side">
          {Object.entries(grouped).map(([district, districtHotels]) => (
            <div key={district} className="hs-district-group">
              <h3 className="hs-district-title">{district}</h3>
              <div className="hs-grid">
                {districtHotels.map((hotel, idx) => (
                  <HotelCard
                    key={hotel.hotel_id}
                    hotel={hotel}
                    index={idx}
                    selected={selectedId === hotel.hotel_id}
                    onSelect={() => handleCardClick(hotel)}
                    onMouseEnter={() => setHoveredHotelId(hotel.hotel_id)}
                    onMouseLeave={() => setHoveredHotelId(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hs-right-side">
          <MapContainer
            center={bounds.length > 0 ? bounds[0] : [27.7, 85.3]}
            zoom={12}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validHotels.map((hotel) => {
              const isHovered = hoveredHotelId === hotel.hotel_id;
              const isSelected = selectedId === hotel.hotel_id;
              const pinColor = isHovered ? "#9B1B30" : isSelected ? "#1B9B8A" : "#D4973C";

              return (
                <Marker
                  key={hotel.hotel_id}
                  position={[hotel.latitude, hotel.longitude]}
                  icon={getCustomIcon(pinColor, "H", isHovered)}
                  ref={(el) => {
                    if (el) markerRefs.current[hotel.hotel_id] = el;
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedId(hotel.hotel_id);
                      document.getElementById(`hotel-card-${hotel.hotel_id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                  }}
                >
                  <Popup>
                    <div style={{ color: "#000", fontFamily: "sans-serif", padding: "5px" }}>
                      <strong style={{ fontSize: "14px" }}>{hotel.hotel_name}</strong><br/>
                      <span style={{ fontSize: "12px", color: "#555" }}>{hotel.district}</span><br/>
                      <span style={{ fontSize: "13px", fontWeight: "bold", color: "#D4973C" }}>NPR {hotel.budget?.toLocaleString()} / night</span><br/>
                      <span style={{ fontSize: "12px" }}>Rating: ★ {hotel.review_score?.toFixed(1)}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            <MapController center={mapCenter} zoom={mapZoom} bounds={bounds} />
          </MapContainer>
        </div>
      </div>

      <div className="hs-footer">
        <p className="hs-footer-hint">
          {selectedId
            ? "Confirm to generate your itinerary."
            : "Select a hotel below, then generate your itinerary."}
        </p>
        <button
          className="hs-confirm-btn"
          disabled={!selectedId || submitting}
          onClick={handleConfirm}
        >
          {submitting ? (
            <span className="hs-btn-loading">
              <span className="hs-spinner" />
              Weaving Your Journey...
            </span>
          ) : (
            <span>Generate My Itinerary</span>
          )}
        </button>
      </div>
    </div>
  );
}
