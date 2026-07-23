import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "../styles/hotelselection.css";

// Customizable modern pin icon
const getCustomIcon = (color, label, hovered = false, selected = false) => {
  const sz = hovered ? 38 : selected ? 34 : 28;
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${sz}px;
        height: ${sz}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${hovered || selected ? '2.5px' : '1.5px'} solid #ffffff;
        box-shadow: 0 4px 12px ${hovered ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)'};
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="
          transform: rotate(45deg);
          color: #ffffff;
          font-weight: 700;
          font-size: ${sz > 30 ? '11px' : '9px'};
          font-family: system-ui, -apple-system, sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    className: "hotel-pin-marker",
    iconSize: [sz, sz + 6],
    iconAnchor: [sz / 2, sz + 6],
    popupAnchor: [0, -(sz + 6)]
  });
};

function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 14);
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

function StarRating({ score }) {
  const full = Math.round(score || 0);
  return (
    <div className="hs-stars-wrap">
      <span className="hs-stars-icons">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`hs-star ${i < full ? "filled" : "empty"}`}>★</span>
        ))}
      </span>
      <span className="hs-star-score">{(score || 0).toFixed(1)}</span>
    </div>
  );
}

function CompactHotelCard({ hotel, selected, hovered, onSelect, onMouseEnter, onMouseLeave }) {
  return (
    <div
      id={`hotel-card-${hotel.hotel_id}`}
      className={`hs-compact-card ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="hs-card-left-info">
        <div className="hs-card-title-row">
          <h4 className="hs-card-hotel-name">{hotel.hotel_name}</h4>
          {hotel.district && <span className="hs-card-district-chip">{hotel.district}</span>}
        </div>
        <div className="hs-card-sub-row">
          <StarRating score={hotel.review_score} />
          {hotel.distance_km != null && (
            <span className="hs-card-distance-badge">📍 {hotel.distance_km} km away</span>
          )}
        </div>
      </div>

      <div className="hs-card-right-action">
        <div className="hs-card-price-tag">
          <span className="hs-price-val">NPR {hotel.budget?.toLocaleString()}</span>
          <span className="hs-price-unit">/ night</span>
        </div>
        <button className={`hs-select-pill ${selected ? "active" : ""}`}>
          {selected ? "Selected ✓" : "Select"}
        </button>
      </div>
    </div>
  );
}

export default function HotelSelection({ hotels = [], corridor = [], onSelect, loading }) {
  const [selectedId, setSelectedId] = useState(hotels[0]?.hotel_id || null);
  const [hoveredHotelId, setHoveredHotelId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const markerRefs = useRef({});

  useEffect(() => {
    if (hotels.length > 0 && !selectedId) {
      setSelectedId(hotels[0].hotel_id);
    }
  }, [hotels]);

  const handleConfirm = () => {
    if (!selectedId) return;
    onSelect(selectedId);
  };

  const handleCardClick = (hotel) => {
    setSelectedId(hotel.hotel_id);
    if (hotel.latitude && hotel.longitude) {
      setMapCenter([parseFloat(hotel.latitude), parseFloat(hotel.longitude)]);
      setMapZoom(15);
      setTimeout(() => {
        markerRefs.current[hotel.hotel_id]?.openPopup();
      }, 100);
    }
  };

  const validHotels = hotels.filter((h) => h.latitude && h.longitude);
  const bounds = validHotels.map((h) => [parseFloat(h.latitude), parseFloat(h.longitude)]);

  const districtLabel = corridor?.[0] || "destination";

  return (
    <div className="hs-main-wrapper">
      <div className="hs-hotel-list-container">
        {hotels.map((hotel) => (
          <CompactHotelCard
            key={hotel.hotel_id}
            hotel={hotel}
            selected={selectedId === hotel.hotel_id}
            hovered={hoveredHotelId === hotel.hotel_id}
            onSelect={() => handleCardClick(hotel)}
            onMouseEnter={() => setHoveredHotelId(hotel.hotel_id)}
            onMouseLeave={() => setHoveredHotelId(null)}
          />
        ))}
      </div>

      {/* Immediate Sticky/Fixed Confirm Button right below card list */}
      <div className="hs-action-sticky-footer">
        <button
          className="hs-primary-confirm-btn"
          disabled={!selectedId || loading}
          onClick={handleConfirm}
        >
          {loading ? (
            <span className="hs-btn-loading-state">
              <span className="hs-spinner-icon" />
              Generating Itinerary...
            </span>
          ) : (
            <span>Generate Itinerary →</span>
          )}
        </button>
      </div>
    </div>
  );
}

// Export Map separately if needed for SplitLayout
export function HotelSelectionMap({ hotels = [], selectedId, hoveredId, onSelectMarker }) {
  const validHotels = hotels.filter((h) => h.latitude && h.longitude);
  const bounds = validHotels.map((h) => [parseFloat(h.latitude), parseFloat(h.longitude)]);

  return (
    <MapContainer
      center={bounds.length > 0 ? bounds[0] : [27.7, 85.3]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validHotels.map((hotel) => {
        const isHovered = hoveredId === hotel.hotel_id;
        const isSelected = selectedId === hotel.hotel_id;
        const pinColor = isHovered ? "#e11d48" : isSelected ? "#0284c7" : "#059669";

        return (
          <Marker
            key={hotel.hotel_id}
            position={[parseFloat(hotel.latitude), parseFloat(hotel.longitude)]}
            icon={getCustomIcon(pinColor, "H", isHovered, isSelected)}
            eventHandlers={{
              click: () => onSelectMarker && onSelectMarker(hotel),
            }}
          >
            <Popup>
              <div className="hs-map-popup-card">
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{hotel.hotel_name}</strong>
                <div style={{ fontSize: "12px", color: "#64748b", margin: "2px 0" }}>{hotel.district}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0284c7", marginTop: "4px" }}>
                  NPR {hotel.budget?.toLocaleString()} / night
                </div>
                {hotel.review_score > 0 && (
                  <div style={{ fontSize: "11px", color: "#eab308", marginTop: "2px" }}>
                    ★ {hotel.review_score.toFixed(1)} Rating
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
      <MapController bounds={bounds} />
    </MapContainer>
  );
}
