import { useState } from "react";

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

function HotelCard({ hotel, index, selected, onSelect }) {
  const imgUrl = `${hotelImages[index % hotelImages.length]}?w=600&h=400&fit=crop`;
  return (
    <button
      className={`hs-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(hotel.hotel_id)}
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

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    setSubmitting(true);
    onSelect(selectedId);
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

  return (
    <div className="hs-wrap">
      <div className="hs-bg-ornament" />

      <div className="hs-header">
        <div className="hs-header-icon">🏨</div>
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

      {Object.entries(grouped).map(([district, districtHotels]) => (
        <div key={district} className="hs-district-group">
          <h3 className="hs-district-title">🏠 {district}</h3>
          <div className="hs-grid">
            {districtHotels.map((hotel, idx) => (
              <HotelCard
                key={hotel.hotel_id}
                hotel={hotel}
                index={idx}
                selected={selectedId === hotel.hotel_id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="hs-footer">
        <p className="hs-footer-hint">
          {selectedId
            ? "You've selected a hotel. Confirm to generate your itinerary."
            : "Tap a hotel card to select it as your starting stay."}
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
            <span>✨ Generate My Itinerary</span>
          )}
        </button>
      </div>
    </div>
  );
}
