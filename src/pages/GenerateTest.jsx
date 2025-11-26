import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Loader2, BookOpen, AlertCircle, Trophy, Calendar, Eye, BarChart3, Folder, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Send, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const GRADE_LEVELS = [
"Grade 9", "Grade 10", "Grade 11", "Grade 12", "College", "Graduate"];

const MAX_QUESTIONS_PER_TEST = 50;

export default function GenerateTest() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [tests, setTests] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [gradeLevel, setGradeLevel] = useState(8);
  const [numQuestions, setNumQuestions] = useState(10);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [aiMessages, setAiMessages] = useState([
  { role: "assistant", content: "Hi! I'm here to help you create the perfect practice test. What would you like to focus on?" }]
  );
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiScrollRef = React.useRef(null);
  const [settings, setSettings] = useState({
    question_formats: ["short_answer"],
    generation_modes: ["similar"],
    instant_feedback: false
  });
  const [activeTab, setActiveTab] = useState("generate");
  const [generationError, setGenerationError] = useState(null);
  const [lastButtonClicked, setLastButtonClicked] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });
  // NEW STATE: for example questions input
  const [exampleQuestions, setExampleQuestions] = useState("");

  useEffect(() => {
    loadMaterials();
    loadTests();
    
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

  React.useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const maxQuestions = React.useMemo(() => {
    if (selectedQuestions.length === 0) return 10;
    
    // For exact mode, max is the number of selected questions (capped at 50)
    if (settings.generation_modes.includes("exact")) {
      return Math.min(selectedQuestions.length, MAX_QUESTIONS_PER_TEST);
    }
    
    // For similar/rephrase modes, max is selected questions + 10 (capped at 50)
    return Math.min(selectedQuestions.length + 10, MAX_QUESTIONS_PER_TEST);
  }, [selectedQuestions.length, settings.generation_modes]);

  const actualNumQuestions = React.useMemo(() => {
    return Math.min(numQuestions, maxQuestions);
  }, [numQuestions, maxQuestions]);

  React.useEffect(() => {
    if (numQuestions > maxQuestions) {
      setNumQuestions(maxQuestions);
    } else if (maxQuestions === 0 && numQuestions !== 0) {
      setNumQuestions(0);
    } else if (numQuestions === 0 && maxQuestions > 0) {
      // If maxQuestions is > 0 but numQuestions is 0, set to a default (e.g., 10 or maxQuestions if less than 10)
      setNumQuestions(Math.min(10, maxQuestions));
    }
  }, [maxQuestions, numQuestions]);


  const loadMaterials = async () => {
    try {
      const currentUser = await base44.auth.me();
      const data = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email });
      setMaterials(data || []);
    } catch (error) {
      // Silently handle error - user will see empty state
      setMaterials([]);
    }
  };

  const loadTests = async () => {
    try {
      const currentUser = await base44.auth.me();
      const data = await base44.entities.TestSession.filter({ created_by: currentUser.email }, "-created_date");
      const completedTests = (data || []).filter((t) => t.completed);
      setTests(completedTests);
    } catch (error) {
      // Silently handle error
      setTests([]);
    }
  };

  const handleAIMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    const selectedMaterialsContext = materials.filter((m) => selectedQuestions.includes(m.id));
    const materialsContext = selectedMaterialsContext.length > 0 ?
    `Available materials:\n${selectedMaterialsContext.map((m) => `- ${m.subject || 'Uncategorized'}: ${m.question}`).join('\n')}` :
    "No materials selected yet.";

    // actualNumQuestions is already available via useMemo

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI teaching assistant helping students create practice tests.

${materialsContext}

Current settings:
- Grade Level: ${GRADE_LEVELS[gradeLevel]}
- Number of questions to generate: ${actualNumQuestions}
- Question Formats: ${settings.question_formats.join(", ")}
- Selected Study Materials Count: ${selectedQuestions.length}
- Generation Mode: ${settings.generation_modes.join(", ")}
- Instant Feedback: ${settings.instant_feedback ? "Enabled" : "Disabled"}
${exampleQuestions ? `\nFocus Questions:\n${exampleQuestions}\n` : ''}
Student's question: ${userMessage}

Provide helpful advice about:
- Which materials to select for their test
- What question formats work best
- Study strategies
- How to organize their materials

