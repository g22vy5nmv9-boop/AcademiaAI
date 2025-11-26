
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trophy, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function TakeFinalTest() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get("planId");

  const [lessonPlan, setLessonPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null); // Added user state

  useEffect(() => {
    if (planId) {
      checkAccessAndLoad(); // Call new access check function
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
      
      loadData(); // Only load data if user is admin
    } catch (error) {
      console.error("Error checking access:", error);
      // If there's an error (e.g., not logged in), redirect to Library
      navigate(createPageUrl("Library"));
    }
  };

  const loadData = async () => {
    const plans = await base44.entities.LessonPlan.list();
    const plan = plans.find(p => p.id === planId);
    
    const allProgress = await base44.entities.LessonProgress.list();
    const userProgress = allProgress.find(p => p.lesson_plan_id === planId);

    setLessonPlan(plan);
    setProgress(userProgress);
  };

  const handleAnswerChange = (value) => {
    setAnswers({ ...answers, [currentQuestionIndex]: value });
  };

  const goToNext = () => {
    if (currentQuestionIndex < lessonPlan.final_test_questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitTest = async () => {
    setIsSubmitting(true);

    // Grade the test
    let correctCount = 0;
    lessonPlan.final_test_questions.forEach((q, index) => {
      const userAnswer = answers[index] || "";
      
      if (q.question_type === "multiple_choice") {
        if (userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
          correctCount++;
        }
      } else {
        // For short answer, give credit if answered
        if (userAnswer.trim()) {
          correctCount++;
        }
      }
    });

    const score = (correctCount / lessonPlan.final_test_questions.length) * 100;

    await base44.entities.LessonProgress.update(progress.id, {
      final_test_completed: true,
      final_test_score: score
    });

    navigate(createPageUrl(`TakeLessonPath?id=${planId}`));
  };

  // Modified loading state to check for user and admin role
  if (!lessonPlan || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const currentQuestion = lessonPlan.final_test_questions[currentQuestionIndex];
  const answeredCount = Object.values(answers).filter(a => a && a.trim() !== "").length;
  const progressPercent = (answeredCount / lessonPlan.final_test_questions.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl(`TakeLessonPath?id=${planId}`))}
            className="rounded-xl border-sage-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Final Test
            </h1>
            <p className="text-gray-600">Question {currentQuestionIndex + 1} of {lessonPlan.final_test_questions.length}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{answeredCount} answered</span>
            <span>{Math.round(progressPercent)}% complete</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Card className="rounded-2xl p-8 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>

          {currentQuestion.question_type === "multiple_choice" && currentQuestion.choices ? (
            <RadioGroup value={answers[currentQuestionIndex] || ""} onValueChange={handleAnswerChange}>
              <div className="space-y-3">
                {currentQuestion.choices.map((choice, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer hover:border-sage-400 transition-colors"
                    style={{ 
                      borderColor: answers[currentQuestionIndex] === choice ? 'var(--sage-500)' : 'var(--sage-200)',
                      backgroundColor: answers[currentQuestionIndex] === choice ? 'var(--sage-600)' : 'var(--box-gray)', // Explicit background
                      color: '#ffffff' // Explicit text color
                    }}
                    onClick={() => handleAnswerChange(choice)}
                  >
                    <RadioGroupItem value={choice} id={`choice-${index}`} />
                    <Label htmlFor={`choice-${index}`} className="cursor-pointer flex-1 text-base">
                      {choice}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <Textarea
              value={answers[currentQuestionIndex] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="rounded-xl border-sage-200 text-base min-h-32"
            />
          )}
        </Card>

        <div className="flex gap-3 mb-6">
          <Button
            onClick={goToPrevious}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="flex-1 rounded-xl border-sage-200 py-6"
          >
            Previous
          </Button>
          
          {currentQuestionIndex < lessonPlan.final_test_questions.length - 1 ? (
            <Button
              onClick={goToNext}
              className="flex-1 rounded-xl py-6 text-white"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              Next Question
            </Button>
          ) : (
            <Button
              onClick={submitTest}
              disabled={isSubmitting || answeredCount === 0}
              className="flex-1 rounded-xl py-6 text-white"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Test
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          {lessonPlan.final_test_questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                index === currentQuestionIndex
                  ? 'text-white shadow-sm'
                  : answers[index]?.trim()
                  ? 'bg-sage-100 text-sage-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
              style={index === currentQuestionIndex ? { backgroundColor: 'var(--sage-600)', color: '#ffffff' } : { backgroundColor: '#1a1a1a', color: '#ffffff' }} // Explicit background & text colors
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
