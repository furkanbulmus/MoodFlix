import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { LoadingScreen } from './ui/loading';
import MovieCard from './MovieCard';
import type { MoodVector, MovieRecommendation } from '../../shared/schema';
import { apiRequest } from '../lib/queryClient';

interface MovieRecommendationsProps {
  moods: MoodVector;
  onBack: () => void;
}

export default function MovieRecommendations({ moods, onBack }: MovieRecommendationsProps) {
  const [page, setPage] = useState(1);

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['/api/recommendations', moods, page],
    queryFn: async () => {
      const response = await apiRequest('POST', `/api/recommendations?page=${page}`, { moods });
      return response.json();
    },
    enabled: Object.keys(moods).length > 0,
  });

  if (isLoading) {
    return <LoadingScreen message="Finding perfect movies for your mood..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">
            Sorry, we couldn't find recommendations right now.
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2" size={16} />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const movieRecommendations: MovieRecommendation[] = recommendations?.movies || [];

  return (
    <section className="py-12 px-4 min-h-screen bg-gradient-to-br from-red-900/10 via-black to-red-800/20">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            Your Personalized Movie Recommendations
          </h2>
          <p className="text-gray-300 text-lg md:text-xl">Movies selected based on your current mood</p>
        </div>

        {/* Selected Moods Summary */}
        <div className="mb-8 p-6 bg-gradient-to-r from-red-900/20 to-red-800/20 rounded-xl border border-red-500/20">
          <h3 className="text-xl font-bold mb-4 text-red-400">Seçtiğiniz Ruh Hali:</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(moods).map(([mood, intensity]) => (
              <span 
                key={mood}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg border border-red-500/30"
              >
                {mood.charAt(0).toUpperCase() + mood.slice(1)} ({intensity}/10)
              </span>
            ))}
          </div>
        </div>

        {/* Movie Grid */}
        {movieRecommendations.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
            {movieRecommendations.map((recommendation) => (
              <MovieCard
                key={recommendation.movie.id}
                movie={recommendation.movie}
                score={recommendation.score}
                reason={recommendation.reason}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted text-xl">No recommendations found for your current mood.</p>
          </div>
        )}

        {/* Load More Button */}
        {recommendations?.hasMore && (
          <div className="text-center mb-8">
            <Button 
              onClick={() => setPage(prev => prev + 1)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-8 py-3 rounded-full border border-red-500/30"
            >
              Load More Movies
            </Button>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to Mood Selection
          </Button>
        </div>
      </div>
    </section>
  );
}