Be encouraging and concise.`,
        add_context_from_internet: false
      });

      setAiMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("AI Helper error:", error);
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Please try again!" }]);
    }

    setIsAiLoading(false);
  };

  const toggleQuestionFormat = (format) => {
    setSettings((prev) => {
      const formats = prev.question_formats || [];
      if (formats.includes(format)) {
        const updated = formats.filter((f) => f !== format);
        return { ...prev, question_formats: updated.length > 0 ? updated : [format] };
      } else {
        return { ...prev, question_formats: [...formats, format] };
      }
    });
  };

  const toggleGenerationMode = (mode) => {
    setSettings((prev) => {
      const modes = prev.generation_modes || [];

      if (mode === "exact") {
        return { ...prev, generation_modes: modes.includes("exact") && modes.length === 1 ? ["similar"] : ["exact"] };
      }

      if (modes.includes("exact")) {
        return { ...prev, generation_modes: [mode] };
      }

      if (modes.includes(mode)) {
        const updated = modes.filter((m) => m !== mode);
        return { ...prev, generation_modes: updated.length > 0 ? updated : mode === "similar" ? ["rephrase"] : ["similar"] };
      } else {
        return { ...prev, generation_modes: [...modes, mode] };
      }
    });
  };

  const toggleSubject = (subject) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  const toggleFolder = (topic) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [topic]: !prev[topic]
    }));
  };

  const toggleQuestionExpand = (questionId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const toggleQuestionSelection = (materialId) => {
    setSelectedQuestions((prev) =>
    prev.includes(materialId) ?
    prev.filter((id) => id !== materialId) :
    [...prev, materialId]
    );
  };

  const selectAllFiltered = () => {
    setSelectedQuestions(materials.map((m) => m.id));
    setLastButtonClicked('selectAll');
  };

  const deselectAll = () => {
    setSelectedQuestions([]);
    setLastButtonClicked('deselectAll');
  };

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

  const generateTest = async () => {
    if (selectedQuestions.length === 0 && settings.generation_modes.includes("exact")) {
      setGenerationError("Please select at least one study material when using 'Exact Questions' mode.");
      return;
    }
    if (actualNumQuestions < 1) {
      setGenerationError("Please set the number of questions to at least 1.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    const selectedMaterials = materials.filter((m) => selectedQuestions.includes(m.id));

    const subjectsText = [...new Set(selectedMaterials.map((m) => m.subject))].join(", ");
    const topicsText = [...new Set(selectedMaterials.map((m) => m.topic).filter(Boolean))].join(", ");

    const selectedFormats = settings.question_formats || ["short_answer"];
    const modes = settings.generation_modes || ["similar"];

    // Generate a unique seed for this test to ensure different questions each time
    const uniqueSeed = Date.now() + Math.random().toString(36).substring(7);
    
    let modeInstruction = "";
    if (modes.includes("exact")) {
      modeInstruction = `Use EXACT questions from references WITHOUT REPETITION. Each reference question should be used AT MOST ONCE. Do not ask the same question twice or rephrase it. PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc.
RANDOMIZATION: Shuffle the order of questions randomly.`;
    } else if (modes.includes("rephrase") && modes.includes("similar")) {
      modeInstruction = `Create a balanced mix of questions:
- REPHRASE mode: For each reference question, ask about a DIFFERENT ASPECT or PART of the same topic. Don't just reword - ask about different details, causes, effects, examples, or perspectives related to the topic.
- SIMILAR mode: Generate NEW questions about the SAME GENERAL TOPIC but covering different concepts, examples, or related ideas within that topic area.
- NO REPETITION: Each question must be unique and test different knowledge.
- UNIQUE SESSION ID: ${uniqueSeed} - Use this to generate DIFFERENT rephrased questions than any previous test. Be creative and vary your approach each time.
Grade level: ${GRADE_LEVELS[gradeLevel]} - adjust vocabulary and complexity accordingly.
PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc.`;
    } else if (modes.includes("rephrase")) {
      modeInstruction = `REPHRASE questions by asking about DIFFERENT ASPECTS of the same topic:
- For each reference, identify different parts: causes, effects, key people, dates, definitions, examples, significance, etc.
- Ask about these DIFFERENT PARTS rather than just rewording the same question
- Example: If reference asks "What caused WWI?", you could ask "Who were the major leaders during WWI?" or "What were the consequences of WWI?"
- NO REPETITION: Each question must ask about a different aspect
- UNIQUE SESSION ID: ${uniqueSeed} - Use this to generate COMPLETELY DIFFERENT rephrased questions than any previous test. Vary your phrasing, focus areas, and question angles each time.
- Grade level: ${GRADE_LEVELS[gradeLevel]} - use age-appropriate language
- For math: use different numbers and problem structures at the same difficulty level
PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc.`;
    } else {
      modeInstruction = `Generate SIMILAR questions by pulling from the SAME TOPIC:
- Identify the general topic/subject area from each reference
- Create NEW questions about that topic that test different knowledge points
- Example: If reference is about "Photosynthesis process", generate questions about chlorophyll, light reactions, Calvin cycle, plant structures, etc.
- NO REPETITION: Each question must be unique and test different concepts
- UNIQUE SESSION ID: ${uniqueSeed} - Use this to generate DIFFERENT questions than any previous test. Be creative with new angles and concepts each time.
- Grade level: ${GRADE_LEVELS[gradeLevel]} - match difficulty and vocabulary
- For math: create similar problems at the same difficulty level
PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc.`;
    }

    let formatInstruction = "";
    if (selectedFormats.length === 1) {
      if (selectedFormats[0] === "multiple_choice") {
        formatInstruction = `All multiple choice with 4 options.
        
CRITICAL MULTIPLE CHOICE RULES:
- ONLY ONE answer can be correct - the other 3 MUST be clearly wrong
- DO NOT create options where multiple could technically be true
- Bad example: "Who supported education reform?" with options "Person A" and "Person B" both being reformers
- Good example: "Who led the progressive movement?" with only ONE person being the primary leader
- Distractors (wrong answers) must be CLEARLY incorrect, not just different true facts
- If you cannot create 3 clearly wrong options, rephrase the question to make it more specific`;
      } else if (selectedFormats[0] === "long_form") {
        formatInstruction = "All long-form essay questions.";
      } else {
        formatInstruction = "All short answer (1-3 sentences).";
      }
    } else {
      const formatsCount = selectedFormats.length;
      const questionsPerFormat = Math.floor(actualNumQuestions / formatsCount);
      const remainder = actualNumQuestions % formatsCount;
      
      const formatDistribution = selectedFormats.map((f, idx) => {
        const count = questionsPerFormat + (idx < remainder ? 1 : 0);
        let formatName = "";
        if (f === "multiple_choice") formatName = "multiple choice (with 4 options)";
        else if (f === "long_form") formatName = "long-form essay questions";
        else formatName = "short answer (1-3 sentences)";
        return `${count} ${formatName}`;
      }).join(", ");
      
      formatInstruction = `CRITICAL: Create EXACTLY ${actualNumQuestions} questions with an EVEN split across formats: ${formatDistribution}. Mix them throughout the test, don't group them together.

