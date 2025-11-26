import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Medal, ArrowLeft, TrendingUp, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });

  useEffect(() => {
    loadLeaderboardData();
    
    // Listen for light mode changes
    const handleStorageChange = () => {
      setLightMode(localStorage.getItem('lightMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('lightModeChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lightModeChange', handleStorageChange);
    };
  }, []);

  const loadLeaderboardData = async () => {
    setIsLoading(true);
    try {
      const [users, currentUserData] = await Promise.all([
        base44.entities.User.list(),
        base44.auth.me()
      ]);

      const rankedUsers = users
        .map(u => ({
          ...u,
          total_questions_answered: u.total_questions_answered || 0,
          total_tests_completed: u.total_tests_completed || 0
        }))
        .sort((a, b) => b.total_questions_answered - a.total_questions_answered)
        .map((u, index) => ({
          ...u,
          rank: index + 1
        }));

      setLeaderboardData(rankedUsers);
      setCurrentUser(currentUserData);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    }
    setIsLoading(false);
  };

  const filteredLeaderboard = activeFilter === "all" 
    ? leaderboardData 
    : leaderboardData.filter(u => u.role === activeFilter);

  const currentUserRank = leaderboardData.find(u => u.id === currentUser?.id);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--sage-600)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: lightMode ? '#000000' : '#ffffff' }}>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")}>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              style={{ borderColor: 'var(--sage-600)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
              Leaderboard
            </h1>
            <p className="text-gray-400">Top students ranked by questions answered</p>
          </div>
        </div>

        {/* Current User Rank Card */}
        {currentUserRank && (
          <Card className="rounded-2xl p-6 mb-6 border shadow-lg" style={{ borderColor: 'var(--sage-600)', backgroundColor: 'var(--sage-100)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                  <Trophy className="w-8 h-8" style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Your Rank</p>
                  <p className="text-3xl font-bold" style={{ color: lightMode ? '#000000' : '#000000' }}>
                    #{currentUserRank.rank}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Questions Answered</p>
                <p className="text-2xl font-bold" style={{ color: lightMode ? '#000000' : '#000000' }}>
                  {currentUserRank.total_questions_answered}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 rounded-xl p-1" style={{ backgroundColor: '#2a2a2a' }}>
            <TabsTrigger 
              value="all" 
              className="rounded-lg"
              style={{
                backgroundColor: activeFilter === 'all' ? 'var(--sage-600)' : 'transparent',
                color: activeFilter === 'all' ? '#000000' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              All Users
            </TabsTrigger>
            <TabsTrigger 
              value="user" 
              className="rounded-lg"
              style={{
                backgroundColor: activeFilter === 'user' ? 'var(--sage-600)' : 'transparent',
                color: activeFilter === 'user' ? '#000000' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              Students
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="rounded-lg"
              style={{
                backgroundColor: activeFilter === 'admin' ? 'var(--sage-600)' : 'transparent',
                color: activeFilter === 'admin' ? '#000000' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              Teachers
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Leaderboard List */}
        <div className="space-y-3">
          {filteredLeaderboard.slice(0, 50).map((user, index) => (
            <Card 
              key={user.id}
              className="rounded-xl p-4 border shadow-sm hover:shadow-md transition-all"
              style={{ 
                borderColor: user.id === currentUser?.id ? 'var(--sage-600)' : 'var(--sage-200)',
                backgroundColor: user.id === currentUser?.id ? 'var(--sage-100)' : 'transparent'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ 
                    backgroundColor: user.rank <= 3 ? '#fbbf2415' : '#4b556320'
                  }}>
                    {getRankIcon(user.rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                        {user.username}
                      </p>
                      {user.role === 'admin' && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">Teacher</Badge>
                      )}
                      {user.id === currentUser?.id && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {user.total_questions_answered} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {user.total_tests_completed || 0} tests
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredLeaderboard.length === 0 && (
          <Card className="rounded-2xl p-12 text-center border" style={{ borderColor: 'var(--sage-200)' }}>
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
              No users in this category
            </h3>
            <p className="text-gray-400">Try selecting a different filter</p>
          </Card>
        )}
      </div>
    </div>
  );
}