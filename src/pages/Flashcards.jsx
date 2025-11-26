import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Plus, Folder, ChevronRight, ChevronDown, Calendar, TrendingUp, Clock, Flame, Trophy, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

export default function Flashcards() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setToDelete, setSetToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await base44.auth.me();
      const materialsData = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email }).catch(() => []);
      const setsData = await base44.entities.FlashcardSet.filter({ created_by: currentUser.email }, '-last_studied').catch(() => []);

      setMaterials(materialsData);
      setFlashcardSets(setsData);
    } catch (error) {
      console.log("Error loading data, using empty list");
      setMaterials([]);
      setFlashcardSets([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Group by subject, then by topic
  const groupedBySubjectAndTopic = materials.reduce((acc, material) => {
    const subject = material.subject || "Uncategorized";
    const topic = material.topic || "General Questions";

    if (!acc[subject]) {
      acc[subject] = {};
    }
    if (!acc[subject][topic]) {
      acc[subject][topic] = [];
    }
    acc[subject][topic].push(material);
    return acc;
  }, {});

  const toggleSubject = (subject) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  const createFlashcardSet = async (subject, topic) => {
    try {
      const topicMaterials = materials.filter((m) =>
      m.subject === subject && (m.topic || "General Questions") === topic
      );

      const cards = topicMaterials.map((m) => ({
        front: m.question,
        back: m.answer,
        topic: m.topic,
        mastered: false,
        ease_factor: 2.5,
        interval: 0,
        repetitions: 0,
        review_count: 0
      }));

      const newSet = await base44.entities.FlashcardSet.create({
        title: `${subject} - ${topic}`,
        subject: subject,
        cards: cards,
        total_cards: cards.length,
        mastered_cards: 0,
        cards_due_today: cards.length // All cards are new/due
      });

      navigate(createPageUrl(`StudyFlashcards?id=${newSet.id}`));
    } catch (error) {
      console.log("Error creating flashcard set");
    }
  };

  const getDueCount = (set) => {
    if (!set.cards) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return set.cards.filter((card) => {
      if (!card.next_review_date) return true; // New cards are due
      const nextReview = new Date(card.next_review_date);
      nextReview.setHours(0, 0, 0, 0);
      return nextReview <= today;
    }).length;
  };

  const getNextReviewDate = (set) => {
    if (!set.cards) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDates = set.cards.
    filter((card) => card.next_review_date).
    map((card) => new Date(card.next_review_date)).
    filter((date) => {
      date.setHours(0, 0, 0, 0);
      return date > today;
    }).
    sort((a, b) => a - b);

    return futureDates.length > 0 ? futureDates[0] : null;
  };

  const formatNextReview = (date) => {
    if (!date) return null;
    const days = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.ceil(days / 7)} weeks`;
    return `${Math.ceil(days / 30)} months`;
  };

  const handleDeleteSet = async () => {
    if (!setToDelete) return;

    try {
      await base44.entities.FlashcardSet.delete(setToDelete.id);
      await loadData(); // Reload data to update the UI
      setDeleteDialogOpen(false);
      setSetToDelete(null);
    } catch (error) {
      console.log("Error deleting flashcard set:", error);
      // Optionally show a user-friendly error message
    }
  };

  const totalDueCards = flashcardSets.reduce((sum, set) => sum + getDueCount(set), 0);
  const totalMastered = flashcardSets.reduce((sum, set) => sum + (set.mastered_cards || 0), 0);
  const totalCards = flashcardSets.reduce((sum, set) => sum + (set.total_cards || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Flashcards</h1>
            <p className="text-gray-400 mt-1">Master your knowledge with spaced repetition</p>
          </div>
        </div>

        {/* Stats Dashboard */}
        {flashcardSets.length > 0 &&
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-5 border-2" style={{ borderColor: '#ef4444', backgroundColor: '#7f1d1d' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#991b1b' }}>
                  <Clock className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{totalDueCards}</p>
                  <p className="text-xs text-red-300 uppercase tracking-wide">Due Today</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-2" style={{ borderColor: '#10b981', backgroundColor: '#065f46' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#047857' }}>
                  <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{totalMastered}</p>
                  <p className="text-xs text-green-300 uppercase tracking-wide">Mastered</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-2" style={{ borderColor: '#3b82f6', backgroundColor: '#1e3a8a' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1e40af' }}>
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{totalCards}</p>
                  <p className="text-xs text-blue-300 uppercase tracking-wide">Total Cards</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-2" style={{ borderColor: '#f59e0b', backgroundColor: '#92400e' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#b45309' }}>
                  <Flame className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{flashcardSets.length}</p>
                  <p className="text-xs text-orange-300 uppercase tracking-wide">Active Sets</p>
                </div>
              </div>
            </Card>
          </div>
        }

        {/* Existing Flashcard Sets */}
        {flashcardSets.length > 0 &&
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your Flashcard Sets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flashcardSets.map((set) => {
              const dueCount = getDueCount(set);
              const nextReview = getNextReviewDate(set);
              const masteryPercent = set.total_cards > 0 ? set.mastered_cards / set.total_cards * 100 : 0;

              return (
                <Card
                  key={set.id}
                  className="rounded-2xl shadow-sm border-2 overflow-hidden hover:shadow-lg transition-all duration-300"
                  style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>

                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-lg mb-2">{set.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {dueCount > 0 &&
                          <Badge className="rounded-lg" style={{ backgroundColor: '#7f1d1d', color: '#ffffff' }}>
                                <Clock className="w-3 h-3 mr-1" />
                                {dueCount} due
                              </Badge>
                          }
                            <Badge variant="outline" className="rounded-lg" style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}>
                              {set.total_cards} cards
                            </Badge>
                            {set.mastered_cards > 0 &&
                          <Badge className="rounded-lg" style={{ backgroundColor: '#065f46', color: '#ffffff' }}>
                                <Trophy className="w-3 h-3 mr-1" />
                                {set.mastered_cards} mastered
                              </Badge>
                          }
                          </div>
                        </div>
                        <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click if any
                          setSetToDelete(set);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-900/10">

                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Mastery Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>Mastery Progress</span>
                          <span>{Math.round(masteryPercent)}%</span>
                        </div>
                        <Progress value={masteryPercent} className="h-2" />
                      </div>

                      {/* Next Review */}
                      {nextReview && dueCount === 0 &&
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                          <Calendar className="w-4 h-4" />
                          <span>Next review: {formatNextReview(nextReview)}</span>
                        </div>
                    }

                      {/* Action Button */}
                      <Button
                      onClick={() => navigate(createPageUrl(`StudyFlashcards?id=${set.id}`))}
                      className="w-full rounded-xl text-white"
                      style={{
                        backgroundColor: dueCount > 0 ? '#7f1d1d' : 'var(--sage-600)',
                        borderColor: dueCount > 0 ? '#ef4444' : 'var(--sage-600)'
                      }}>

                        {dueCount > 0 ?
                      <>
                            <Flame className="w-4 h-4 mr-2" />
                            Study Now ({dueCount} due)
                          </> :

                      <>
                            <Brain className="w-4 h-4 mr-2" />
                            Review Set
                          </>
                      }
                      </Button>
                    </div>
                  </Card>);

            })}
            </div>
          </div>
        }

        {/* Create New Set */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Create New Flashcard Set</h2>
          <p className="text-gray-400 mb-4">Select a subject, then choose a topic to create flashcards</p>
        </div>

        {Object.keys(groupedBySubjectAndTopic).length === 0 ?
        <Card className="rounded-2xl p-12 text-center border" style={{ borderColor: '#374151', backgroundColor: '#1a1a1a' }}>
            <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-white mb-2">No study materials yet</h3>
            <p className="text-gray-400 mb-6">Add some study materials first to create flashcards</p>
            <Link to={createPageUrl("AddMaterial")}>
              <Button style={{ backgroundColor: 'var(--sage-600)' }} className="text-white rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Materials
              </Button>
            </Link>
          </Card> :

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groupedBySubjectAndTopic).map(([subject, topics]) => {
            const totalQuestions = Object.values(topics).flat().length;
            const isExpanded = expandedSubjects[subject];

            return (
              <Card
                key={subject}
                className="rounded-2xl shadow-sm border overflow-hidden"
                style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>

                  <button
                  onClick={() => toggleSubject(subject)}
                  className="w-full p-6 hover:bg-gray-800 transition-colors flex items-center justify-between"
                  style={{
                    backgroundColor: isExpanded ? 'var(--sage-600)' : 'transparent',
                    color: '#ffffff'
                  }}>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
                        <Folder className="w-6 h-6" style={{ color: '#60A5FA' }} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-white text-lg">{subject}</h3>
                        <p className="text-sm text-gray-400">
                          {Object.keys(topics).length} topics • {totalQuestions} questions
                        </p>
                      </div>
                    </div>
                    {isExpanded ?
                  <ChevronDown className="w-5 h-5 text-gray-400" /> :

                  <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                  </button>

                  {isExpanded &&
                <div className="p-4 space-y-3 border-t" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
                      {Object.entries(topics).map(([topic, topicMaterials]) =>
                  <Card
                    key={topic}
                    className="bg-gray-800 rounded-xl p-4 border hover:shadow-sm transition-all duration-300"
                    style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Folder className="w-5 h-5 text-blue-500" />
                              <div>
                                <h4 className="font-semibold text-white">{topic}</h4>
                                <p className="text-xs text-gray-400">
                                  {topicMaterials.length} questions available
                                </p>
                              </div>
                            </div>
                            <Button
                        onClick={() => createFlashcardSet(subject, topic)}
                        size="sm"
                        className="rounded-xl text-white"
                        style={{ backgroundColor: 'var(--sage-600)' }}>

                              <Plus className="w-4 h-4 mr-1" />
                              Create
                            </Button>
                          </div>
                        </Card>
                  )}
                    </div>
                }
                </Card>);

          })}
          </div>
        }
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-950 p-6 fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard Set?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{setToDelete?.title}"? This action cannot be undone and you will lose all progress for this set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSetToDelete(null)} className="bg-background text-slate-950 mt-2 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 sm:mt-0" style={{ color: '#000000' }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSet}
              className="bg-red-600 hover:bg-red-700 text-white">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}