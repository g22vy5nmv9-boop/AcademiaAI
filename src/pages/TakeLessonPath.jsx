
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Lock, CheckCircle, Trophy } from "lucide-react";

export default function TakeLessonPath() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get("id");

  const [lessonPlan, setLessonPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null); // Added user state

  useEffect(() => {
    if (planId) {
      checkAccessAndLoad(); // Call the new access check function
    }
  }, [planId]);

  const checkAccessAndLoad = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Redirect non-admin users
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Library"));
        return;
      }
      
      loadData(); // Only load data if the user is an admin
    } catch (error) {
      console.error("Error checking access:", error);
      // In case of an error fetching user or if not logged in, redirect
      navigate(createPageUrl("Library"));
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    
    const plans = await base44.entities.LessonPlan.list();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      navigate(createPageUrl("LessonPlans"));
      return;
    }

    const allProgress = await base44.entities.LessonProgress.list();
    let userProgress = allProgress.find(p => p.lesson_plan_id === planId);

    if (!userProgress) {
      userProgress = await base44.entities.LessonProgress.create({
        lesson_plan_id: planId,
        current_lesson_index: 0,
        completed_lessons: [],
        final_test_completed: false
      });
    }

    setLessonPlan(plan);
    setProgress(userProgress);
    setIsLoading(false);
  };

  const startLesson = (lessonIndex) => {
    navigate(createPageUrl(`LearnLesson?planId=${planId}&lessonIndex=${lessonIndex}`));
  };

  const startFinalTest = () => {
    navigate(createPageUrl(`TakeFinalTest?planId=${planId}`));
  };

  // Updated loading condition to include user check
  if (isLoading || !lessonPlan || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const completedLessons = progress?.completed_lessons || [];
  const currentIndex = progress?.current_lesson_index || 0;
  const allLessonsCompleted = completedLessons.length === lessonPlan.lessons.length;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("LessonPlans"))}
            className="rounded-xl border-sage-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lessonPlan.title}</h1>
            <p className="text-gray-600">{lessonPlan.description}</p>
          </div>
        </div>

        {/* Learning Path */}
        <div className="relative">
          {/* Vertical connecting line */}
          <div 
            className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: 'var(--sage-200)' }}
          />

          <div className="space-y-8 relative">
            {lessonPlan.lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(index);
              const isCurrent = index === currentIndex && !isCompleted;
              const isLocked = index > currentIndex && !isCompleted;

              return (
                <div key={index} className="flex items-center justify-center">
                  <button
                    onClick={() => !isLocked && startLesson(index)}
                    disabled={isLocked}
                    className="group relative"
                  >
                    {/* Node Circle */}
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                      isCompleted ? 'bg-gradient-to-br from-yellow-300 to-yellow-500' :
                      isCurrent ? 'bg-gradient-to-br from-green-400 to-green-600 ring-4 ring-green-200 animate-pulse' :
                      'bg-gray-300'
                    } ${!isLocked ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-12 h-12 text-white" />
                      ) : isCurrent ? (
                        <Star className="w-12 h-12 text-white" />
                      ) : (
                        <Lock className="w-8 h-8 text-gray-500" />
                      )}
                    </div>

                    {/* Lesson Info Card */}
                    <Card className={`absolute left-32 top-1/2 -translate-y-1/2 p-4 w-64 shadow-md ${
                      isLocked ? 'opacity-50' : 'group-hover:shadow-xl transition-shadow duration-300'
                    }`} style={{ borderColor: 'var(--sage-200)' }}>
                      <h3 className="font-bold text-gray-900 mb-1">{lesson.title}</h3>
                      <p className="text-xs text-gray-600">
                        {isCompleted ? '✓ Completed' : 
                         isCurrent ? 'Ready to start' : 
                         'Locked'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {lesson.quiz_questions?.length || 0} quiz questions
                      </p>
                    </Card>
                  </button>
                </div>
              );
            })}

            {/* Final Test */}
            <div className="flex items-center justify-center pt-8">
              <button
                onClick={() => allLessonsCompleted && startFinalTest()}
                disabled={!allLessonsCompleted}
                className="group relative"
              >
                {/* Trophy Node */}
                <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                  progress?.final_test_completed ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                  allLessonsCompleted ? 'bg-gradient-to-br from-yellow-400 to-orange-500 ring-4 ring-orange-200 animate-pulse' :
                  'bg-gray-300'
                } ${allLessonsCompleted ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}`}>
                  <Trophy className="w-16 h-16 text-white" />
                </div>

                {/* Final Test Card */}
                <Card className={`absolute left-36 top-1/2 -translate-y-1/2 p-5 w-72 shadow-lg ${
                  !allLessonsCompleted ? 'opacity-50' : 'group-hover:shadow-2xl transition-shadow duration-300'
                }`} style={{ borderColor: 'var(--sage-600)' }}>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">Final Test</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {progress?.final_test_completed 
                      ? `✓ Completed - Score: ${Math.round(progress.final_test_score || 0)}%` 
                      : allLessonsCompleted 
                      ? 'Ready to take the final test!' 
                      : 'Complete all lessons to unlock'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lessonPlan.final_test_questions?.length || 0} comprehensive questions
                  </p>
                </Card>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
