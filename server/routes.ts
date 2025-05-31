import type { Express } from "express";
import { createServer, type Server } from "http";
import { movieRecommendationRequestSchema } from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!TMDB_API_KEY) {
  console.warn("Warning: TMDB_API_KEY not found in environment variables");
}

// Define valid mood types (must match the order in emotion vectors)
export const moodTypes = [
  'happy', 'sad', 'excited', 'romantic', 'angry', 
  'peaceful', 'curious', 'nostalgic', 'adventurous', 
  'hopeful', 'thoughtful', 'energetic'
] as const;

export type MoodType = typeof moodTypes[number];

interface MovieVector {
  title: string;
  release_year: number;
  emotion_vector: number[];
  similarity?: number;
  vote_average?: number;
}

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  genres: string[];
}

interface MovieRecommendation {
  movie: MovieDetails;
  score: number;
  reason: string;
}

// Function to calculate cosine similarity using only selected emotions
function cosineSimilarity(userEmotions: Record<MoodType, number>, movieVector: number[]): number {
  try {
    // Get only the selected emotions
    const selectedEmotions = Object.keys(userEmotions) as MoodType[];
    
    if (selectedEmotions.length === 0) return 0;

    // Create normalized vectors for comparison
    const userVector = new Array(moodTypes.length).fill(0);
    selectedEmotions.forEach(emotion => {
      const index = moodTypes.indexOf(emotion);
      userVector[index] = userEmotions[emotion] / 10; // Normalize to 0-1 range
    });

    // Normalize movie vector to 0-1 range
    const normalizedMovieVector = movieVector.map(v => v / 10);

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let userMagnitude = 0;
    let movieMagnitude = 0;

    // Calculate with weighted importance
    for (let i = 0; i < moodTypes.length; i++) {
      // Higher weight for selected emotions (2.5x)
      // Lower weight for unselected emotions (0.3x)
      // This creates more contrast between selected and unselected emotions
      const weight = selectedEmotions.includes(moodTypes[i]) ? 2.5 : 0.3;
      
      // Additional weight for emotions that should be low
      // If an emotion is not selected, we prefer it to be low in the movie
      const unselectedPenalty = !selectedEmotions.includes(moodTypes[i]) && 
                               normalizedMovieVector[i] > 0.6 ? 0.5 : 1.0;
      
      const finalWeight = weight * unselectedPenalty;
      
      dotProduct += userVector[i] * normalizedMovieVector[i] * finalWeight;
      userMagnitude += (userVector[i] * userVector[i]) * finalWeight;
      movieMagnitude += (normalizedMovieVector[i] * normalizedMovieVector[i]) * finalWeight;
    }

    userMagnitude = Math.sqrt(userMagnitude);
    movieMagnitude = Math.sqrt(movieMagnitude);

    if (userMagnitude === 0 || movieMagnitude === 0) return 0;

    const similarity = dotProduct / (userMagnitude * movieMagnitude);
    
    // Penalize movies that have high values for opposite emotions
    const penaltyFactor = calculatePenalty(userEmotions, movieVector);
    
    return similarity * penaltyFactor;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

// Function to calculate penalty for opposite emotions
function calculatePenalty(userEmotions: Record<MoodType, number>, movieVector: number[]): number {
  const oppositeEmotions = {
    'happy': 'sad',
    'sad': 'happy',
    'excited': 'peaceful',
    'peaceful': 'excited',
    'angry': 'peaceful',
    'romantic': 'angry',
  } as const;

  let penalty = 1.0;
  Object.entries(userEmotions).forEach(([emotion, value]) => {
    const oppositeEmotion = oppositeEmotions[emotion as keyof typeof oppositeEmotions];
    if (oppositeEmotion) {
      const oppositeIndex = moodTypes.indexOf(oppositeEmotion as MoodType);
      if (oppositeIndex >= 0) {
        const normalizedOppositeValue = movieVector[oppositeIndex] / 10;
        // Apply penalty if opposite emotion is strong in the movie
        if (normalizedOppositeValue > 0.5) {
          penalty *= (1 - (normalizedOppositeValue - 0.5));
        }
      }
    }
  });

  return penalty;
}

// Function to safely parse release year
function parseReleaseYear(yearValue: any, lineNumber: number): number | null {
  try {
    // If it's already a number
    if (typeof yearValue === 'number') {
      // Handle decimal numbers
      const year = Math.floor(yearValue);
      if (isValidYear(year)) {
        return year;
      }
      console.warn(`Invalid numeric year at line ${lineNumber}: ${yearValue}`);
      return null;
    }

    // If it's a string
    if (typeof yearValue === 'string') {
      // Remove any whitespace and handle potential decimal point
      const cleanYear = yearValue.trim().split('.')[0];
      const year = parseInt(cleanYear, 10);
      if (isValidYear(year)) {
        return year;
      }
      console.warn(`Invalid string year at line ${lineNumber}: ${yearValue} (cleaned: ${cleanYear})`);
      return null;
    }

    console.warn(`Unexpected year type at line ${lineNumber}: ${typeof yearValue}`);
    return null;
  } catch (e) {
    console.error(`Error parsing year at line ${lineNumber}:`, e);
    return null;
  }
}

// Function to validate year range
function isValidYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return !isNaN(year) && year >= 1900 && year <= currentYear + 5;
}

// Function to read emotion vectors from CSV
async function readEmotionVectors(): Promise<MovieVector[]> {
  try {
    const csvPath = path.resolve(__dirname, '..', 'client', 'dataset', 'emotion_vectors_filtered.csv');
    console.log('Reading CSV from:', csvPath);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at path: ${csvPath}`);
    }

    // Get file stats
    const stats = fs.statSync(csvPath);
    console.log('CSV file size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

    return new Promise((resolve, reject) => {
      const vectors: MovieVector[] = [];
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          if (context.column === 'emotion_vector') {
            try {
              return value
                .replace(/[\[\]]/g, '')
                .split(',')
                .map((n: string) => {
                  const num = parseFloat(n.trim());
                  return isNaN(num) ? 0 : num;
                });
            } catch (e) {
              return [];
            }
          }
          return value;
        }
      });

      fs.createReadStream(csvPath)
        .pipe(parser)
        .on('data', (record: any) => {
          try {
            // Validate emotion vector
            if (!Array.isArray(record.emotion_vector) || 
                record.emotion_vector.length !== moodTypes.length) {
              return;
            }

            vectors.push({
              title: record.title,
              release_year: parseInt(record.release_year),
              emotion_vector: record.emotion_vector
            });

          } catch (e) {
            // Skip invalid records
            return;
          }
        })
        .on('error', (error) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        })
        .on('end', () => {
          console.log(`CSV processing complete. Found ${vectors.length} valid vectors`);
          resolve(vectors);
        });
    });
  } catch (error) {
    console.error('Error reading vectors:', error);
    throw error;
  }
}

// Function to fetch movie details from TMDB
async function fetchMovieDetails(title: string, year: number): Promise<MovieDetails | null> {
  try {
    console.log(`Fetching details for movie: ${title} (${year})`);
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.error(`TMDB search failed: ${searchResponse.status} ${searchResponse.statusText}`);
      return null;
    }

    const searchData = await searchResponse.json();
    console.log(`Found ${searchData.results?.length || 0} results for "${title}"`);

    if (searchData.results && searchData.results.length > 0) {
      const movie = searchData.results[0];
      const detailsUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      
      if (!detailsResponse.ok) {
        console.error(`TMDB details failed: ${detailsResponse.status} ${detailsResponse.statusText}`);
        return null;
      }

      const details = await detailsResponse.json();
      return {
        id: details.id,
        title: details.title,
        overview: details.overview,
        poster_path: details.poster_path,
        release_date: details.release_date,
        vote_average: details.vote_average,
        genres: details.genres.map((g: any) => g.name)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
}

// Function to find similar movies based on emotion vector
async function findSimilarMovies(
  userEmotions: Record<MoodType, number>,
  recommendationType: 'match' | 'change',
  page: number = 1
): Promise<{ movies: MovieRecommendation[]; hasMore: boolean }> {
  try {
    console.log('Finding similar movies...');
    console.log('User emotions:', userEmotions);
    console.log('Recommendation type:', recommendationType);

    // If recommendation type is 'change', invert the emotion values
    const emotionsToUse = recommendationType === 'change' 
      ? Object.fromEntries(
          Object.entries(userEmotions).map(([emotion, value]) => 
            [emotion, 10 - value]
          )
        ) as Record<MoodType, number>
      : userEmotions;

    // Read all movie vectors
    const movieVectors = await readEmotionVectors();
    console.log(`Found ${movieVectors.length} total movie vectors`);

    // Calculate similarities for all movies
    console.log('Calculating similarities...');
    const moviesWithScores = movieVectors
      .map(movie => {
        const similarity = cosineSimilarity(emotionsToUse, movie.emotion_vector);
        const emotionalScore = similarity * 0.7; // Emotional match: 70%
        const ratingScore = ((movie.vote_average || 5) / 10) * 0.3; // Rating: 30%, default to 5 if not available
        
        return {
          ...movie,
          similarity,
          finalScore: emotionalScore + ratingScore
        };
      })
      .filter(movie => movie.similarity > 0.5); // Higher threshold for better matches

    // Sort by similarity first, then by rating
    const sortedMovies = moviesWithScores.sort((a, b) => {
      // Primary sort by similarity
      if (Math.abs(a.similarity - b.similarity) > 0.05) {
        return b.similarity - a.similarity;
      }
      // Secondary sort by rating if similarities are close
      return b.finalScore - a.finalScore;
    });

    console.log(`Selected top ${sortedMovies.length} movies for current mood`);

    // Take top movies but add some controlled randomness
    // Top 30% guaranteed, then weighted selection from the rest
    const topTier = Math.floor(sortedMovies.length * 0.3);
    const guaranteedMovies = sortedMovies.slice(0, topTier);
    const remainingMovies = sortedMovies.slice(topTier);
    
    // Weighted selection from remaining movies
    const additionalMovies = weightedRandomSelection(remainingMovies, Math.min(70, remainingMovies.length));
    
    const selectedMovies = [...guaranteedMovies, ...additionalMovies];
    console.log(`Selected ${selectedMovies.length} movies (${guaranteedMovies.length} top tier + ${additionalMovies.length} weighted)`);

    // Light shuffle to avoid always showing the same order, but keep high-scoring movies near the top
    const shuffledMovies = [...selectedMovies].sort((a, b) => {
      const randomFactor = (Math.random() - 0.5) * 0.1; // Small random factor
      return (b.similarity - a.similarity) + randomFactor;
    });

    // Get paginated results
    const moviesPerPage = 20;
    const startIndex = (page - 1) * moviesPerPage;
    const endIndex = startIndex + moviesPerPage;
    const paginatedMovies = shuffledMovies.slice(startIndex, endIndex);
    const hasMore = endIndex < shuffledMovies.length;

    console.log(`Getting details for ${paginatedMovies.length} movies...`);

    // Fetch movie details
    const movieDetails = await Promise.all(
      paginatedMovies.map(async movie => {
        const details = await fetchMovieDetails(movie.title, movie.release_year);
        if (!details) return null;

        return {
          movie: details,
          score: movie.finalScore,
          reason: generateRecommendationReason(movie.similarity, recommendationType, details.vote_average)
        };
      })
    );

    const validMovies = movieDetails.filter((movie): movie is MovieRecommendation => movie !== null);
    console.log(`Successfully fetched details for ${validMovies.length} movies`);

    return {
      movies: validMovies,
      hasMore
    };
  } catch (error) {
    console.error('Error finding similar movies:', error);
    throw error;
  }
}

// Function to perform weighted random selection
function weightedRandomSelection<T extends { finalScore: number }>(items: T[], count: number): T[] {
  const selected: T[] = [];
  const totalWeight = items.reduce((sum, item) => sum + Math.pow(item.finalScore, 2), 0);
  
  while (selected.length < count && items.length > selected.length) {
    let random = Math.random() * totalWeight;
    for (const item of items) {
      if (selected.includes(item)) continue;
      
      random -= Math.pow(item.finalScore, 2);
      if (random <= 0) {
        selected.push(item);
        break;
      }
    }
  }
  
  return selected;
}

// Helper function to generate recommendation reason
function generateRecommendationReason(similarity: number, type: 'match' | 'change', rating: number): string {
  const percentage = Math.round(similarity * 100);
  const ratingText = rating >= 7.5 ? " (Highly Rated!)" : 
                     rating >= 6.5 ? " (Well Rated)" : "";
  
  if (type === 'match') {
    if (percentage > 90) return `Perfect emotional match!${ratingText}`;
    if (percentage > 80) return `Strong emotional resonance${ratingText}`;
    if (percentage > 70) return `Matches your emotional state${ratingText}`;
    if (percentage > 60) return `Similar emotional tone${ratingText}`;
    return `Emotionally aligned${ratingText}`;
  } else {
    if (percentage > 90) return `Will transform your mood completely!${ratingText}`;
    if (percentage > 80) return `Perfect for mood change${ratingText}`;
    if (percentage > 70) return `Will shift your emotions${ratingText}`;
    if (percentage > 60) return `Can change your perspective${ratingText}`;
    return `May alter your mood${ratingText}`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Get movie recommendations
  app.post("/api/recommendations", async (req, res) => {
    try {
      console.log('Received recommendation request:', JSON.stringify({ moods: req.body.moods }, null, 2));
      
      // Validate request
      const validationResult = movieRecommendationRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error('Validation error:', validationResult.error);
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { moods, recommendationType = 'match', page = 1 } = validationResult.data;

      // Validate that at least one mood is selected
      if (Object.keys(moods).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one mood must be selected'
        });
      }

      console.log('Processing recommendation request for moods:', moods);
      console.log('Page:', page);

      const { movies, hasMore } = await findSimilarMovies(moods, recommendationType, page);

      console.log(`Returning ${movies.length} recommendations`);
      
      return res.json({
        movies,
        type: recommendationType,
        moods,
        hasMore
      });
    } catch (error) {
      console.error('Error processing request:', error);
      
      // Send detailed error response
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      });
    }
  });

  return server;
}