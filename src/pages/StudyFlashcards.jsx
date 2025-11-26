import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Shuffle, Check, X, Clock, TrendingUp, Brain, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function StudyFlashcards() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get("id");

  const [flashcardSet, setFlashcardSet] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyCards, setStudyCards] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0
  });

  useEffect(() => {
    if (setId) {
      loadFlashcardSet();
    }
  }, [setId]);

  const loadFlashcardSet = async () => {
    try {
      const sets = await base44.entities.FlashcardSet.list();
      const set = sets.find(s => s.id === setId);
      if (set) {
        setFlashcardSet(set);
        
        // Initialize cards with spaced repetition defaults
        const cardsWithDefaults = set.cards.map(card => ({
          ...card,
          ease_factor: card.ease_factor || 2.5,
          interval: card.interval || 0,
          repetitions: card.repetitions || 0,
          review_count: card.review_count || 0,
          mastered: card.mastered === undefined ? false : card.mastered
        }));
        
        // Filter cards that are due for review or new cards
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dueCards = cardsWithDefaults.filter(card => {
          if (!card.next_review_date) return true; // New cards
          const nextReview = new Date(card.next_review_date);
          nextReview.setHours(0, 0, 0, 0);
          return nextReview <= today;
        });
        
        // If no cards are due, show all cards
        setStudyCards(dueCards.length > 0 ? dueCards : cardsWithDefaults);
      }
    } catch (error) {
      console.error("Error loading flashcard set:", error);
    }
  };

  const calculateNextReview = (card, quality) => {
    // SM-2 Algorithm (Simplified)
    // quality: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
    
    let newEaseFactor = card.ease_factor;
    let newInterval = card.interval;
    let newRepetitions = card.repetitions;

    if (quality < 2) {
      // Again or Hard - restart
      newRepetitions = 0;
      newInterval = 1;
    } else {
      // Good or Easy
      newEaseFactor = Math.max(1.3, newEaseFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)));
      
      if (newRepetitions === 0) {
        newInterval = 1;
      } else if (newRepetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(card.interval * newEaseFactor);
      }
      
      newRepetitions++;
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      ease_factor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      next_review_date: nextReviewDate.toISOString(),
      last_review_date: new Date().toISOString(),
      review_count: (card.review_count || 0) + 1,
      mastered: newRepetitions >= 3 && newInterval >= 21 // Mastered if reviewed 3+ times and interval is 3+ weeks
    };
  };

  const handleRating = async (rating) => {
    try {
      const currentCard = studyCards[currentIndex];
      const qualityMap = { again: 0, hard: 1, good: 2, easy: 3 };
      const quality = qualityMap[rating];

      const updatedCardData = calculateNextReview(currentCard, quality);
      
      // Update the card in the array
      const updatedCards = flashcardSet.cards.map(c => 
        c.front === currentCard.front && c.back === currentCard.back
          ? { ...c, ...updatedCardData, difficulty_rating: rating }
          : c
      );

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        [rating]: prev[rating] + 1,
        reviewed: prev.reviewed + 1
      }));

      // Count cards due today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cardsDueToday = updatedCards.filter(card => {
        if (!card.next_review_date) return false;
        const nextReview = new Date(card.next_review_date);
        nextReview.setHours(0, 0, 0, 0);
        return nextReview <= today;
      }).length;

      // Count mastered cards
      const masteredCount = updatedCards.filter(c => c.mastered).length;

      // Update the flashcard set
      await base44.entities.FlashcardSet.update(setId, {
        cards: updatedCards,
        mastered_cards: masteredCount,
        cards_due_today: cardsDueToday,
        last_studied: new Date().toISOString()
      });

      // Move to next card or finish
      if (currentIndex < studyCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        // Session complete
        navigate(createPageUrl("Flashcards"));
      }
    } catch (error) {
      console.error("Error updating flashcard:", error);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...studyCards].sort(() => Math.random() - 0.5);
    setStudyCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (!flashcardSet || studyCards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <Card className="p-8 text-center" style={{ backgroundColor: '#1a1a1a' }}>
          <Brain className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
          <h2 className="text-xl font-bold text-white mb-2">All Caught Up! 🎉</h2>
          <p className="text-gray-400 mb-4">No cards due for review right now.</p>
          <Button onClick={() => navigate(createPageUrl("Flashcards"))} className="rounded-xl" style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}>
            Back to Flashcards
          </Button>
        </Card>
      </div>
    );
  }

  const currentCard = studyCards[currentIndex];
  const progress = ((currentIndex + 1) / studyCards.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Flashcards"))}
            className="rounded-xl"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 mx-4 text-center">
            <h2 className="text-lg font-semibold text-white">{flashcardSet.title}</h2>
            <p className="text-sm text-gray-400">
              Card {currentIndex + 1} of {studyCards.length}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleShuffle}
            className="rounded-xl"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="p-3 text-center" style={{ backgroundColor: '#1a1a1a', borderColor: 'var(--sage-600)' }}>
            <p className="text-xs text-gray-400 mb-1">Reviewed</p>
            <p className="text-xl font-bold text-white">{sessionStats.reviewed}</p>
          </Card>
          <Card className="p-3 text-center" style={{ backgroundColor: '#1a1a1a', borderColor: '#ef4444' }}>
            <p className="text-xs text-gray-400 mb-1">Again</p>
            <p className="text-xl font-bold text-red-400">{sessionStats.again}</p>
          </Card>
          <Card className="p-3 text-center" style={{ backgroundColor: '#1a1a1a', borderColor: '#f59e0b' }}>
            <p className="text-xs text-gray-400 mb-1">Hard</p>
            <p className="text-xl font-bold text-orange-400">{sessionStats.hard}</p>
          </Card>
          <Card className="p-3 text-center" style={{ backgroundColor: '#1a1a1a', borderColor: '#10b981' }}>
            <p className="text-xs text-gray-400 mb-1">Good</p>
            <p className="text-xl font-bold text-green-400">{sessionStats.good}</p>
          </Card>
          <Card className="p-3 text-center" style={{ backgroundColor: '#1a1a1a', borderColor: '#3b82f6' }}>
            <p className="text-xs text-gray-400 mb-1">Easy</p>
            <p className="text-xl font-bold text-blue-400">{sessionStats.easy}</p>
          </Card>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Flashcard */}
        <div className="mb-6" style={{ perspective: "1000px", minHeight: "400px" }}>
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: "preserve-3d", cursor: "pointer" }}
            className="relative w-full h-full"
          >
            {/* Front */}
            <Card
              className="absolute inset-0 rounded-2xl p-12 shadow-lg border flex items-center justify-center"
              style={{
                borderColor: 'var(--sage-600)',
                backgroundColor: '#1a1a1a',
                backfaceVisibility: "hidden",
                minHeight: "400px"
              }}
            >
              <div className="text-center">
                <Badge className="mb-4 rounded-lg" style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}>
                  Question
                </Badge>
                <p className="text-2xl font-semibold text-white leading-relaxed">
                  {currentCard.front}
                </p>
                {currentCard.topic && (
                  <Badge variant="outline" className="mt-4 rounded-lg" style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}>
                    {currentCard.topic}
                  </Badge>
                )}
                {currentCard.review_count > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Flame className="w-4 h-4" />
                    <span>Reviewed {currentCard.review_count} times</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Back */}
            <Card
              className="absolute inset-0 rounded-2xl p-12 shadow-lg border flex items-center justify-center"
              style={{
                borderColor: 'var(--sage-600)',
                backgroundColor: '#1a1a1a',
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                minHeight: "400px"
              }}
            >
              <div className="text-center">
                <Badge className="mb-4 rounded-lg" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>
                  Answer
                </Badge>
                <p className="text-xl text-white leading-relaxed whitespace-pre-wrap">
                  {currentCard.back}
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="text-center text-sm text-gray-400 mb-6">
          Click card to flip
        </div>

        {/* Rating Buttons - Only show when flipped */}
        {isFlipped && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => handleRating('again')}
              className="rounded-xl py-6 flex flex-col items-center gap-2 text-white"
              style={{ backgroundColor: '#7f1d1d', borderColor: '#ef4444' }}
            >
              <X className="w-6 h-6" />
              <div>
                <div className="font-bold">Again</div>
                <div className="text-xs opacity-75">&lt; 1 day</div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleRating('hard')}
              className="rounded-xl py-6 flex flex-col items-center gap-2 text-white"
              style={{ backgroundColor: '#92400e', borderColor: '#f59e0b' }}
            >
              <Clock className="w-6 h-6" />
              <div>
                <div className="font-bold">Hard</div>
                <div className="text-xs opacity-75">1 day</div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleRating('good')}
              className="rounded-xl py-6 flex flex-col items-center gap-2 text-white"
              style={{ backgroundColor: '#065f46', borderColor: '#10b981' }}
            >
              <Check className="w-6 h-6" />
              <div>
                <div className="font-bold">Good</div>
                <div className="text-xs opacity-75">
                  {currentCard.repetitions === 0 ? '1 day' : currentCard.repetitions === 1 ? '6 days' : `${Math.round(currentCard.interval * (currentCard.ease_factor || 2.5))} days`}
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleRating('easy')}
              className="rounded-xl py-6 flex flex-col items-center gap-2 text-white"
              style={{ backgroundColor: '#1e3a8a', borderColor: '#3b82f6' }}
            >
              <TrendingUp className="w-6 h-6" />
              <div>
                <div className="font-bold">Easy</div>
                <div className="text-xs opacity-75">
                  {currentCard.repetitions === 0 ? '4 days' : `${Math.round(currentCard.interval * (currentCard.ease_factor || 2.5) * 1.3)} days`}
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Card Progress Dots */}
        <div className="mt-6 flex justify-center gap-2 flex-wrap">
          {studyCards.map((card, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsFlipped(false);
              }}
              className={`w-8 h-8 rounded-lg transition-all duration-200 text-xs font-medium ${
                index === currentIndex
                  ? 'shadow-sm'
                  : 'opacity-50'
              }`}
              style={{
                backgroundColor: index === currentIndex ? 'var(--sage-600)' : '#1a1a1a',
                color: '#ffffff',
                borderColor: 'var(--sage-600)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}