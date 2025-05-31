import { useState } from 'react';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { MOODS } from '../data/moods';
import type { MoodVector } from '../../shared/schema';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { 
  Smile, Frown, Zap, Heart, Angry, Leaf, 
  Lightbulb, Star, Compass, Sun, Brain, Battery 
} from 'lucide-react';

const MOOD_ICONS = {
  smile: Smile,
  frown: Frown,
  zap: Zap,
  heart: Heart,
  angry: Angry,
  leaf: Leaf,
  lightbulb: Lightbulb,
  star: Star,
  compass: Compass,
  sun: Sun,
  brain: Brain,
  battery: Battery,
};

interface MoodSelectionProps {
  onComplete: (moods: MoodVector, recommendationType: 'match' | 'change') => void;
  onBack: () => void;
}

export default function MoodSelection({ onComplete, onBack }: MoodSelectionProps) {
  const [selectedMoods, setSelectedMoods] = useState<Record<string, number>>({});
  const [recommendationType, setRecommendationType] = useState<'match' | 'change'>('match');

  const toggleMood = (moodId: string) => {
    setSelectedMoods(prev => {
      const newMoods = { ...prev };
      if (newMoods[moodId]) {
        delete newMoods[moodId];
      } else {
        newMoods[moodId] = 5; // Default intensity
      }
      return newMoods;
    });
  };

  const updateMoodIntensity = (moodId: string, intensity: number) => {
    setSelectedMoods(prev => ({
      ...prev,
      [moodId]: intensity
    }));
  };

  const handleContinue = () => {
    if (Object.keys(selectedMoods).length > 0) {
      onComplete(selectedMoods);
    }
  };

  const hasSelectedMoods = Object.keys(selectedMoods).length > 0;

  return (
    <section className="py-12 px-4 min-h-screen bg-gradient-to-br from-red-900/10 via-black to-red-800/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            Select Your Current Mood
          </h2>
          <p className="text-gray-300 text-lg md:text-xl">Choose as many moods as you like and adjust their intensity</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {MOODS.map((mood) => {
            const IconComponent = MOOD_ICONS[mood.icon as keyof typeof MOOD_ICONS];
            const isSelected = selectedMoods[mood.id] !== undefined;
            
            return (
              <div
                key={mood.id}
                className={`mood-card bg-card-dark border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected 
                    ? 'selected border-netflix-red' 
                    : 'border-gray-700 hover:border-netflix-red'
                }`}
                onClick={() => toggleMood(mood.id)}
              >
                <div className="text-center">
                  <IconComponent className={`mb-3 mx-auto ${mood.color}`} size={32} />
                  <h3 className="font-semibold text-lg">{mood.name}</h3>
                  <p className="text-sm text-muted mt-1">{mood.description}</p>
                </div>
                
                {isSelected && (
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-sm text-muted mb-2">
                      Intensity: <span className="font-medium">{selectedMoods[mood.id]}</span>
                    </label>
                    <Slider
                      value={[selectedMoods[mood.id]]}
                      onValueChange={([value]) => updateMoodIntensity(mood.id, value)}
                      max={10}
                      min={0}
                      step={1}
                      className="mood-range"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <Button
            onClick={handleContinue}
            disabled={!hasSelectedMoods}
            size="lg"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-500/30"
          >
            Get Movie Recommendations
            <ArrowRight className="ml-3" size={22} />
          </Button>
          
          <div>
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Welcome
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
