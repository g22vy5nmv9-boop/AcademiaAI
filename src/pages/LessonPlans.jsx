
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Sparkles, Loader2, CheckCircle, Play, Folder, Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const GRADE_LEVELS = [
  "Grade 9", "Grade 10", "Grade 11", "Grade 12", "College", "Graduate"
];

const MAX_SUBJECTS = 16; // Changed from 12 to 16

export default function LessonPlans() {
  const navigate = useNavigate();
  const [lessonPlans, setLessonPlans] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [exampleQuestions, setExampleQuestions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [generationMode, setGenerationMode] = useState("similar");
  const [generationStep, setGenerationStep] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [user, setUser] = useState(null); // New state for user
  const [lightMode, setLightMode] = useState(true); // Assuming lightMode state, can be integrated with a theme context

  const [newPlanData, setNewPlanData] = useState({
    topic: "",
    subject: "",
    grade_level: "Grade 9"
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Redirect non-admin users
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Library"));
        return;
      }
      
      loadData(); // Load data only if user is admin
    } catch (error) {
      console.log("Error checking access, redirecting to Library");
      // If there's an error (e.g., not logged in), redirect to Library
      navigate(createPageUrl("Library"));
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const plans = await base44.entities.LessonPlan.list("-created_date").catch((err) => {
        console.log("Error loading lesson plans:", err);
        return [];
      });
      const progress = await base44.entities.LessonProgress.list().catch((err) => {
        console.log("Error loading user progress:", err);
        return [];
      });
      const mats = await base44.entities.StudyMaterial.list().catch((err) => {
        console.log("Error loading study materials:", err);
        return [];
      });
      
      const subjects = [...new Set(mats.map(m => m.subject).filter(Boolean))];
      
      setLessonPlans(plans);
      setUserProgress(progress);
      setMaterials(mats);
      setExistingSubjects(subjects.sort());
    } catch (error) {
      console.log("Error loading data, using empty lists:", error);
      setLessonPlans([]);
      setUserProgress([]);
      setMaterials([]);
      setExistingSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressForPlan = (planId) => {
    return userProgress.find(p => p.lesson_plan_id === planId);
  };

  const generateLessonPlan = async () => {
    if (!newPlanData.topic || !newPlanData.subject) return;

    setIsGenerating(true);
    setGenerationStep("Starting generation...");

    let materialsContext = '';
    let questionInstruction = '';
    
    if (exampleQuestions.trim()) {
      materialsContext = `\n\nFOCUS QUESTIONS:\n${exampleQuestions}`;
      
      if (generationMode === "exact") {
        questionInstruction = '\n\nFor quiz questions: Use the EXACT questions from the reference provided above. These are the specific questions students should be tested on.';
      } else if (generationMode === "rephrase") {
        questionInstruction = '\n\nFor quiz questions: REPHRASE the questions from the reference - keep the same concepts and difficulty but reword them differently. The reference questions show what topics to cover.';
      } else { // similar
        questionInstruction = '\n\nFor quiz questions: Generate NEW questions that are SIMILAR in style, difficulty, and topic to the reference questions. Cover the same concepts but make them different questions. The reference questions show the style and topics to focus on.';
      }
    }

    try {
      // PHASE 1: Generate the overall structure and lesson content
      setGenerationStep("Generating lesson content and structure...");
      const structureResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert educator creating a comprehensive lesson plan.

Topic: ${newPlanData.topic}
Subject: ${newPlanData.subject}
Grade Level: ${newPlanData.grade_level}${materialsContext}${questionInstruction}

Your task is to generate the main title, description, and the content for 5-7 progressive lessons.
Each lesson should focus on a sub-topic of the main topic.

For EACH lesson, provide:
1. A clear, engaging title (e.g., "Introduction to the Progressive Era")
2. DETAILED teaching content (2-3 paragraphs of text) that:
   - Introduces the concept clearly.
   - Explains its importance.
   - Provides real-world examples.
   - Breaks down complex ideas.
   - Is engaging and age-appropriate for ${newPlanData.grade_level}.

CRITICAL JSON FORMATTING RULES:
- The entire response MUST be a single, valid JSON object.
- Use only plain double quotes (") for all string values and property names.
- If any text content within a string value contains a double quote, it MUST be escaped like this: \\" (e.g., "The teacher said \\"Hello\\" to the class.").
- Avoid apostrophes in contractions (use "do not" instead of "don't") to minimize escaping issues.
- Keep sentences clear and concise to help maintain valid JSON structure.
- Ensure there are no extraneous characters outside the JSON object.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "The main title of the lesson plan, derived from the topic." },
            description: { type: "string", description: "Brief overview of what students will learn in this lesson plan" },
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string", description: "Teaching content 2-3 paragraphs" }
                },
                required: ["title", "content"]
              }
            }
          },
          required: ["title", "description", "lessons"]
        }
      });

      let finalLessons = structureResult.lessons;

      // PHASE 2: Generate Quiz Questions and Resources for each lesson
      for (let i = 0; i < finalLessons.length; i++) {
        const lesson = finalLessons[i];
        setGenerationStep(`Generating quiz and resources for Lesson ${i + 1}/${finalLessons.length}: ${lesson.title}...`);

        const lessonDetails = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert educator. Based on the following lesson content, generate 3 multiple-choice quiz questions and find 2-3 external study resources.

Lesson Title: ${lesson.title}
Lesson Content: ${lesson.content}
Subject: ${newPlanData.subject}
Grade Level: ${newPlanData.grade_level}${questionInstruction}

QUIZ QUESTIONS:
- Generate 3 multiple-choice quiz questions with 4 options each.
- Ensure the questions directly relate to the lesson content provided.
- Identify the correct answer among the choices.

STUDY RESOURCES:
- Find 2-3 relevant external study resources (websites, videos from Khan Academy or YouTube) that would help a student learn or review the concepts in this lesson.
- Provide direct URLs, titles, types (khan_academy, youtube, website), and brief descriptions for each resource.

CRITICAL JSON FORMATTING RULES:
- The entire response MUST be a single, valid JSON object.
- Use only plain double quotes (") for all string values and property names.
- If any text content within a string value contains a double quote, it MUST be escaped like this: \\" (e.g., "The teacher said \\"Hello\\" to the class.").
- Avoid apostrophes in contractions (use "do not" instead of "don't") to minimize escaping issues.
- Keep sentences clear and concise to help maintain valid JSON structure.
- Ensure there are no extraneous characters outside the JSON object.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              quiz_questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    correct_answer: { type: "string" },
                    choices: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["question", "correct_answer", "choices"]
                },
                minItems: 3,
                maxItems: 3
              },
              study_resources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    type: { type: "string", enum: ["khan_academy", "youtube", "website"] },
                    description: { type: "string" },
                    url: { type: "string" }
                  },
                  required: ["title", "type", "url"]
                },
                minItems: 1,
                maxItems: 3
              }
            },
            required: ["quiz_questions", "study_resources"]
          }
        });

        finalLessons[i].quiz_questions = lessonDetails.quiz_questions;
        finalLessons[i].study_resources = lessonDetails.study_resources;
      }

      // PHASE 3: Generate Final Test Questions
      setGenerationStep("Generating final comprehensive test questions...");
      const finalTestResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert educator creating a final comprehensive test.

