import RecommendedCard from "./RecommendedCard";
import recommendedItineraries from "../data/recommendedItineraries";

function RecommendedItineraries() {
  return (
    <section className="recommended-section">

      <div className="rec-header">
        <h1>Recommended Itineraries</h1>
        <p>Handpicked travel experiences to inspire your next adventure</p>
      </div>

      <div className="rec-grid">
        {recommendedItineraries.map((item) => (
          <RecommendedCard
            key={item.slug}
            slug={item.slug}
            title={item.title}
            image={item.image}
            duration={item.duration}
            badge={item.badge}
            description={item.description}
          />
        ))}
      </div>

    </section>
  );
}

export default RecommendedItineraries;
