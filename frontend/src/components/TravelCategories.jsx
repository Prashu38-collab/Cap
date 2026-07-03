function TravelCategories() {

  const categories = [
    {
      title: "Adventure",
      image: "/images/amayangri.jpg",
      description: "Experience safari, trekking, hiking, and exciting outdoor adventures."
    },
    {
      title: "Nature",
      image: "/images/nagarkot.jpg",
      description: "Immerse yourself in natural environments with panoramic views and fresh mountain air."
    },
    {
      title: "Culture",
      image: "/images/bouddha.jpg",
      description: "Explore the blend of history, art, and tradition in authentic cultural settings."
    },
    {
      title: "Religious",
      image: "/images/chandragiri.jpg",
      description: "Visit sacred temples, monasteries and peaceful pilgrimage destinations."
    }
  ];

  return (

    <section className="travel-categories">

        <div className="category-header">
          <h1>Explore By Category</h1>
          <p>We provide you travel experience that suits you the best! </p>
        </div>

        <div className="category-grid">

          {categories.map((category,index) => (

            <div className="category-card" key={index}>

              <img src={category.image} alt={category.title} />

              <div className="category-overlay">
                <div className="category-text">
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                </div>
              </div>

            </div>

          ))}

        </div>

    </section>

  );
}

export default TravelCategories;