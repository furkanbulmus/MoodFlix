import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import json
import re
from typing import List, Dict
from datetime import datetime

class MovieEmotionAnalyzer:
    """
    A comprehensive movie emotion analysis system that combines genre-based, keyword-based,
    and content-based analysis to generate emotion scores for movies.
    """
    
    def __init__(self):
        # Initialize scalers and vectorizers
        self.scaler = MinMaxScaler((0, 10))
        
        # Initialize the emotion mappings and weights
        self._init_emotion_mappings()
        self._validate_mappings()

    def _init_emotion_mappings(self):
        """Initialize all emotion-related mappings and configurations"""
        
        # Define genre to emotion mappings with weights
        self.GENRE_EMOTIONS = {
            'Action': {
                'excited': 0.85,
                'energetic': 0.75,
                'adventurous': 0.65,
                'curious': 0.3
            },
            'Adventure': {
                'adventurous': 0.9,
                'excited': 0.65,
                'curious': 0.6,
                'hopeful': 0.4
            },
            'Animation': {
                'happy': 0.7,
                'peaceful': 0.5,
                'curious': 0.4,
                'sad': 0.3      # Reduced sad for animated films
            },
            'Comedy': {
                'happy': 0.85,
                'energetic': 0.65,
                'peaceful': 0.3,
                'hopeful': 0.3
            },
            'Crime': {
                'curious': 0.75,
                'thoughtful': 0.65,
                'excited': 0.4,
                'sad': 0.3      # Reduced sad for crime dramas
            },
            'Documentary': {
                'curious': 0.85,
                'thoughtful': 0.8,
                'sad': 0.4,     # Reduced sad for documentaries
                'nostalgic': 0.4
            },
            'Drama': {
                'thoughtful': 0.85,
                'sad': 0.6,     # Reduced sad weight for dramas
                'romantic': 0.5,
                'hopeful': 0.4,
                'nostalgic': 0.3
            },
            'Family': {
                'happy': 0.7,
                'peaceful': 0.6,
                'sad': 0.3,     # Reduced sad for family films
                'hopeful': 0.5
            },
            'Fantasy': {
                'curious': 0.75,
                'adventurous': 0.7,
                'excited': 0.5,
                'peaceful': 0.3
            },
            'History': {
                'nostalgic': 0.9,
                'thoughtful': 0.75,
                'sad': 0.5,     # Reduced sad for historical films
                'curious': 0.4,
                'romantic': 0.3
            },
            'Horror': {
                'excited': 0.8,
                'angry': 0.7,
                'sad': 0.3,     # Reduced sad for horror
                'thoughtful': 0.3
            },
            'Music': {
                'happy': 0.8,
                'energetic': 0.7,
                'peaceful': 0.5,
                'romantic': 0.4
            },
            'Mystery': {
                'curious': 0.85,
                'thoughtful': 0.7,
                'excited': 0.5,
                'sad': 0.2      # Reduced sad for mystery
            },
            'Romance': {
                'romantic': 0.9,
                'peaceful': 0.6,
                'sad': 0.4,     # Reduced sad for romantic dramas
                'happy': 0.4,
                'nostalgic': 0.3
            },
            'Science Fiction': {
                'curious': 0.85,
                'adventurous': 0.75,
                'thoughtful': 0.5,
                'sad': 0.3      # Reduced sad for sci-fi dramas
            },
            'Thriller': {
                'excited': 0.85,
                'curious': 0.7,
                'thoughtful': 0.5,
                'sad': 0.2      # Reduced sad for thrillers
            },
            'War': {
                'sad': 0.5,     # Reduced sad for war films (was 0.7)
                'angry': 0.6,
                'thoughtful': 0.6,
                'adventurous': 0.5,  # Increased adventurous
                'excited': 0.4,      # Added excited
                'hopeful': 0.3       # Added hopeful
            },
            'Western': {
                'adventurous': 0.8,
                'nostalgic': 0.7,
                'excited': 0.5,
                'thoughtful': 0.4
            }
        }
        
        # Define mood categories and their associated keywords
        self.MOODS = {
            'happy': {
                'weight': 0.4,
                'keywords': [
                    'joy', 'happiness', 'cheerful', 'uplifting', 'fun', 'comedy', 'laugh',
                    'celebration', 'triumph', 'delight', 'pleasure', 'jubilant', 'merry',
                    'optimistic', 'playful', 'joyous', 'festive', 'entertaining', 'amusing',
                    'light-hearted'
                ],
                'genres': [35, 16, 10751]  # Comedy, Animation, Family
            },
            'sad': {
                'weight': 0.45,
                'keywords': [
                    'sorrow', 'grief', 'melancholy', 'tragic', 'emotional', 'drama',
                    'heartbreak', 'loss', 'depression', 'despair', 'suffering', 'pain',
                    'loneliness', 'regret', 'mourning', 'bittersweet', 'tearjerker',
                    'devastating', 'poignant', 'moving', 'death', 'sacrifice', 'farewell',
                    'goodbye', 'crying', 'tears', 'sadness', 'tragedy', 'holocaust',
                    'dying', 'terminal', 'illness', 'separation', 'divorce',
                    'funeral', 'grieving', 'trauma', 'ptsd', 'suicide', 'depression',
                    'abandonment', 'orphan', 'widow', 'bereavement', 'misery',
                    'heartache', 'anguish', 'desolation', 'melancholy', 'somber'
                ],
                'genres': [18, 10752, 36]  # Drama, War, History
            },
            'excited': {
                'weight': 0.4,
                'keywords': [
                    'thrill', 'suspense', 'action', 'intense', 'epic', 'spectacular',
                    'adrenaline', 'explosive', 'dynamic', 'gripping', 'shocking',
                    'surprising', 'dramatic', 'climactic', 'exhilarating', 'riveting',
                    'heart-pounding', 'breathtaking', 'electrifying', 'stunning'
                ],
                'genres': [28, 53]  # Action, Thriller
            },
            'romantic': {
                'weight': 0.4,
                'keywords': [
                    'love', 'romance', 'passion', 'relationship', 'emotional',
                    'affection', 'intimate', 'tender', 'heartwarming', 'chemistry',
                    'romantic comedy', 'love story', 'soulmate', 'destiny', 'attraction',
                    'romantic drama', 'dating', 'marriage', 'courtship', 'devotion'
                ],
                'genres': [10749]  # Romance
            },
            'angry': {
                'weight': 0.3,
                'keywords': [
                    'violence', 'conflict', 'intense', 'dark', 'gritty',
                    'revenge', 'rage', 'hatred', 'brutal', 'aggressive',
                    'vengeance', 'fury', 'confrontation', 'hostile', 'fierce',
                    'ruthless', 'violent', 'savage', 'merciless', 'vindictive'
                ],
                'genres': [10752, 27]  # War, Horror
            },
            'peaceful': {
                'weight': 0.3,
                'keywords': [
                    'calm', 'gentle', 'relaxing', 'soothing', 'harmony',
                    'tranquil', 'serene', 'peaceful', 'meditative', 'quiet',
                    'contemplative', 'zen', 'balanced', 'natural', 'comforting',
                    'healing', 'spiritual', 'mindful', 'therapeutic', 'restful'
                ],
                'genres': [10751, 10402]  # Family, Music
            },
            'curious': {
                'weight': 0.4,
                'keywords': [
                    'mystery', 'discovery', 'exploration', 'science', 'wonder',
                    'investigation', 'research', 'experiment', 'quest', 'search',
                    'revelation', 'enigma', 'puzzle', 'intrigue', 'fascinating',
                    'mysterious', 'unknown', 'secrets', 'discovery', 'learning'
                ],
                'genres': [9648, 878]  # Mystery, Science Fiction
            },
            'nostalgic': {
                'weight': 0.35,
                'keywords': [
                    'classic', 'retro', 'memory', 'historical', 'vintage',
                    'reminiscent', 'throwback', 'childhood', 'tradition', 'heritage',
                    'old-fashioned', 'timeless', 'memorable', 'sentimental', 'retrospective',
                    'bygone era', 'nostalgia', 'remembrance', 'past', 'legacy'
                ],
                'genres': [36, 37]  # History, Western
            },
            'adventurous': {
                'weight': 0.4,
                'keywords': [
                    'adventure', 'journey', 'quest', 'exploration', 'discovery',
                    'expedition', 'voyage', 'travel', 'wilderness', 'survival',
                    'challenge', 'daring', 'heroic', 'brave', 'bold',
                    'risk-taking', 'courageous', 'intrepid', 'fearless', 'valiant'
                ],
                'genres': [12, 14]  # Adventure, Fantasy
            },
            'hopeful': {
                'weight': 0.3,
                'keywords': [
                    'inspiring', 'optimistic', 'uplifting', 'motivational',
                    'encouraging', 'positive', 'aspiring', 'promising', 'faith',
                    'determination', 'perseverance', 'triumph', 'achievement', 'dream',
                    'ambition', 'success', 'overcome', 'inspiration', 'courage', 'belief'
                ],
                'genres': []
            },
            'thoughtful': {
                'weight': 0.35,
                'keywords': [
                    'philosophical', 'deep', 'meaningful', 'thought-provoking',
                    'intellectual', 'complex', 'profound', 'analytical', 'reflective',
                    'contemplative', 'insightful', 'psychological', 'perspective',
                    'understanding', 'wisdom', 'moral', 'ethical', 'introspective',
                    'enlightening', 'consciousness'
                ],
                'genres': [99, 18]  # Documentary, Drama
            },
            'energetic': {
                'weight': 0.35,
                'keywords': [
                    'dynamic', 'fast-paced', 'action', 'lively', 'vibrant',
                    'energetic', 'powerful', 'active', 'animated', 'spirited',
                    'high-energy', 'intense', 'vigorous', 'enthusiastic', 'passionate',
                    'driven', 'dynamic', 'forceful', 'strong', 'determined'
                ],
                'genres': [28, 10402]  # Action, Music
            }
        }
        
        # Content type weights for scoring
        self.CONTENT_WEIGHTS = {
            'genre': 0.45,
            'keyword': 0.35,
            'atmosphere': 0.2,
            'year': 0.4
        }

        # Define era-based emotion weights
        self.ERA_WEIGHTS = {
            'nostalgic': {
                (1900, 1960): 0.9,  # Very nostalgic
                (1961, 1980): 0.7,  # Quite nostalgic
                (1981, 2000): 0.5,  # Moderately nostalgic
                (2001, 2010): 0.3,  # Slightly nostalgic
                (2011, 2024): 0.1   # Barely nostalgic
            },
            'romantic': {
                (1900, 1960): 0.4,  # Classic romance era
                (1961, 1980): 0.3,
                (1981, 2000): 0.2
            },
            'sad': {
                (1900, 1960): 0.3,  # Classic drama era
                (1961, 1980): 0.2
            }
        }

    def _validate_mappings(self):
        """Validate all emotion mappings and configurations"""
        # Validate MOODS structure
        required_keys = {'genres', 'keywords', 'weight'}
        for mood, data in self.MOODS.items():
            if not isinstance(mood, str):
                raise ValueError(f"Mood key must be string: {mood}")
            if not isinstance(data, dict):
                raise ValueError(f"Mood data must be dictionary: {mood}")
            if not all(key in data for key in required_keys):
                raise ValueError(f"Missing required keys in mood data: {mood}")
            if not all(isinstance(genre_id, int) for genre_id in data['genres']):
                raise ValueError(f"Invalid genre IDs in mood: {mood}")

    def normalize_scores(self, vector: List[float]) -> List[float]:
        """Normalize scores to range 0-10 with enhanced distribution"""
        if not vector:
            return [0.0] * len(vector)
            
        # Convert to numpy array and reshape
        arr = np.array(vector).reshape(1, -1)
        
        # If all values are 0, return zero vector
        if np.all(arr == 0):
            return [0.0] * len(vector)
            
        # If all values are the same but not 0, add small random variations
        if np.all(arr == arr[0][0]) and arr[0][0] != 0:
            variations = np.random.uniform(-0.1, 0.1, arr.shape)
            arr = arr + variations
            
        # Apply sigmoid normalization for better distribution
        mean = np.mean(arr)
        std = np.std(arr) if np.std(arr) != 0 else 1
        sigmoid = 1 / (1 + np.exp(-(arr - mean) / std))
        normalized = sigmoid * 10
        
        # Round to 2 decimal places
        return [round(x, 2) for x in normalized[0].tolist()]

    def parse_genre_ids(self, genre_data: str) -> List[int]:
        """Parse genre IDs from string format"""
        if not genre_data:
            return []
            
        try:
            # Convert genre names to IDs based on standard mapping
            genre_mapping = {
                'Action': 28,
                'Adventure': 12,
                'Animation': 16,
                'Comedy': 35,
                'Crime': 80,
                'Documentary': 99,
                'Drama': 18,
                'Family': 10751,
                'Fantasy': 14,
                'History': 36,
                'Horror': 27,
                'Music': 10402,
                'Mystery': 9648,
                'Romance': 10749,
                'Science Fiction': 878,
                'Thriller': 53,
                'War': 10752,
                'Western': 37
            }
            
            # Split genres and convert to IDs
            genres = [g.strip() for g in genre_data.split(',')]
            genre_ids = [genre_mapping[g] for g in genres if g in genre_mapping]
            
            return genre_ids
                
        except Exception as e:
            return []
            
        return []

    def parse_keywords(self, keyword_data: str) -> List[str]:
        """Parse keywords from string format"""
        if not keyword_data or not isinstance(keyword_data, str):
            return []
            
        # Remove any quotes and split by comma
        keyword_data = keyword_data.replace('"', '').replace("'", '')
        keywords = [k.strip().lower() for k in keyword_data.split(',')]
        return [k for k in keywords if k]  # Remove empty strings

    def score_by_genres(self, genre_ids: List[int]) -> Dict[str, float]:
        """Calculate mood scores based on movie genres"""
        scores = {mood: 0.0 for mood in self.MOODS.keys()}
        
        if not genre_ids:
            return scores
        
        # Convert genre IDs back to names for emotion mapping
        genre_id_to_name = {
            28: 'Action',
            12: 'Adventure',
            16: 'Animation',
            35: 'Comedy',
            80: 'Crime',
            99: 'Documentary',
            18: 'Drama',
            10751: 'Family',
            14: 'Fantasy',
            36: 'History',
            27: 'Horror',
            10402: 'Music',
            9648: 'Mystery',
            10749: 'Romance',
            878: 'Science Fiction',
            53: 'Thriller',
            10752: 'War',
            37: 'Western'
        }
        
        for genre_id in genre_ids:
            if genre_id not in genre_id_to_name:
                continue
                
            genre_name = genre_id_to_name[genre_id]
            
            if genre_name in self.GENRE_EMOTIONS:
                for mood, weight in self.GENRE_EMOTIONS[genre_name].items():
                    scores[mood] += weight * self.CONTENT_WEIGHTS['genre']
        
        return scores

    def score_by_keywords_and_overview(self, text: str) -> Dict[str, float]:
        """Calculate mood scores based on movie keywords and overview"""
        scores = {mood: 0.0 for mood in self.MOODS.keys()}
        
        if not text:
            return scores
            
        text = text.lower().strip()
        
        for mood, data in self.MOODS.items():
            # Check keywords in text
            keyword_matches = sum(1 for k in data['keywords'] 
                                if k.lower() in text)
            if keyword_matches > 0:
                scores[mood] += keyword_matches * data['weight'] * self.CONTENT_WEIGHTS['keyword']
            
            # Check atmosphere words in text
            atmosphere_matches = sum(1 for a in data['keywords'] 
                                   if a.lower() in text)
            if atmosphere_matches > 0:
                scores[mood] += atmosphere_matches * data['weight'] * self.CONTENT_WEIGHTS['atmosphere']
        
        return scores

    def analyze_movie(self, movie: Dict) -> Dict:
        try:
            # Initialize scores
            all_scores = {mood: 0.0 for mood in self.MOODS.keys()}
            
            # Extract basic movie data
            title = str(movie.get('title', 'Unknown Movie'))
            
            # Get release year and apply era-based scoring
            release_year = None
            if release_date := movie.get('release_date', ''):
                try:
                    release_year = int(release_date[:4])
                    current_year = datetime.now().year
                    
                    # Apply era-based emotion weights
                    for emotion, era_ranges in self.ERA_WEIGHTS.items():
                        for (start, end), weight in era_ranges.items():
                            if start <= release_year <= end:
                                all_scores[emotion] += weight * self.CONTENT_WEIGHTS['year']
                    
                    # Additional nostalgic boost based on age
                    age = current_year - release_year
                    if age > 0:
                        nostalgic_boost = min(age / 100, 1.0) * 0.5  # Max 50% boost for 100+ year old films
                        all_scores['nostalgic'] += nostalgic_boost * self.CONTENT_WEIGHTS['year']
                except:
                    pass

            # Update emotional themes
            emotional_themes = {
                'sad': [
                    'death', 'loss', 'sacrifice', 'holocaust', 'tragedy', 
                    'terminal illness', 'farewell', 'heartbreak', 'grief',
                    'loneliness', 'depression', 'suffering', 'separation',
                    'mourning', 'tears', 'sorrow', 'regret'
                ],
                'romantic': [
                    'love', 'romance', 'relationship', 'passion', 'heart', 
                    'destiny', 'soulmate', 'kiss', 'wedding', 'marriage',
                    'affection', 'embrace', 'romantic', 'date', 'lovers',
                    'chemistry', 'attraction', 'courtship'
                ],
                'nostalgic': [
                    'memory', 'past', 'childhood', 'remember', 'history',
                    'classic', 'vintage', 'retro', 'tradition', 'heritage',
                    'old days', 'memories', 'throwback', 'reminisce',
                    'bygone era', 'golden age', 'timeless', 'legacy'
                ]
            }

            # Process Overview Text with enhanced emotional analysis
            overview = str(movie.get('overview', ''))
            if overview:
                # Count theme occurrences for each emotion
                theme_counts = {}
                for emotion, themes in emotional_themes.items():
                    count = sum(1 for theme in themes if theme.lower() in overview.lower())
                    theme_counts[emotion] = count * 0.35  # Increased from 0.3
                
                overview_scores = self.score_by_keywords_and_overview(overview)
                for mood, score in overview_scores.items():
                    theme_bonus = theme_counts.get(mood, 0)
                    all_scores[mood] += (score * 1.2) + theme_bonus

            # Process Tagline
            tagline = str(movie.get('tagline', ''))
            if tagline:
                tagline_theme_counts = {}
                for emotion, themes in emotional_themes.items():
                    count = sum(1 for theme in themes if theme.lower() in tagline.lower())
                    tagline_theme_counts[emotion] = count * 0.25  # Increased from 0.2
                
                tagline_scores = self.score_by_keywords_and_overview(tagline)
                for mood, score in tagline_scores.items():
                    theme_bonus = tagline_theme_counts.get(mood, 0)
                    all_scores[mood] += (score * 0.8) + theme_bonus

            # Update genre combinations
            genre_combinations = {
                'epic_adventure': ([12, 28, 14], {'adventurous': 0.4, 'excited': 0.3}),
                'romantic_comedy': ([35, 10749], {'happy': 0.3, 'romantic': 0.4}),  # Increased romantic
                'romantic_drama': ([18, 10749], {'romantic': 0.5, 'sad': 0.3, 'nostalgic': 0.3}),  # New combination
                'historical_romance': ([36, 10749], {'romantic': 0.4, 'nostalgic': 0.5}),  # New combination
                'sci_fi_thriller': ([878, 53], {'curious': 0.3, 'excited': 0.3}),
                'historical_drama': ([36, 18], {'thoughtful': 0.3, 'nostalgic': 0.4}),  # Increased nostalgic
                'family_adventure': ([10751, 12], {'happy': 0.3, 'adventurous': 0.3}),
                'war_drama': ([10752, 18], {'thoughtful': 0.3, 'sad': 0.3, 'nostalgic': 0.3}),
                'war_action': ([10752, 28], {'excited': 0.4, 'adventurous': 0.3, 'energetic': 0.3}),
                'mystery_thriller': ([9648, 53], {'curious': 0.3, 'excited': 0.3}),
                'animated_family': ([16, 10751], {'happy': 0.3, 'peaceful': 0.3})
            }

            # 3. Process Genres with enhanced combinations
            genre_data = movie.get('genres', '')
            genre_ids = self.parse_genre_ids(genre_data)
            genre_scores = self.score_by_genres(genre_ids)
            
            # Apply combination bonuses
            for combo_name, (required_genres, bonuses) in genre_combinations.items():
                if all(genre in genre_ids for genre in required_genres):
                    for mood, bonus in bonuses.items():
                        all_scores[mood] += bonus
            
            # Apply base genre scores
            for mood, score in genre_scores.items():
                all_scores[mood] += score * 1.3

            # 4. Process Keywords with enhanced weighting
            keyword_data = movie.get('keywords', '')
            keywords = self.parse_keywords(keyword_data)
            
            # Group keywords by themes
            keyword_themes = {
                'action': ['fight', 'battle', 'chase', 'explosion', 'combat'],
                'emotion': ['love', 'hate', 'fear', 'joy', 'sorrow'],
                'adventure': ['quest', 'journey', 'expedition', 'discovery'],
                'drama': ['tragedy', 'conflict', 'relationship', 'struggle'],
                'mystery': ['secret', 'conspiracy', 'investigation', 'mystery']
            }
            
            # Calculate theme presence
            theme_presence = {theme: 0 for theme in keyword_themes}
            for theme, theme_keywords in keyword_themes.items():
                matches = sum(1 for k in keywords if any(tk.lower() in k.lower() for tk in theme_keywords))
                theme_presence[theme] = matches * 0.2
            
            # Apply theme bonuses
            theme_to_mood = {
                'action': ['excited', 'energetic'],
                'emotion': ['sad', 'happy', 'romantic'],
                'adventure': ['adventurous', 'curious'],
                'drama': ['thoughtful', 'sad'],
                'mystery': ['curious', 'thoughtful']
            }
            
            for theme, presence in theme_presence.items():
                if presence > 0:
                    for mood in theme_to_mood.get(theme, []):
                        all_scores[mood] += presence

            # 5. Process Runtime with more granular analysis
            runtime = int(movie.get('runtime', 0))
            if runtime > 0:
                runtime_scores = self.score_by_runtime(runtime)
                for mood, score in runtime_scores.items():
                    all_scores[mood] += score * 0.4

            # 6. Process Vote Average and Count with enhanced weighting
            vote_average = float(movie.get('vote_average', 0))
            vote_count = int(movie.get('vote_count', 0))
            if vote_average > 0 and vote_count > 0:
                rating_scores = self.score_by_rating(vote_average, vote_count)
                for mood, score in rating_scores.items():
                    all_scores[mood] += score * 0.5

            # 7. Process Popularity with mood correlations
            popularity = float(movie.get('popularity', 0))
            if popularity > 0:
                popularity_scores = self.score_by_popularity(popularity)
                for mood, score in popularity_scores.items():
                    all_scores[mood] += score * 0.3

            # Convert scores to vector
            emotion_vector = [all_scores[mood] for mood in self.MOODS.keys()]
            
            # Normalize vector with enhanced strategy
            normalized_vector = self.normalize_scores(emotion_vector)
            
            return {
                'title': title,
                'release_year': release_year,
                'emotion_vector': normalized_vector
            }
            
        except Exception as e:
            return {
                'title': str(movie.get('title', 'Unknown Movie')),
                'release_year': None,
                'emotion_vector': [0.0] * len(self.MOODS)
            }

    def score_by_runtime(self, runtime: int) -> Dict[str, float]:
        """Calculate mood scores based on movie runtime"""
        scores = {mood: 0.0 for mood in self.MOODS.keys()}
        
        # Very short films (< 80 mins) tend to be more energetic/light
        if runtime < 80:
            scores.update({
                'energetic': 0.6,
                'happy': 0.4,
                'excited': 0.3
            })
        # Standard length films (80-120 mins)
        elif 80 <= runtime <= 120:
            scores.update({
                'energetic': 0.4,
                'excited': 0.3,
                'happy': 0.3
            })
        # Longer films (120-150 mins) tend to be more epic/thoughtful
        elif 120 < runtime <= 150:
            scores.update({
                'thoughtful': 0.5,
                'curious': 0.4,
                'adventurous': 0.4
            })
        # Very long films (> 150 mins) are often epics/dramas
        else:
            scores.update({
                'thoughtful': 0.7,
                'nostalgic': 0.5,
                'sad': 0.4,
                'adventurous': 0.6
            })
            
        return scores

    def score_by_rating(self, vote_average: float, vote_count: int) -> Dict[str, float]:
        """Calculate mood scores based on movie ratings"""
        scores = {mood: 0.0 for mood in self.MOODS.keys()}
        
        # Only consider ratings with significant vote count
        if vote_count < 100:
            return scores
            
        # Weight the rating based on vote count
        vote_weight = min(vote_count / 10000, 1.0)  # Cap at 10000 votes
        effective_rating = vote_average * vote_weight
        
        # High rated films tend to be more impactful
        if effective_rating >= 6.5:
            scores.update({
                'thoughtful': 0.6,
                'hopeful': 0.5,
                'curious': 0.4
            })
        # Mid-high rated films
        elif 6.2 <= effective_rating < 6.5:
            scores.update({
                'happy': 0.5,
                'excited': 0.4,
                'peaceful': 0.3
            })
        # Mid rated films
        elif 6.0 <= effective_rating < 6.2:
            scores.update({
                'energetic': 0.4,
                'excited': 0.3
            })
            
        return scores

    def score_by_popularity(self, popularity: float) -> Dict[str, float]:
        """Calculate mood scores based on movie popularity"""
        scores = {mood: 0.0 for mood in self.MOODS.keys()}
        
        # Very popular films tend to be more exciting/energetic
        if popularity >= 100:
            scores.update({
                'excited': 0.5,
                'energetic': 0.4,
                'happy': 0.3
            })
        # Moderately popular films
        elif 50 <= popularity < 100:
            scores.update({
                'excited': 0.3,
                'energetic': 0.3,
                'adventurous': 0.3
            })
        # Less popular films might be more thoughtful/artistic
        else:
            scores.update({
                'thoughtful': 0.4,
                'curious': 0.3,
                'peaceful': 0.3
            })
            
        return scores

    def process_movies(self, movies: List[Dict]) -> List[Dict]:
        """Process a list of movies and return their emotion analyses"""
        if not isinstance(movies, list):
            raise ValueError("movies must be a list of dictionaries")
            
        results = []
        for movie in movies:
            try:
                result = self.analyze_movie(movie)
                results.append(result)
            except Exception as e:
                print(f"Error processing movie: {str(e)}")
                continue
        
        return results

