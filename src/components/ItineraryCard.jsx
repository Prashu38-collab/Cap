function ItineraryCard({ title, image, description }) {
  return (
    <div className="itinerary-card">

      <img src={image} alt={title} />

      <div className="itinerary-content">

        <h3>{title}</h3>

        <p>{description}</p>

        <button className="button">
          View More
        </button>

      </div>

    </div>
  );
}

export default ItineraryCard;