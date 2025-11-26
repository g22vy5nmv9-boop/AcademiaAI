import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardList, Brain, FileText, Plus, TrendingUp, TrendingDown, Clock, Target, BookMarked, GraduationCap, Zap, Star, Award, Sparkles, Trophy, ChevronLeft, ChevronRight, Lightbulb, Crown, Medal, Users, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea import

export default function Home() {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [tests, setTests] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [leaderboardFilter, setLeaderboardFilter] = useState("world"); // For the modal

  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false); // Renamed for clarity
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Assuming lightMode state, default to false (dark mode) based on existing styling
  const [lightMode, setLightMode] = useState(false);

  const studyTips = [
    {
      emoji: "🗺️",
      title: "Start with Practice",
      description: "Take a practice test first! It's like a treasure map to find what you need to learn."
    },
    {
      emoji: "💎",
      title: "Learn from Mistakes",
      description: "Check out those wrong answers - they're golden learning opportunities!"
    },
    {
      emoji: "🧠",
      title: "Spaced Repetition",
      description: "Review material multiple times over several days. Your brain loves spaced learning!"
    },
    {
      emoji: "📝",
      title: "Active Recall",
      description: "Test yourself without looking at notes. It's way better than just re-reading!"
    },
    {
      emoji: "🎯",
      title: "Focus on Weak Spots",
      description: "Spend more time on topics you struggle with. Target your weaknesses!"
    },
    {
      emoji: "⏰",
      title: "Short Study Sessions",
      description: "Study for 25-30 minutes, then take a break. Your focus will thank you!"
    },
    {
      emoji: "🤝",
      title: "Teach Others",
      description: "Explain concepts to someone else. If you can teach it, you really know it!"
    },
    {
      emoji: "🌟",
      title: "Celebrate Progress",
      description: "Acknowledge your wins, no matter how small. You're doing amazing!"
    }
  ];

  useEffect(() => {
    const initLoad = async () => {
      await loadData();
      await loadLeaderboard(); // Load leaderboard data on initial mount for preview
    }
    initLoad();
  }, []);

  // Auto-rotate tips every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % studyTips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const userPromise = base44.auth.me()
        .then((currentUser) => {
          setUser(currentUser);
          return currentUser;
        })
        .catch(() => {
          setUser(null);
          return null;
        });

      const materialsPromise = base44.entities.StudyMaterial.filter({ created_by: currentUser.email }, "-created_date")
        .catch(() => []);

      const testsPromise = base44.entities.TestSession.filter({ created_by: currentUser.email }, "-created_date")
        .catch(() => []);

      const flashcardsPromise = base44.entities.FlashcardSet.filter({ created_by: currentUser.email }, "-created_date")
        .catch(() => []);

      const notesPromise = base44.entities.Note.filter({ created_by: currentUser.email }, "-created_date")
        .catch(() => []);

      const [currentUser, mats, allTests, flashcards, notesData] = await Promise.all([userPromise, materialsPromise, testsPromise, flashcardsPromise, notesPromise]);

      setMaterials(mats);
      setTests(allTests.filter((t) => t.completed));
      setFlashcardSets(flashcards);
      setNotes(notesData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setMaterials([]);
      setTests([]);
      setFlashcardSets([]);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const allUsers = await base44.entities.User.list();
      const rankedUsers = allUsers
        .filter(u => u.total_questions_answered > 0) // Only users who have answered questions
        .sort((a, b) => (b.total_questions_answered || 0) - (a.total_questions_answered || 0)); // Sort for the entire list

      setLeaderboardUsers(rankedUsers);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      setLeaderboardUsers([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const averageScore = tests.length > 0
    ? tests.reduce((sum, t) => sum + (t.score || 0), 0) / tests.length
    : 0;

  const recentTests = tests.slice(0, 5); // Still useful for general overview, but only 3 shown in new layout

  const subjectsCount = [...new Set(materials.map((m) => m.subject).filter(Boolean))].length;
  const topSubjects = materials.reduce((acc, m) => {
    if (m.subject) {
      acc[m.subject] = (acc[m.subject] || 0) + 1;
    }
    return acc;
  }, {});
  const topSubjectsList = Object.entries(topSubjects)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % studyTips.length);
  };

  const handlePreviousTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + studyTips.length) % studyTips.length);
  };

  return (
    <div className="min-h-screen p-3 md:p-8" style={{ backgroundColor: lightMode ? '#ffffff' : 'transparent' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold mb-1" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
            Welcome back, {user?.username || 'Student'}!
          </h1>
          <p className="text-sm md:text-base text-gray-400">Ready to level up your learning today?</p>
        </div>

        {/* Desktop Stats - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                <BookOpen className="w-6 h-6" style={{ color: 'var(--sage-600)' }} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Study Materials</p>
                <p className="text-2xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{materials.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                <ClipboardList className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tests Taken</p>
                <p className="text-2xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{tests.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#8b5cf615' }}>
                <Brain className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Flashcard Sets</p>
                <p className="text-2xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{flashcardSets.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f59e0b15' }}>
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Study Notes</p>
                <p className="text-2xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{notes.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Single column layout */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Actions with mobile stats inside */}
          <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border shadow-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}>
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Quick Actions</h2>
            
            {/* Mobile Stats - Compact 2x2 grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 md:hidden">
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#f0f9ff' }}>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-3 h-3" style={{ color: 'var(--sage-600)' }} />
                  <p className="text-xs text-gray-600">Materials</p>
                </div>
                <p className="text-lg font-bold" style={{ color: '#000000' }}>{materials.length}</p>
              </div>

              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#e0f2fe' }}>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-3 h-3 text-blue-500" />
                  <p className="text-xs text-gray-600">Tests</p>
                </div>
                <p className="text-lg font-bold" style={{ color: '#000000' }}>{tests.length}</p>
              </div>

              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#f3e8ff' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-3 h-3 text-purple-500" />
                  <p className="text-xs text-gray-600">Flashcards</p>
                </div>
                <p className="text-lg font-bold" style={{ color: '#000000' }}>{flashcardSets.length}</p>
              </div>

              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#fff7ed' }}>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-amber-500" />
                  <p className="text-xs text-gray-600">Notes</p>
                </div>
                <p className="text-lg font-bold" style={{ color: '#000000' }}>{notes.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Link to={createPageUrl("AddMaterial")}>
                <Card className="p-4 md:p-6 rounded-lg md:rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer border-2 h-full" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#f9f9f9' : '#1a1a1a' }}>
                  <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                      <Plus className="w-5 h-5 md:w-7 md:h-7" style={{ color: '#ffffff' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm md:text-lg" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Add Materials</h3>
                      <p className="text-xs md:text-sm text-gray-400 mt-1 hidden md:block">Upload or create new content</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link to={createPageUrl("GenerateTest")}>
                <Card className="p-4 md:p-6 rounded-lg md:rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer border-2 h-full" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#f9f9f9' : '#1a1a1a' }}>
                  <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                      <Sparkles className="w-5 h-5 md:w-7 md:h-7 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm md:text-lg" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Generate Test</h3>
                      <p className="text-xs md:text-sm text-gray-400 mt-1 hidden md:block">AI-powered practice tests</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link to={createPageUrl("Notes")}>
                <Card className="p-4 md:p-6 rounded-lg md:rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer border-2 h-full" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#f9f9f9' : '#1a1a1a' }}>
                  <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f59e0b15' }}>
                      <FileText className="w-5 h-5 md:w-7 md:h-7 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm md:text-lg" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Study Notes</h3>
                      <p className="text-xs md:text-sm text-gray-400 mt-1 hidden md:block">AI-generated summaries</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link to={createPageUrl("Flashcards")}>
                <Card className="p-4 md:p-6 rounded-lg md:rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer border-2 h-full" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#f9f9f9' : '#1a1a1a' }}>
                  <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#8b5cf615' }}>
                      <Brain className="w-5 h-5 md:w-7 md:h-7 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm md:text-lg" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Flashcards</h3>
                      <p className="text-xs md:text-sm text-gray-400 mt-1 hidden md:block">Spaced repetition learning</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </Card>

          {/* Recent Tests - Hidden on mobile */}
          <Card className="hidden md:block rounded-2xl p-6 border shadow-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Recent Tests</h2>
              <Link to={createPageUrl("GenerateTest")}>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300">
                  View All →
                </Button>
              </Link>
            </div>

            {tests.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-400">No tests yet</p>
                <Link to={createPageUrl("GenerateTest")}>
                  <Button className="mt-4 rounded-xl" style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}>
                    Generate Your First Test
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.slice(0, 3).map((test) => (
                  <Link key={test.id} to={createPageUrl(`TestResults?id=${test.id}`)}>
                    <Card className="p-4 rounded-xl hover:shadow-md transition-all cursor-pointer border" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#f9f9f9' : '#1a1a1a' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{test.title}</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {test.questions?.length || 0} questions • {format(new Date(test.completed_date), "MMM d")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${test.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {Math.round(test.score)}%
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Study Hints */}
          <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border shadow-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Study Hints</h2>
              <Lightbulb className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--sage-600)' }} />
            </div>
            
            <div className="relative">
              <div className="mb-3 md:mb-4">
                <div className="text-2xl md:text-3xl mb-2">{studyTips[currentTipIndex].emoji}</div>
                <h3 className="font-semibold text-sm md:text-base mb-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{studyTips[currentTipIndex].title}</h3>
                <p className="text-xs md:text-sm text-gray-400">{studyTips[currentTipIndex].description}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {studyTips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTipIndex(index)}
                      className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all"
                      style={{
                        backgroundColor: index === currentTipIndex ? 'var(--sage-600)' : '#4b5563'
                      }}
                    />
                  ))}
                </div>
                
                <div className="flex gap-1 md:gap-2">
                  <button
                    onClick={handlePreviousTip}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                    style={{ color: lightMode ? '#000000' : '#ffffff', backgroundColor: lightMode ? '#e5e7eb' : 'transparent' }}
                  >
                    <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={handleNextTip}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                    style={{ color: lightMode ? '#000000' : '#ffffff', backgroundColor: lightMode ? '#e5e7eb' : 'transparent' }}
                  >
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Leaderboard Preview - Hidden on mobile, show link instead */}
          <div className="md:hidden">
            <Link to={createPageUrl("Leaderboard")}>
              <Card className="rounded-xl p-4 border shadow-sm hover:shadow-lg transition-all cursor-pointer" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbbf2415' }}>
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Leaderboard</h2>
                      <p className="text-xs text-gray-600">See top students</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </Link>
          </div>

          {/* Leaderboard - Desktop */}
          <Card className="hidden md:block rounded-2xl p-6 border shadow-sm" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Leaderboard</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeaderboardModal(true)}
                className="text-gray-400 hover:text-gray-300"
              >
                View All →
              </Button>
            </div>

            {isLoadingLeaderboard ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
              </div>
            ) : leaderboardUsers.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-400">No leaderboard data yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardUsers.slice(0, 5).map((leaderUser, index) => (
                  <div
                    key={leaderUser.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      backgroundColor: leaderUser.id === user?.id ? (lightMode ? '#e0f2f7' : '#1a1a1a') : 'transparent',
                      border: leaderUser.id === user?.id ? `2px solid ${lightMode ? '#007bff' : 'var(--sage-600)'}` : 'none'
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: index < 3 ? '#fbbf2415' : '#4b556320' }}>
                      {index === 0 ? <Trophy className="w-4 h-4 text-yellow-500" /> :
                       index === 1 ? <Medal className="w-4 h-4 text-gray-400" /> :
                       index === 2 ? <Medal className="w-4 h-4 text-amber-600" /> :
                       <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                        {leaderUser.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        {leaderUser.total_questions_answered || 0} questions
                      </p>
                    </div>
                    {leaderUser.id === user?.id && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">You</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Leaderboard Dialog (Modal) */}
      <Dialog open={showLeaderboardModal} onOpenChange={setShowLeaderboardModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]" style={{ backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
              <Trophy className="w-5 h-5 text-yellow-500" />
              Full Leaderboard
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Students ranked by total questions answered
            </DialogDescription>
          </DialogHeader>

          {/* Filter Buttons for Modal Leaderboard */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLeaderboardFilter("friends")}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: leaderboardFilter === "friends" ? (lightMode ? '#007bff' : '#10b981') : (lightMode ? '#e5e7eb' : '#1a1a1a'),
                color: leaderboardFilter === "friends" ? '#ffffff' : (lightMode ? '#4b5563' : '#ffffff'),
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: leaderboardFilter === "friends" ? (lightMode ? '#007bff' : '#10b981') : (lightMode ? '#d1d5db' : '#064e3b')
              }}
            >
              <Users className="w-3 h-3 inline mr-1" />
              Friends
            </button>
            <button
              onClick={() => setLeaderboardFilter("school")}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: leaderboardFilter === "school" ? (lightMode ? '#007bff' : '#10b981') : (lightMode ? '#e5e7eb' : '#1a1a1a'),
                color: leaderboardFilter === "school" ? '#ffffff' : (lightMode ? '#4b5563' : '#ffffff'),
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: leaderboardFilter === "school" ? (lightMode ? '#007bff' : '#10b981') : (lightMode ? '#d1d5db' : '#064e3b')
              }}
            >
              <GraduationCap className="w-3 h-3 inline mr-1" />
              School
            </button>
            <button
              onClick={() => setLeaderboardFilter("world")}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: leaderboardFilter === "world" ? (lightMode ? '#007bff' : '#10b981') : (lightMode ? '#e5e7eb' : '#1a1a1a'),
                color: leaderboardFilter === "world" ? '#ffffff' : (lightMode ? '#4b5563' : '#ffffff'),
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: leaderboardFilter === "world" ? (lightMode ? '#007bff' : '#10b981') : (lightMode ? '#d1d5db' : '#064e3b')
              }}
            >
              <Trophy className="w-3 h-3 inline mr-1" />
              World
            </button>
          </div>

          {isLoadingLeaderboard ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: lightMode ? '#007bff' : '#059669' }} />
            </div>
          ) : leaderboardUsers.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">No data yet. Be the first to answer questions!</p>
            </div>
          ) : leaderboardFilter !== "world" ? (
            <Card className="border-2 shadow-lg p-6 text-center" style={{ borderColor: lightMode ? '#eab308' : '#eab308', backgroundColor: lightMode ? '#fffbe0' : '#854d0e' }}>
              <Users className="w-12 h-12 mx-auto mb-3" style={{ color: lightMode ? '#d97706' : '#fcd34d' }} />
              <p className="text-sm font-semibold mb-2" style={{ color: lightMode ? '#b45309' : '#fcd34d' }}>Coming Soon!</p>
              <p className="text-xs leading-tight" style={{ color: lightMode ? '#d97706' : '#fef08a' }}>
                {leaderboardFilter === "friends"
                  ? "Connect with friends to compete and study together"
                  : "Link your school account to see classmate rankings"}
              </p>
            </Card>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-3">
                {leaderboardUsers.map((leaderUser, index) => {
                  const isCurrentUser = user && leaderUser.id === user.id;
                  const medals = ['🥇', '🥈', '🥉'];

                  return (
                    <Card
                      key={leaderUser.id}
                      className="p-3 rounded-xl border"
                      style={{
                        borderColor: isCurrentUser ? (lightMode ? '#007bff' : '#059669') : (lightMode ? '#e2e8f0' : '#064e3b'),
                        backgroundColor: isCurrentUser ? (lightMode ? '#e0f2f7' : 'rgba(21, 128, 61, 0.2)') : (lightMode ? '#f8fafc' : '#1a1a1a'),
                        borderWidth: isCurrentUser ? '2px' : '1px'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold w-10 text-center" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                          {index < 3 ? medals[index] : `#${index + 1}`}
                        </div>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: lightMode ? '#007bff' : '#059669' }}>
                          <span className="text-white text-lg font-bold">
                            {leaderUser.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                              {leaderUser.username}
                              {isCurrentUser && <span className="ml-2 text-xs" style={{ color: lightMode ? '#007bff' : '#059669' }}>(You)</span>}
                            </p>
                            {leaderUser.role === 'admin' && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {leaderUser.total_questions_answered} questions answered
                          </p>
                        </div>
                        {index === 0 && (
                          <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: lightMode ? '#fffbe0' : 'rgba(251, 191, 36, 0.2)', color: lightMode ? '#d97706' : '#FBBF24' }}>
                            Top Student
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLeaderboardModal(false)}
              className="rounded-xl"
              style={{ borderColor: lightMode ? '#e2e8f0' : '#064e3b', color: lightMode ? '#4b5563' : '#ffffff', backgroundColor: lightMode ? '#ffffff' : '#0a0a0a' }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}