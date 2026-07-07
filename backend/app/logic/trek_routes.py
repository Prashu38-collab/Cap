# app/logic/trek_routes.py

TREK_ROUTES = {
    "Langtang Trek": {
        "district": "Rasuwa",
        "category": "adventure",
        "total_days": 6,
        "trailhead": "Syabrubesi",
        "stops": [
            {"day": 1, "route": "Origin → Syabrubesi", "hotel": "Syabrubesi Guest House", "lat": 28.0965, "lon": 85.4678},
            {"day": 2, "route": "Syabrubesi → Lama Hotel", "hotel": "Lama Hotel", "lat": 28.1567, "lon": 85.4989},
            {"day": 3, "route": "Lama Hotel → Langtang Village", "hotel": "Langtang Village Lodge", "lat": 28.2165, "lon": 85.5112},
            {"day": 4, "route": "Langtang Village → Kyanjin Gompa", "hotel": "Kyanjin Guest House", "lat": 28.2456, "lon": 85.5345},
            {"day": 5, "route": "Kyanjin Gompa → Lama Hotel", "hotel": "Lama Hotel", "lat": 28.1567, "lon": 85.4989},
            {"day": 6, "route": "Lama Hotel → Syabrubesi → Origin", "hotel": "Home/Origin", "lat": 0.0, "lon": 0.0}, # Lat/Lon 0 indicates return trip
        ]
    },
    "Gosainkunda Lake": {
        "district": "Rasuwa",
        "category": "adventure",
        "total_days": 7,
        "trailhead": "Dhunche",
        "stops": [
            {"day": 1, "route": "Origin → Dhunche", "hotel": "Dhunche Hotel", "lat": 28.0567, "lon": 85.2345},
            {"day": 2, "route": "Dhunche → Chandanbari", "hotel": "Chandanbari Tea House", "lat": 28.1123, "lon": 85.3567},
            {"day": 3, "route": "Chandanbari → Laurebina", "hotel": "Laurebina Lodge", "lat": 28.1456, "lon": 85.3890},
            {"day": 4, "route": "Laurebina → Gosainkunda Lake", "hotel": "Bhairav Kund Lodge", "lat": 28.0820, "lon": 85.4150},
            {"day": 5, "route": "Gosainkunda Exploration", "hotel": "Bhairav Kund Lodge", "lat": 28.0820, "lon": 85.4150},
            {"day": 6, "route": "Gosainkunda → Dhunche", "hotel": "Dhunche Hotel", "lat": 28.0567, "lon": 85.2345},
            {"day": 7, "route": "Dhunche → Origin", "hotel": "Home/Origin", "lat": 0.0, "lon": 0.0},
        ]
    },
    "Ruby Valley Trek": {
        "district": "Rasuwa",
        "category": "adventure",
        "total_days": 6,
        "trailhead": "Gatlang",
        "stops": [
            {"day": 1, "route": "Origin → Gatlang", "hotel": "Gatlang Homestay", "lat": 28.0234, "lon": 85.2123},
            {"day": 2, "route": "Gatlang → Somdang", "hotel": "Somdang Homestay", "lat": 28.1567, "lon": 85.3456},
            {"day": 3, "route": "Somdang → Pangsang Pass", "hotel": "Pangsang Lodge", "lat": 28.1890, "lon": 85.3789},
            {"day": 4, "route": "Pangsang → Chalish Gaun", "hotel": "Chalish Guest House", "lat": 28.1234, "lon": 85.3123},
            {"day": 5, "route": "Chalish → Borang", "hotel": "Borang Lodge", "lat": 28.0890, "lon": 85.2789},
            {"day": 6, "route": "Borang → Gatlang → Origin", "hotel": "Home/Origin", "lat": 0.0, "lon": 0.0},
        ]
    },
    "Tsho Rolpa Trek": {
        "district": "Dolakha",
        "category": "adventure",
        "total_days": 7,
        "trailhead": "Simigaun",
        "stops": [
            {"day": 1, "route": "Origin → Simigaun", "hotel": "Simigaun Lodge", "lat": 27.8567, "lon": 86.1234},
            {"day": 2, "route": "Simigaun → Dongang", "hotel": "Dongang Guest House", "lat": 27.8890, "lon": 86.1567},
            {"day": 3, "route": "Dongang → Beding", "hotel": "Beding Hotel", "lat": 27.9123, "lon": 86.1890},
            {"day": 4, "route": "Beding → Na Village", "hotel": "Na Village Lodge", "lat": 27.9456, "lon": 86.2123},
            {"day": 5, "route": "Na → Tsho Rolpa → Beding", "hotel": "Beding Hotel", "lat": 27.9123, "lon": 86.1890},
            {"day": 6, "route": "Beding → Simigaun", "hotel": "Simigaun Lodge", "lat": 27.8567, "lon": 86.1234},
            {"day": 7, "route": "Simigaun → Origin", "hotel": "Home/Origin", "lat": 0.0, "lon": 0.0},
        ]
    },
    "Gaurishankar Trek": {
        "district": "Dolakha",
        "category": "adventure",
        "total_days": 16,
        "trailhead": "Charikot",
        "stops": [
            {"day": 1, "route": "Origin → Charikot", "hotel": "Charikot Hotel", "lat": 27.7678, "lon": 86.0345},
            {"day": 2, "route": "Charikot → Bigu", "hotel": "Bigu Lodge", "lat": 27.7890, "lon": 86.0567},
            {"day": 3, "route": "Bigu → Lamabagar", "hotel": "Lamabagar Guest House", "lat": 27.8123, "lon": 86.0789},
            {"day": 4, "route": "Lamabagar → Gongar", "hotel": "Gongar Lodge", "lat": 27.8345, "lon": 86.1012},
            {"day": 5, "route": "Gongar → Simigaun", "hotel": "Simigaun Lodge", "lat": 27.8567, "lon": 86.1234},
            {"day": 6, "route": "Simigaun → Dongang", "hotel": "Dongang Guest House", "lat": 27.8890, "lon": 86.1567},
            {"day": 7, "route": "Dongang → Beding", "hotel": "Beding Hotel", "lat": 27.9123, "lon": 86.1890},
            {"day": 8, "route": "Beding → Na Village", "hotel": "Na Village Lodge", "lat": 27.9456, "lon": 86.2123},
            {"day": 9, "route": "Acclimatization at Na", "hotel": "Na Village Lodge", "lat": 27.9456, "lon": 86.2123},
            {"day": 10, "route": "High Ridge Exploration", "hotel": "High Camp", "lat": 27.9678, "lon": 86.2345},
            {"day": 11, "route": "Gaurishankar Region", "hotel": "High Camp", "lat": 27.9678, "lon": 86.2345},
            {"day": 12, "route": "Return to Na Village", "hotel": "Na Village Lodge", "lat": 27.9456, "lon": 86.2123},
            {"day": 13, "route": "Na → Beding", "hotel": "Beding Hotel", "lat": 27.9123, "lon": 86.1890},
            {"day": 14, "route": "Beding → Dongang", "hotel": "Dongang Guest House", "lat": 27.8890, "lon": 86.1567},
            {"day": 15, "route": "Dongang → Simigaun", "hotel": "Simigaun Lodge", "lat": 27.8567, "lon": 86.1234},
            {"day": 16, "route": "Simigaun → Origin", "hotel": "Home/Origin", "lat": 0.0, "lon": 0.0},
        ]
    }
}