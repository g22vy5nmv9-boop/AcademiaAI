import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Printer, Trash2, StickyNote, Folder, ChevronRight, ChevronDown, Sparkles, Loader2, BookOpen, X, Upload, Image as ImageIcon, FileText, Lightbulb, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom'; // Added Link import

const NOTE_COLORS = {
  yellow: { bg: "#fef3c7", border: "#fbbf24", text: "#92400e" },
  blue: { bg: "#dbeafe", border: "#60a5fa", text: "#1e3a8a" },
  green: { bg: "#d1fae5", border: "#34d399", text: "#065f46" },
  pink: { bg: "#fce7f3", border: "#f472b6", text: "#831843" },
  purple: { bg: "#e9d5ff", border: "#a78bfa", text: "#5b21b6" },
  orange: { bg: "#fed7aa", border: "#fb923c", text: "#7c2d12" },
  red: { bg: "#fee2e2", border: "#f87171", text: "#991b1b" },
  gray: { bg: "#f3f4f6", border: "#9ca3af", text: "#1f2937" }
};

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showNoteView, setShowNoteView] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [includeQuestions, setIncludeQuestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    includeImages: true,
    includeHeader: true,
    colorMode: 'color' // 'color' or 'bw'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const notesData = await base44.entities.Note.filter({ created_by: currentUser.email }, "-created_date").catch(() => []);
      const materialsData = await base44.entities.StudyMaterial.filter({ created_by: currentUser.email }).catch(() => []);
      setNotes(notesData);
      setMaterials(materialsData);
    } catch (error) {
      console.log("Error loading data, using empty lists");
      setNotes([]);
      setMaterials([]);
    }
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

  const toggleSubject = (subject) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  const generateNotes = async (subject, topic) => {
    try {
      setIsGenerating(true);

      const topicMaterials = materials.filter(m =>
        m.subject === subject && (m.topic || "General Questions") === topic
      );

      const materialsContext = topicMaterials.map(m => ({
        question: m.question,
        answer: m.answer,
        topic: m.topic
      }));

      const isMath = subject.toLowerCase().includes('math') ||
                     subject.toLowerCase().includes('algebra') ||
                     subject.toLowerCase().includes('calculus') ||
                     subject.toLowerCase().includes('geometry') ||
                     subject.toLowerCase().includes('trigonometry') ||
                     subject.toLowerCase().includes('statistics');

      const prompt = `You are a fun, engaging educator creating study notes that students will actually WANT to read! 🎯

Based on these study materials:
${JSON.stringify(materialsContext, null, 2)}

Create awesome study notes for: ${subject} - ${topic}

${isMath ? `
This is MATH! Make it click! 🧮

For each concept, use this fun format:

**🎯 [Concept Name]**

**The Formula Magic ✨**
[Formula here - make it clear and beautiful]

**What does it mean?**
- Variable 1 = [fun, relatable explanation]
- Variable 2 = [another clear explanation]

**💡 Pro Tip:** [A helpful insight or memory trick]

**Let's Try It! 🚀**

**Example 1: [Simple Scenario]**
Imagine [relatable context]...
- Step 1: [Clear explanation]
- Step 2: [Keep it simple]
- ✓ Answer: [Final solution with explanation]

**Example 2: [Trickier One]**
Now let's level up! 🎮
- [Show detailed work]
- [Explain each step]
- ✓ Answer: [Solution]

**⚠️ Common Mistakes:**
- [What students often mess up]
- [How to avoid it]

` : `
This is a NON-MATH topic! Make it engaging! 📚

Use this structure:

**🎯 What's This All About?**
[Fun, engaging overview that hooks them in]

**📌 Key Concepts**

**🔹 [First Main Idea]**
[Explain it like you're telling a friend - make it relatable!]

💡 **Quick Tip:** [Memory trick or fun fact]

**Real-World Connection:** [Why this matters / how it's used]

**🔹 [Second Main Idea]**
[Continue the engaging explanation]

💡 **Remember:** [Another helpful insight]

**🎨 Visual Breakdown:**
- Point 1: [Clear explanation]
- Point 2: [Build on it]
- Point 3: [Connect the dots]

**🌟 Why This Matters:**
[Make them care - show relevance]
`}

FORMATTING RULES:
- Use emojis strategically (not too many!)
- Use **bold** for important terms and section titles
- Use bullet points (-) for lists
- NO markdown heading symbols (no #, ##, ###)
- Keep paragraphs short and punchy
- Add blank lines between sections for breathing room
- Use "Pro Tips" and "Remember" callouts
- Make it conversational but educational

${includeQuestions ? `
ADD TWO SECTIONS:

**📝 STUDY NOTES**
[All the content above]

**🎯 PRACTICE TIME!**

Create 5-8 challenging practice questions:

**Question 1:**
[Clear, interesting problem]

**Solution:**
${isMath ? '- Step 1: [Show work]\n- Step 2: [Continue]\n- ✓ Final Answer: [Solution with units]' : '[Detailed, educational answer]'}

**Why This Works:** [Brief explanation of the concept]

---

[Repeat for more questions]
` : `
**✅ Quick Review Checklist:**
- ☐ [Main concept to remember]
- ☐ [Another key point]
- ☐ [Final important detail]

**🎯 The Big Picture:**
[Tie it all together with a memorable summary]
`}

IMPORTANT: Make notes visually organized with:
- Clear section breaks
- Emoji markers for different types of content
- Short, digestible paragraphs
- Callout boxes with tips
- Real-world examples

Keep it fun, engaging, and educational! Students should feel excited to study this! 🚀`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The formatted study notes with emojis and structure" },
            image_urls: {
              type: "array",
              items: { type: "string" },
              description: "URLs of relevant educational diagrams or visuals"
            }
          },
          required: ["content"]
        }
      });

      // Create content blocks from the result
      const contentBlocks = [{ type: "text", content: result.content, width: 100 }];

      // Add images if found
      if (result.image_urls && result.image_urls.length > 0) {
        result.image_urls.forEach(url => {
          contentBlocks.push({ type: "image", content: url, width: 100 });
        });
      }

      await base44.entities.Note.create({
        title: `${subject} - ${topic}`,
        content: result.content,
        content_blocks: contentBlocks,
        color: selectedColor,
        images: result.image_urls || [],
        tags: [subject, topic]
      });

      loadData();
      setShowDialog(false);
    } catch (error) {
      console.log("Error generating notes");
      alert("Failed to generate notes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Note.delete(id);
      loadData();
      if (selectedNote && selectedNote.id === id) {
        setShowNoteView(false);
        setSelectedNote(null);
      }
    } catch (error) {
      console.log("Error deleting note");
    }
  };

  const openNote = (note) => {
    // Migrate old notes to content_blocks format if needed
    if (!note.content_blocks || note.content_blocks.length === 0) {
      const blocks = [{ type: "text", content: note.content || "", width: 100 }];
      // Add legacy images as image blocks
      if (note.images && note.images.length > 0) {
        note.images.forEach(img => {
          blocks.push({ type: "image", content: img, width: 100 });
        });
      }
      note.content_blocks = blocks;
    }
    setSelectedNote(note);
    setShowNoteView(true);
  };

  const handleImageUpload = async (e, insertIndex) => {
    const files = Array.from(e.target.files);
    if (!selectedNote || files.length === 0) return;

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      const newBlocks = [...(selectedNote.content_blocks || [])];

      // Insert image blocks at the specified position
      newBlocks.splice(insertIndex + 1, 0, ...uploadedUrls.map(url => ({
        type: "image",
        content: url,
        width: 100
      })));

      await base44.entities.Note.update(selectedNote.id, {
        content_blocks: newBlocks
      });

      setSelectedNote(prev => ({ ...prev, content_blocks: newBlocks }));
      loadData();
    } catch (error) {
      console.log("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleRemoveBlock = async (blockIndex) => {
    if (!selectedNote) return;

    try {
      const updatedBlocks = selectedNote.content_blocks.filter((_, idx) => idx !== blockIndex);
      await base44.entities.Note.update(selectedNote.id, {
        content_blocks: updatedBlocks
      });

      setSelectedNote(prev => ({ ...prev, content_blocks: updatedBlocks }));
    } catch (error) {
      console.log("Error removing block:", error);
      alert("Failed to remove block. Please try again.");
    }
  };

  const handleResizeImage = async (blockIndex, newWidth) => {
    if (!selectedNote) return;

    try {
      const updatedBlocks = [...selectedNote.content_blocks];
      updatedBlocks[blockIndex] = {
        ...updatedBlocks[blockIndex],
        width: newWidth
      };

      await base44.entities.Note.update(selectedNote.id, {
        content_blocks: updatedBlocks
      });

      setSelectedNote(prev => ({ ...prev, content_blocks: updatedBlocks }));
    } catch (error) {
      console.log("Error resizing image:", error);
      alert("Failed to resize image. Please try again.");
    }
  };

  const printNote = (note, options = printOptions) => {
    const printWindow = window.open('', '_blank');

    const blocksHtml = (note.content_blocks || []).map(block => {
      if (block.type === "image" && options.includeImages) {
        return `<div style="text-align: center; margin: 1.5em 0;"><img src="${block.content}" style="width: ${block.width}%; max-width: 600px; height: auto; border: 2px solid #e5e7eb; border-radius: 8px;" alt="Study visual" /></div>`;
      } else if (block.type === "text") {
        return `<div class="content">${block.content.replace(/\n/g, '<br>')}</div>`;
      }
      return '';
    }).join('');

    const accentColor = options.colorMode === 'color' ? '#059669' : '#000000';

    printWindow.document.write(`
      <html>
        <head>
          <title>${note.title}</title>
          <style>
            @page {
              margin: 0.75in;
              size: letter;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #1a1a1a;
              background: white;
              padding: 0;
            }
            .header {
              margin-bottom: 0.5in;
              padding-bottom: 0.2in;
              border-bottom: 3px solid ${accentColor};
            }
            .header .name {
              font-size: 10pt;
              line-height: 1.4;
              margin-bottom: 0.05in;
              color: #4b5563;
            }
            .title {
              font-size: 18pt;
              font-weight: bold;
              color: ${accentColor};
              margin-top: 0.15in;
              text-align: center;
            }
            .content {
              margin-bottom: 0.15in;
              line-height: 1.7;
            }
            .content strong {
              color: ${accentColor};
              font-weight: 700;
            }
            .content em {
              font-style: italic;
              color: #374151;
            }
            img {
              max-width: 100%;
              display: block;
              margin: 0.5in auto;
              page-break-inside: avoid;
              ${options.colorMode === 'bw' ? 'filter: grayscale(100%);' : ''}
            }
            p {
              margin-bottom: 0.12in;
              orphans: 3;
              widows: 3;
            }
            ul, ol {
              margin-left: 0.3in;
              margin-bottom: 0.12in;
            }
            li {
              margin-bottom: 0.08in;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
              h1, h2, h3 {
                page-break-after: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${options.includeHeader ? `
          <div class="header">
            <div class="name">Name: _______________________</div>
            <div class="name">Class: _______________________</div>
            <div class="name">Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>` : ''}
          <h1 class="title">${note.title}</h1>
          <div style="margin-top: 0.3in;">
            ${blocksHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filteredNotes = notes.filter(note =>
    !searchQuery ||
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper function for page URLs (assuming simple slugification or direct paths)
  const createPageUrl = (pageName) => {
    switch(pageName) {
      case "Library": return "/library"; // Or your actual library path
      case "GenerateTest": return "/generate-test"; // Or your actual generate test path
      default: return `/${pageName.toLowerCase().replace(/\s/g, '-')}`;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">AI Study Notes</h1>
                <p className="text-gray-600 mt-1">Generate notes with formulas, examples, and images</p>
              </div>
              <Button
                onClick={() => setShowDialog(true)}
                className="text-white rounded-xl"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Notes
              </Button>
            </div>

            {notes.length > 0 && (
              <>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => e.target.value.length <= 500 && setSearchQuery(e.target.value)}
                      className="pl-10 rounded-xl border-sage-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {filteredNotes.map(note => {
                    const colorScheme = NOTE_COLORS[note.color];
                    const firstLetter = note.title ? note.title.charAt(0) : '';
                    const restOfTitle = note.title ? note.title.slice(1) : '';

                    return (
                      <Card
                        key={note.id}
                        className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-2 cursor-pointer"
                        style={{
                          backgroundColor: colorScheme.bg,
                          borderColor: colorScheme.border
                        }}
                        onClick={() => openNote(note)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg" style={{ color: '#ffffff' }}>
                            {firstLetter && <span className="font-extrabold text-xl">{firstLetter}</span>}{restOfTitle}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(note.id);
                            }}
                            className="h-8 w-8 hover:bg-white/50"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: '#ffffff' }} />
                          </Button>
                        </div>

                        <div
                          className="text-sm mb-3 line-clamp-4"
                          style={{ color: '#ffffff' }}
                        >
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}) => <p className="mb-2" style={{ color: '#ffffff' }} {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold" style={{ color: '#ffffff' }} {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside" style={{ color: '#ffffff' }} {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside" style={{ color: '#ffffff' }} {...props} />,
                            }}
                          >
                            {note.content}
                          </ReactMarkdown>
                        </div>

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map((tag, idx) => (
                              <Badge
                                key={idx}
                                className="rounded-lg text-white text-xs"
                                style={{ backgroundColor: colorScheme.border }}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {notes.length === 0 && (
              <Card className="rounded-2xl p-12 text-center border-2" style={{ borderColor: 'var(--sage-200)' }}>
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes yet</h3>
                <p className="text-gray-600 mb-6">Generate your first AI study notes</p>
                <Button
                  onClick={() => setShowDialog(true)}
                  className="text-white rounded-xl"
                  style={{ backgroundColor: 'var(--sage-600)' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Notes
                </Button>
              </Card>
            )}
          </div>

          {/* Right Sidebar - Quick Actions & Hints */}
          <div className="hidden xl:block w-64 space-y-4">
            {/* Quick Actions */}
            <Card className="rounded-xl p-4 border-2" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--sage-600)' }}>
                <Sparkles className="w-3 h-3" />
                QUICK ACTIONS
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowDialog(true)}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <p className="text-xs font-semibold text-white">📝 New Note</p>
                  <p className="text-[10px] text-gray-400">Generate AI notes</p>
                </button>
                <button
                  onClick={() => setSearchQuery("")}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <p className="text-xs font-semibold text-white">🔍 Clear Search</p>
                  <p className="text-[10px] text-gray-400">Reset filters</p>
                </button>
                <Link to={createPageUrl("Library")}>
                  <button className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <p className="text-xs font-semibold text-white">📚 Library</p>
                    <p className="text-[10px] text-gray-400">View materials</p>
                  </button>
                </Link>
                <Link to={createPageUrl("GenerateTest")}>
                  <button className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <p className="text-xs font-semibold text-white">🎯 Practice Test</p>
                    <p className="text-[10px] text-gray-400">Test your knowledge</p>
                  </button>
                </Link>
              </div>
            </Card>

            {/* Study Hints */}
            <Card className="rounded-xl p-4 border-2" style={{ borderColor: '#f59e0b', backgroundColor: '#92400e' }}>
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-amber-300">
                <Lightbulb className="w-3 h-3" />
                STUDY HINTS
              </h3>
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <p className="text-xs font-semibold text-white mb-1">💡 Use Markdown</p>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    # Heading, **bold**, *italic*, - lists
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <p className="text-xs font-semibold text-white mb-1">🎨 Color Code</p>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Use different colors for subjects
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <p className="text-xs font-semibold text-white mb-1">📷 Add Images</p>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Upload diagrams and formulas
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <p className="text-xs font-semibold text-white mb-1">🏷️ Tag Everything</p>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Makes notes easier to find later
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <p className="text-xs font-semibold text-white mb-1">🖨️ Print Ready</p>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Notes format perfectly for printing
                  </p>
                </div>
              </div>
            </Card>

            {/* Pro Tips */}
            <Card className="rounded-xl p-4 border-2" style={{ borderColor: '#8b5cf6', backgroundColor: '#6d28d9' }}>
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-purple-300">
                <Star className="w-3 h-3" />
                PRO TIPS
              </h3>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-200 leading-relaxed">
                  ✨ AI generates structured notes with headings, examples, and formulas
                </p>
                <p className="text-[10px] text-gray-200 leading-relaxed">
                  📝 Edit notes after generation to add your own insights
                </p>
                <p className="text-[10px] text-gray-200 leading-relaxed">
                  🔄 Review notes regularly using spaced repetition
                </p>
                <p className="text-[10px] text-gray-200 leading-relaxed">
                  🎯 Combine with practice tests for best results
                </p>
              </div>
            </Card>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Generate AI Study Notes
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <Label className="mb-3 block text-base font-semibold">Note Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(NOTE_COLORS).map(([color, scheme]) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="h-12 rounded-xl border-2 transition-all capitalize"
                      style={{
                        backgroundColor: selectedColor === color ? 'var(--sage-600)' : '#1a1a1a',
                        color: selectedColor === color ? '#000000' : '#ffffff',
                        borderColor: 'var(--sage-600)'
                      }}
                    >
                      <span className="text-xs font-medium">
                        {color}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <Checkbox
                  id="include-questions"
                  checked={includeQuestions}
                  onCheckedChange={setIncludeQuestions}
                />
                <Label htmlFor="include-questions" className="cursor-pointer text-blue-900 font-medium">
                  Include practice questions in the notes
                </Label>
              </div>

              <div>
                <Label className="mb-3 block text-base font-semibold">Select a Topic to Generate Notes</Label>

                {Object.keys(groupedBySubjectAndTopic).length === 0 ? (
                  <Card className="rounded-xl p-8 text-center border" style={{ borderColor: 'var(--sage-200)' }}>
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-600">No study materials yet. Add materials first to generate notes.</p>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(groupedBySubjectAndTopic).map(([subject, topics]) => {
                      const isExpanded = expandedSubjects[subject];

                      return (
                        <Card
                          key={subject}
                          className="rounded-xl border overflow-hidden"
                          style={{ borderColor: 'var(--sage-200)' }}
                        >
                          <button
                            onClick={() => toggleSubject(subject)}
                            className="w-full p-4 bg-white hover:bg-sage-50 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Folder className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                              <div className="text-left">
                                <h3 className="font-bold text-gray-900">{subject}</h3>
                                <p className="text-xs text-gray-600">
                                  {Object.keys(topics).length} topics
                                </p>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="bg-sage-50 p-3 space-y-2 border-t" style={{ borderColor: 'var(--sage-200)' }}>
                              {Object.entries(topics).map(([topic, topicMaterials]) => (
                                <button
                                  key={topic}
                                  onClick={() => generateNotes(subject, topic)}
                                  disabled={isGenerating}
                                  className="w-full p-3 bg-white rounded-lg hover:bg-sage-50 transition-all text-left border"
                                  style={{ borderColor: 'var(--sage-200)' }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Folder className="w-4 h-4 text-blue-500" />
                                      <div>
                                        <p className="font-semibold text-gray-900">{topic}</p>
                                        <p className="text-xs text-gray-600">
                                          {topicMaterials.length} questions
                                        </p>
                                      </div>
                                    </div>
                                    <Sparkles className="w-4 h-4" style={{ color: 'var(--sage-600)' }} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {isGenerating && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--sage-600)' }} />
                  <span className="ml-3 text-gray-600">Generating comprehensive notes...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNoteView} onOpenChange={setShowNoteView}>
          <DialogContent className="rounded-2xl max-w-5xl max-h-[90vh] flex flex-col p-0" style={{ backgroundColor: '#ffffff' }}>
            {selectedNote && (
              <>
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb', backgroundColor: '#ffffff' }}>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-2xl font-bold" style={{ color: '#000000', fontFamily: 'Times New Roman, serif' }}>
                      {selectedNote.title}
                    </DialogTitle>
                    <Button
                      onClick={() => setShowPrintOptions(true)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      style={{ borderColor: 'var(--sage-600)', backgroundColor: 'white', color: '#000000' }}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                  {selectedNote.tags && selectedNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedNote.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="rounded-lg" style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </DialogHeader>

                <style>{`
                  .hierarchy-content {
                    font-family: 'Times New Roman', serif;
                    color: #000000 !important;
                    line-height: 1.8;
                  }
                  
                  .hierarchy-content * {
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content h1 {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 16px;
                    margin-top: 24px;
                    color: #000000 !important;
                    border-bottom: 2px solid #000000;
                    padding-bottom: 8px;
                  }
                  
                  .hierarchy-content h2 {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 12px;
                    margin-top: 20px;
                    margin-left: 20px;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content h3 {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    margin-top: 16px;
                    margin-left: 40px;
                    color: #000000 !important;
                    font-style: italic;
                  }
                  
                  .hierarchy-content p {
                    font-size: 16px;
                    margin-bottom: 12px;
                    margin-left: 60px;
                    text-align: justify;
                    text-indent: 40px;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content strong {
                    font-weight: bold;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content em {
                    font-style: italic;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content ul {
                    margin-bottom: 12px;
                    margin-left: 100px;
                    list-style-type: disc;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content ol {
                    margin-bottom: 12px;
                    margin-left: 100px;
                    list-style-type: decimal;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content li {
                    margin-bottom: 8px;
                    padding-left: 8px;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content ul ul {
                    margin-left: 40px;
                    list-style-type: circle;
                  }
                  
                  .hierarchy-content ol ol {
                    margin-left: 40px;
                    list-style-type: lower-alpha;
                  }
                  
                  .hierarchy-content blockquote {
                    margin-left: 80px;
                    padding-left: 20px;
                    border-left: 3px solid #000000;
                    font-style: italic;
                    color: #000000 !important;
                  }
                  
                  .hierarchy-content code {
                    font-family: 'Courier New', monospace;
                    background-color: #f5f5f5;
                    padding: 2px 6px;
                    border-radius: 3px;
                    color: #000000 !important;
                  }
                  
                  /* Force all text elements to be black */
                  .hierarchy-content span,
                  .hierarchy-content div,
                  .hierarchy-content a {
                    color: #000000 !important;
                  }
                `}</style>

                <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                  <div className="space-y-4 max-w-5xl mx-auto" style={{ color: '#000000' }}>
                    {(selectedNote.content_blocks || []).map((block, blockIndex) => (
                      <div key={blockIndex} style={{ color: '#000000' }}>
                        {block.type === "text" ? (
                          <div className="hierarchy-content" style={{ color: '#000000' }}>
                            <ReactMarkdown
                              components={{
                                h1: ({node, ...props}) => <h1 style={{ color: '#000000' }} {...props} />,
                                h2: ({node, ...props}) => <h2 style={{ color: '#000000' }} {...props} />,
                                h3: ({node, ...props}) => <h3 style={{ color: '#000000' }} {...props} />,
                                p: ({node, ...props}) => <p style={{ color: '#000000' }} {...props} />,
                                strong: ({node, ...props}) => <strong style={{ color: '#000000' }} {...props} />,
                                em: ({node, ...props}) => <em style={{ color: '#000000' }} {...props} />,
                                ul: ({node, ...props}) => <ul style={{ color: '#000000' }} {...props} />,
                                ol: ({node, ...props}) => <ol style={{ color: '#000000' }} {...props} />,
                                li: ({node, ...props}) => <li style={{ color: '#000000' }} {...props} />,
                                blockquote: ({node, ...props}) => <blockquote style={{ color: '#000000' }} {...props} />,
                                code: ({node, inline, ...props}) => inline ? <code style={{ color: '#000000' }} {...props} /> : <pre><code style={{ color: '#000000' }} {...props} /></pre>,
                              }}
                            >
                              {block.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="group relative my-8" style={{ marginLeft: '60px' }}>
                            <div 
                              className="relative rounded-lg overflow-hidden mx-auto transition-all duration-200" 
                              style={{ 
                                border: '1px solid #e5e7eb',
                                width: `${block.width}%`
                              }}
                            >
                              <img 
                                src={block.content} 
                                alt={`Note image ${blockIndex + 1}`} 
                                className="w-full h-auto"
                                style={{ display: 'block' }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveBlock(blockIndex)}
                                className="absolute top-2 right-2 bg-white rounded-full shadow-sm hover:bg-red-50 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                              <span className="text-xs" style={{ color: '#000000', fontFamily: 'Times New Roman, serif' }}>Image Size:</span>
                              <input
                                type="range"
                                min="25"
                                max="100"
                                step="5"
                                value={block.width}
                                onChange={(e) => handleResizeImage(blockIndex, parseInt(e.target.value))}
                                className="flex-1 max-w-xs"
                                style={{ accentColor: 'var(--sage-600)' }}
                              />
                              <span className="text-xs font-medium w-12" style={{ color: '#000000', fontFamily: 'Times New Roman, serif' }}>{block.width}%</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="group/insert relative h-8 flex items-center justify-center my-4">
                          <div className="absolute inset-0 flex items-center opacity-0 group-hover/insert:opacity-100 transition-opacity">
                            <div className="w-full border-t border-dashed border-gray-300"></div>
                          </div>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleImageUpload(e, blockIndex)}
                              className="hidden"
                              id={`image-upload-${blockIndex}`}
                            />
                            <Button
                              onClick={() => document.getElementById(`image-upload-${blockIndex}`).click()}
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover/insert:opacity-100 transition-opacity rounded-lg h-8 px-3 bg-white"
                              style={{ borderColor: 'var(--sage-600)', color: '#000000', fontFamily: 'Times New Roman, serif' }}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              <span className="text-xs">Add Image</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showPrintOptions} onOpenChange={setShowPrintOptions}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Printer className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
                Print Options
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--sage-200)' }}>
                <div>
                  <Label className="font-medium text-white">Include Images</Label>
                  <p className="text-xs text-gray-400">Print all images in the notes</p>
                </div>
                <Checkbox
                  checked={printOptions.includeImages}
                  onCheckedChange={(checked) => setPrintOptions(prev => ({ ...prev, includeImages: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--sage-200)' }}>
                <div>
                  <Label className="font-medium text-white">Include Header</Label>
                  <p className="text-xs text-gray-400">Name, class, and date fields</p>
                </div>
                <Checkbox
                  checked={printOptions.includeHeader}
                  onCheckedChange={(checked) => setPrintOptions(prev => ({ ...prev, includeHeader: checked }))}
                />
              </div>

              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--sage-200)' }}>
                <Label className="font-medium mb-3 block text-white">Color Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPrintOptions(prev => ({ ...prev, colorMode: 'color' }))}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      printOptions.colorMode === 'color' ? 'border-sage-600 bg-sage-600/20' : 'border-gray-600'
                    }`}
                    style={{ color: '#ffffff' }}
                  >
                    <p className="font-medium text-sm">Color</p>
                    <p className="text-xs opacity-75">Full color printing</p>
                  </button>
                  <button
                    onClick={() => setPrintOptions(prev => ({ ...prev, colorMode: 'bw' }))}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      printOptions.colorMode === 'bw' ? 'border-sage-600 bg-sage-600/20' : 'border-gray-600'
                    }`}
                    style={{ color: '#ffffff' }}
                  >
                    <p className="font-medium text-sm">Black & White</p>
                    <p className="text-xs opacity-75">Grayscale for ink saving</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPrintOptions(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  printNote(selectedNote, printOptions);
                  setShowPrintOptions(false);
                }}
                className="flex-1 rounded-xl text-white"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}