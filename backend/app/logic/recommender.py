# import pandas as pd
# from typing import List, Dict, Any
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.metrics.pairwise import cosine_similarity

# class ContentBasedRecommender:
#     def __init__(self, stop_words: str = 'english'):
#         self.vectorizer = TfidfVectorizer(stop_words=stop_words)

#     def _create_metadata_soup(self, row: Dict[str, Any]) -> str:
#         """Combines categorical features into a single space-separated string."""
#         components = [
#             str(row.get('category')) if row.get('category') else '',
#             str(row.get('indoor_outdoor')) if row.get('indoor_outdoor') else '',
#             str(row.get('mobility')) if row.get('mobility') else '',
#             str(row.get('budget_level')) if row.get('budget_level') else ''
#         ]
#         return " ".join([c.strip() for c in components if c.strip()])

#     def compute_similarity(self, places: List[Dict[str, Any]], user_interests: List[str]) -> List[Dict[str, Any]]:
#         if not places:
#             return []

#         df = pd.DataFrame(places)
#         df['metadata_soup'] = df.apply(self._create_metadata_soup, axis=1)
#         corpus = df['metadata_soup'].tolist()

#         user_profile_str = " ".join(user_interests)
#         corpus.append(user_profile_str)

#         tfidf_matrix = self.vectorizer.fit_transform(corpus)

#         places_vectors = tfidf_matrix[:-1]
#         user_vector = tfidf_matrix[-1]

#         scores = cosine_similarity(user_vector, places_vectors).flatten()

#         for idx, score in enumerate(scores):
#             places[idx]['similarity_score'] = round(float(score), 4)

#         return places