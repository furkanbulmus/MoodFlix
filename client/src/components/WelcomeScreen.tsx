import { Button } from './ui/button';
import { Heart } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-red-800/30"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-red-500/5 to-red-600/10"></div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-2 h-2 bg-red-500/20 rounded-full animate-pulse" style={{top: '20%', left: '10%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-red-400/30 rounded-full animate-pulse" style={{top: '40%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-red-600/15 rounded-full animate-pulse" style={{top: '70%', left: '20%', animationDelay: '2s'}}></div>
        <div className="absolute w-1 h-1 bg-red-500/25 rounded-full animate-pulse" style={{top: '30%', left: '60%', animationDelay: '3s'}}></div>
      </div>

      <div className="text-center px-4 relative z-10">
        <div className="mb-8">
          <h1 className="text-7xl md:text-9xl font-bold mb-6 bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent drop-shadow-2xl animate-pulse">
            MoodFlix
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Discover movies that match your current mood using advanced emotion analysis
          </p>
        </div>
        
        <div className="space-y-6">
          <Button 
            onClick={onStart}
            size="lg"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-5 px-10 text-xl transition-all duration-300 transform hover:scale-110 shadow-2xl rounded-full border-2 border-red-500/30"
          >
            <Heart className="mr-3" size={24} />
            Select Your Mood
          </Button>
          
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Choose from 12 different emotions and get personalized movie recommendations
          </p>
        </div>
      </div>
    </section>
  );
}
