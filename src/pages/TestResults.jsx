import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client"; // Import base44
import { Trophy, CheckCircle, XCircle, Home, RotateCcw, MessageSquare, Lightbulb, BookOpenCheck, Video, Search, ExternalLink, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function TestResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get("id");

  const [test, setTest] = useState(null);

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  const loadTest = async () => {
    // Assuming 'base44' is a globally available object or implicitly imported/exposed
    const sessions = await base44.entities.TestSession.list();
    const session = sessions.find((s) => s.id === testId);
    if (session) {
      setTest(session);
    }
  };

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <p className="text-gray-400">Loading results...</p>
      </div>);

  }

  const correctCount = test.questions.filter((q) => q.is_correct).length;
  const totalQuestions = test.questions.length;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-4xl mx-auto">
        <Card className="rounded-2xl p-8 mb-8 text-center shadow-lg border" style={{ borderColor: 'var(--sage-200)' }}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: test.score >= 70 ? '#10b98115' : '#ef444415' }}>
            <Trophy className="w-10 h-10" style={{ color: test.score >= 70 ? '#10b981' : '#ef4444' }} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Complete!</h1>
          <p className="text-gray-600 mb-6">{test.title}</p>
          
          <div className="max-w-md mx-auto mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Your Score</span>
              <span className="font-semibold">{correctCount} / {totalQuestions} correct</span>
            </div>
            <Progress value={test.score} className="h-3 mb-2" />
            <p className="text-4xl font-bold" style={{ color: test.score >= 70 ? '#10b981' : '#ef4444' }}>
              {Math.round(test.score)}%
            </p>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={() => navigate(createPageUrl("GenerateTest"))}
              className="rounded-xl px-6 text-white"
              style={{ backgroundColor: 'var(--sage-600)' }}>

              <RotateCcw className="w-4 h-4 mr-2" />
              Generate New Test
            </Button>
            <Link to={createPageUrl("GenerateTest")}>
              <Button variant="outline" className="rounded-xl px-6 border-sage-200">
                <Home className="w-4 h-4 mr-2" />
                Back to Tests
              </Button>
            </Link>
          </div>
        </Card>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Answers with Feedback</h2>
        
        <div className="space-y-4">
          {test.questions.map((q, index) => {
            let displayCorrectAnswer = q.correct_answer;
            if (q.question_type === 'multiple_choice' && q.options && Array.isArray(q.options)) {
              const correctOption = q.options.find((option) => option.key === q.correct_answer);
              if (correctOption) {
                displayCorrectAnswer = `${correctOption.key}. ${correctOption.text}`;
              }
            }

            return (
              <Card
                key={index}
                className="rounded-2xl p-6 shadow-sm border"
                style={{ borderColor: q.is_correct ? '#10b98130' : '#ef444430', backgroundColor: q.is_correct ? '#10b98108' : '#ef444408' }}>

              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  q.is_correct ? 'bg-green-100' : 'bg-red-100'}`
                  }>
                  {q.is_correct ?
                    <CheckCircle className="w-5 h-5 text-green-600" /> :

                    <XCircle className="w-5 h-5 text-red-600" />
                    }
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-zinc-950 text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold rounded-lg inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80">
                      Question {index + 1}
                    </Badge>
                    <Badge className="bg-green-700 text-green-700 px-2.5 py-0.5 text-xs font-semibold rounded-md inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent shadow hover:bg-primary/80">
                      {q.is_correct ? 'Correct' : 'Incorrect'}
                    </Badge>
                    {q.question_type &&
                      <Badge variant="outline" className="rounded-lg">
                        {q.question_type === 'short_answer' ? 'Short Answer' :
                        q.question_type === 'long_form' ? 'Long Form' :
                        'Multiple Choice'}
                      </Badge>
                      }
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-3 leading-relaxed">
                    {q.question}
                  </h3>

                  {q.concept_explanation &&
                    <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-blue-700 mb-1">Concept:</p>
                      <p className="text-sm text-blue-900">{q.concept_explanation}</p>
                    </div>
                    }
                  
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-white border" style={{ borderColor: 'var(--sage-200)' }}>
                      <p className="text-xs font-medium text-gray-500 mb-1">Your Answer:</p>
                      <p className="text-gray-900">{q.user_answer || "No answer provided"}</p>
                    </div>
                    
                    {!q.is_correct &&
                      <div className="p-3 rounded-xl" style={{ backgroundColor: '#10b98110', borderColor: '#10b98130', borderWidth: '1px' }}>
                        <p className="text-xs font-medium text-green-700 mb-1">Correct Answer:</p>
                        <p className="text-gray-900 font-semibold">{displayCorrectAnswer}</p>
                      </div>
                      }

                    {!q.is_correct && q.study_resources && q.study_resources.length > 0 &&
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          Study These Resources to Improve:
                        </p>
                        <div className="space-y-2">
                          {q.study_resources.
                          filter((resource) => resource.type === 'khan_academy' || resource.type === 'youtube').
                          map((resource, resIdx) => {
                            const icons = {
                              khan_academy: <BookOpenCheck className="w-3 h-3 text-green-700" />,
                              youtube: <Video className="w-3 h-3 text-red-700" />
                            };

                            const colors = {
                              khan_academy: { bg: 'bg-green-100' },
                              youtube: { bg: 'bg-red-100' }
                            };

                            return (
                              <a
                                key={resIdx}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-white rounded-lg hover:shadow-md transition-all duration-200 group border"
                                style={{ borderColor: 'var(--sage-200)' }}>

                                  <div className="flex items-start gap-2">
                                    <div className={`w-6 h-6 rounded-lg ${colors[resource.type]?.bg || 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                                      {icons[resource.type] || <Search className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <p className="font-semibold text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
                                          {resource.title}
                                        </p>
                                        <ExternalLink className="w-2.5 h-2.5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                                      </div>
                                      <p className="text-xs text-gray-600 line-clamp-1">{resource.description}</p>
                                    </div>
                                  </div>
                                </a>);

                          })}
                        </div>
                      </div>
                      }
                  </div>
                </div>
              </div>
            </Card>);
          })}
        </div>
      </div>
    </div>);

}