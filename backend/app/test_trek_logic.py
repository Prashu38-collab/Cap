# test_trek_logic.py

# 1. Mock the TREK_ROUTES dictionary (Copy of your actual routes)
TREK_ROUTES = {
    "Langtang Trek": {"district": "Rasuwa", "total_days": 6},
    "Ruby Valley Trek": {"district": "Rasuwa", "total_days": 6},
    "Gosainkunda Lake": {"district": "Rasuwa", "total_days": 7},
    "Tsho Rolpa Trek": {"district": "Dolakha", "total_days": 7},
    "Gaurishankar Trek": {"district": "Dolakha", "total_days": 16}
}

# 2. The exact function from your itinerary_engine.py
def find_matching_trek(place_name: str):
    if not place_name:
        return None, None
        
    # Normalize: Lowercase and remove ALL extra spaces
    normalized_name = " ".join(place_name.lower().split())
    
    for trek_name, trek_data in TREK_ROUTES.items():
        normalized_trek = " ".join(trek_name.lower().split())
        
        # Strict Matching Logic
        if normalized_trek == normalized_name:
            return trek_name, trek_data
            
        # Fallback for names like "Gosainkunda Lake Trek"
        if "trek" in normalized_name and normalized_trek in normalized_name:
             return trek_name, trek_data
             
    return None, None

# 3. The Test Cases (Based on your actual database data)
test_cases = [
    # (Input from DB, Expected Result)
    ("Langtang  Trek", True),          # Has double space, should match
    ("Langtang National Park", False), # Should NOT match (it's a park, not the trek)
    ("Ruby Valley Trek", True),        # Exact match
    ("Gosainkunda lake", True),        # Lowercase 'l', should match
    ("Tsho Rolpa Trek", True),         # Exact match
    ("Pashupatinath temple", False),   # Completely different place
    ("", False),                       # Empty string edge case
]

# 4. Run the tests
print("🚀 STARTING TREK MATCHING TESTS...\n" + "-"*40)

passed = 0
failed = 0

for place_name, should_match in test_cases:
    matched_name, matched_data = find_matching_trek(place_name)
    
    # Check if the result matches our expectation
    is_match = matched_name is not None
    
    if is_match == should_match:
        status = "✅ PASS"
        passed += 1
    else:
        status = "❌ FAIL"
        failed += 1
        
    print(f"{status} | Input: '{place_name}'")
    if is_match:
        print(f"       ➡️ Matched: {matched_name} ({matched_data['total_days']} days)")
    else:
        print(f"       ➡️ No match (Will use normal clustering logic)")
    print("-" * 40)

print(f"\n🏁 TEST COMPLETE: {passed} Passed, {failed} Failed.")