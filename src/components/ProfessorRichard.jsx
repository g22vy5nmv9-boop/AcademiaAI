import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const ProfessorAvatar = ({ size = 40 }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head - orange oval */}
    <ellipse cx="50" cy="50" rx="30" ry="40" fill="#ff8833" />
    
    {/* Zigzag hair on top */}
    <path 
      d="M 25 25 L 32 35 L 38 25 L 44 35 L 50 25 L 56 35 L 62 25 L 68 35 L 75 25" 
      stroke="#2d5a3f" 
      strokeWidth="3" 
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    
    {/* Glasses Frame - big round glasses */}
    <g stroke="#000000" strokeWidth="5" fill="none">
      {/* Left lens */}
      <circle cx="37" cy="40" r="13" />
      {/* Right lens */}
      <circle cx="63" cy="40" r="13" />
      {/* Bridge */}
      <line x1="50" y1="40" x2="50" y2="40" strokeWidth="4" />
    </g>
    
    {/* Eyes - whites */}
    <circle cx="37" cy="40" r="11" fill="white" />
    <circle cx="63" cy="40" r="11" fill="white" />
    
    {/* Pupils */}
    <circle cx="39" cy="41" r="6" fill="#000000" />
    <circle cx="65" cy="41" r="6" fill="#000000" />
    
    {/* Highlights in eyes */}
    <circle cx="40" cy="39" r="2" fill="white" opacity="0.9" />
    <circle cx="66" cy="39" r="2" fill="white" opacity="0.9" />
    
    {/* VERY LONG NOSE - extends way down */}
    <path 
      d="M 50 47 Q 48 75, 50 110 Q 52 75, 50 47" 
      stroke="#000000" 
      strokeWidth="3" 
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export default function ProfessorRichard() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm Professor Richard, your AI study buddy! 🎓 I can help you with:\n\n• Choosing the right question types for your tests\n• Adjusting difficulty levels and grade settings\n• Creating and organizing flashcards\n• Writing better study notes\n• Study strategies and tips\n• Understanding concepts\n\nWhat would you like help with today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getCurrentPageContext = () => {
    const path = location.pathname;
    
    if (path.includes('GenerateTest')) {
      return {
        page: 'Generate Test',
        context: 'The student is creating a practice test. Help them choose appropriate question formats (multiple choice, short answer, long form), select the right difficulty level and grade level, decide between similar/rephrase/exact question modes, and organize their study materials effectively.'
      };
    } else if (path.includes('TakeTest')) {
      return {
        page: 'Taking Test',
        context: 'The student is currently taking a test. Help them with test-taking strategies, time management, and staying focused. If they ask about specific questions, encourage them to think through the problem.'
      };
    } else if (path.includes('TestResults')) {
      return {
        page: 'Test Results',
        context: 'The student is viewing their test results. Help them understand their mistakes, suggest areas to focus on, and recommend study strategies for improvement.'
      };
    } else if (path.includes('Flashcards')) {
      return {
        page: 'Flashcards',
        context: 'The student is working with flashcards. Help them create effective flashcard sets, organize cards by topic, and use spaced repetition effectively.'
      };
    } else if (path.includes('StudyFlashcards')) {
      return {
        page: 'Studying Flashcards',
        context: 'The student is actively studying flashcards. Help them with memorization techniques, understanding concepts, and effective review strategies.'
      };
    } else if (path.includes('Notes')) {
      return {
        page: 'Notes',
        context: 'The student is working on study notes. Help them organize notes effectively, use AI to generate comprehensive notes, and structure information for better retention.'
      };
    } else if (path.includes('Library')) {
      return {
        page: 'Library',
        context: 'The student is browsing their study materials library. Help them organize materials by subject and topic, filter content, and decide what to study next.'
      };
    } else if (path.includes('AddMaterial')) {
      return {
        page: 'Add Material',
        context: 'The student is adding new study materials. Help them choose the best method (screenshot, manual entry, study guide import, slideshow), and organize content into subjects and topics.'
      };
    } else if (path.includes('LessonPlans') || path.includes('LessonPath') || path.includes('LearnLesson')) {
      return {
        page: 'Lesson Plans',
        context: 'The student is working with lesson plans. Help them understand lesson content, prepare for quizzes, and use study resources effectively.'
      };
    } else if (path.includes('Home')) {
      return {
        page: 'Home',
        context: 'The student is on the home dashboard. Help them plan their study session, decide what to focus on, and get started with the right activity.'
      };
    }
    
    return {
      page: 'AcademiaAI',
      context: 'The student is using the study platform. Provide general guidance on using the app effectively.'
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    const pageContext = getCurrentPageContext();

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Professor Richard, a friendly and knowledgeable AI study assistant. You help students with:

1. **Test Generation & Settings:**
   - Recommend question formats:
     * MULTIPLE CHOICE: Best for memorization, standardized test prep, quick recall. Each question has 4 options with ONLY ONE correct answer.
     * SHORT ANSWER: Best for demonstrating understanding of concepts, definitions, vocabulary. 1-3 sentence responses.
     * LONG FORM: Best for analysis, synthesis, essay practice. Requires deeper thinking.
   - When to include/exclude question types:
     * Studying for SAT/ACT? Focus on multiple choice
     * Vocabulary test? Use short answer
     * AP exam prep? Mix all three
     * Quick review? Short answer
   - Suggest appropriate grade levels and difficulty settings
   - Explain the difference between generation modes:
     * "Similar" = AI creates NEW questions on the same topics (best for comprehensive review)
     * "Rephrase" = AI rewords your questions differently EACH TIME (great for varied practice)
     * "Exact" = Use your questions exactly as written (for precise memorization)
   - Questions are RANDOMIZED each test - different order and different rephrased versions
   - Help organize study materials by subject and topic
   - Suggest how many questions to include based on study goals

2. **Flashcards:**
   - Create effective flashcard sets with clear front/back content
   - Organize cards by subject and topic
   - Explain spaced repetition and how to use it
   - Suggest when to mark cards as "mastered"

3. **Study Notes:**
   - Help structure notes for better retention
   - Suggest what to include in AI-generated notes
   - Recommend organization by color coding and tags

4. **General Study Strategies:**
   - Active recall techniques
   - Spaced repetition scheduling
   - Focus on weak areas
   - Effective review methods

**CURRENT CONTEXT:**
Page: ${pageContext.page}
Context: ${pageContext.context}

Be conversational, encouraging, and provide SPECIFIC, ACTIONABLE advice. Use emojis occasionally. Keep responses concise (2-3 paragraphs max).

**CRITICAL:** When giving advice about test settings:
- Grade 9-12 = High school level difficulty
- College = Undergraduate level
- Graduate = Advanced/Graduate level
- Adjust vocabulary and complexity accordingly

Student's question: ${userMessage}

Provide helpful, specific advice:`,
        add_context_from_internet: false
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Professor Richard error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Oops! I had a little trouble there. Could you try asking that again? 🤔"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          animation: "pulse 2s infinite"
        }}
      >
        <div style={{ marginTop: '-12px' }}>
          <ProfessorAvatar size={56} />
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </button>
    );
  }

  return (
    <Card
      className="fixed bottom-6 right-6 shadow-2xl border-2 z-50 flex flex-col overflow-hidden transition-all duration-300"
      style={{
        width: isMinimized ? "320px" : "400px",
        height: isMinimized ? "60px" : "600px",
        borderColor: "#059669",
        backgroundColor: "#000000"
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between border-b cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          borderColor: "#047857"
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            <div style={{ marginTop: '-8px' }}>
              <ProfessorAvatar size={44} />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Professor Richard</h3>
            <p className="text-xs text-white/80">Your AI Study Buddy</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-2xl px-4 py-3 shadow-sm"
                    style={{
                      backgroundColor: message.role === "user" ? "#059669" : "#1a1a1a",
                      color: "#ffffff"
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 shadow-sm"
                    style={{ backgroundColor: "#1a1a1a" }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t" style={{ borderColor: "#1a1a1a" }}>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => e.target.value.length <= 500 && setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Professor Richard..."
                className="rounded-xl border-gray-700 bg-gray-900 text-white"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="rounded-xl text-white flex-shrink-0"
                style={{ backgroundColor: "#059669" }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}