
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, BookOpen, Lightbulb, ExternalLink, Video, BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LearnLesson() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get("planId");
  const lessonIndex = parseInt(urlParams.get("lessonIndex"));

  const [lessonPlan, setLessonPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means showing content
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (planId) {
      checkAccessAndLoad();
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
      
      loadData();
    } catch (error) {
      console.error("Error checking access:", error);
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

  const startQuiz = () => {
    setCurrentQuestionIndex(0);
  };

  const checkAnswer = () => {
    const currentQuestion = lesson.quiz_questions[currentQuestionIndex];
    const correct = selectedAnswer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
    
    setIsCorrect(correct);
    setShowFeedback(true);
    setQuizResults([...quizResults, correct]);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer("");
    
    if (currentQuestionIndex < lesson.quiz_questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    const completedLessons = progress?.completed_lessons || [];
    
    if (!completedLessons.includes(lessonIndex)) {
      await base44.entities.LessonProgress.update(progress.id, {
        completed_lessons: [...completedLessons, lessonIndex],
        current_lesson_index: lessonIndex + 1
      });
    }

    navigate(createPageUrl(`TakeLessonPath?id=${planId}`));
  };

  if (!lessonPlan || lessonIndex === null || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const lesson = lessonPlan.lessons[lessonIndex];

  if (!lesson) {
    navigate(createPageUrl(`TakeLessonPath?id=${planId}`));
    return null;
  }

  const currentQuestion = currentQuestionIndex >= 0 ? lesson.quiz_questions[currentQuestionIndex] : null;

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
          <div>
            <Badge variant="secondary" className="rounded-lg mb-1">
              Lesson {lessonIndex + 1}
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
          </div>
        </div>

        {currentQuestionIndex === -1 ? (
          // Show Lesson Content
          <>
            <Card className="rounded-2xl p-8 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b" style={{ borderColor: 'var(--sage-200)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                  <BookOpen className="w-6 h-6" style={{ color: 'var(--sage-600)' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Learning Article</h2>
                  <p className="text-sm text-gray-600">Read carefully to understand the concepts</p>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className="text-gray-900 leading-relaxed space-y-4">
                  {lesson.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-base leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </Card>

            {lesson.study_resources && lesson.study_resources.length > 0 && (
              <Card className="rounded-2xl p-6 mb-6 shadow-sm border bg-gradient-to-br from-blue-50 to-indigo-50" style={{ borderColor: 'var(--sage-200)' }}>
                <div className="flex items-start gap-3 mb-4">
                  <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-blue-900 text-lg">Additional Study Resources</h3>
                    <p className="text-sm text-blue-800">
                      Explore these resources to deepen your understanding of the lesson.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {lesson.study_resources.map((resource, idx) => {
                    const icons = {
                      khan_academy: <BookOpenCheck className="w-4 h-4 text-green-700" />,
                      youtube: <Video className="w-4 h-4 text-red-700" />,
                      website: <ExternalLink className="w-4 h-4 text-gray-700" />
                    };
                    const colors = {
                      khan_academy: { bg: 'bg-green-100' },
                      youtube: { bg: 'bg-red-100' },
                      website: { bg: 'bg-gray-100' }
                    };

                    return (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-white rounded-xl hover:shadow-md transition-all duration-200 group border"
                        style={{ borderColor: 'var(--sage-200)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${colors[resource.type]?.bg || 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                            {icons[resource.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                                {resource.title}
                              </p>
                              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-1">{resource.description}</p>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="rounded-2xl p-6 mb-6 shadow-sm border bg-gradient-to-br from-blue-50 to-indigo-50" style={{ borderColor: 'var(--sage-200)' }}>
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">Ready to Test Your Knowledge?</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    You'll answer {lesson.quiz_questions.length} questions to check your understanding. 
                    Make sure you've read and understood the lesson content above!
                  </p>
                </div>
              </div>
            </Card>

            <Button
              onClick={startQuiz}
              className="w-full rounded-xl text-white py-6 text-lg shadow-lg"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              Start Quiz ({lesson.quiz_questions.length} questions)
            </Button>
          </>
        ) : (
          // Show Quiz
          <Card className="rounded-2xl p-8 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="mb-4">
              <Badge variant="secondary" className="rounded-lg">
                Question {currentQuestionIndex + 1} of {lesson.quiz_questions.length}
              </Badge>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQuestion.question}
            </h2>

            {!showFeedback ? (
              <>
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  <div className="space-y-3">
                    {currentQuestion.choices.map((choice, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer hover:border-sage-400 transition-colors"
                        style={{ 
                          borderColor: selectedAnswer === choice ? 'var(--sage-500)' : 'var(--sage-200)',
                          backgroundColor: selectedAnswer === choice ? 'var(--sage-600)' : 'var(--box-gray)', // Explicit background
                          color: '#ffffff' // Explicit text color
                        }}
                        onClick={() => setSelectedAnswer(choice)}
                      >
                        <RadioGroupItem value={choice} id={`choice-${index}`} />
                        <Label htmlFor={`choice-${index}`} className="cursor-pointer flex-1 text-base">
                          {choice}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                <Button
                  onClick={checkAnswer}
                  disabled={!selectedAnswer}
                  className="w-full mt-6 rounded-xl text-white"
                  style={{ backgroundColor: 'var(--sage-600)' }}
                >
                  Check Answer
                </Button>
              </>
            ) : (
              <div className={`p-6 rounded-xl ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <h3 className="text-xl font-bold text-green-900">Correct!</h3>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-8 h-8 text-red-600" />
                      <h3 className="text-xl font-bold text-red-900">Not Quite</h3>
                    </>
                  )}
                </div>

                {!isCorrect && (
                  <div className="mb-4">
                    <p className="text-sm text-red-700 mb-2">Your answer: {selectedAnswer}</p>
                    <p className="text-sm text-green-700 font-semibold">
                      Correct answer: {currentQuestion.correct_answer}
                    </p>
                  </div>
                )}

                <Button
                  onClick={nextQuestion}
                  className="w-full mt-4 rounded-xl text-white"
                  style={{ backgroundColor: 'var(--sage-600)' }}
                >
                  {currentQuestionIndex < lesson.quiz_questions.length - 1 ? 'Next Question' : 'Complete Lesson'}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