${selectedFormats.includes("multiple_choice") ? `
CRITICAL MULTIPLE CHOICE RULES:
- ONLY ONE answer can be correct - the other 3 MUST be clearly wrong
- DO NOT create options where multiple could technically be true
- Bad example: "Who supported education reform?" with options "Person A" and "Person B" both being reformers
- Good example: "Who led the progressive movement?" with only ONE person being the primary leader
- Distractors (wrong answers) must be CLEARLY incorrect, not just different true facts
- If you cannot create 3 clearly wrong options, rephrase the question to make it more specific` : ''}`;
    }

    const referenceList = selectedMaterials
      .map((m, idx) => `${idx + 1}. TOPIC: ${m.subject || 'General'} - ${m.topic || 'Uncategorized'}
   REFERENCE QUESTION: ${m.question}${m.answer ? `\n   REFERENCE ANSWER: ${m.answer.substring(0, 200)}` : ''}`)
      .join("\n\n");

    // Detect if this is primarily a math test
    const isMathTest = selectedMaterials.some(m => {
      const text = `${m.question} ${m.answer || ''}`.toLowerCase();
      return /\b(solve|calculate|equation|formula|graph|derivative|integral|algebra|geometry|trigonometry|calculus|mathematics|math)\b/.test(text) ||
             /[×÷±√²³π∫∑∆θαβγ≈≤≥≠]/.test(text) ||
             /\d+[+\-*/^]\d+/.test(text);
    });

    const mathInstructions = isMathTest ? `

    MATH-SPECIFIC REQUIREMENTS:
    1. VARIED NUMBERS: Use different, non-repeating numbers in each problem
       - Avoid patterns like 1,2,3 or 10,20,30
       - Mix single digits, double digits, decimals, fractions
       - Example: Instead of "5+5, 6+6, 7+7", use "5+8, 13+7, 9+15"

    2. STEP-BY-STEP SOLUTIONS: In concept_explanation, provide:
       - Clear steps to solve the problem
       - Show the work/process
       - Explain WHY each step is done
       - Final answer with units if applicable

    3. VISUAL HINTS: Include descriptions of graphs/diagrams when helpful:
       - For functions: "This is a parabola opening upward with vertex at..."
       - For geometry: "Triangle ABC with sides of length..."
       - For data: "Bar chart showing..."

    4. NUMBER VARIETY:
       - Use prime numbers occasionally: 7, 13, 17, 23
       - Include decimals: 3.5, 12.8, 0.75
       - Mix positive and negative numbers
       - Use realistic real-world numbers
    ` : '';

    const prompt = `Generate ${actualNumQuestions} UNIQUE test questions based on the ${selectedMaterials.length} reference topics below.

    ${selectedMaterials.length} REFERENCE TOPICS AND QUESTIONS:
    ${referenceList}

    GENERATION RULES:
    ${modeInstruction}
    ${mathInstructions}

    FORMAT REQUIREMENTS:
    ${formatInstruction}

    SUBJECT: ${subjectsText}
    GRADE LEVEL: ${GRADE_LEVELS[gradeLevel]}

    ${exampleQuestions ? `FOCUS AREAS:\n${exampleQuestions}\n` : ''}

    CRITICAL REQUIREMENTS:
    1. NO REPETITION - Each question must be unique and test different knowledge
    2. ${modes.includes("exact") ? "Use exact questions from references" : modes.includes("rephrase") ? "Ask about DIFFERENT ASPECTS/PARTS of each topic" : "Generate questions about the SAME TOPIC covering different concepts"}
    3. ONLY generate these formats: ${selectedFormats.map(f => f.replace('_', ' ')).join(', ')}
    4. Include a brief concept explanation for each question${isMathTest ? ' with step-by-step solution process' : ''}
    5. For math problems: PRESERVE ALL SYMBOLS (×÷±√²³π∫∑∆θαβγ≈≤≥≠∞∂∇⊕⊗∈∉⊆⊇∪∩)
    ${isMathTest ? '6. USE VARIED, NON-REPEATING NUMBERS in all math problems' : ''}

    IMPORTANT QUESTION TYPES:
    - Traditional questions: "What is...?", "Explain...", "Why..."
    - Math problems: "Solve for x:", "Calculate:", "Find:"
    - Instructions: "Define...", "List...", "Describe..."

    Return ${actualNumQuestions} UNIQUE questions:`;

    const schema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          maxItems: actualNumQuestions + 10,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              question_type: {
                type: "string",
                enum: selectedFormats
              },
              concept_explanation: { type: "string" },
              correct_answer: { type: "string" },
              choices: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["question", "question_type", "concept_explanation", "correct_answer"]
          }
        }
      },
      required: ["questions"]
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: schema
      });

      if (!result || !result.questions || !Array.isArray(result.questions) || result.questions.length < 1) {
        throw new Error(`The AI couldn't generate questions from your materials. Try selecting different materials or reducing the number of questions.`);
      }

      const questionsToUse = result.questions.slice(0, actualNumQuestions);

      if (questionsToUse.length < actualNumQuestions * 0.5 && actualNumQuestions > 1) {
        console.warn(`Only generated ${questionsToUse.length} out of ${actualNumQuestions} requested questions`);
      }

      // Randomize the order of questions
      const randomizedQuestions = [...questionsToUse].sort(() => Math.random() - 0.5);

      const testSession = await base44.entities.TestSession.create({
        title: `${subjectsText || "Mixed"} - ${GRADE_LEVELS[gradeLevel]} Test`,
        subject: subjectsText || "Mixed",
        grade_level: GRADE_LEVELS[gradeLevel],
        topic: topicsText || "General",
        question_format: selectedFormats.length === 1 ? selectedFormats[0] : "mixed",
        instant_feedback: settings.instant_feedback,
        questions: randomizedQuestions.map((q) => {
          let shuffledChoices = q.choices || [];
          let correctAnswer = q.correct_answer;

          if (q.question_type === "multiple_choice" && shuffledChoices.length > 0) {
            const originalCorrectAnswerValue = correctAnswer;
            shuffledChoices = [...shuffledChoices].sort(() => Math.random() - 0.5);
            const foundCorrectChoice = shuffledChoices.find(
              (choice) => choice.toLowerCase().trim() === originalCorrectAnswerValue.toLowerCase().trim()
            );

            if (foundCorrectChoice) {
              correctAnswer = foundCorrectChoice;
            }
          }

          return {
            question: q.question,
            question_type: q.question_type,
            concept_explanation: q.concept_explanation,
            correct_answer: correctAnswer,
            choices: shuffledChoices,
            study_resources: [],
            user_answer: "",
            is_correct: null
          };
        }),
        completed: false
      });

      setIsGenerating(false);
      navigate(createPageUrl(`TakeTest?id=${testSession.id}`));
    } catch (error) {
      console.error("Test generation error:", error);
      setGenerationError(
        error.message ||
        'Failed to generate test. Try selecting fewer questions, different materials, or a simpler question format.'
      );
      setIsGenerating(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!testToDelete) return;
    
    try {
      await base44.entities.TestSession.delete(testToDelete.id);
      await loadTests();
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    } catch (error) {
      console.log("Error deleting test");
    }
  };

  const handleRedoWrong = async (test) => {
    const wrongQuestions = test.questions.filter((q) => !q.is_correct);

    if (wrongQuestions.length === 0) {
      alert("You got all questions correct! No questions to redo.");
      return;
    }

    const newTest = await base44.entities.TestSession.create({
      title: `${test.title} - Retry Wrong Answers`,
      subject: test.subject,
      grade_level: test.grade_level,
      topic: test.topic,
      question_format: test.question_format,
      instant_feedback: test.instant_feedback,
      questions: wrongQuestions.map((q) => ({
        question: q.question,
        question_type: q.question_type,
        concept_explanation: q.concept_explanation,
        correct_answer: q.correct_answer,
        choices: q.choices || [],
        study_resources: q.study_resources || [],
        user_answer: "",
        is_correct: null
      })),
      completed: false
    });

    navigate(createPageUrl(`TakeTest?id=${newTest.id}`));
  };

  const averageScore = tests.length > 0 ?
  tests.reduce((sum, t) => sum + (t.score || 0), 0) / tests.length :
  0;

  const handleExampleQuestionsChange = (e) => {
    const text = e.target.value;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount <= 800 || text.length === 0) { // Allow clearing the field regardless of word count
      setExampleQuestions(text);
    }
  };

  const exampleQuestionsWordCount = exampleQuestions.trim().split(/\s+/).filter(word => word.length > 0).length;


  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: lightMode ? '#ffffff' : 'transparent' }}>
      <style>{`
        /* Override all page-specific backgrounds to be transparent in dark mode, white in light mode */
        #generate-test-page * {
          background-color: transparent !important;
        }
        
        #generate-test-page [style*="background-color: #ffffff"],
        #generate-test-page [style*="backgroundColor: '#ffffff'"],
        #generate-test-page [style*="background-color:#ffffff"],
        #generate-test-page [style*="backgroundColor: #ffffff"],
        #generate-test-page .bg-white {
          background-color: transparent !important;
        }
        
        /* Keep green accents visible */
        #generate-test-page [style*="background-color: var(--sage-600)"],
        #generate-test-page [style*="backgroundColor: 'var(--sage-600')"],
        #generate-test-page .bg-\\[var\\(--sage-600\\)\\] {
          background-color: var(--sage-600) !important;
        }
        
        /* Force all text to appropriate color based on mode */
        #generate-test-page * {
          color: ${lightMode ? '#000000' : '#ffffff'} !important;
        }

        /* SELECTED BUTTONS: White in dark mode, black in light mode */
        #generate-test-page .generation-mode-btn.selected,
        #generate-test-page .question-format-btn.selected {
          background-color: ${lightMode ? '#000000' : '#ffffff'} !important;
          color: ${lightMode ? '#ffffff' : '#000000'} !important;
          border-color: ${lightMode ? '#000000' : '#ffffff'} !important;
        }

        #generate-test-page .generation-mode-btn.selected *,
        #generate-test-page .question-format-btn.selected * {
          color: ${lightMode ? '#ffffff' : '#000000'} !important;
        }

        /* UNSELECTED BUTTONS: Transparent with border */
        #generate-test-page .generation-mode-btn,
        #generate-test-page .question-format-btn {
          background-color: transparent !important;
          color: ${lightMode ? '#000000' : '#ffffff'} !important;
          border: 2px solid var(--sage-600) !important;
          transition: all 0.3s;
        }

        #generate-test-page .generation-mode-btn *,
        #generate-test-page .question-format-btn * {
          color: ${lightMode ? '#000000' : '#ffffff'} !important;
        }

        #generate-test-page .generation-mode-btn:hover,
        #generate-test-page .question-format-btn:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }

        /* Tab buttons - selected white with black text */
        #generate-test-page .custom-tab[data-state="active"] {
          background-color: #ffffff !important;
          color: #000000 !important;
        }

        #generate-test-page .custom-tab[data-state="inactive"] {
          background-color: transparent !important;
          color: ${lightMode ? '#000000' : '#ffffff'} !important;
        }

        #generate-test-page .custom-tab * {
          color: inherit !important;
        }
      `}</style>
      <div className="max-w-7xl mx-auto" id="generate-test-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#ffffff' }}>Practice Tests</h1>
          <p className="text-gray-200">Select questions from your study materials</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          
          <TabsList className="grid w-full grid-cols-2 mb-8 rounded-xl p-1 h-auto gap-2">
            <TabsTrigger
              value="generate"
              className="custom-tab rounded-lg px-3 py-3 text-sm font-medium inline-flex items-center justify-center whitespace-nowrap transition-all duration-300 border-2"
              style={{
                borderColor: 'var(--sage-600)'
              }}>

              <Sparkles className="w-4 h-4 mr-2" />
              Generate Test
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="custom-tab rounded-lg px-3 py-3 text-sm font-medium inline-flex items-center justify-center whitespace-nowrap transition-all duration-300 border-2"
              style={{
                borderColor: 'var(--sage-600)'
              }}>

              <BarChart3 className="w-4 h-4 mr-2" />
              History ({tests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-0">
            {materials.length === 0 ?
            <Alert className="rounded-xl border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  You need to add study materials first before generating tests.
                  <Button
                  variant="link"
                  className="p-0 h-auto ml-2"
                  style={{ color: 'var(--sage-600)' }}
                  onClick={() => navigate(createPageUrl("AddMaterial"))}>

                    Add materials now →
                  </Button>
                </AlertDescription>
              </Alert> :

            <>
                {!settings.generation_modes.includes("exact") &&
              <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                    <Label className="text-base font-semibold text-gray-900 mb-4 block">
                      Grade Level: {GRADE_LEVELS[gradeLevel]}
                    </Label>
                    <div className="px-2">
                      <Slider
                    value={[gradeLevel]}
                    onValueChange={(value) => setGradeLevel(value[0])}
                    min={0}
                    max={GRADE_LEVELS.length - 1}
                    step={1}
                    className="w-full"
                    style={{ '--slider-thumb-background': 'var(--sage-600)', '--slider-track-background': 'var(--sage-200)' }} />

                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{GRADE_LEVELS[0]}</span>
                        <span>{GRADE_LEVELS[GRADE_LEVELS.length - 1]}</span>
                      </div>
                    </div>
                  </Card>
              }

                <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                  <Label className="text-base font-semibold text-gray-900 mb-4 block">
                    Number of Questions: {numQuestions} (Max: {MAX_QUESTIONS_PER_TEST})
                  </Label>
                  <div className="px-2">
                    <Slider
                    value={[numQuestions]}
                    onValueChange={(value) => setNumQuestions(value[0])}
                    min={0}
                    max={maxQuestions}
                    step={1}
                    disabled={maxQuestions === 0}
                    className="w-full"
                    style={{ '--slider-thumb-background': 'var(--sage-600)', '--slider-track-background': 'var(--sage-200)' }} />

                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{maxQuestions > 0 ? 1 : 0}</span>
                      <span>{maxQuestions}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    {selectedQuestions.length === 0 ?
                  `Select questions below to set the test length. Defaulting to ${maxQuestions} questions.` :
                  settings.generation_modes.includes("exact") ?
                  `Using exact questions mode. You have ${selectedQuestions.length} questions selected, so you can generate up to ${Math.min(selectedQuestions.length, MAX_QUESTIONS_PER_TEST)} questions.` :
                  `You selected ${selectedQuestions.length} materials. AI can generate up to ${maxQuestions} ${settings.generation_modes.includes("similar") && settings.generation_modes.includes("rephrase") ? "similar and rephrased" : settings.generation_modes.includes("similar") ? "similar" : "rephrased"} questions.`
                  }
                  </p>
                </Card>

                  <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                   
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                      <Label className="text-base font-semibold text-gray-900">
                        AI Question Generation
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                    type="button"
                    onClick={() => toggleGenerationMode("similar")}
                    className={`generation-mode-btn p-3 rounded-xl text-left ${settings.generation_modes.includes("similar") ? 'selected' : ''}`}>

                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4" />
                          <p className="font-semibold text-sm">Similar Questions</p>
                        </div>
                        <p className="text-xs opacity-90 leading-tight">
                          AI generates new questions on the same topics and difficulty
                        </p>
                      </button>

                      <button
                    type="button"
                    onClick={() => toggleGenerationMode("rephrase")}
                    className={`generation-mode-btn p-3 rounded-xl text-left ${settings.generation_modes.includes("rephrase") ? 'selected' : ''}`}>

                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4" />
                          <p className="font-semibold text-sm">Rephrase Questions</p>
                        </div>
                        <p className="text-xs opacity-90 leading-tight">
                          AI rewords your questions while keeping the same concepts
                        </p>
                      </button>

                      <button
                    type="button"
                    onClick={() => toggleGenerationMode("exact")}
                    className={`generation-mode-btn p-3 rounded-xl text-left ${settings.generation_modes.includes("exact") ? 'selected' : ''}`}>

                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="w-4 h-4" />
                          <p className="font-semibold text-sm">Exact Questions</p>
                        </div>
                        <p className="text-xs opacity-90 leading-tight">
                          Use your exact questions as they are written
                        </p>
                      </button>
                    </div>
                  </Card>

                  {/* Example Questions Input */}
                  <Card className="rounded-xl p-4 mb-6 border" style={{ borderColor: 'var(--sage-200)' }}>
                    <Label className="text-base font-semibold text-gray-900 mb-3 block">
                      Focus Questions (Optional)
                    </Label>
                    <p className="text-sm text-gray-600 mb-3" style={{ color: lightMode ? '#4b5563' : '#9ca3af' }}>
                      Add specific questions you want the lesson to focus on. These help guide the AI to generate relevant quiz questions and content that match your curriculum needs.
                    </p>
                    <textarea
                      value={exampleQuestions}
                      onChange={handleExampleQuestionsChange}
                      placeholder="Example:&#10;What were the main causes of the Progressive Era?&#10;Who were key reformers during this time?&#10;What legislation was passed during the Progressive Era?"
                      className="w-full h-32 p-3 rounded-lg border-2 focus:border-sage-500 focus:outline-none"
                      style={{ 
                        fontFamily: 'inherit',
                        backgroundColor: lightMode ? 'white' : '#1a1a1a',
                        color: lightMode ? '#000000' : '#ffffff',
                        borderColor: 'var(--sage-200)'
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2" style={{ color: lightMode ? '#a1a1aa' : '#a1a1aa' }}>
                      💡 Tip: Add 3-5 questions that reflect what students should be able to answer after completing this lesson. The AI will use these to create focused, relevant quiz questions. ({exampleQuestionsWordCount}/800 words)
                    </p>
                  </Card>

                <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                      <div>
                        <Label className="text-base font-semibold text-gray-900">
                          Show Answers Immediately
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">
                          See if you're right or wrong after each question, with explanations and help resources
                        </p>
                      </div>
                    </div>
                    <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, instant_feedback: !prev.instant_feedback }))}
                    className={`rounded-full relative inline-flex h-6 w-11 items-center transition-colors ${
                    settings.instant_feedback ? 'bg-[var(--sage-600)]' : 'bg-gray-300'}`
                    }>

                      <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.instant_feedback ? 'translate-x-6' : 'translate-x-1'}`
                      } />

                    </button>
                  </div>
                </Card>

                <div className="mb-6">
                  <Button
                  onClick={() => setShowAIHelper(true)}
                  variant="outline"
                  className="w-full rounded-xl border-2 py:6 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                  style={{ borderColor: 'var(--sage-200)' }}>

                    <MessageSquare className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Ask AI About Your Quiz</span>
                  </Button>
                </div>

                <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold text-gray-900">
                      Select Study Materials ({selectedQuestions.length} selected)
                    </Label>
                    <div className="flex gap-2">
                      <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiltered}
                      className="rounded-lg"
                      style={{
                        backgroundColor: lastButtonClicked === 'selectAll' ? 'var(--sage-600)' : 'transparent',
                        color: lastButtonClicked === 'selectAll' ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'),
                        borderColor: 'var(--sage-600)'
                      }}>

                        Select All
                      </Button>
                      <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                      className="rounded-lg"
                      style={{
                        backgroundColor: lastButtonClicked === 'deselectForAI' ? 'var(--sage-600)' : 'transparent',
                        color: lastButtonClicked === 'deselectForAI' ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'),
                        borderColor: 'var(--sage-600)'
                      }}>

                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(groupedBySubjectAndTopic).map(([subject, topics]) => {
                    const allSubjectMaterialIds = Object.values(topics).flat().map((m) => m.id);
                    const allSubjectSelected = allSubjectMaterialIds.every((id) => selectedQuestions.includes(id));

                    return (
                      <div
                        key={subject}
                        className="border-2 rounded-2xl overflow-hidden"
                        style={{
                          borderColor: 'var(--sage-600)',
                          backgroundColor: expandedSubjects[subject] ? 'var(--sage-600)' : 'transparent'
                        }}>

                          <button
                          onClick={() => toggleSubject(subject)}
                          className="w-full p-4 transition-all active:scale-[1.02] flex items-center justify-between">

                            <div className="flex items-center gap-3">
                              <input
                              type="checkbox"
                              checked={allSubjectSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (allSubjectSelected) {
                                  setSelectedQuestions((prev) => prev.filter((id) => !allSubjectMaterialIds.includes(id)));
                                } else {
                                  setSelectedQuestions((prev) => [...new Set([...prev, ...allSubjectMaterialIds])]);
                                }
                              }}
                              className="w-4 h-4 rounded accent-sage-600 cursor-pointer" />

                              <Folder
                              className="w-6 h-6"
                              style={{ color: expandedSubjects[subject] ? '#ffffff' : 'var(--sage-600)' }} />

                              <div className="text-left">
                                <h3 className="font-bold text-lg" style={{ color: expandedSubjects[subject] ? '#ffffff' : (lightMode ? '#000000' : '#ffffff') }}>{subject}</h3>
                                <p className="text-sm" style={{ color: expandedSubjects[subject] ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'), opacity: 0.8 }}>
                                  {Object.keys(topics).length} topics • {Object.values(topics).flat().length} materials
                                </p>
                              </div>
                            </div>
                            {expandedSubjects[subject] ?
                          <ChevronDown className="w-5 h-5" style={{ color: '#ffffff' }} /> :
                          <ChevronRight className="w-5 h-5" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                          }
                          </button>

                          {expandedSubjects[subject] &&
                        <div className="p-4 space-y-3">
                              {Object.entries(topics).map(([topic, topicMaterials]) => {
                            const allTopicIds = topicMaterials.map((m) => m.id);
                            const allSelected = allTopicIds.every((id) => selectedQuestions.includes(id));

                            return (
                              <div
                                key={topic}
                                className="border-2 rounded-xl overflow-hidden"
                                style={{
                                  borderColor: 'var(--sage-600)',
                                  backgroundColor: expandedFolders[topic] ? 'var(--sage-600)' : 'transparent'
                                }}>

                                    <div className="p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        <input
                                      type="checkbox"
                                      checked={allSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (allSelected) {
                                          setSelectedQuestions((prev) => prev.filter((id) => !allTopicIds.includes(id)));
                                        } else {
                                          setSelectedQuestions((prev) => [...new Set([...prev, ...allTopicIds])]);
                                        }
                                      }}
                                      className="w-4 h-4 rounded accent-sage-600 cursor-pointer" />

                                        <button
                                      onClick={() => toggleFolder(topic)}
                                      className="flex items-center gap-2 flex-1 text-left transition-all active:scale-[1.02]">

                                          <Folder
                                        className="w-5 h-5"
                                        style={{ color: expandedFolders[topic] ? '#ffffff' : 'var(--sage-600)' }} />

                                          <h4 className="font-semibold" style={{ color: expandedFolders[topic] ? '#ffffff' : (lightMode ? '#000000' : '#ffffff') }}>{topic}</h4>
                                          <Badge variant="secondary" className="bg-slate-950 text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold rounded-lg inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80">
                                            {topicMaterials.length}
                                          </Badge>
                                        </button>
                                      </div>
                                      <button onClick={() => toggleFolder(topic)}>
                                        {expandedFolders[topic] ?
                                    <ChevronDown className="w-4 h-4" style={{ color: '#ffffff' }} /> :
                                    <ChevronRight className="w-4 h-4" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                                    }
                                      </button>
                                    </div>

                                    {expandedFolders[topic] &&
                                <div className="border-t p-3 space-y-2" style={{ borderColor: 'var(--sage-200)' }}>
                                        {topicMaterials.map((material) =>
                                  <div
                                    key={material.id}
                                    className="p-3 rounded-lg border-2"
                                    style={{
                                      borderColor: 'var(--sage-600)',
                                      backgroundColor: selectedQuestions.includes(material.id) ? 'var(--sage-600)' : 'transparent'
                                    }}>

                                            <div className="flex items-start gap-2">
                                              <input
                                        type="checkbox"
                                        checked={selectedQuestions.includes(material.id)}
                                        onChange={() => toggleQuestionSelection(material.id)}
                                        className="mt-1 w-4 h-4 rounded accent-sage-600" />

                                              <div className="flex-1">
                                                <button
                                          onClick={() => toggleQuestionExpand(material.id)}
                                          className="text-left w-full transition-all active:scale-[1.02]">

                                                  <p className="text-sm" style={{ color: selectedQuestions.includes(material.id) ? '#ffffff' : (lightMode ? '#000000' : '#ffffff') }}>
                                                    {material.question}
                                                  </p>
                                                </button>

                                                {expandedQuestions[material.id] && material.answer &&
                                        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--sage-200)' }}>
                                                    <p className="text-xs whitespace-pre-wrap" style={{ color: selectedQuestions.includes(material.id) ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'), opacity: 0.8 }}>
                                                      {material.answer}
                                                    </p>
                                                  </div>
                                        }
                                              </div>
                                            </div>
                                          </div>
                                  )}
                                      </div>
                                }
                                  </div>);

                          })}
                            </div>
                        }
                        </div>);

                  })}
                  </div>
                </Card>

                <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                  <Label className="text-base font-semibold text-gray-900 mb-4 block">
                    Question Format (Select One or More)
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                    type="button"
                    onClick={() => toggleQuestionFormat('short_answer')}
                    className={`question-format-btn p-3 rounded-xl text-center ${settings.question_formats.includes('short_answer') ? 'selected' : ''}`}>
                      <p className="font-medium text-sm">Short Answer</p>
                      <p className="text-xs mt-1 opacity-90">1-3 sentences</p>
                    </button>

                    <button
                    type="button"
                    onClick={() => toggleQuestionFormat('long_form')}
                    className={`question-format-btn p-3 rounded-xl text-center ${settings.question_formats.includes('long_form') ? 'selected' : ''}`}>
                      <p className="font-medium text-sm">Long Form</p>
                      <p className="text-xs mt-1 opacity-90">Essay-style</p>
                    </button>

                    <button
                    type="button"
                    onClick={() => toggleQuestionFormat('multiple_choice')}
                    className={`question-format-btn p-3 rounded-xl text-center ${settings.question_formats.includes('multiple_choice') ? 'selected' : ''}`}>
                      <p className="font-medium text-sm">Multiple Choice</p>
                      <p className="text-xs mt-1 opacity-90">4 options</p>
                    </button>
                  </div>
                </Card>

                {generationError &&
              <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 mb-6">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {generationError}
                    </AlertDescription>
                  </Alert>
              }

                <Card className="rounded-2xl p-6 mb-6 shadow-sm border" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-500)' }}>
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {selectedQuestions.length} study materials selected
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedQuestions.length === 0 ?
                      "Select folders and questions above to generate a test" :
                      `AI will ${
                      settings.generation_modes.includes("exact") ?
                      `use your ${actualNumQuestions} exact questions` :
                      settings.generation_modes.includes("similar") && settings.generation_modes.includes("rephrase") ?
                      "generate a mix of rephrased and similar questions" :
                      settings.generation_modes.includes("rephrase") ?
                      "rephrase your questions" :
                      "generate similar questions"} and create ${
                      actualNumQuestions} ${
                      settings.question_formats.length === 1 ?
                      settings.question_formats[0].replace('_', ' ') :
                      'mixed format'} questions with concept explanations.${

                      settings.instant_feedback ? " Instant feedback will be enabled." : ""}`

                      }
                      </p>
                    </div>
                  </div>
                </Card>

                <Button
                onClick={generateTest}
                disabled={isGenerating || actualNumQuestions < 1}
                className="w-full rounded-xl py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 text-white"
                style={{ backgroundColor: 'var(--sage-600)' }}>

                  {isGenerating ?
                <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Test with Concept Explanations...
                    </> :

                <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Test with AI
                    </>
                }
                </Button>
              </>
            }
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {tests.length > 0 &&
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                      <Trophy className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-gray-900">{Math.round(averageScore)}%</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                      <BarChart3 className="w-6 h-6" style={{ color: 'var(--sage-600)' }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tests Taken</p>
                      <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-2xl border shadow-sm" style={{ borderColor: 'var(--sage-200)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tests.length >= 2 && tests[0].score >= tests[1].score ? '#10b98115' : '#ef444415' }}>
                      <Trophy className={`w-6 h-6 ${tests.length >= 2 && tests[0].score >= tests[1].score ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recent Change</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {tests.length >= 2 ?
                      `${tests[0].score >= tests[1].score ? '+' : ''}${Math.round(tests[0].score - tests[1].score)}%` :
                      'N/A'
                      }
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            }

            {tests.length === 0 ?
            <Card className="rounded-2xl p-12 text-center border" style={{ borderColor: 'var(--sage-200)' }}>
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tests yet</h3>
                <p className="text-gray-600 mb-6">Generate your first practice test to get started</p>
                <Button
                onClick={() => setActiveTab("generate")}
                style={{ backgroundColor: 'var(--sage-600)' }}
                className="text-white rounded-xl">

                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Test
                </Button>
              </Card> :

            <div className="space-y-4">
                {tests.map((test) =>
              <Card
                key={test.id}
                className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border"
                style={{ borderColor: 'var(--sage-200)' }}>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                          <Badge className="bg-slate-950 text-red-700 px-2.5 py-0.5 text-xs font-semibold rounded-lg inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80">
                            {Math.round(test.score)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(test.completed_date), "MMM d, yyyy")}
                          </span>
                          <span>{test.questions.length} questions</span>
                          <span className="text-red-600 font-medium">
                            {test.questions.filter((q) => !q.is_correct).length} wrong
                          </span>
                          {test.instant_feedback &&
                      <Badge variant="outline" className="rounded-lg bg-blue-50 text-blue-700 border-blue-200">
                              Instant Feedback
                            </Badge>
                      }
                          {test.question_format &&
                      <Badge variant="outline" className="rounded-lg">
                              {test.question_format.replace('_', ' ')}
                            </Badge>
                      }
                          {test.subject && test.subject !== "Mixed" &&
                      <Badge variant="outline" className="rounded-lg">
                              {test.subject}
                            </Badge>
                      }
                          {test.topic && test.topic !== "General" &&
                      <Badge variant="outline" className="rounded-lg">
                              {test.topic}
                            </Badge>
                      }
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                      onClick={() => handleRedoWrong(test)}
                      variant="outline"
                      className="rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50"
                      disabled={test.questions.filter((q) => !q.is_correct).length === 0}>

                          <RotateCcw className="w-4 h-4 mr-2" />
                          Redo Wrong
                        </Button>
                        <Link to={createPageUrl(`TestResults?id=${test.id}`)}>
                          <Button variant="outline" className="rounded-xl border-sage-200">
                            <Eye className="w-4 h-4 mr-2" />
                            View Results
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTestToDelete(test);
                            setDeleteDialogOpen(true);
                          }}
                          className="rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-900/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
              )}
              </div>
            }
          </TabsContent>
        </Tabs>

        <Dialog open={showAIHelper} onOpenChange={setShowAIHelper}>
          <DialogContent className="rounded-2xl max-w-md h-[600px] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                  <MessageSquare className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                </div>
                Quiz AI Helper
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6" ref={aiScrollRef}>
              <div className="space-y-4">
                {aiMessages.map((message, index) =>
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>

                    <div
                    className={`max-w-[80%] rounded-3xl px-5 py-3 shadow-sm`}
                    style={{
                      backgroundColor: message.role === "user" ? 'var(--sage-600)' : 'transparent',
                      color: '#ffffff',
                      border: 'none'
                    }}>

                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#ffffff' }}>
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}
                {isAiLoading &&
                <div className="flex justify-start">
                    <div
                    className="rounded-3xl px-5 py-3 shadow-sm"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none'
                    }}>
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                }
              </div>
            </ScrollArea>

            <div className="p-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
              <div className="flex gap-2">
                <Input
                  value={aiInput}
                  onChange={(e) => e.target.value.length <= 500 && setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAIMessage();
                    }
                  }}
                  placeholder="Ask about your quiz..."
                  className="rounded-xl border-sage-200"
                  disabled={isAiLoading} />

                <Button
                  onClick={handleAIMessage}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="rounded-xl text-white flex-shrink-0"
                  style={{ backgroundColor: 'var(--sage-600)' }}>

                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{testToDelete?.title}"? This action cannot be undone and you will lose all test results and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTestToDelete(null)} style={{ color: '#000000' }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}