import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  CreditCard,
  Shield,
  Globe,
  HelpCircle,
  LogOut,
  MessageSquare,
  X,
  Send,
  Loader2,
  Trash2,
  CheckCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español (Spanish)" },
  { code: "fr", name: "Français (French)" },
  { code: "de", name: "Deutsch (German)" },
  { code: "it", name: "Italiano (Italian)" },
  { code: "pt", name: "Português (Portuguese)" },
  { code: "ru", name: "Русский (Russian)" },
  { code: "zh", name: "中文 (Chinese)" },
  { code: "ja", name: "日本語 (Japanese)" },
  { code: "ko", name: "한국어 (Korean)" },
  { code: "ar", name: "العربية (Arabic)" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "nl", name: "Nederlands (Dutch)" },
  { code: "tr", name: "Türkçe (Turkish)" },
  { code: "pl", name: "Polski (Polish)" }
];

export default function Settings() {
  const navigate = useNavigate();
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpMessages, setHelpMessages] = useState([
    { role: "assistant", content: "Hi! I'm here to help you with any issues or questions about AcademiaAI. What do you need help with?" }
  ]);
  const [helpInput, setHelpInput] = useState("");
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  const helpScrollRef = React.useRef(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState(null);
  const [showCancelDeletionDialog, setShowCancelDeletionDialog] = useState(false);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    if (helpScrollRef.current) {
      helpScrollRef.current.scrollTop = helpScrollRef.current.scrollHeight;
    }
  }, [helpMessages]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to load user:", error);
      setUser(null);
    }
  };

  const handleLightModeToggle = () => {
    const newMode = !lightMode;
    setLightMode(newMode);
    localStorage.setItem('lightMode', newMode.toString());
    // Dispatch custom event to notify Layout
    window.dispatchEvent(new Event('lightModeChange'));
  };

  const handlePaymentClick = () => {
    alert("Payment plans coming soon! We'll be offering premium features in the near future.");
  };

  const handlePrivacyClick = () => {
    alert("Privacy Policy to be added soon.");
  };

  const handleTermsClick = () => {
    alert("Terms of Service to be added soon.");
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    alert(`Language switching to ${LANGUAGES.find(l => l.code === language)?.name} will be available in a future update!`);
  };

  const handleHelpMessage = async () => {
    if (!helpInput.trim() || isHelpLoading) return;

    const userMessage = helpInput.trim();
    setHelpInput("");
    setHelpMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsHelpLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful customer support AI for AcademiaAI, a study platform for students.

The platform includes:
- Study Library: Upload and organize study materials by subject and topic
- Practice Tests: AI-generated tests with multiple formats (short answer, long form, multiple choice)
- Flashcards: Spaced repetition system for memorization
- Notes: Take and organize study notes with images
- Lesson Plans: Teacher-created structured learning paths (admin only)

Common issues and solutions:
- Adding materials: Use the "Add Material" button to upload screenshots, type manually, import study guides, or import slideshows
- Generating tests: Select study materials, choose question format, grade level, and generation mode (similar/rephrase/exact)
- Flashcards: Create sets from study materials, study with spaced repetition
- Account issues: Contact support via feedback button

User's question: ${userMessage}

Provide a helpful, friendly, and concise response (2-3 paragraphs max):`,
        add_context_from_internet: false
      });

      setHelpMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Help AI error:", error);
      setHelpMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble responding. Please try again or use the feedback button to contact support directly." }
      ]);
    } finally {
      setIsHelpLoading(false);
    }
  };

  const handleScheduleAccountDeletion = async () => {
    if (deleteConfirmText !== "DELETE") {
      return;
    }

    setIsDeleting(true);
    try {
      const scheduledDate = new Date().toISOString();
      await base44.auth.updateMe({
        deletion_scheduled_date: scheduledDate
      });

      alert("Account deletion scheduled. Your account will be permanently deleted in 10 days. You can cancel this anytime before then by logging back in.");

      // Logout with redirect
      window.location.href = '/';
    } catch (error) {
      console.error("Error scheduling account deletion:", error);
      alert("Failed to schedule account deletion. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleCancelAccountDeletion = async () => {
    try {
      await base44.auth.updateMe({
        deletion_scheduled_date: null
      });

      setShowCancelDeletionDialog(false);
      await loadUser();
      alert("Account deletion cancelled! Your account is safe.");
    } catch (error) {
      console.error("Error cancelling account deletion:", error);
      alert("Failed to cancel account deletion. Please try again.");
    }
  };

  const handleLogout = () => {
    // Clear everything and force logout
    base44.auth.logout();
  };

  // Calculate days remaining if deletion is scheduled
  const getDaysUntilDeletion = () => {
    if (!user?.deletion_scheduled_date) return null;

    const scheduledDate = new Date(user.deletion_scheduled_date);
    const deletionDate = new Date(scheduledDate.getTime() + (10 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const daysRemaining = Math.ceil((deletionDate - now) / (24 * 60 * 60 * 1000));

    return daysRemaining > 0 ? daysRemaining : 0;
  };

  const daysUntilDeletion = getDaysUntilDeletion();

  // Color scheme
  const bgMain = lightMode ? '#ffffff' : '#000000';
  const bgBox = lightMode ? '#f5f5f5' : '#1a1a1a';
  const textMain = lightMode ? '#000000' : '#ffffff';
  const textSecondary = lightMode ? '#666666' : '#a3a3a3';

  return (
    <div className="min-h-screen p-3 md:p-8" style={{ backgroundColor: bgMain }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3" style={{ color: textMain }}>
            <SettingsIcon className="w-6 h-6 md:w-10 md:h-10" style={{ color: 'var(--sage-600)' }} />
            Settings
          </h1>
          <p className="text-sm md:text-base mt-1 md:mt-2" style={{ color: textSecondary }}>Manage your preferences and account</p>
        </div>

        <div className="space-y-4">
          {/* Account Deletion Warning Banner */}
          {user?.deletion_scheduled_date && daysUntilDeletion !== null && daysUntilDeletion >= 0 && (
            <Card className="rounded-2xl p-6 border-2 border-red-500 bg-red-900/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/20">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-400 mb-2">Account Deletion Scheduled</h3>
                  <p className="text-sm text-red-300 mb-4">
                    Your account will be permanently deleted in <span className="font-bold">{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</span>.
                    All your data will be lost. You can cancel this deletion at any time before then.
                  </p>
                  <Button
                    onClick={() => setShowCancelDeletionDialog(true)}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                  >
                    Cancel Deletion
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* UI Management */}
          <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ borderColor: 'var(--sage-200)', backgroundColor: bgBox }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: lightMode ? '#e0e0e0' : 'var(--sage-100)' }}>
                  {lightMode ? (
                    <Sun className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--sage-600)' }} />
                  ) : (
                    <Moon className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--sage-600)' }} />
                  )}
                </div>
                <div>
                  <Label className="text-base md:text-lg font-semibold" style={{ color: textMain }}>UI Theme</Label>
                  <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: textSecondary }}>
                    Light/Dark mode
                  </p>
                </div>
              </div>
              <Switch
                checked={lightMode}
                onCheckedChange={handleLightModeToggle}
                className="data-[state=checked]:bg-[var(--sage-600)]"
              />
            </div>
          </Card>

          {/* Delete Account - Only show if not scheduled */}
          {(!user || !user.deletion_scheduled_date) && (
            <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ borderColor: '#ef444430', backgroundColor: '#7f1d1d15' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ef444415' }}>
                    <Trash2 className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                  </div>
                  <div>
                    <Label className="text-base md:text-lg font-semibold text-red-400">Delete Account</Label>
                    <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: textSecondary }}>
                      10-day recovery
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg md:rounded-xl border-red-500 text-red-500 hover:bg-red-500/10 text-xs md:text-sm"
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden md:inline">Delete</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Privacy & Terms - Simplified */}
          <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ borderColor: 'var(--sage-200)', backgroundColor: bgBox }}>
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
              </div>
              <div>
                <Label className="text-base md:text-lg font-semibold" style={{ color: textMain }}>Privacy & Legal</Label>
                <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: textSecondary }}>
                  Policy & terms
                </p>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3">
              <Button
                onClick={handlePrivacyClick}
                variant="outline"
                size="sm"
                className="rounded-lg md:rounded-xl flex-1 text-xs md:text-sm"
                style={{ borderColor: 'var(--sage-600)', color: textMain }}
              >
                Privacy
              </Button>
              <Button
                onClick={handleTermsClick}
                variant="outline"
                size="sm"
                className="rounded-lg md:rounded-xl flex-1 text-xs md:text-sm"
                style={{ borderColor: 'var(--sage-600)', color: textMain }}
              >
                Terms
              </Button>
            </div>
          </Card>

          {/* Help & Support */}
          <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ borderColor: 'var(--sage-200)', backgroundColor: bgBox }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                  <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                </div>
                <div>
                  <Label className="text-base md:text-lg font-semibold" style={{ color: textMain }}>Need Help?</Label>
                  <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: textSecondary }}>
                    AI support chat
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowHelpDialog(true)}
                size="sm"
                className="rounded-lg md:rounded-xl text-xs md:text-sm"
                style={{ backgroundColor: 'var(--sage-600)', color: textMain }}
              >
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Get Help</span>
              </Button>
            </div>
          </Card>

          {/* Logout */}
          <Card className="rounded-xl md:rounded-2xl p-4 md:p-6 border" style={{ borderColor: '#ef444430', backgroundColor: '#7f1d1d15' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ef444415' }}>
                  <LogOut className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                </div>
                <div>
                  <Label className="text-base md:text-lg font-semibold" style={{ color: textMain }}>Logout</Label>
                  <p className="text-xs md:text-sm mt-0.5 md:mt-1" style={{ color: textSecondary }}>
                    Sign out
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
                className="rounded-lg md:rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm"
              >
                <LogOut className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="rounded-2xl max-w-md h-[600px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-100)' }}>
                <HelpCircle className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
              </div>
              Help & Support
            </DialogTitle>
            <DialogDescription>
              Ask our AI assistant anything about using AcademiaAI
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6" ref={helpScrollRef}>
            <div className="space-y-4">
              {helpMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-3 shadow-sm`}
                    style={{
                      backgroundColor: message.role === "user" ? 'var(--sage-600)' : '#2a2a2a',
                      color: '#ffffff',
                      border: 'none'
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#ffffff' }}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isHelpLoading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-3xl px-5 py-3 shadow-sm"
                    style={{
                      backgroundColor: '#2a2a2a',
                      border: 'none'
                    }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
            <div className="flex gap-2">
              <Input
                value={helpInput}
                onChange={(e) => e.target.value.length <= 500 && setHelpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleHelpMessage();
                  }
                }}
                placeholder="Describe your issue..."
                className="rounded-xl border-sage-200"
                disabled={isHelpLoading}
              />
              <Button
                onClick={handleHelpMessage}
                disabled={isHelpLoading || !helpInput.trim()}
                className="rounded-xl text-white flex-shrink-0"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Schedule Account Deletion?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-white font-semibold">
                Your account will be scheduled for deletion with a 10-day recovery period.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-200 text-sm font-semibold mb-1">⏰ 10-Day Recovery Window</p>
                <p className="text-yellow-100 text-xs">
                  You can cancel the deletion anytime within 10 days by logging back in. After 10 days, your account and all data will be permanently deleted.
                </p>
              </div>
              <p className="text-white font-semibold text-sm">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                <li>All your study materials</li>
                <li>All test sessions and scores</li>
                <li>All flashcard sets and progress</li>
                <li>All notes</li>
                <li>All study groups you own</li>
                <li>Your account information</li>
              </ul>
              <div className="mt-4">
                <Label className="text-white text-sm mb-2 block">
                  Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm:
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="rounded-xl"
                  style={{ backgroundColor: '#1a1a1a', color: '#ffffff', borderColor: '#ef4444' }}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
              style={{ color: '#ffffff' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleScheduleAccountDeletion}
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Schedule Deletion
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Deletion Dialog */}
      <AlertDialog open={showCancelDeletionDialog} onOpenChange={setShowCancelDeletionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Cancel Account Deletion?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-white">
                Your account deletion is currently scheduled for <span className="font-bold">{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</span> from now.
              </p>
              <p className="text-gray-300">
                If you cancel, your account will remain active and all your data will be preserved. You can schedule deletion again at any time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ color: '#ffffff' }}>
              Keep Scheduled
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAccountDeletion}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Cancel Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}