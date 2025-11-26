import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Presentation, Sparkles, Save, Upload, CheckCircle, Folder, Plus, FolderOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const GRADE_LEVELS = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "College Freshman", "College Sophomore", "College Junior", "College Senior", "Graduate"
];

const MAX_SUBJECTS = 16;

export default function SlideshowImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [gradeLevel, setGradeLevel] = useState("Grade 9");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  const [allStudyMaterials, setAllStudyMaterials] = useState([]);
  const [selectedSubjectValue, setSelectedSubjectValue] = useState("");
  const [selectedTopicValue, setSelectedTopicValue] = useState("");
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);

  const existingSubjects = useMemo(() => {
    const subjects = [...new Set(allStudyMaterials.map(m => m.subject).filter(Boolean))];
    return subjects.sort();
  }, [allStudyMaterials]);

  const existingTopicsForSelectedSubject = useMemo(() => {
    if (!selectedSubjectValue) return [];
    const topics = allStudyMaterials
      .filter(m => m.subject === selectedSubjectValue)
      .map(m => m.topic)
      .filter(Boolean);
    return [...new Set(topics)].sort();
  }, [allStudyMaterials, selectedSubjectValue]);

  useEffect(() => {
    loadAllStudyMaterials();
  }, []);

  useEffect(() => {
    if (selectedSubjectValue && !showNewSubject) {
      const topics = allStudyMaterials
        .filter(m => m.subject === selectedSubjectValue && m.topic)
        .map(m => m.topic);
      const uniqueTopics = [...new Set(topics)];
      setShowNewTopic(uniqueTopics.length === 0);
    }
  }, [selectedSubjectValue, allStudyMaterials, showNewSubject]);

  const loadAllStudyMaterials = async () => {
    try {
      const currentUser = await base44.auth.me();
      const data = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email });
      setAllStudyMaterials(data);
    } catch (error) {
      console.error("Error loading study materials:", error);
    }
  };

  const handleSubjectChange = (value) => {
    if (value === "new_subject") {
      if (existingSubjects.length >= MAX_SUBJECTS) {
        alert(`You can only create up to ${MAX_SUBJECTS} subjects. Please use an existing subject or delete one to create a new one.`);
        return;
      }
      setShowNewSubject(true);
      setSelectedSubjectValue("");
      setSelectedTopicValue("");
      setShowNewTopic(true);
    } else {
      setShowNewSubject(false);
      setSelectedSubjectValue(value);
      setSelectedTopicValue("");
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        alert('Please upload a PDF file. If you have a PowerPoint, export it as PDF first.');
        e.target.value = '';
      }
    }
  };

  const processSlideshow = async () => {
    if (!file || !selectedSubjectValue || !selectedTopicValue) {
      alert("Please select a file, subject, and topic before processing.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert educator extracting study materials from a presentation slideshow.

Analyze the attached slideshow and extract all important information as study questions and answers.

For each slide or concept:
1. Create a clear question that tests understanding of the concept
2. Provide a MINIMAL answer - just what it equals or the key term
3. Ensure answers are appropriate for ${gradeLevel}

CRITICAL - KEEP ANSWERS MINIMAL:
- For math: Just "x = 5" NOT "x = 5. Solution: 2x = 10..."
- For definitions: Just the key term or brief phrase
- For questions: Direct answer without extra explanation
- PRESERVE ALL MATH SYMBOLS EXACTLY

Examples:
- Q: "What is the powerhouse of the cell?" A: "Mitochondria"
- Q: "Solve: 2x + 4 = 14" A: "x = 5"
- Q: "When did WWI end?" A: "1918"

IMPORTANT: Extract a maximum of 30 well-formatted questions with MINIMAL answers that cover all major topics in the presentation.`,
        add_context_from_internet: false,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              maxItems: 30,
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
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      setExtractedQuestions(result.questions || []);
    } catch (error) {
      console.error("Error processing slideshow:", error);
      clearInterval(progressInterval);
      
      if (error.message && error.message.includes("logged in")) {
        alert("Your session may have expired. Please refresh the page and try again.");
      } else {
        alert("Failed to process slideshow. Please try again or use a different import method.");
      }
      
      setProgress(0);
      setExtractedQuestions([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveAll = async () => {
    if (extractedQuestions.length === 0) return;

    setIsProcessing(true);

    const materialsToCreate = extractedQuestions.map(q => ({
      question: q.question,
      answer: q.answer,
      subject: selectedSubjectValue,
      topic: selectedTopicValue,
      grade_level: gradeLevel,
      difficulty: "medium"
    }));

    try {
      await base44.entities.StudyMaterial.bulkCreate(materialsToCreate);
      navigate(createPageUrl("Library"));
    } catch (error) {
      console.error("Error saving study materials:", error);
      alert('Failed to save study materials. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {extractedQuestions.length === 0 ? (
        <Card className="rounded-2xl p-6 md:p-8 shadow-sm border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
          <div className="space-y-6">
            <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
              <Label className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Presentation className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                Slideshow Details
              </Label>
              
              <div className="space-y-4">
                <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
                  <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#ffffff' }}>
                    <Folder className="w-5 h-5" style={{ color: '#ffffff' }} />
                    <span style={{ color: '#ffffff' }}>Subject Folder *</span>
                  </Label>
                  
                  {!showNewSubject ? (
                    <div className="space-y-3">
                      <Select 
                        value={selectedSubjectValue} 
                        onValueChange={handleSubjectChange}
                      >
                        <SelectTrigger className="rounded-xl border-2 h-12" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}>
                          <SelectValue placeholder="Select a subject" style={{ color: '#ffffff' }} />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                          {existingSubjects.map((subject) => (
                            <SelectItem key={subject} value={subject} style={{ color: '#ffffff', backgroundColor: 'transparent' }}>{subject}</SelectItem>
                          ))}
                          <SelectItem value="new_subject" style={{ color: 'var(--sage-600)', fontWeight: 'bold', backgroundColor: 'transparent' }}>
                            + Create New Subject
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        required
                        value={selectedSubjectValue}
                        onChange={(e) => e.target.value.length <= 100 && setSelectedSubjectValue(e.target.value)}
                        placeholder="e.g., AP Biology, Algebra 2, World History"
                        className="rounded-xl border-2 h-12 text-base"
                        style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setShowNewSubject(false);
                          setSelectedSubjectValue("");
                          setSelectedTopicValue("");
                        }}
                        className="text-sm"
                        style={{ color: 'var(--sage-600)', backgroundColor: 'transparent' }}
                      >
                        <span style={{ color: 'var(--sage-600)' }}>Back to subject list</span>
                      </Button>
                    </div>
                  )}
                </div>

                {selectedSubjectValue && (
                  <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
                    <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#ffffff' }}>
                      <FolderOpen className="w-5 h-5" style={{ color: '#ffffff' }} />
                      <span style={{ color: '#ffffff' }}>Topic/Quiz Folder *</span>
                    </Label>
                    
                    {!showNewTopic && existingTopicsForSelectedSubject.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-3">
                          {existingTopicsForSelectedSubject.map((topic) => (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => setSelectedTopicValue(topic)}
                              className="px-5 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                              style={{
                                backgroundColor: selectedTopicValue === topic ? 'var(--sage-600)' : '#000000',
                                color: '#ffffff',
                                borderColor: 'var(--sage-600)',
                                borderWidth: '2px',
                                borderStyle: 'solid'
                              }}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowNewTopic(true);
                            setSelectedTopicValue("");
                          }}
                          className="rounded-lg border-2"
                          style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
                        >
                          <Plus className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                          <span style={{ color: '#ffffff' }}>Create New Topic</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          required
                          value={selectedTopicValue}
                          onChange={(e) => e.target.value.length <= 100 && setSelectedTopicValue(e.target.value)}
                          placeholder="e.g., Cell Biology, Quadratic Equations, WWI"
                          className="rounded-xl border-2 h-12 text-base"
                          style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
                        />
                        {selectedSubjectValue && existingTopicsForSelectedSubject.length > 0 && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setShowNewTopic(false)}
                            className="text-sm"
                            style={{ color: 'var(--sage-600)', backgroundColor: 'transparent' }}
                          >
                            <span style={{ color: 'var(--sage-600)' }}>Back to topic list</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Label className="text-sm font-medium text-white mb-2 block">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="rounded-xl" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)' }}>
                    {GRADE_LEVELS.map(grade => (
                      <SelectItem key={grade} value={grade} style={{ color: '#ffffff' }}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!file ? (
              <Card className="rounded-2xl border-2 border-dashed p-12 text-center" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="slideshow-upload"
                />
                <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                  <Presentation className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Upload Presentation</h3>
                <p className="text-white mb-2">PDF format only</p>
                <p className="text-xs text-white mb-6" style={{ opacity: 0.7 }}>Export your PowerPoint or Google Slides as PDF first (Max 30 questions)</p>
                <label htmlFor="slideshow-upload">
                  <Button
                    type="button"
                    className="rounded-xl"
                    style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
                    onClick={() => document.getElementById('slideshow-upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose PDF File
                  </Button>
                </label>
              </Card>
            ) : (
              <Card className="rounded-2xl p-6 border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-white">{file.name}</p>
                    <p className="text-sm text-white" style={{ opacity: 0.7 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>

                {isProcessing && (
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--sage-600)' }} />
                      <span className="text-white">Extracting questions from slides...</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {!isProcessing && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setFile(null)}
                      className="flex-1 rounded-xl"
                      style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={processSlideshow}
                      disabled={!selectedSubjectValue || !selectedTopicValue}
                      className="flex-1 rounded-xl"
                      style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Extract Questions
                    </Button>
                  </div>
                )}
              </Card>
            )}

            <Alert className="rounded-xl" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
              <Sparkles className="h-4 w-4" style={{ color: 'var(--sage-600)' }} />
              <AlertDescription className="text-white">
                AI will analyze your presentation slides and automatically extract up to 30 key concepts as study questions with answers!
              </AlertDescription>
            </Alert>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-2xl p-6 shadow-sm border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
            <h3 className="font-semibold text-white mb-2">
              Extracted {extractedQuestions.length} Questions from Slides
            </h3>
            <p className="text-sm text-white" style={{ opacity: 0.7 }}>
              Review the questions below. AI has extracted key concepts from your presentation.
            </p>
          </Card>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedQuestions.map((q, index) => (
              <Card key={index} className="rounded-xl p-4 border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
                <div className="mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}>
                    Q{index + 1}
                  </span>
                </div>
                <p className="font-medium text-white mb-2">{q.question}</p>
                <p className="text-sm text-white" style={{ opacity: 0.8 }}>{q.answer}</p>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setExtractedQuestions([]);
                setFile(null);
                setSelectedSubjectValue("");
                setSelectedTopicValue("");
                setShowNewSubject(false);
                setShowNewTopic(false);
              }}
              className="flex-1 rounded-xl"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
            >
              Start Over
            </Button>
            <Button
              onClick={saveAll}
              disabled={isProcessing}
              className="flex-1 rounded-xl"
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
                  Save All to Library
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}