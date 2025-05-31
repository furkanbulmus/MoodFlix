import pandas as pd
import numpy as np
from datetime import datetime

def filter_movies():
    print("Starting movie filtering process...")
    
    # Read the datasets
    print("Reading datasets...")
    try:
        main_df = pd.read_csv('../client/dataset/main_dataset.csv')
        emotion_df = pd.read_csv('../client/dataset/emotion_vectors.csv')
        
        print(f"Main dataset shape: {main_df.shape}")
        print(f"Emotion vectors shape: {emotion_df.shape}")
        
        print("\nMain dataset columns:")
        print(main_df.columns.tolist())
        
        if len(main_df) != len(emotion_df):
            raise ValueError("Datasets have different lengths!")
            
        # Convert release_date to year
        main_df['release_year'] = pd.to_datetime(main_df['release_date']).dt.year
        
    except Exception as e:
        print(f"Error reading datasets: {e}")
        return

    # Calculate initial statistics
    print("\nInitial statistics:")
    print(f"Vote count percentiles:")
    percentiles = [0, 25, 50, 75, 90, 95, 99, 100]
    for p in percentiles:
        val = np.percentile(main_df['vote_count'], p)
        print(f"{p}th percentile: {val:.2f}")
    
    print(f"\nRating percentiles:")
    for p in percentiles:
        val = np.percentile(main_df['vote_average'][main_df['vote_average'] > 0], p)
        print(f"{p}th percentile: {val:.2f}")

    # Define stricter filtering criteria
    MIN_VOTE_COUNT = 50      # Minimum number of votes required
    MIN_RATING = 5.0         # Minimum acceptable rating
    MAX_RATING = 10.0        # Maximum acceptable rating
    MIN_YEAR = 1970         # Minimum release year
    MAX_YEAR = datetime.now().year  # Current year
    MIN_RUNTIME = 60        # Minimum runtime in minutes
    
    # Create initial mask for valid movies
    print("\nApplying filters...")
    
    # Basic validity filter
    basic_filter = (
        (main_df['vote_count'] > 0) &           # Must have votes
        (main_df['vote_average'] > 0) &         # Must have rating
        (main_df['vote_average'] <= MAX_RATING) # Must not exceed maximum rating
    )
    
    # Print counts after basic filter
    valid_count = len(main_df[basic_filter])
    print(f"Movies after basic filter: {valid_count}")
    
    # Quality filters
    quality_filter = (
        (main_df['vote_count'] >= MIN_VOTE_COUNT) &     # Minimum votes
        (main_df['vote_average'] >= MIN_RATING) &       # Minimum rating
        (main_df['release_year'] >= MIN_YEAR) &         # Not too old
        (main_df['release_year'] <= MAX_YEAR) &         # Not future movies
        (main_df['runtime'] >= MIN_RUNTIME) &           # Not too short
        (main_df['runtime'].notna()) &                  # Runtime must exist
        (main_df['adult'] == False)                     # Exclude adult movies
    )
    
    # Combine filters
    final_filter = basic_filter & quality_filter
    
    # Apply the filter
    filtered_main = main_df[final_filter].copy()
    filtered_emotion = emotion_df[final_filter].copy()
    
    # Calculate quality score for ranking
    filtered_main['quality_score'] = (
        np.log1p(filtered_main['vote_count']) * 0.4 +    # Vote count importance: 40%
        filtered_main['vote_average'] * 0.4 +            # Rating importance: 40%
        (filtered_main['popularity'] / 
         filtered_main['popularity'].max()) * 0.2        # Popularity importance: 20%
    )
    
    # Sort by quality score and keep top movies
    quality_threshold = filtered_main['quality_score'].quantile(0.2)  # Keep top 80%
    high_quality_filter = filtered_main['quality_score'] >= quality_threshold
    
    filtered_main = filtered_main[high_quality_filter]
    filtered_emotion = filtered_emotion[high_quality_filter]
    
    # Print filtering results
    total_movies = len(main_df)
    remaining_movies = len(filtered_main)
    removed_movies = total_movies - remaining_movies
    
    print("\nFiltering Results:")
    print(f"Total movies before filtering: {total_movies}")
    print(f"Movies removed: {removed_movies}")
    print(f"Remaining movies: {remaining_movies}")
    print(f"Removed percentage: {(removed_movies/total_movies)*100:.2f}%")
    
    # Print statistics about kept movies
    print("\nKept movies statistics:")
    print(f"Average rating: {filtered_main['vote_average'].mean():.2f}")
    print(f"Median rating: {filtered_main['vote_average'].median():.2f}")
    print(f"Average vote count: {filtered_main['vote_count'].mean():.2f}")
    print(f"Median vote count: {filtered_main['vote_count'].median():.2f}")
    print(f"Year range: {filtered_main['release_year'].min()} - {filtered_main['release_year'].max()}")
    print(f"Average runtime: {filtered_main['runtime'].mean():.2f} minutes")
    
    # Print genre distribution
    if 'genres' in filtered_main.columns:
        print("\nTop genres in filtered dataset:")
        genres = filtered_main['genres'].str.split('|').explode()
        print(genres.value_counts().head(10))
    
    # Save filtered datasets
    print("\nSaving filtered datasets...")
    try:
        # Remove unnecessary columns before saving
        columns_to_keep = ['id', 'title', 'vote_average', 'vote_count', 'release_year', 
                          'runtime', 'popularity', 'genres', 'overview']
        filtered_main[columns_to_keep].to_csv('../client/dataset/main_dataset_filtered.csv', index=False)
        filtered_emotion.to_csv('../client/dataset/emotion_vectors_filtered.csv', index=False)
        print("Filtered datasets saved successfully!")
        
        # Save sample of removed movies for inspection
        removed_df = main_df[~final_filter].sample(min(1000, removed_movies))
        removed_df.to_csv('../client/dataset/removed_movies_sample.csv', index=False)
        print("Sample of removed movies saved to 'removed_movies_sample.csv' for inspection")
        
    except Exception as e:
        print(f"Error saving filtered datasets: {e}")
        return

if __name__ == "__main__":
    filter_movies() 