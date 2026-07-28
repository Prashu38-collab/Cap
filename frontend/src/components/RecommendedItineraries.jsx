import { useNavigate } from "react-router-dom";
import RecommendedCard from "./RecommendedCard";
import recommendedItineraries from "../data/recommendedItineraries";

function RecommendedItineraries() {

  const navigate = useNavigate();

  
  return (

    <section className="recommended-itineraries">

      <div className="recommended-header">

        <h1>Recommended Itineraries</h1>

        <p>
          Discover handpicked journeys across Nepal, carefully designed to
          showcase the best cultural, adventure, wildlife, and scenic
          experiences.
        </p>

      </div>

      <div className="recommended-grid">

        {recommendedItineraries.map((itinerary, index) => (

          <RecommendedCard
            key={index}
            title={itinerary.title}
            image={itinerary.image}
            duration={itinerary.duration}
            description={itinerary.description}
            onClick={() =>
              navigate(`/recommended/${itinerary.slug}`)
            }
          />

        ))}

      </div>

    </section>

  );

}

export default RecommendedItineraries;