def process_dataset(csv_path: str, output_path: str):
    """Process movies dataset and save emotion vectors"""
    try:
        # Read dataset
        df = pd.read_csv(csv_path)
        total_movies = len(df)
        print(f'Processing {total_movies} movies...')
        
        # Initialize analyzer
        analyzer = MovieEmotionAnalyzer()
        
        # Process each movie
        results = []
        for idx, movie in df.iterrows():
            result = analyzer.analyze_movie(movie.to_dict())
            # Round emotion vector values to 2 decimal places
            result['emotion_vector'] = [round(x, 2) for x in result['emotion_vector']]
            results.append(result)
            
            # Show progress every 10000 movies
            if (idx + 1) % 10000 == 0:
                print(f'Processed {idx + 1}/{total_movies} movies ({((idx + 1)/total_movies*100):.1f}%)')
        
        # Create output DataFrame
        output_df = pd.DataFrame(results)
        
        # Save results with float format
        output_df.to_csv(output_path, index=False, encoding='utf-8', float_format='%.2f')
        print(f'Emotion vectors successfully generated and saved to {output_path}')
        
    except Exception as e:
        print(f"Error processing dataset: {str(e)}")

# Example usage:
if __name__ == '__main__':
    process_dataset('../client/dataset/main_dataset.csv', '../client/dataset/emotion_vectors.csv') 