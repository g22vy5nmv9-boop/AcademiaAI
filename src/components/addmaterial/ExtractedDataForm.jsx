import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Loader2, Folder, Plus, FolderOpen } from "lucide-react";

const GRADE_LEVELS = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "College Freshman", "College Sophomore", "College Junior", "College Senior", "Graduate"
];

const MAX_SUBJECTS = 12;

export default function ExtractedDataForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    question: initialData.question || "",
    answer: initialData.answer || "",
    subject: initialData.subject || "",
    topic: initialData.topic || "",
    grade_level: initialData.grade_level || "Grade 9",
    time_period: initialData.time_period || "",
    difficulty: initialData.difficulty || "medium",
    tags: initialData.tags?.join(", ") || "",
    image_url: initialData.image_url
  });
  const [isSaving, setIsSaving] = useState(false);
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [existingTopics, setExistingTopics] = useState([]);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);

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

    // If initial subject is provided and exists, load its topics
    if (initialData.subject && subjects.includes(initialData.subject)) {
      loadTopicsForSubject(initialData.subject);
    }
  };

  const loadTopicsForSubject = async (subject) => {
    const currentUser = await base44.auth.me();
    const allMaterials = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email });
    const topicsForSubject = [...new Set(
      allMaterials
        .filter((m) => m.subject === subject && m.topic)
        .map((m) => m.topic)
    )];
    setExistingTopics(topicsForSubject.sort());
    // Only show new topic input if there are no existing topics or if the current topic isn't in existing topics
    if (!formData.topic || !topicsForSubject.includes(formData.topic)) {
      setShowNewTopic(topicsForSubject.length === 0);
    }
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
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(t => t) : []
    };

    await onSave(dataToSave);
  };

  return (
    <Card className="rounded-2xl p-6 md:p-8 shadow-sm border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Review Extracted Data</h3>
        <p className="text-white" style={{ opacity: 0.7 }}>Please verify and edit the information below</p>
      </div>

      {initialData.question_image && (
        <div className="mb-6">
          <Label className="text-base font-semibold text-white mb-2 block">
            Question Image (Part of the Question)
          </Label>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
            <img src={initialData.question_image} alt="Question" className="w-full max-h-64 object-contain" style={{ backgroundColor: '#000000' }} />
          </div>
          <p className="text-xs text-white mt-2" style={{ opacity: 0.6 }}>
            This image is required to understand the question and will be shown when studying.
          </p>
        </div>
      )}

      {initialData.image_url && !initialData.question_image && (
        <div className="mb-6">
          <Label className="text-base font-semibold text-white mb-2 block">
            Source Screenshot (Reference Only)
          </Label>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
            <img src={initialData.image_url} alt="Source" className="w-full max-h-64 object-contain" style={{ backgroundColor: '#000000' }} />
          </div>
          <p className="text-xs text-white mt-2" style={{ opacity: 0.6 }}>
            This is the source screenshot. The question can be understood without it.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  setFormData({ ...formData, subject: initialData.subject || "", topic: initialData.topic || "" });
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
        {formData.subject && formData.subject !== "new_subject" && (
          <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
            <Label className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#ffffff' }}>
              <FolderOpen className="w-5 h-5" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Topic/Quiz Folder *</span>
            </Label>
            
            {!showNewTopic && existingTopics.length > 0 ? (
              <div className="space-y-3">
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
                </div>
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
                    onClick={() => {
                      setShowNewTopic(false);
                      setFormData({ ...formData, topic: initialData.topic || "" });
                    }}
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

        <div>
          <Label htmlFor="question" className="text-base font-semibold text-white mb-2 block">
            Question or Topic *
          </Label>
          <Textarea
            id="question"
            required
            value={formData.question}
            onChange={(e) => e.target.value.length <= 500 && setFormData({ ...formData, question: e.target.value })}
            placeholder="Examples: What is gravity? | Solve: 3x² - 5x + 2 = 0 | Calculate √169 + π² | Evaluate ∫x²dx"
            className="min-h-24 rounded-xl"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}
          />
          <p className="text-xs text-white mt-1" style={{ opacity: 0.6 }}>
            Math symbols supported: ×÷±√²³π∫∑∆θαβγ≈≤≥≠
          </p>
        </div>

        <div>
          <Label htmlFor="answer" className="text-base font-semibold text-white mb-2 block">
            Answer or Explanation
          </Label>
          <Textarea
            id="answer"
            value={formData.answer}
            onChange={(e) => e.target.value.length <= 1000 && setFormData({ ...formData, answer: e.target.value })}
            placeholder="Just the answer: Mitochondria | x = 7 | √169 = 13 | 1492"
            className="min-h-32 rounded-xl"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="grade_level" className="text-base font-semibold text-white mb-2 block">
              Grade Level *
            </Label>
            <Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}>
              <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}>
                <SelectValue style={{ color: '#ffffff' }} />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                {GRADE_LEVELS.map(grade => (
                  <SelectItem key={grade} value={grade} style={{ color: '#ffffff', backgroundColor: 'transparent' }}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="difficulty" className="text-base font-semibold text-white mb-2 block">
              Difficulty Level
            </Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
              <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}>
                <SelectValue style={{ color: '#ffffff' }} />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)', borderWidth: '2px', borderStyle: 'solid' }}>
                <SelectItem key="easy" value="easy" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>Easy</SelectItem>
                <SelectItem key="medium" value="medium" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>Medium</SelectItem>
                <SelectItem key="hard" value="hard" style={{ color: '#ffffff', backgroundColor: 'transparent' }}>Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="time_period" className="text-base font-semibold text-white mb-2 block">
              Time Period / Unit
            </Label>
            <Input
              id="time_period"
              value={formData.time_period}
              onChange={(e) => e.target.value.length <= 100 && setFormData({ ...formData, time_period: e.target.value })}
              placeholder="e.g., Week 3, Chapter 5"
              className="rounded-xl border-2"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}
            />
          </div>

          <div>
            <Label htmlFor="tags" className="text-base font-semibold text-white mb-2 block">
              Tags
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => e.target.value.length <= 200 && setFormData({ ...formData, tags: e.target.value })}
              placeholder="exam, important, review"
              className="rounded-xl border-2"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000', color: '#ffffff' }}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-xl border-2"
            style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
          >
            <X className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
            Skip
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !formData.question || !formData.subject || !formData.topic}
            className="flex-1 rounded-xl text-white"
            style={{ backgroundColor: 'var(--sage-600)' }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add to Library
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}