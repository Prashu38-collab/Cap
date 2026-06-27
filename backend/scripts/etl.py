# etl.py
from db import create_database, load_forecast_to_db
from weather_data_district import extract_data, transform_forecast_data

bagmati_districts = [
    'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Nuwakot', 'Rasuwa', 
    'Sindhupalchok', 'Kavrepalanchok', 'Chitwan', 'Dolakha', 'Sindhuli'
]

def run_etl_for_cities(districts):
    create_database() # Ensures table exists
    
    for district in districts:
        try:
            print(f"Fetching forecast for {district}...")
            raw_data, coordinates = extract_data(district)
            transformed_rows = transform_forecast_data(raw_data, district, coordinates)
            
            load_forecast_to_db(transformed_rows)
            print(f"✅ Successfully saved 7-day forecast for {district}.")
        except Exception as e:
            print(f"❌ Failed to process {district}: {e}")

if __name__ == "__main__":
    run_etl_for_cities(bagmati_districts)