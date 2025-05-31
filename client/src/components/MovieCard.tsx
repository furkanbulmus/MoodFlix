import { Card } from './ui/card';
import { Star } from 'lucide-react';
import type { Movie } from "@shared/schema";
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";

interface MovieCardProps {
  movie: Movie;
  score?: number;
  reason?: string;
}

// TMDB Genre mapping
const genreMap: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

export default function MovieCard({ movie, score, reason }: MovieCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getPosterUrl = (posterPath: string | null) => {
    if (!posterPath) return 'https://via.placeholder.com/300x450/2F2F2F/FFFFFF?text=No+Image';
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  const getYear = (releaseDate: string) => {
    return releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  };

  const formatRating = (rating: number) => {
    return Math.round(rating * 10) / 10;
  };

  // Convert genre_ids to genre names with null checking
  const genres = movie.genre_ids?.map((id: number) => genreMap[id]).filter(Boolean) || [];

  return (
    <>
      <Card 
        className="movie-card bg-card-dark border-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative overflow-hidden">
          <img 
            src={getPosterUrl(movie.poster_path)} 
            alt={`${movie.title} poster`} 
            className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          {score && (
            <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded">
              {Math.round(score * 100)}% Match
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-netflix-red transition-colors">
            {movie.title}
          </h3>
          
          <div className="flex items-center mb-2">
            <Star className="text-accent-gold mr-1" size={16} fill="currentColor" />
            <span className="text-accent-gold font-medium">
              {formatRating(movie.vote_average)}
            </span>
            <span className="text-muted ml-2">
              {getYear(movie.release_date)}
            </span>
          </div>
          
          <p className="text-muted text-sm line-clamp-3">
            {movie.overview || 'No description available.'}
          </p>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              {movie.title}
              <span className="text-lg font-normal text-muted-foreground">
                ({getYear(movie.release_date)})
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <img 
                src={getPosterUrl(movie.poster_path)} 
                alt={`${movie.title} poster`} 
                className="w-full rounded-lg shadow-lg"
              />
              {reason && (
                <Badge className="absolute top-2 left-2 bg-netflix-red">
                  {reason}
                </Badge>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="text-accent-gold" size={24} fill="currentColor" />
                <span className="text-2xl font-bold text-accent-gold">
                  {formatRating(movie.vote_average)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {genres.map((genre: string) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lg font-semibold">Overview</h4>
                <p className="text-muted-foreground">
                  {movie.overview || 'No description available.'}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
