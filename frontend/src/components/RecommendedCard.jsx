import { useNavigate } from "react-router-dom";

function RecommendedCard({ slug, title, image, duration, badge, description }) {

  const navigate = useNavigate();

  return (
    <div
      className="rec-card"
      onClick={() => navigate(`/recommended/${slug}`)}
    >
      <img src={image} alt={title} />

      <span className="rec-badge">{badge}</span>

      <div className="rec-overlay">
        <div className="rec-info">
          <h3>{title}</h3>
          <span className="rec-duration">{duration}</span>
          <p>{description}</p>
        </div>
      </div>

    </div>
  );
}

export default RecommendedCard;
