import { useState } from 'react';
import WelcomeScreen from '../components/WelcomeScreen';
import MoodSelection from '../components/MoodSelection';
import MovieRecommendations from '../components/MovieRecommendations';
import type { MoodVector } from '../../shared/schema';

type Screen = 'welcome' | 'mood-selection' | 'recommendations';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [selectedMoods, setSelectedMoods] = useState<MoodVector>({});

  const handleStartMoodSelection = () => {
    setCurrentScreen('mood-selection');
  };

  const handleMoodComplete = (moods: MoodVector) => {
    setSelectedMoods(moods);
    setCurrentScreen('recommendations');
  };

  const handleBackToWelcome = () => {
    setCurrentScreen('welcome');
    setSelectedMoods({});
  };

  const handleBackToMoodSelection = () => {
    setCurrentScreen('mood-selection');
  };

  switch (currentScreen) {
    case 'welcome':
      return <WelcomeScreen onStart={handleStartMoodSelection} />;
    
    case 'mood-selection':
      return (
        <MoodSelection 
          onComplete={handleMoodComplete}
          onBack={handleBackToWelcome}
        />
      );
    
    case 'recommendations':
      return (
        <MovieRecommendations 
          moods={selectedMoods}
          onBack={handleBackToMoodSelection}
        />
      );
    
    default:
      return <WelcomeScreen onStart={handleStartMoodSelection} />;
  }
}
