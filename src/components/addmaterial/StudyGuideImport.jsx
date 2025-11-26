import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Sparkles, Save, Folder, Plus, FolderOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GRADE_LEVELS = [
  "Grade 9", "Grade 10", "Grade 11", "Grade 12", "College", "Graduate"
];

const MAX_SUBJECTS = 16; // This constant is not explicitly used in the new outline's logic for blocking creation, but I'll keep it for context if it's meant for future validation.

export default function StudyGuideImport() {
  const navigate = useNavigate();

  const [guideText, setGuideText] = useState("");
  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[0]);
  const [tags, setTags] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });

  // State for all materials to derive subjects/topics
  const [materials, setMaterials] = useState([]);

  // State for Subject
  const [subject, setSubject] = useState(""); // Stores selected existing subject OR "" if new
  const [isNewSubject, setIsNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // State for Topic
  const [topic, setTopic] = useState(""); // Stores selected existing topic OR "" if new
  const [isNewTopic, setIsNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  useEffect(() => {
    loadMaterials();
    
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

  const loadMaterials = async () => {
    try {
      const currentUser = await base44.auth.me();
      const data = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email });
      setMaterials(data || []);
    } catch (error) {
      console.error("Failed to load existing materials:", error);
      setMaterials([]);
    }
  };

  const existingSubjects = useMemo(() => {
    return [...new Set(materials.map(m => m.subject).filter(Boolean))].sort();
  }, [materials]);

  const existingTopics = useMemo(() => {
    if (!subject || isNewSubject) return []; // If no subject selected or creating new subject, no existing topics for current selection
    return [...new Set(
      materials
        .filter(m => m.subject === subject)
        .map(m => m.topic)
        .filter(Boolean)
    )].sort();
  }, [materials, subject, isNewSubject]);

  const handleSubjectChange = (value) => {
    if (value === "__new__") {
      setIsNewSubject(true);
      setSubject(""); // Clear selected subject
      setNewSubjectName(""); // Clear new subject name input
      setTopic(""); // Clear selected topic
      setIsNewTopic(false); // Reset new topic flag
      setNewTopicName(""); // Clear new topic name input
    } else {
      setIsNewSubject(false);
      setSubject(value); // Set selected existing subject
      setNewSubjectName("");
      setTopic(""); // Clear selected topic for new subject context
      setIsNewTopic(false); // Reset new topic flag
      setNewTopicName(""); // Clear new topic name input
    }
  };

  const handleTopicChange = (value) => {
    if (value === "__new__") {
      setIsNewTopic(true);
      setTopic(""); // Clear selected topic
      setNewTopicName(""); // Clear new topic name input
    } else {
      setIsNewTopic(false);
      setTopic(value); // Set selected existing topic
      setNewTopicName("");
    }
  };

  const handleGuideTextChange = (e) => {
    const text = e.target.value;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount <= 800 || text.length === 0) { // Allow clearing text even if over limit
      setGuideText(text);
    }
  };

  const guideTextWordCount = guideText.trim().split(/\s+/).filter(word => word.length > 0).length;

  const processGuide = async () => {
    const finalSubject = isNewSubject ? newSubjectName.trim() : subject;
    const finalTopic = isNewTopic ? newTopicName.trim() : topic;

    if (!finalSubject) {
      alert("Aw nuts! 😅 Please select or create a subject folder!");
      return;
    }

    if (!finalTopic) {
      alert("Aw nuts! 😅 Please select or create a topic/quiz folder!");
      return;
    }

    // If no questions provided, just create the folder structure
    if (!guideText.trim()) {
      setIsProcessing(true);
      try {
        // Create a placeholder material to establish the folder
        await base44.entities.StudyMaterial.create({
          question: "Folder created",
          answer: "",
          subject: finalSubject,
          topic: finalTopic,
          grade_level: gradeLevel,
          tags: tags.length > 0 ? tags : undefined,
          difficulty: "medium"
        });
        navigate(createPageUrl("Library"));
      } catch (error) {
        alert(`Failed to create folder. ${error.message || "Please try again."}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);

    try {
      const prompt = `You are an expert educator. I will provide you with a list of questions, and you need to generate accurate, concise answers for each question.

Questions:
${guideText}

For each question provided:
1. Use the EXACT question text as given (do not modify or rephrase)
2. Generate a clear, accurate answer
3. PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc.

CRITICAL - KEEP ANSWERS MINIMAL AND ACCURATE:
- For math problems: Just the final answer (e.g., "x = 5" NOT "x = 5. Solution: 2x = 10...")
- For definitions: Brief, clear definition (1-2 sentences max)
- For factual questions: Direct answer without unnecessary elaboration
- For "What is" questions: Concise explanation of the concept
- For calculations: Just the numerical result with units if applicable

Examples:
Question: "What is photosynthesis?"
Answer: "The process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar."

Question: "Solve: 2x + 5 = 15"
Answer: "x = 5"

Question: "Define mitochondria"
Answer: "The powerhouse of the cell that produces energy (ATP) through cellular respiration."

Return your answer as a JSON array of objects. Each object should have:
- question: The EXACT question text from the input - PRESERVE ALL MATH SYMBOLS
- answer: MINIMAL but complete answer - PRESERVE ALL MATH SYMBOLS`;

      const schema = {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              },
              required: ["question", "answer"]
            }
          }
        },
        required: ["questions"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false, // Per original code, but outline removed this line. Keeping for safety as base44 LLM might default to true.
        response_json_schema: schema
      });

      if (result.questions && result.questions.length > 0) {
        setExtractedQuestions(result.questions);
      } else {
        alert("Aw nuts! 😅 No study material could be extracted from the text. Make sure your study guide contains clear educational content with definitions, concepts, or facts.");
      }
    } catch (error) {
      alert(`Aw nuts! 😅 We couldn't process your study guide. This might be because the content isn't clear enough. Try rephrasing your study guide with clearer definitions and concepts, or use manual entry instead. Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedQuestions || extractedQuestions.length === 0) {
      alert("Aw nuts! 😅 There's no data to save! Please extract study material first.");
      return;
    }

    setIsProcessing(true);

    const finalSubject = isNewSubject ? newSubjectName.trim() : subject;
    const finalTopic = isNewTopic ? newTopicName.trim() : topic;

    if (!finalSubject || !finalTopic) {
        alert("Aw nuts! 😅 Subject or Topic information is missing. Cannot save materials.");
        setIsProcessing(false);
        return;
    }

    try {
      const tagsArray = tags; // Tags are already an array from state

      for (const q of extractedQuestions) {
        await base44.entities.StudyMaterial.create({
          question: q.question,
          answer: q.answer || "",
          subject: finalSubject,
          topic: finalTopic,
          grade_level: gradeLevel,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          difficulty: "medium" // Default difficulty as in original code
        });
      }

      navigate(createPageUrl("Library"));
    } catch (error) {
      alert(`Aw nuts! 😅 Failed to save materials. ${error.message || "Please check your internet connection and try again."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (index, field, value) => {
    const updated = [...extractedQuestions];
    updated[index][field] = value;
    setExtractedQuestions(updated);
  };

  const removeQuestion = (index) => {
    setExtractedQuestions(extractedQuestions.filter((_, i) => i !== index));
  };

  const startOver = () => {
    setGuideText("");
    setExtractedQuestions([]);
    setGradeLevel(GRADE_LEVELS[0]);
    setTags([]);
    // Optionally reset subject/topic as well if a full reset is desired,
    // but the outline only specified these 4 states for startOver.
    // For now, keep selected subject/topic as user might want to reuse them.
  };

  const isProcessButtonDisabled = isProcessing || 
    (isNewSubject && !newSubjectName.trim()) || (!isNewSubject && !subject.trim()) ||
    (isNewTopic && !newTopicName.trim()) || (!isNewTopic && !topic.trim());

  return (
    <div className="space-y-6">
      {extractedQuestions.length === 0 ? (
        <Card className="p-6" style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', borderColor: 'var(--sage-600)' }}>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Paste Your Questions (Optional)</Label>
              <Textarea
                value={guideText}
                onChange={handleGuideTextChange}
                placeholder="Paste your questions here (one per line)...&#10;&#10;Example:&#10;What is photosynthesis?&#10;Define mitochondria&#10;Solve: 2x + 5 = 15"
                className="h-64 rounded-xl"
                style={{ backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff', borderColor: 'var(--sage-600)' }}
              />
              <p className="text-xs mt-2" style={{ color: lightMode ? '#4b5563' : '#a3a3a3' }}>
                Paste your questions (one per line) and AI will generate answers for them ({guideTextWordCount}/800 words)
              </p>
            </div>

            <div className="space-y-4">
              {/* Subject Folder */}
              <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a' }}>
                <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                  <Folder className="w-5 h-5" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                  <span style={{ color: lightMode ? '#000000' : '#ffffff' }}>Subject Folder *</span>
                </Label>

                {!isNewSubject ? (
                  <div className="space-y-3">
                    <Select
                      value={subject}
                      onValueChange={handleSubjectChange}
                    >
                      <SelectTrigger className="rounded-xl border-2 h-12" style={{ borderColor: 'var(--sage-600)', backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff' }}>
                        <SelectValue placeholder="Select a subject" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                        {existingSubjects.map((subj) => (
                          <SelectItem key={subj} value={subj} style={{ color: lightMode ? '#000000' : '#ffffff', backgroundColor: 'transparent' }}>{subj}</SelectItem>
                        ))}
                        <SelectItem value="__new__" style={{ color: 'var(--sage-600)', fontWeight: 'bold', backgroundColor: 'transparent' }}>
                          + Create New Subject
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      required
                      value={newSubjectName}
                      onChange={(e) => e.target.value.length <= 100 && setNewSubjectName(e.target.value)}
                      placeholder="e.g., AP Biology, Algebra 2, World History"
                      className="rounded-xl border-2 h-12 text-base"
                      style={{ borderColor: 'var(--sage-600)', backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff' }}
                    />
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => handleSubjectChange(null)} // Simulate "back" by setting to null
                      className="text-sm"
                      style={{ color: 'var(--sage-600)', backgroundColor: 'transparent' }}
                    >
                      <span style={{ color: 'var(--sage-600)' }}>← Back to subject list</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Topic Folder - Always show when subject selected OR when creating new subject */}
              {(subject || (isNewSubject && newSubjectName.trim())) && (
                <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a' }}>
                  <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                    <FolderOpen className="w-5 h-5" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                    <span style={{ color: lightMode ? '#000000' : '#ffffff' }}>Topic/Quiz Folder *</span>
                  </Label>

                  {!isNewTopic && existingTopics.length > 0 ? (
                    <div className="space-y-3">
                      <Select
                        value={topic}
                        onValueChange={handleTopicChange}
                      >
                        <SelectTrigger className="rounded-xl border-2 h-12" style={{ borderColor: 'var(--sage-600)', backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff' }}>
                          <SelectValue placeholder="Select a topic" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                          {existingTopics.map((t) => (
                            <SelectItem key={t} value={t} style={{ color: lightMode ? '#000000' : '#ffffff', backgroundColor: 'transparent' }}>{t}</SelectItem>
                          ))}
                          <SelectItem value="__new__" style={{ color: 'var(--sage-600)', fontWeight: 'bold', backgroundColor: 'transparent' }}>
                            + Create New Topic
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        value={newTopicName}
                        onChange={(e) => e.target.value.length <= 100 && setNewTopicName(e.target.value)}
                        placeholder="e.g., Cell Biology, Quadratic Equations, WWI"
                        className="rounded-xl border-2 h-12 text-base"
                        style={{ borderColor: 'var(--sage-600)', backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff' }}
                      />
                      {existingTopics.length > 0 && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => handleTopicChange(null)} // Simulate "back"
                          className="text-sm"
                          style={{ color: 'var(--sage-600)', backgroundColor: 'transparent' }}
                        >
                          <span style={{ color: 'var(--sage-600)' }}>← Back to topic list</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                  Grade Level
                </Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="mt-2 border-2" style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff', borderColor: 'var(--sage-600)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', borderColor: 'var(--sage-600)' }}>
                    {GRADE_LEVELS.map((grade) => (
                      <SelectItem key={grade} value={grade} style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Period is removed per outline */}
              <div className="md:col-span-2">
                <Label htmlFor="tags" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                  Tags (comma-separated)
                </Label>
                <Input
                  id="tags"
                  value={tags.join(", ")}
                  onChange={(e) => setTags(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                  placeholder="e.g., exam prep, review"
                  className="mt-2 border-2"
                  style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff', borderColor: 'var(--sage-600)' }}
                />
              </div>
            </div>

            <Button
              onClick={processGuide}
              disabled={isProcessButtonDisabled}
              className="w-full"
              style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Study Material
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6" style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', borderColor: 'var(--sage-600)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                <h3 className="text-lg font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                  Extracted Study Material ({extractedQuestions.length})
                </h3>
              </div>
              <Button
                onClick={handleSave}
                disabled={isProcessing}
                style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              {extractedQuestions.map((item, index) => (
                <Card key={index} className="p-4" style={{ backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a', borderColor: 'var(--sage-600)' }}>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Question</Label>
                      <Textarea
                        value={item.question}
                        onChange={(e) => handleEdit(index, "question", e.target.value)}
                        className="mt-1 border-2"
                        style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff', borderColor: 'var(--sage-600)' }}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-sm" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Answer</Label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) => handleEdit(index, "answer", e.target.value)}
                        className="mt-1 border-2"
                        style={{ backgroundColor: lightMode ? '#ffffff' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff', borderColor: 'var(--sage-600)' }}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/10"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={startOver}
              className="flex-1"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
            >
              Start Over
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1"
              style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Materials
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}