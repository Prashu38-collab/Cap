"""Folium-based itinerary map generator.

Produces an interactive HTML map with:
  - Day-colored markers for each place
  - Route lines connecting places in order
  - Hotel markers
  - Popups with place details
"""

import folium
from folium import plugins
from typing import List, Dict, Optional

DAY_COLORS = [
    "#e74c3c",  # red
    "#3498db",  # blue
    "#2ecc71",  # green
    "#f39c12",  # orange
    "#9b59b6",  # purple
    "#1abc9c",  # teal
    "#e67e22",  # dark orange
    "#34495e",  # dark blue-grey
    "#c0392b",  # dark red
    "#16a085",  # dark teal
]


def build_itinerary_map(itinerary_data: dict) -> Optional[str]:
    """Generate a Folium HTML map from an itinerary result dict.

    Args:
        itinerary_data: The full dict returned by build_itinerary(),
                        containing "itinerary", "days", etc.

    Returns:
        HTML string of the map, or None if no valid places.
    """
    days = itinerary_data.get("itinerary", [])
    if not days:
        return None

    # Compute map center from all places across all days
    all_lats, all_lons = [], []
    for day in days:
        hotel = day.get("hotel", {})
        if hotel.get("latitude") and hotel.get("longitude"):
            all_lats.append(float(hotel["latitude"]))
            all_lons.append(float(hotel["longitude"]))
        for p in day.get("places", []):
            all_lats.append(float(p.get("latitude", 0)))
            all_lons.append(float(p.get("longitude", 0)))

    if not all_lats:
        return None

    center_lat = sum(all_lats) / len(all_lats)
    center_lon = sum(all_lons) / len(all_lons)

    m = folium.Map(location=[center_lat, center_lon], zoom_start=12, control_scale=True)

    # Add fullscreen button
    plugins.Fullscreen().add_to(m)

    # Add layer control
    folium.LayerControl(collapsed=True).add_to(m)

    # Tracks which feature groups have content
    day_groups = {}

    for i, day in enumerate(days):
        day_num = day["day"]
        color = DAY_COLORS[(day_num - 1) % len(DAY_COLORS)]
        district = day.get("district", "")
        label = f"Day {day_num}" + (f" — {district}" if district else "")

        fg = folium.FeatureGroup(name=label, show=True)
        day_groups[day_num] = fg

        # Hotel marker (start/end of day)
        hotel = day.get("hotel", {})
        hotel_lat = hotel.get("latitude")
        hotel_lon = hotel.get("longitude")
        hotel_name = hotel.get("hotel_name", "Hotel")

        places = day.get("places", [])

        # Collect points for this day's route line
        route_points = []
        if hotel_lat and hotel_lon:
            route_points.append([float(hotel_lat), float(hotel_lon)])

        # Hotel popup
        hotel_popup = f"<b>{hotel_name}</b><br>Day {day_num} Hotel"
        if district:
            hotel_popup += f"<br>District: {district}"
        hotel_tooltip = f"🏨 {hotel_name}"

        for p in places:
            p_lat = p.get("latitude")
            p_lon = p.get("longitude")
            if p_lat and p_lon:
                route_points.append([float(p_lat), float(p_lon)])

                # Place popup with details
                dur = p.get("duration", 0)
                transport = p.get("transport_mode", "")
                cat = p.get("category", "")
                dist = p.get("travel_dist_km", 0)

                popup_html = (
                    f"<b>{p['name']}</b><br>"
                    f"Category: {cat}<br>"
                    f"Duration: {dur}h<br>"
                )
                if transport:
                    popup_html += f"Transport: {transport}<br>"
                if dist:
                    popup_html += f"Travel dist: {dist} km<br>"
                if cat:
                    cat_lower = cat.lower()
                    if "nature" in cat_lower:
                        icon_color = "green"
                        icon_type = "leaf"
                    elif "religious" in cat_lower:
                        icon_color = "orange"
                        icon_type = "glyphicon glyphicon-star"
                    elif "cultural" in cat_lower:
                        icon_color = "purple"
                        icon_type = "glyphicon glyphicon-picture"
                    elif "adventure" in cat_lower:
                        icon_color = "red"
                        icon_type = "glyphicon glyphicon-flag"
                    else:
                        icon_color = "blue"
                        icon_type = "info-sign"
                else:
                    icon_color = "blue"
                    icon_type = "info-sign"

                folium.Marker(
                    location=[float(p_lat), float(p_lon)],
                    popup=folium.Popup(popup_html, max_width=300),
                    tooltip=p["name"],
                    icon=folium.Icon(color=color, icon=icon_type, prefix="glyphicon" if "glyphicon" in icon_type else "fa"),
                ).add_to(fg)

        # Draw route line
        if len(route_points) >= 2:
            folium.PolyLine(
                locations=route_points,
                color=color,
                weight=3,
                opacity=0.7,
                popup=f"Day {day_num} route",
                tooltip=f"Day {day_num} route",
            ).add_to(fg)

        # Add hotel marker
        if hotel_lat and hotel_lon:
            folium.Marker(
                location=[float(hotel_lat), float(hotel_lon)],
                popup=hotel_popup,
                tooltip=hotel_tooltip,
                icon=folium.Icon(color="black", icon="home", prefix="fa"),
            ).add_to(fg)

        fg.add_to(m)

    return m._repr_html_()
