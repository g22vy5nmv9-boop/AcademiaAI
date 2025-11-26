import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Plus, BookOpen, FolderOpen, Folder, ChevronRight, ChevronDown, FolderPlus, Trash2, FileQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from
"@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAX_SUBJECTS = 16;

export default function Library() {
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [selectedTopicData, setSelectedTopicData] = useState(null);
  const [addToTopicDialog, setAddToTopicDialog] = useState(false);
  const [selectedMaterialForTopic, setSelectedMaterialForTopic] = useState(null);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    loadMaterials();
    
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

  const loadMaterials = async () => {
    try {
      setIsLoading(true);
      const currentUser = await base44.auth.me();
      const data = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email }, "-created_date").catch(() => []);
      setMaterials(data);

      // Extract unique subject/topic combinations for the "Add to Topic" dialog
      const topicsMap = {};
      data.forEach((m) => {
        const subject = m.subject || "Uncategorized";
        const topic = m.topic || "General Questions";
        const key = `${subject}::${topic}`;
        if (!topicsMap[key]) {
          topicsMap[key] = { subject, topic };
        }
      });
      setAvailableTopics(Object.values(topicsMap));
    } catch (error) {
      console.log("Error loading materials, using empty list");
      setMaterials([]);
      setAvailableTopics([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.StudyMaterial.delete(id);
      loadMaterials();
    } catch (error) {
      console.log("Error deleting material");
    }
  };

  const uniqueSubjects = [...new Set(materials.map((m) => m.subject).filter(Boolean))].sort();

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      if (uniqueSubjects.length >= MAX_SUBJECTS) {
        alert(`You can only create up to ${MAX_SUBJECTS} subjects. Please delete an existing subject to create a new one.`);
        return;
      }
      setSelectedSubject(newSubjectName.trim());
      setNewSubjectName("");
      setShowAddSubject(false);
      window.location.href = createPageUrl("AddMaterial") + `?subject=${encodeURIComponent(newSubjectName.trim())}`;
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = !searchQuery ||
    m.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.answer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.time_period?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject = selectedSubject === "all" || m.subject === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  const groupedBySubjectAndTopic = filteredMaterials.reduce((acc, material) => {
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

  const toggleSubject = (subject) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  const openTopicDialog = (subject, topic, topicMaterials) => {
    setSelectedTopicData({ subject, topic, materials: topicMaterials });
    setShowTopicDialog(true);
  };

  const copyQuestion = (question) => {
    navigator.clipboard.writeText(question);
  };

  const handleDeleteTopic = async (subject, topic) => {
    setItemToDelete({ type: 'topic', subject, topic });
    setDeleteConfirmDialog(true);
  };

  const handleDeleteSubject = async (subject) => {
    setItemToDelete({ type: 'subject', subject });
    setDeleteConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'topic') {
        const topicMaterials = materials.filter(m => 
          m.subject === itemToDelete.subject && 
          (m.topic || "General Questions") === itemToDelete.topic
        );
        for (const material of topicMaterials) {
          await base44.entities.StudyMaterial.delete(material.id);
        }
      } else if (itemToDelete.type === 'subject') {
        const subjectMaterials = materials.filter(m => m.subject === itemToDelete.subject);
        for (const material of subjectMaterials) {
          await base44.entities.StudyMaterial.delete(material.id);
        }
      }
      
      await loadMaterials();
      setDeleteConfirmDialog(false);
      setItemToDelete(null);
      if (showTopicDialog) {
        setShowTopicDialog(false);
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete. Please try again.");
    }
  };

  const addQuestionToTopic = async (targetSubject, targetTopic) => {
    if (!selectedMaterialForTopic) return;

    const exists = materials.some((m) =>
    m.question === selectedMaterialForTopic.question &&
    m.subject === targetSubject &&
    m.topic === targetTopic
    );

    if (exists) {
      alert("This question already exists in the selected topic.");
      setAddToTopicDialog(false);
      setSelectedMaterialForTopic(null);
      return;
    }

    try {
      await base44.entities.StudyMaterial.create({
        question: selectedMaterialForTopic.question,
        answer: selectedMaterialForTopic.answer || "",
        subject: targetSubject,
        topic: targetTopic,
        grade_level: selectedMaterialForTopic.grade_level || "",
        difficulty: selectedMaterialForTopic.difficulty || "",
        time_period: selectedMaterialForTopic.time_period || "",
        tags: selectedMaterialForTopic.tags || [],
        question_image: selectedMaterialForTopic.question_image || null,
        answer_images: selectedMaterialForTopic.answer_images || []
      });

      setAddToTopicDialog(false);
      setSelectedMaterialForTopic(null);
      await loadMaterials();
    } catch (error) {

      // Error handled silently
    }};
    
  return <>
      <div className="bg-slate-950 pt-4 pr-4 pb-4 pl-4 min-h-screen md:p-8" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Study Library</h1>
              <p className="mt-1" style={{ color: lightMode ? '#000000' : '#a3a3a3' }}>Organize your study materials</p>
            </div>
            <Link to={createPageUrl("AddMaterial")}>
              <Button className="bg-[var(--sage-600)] hover:bg-[var(--sage-700)] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
            </Link>
          </div>

          <Card className="bg-black text-card-foreground mb-6 p-1 rounded-lg shadow-sm border" style={{ borderColor: 'var(--sage-600)' }}>
            <div className="relative">
              <Input placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[var(--sage-600)] text-white placeholder:text-white/70 px-3 py-2 text-base rounded-md flex h-10 w-full border-0 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" />

            </div>
          </Card>

          {uniqueSubjects.length > 0 &&
        <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Subjects</h2>
                <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                      <Plus className="w-4 h-4 mr-1" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent style={{ backgroundColor: lightMode ? '#ffffff' : '#000000', borderColor: 'var(--sage-200)' }}>
                    <DialogHeader>
                      <DialogTitle style={{ color: lightMode ? '#000000' : '#ffffff' }}>Create New Subject</DialogTitle>
                      <DialogDescription style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
                        Add a new subject folder to organize your materials
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="subjectName" className="mb-2 block" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Subject Name</Label>
                      <Input
                    id="subjectName"
                    value={newSubjectName}
                    onChange={(e) => e.target.value.length <= 50 && setNewSubjectName(e.target.value)}
                    placeholder="e.g., AP Biology, World History"
                    style={{ backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a', color: lightMode ? '#000000' : '#ffffff' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubject();
                      }
                    }} />

                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddSubject(false);
                      setNewSubjectName("");
                    }}
                    style={{
                      backgroundColor: lightMode ? '#ffffff' : '#000000',
                      color: lightMode ? '#000000' : '#ffffff',
                      borderColor: lightMode ? '#e2e8f0' : '#333333'
                    }}>
                        Cancel
                      </Button>
                      <Button
                    onClick={handleAddSubject}
                    disabled={!newSubjectName.trim()}
                    className="bg-[var(--sage-600)] hover:bg-[var(--sage-700)] text-white">
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex gap-2 flex-wrap justify-center">
                <button
              onClick={() => setSelectedSubject("all")}
              className="px-4 py-2.5 rounded-lg font-medium transition-all active:scale-105"
              style={{
                backgroundColor: selectedSubject === "all" ? 'var(--sage-600)' : (lightMode ? '#e2e8f0' : '#1a1a1a'),
                color: selectedSubject === "all" ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'),
                borderColor: 'var(--sage-600)',
                borderWidth: '2px',
                borderStyle: 'solid',
                boxShadow: 'none',
                outline: 'none'
              }}>
                  All
                  <span className="ml-2 text-xs" style={{
                color: selectedSubject === "all" ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'),
                opacity: 0.75
              }}>
                    ({materials.length})
                  </span>
                </button>
                {uniqueSubjects.map((subject) => {
              const count = materials.filter((m) => m.subject === subject).length;
              return (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className="px-4 py-2.5 rounded-lg font-medium transition-all active:scale-105"
                  style={{
                    backgroundColor: selectedSubject === subject ? 'var(--sage-600)' : (lightMode ? '#e2e8f0' : '#1a1a1a'),
                    color: selectedSubject === subject ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'),
                    borderColor: 'var(--sage-600)',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    boxShadow: 'none',
                    outline: 'none'
                  }}>
                      {subject}
                      <span className="ml-2 text-xs" style={{
                    color: selectedSubject === subject ? '#ffffff' : (lightMode ? '#000000' : '#ffffff'),
                    opacity: 0.75
                  }}>
                        ({count})
                      </span>
                    </button>);

            })}
              </div>
            </div>
        }

          {isLoading ?
        <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) =>
          <div key={i} className="bg-gray-950 text-slate-50 p-6 rounded-lg animate-pulse border border-gray-200 h-32" />
          )}
            </div> :
        filteredMaterials.length === 0 ?
        <Card className="p-12 text-center border" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000', borderColor: 'var(--sage-600)' }}>
                <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--sage-600)' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Aw nuts!</h3>
                <p className="mb-6" style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
                  {materials.length === 0 ? "Start building your study library" : "Try adjusting your search"}
                </p>
                <Link to={createPageUrl("AddMaterial")}>
                  <Button className="bg-[var(--sage-600)] hover:bg-[var(--sage-700)] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </Button>
                </Link>
              </Card> :

        <div className="space-y-4">
                {Object.entries(groupedBySubjectAndTopic).map(([subject, topics]) =>
          <Card key={subject} className="bg-white border border-gray-200 overflow-hidden" style={{ borderColor: lightMode ? '#e2e8f0' : '#333333' }}>
                    <button
              onClick={() => toggleSubject(subject)} className="p-4 w-full flex items-center justify-between transition-all active:scale-[1.02] min-h-[80px]" style={{ backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a' }}>
                      <div className="flex items-center gap-3 flex-1">
                        <Folder className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                        <div className="text-left">
                          <h3 className="font-semibold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{subject}</h3>
                          <p className="text-sm" style={{ color: lightMode ? '#000000' : '#ffffff', opacity: 0.7 }}>
                            {Object.keys(topics).length} topics • {Object.values(topics).flat().length} questions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubject(subject);
                          }}
                          className="h-8 w-8 hover:bg-red-50"
                          style={{ color: lightMode ? '#ef4444' : '#f87171' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {expandedSubjects[subject] ?
                          <ChevronDown className="w-5 h-5" style={{ color: lightMode ? '#000000' : '#ffffff' }} /> :
                          <ChevronRight className="w-5 h-5" style={{ color: lightMode ? '#000000' : '#ffffff' }} />
                        }
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSubjects[subject] &&
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }} className="bg-slate-950 p-4 border-t border-gray-200 overflow-hidden" style={{ backgroundColor: 'transparent', borderColor: lightMode ? '#e2e8f0' : '#333333' }}>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(topics).map(([topic, topicMaterials]) =>
                  <div className="p-4 rounded-lg border border-gray-200 min-h-[72px] flex items-center" style={{ backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a', borderColor: lightMode ? '#cbd5e1' : '#4a4a4a' }}>
                    <button
                      onClick={() => openTopicDialog(subject, topic, topicMaterials)}
                      className="flex-1 text-left transition-all active:scale-[1.02] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" style={{ color: 'var(--sage-600)' }} />
                        <span className="font-medium" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{topic}</span>
                      </div>
                      <Badge variant="secondary" className="bg-slate-800 text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80" style={{ backgroundColor: lightMode ? '#cbd5e1' : '#333333', color: lightMode ? '#000000' : '#ffffff' }}>
                        {topicMaterials.length}
                      </Badge>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTopic(subject, topic);
                      }}
                      className="h-8 w-8 ml-2 hover:bg-red-50"
                      style={{ color: lightMode ? '#ef4444' : '#f87171' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  )}
                          </div>
                        </motion.div>
              }
                    </AnimatePresence>
                  </Card>
          )}
              </div>
        }
        </div>
      </div>

      <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
        <DialogContent className="p-0 fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-4xl max-h-[90vh] flex flex-col" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000', borderColor: 'var(--sage-200)' }}>
          {selectedTopicData &&
        <>
              <DialogHeader className="bg-slate-900 pb-4 p-6 text-center flex flex-col space-y-1.5 sm:text-left border-b flex-shrink-0" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
                <DialogTitle className="text-2xl flex items-center gap-3" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                  <Folder className="w-6 h-6" style={{ color: 'var(--sage-600)' }} />
                  {selectedTopicData.subject} - {selectedTopicData.topic}
                </DialogTitle>
                <p className="text-sm mt-2" style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
                  {selectedTopicData.materials.length} questions
                </p>
              </DialogHeader>

              <ScrollArea className="bg-slate-900 p-6 relative overflow-hidden flex-1" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
                <div className="space-y-4">
                  {selectedTopicData.materials.map((material, index) =>
              <Card
                key={material.id}
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a' }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-lg" style={{ backgroundColor: lightMode ? '#cbd5e1' : '#333333', color: lightMode ? '#000000' : '#ffffff' }}>
                              Question {index + 1}
                            </Badge>
                          </div>

                          {material.question_image &&
                    <img
                      src={material.question_image}
                      alt="Question"
                      className="rounded-xl border-2 mb-3 max-h-48 w-auto"
                      style={{ borderColor: 'var(--sage-200)' }} />
                    }

                          <p className="font-medium mb-3" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                            {material.question}
                          </p>

                          {material.answer &&
                    <div className="p-3 rounded-lg" style={{ backgroundColor: lightMode ? 'var(--sage-50)' : '#0a0a0a', borderColor: 'var(--sage-200)', borderWidth: '1px' }}>
                              <p className="text-xs font-medium mb-1" style={{ color: lightMode ? 'var(--sage-700)' : 'var(--sage-600)' }}>Answer:</p>
                              <p className="text-sm whitespace-pre-wrap" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                                {material.answer}
                              </p>

                              {material.answer_images && material.answer_images.length > 0 &&
                      <div className="grid grid-cols-2 gap-2 mt-3">
                                  {material.answer_images.map((img, idx) =>
                        <img
                          key={idx}
                          src={img}
                          alt={`Answer image ${idx + 1}`}
                          className="rounded-lg border w-full h-auto"
                          style={{ borderColor: 'var(--sage-200)' }} />
                        )}
                                </div>
                      }
                            </div>
                    }
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedMaterialForTopic(material);
                        setAddToTopicDialog(true);
                      }}
                      className="text-gray-400 rounded-lg transition-colors h-8 w-8"
                      title="Add to another topic"
                      style={{ color: lightMode ? '#94a3b8' : '#a3a3a3' }}>
                            <FileQuestion className="w-4 h-4" />
                          </Button>
                          <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyQuestion(material.question)}
                      className="text-gray-400 rounded-lg transition-colors h-8 w-8"
                      title="Copy question"
                      style={{ color: lightMode ? '#94a3b8' : '#a3a3a3' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </Button>
                          <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await handleDelete(material.id);
                        const updatedMaterials = selectedTopicData.materials.filter((m) => m.id !== material.id);
                        setSelectedTopicData((prev) => ({
                          ...prev,
                          materials: updatedMaterials
                        }));
                        if (updatedMaterials.length === 0) {
                          setShowTopicDialog(false);
                        }
                      }}
                      className="text-gray-400 rounded-lg transition-colors flex-shrink-0 h-8 w-8"
                      style={{ color: lightMode ? '#94a3b8' : '#a3a3a3' }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
              )}
                </div>
              </ScrollArea>
            </>
        }
        </DialogContent>
      </Dialog>

      <Dialog open={addToTopicDialog} onOpenChange={setAddToTopicDialog}>
        <DialogContent className="max-w-md" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000', borderColor: 'var(--sage-200)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
              <FileQuestion className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
              Add Question to Topic
            </DialogTitle>
            <DialogDescription style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
              Select which topic to add a copy of this question to
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            <div className="space-y-2 p-1">
              {availableTopics.length === 0 ?
            <p className="text-center py-8" style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
                  No other topics exist yet. Create a new topic first!
                </p> :
            availableTopics.map((topic, index) =>
            <button
              key={`${topic.subject}-${topic.topic}-${index}`}
              onClick={() => addQuestionToTopic(topic.subject, topic.topic)}
              className="w-full p-4 rounded-lg border transition-all text-left bg-white"
              style={{
                backgroundColor: lightMode ? '#e2e8f0' : '#1a1a1a',
                color: lightMode ? '#000000' : '#ffffff',
                borderColor: 'var(--sage-600)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}>
                    <p className="font-semibold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>{topic.subject}</p>
                    <p className="text-sm" style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
                      {topic.topic}
                    </p>
                  </button>
            )
            }
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <AlertDialogContent style={{ backgroundColor: lightMode ? '#ffffff' : '#000000', borderColor: 'var(--sage-200)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: lightMode ? '#000000' : '#ffffff' }}>
              Delete {itemToDelete?.type === 'subject' ? 'Subject' : 'Topic'}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: lightMode ? '#666666' : '#a3a3a3' }}>
              {itemToDelete?.type === 'subject' 
                ? `This will permanently delete "${itemToDelete?.subject}" and all ${materials.filter(m => m.subject === itemToDelete?.subject).length} questions in it.`
                : `This will permanently delete "${itemToDelete?.topic}" and all ${materials.filter(m => m.subject === itemToDelete?.subject && (m.topic || "General Questions") === itemToDelete?.topic).length} questions in it.`
              }
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)} style={{ color: lightMode ? '#000000' : '#ffffff' }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;

}