Based on the overall topic: ${newPlanData.topic}, Subject: ${newPlanData.subject}, Grade Level: ${newPlanData.grade_level}, and the following lesson titles: ${finalLessons.map(l => l.title).join(", ")}.
Generate 10 comprehensive questions for a final test. Mix short answer and multiple choice questions.

For each question, specify:
- question_type: "short_answer" or "multiple_choice"
- The question text
- The correct answer
- If multiple_choice, provide 4 choices.

CRITICAL JSON FORMATTING RULES:
- The entire response MUST be a single, valid JSON object.
- Use only plain double quotes (") for all string values and property names.
- If any text content within a string value contains a double quote, it MUST be escaped like this: \\" (e.g., "The teacher said \\"Hello\\" to the class.").
- Avoid apostrophes in contractions (use "do not" instead of "don't") to minimize escaping issues.
- Keep sentences clear and concise to help maintain valid JSON structure.
- Ensure there are no extraneous characters outside the JSON object.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            final_test_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  question_type: { 
                    type: "string",
                    enum: ["short_answer", "multiple_choice"]
                  },
                  correct_answer: { type: "string" },
                  choices: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["question", "question_type", "correct_answer"]
              },
              minItems: 10,
              maxItems: 10
            }
          },
          required: ["final_test_questions"]
        }
      });

      // PHASE 4: Consolidate and Save
      setGenerationStep("Saving lesson plan...");
      const newPlan = await base44.entities.LessonPlan.create({
        title: structureResult.title,
        subject: newPlanData.subject,
        grade_level: newPlanData.grade_level,
        description: structureResult.description,
        lessons: finalLessons,
        final_test_questions: finalTestResult.final_test_questions,
        archived: false, // Default to not archived
        is_published: false // Start as draft
      });

      setShowCreateDialog(false);
      setNewPlanData({ topic: "", subject: "", grade_level: "Grade 9" });
      setExampleQuestions("");
      setGenerationMode("similar");
      setShowNewSubject(false);
      loadData();
    } catch (error) {
      console.error("Error generating lesson plan:", error);
      alert(`Failed to generate lesson plan during step: "${generationStep}". Please try again with a specific topic and subject.`);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const toggleArchive = async (planId, currentArchivedState) => {
    try {
      await base44.entities.LessonPlan.update(planId, {
        archived: !currentArchivedState
      });
      loadData();
    } catch (error) {
      console.error("Error toggling archive status:", error);
      alert("Failed to update archive status. Please try again.");
    }
  };

  const togglePublish = async (planId, currentPublishedState) => {
    try {
      await base44.entities.LessonPlan.update(planId, {
        is_published: !currentPublishedState
      });
      loadData();
    } catch (error) {
      console.error("Error toggling publish status:", error);
      alert("Failed to update publish status. Please try again.");
    }
  };

  const handleExampleQuestionsChange = (e) => {
    const text = e.target.value;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount <= 800 || text.length === 0) {
      setExampleQuestions(text);
    }
  };

  const exampleQuestionsWordCount = exampleQuestions.trim().split(/\s+/).filter(word => word.length > 0).length;

  // Filter plans based on archive and draft toggles
  const displayedPlans = lessonPlans.filter(plan => {
    if (showArchived) {
      return plan.archived;
    }
    if (showDrafts) {
      return !plan.is_published && !plan.archived;
    }
    return plan.is_published && !plan.archived;
  });

  // Don't render anything until we've checked user access and confirmed admin role
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Lesson Plans</h1>
            <p className="text-gray-600 mt-1">Learn complex topics step by step</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDrafts(!showDrafts);
                setShowArchived(false); // Disable archive view if showing drafts
              }}
              className="rounded-xl border-sage-200"
            >
              {showDrafts ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Published
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Show Drafts
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowArchived(!showArchived);
                setShowDrafts(false); // Disable drafts view if showing archived
              }}
              className="rounded-xl border-sage-200"
            >
              {showArchived ? (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Show Active
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Show Archived
                </>
              )}
            </Button>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  className="text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  style={{ backgroundColor: 'var(--sage-600)' }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Lesson Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="w-6 h-6" style={{ color: 'var(--sage-600)' }} />
                    Create AI Lesson Plan
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., The Progressive Era, Photosynthesis, World War II"
                      value={newPlanData.topic}
                      onChange={(e) => e.target.value.length <= 100 && setNewPlanData({ ...newPlanData, topic: e.target.value })}
                      className="rounded-xl mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Folder className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                      Subject Folder *
                    </Label>
                    
                    {!showNewSubject && existingSubjects.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {existingSubjects.map(subject => (
                            <button
                              key={subject}
                              type="button"
                              onClick={() => setNewPlanData({ ...newPlanData, subject })}
                              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300`}
                              style={{
                                backgroundColor: newPlanData.subject === subject ? 'var(--sage-600)' : '#1a1a1a',
                                color: '#ffffff',
                                borderColor: 'var(--sage-600)',
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                            >
                              {subject}
                            </button>
                          ))}
                        </div>
                        {existingSubjects.length < MAX_SUBJECTS ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowNewSubject(true);
                              setNewPlanData({ ...newPlanData, subject: "" });
                            }}
                            className="rounded-lg"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Subject
                          </Button>
                        ) : (
                          <p className="text-xs text-red-600">
                            Maximum of {MAX_SUBJECTS} subjects reached. Use an existing subject.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          required
                          value={newPlanData.subject}
                          onChange={(e) => e.target.value.length <= 100 && setNewPlanData({ ...newPlanData, subject: e.target.value, topic: "" })}
                          placeholder="e.g., History, Biology, Literature"
                          className="rounded-xl border-sage-200"
                        />
                        {existingSubjects.length > 0 && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setShowNewSubject(false)}
                            className="p-0 h-auto text-xs"
                          >
                            or choose existing subject
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select 
                      value={newPlanData.grade_level} 
                      onValueChange={(value) => setNewPlanData({ ...newPlanData, grade_level: value })}
                    >
                      <SelectTrigger className="rounded-xl mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Example Questions Input */}
                  <Card className="rounded-xl p-4 border" style={{ borderColor: 'var(--sage-200)' }}>
                    <Label className="text-base font-semibold mb-3 block" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                      Focus Questions (Optional)
                    </Label>
                    <p className="text-sm mb-3" style={{ color: lightMode ? '#4b5563' : '#9ca3af' }}>
                      Add specific questions you want the lesson to focus on. These help guide the AI to generate relevant quiz questions and content that match your curriculum needs.
                    </p>
                    <textarea
                      value={exampleQuestions}
                      onChange={handleExampleQuestionsChange}
                      placeholder="Example:&#10;What were the main causes of the Progressive Era?&#10;Who were key reformers during this time?&#10;What legislation was passed during the Progressive Era?"
                      className="w-full h-32 p-3 rounded-lg border-2 focus:border-sage-500 focus:outline-none resize-none"
                      style={{ 
                        fontFamily: 'inherit',
                        backgroundColor: lightMode ? 'white' : '#1a1a1a',
                        color: lightMode ? '#000000' : '#ffffff',
                        borderColor: 'var(--sage-200)'
                      }}
                    />
                    <p className="text-xs mt-2" style={{ color: lightMode ? '#a1a1aa' : '#a1a1aa' }}>
                      💡 Tip: Add 3-5 questions that reflect what students should be able to answer after completing this lesson. The AI will use these to create focused, relevant quiz questions. ({exampleQuestionsWordCount}/800 words)
                    </p>
                  </Card>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setExampleQuestions("");
                      setShowNewSubject(false);
                      setNewPlanData({ topic: "", subject: "", grade_level: "Grade 9" });
                      setGenerationStep("");
                    }}
                    className="rounded-xl"
                    disabled={isGenerating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={generateLessonPlan}
                    disabled={isGenerating || !newPlanData.topic || !newPlanData.subject}
                    className="rounded-xl text-white"
                    style={{ backgroundColor: 'var(--sage-600)' }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {generationStep}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Lesson Plan
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {displayedPlans.length === 0 ? (
          <Card className="rounded-2xl p-12 text-center border" style={{ borderColor: 'var(--sage-200)' }}>
            {showArchived ? (
              <>
                <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No archived lesson plans</h3>
                <p className="text-gray-600 mb-6">Archived plans will appear here</p>
              </>
            ) : showDrafts ? (
              <>
                <EyeOff className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No draft lesson plans yet</h3>
                <p className="text-gray-600 mb-6">New plans start as drafts until you publish them</p>
              </>
            ) : (
              <>
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No published lesson plans yet</h3>
                <p className="text-gray-600 mb-6">Create and publish your first lesson plan</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  style={{ backgroundColor: 'var(--sage-600)' }}
                  className="text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lesson Plan
                </Button>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPlans.map(plan => {
              const progress = getProgressForPlan(plan.id);
              const completedCount = plan.lessons && progress?.completed_lessons ? progress.completed_lessons.length : 0;
              const totalLessons = plan.lessons?.length || 0;
              const progressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

              return (
                <Card
                  key={plan.id}
                  className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border"
                  style={{ borderColor: 'var(--sage-200)' }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--sage-100)' }}>
                      <BookOpen className="w-6 h-6" style={{ color: 'var(--sage-600)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary" className="rounded-lg text-xs">
                          {plan.subject}
                        </Badge>
                        <Badge variant="outline" className="rounded-lg text-xs">
                          {plan.grade_level}
                        </Badge>
                        {!plan.is_published && !plan.archived && (
                          <Badge className="rounded-lg text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublish(plan.id, plan.is_published)}
                        className="text-gray-400 hover:text-blue-600 rounded-lg h-8 w-8"
                        title={plan.is_published ? "Unpublish (make draft)" : "Publish (make visible)"}
                      >
                        {plan.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleArchive(plan.id, plan.archived)}
                        className="text-gray-400 hover:text-gray-600 rounded-lg h-8 w-8"
                        title={plan.archived ? "Unarchive" : "Archive"}
                      >
                        {plan.archived ? (
                          <ArchiveRestore className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {plan.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{completedCount} / {totalLessons} lessons completed</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <Link to={createPageUrl(`TakeLessonPath?id=${plan.id}`)}>
                    <Button
                      className="w-full rounded-xl text-white"
                      style={{ backgroundColor: 'var(--sage-600)' }}
                    >
                      {completedCount === 0 ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Learning
                        </>
                      ) : completedCount === totalLessons && progress?.final_test_completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        <>
                          Continue Learning
                        </>
                      )}
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
