import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, Loader2, ExternalLink, Video, Lightbulb, BookOpenCheck, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import SymbolPicker from "@/components/SymbolPicker";

export default function TakeTest() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("id");
  
  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpResources, setHelpResources] = useState(null);
  const [isLoadingHelp, setIsLoadingHelp] = useState(false);
  const [showInstantFeedback, setShowInstantFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);

  const answerTextareaRef = useRef(null);

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  // Keep session alive during test - refresh every 5 minutes
  useEffect(() => {
    const keepAlive = setInterval(async () => {
      try {
        await base44.auth.me(); // Ping to keep session alive
      } catch (error) {
        console.error("Session refresh failed:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(keepAlive);
  }, []);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!test || !testId) return;

    const autoSave = setInterval(async () => {
      try {
        const updatedQuestions = test.questions.map((q, index) => ({
          ...q,
          user_answer: answers[index] || ""
        }));

        await base44.entities.TestSession.update(testId, {
          questions: updatedQuestions
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 30 * 1000); // 30 seconds

    return () => clearInterval(autoSave);
  }, [test, answers, testId]);

  const loadTest = async () => {
    const sessions = await base44.entities.TestSession.list();
    const session = sessions.find(s => s.id === testId);
    if (session) {
      const randomizedQuestions = [...session.questions].sort(() => Math.random() - 0.5);
      
      setTest({
        ...session,
        questions: randomizedQuestions
      });
      
      const initialAnswers = {};
      randomizedQuestions.forEach((_, index) => {
        initialAnswers[index] = "";
      });
      setAnswers(initialAnswers);
    }
  };

  const loadHelpResources = async () => {
    setIsLoadingHelp(true);
    setShowHelp(true);
    setShowInstantFeedback(false); // Hide instant feedback when help is requested

    const currentQuestion = test.questions[currentQuestionIndex];
    
    if (currentQuestion.study_resources && currentQuestion.study_resources.length > 0) {
      setHelpResources(currentQuestion.study_resources);
      setIsLoadingHelp(false);
      return;
    }

    try {
      const prompt = `You are an educational resource curator. Find study resources for this question.

Question: ${currentQuestion.question}
Concept: ${currentQuestion.concept_explanation}
Subject: ${test.subject}
Grade Level: ${test.grade_level}

Find 2-4 relevant study resources from Khan Academy and YouTube that would help a student learn this concept.

Requirements:
- ONLY include resources from Khan Academy (khanacademy.org) or YouTube (youtube.com)
- Use direct URLs to real content
- Include the exact title and a brief description
- If you cannot find good resources, return an an empty JSON array.

Return the resources as a JSON array.`;

      const schema = {
        type: "object",
        properties: {
          resources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                type: { 
                  type: "string", 
                  enum: ["khan_academy", "youtube"]
                },
                description: { type: "string" },
                url: { type: "string" }
              },
              required: ["title", "type", "url"]
            }
          }
        },
        required: ["resources"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: schema
      });

      const resources = result.resources || [];
      setHelpResources(resources);

      const updatedQuestions = [...test.questions];
      updatedQuestions[currentQuestionIndex].study_resources = resources;
      
      await base44.entities.TestSession.update(testId, {
        questions: updatedQuestions
      });

      setTest(prev => ({
        ...prev,
        questions: updatedQuestions
      }));

    } catch (error) {
      console.error("Failed to load study resources:", error);
      setHelpResources([]);
    }

    setIsLoadingHelp(false);
  };

  const handleAnswerChange = (value) => {
    setAnswers({ ...answers, [currentQuestionIndex]: value });
    setShowInstantFeedback(false); // Hide instant feedback when answer changes
    setCurrentFeedback(null);
  };

  const insertSymbol = (symbol) => {
    const textarea = answerTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentAnswer = answers[currentQuestionIndex] || "";
    
    const newText = currentAnswer.substring(0, start) + symbol + currentAnswer.substring(end);
    
    handleAnswerChange(newText);

    // Set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const checkAnswer = async () => {
    setIsCheckingAnswer(true); // Start loading for answer check
    const currentQuestion = test.questions[currentQuestionIndex];
    const userAnswer = answers[currentQuestionIndex] || "";
    
    if (!userAnswer.trim()) {
      setCurrentFeedback({
        isCorrect: false,
        score: 0,
        correctAnswer: currentQuestion.correct_answer,
        userAnswer: userAnswer,
        conceptExplanation: currentQuestion.concept_explanation,
        studyResources: currentQuestion.study_resources || []
      });
      setShowInstantFeedback(true);
      setIsCheckingAnswer(false); // End loading
      return;
    }

    let isCorrect = false;
    let score = 0;

    if (currentQuestion.question_type === "multiple_choice") {
      // For multiple choice, compare the actual text content, not just trimmed lowercase
      // This ensures we match exactly what the user selected with the correct answer
      isCorrect = userAnswer.trim() === currentQuestion.correct_answer.trim();
      score = isCorrect ? 100 : 0;
    } else {
      // Use flexible AI grading for short answer and long form questions
      const gradingResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert, understanding teacher grading a student's answer. Be FLEXIBLE and GENEROUS in your grading.

Question: ${currentQuestion.question}
Concept Being Tested: ${currentQuestion.concept_explanation}
Model Answer: ${currentQuestion.correct_answer}
Student's Answer: ${userAnswer}

GRADING CRITERIA - BE FLEXIBLE:
✓ Award points if the student demonstrates understanding of the core concept, EVEN IF:
  - They use different words or phrasing than the model answer
  - Their answer is less detailed but captures the main idea
  - They explain it in their own way
  - They provide a correct example or analogy
  - They answer a slightly different but related aspect of the question

✓ The student does NOT need to:
  - Match the model answer word-for-word
  - Include every single detail
  - Use the same terminology (as long as meaning is clear)

✗ Only mark incorrect if the student:
  - Demonstrates fundamental misunderstanding of the concept
  - Provides factually wrong information
  - Answers a completely different question
  - Shows no understanding of the topic

SCORING SCALE:
- 90-100: Demonstrates clear understanding, main concepts are correct (even if wording differs)
- 70-89: Shows partial understanding, gets the general idea but missing some aspects
- 50-69: Has some correct elements but significant gaps in understanding
- 0-49: Fundamental misunderstanding or completely wrong

Grade fairly and encouragingly. Remember: Understanding matters more than exact wording!

Provide:
1. is_correct: true if score >= 60 (they understand the concept)
2. score: 0-100 based on understanding level`,
        response_json_schema: {
          type: "object",
          properties: {
            is_correct: { type: "boolean" },
            score: { type: "number" }
          },
          required: ["is_correct", "score"]
        }
      });

      isCorrect = gradingResult.score >= 60;
      score = gradingResult.score;
    }

    setCurrentFeedback({
      isCorrect,
      score,
      correctAnswer: currentQuestion.correct_answer,
      userAnswer: userAnswer,
      conceptExplanation: currentQuestion.concept_explanation,
      studyResources: currentQuestion.study_resources || []
    });
    setShowInstantFeedback(true);
    setIsCheckingAnswer(false); // End loading
  };

  // This handleNext now only advances to the next question, it does not trigger instant feedback check
  const handleNext = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowHelp(false);
      setHelpResources(null);
      setShowInstantFeedback(false);
      setCurrentFeedback(null);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowHelp(false);
      setHelpResources(null);
      setShowInstantFeedback(false);
      setCurrentFeedback(null);
    }
  };



  const submitTest = async () => {
    setIsSubmitting(true);

    const gradingPromises = test.questions.map(async (q, index) => {
      const userAnswer = answers[index] || "";
      let isCorrect = false;
      let score = 0;

      if (!userAnswer.trim()) {
        isCorrect = false;
        score = 0;
      } else if (q.question_type === "multiple_choice") {
        isCorrect = userAnswer.trim() === q.correct_answer.trim();
        score = isCorrect ? 100 : 0;
      } else {
        // Use flexible AI grading for short answer and long form questions
        const gradingResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert, understanding teacher grading a student's answer. Be FLEXIBLE and GENEROUS in your grading.

Question: ${q.question}
Concept Being Tested: ${q.concept_explanation}
Model Answer: ${q.correct_answer}
Student's Answer: ${userAnswer}

GRADING CRITERIA - BE FLEXIBLE:
✓ Award points if the student demonstrates understanding of the core concept, EVEN IF:
  - They use different words or phrasing than the model answer
  - Their answer is less detailed but captures the main idea
  - They explain it in their own way
  - They provide a correct example or analogy
  - They answer a slightly different but related aspect of the question

✓ The student does NOT need to:
  - Match the model answer word-for-word
  - Include every single detail
  - Use the same terminology (as long as meaning is clear)

✗ Only mark incorrect if the student:
  - Demonstrates fundamental misunderstanding of the concept
  - Provides factually wrong information
  - Answers a completely different question
  - Shows no understanding of the topic

SCORING SCALE:
- 90-100: Demonstrates clear understanding, main concepts are correct (even if wording differs)
- 70-89: Shows partial understanding, gets the general idea but missing some aspects
- 50-69: Has some correct elements but significant gaps in understanding
- 0-49: Fundamental misunderstanding or completely wrong

Grade fairly and encouragingly. Remember: Understanding matters more than exact wording!

Provide:
1. is_correct: true if score >= 60 (they understand the concept)
2. score: 0-100 based on understanding level`,
          response_json_schema: {
            type: "object",
            properties: {
              is_correct: { type: "boolean" },
              score: { type: "number" }
            },
            required: ["is_correct", "score"]
          }
        });

        isCorrect = gradingResult.score >= 60;
        score = gradingResult.score;
      }

      return {
        ...q,
        user_answer: userAnswer,
        is_correct: isCorrect,
        score: score
      };
    });

    const gradedQuestions = await Promise.all(gradingPromises);

    const correctCount = gradedQuestions.filter(q => q.is_correct).length;
    const finalScore = (correctCount / gradedQuestions.length) * 100;

    await base44.entities.TestSession.update(testId, {
      questions: gradedQuestions,
      score: finalScore,
      completed: true,
      completed_date: new Date().toISOString()
    });

    // Update user stats - track questions answered
    try {
      const currentUser = await base44.auth.me();
      const answeredCount = Object.values(answers).filter(a => a.trim() !== "").length;
      
      await base44.auth.updateMe({
        total_questions_answered: (currentUser.total_questions_answered || 0) + answeredCount,
        total_tests_completed: (currentUser.total_tests_completed || 0) + 1
      });
    } catch (error) {
      console.error("Failed to update user stats:", error);
      // Don't block navigation if stats update fails
    }

    navigate(createPageUrl(`TestResults?id=${testId}`));
  };

  const answeredCount = Object.values(answers).filter(a => a.trim() !== "").length;
  const progress = (answeredCount / (test?.questions.length || 1)) * 100;

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
        <p className="text-gray-400">Loading test...</p>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("GenerateTest"))}
            className="rounded-xl border-sage-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="text-center flex-1 mx-4">
            <h2 className="text-lg font-semibold text-gray-900">{test.title}</h2>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {test.questions.length}
            </p>
          </div>
          <div className="w-10" />
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{answeredCount} answered</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="rounded-2xl p-8 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
                Question {currentQuestionIndex + 1}
                {currentQuestion.question_type && (
                  <span className="ml-2 text-xs opacity-75">
                    • {currentQuestion.question_type === 'short_answer' ? 'Short Answer' : 
                       currentQuestion.question_type === 'long_form' ? 'Long Form' : 
                       'Multiple Choice'}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHelpResources}
                disabled={isLoadingHelp}
                className="rounded-xl border-sage-200"
              >
                {isLoadingHelp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Need Help?
                  </>
                )}
              </Button>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>
        </Card>

        {/* Answer input area - only shown if instant feedback is not currently displayed */}
        {!showInstantFeedback && (
          <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#ffffff' }}>
            <Label className="text-base font-semibold mb-3 block" style={{ color: '#000000' }}>
              Your Answer
            </Label>

            {currentQuestion.question_type === "multiple_choice" && currentQuestion.choices ? (
              <RadioGroup value={answers[currentQuestionIndex]} onValueChange={handleAnswerChange}>
                <div className="space-y-3">
                  {currentQuestion.choices.map((choice, index) => {
                    const label = String.fromCharCode(65 + index); // A, B, C, D...
                    return (
                      <div 
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer hover:border-sage-400 transition-colors"
                        style={{ 
                          borderColor: answers[currentQuestionIndex] === choice ? 'var(--sage-500)' : 'var(--sage-200)',
                          backgroundColor: answers[currentQuestionIndex] === choice ? 'var(--sage-600)' : 'var(--box-gray)',
                          color: answers[currentQuestionIndex] === choice ? '#000000' : '#000000'
                        }}
                        onClick={() => handleAnswerChange(choice)}
                      >
                        <RadioGroupItem value={choice} id={`choice-${index}`} />
                        <Label htmlFor={`choice-${index}`} className="cursor-pointer flex-1 text-base flex items-center gap-3">
                          <span className="font-bold text-lg" style={{ color: 'var(--sage-600)' }}>{label}.</span>
                          <span>{choice}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            ) : (
              <>
                <Textarea
                  ref={answerTextareaRef}
                  value={answers[currentQuestionIndex] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={
                    currentQuestion.question_type === "long_form" ? 
                      "Write your detailed answer here... Use the symbol picker below for math symbols." : 
                      "Type your answer here (1-3 sentences)... Use the symbol picker below for math symbols."
                  }
                  className="rounded-xl border-2 text-base mb-4"
                  style={{ 
                    borderColor: 'var(--sage-600)', 
                    backgroundColor: '#ffffff', 
                    color: '#000000',
                    minHeight: currentQuestion.question_type === "long_form" ? "200px" : "100px"
                  }}
                />
                <div className="mb-4">
                  <SymbolPicker onSelect={insertSymbol} buttonVariant="outline" />
                </div>
              </>
            )}

            {test.instant_feedback && ( // Show "Check Answer" button only if instant feedback is enabled
              <Button
                onClick={checkAnswer}
                disabled={isCheckingAnswer || !answers[currentQuestionIndex]?.trim()}
                className="w-full rounded-xl text-white py-6 text-lg"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                {isCheckingAnswer ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check Answer
                  </>
                )}
              </Button>
            )}
          </Card>
        )}

        {showInstantFeedback && currentFeedback && (
          <Card 
            className="rounded-2xl p-6 mb-6 shadow-lg border-2"
            style={{ 
              borderColor: currentFeedback.isCorrect ? '#10b981' : '#ef4444',
              backgroundColor: currentFeedback.isCorrect ? '#10b98108' : '#ef444408'
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                currentFeedback.isCorrect ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {currentFeedback.isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2" style={{ color: currentFeedback.isCorrect ? '#10b981' : '#ef4444' }}>
                  {currentFeedback.isCorrect ? 'Correct!' : 'Not Quite Right'}
                </h3>
                
                {/* Only show "Your Answer" section when CORRECT */}
                {currentFeedback.isCorrect && currentFeedback.userAnswer && (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 mb-3">
                    <p className="text-xs font-medium text-green-700 mb-1">Your Answer:</p>
                    <p className="text-sm text-green-900 font-semibold">{currentFeedback.userAnswer}</p>
                  </div>
                )}

                {/* Show BOTH user's wrong answer and correct answer when INCORRECT */}
                {!currentFeedback.isCorrect && (
                  <>
                    {currentFeedback.userAnswer && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 mb-3">
                        <p className="text-xs font-medium text-red-700 mb-1">You Selected:</p>
                        <p className="text-sm text-red-900">{currentFeedback.userAnswer}</p>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200 mb-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Correct Answer:</p>
                      <p className="text-sm text-green-900 font-semibold">{currentFeedback.correctAnswer}</p>
                    </div>
                  </>
                )}

                {currentFeedback.conceptExplanation && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 mb-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Concept:</p>
                    <p className="text-sm text-blue-900">{currentFeedback.conceptExplanation}</p>
                  </div>
                )}

                {currentFeedback.studyResources && currentFeedback.studyResources.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Study These Resources to Learn More:
                    </p>
                    <div className="space-y-2">
                      {currentFeedback.studyResources
                        .filter(resource => resource.type === 'khan_academy' || resource.type === 'youtube')
                        .map((resource, idx) => {
                          const icons = {
                            khan_academy: <BookOpenCheck className="w-4 h-4 text-green-700" />,
                            youtube: <Video className="w-4 h-4 text-red-700" />
                          };
                          
                          const colors = {
                            khan_academy: { bg: 'bg-green-100', text: 'text-green-700' },
                            youtube: { bg: 'bg-red-100', text: 'text-red-700' }
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
                                  <p className="text-xs text-gray-600">{resource.description}</p>
                                </div>
                              </div>
                            </a>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}



        {showHelp && helpResources && helpResources.length > 0 && !showInstantFeedback && ( // Show help only if no instant feedback
          <Card className="rounded-2xl p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Study Resources to Help You
            </h4>
            <div className="space-y-3">
              {helpResources
                .filter(resource => resource.type === 'khan_academy' || resource.type === 'youtube')
                .map((resource, idx) => {
                  const icons = {
                    khan_academy: <BookOpenCheck className="w-5 h-5 text-green-700" />,
                    youtube: <Video className="w-5 h-5 text-red-700" />
                  };
                  
                  const colors = {
                    khan_academy: { bg: 'bg-green-100', text: 'text-green-700' },
                    youtube: { bg: 'bg-red-100', text: 'text-red-700' }
                  };

                  return (
                    <a
                      key={idx}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-xl hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colors[resource.type]?.bg || 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                          {icons[resource.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {resource.title}
                            </p>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                          </div>
                          <p className="text-sm text-gray-600">{resource.description}</p>
                        </div>
                      </div>
                    </a>
                  );
                })}
            </div>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {/* Previous button - only show if not on first question */}
          {currentQuestionIndex > 0 && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="rounded-xl py-6 text-lg flex-1"
              style={{ borderColor: 'var(--sage-600)' }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}

          {/* Next or Submit button */}
          {currentQuestionIndex < test.questions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={test.instant_feedback && !showInstantFeedback}
              className="rounded-xl py-6 text-lg text-white shadow-lg flex-1"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              Next Question
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={submitTest}
              disabled={isSubmitting || answeredCount === 0}
              className="rounded-xl py-6 text-lg text-white shadow-lg flex-1"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Grading...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Test
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}