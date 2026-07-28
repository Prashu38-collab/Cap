function RecommendedCard({
  title,
  image,
  duration,
  description,
  onClick,
}) {

  return (

    <div
      className="recommended-card"
      onClick={onClick}
    >

      <img
        src={image}
        alt={title}
      />

      <div className="recommended-overlay">

        <div className="recommended-content">

          <h3>{title}</h3>

          <div className="recommended-duration">
             {duration}
          </div>

          <p>{description}</p>

          <button className="recommended-btn">
            Explore Journey →
          </button>

        </div>

      </div>

    </div>

  );

}

export default RecommendedCard;