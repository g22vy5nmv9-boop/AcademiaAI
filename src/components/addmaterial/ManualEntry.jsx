import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Sparkles, Folder, Plus, Upload, X, FolderOpen, MessageSquare, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import SymbolPicker from "@/components/SymbolPicker";

const GRADE_LEVELS = [
  "Grade 9", "Grade 10", "Grade 11", "Grade 12", "College", "Graduate"
];

const MAX_SUBJECTS = 16;

export default function ManualEntry() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    question: "",
    question_image: "",
    answer: "",
    answer_images: [],
    subject: "",
    topic: "",
    grade_level: "Grade 9",
    time_period: "",
    difficulty: "medium",
    tags: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [isUploadingQuestionImage, setIsUploadingQuestionImage] = useState(false);
  const [isUploadingAnswerImage, setIsUploadingAnswerImage] = useState(false);
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [existingTopics, setExistingTopics] = useState([]);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);

  const questionTextareaRef = useRef(null);
  const answerTextareaRef = useRef(null);

  useEffect(() => {
    loadExistingData();
  }, []);

  useEffect(() => {
    if (formData.subject && formData.subject !== "new_subject") {
      loadTopicsForSubject(formData.subject);
    } else {
      setExistingTopics([]);
      setShowNewTopic(false);
    }
  }, [formData.subject]);

  const loadExistingData = async () => {
    const currentUser = await base44.auth.me();
    const data = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email });
    const subjects = [...new Set(data.map((m) => m.subject).filter(Boolean))];
    setExistingSubjects(subjects.sort());
  };

  const loadTopicsForSubject = async (subject) => {
    const currentUser = await base44.auth.me();
    const allMaterials = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email });
    const topicsForSubject = [...new Set(
      allMaterials.
      filter((m) => m.subject === subject && m.topic).
      map((m) => m.topic)
    )];
    setExistingTopics(topicsForSubject.sort());
    setShowNewTopic(topicsForSubject.length === 0);
  };

  const generateAnswer = async () => {
    if (!formData.question.trim()) return;

    setIsGeneratingAnswer(true);

    const prompt = `You are an expert educator. Provide a comprehensive, accurate answer to this question.

Question: ${formData.question}
Subject: ${formData.subject || "General"}
Grade Level: ${formData.grade_level}

Requirements:
1. Give a detailed, educational answer
2. Use clear, age-appropriate language for the grade level
3. Include examples or explanations where helpful
4. Be accurate and factual

Also provide learning resources (websites and video tutorials) that would help understand this topic better.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          learning_resources: {
            type: "object",
            properties: {
              websites: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    description: { type: "string" }
                  }
                }
              },
              videos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    });

    setFormData((prev) => ({
      ...prev,
      answer: result.answer,
      learning_resources: result.learning_resources
    }));

    setIsGeneratingAnswer(false);
  };

  const handleQuestionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingQuestionImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData((prev) => ({ ...prev, question_image: file_url }));
    setIsUploadingQuestionImage(false);
  };

  const handleAnswerImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploadingAnswerImage(true);
    const uploadedUrls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }
    setFormData((prev) => ({
      ...prev,
      answer_images: [...(prev.answer_images || []), ...uploadedUrls]
    }));
    setIsUploadingAnswerImage(false);
  };

  const removeQuestionImage = () => {
    setFormData((prev) => ({ ...prev, question_image: "" }));
  };

  const removeAnswerImage = (imageUrl) => {
    setFormData((prev) => ({
      ...prev,
      answer_images: prev.answer_images.filter((img) => img !== imageUrl)
    }));
  };

  const handleSubjectChange = (value) => {
    if (value === "new_subject") {
      if (existingSubjects.length >= MAX_SUBJECTS) {
        alert(`You can only create up to ${MAX_SUBJECTS} subjects. Please use an existing subject or delete one to create a new one.`);
        return;
      }
      setShowNewSubject(true);
      setFormData({ ...formData, subject: "", topic: "" });
    } else {
      setShowNewSubject(false);
      setFormData({ ...formData, subject: value, topic: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const dataToSave = {
      ...formData,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter((t) => t) : []
    };

    await base44.entities.StudyMaterial.create(dataToSave);
    navigate(createPageUrl("Library"));
  };

  const insertSymbol = (symbol, textareaRef) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const fieldName = textareaRef === questionTextareaRef ? 'question' : 'answer';
    const text = formData[fieldName];
    
    const newText = text.substring(0, start) + symbol + text.substring(end);
    setFormData({ ...formData, [fieldName]: newText });

    // Set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  return (
    <Card className="rounded-2xl shadow-lg border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
      <style>{`
        [role="option"]:hover,
        [data-radix-select-item]:hover,
        [data-highlighted] {
          background-color: var(--sage-600) !important;
          color: #ffffff !important;
        }
      `}</style>
      
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="text-center pb-4 border-b" style={{ borderColor: 'var(--sage-600)' }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>Add Study Material</h2>
          <p className="text-sm" style={{ color: '#ffffff' }}>Fill in the details below to create a new study question</p>
        </div>

        {/* Subject Folder */}
        <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
          <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#ffffff' }}>
            <Folder className="w-5 h-5" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Subject Folder *</span>
          </Label>
          
          {!showNewSubject ? (
            <div className="space-y-3">
              <Select 
                value={formData.subject} 
                onValueChange={handleSubjectChange}
              >
                <SelectTrigger className="rounded-xl border-2 h-12" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#e2e8f0', color: '#000000' }}>
                  <SelectValue placeholder="Select a subject" style={{ color: '#000000' }} />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: '#e2e8f0', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                  {existingSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject} style={{ color: '#000000', backgroundColor: 'transparent' }}>{subject}</SelectItem>
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
                value={formData.subject}
                onChange={(e) => e.target.value.length <= 100 && setFormData({ ...formData, subject: e.target.value, topic: "" })}
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
                  setFormData({ ...formData, subject: "", topic: "" });
                }}
                className="text-sm"
                style={{ color: 'var(--sage-600)', backgroundColor: 'transparent' }}
              >
                <span style={{ color: 'var(--sage-600)' }}>← Back to subject list</span>
              </Button>
            </div>
          )}
        </div>

        {/* Topic Folder */}
        {(formData.subject || showNewSubject) && (
          <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
            <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#ffffff' }}>
              <FolderOpen className="w-5 h-5" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Topic/Quiz Folder *</span>
            </Label>
            
            {!showNewTopic && existingTopics.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {existingTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setFormData({ ...formData, topic })}
                    onMouseEnter={(e) => {
                      if (formData.topic !== topic) {
                        e.currentTarget.style.backgroundColor = 'var(--sage-600)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.topic !== topic) {
                        e.currentTarget.style.backgroundColor = '#000000';
                      }
                    }}
                    className="px-5 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: formData.topic === topic ? 'var(--sage-600)' : '#000000',
                      color: '#ffffff',
                      borderColor: 'var(--sage-600)',
                      borderWidth: '2px',
                      borderStyle: 'solid'
                    }}
                  >
                    {topic}
                  </button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewTopic(true);
                    setFormData({ ...formData, topic: "" });
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
                  value={formData.topic}
                  onChange={(e) => e.target.value.length <= 100 && setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Cell Biology, Quadratic Equations, WWI"
                  className="rounded-xl border-2 h-12 text-base"
                  style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
                  disabled={!formData.subject}
                />
                {existingTopics.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowNewTopic(false)}
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

        {/* Question Section */}
        <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
          <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#ffffff' }}>
            <MessageSquare className="w-5 h-5" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Question or Topic (Optional)</span>
          </Label>
          
          <Textarea
            ref={questionTextareaRef}
            value={formData.question}
            onChange={(e) => e.target.value.length <= 500 && setFormData({ ...formData, question: e.target.value })}
            placeholder={`Examples:
• What is photosynthesis?
• Solve for x: 2x² + 5x - 3 = 0
• Calculate: √144 × π ÷ 2
• Find the derivative of y = 3x² - 2x + 1
• What is ∫(2x + 3)dx?`}
            className="rounded-xl border-2 h-32 text-base mb-4"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
          />

          <div className="mb-4">
            <SymbolPicker onSelect={(symbol) => insertSymbol(symbol, questionTextareaRef)} />
          </div>
          
          {/* Question Image Upload */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleQuestionImageUpload}
              className="hidden"
              id="question-image-upload"
            />
            {!formData.question_image ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('question-image-upload').click()}
                disabled={isUploadingQuestionImage}
                className="rounded-xl border-2"
                style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
              >
                {isUploadingQuestionImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#ffffff' }} />
                    <span style={{ color: '#ffffff' }}>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                    <span style={{ color: '#ffffff' }}>Add Image to Question</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="relative inline-block">
                <img
                  src={formData.question_image}
                  alt="Question"
                  className="rounded-xl border-2 max-h-48"
                  style={{ borderColor: 'var(--sage-600)' }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeQuestionImage}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg h-8 w-8"
                >
                  <X className="w-4 h-4" style={{ color: '#ffffff' }} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Answer Section */}
        <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg font-bold flex items-center gap-2" style={{ color: '#ffffff' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Answer or Explanation</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateAnswer}
              disabled={isGeneratingAnswer || !formData.question}
              className="rounded-lg border-2"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
            >
              {isGeneratingAnswer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Generate with AI</span>
                </>
              )}
            </Button>
          </div>

          <Textarea
            ref={answerTextareaRef}
            value={formData.answer}
            onChange={(e) => e.target.value.length <= 1000 && setFormData({ ...formData, answer: e.target.value })}
            placeholder={`Keep it simple - just the answer:
• Photosynthesis
• x = 5
• 12
• π ≈ 3.14159
• The Treaty of Versailles`}
            className="rounded-xl border-2 h-40 text-base mb-4"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
          />

          <div className="mb-4">
            <SymbolPicker onSelect={(symbol) => insertSymbol(symbol, answerTextareaRef)} />
          </div>
          
          {/* Answer Images Upload */}
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleAnswerImageUpload}
              className="hidden"
              id="answer-images-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('answer-images-upload').click()}
              disabled={isUploadingAnswerImage}
              className="rounded-xl border-2 mb-4"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
            >
              {isUploadingAnswerImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Add Images to Answer</span>
                </>
              )}
            </Button>
            
            {formData.answer_images && formData.answer_images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.answer_images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Answer image ${idx + 1}`}
                      className="rounded-xl border-2 w-full h-32 object-cover"
                      style={{ borderColor: 'var(--sage-600)' }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAnswerImage(img)}
                      className="absolute -top-2 -right-2 rounded-full shadow-lg h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: '#000000', color: '#ffffff' }}
                    >
                      <X className="w-3 h-3" style={{ color: '#ffffff' }} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!formData.answer && (
            <Alert className="rounded-xl border-2" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
              <Sparkles className="h-4 w-4" style={{ color: 'var(--sage-600)' }} />
              <AlertDescription className="text-sm" style={{ color: '#ffffff' }}>
                Don't know the answer? Click "Generate with AI" and we'll find it for you using the internet!
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="grade_level" className="text-base font-semibold mb-3 block" style={{ color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Grade Level *</span>
            </Label>
            <Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}>
              <SelectTrigger className="rounded-xl border-2 h-12" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                <SelectValue style={{ color: '#ffffff' }} />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                {GRADE_LEVELS.map((grade) => (
                  <SelectItem key={grade} value={grade} style={{ color: '#ffffff', backgroundColor: 'transparent' }}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="difficulty" className="text-base font-semibold mb-3 block" style={{ color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Difficulty Level</span>
            </Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
              <SelectTrigger className="rounded-xl border-2 h-12" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                <SelectValue style={{ color: '#ffffff' }} />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                <SelectItem value="easy" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>Easy</SelectItem>
                <SelectItem value="medium" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>Medium</SelectItem>
                <SelectItem value="hard" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="time_period" className="text-base font-semibold mb-3 block" style={{ color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Time Period / Unit</span>
            </Label>
            <Input
              id="time_period"
              value={formData.time_period}
              onChange={(e) => e.target.value.length <= 100 && setFormData({ ...formData, time_period: e.target.value })}
              placeholder="e.g., Week 3, Chapter 5, Q1 Midterm"
              className="rounded-xl border-2 h-12"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
            />
          </div>

          <div>
            <Label htmlFor="tags" className="text-base font-semibold mb-3 block" style={{ color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Tags</span>
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => e.target.value.length <= 200 && setFormData({ ...formData, tags: e.target.value })}
              placeholder="exam, important, review"
              className="rounded-xl border-2 h-12"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a', color: '#ffffff' }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t" style={{ borderColor: 'var(--sage-600)' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl("Library"))}
            className="flex-1 rounded-xl h-12 text-base border-2"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
          >
            <span style={{ color: '#ffffff' }}>Cancel</span>
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !formData.subject || !formData.topic}
            className="flex-1 rounded-xl h-12 text-base font-semibold"
            style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Add to Library</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}