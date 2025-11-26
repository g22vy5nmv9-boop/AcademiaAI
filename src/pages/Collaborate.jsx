import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Search,
  UserPlus,
  BookOpen,
  MessageCircle,
  Send,
  Plus,
  Copy,
  Check,
  Loader2,
  Download,
  AlertCircle,
  X, // Added X icon for kick member
  Upload, // Added Upload icon for import materials
  ClipboardList, // Added for Take Test button
  CheckCircle, // Added for Fact Check dialog
  GraduationCap, // Added for leaderboard filter
  Trophy // Added for leaderboard filter
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Content filter for chat messages
const OFFENSIVE_WORDS = [
  'n*gger', 'n*gga', 'f*ggot', 'f*g', 'tr*nny', 'tr*nnie', 'k*ke', 'ch*nk',
  'sp*c', 'wet*ack', 'r*tard', 'r*tard*d', 'n*zi', 'd*ke', 'c*nt',
  'f*ck', 'sh*t', 'b*tch', 'wh*re', 'sl*t', 'c*ck', 'p*ssy', 'd*ck'
];

const checkOffensiveContent = (text) => {
  const lowerText = text.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const word of OFFENSIVE_WORDS) {
    const pattern = word.replace(/\*/g, '[a-z0-9]*');
    const regex = new RegExp(pattern, 'i');
    if (regex.test(lowerText)) {
      return true;
    }
  }
  return false;
};

// Placeholder for createPageUrl, adapt to your routing solution (e.g., Next.js router.push)
const createPageUrl = (path) => {
  // For a client-side only app, this might directly set window.location or use a routing library.
  // Assuming a direct path is acceptable for navigation or will be handled by a router.
  return path;
};

export default function Collaborate() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("groups");
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Study Groups
  const [studyGroups, setStudyGroups] = useState([]);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [showGroupDetailDialog, setShowGroupDetailDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupSubject, setNewGroupSubject] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Group Chat
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatScrollRef = React.useRef(null);

  // New state for topic management
  const [newTopicName, setNewTopicName] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false); // This dialog now becomes the multi-tab material creator
  const [addMaterialTab, setAddMaterialTab] = useState("manual");

  // New states for import materials (for the old dedicated import dialog, kept as per instruction)
  const [showImportMaterialsDialog, setShowImportMaterialsDialog] = useState(false);
  const [userMaterials, setUserMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  // New state for topic search and testing
  const [searchTopicQuery, setSearchTopicQuery] = useState("");
  const [showTopicTestDialog, setShowTopicTestDialog] = useState(false); // This state is declared but not actively used for a dedicated dialog in this implementation
  const [topicForTest, setTopicForTest] = useState(null);
  const [isGeneratingTopicTest, setIsGeneratingTopicTest] = useState(false);

  // New state for fact checking
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState([]);
  const [showFactCheckDialog, setShowFactCheckDialog] = useState(false);
  const [selectedTopicForFactCheck, setSelectedTopicForFactCheck] = useState(null);

  // New state for leaderboard filter
  const [leaderboardFilter, setLeaderboardFilter] = useState("world"); // Default to 'world'

  useEffect(() => {
    loadUser();
    loadStudyGroups();
    
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

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedGroup?.chat_messages]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const loadStudyGroups = async () => {
    try {
      const groups = await base44.entities.StudyGroup.list("-created_date");
      setStudyGroups(groups || []);
    } catch (error) {
      setStudyGroups([]);
    }
  };

  const loadUserMaterials = async () => {
    try {
      const materials = await base44.entities.StudyMaterial.list("-created_date");
      setUserMaterials(materials || []);
    } catch (error) {
      setUserMaterials([]);
    }
  };

  const handleSearchUsername = async () => {
    if (!friendUsername.trim() || friendUsername.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const users = await base44.entities.User.list();
      const results = users.filter(u =>
        u.username &&
        u.username.toLowerCase().includes(friendUsername.toLowerCase()) &&
        u.id !== user?.id
      );
      setSearchResults(results);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    const debounce = setTimeout(() => {
      if (friendUsername.length >= 3) {
        handleSearchUsername();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [friendUsername, user]);

  const handleAddFriend = async (selectedUser) => {
    alert(`Aw nuts! 😅 Friend requests aren't available yet, but we're working on it! For now, you can invite ${selectedUser.username} to your study groups using the group invite code.`);
    setFriendUsername("");
    setSearchResults([]);
    setShowAddFriendDialog(false);
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;

    try {
      const inviteCode = generateInviteCode();

      const newGroup = await base44.entities.StudyGroup.create({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        subject: newGroupSubject.trim(),
        owner_id: user.id,
        owner_username: user.username,
        members: [{
          user_id: user.id,
          username: user.username,
          joined_date: new Date().toISOString()
        }],
        shared_materials: [],
        chat_messages: [],
        invite_code: inviteCode
      });

      await loadStudyGroups();
      setShowCreateGroupDialog(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupSubject("");
      setSelectedGroup(newGroup);
      setShowGroupDetailDialog(true);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim() || !user) return;

    try {
      const groups = await base44.entities.StudyGroup.list();
      const group = groups.find(g => g.invite_code === joinCode.trim().toUpperCase());

      if (!group) {
        alert("Aw nuts! 😅 That invite code doesn't exist. Please double-check the code and try again. Make sure you're entering all 6 characters.");
        return;
      }

      const isMember = group.members.some(m => m.user_id === user.id);
      if (isMember) {
        alert("Aw nuts! 😅 You're already a member of this group! Check your Study Groups tab to see it.");
        setJoinCode("");
        setShowJoinGroupDialog(false);
        return;
      }

      const updatedMembers = [
        ...group.members,
        {
          user_id: user.id,
          username: user.username,
          joined_date: new Date().toISOString()
        }
      ];

      await base44.entities.StudyGroup.update(group.id, {
        members: updatedMembers
      });

      await loadStudyGroups();
      setJoinCode("");
      setShowJoinGroupDialog(false);
      alert(`Successfully joined ${group.name}!`);
    } catch (error) {
      console.error("Error joining group:", error);
      alert("Aw nuts! 😅 We couldn't add you to the group. Please check your internet connection and try again.");
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedGroup || !user || isSendingMessage) return;

    if (checkOffensiveContent(chatMessage)) {
      alert("Aw nuts! 😅 Your message contains inappropriate language. Please remove offensive words before sending. We want to keep the chat friendly for everyone!");
      return;
    }

    setIsSendingMessage(true);

    try {
      const newMessage = {
        sender_id: user.id,
        sender_username: user.username,
        message: chatMessage.trim(),
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...(selectedGroup.chat_messages || []), newMessage];

      await base44.entities.StudyGroup.update(selectedGroup.id, {
        chat_messages: updatedMessages
      });

      setSelectedGroup({
        ...selectedGroup,
        chat_messages: updatedMessages
      });

      setChatMessage("");
      await loadStudyGroups();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Aw nuts! 😅 Your message couldn't be sent. Please check your internet connection and try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKickMember = async (memberId) => {
    if (!selectedGroup || !user) return;
    if (selectedGroup.owner_id !== user.id) {
      alert("Aw nuts! 😅 Only the group owner can remove members. If you're having issues with a member, contact the group owner.");
      return;
    }

    if (memberId === user.id) {
      alert("Aw nuts! 😅 You can't remove yourself from the group! If you want to leave, you'll need to transfer ownership first.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to remove this member from the group?");
    if (!confirmed) return;

    try {
      const updatedMembers = selectedGroup.members.filter(m => m.user_id !== memberId);

      await base44.entities.StudyGroup.update(selectedGroup.id, {
        members: updatedMembers
      });

      setSelectedGroup({
        ...selectedGroup,
        members: updatedMembers
      });

      await loadStudyGroups();
      alert("Member removed successfully.");
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Aw nuts! 😅 We couldn't remove that member. Please check your internet connection and try again.");
    }
  };

  const handleCopyMaterialToLibrary = async (material) => {
    if (!user) return;

    try {
      await base44.entities.StudyMaterial.create({
        question: material.question,
        answer: material.answer,
        subject: selectedGroup.subject || "From Study Group",
        topic: material.topic || "Study Group Materials",
        contributed_by: material.contributed_by
      });

      alert("Material copied to your library!");
    } catch (error) {
      console.error("Error copying material:", error);
      alert("Aw nuts! 😅 We couldn't copy that material to your library. Please try again.");
    }
  };

  const handleMaterialCreated = async (materialData) => {
    // When a material is created through any method, add it to the group topic
    if (!selectedGroup || !selectedTopic || !user) return;

    try {
      const newMaterial = {
        question: materialData.question,
        answer: materialData.answer || "",
        topic: selectedTopic,
        contributed_by: user.username,
        contributed_date: new Date().toISOString()
      };

      const updatedMaterials = [...(selectedGroup.shared_materials || []), newMaterial];

      await base44.entities.StudyGroup.update(selectedGroup.id, {
        shared_materials: updatedMaterials
      });

      setSelectedGroup({
        ...selectedGroup,
        shared_materials: updatedMaterials
      });

      // Keep dialog open if user wants to add multiple materials in some tabs (e.g. screenshot)
      // For manual, it's usually one at a time.
      // So, dialog closure is handled within the helper components if needed.
      // For now, let's just update the group and reload.
      await loadStudyGroups();
    } catch (error) {
      console.error("Error adding material to group:", error);
      alert("Aw nuts! 😅 We couldn't add that material to the group. Please check your internet connection and try again.");
    }
  };


  const handleAddTopicToGroup = async () => {
    const trimmedNewTopicName = newTopicName.trim();
    if (!trimmedNewTopicName || !selectedGroup) return;

    // Check if topic already exists to just "select" it
    const topicExists = (selectedGroup.shared_materials || []).some(m => m.topic?.toLowerCase() === trimmedNewTopicName.toLowerCase());

    setSelectedTopic(trimmedNewTopicName);
    setNewTopicName("");

    if (!topicExists) {
      // If the topic truly doesn't exist, we don't need to save anything yet,
      // it will be created when the first material is added.
      alert(`Topic "${trimmedNewTopicName}" created! Now you can add questions or import materials.`);
    } else {
      alert(`Topic "${trimmedNewTopicName}" is now selected.`);
    }
  };

  const handleImportMaterials = async () => {
    if (!selectedGroup || !selectedTopic || selectedMaterials.length === 0) return;

    try {
      const newMaterials = selectedMaterials.map(material => ({
        question: material.question,
        answer: material.answer || "",
        topic: selectedTopic,
        contributed_by: user.username,
        contributed_date: new Date().toISOString()
      }));

      const updatedMaterials = [...(selectedGroup.shared_materials || []), ...newMaterials];

      await base44.entities.StudyGroup.update(selectedGroup.id, {
        shared_materials: updatedMaterials
      });

      setSelectedGroup({
        ...selectedGroup,
        shared_materials: updatedMaterials
      });

      setSelectedMaterials([]);
      setShowImportMaterialsDialog(false);
      await loadStudyGroups();
      alert(`${newMaterials.length} materials imported successfully!`);
    } catch (error) {
      console.error("Error importing materials:", error);
      alert("Failed to import materials. Please try again.");
    }
  };

  const handleDownloadTopicToLibrary = async (topicName) => {
    if (!selectedGroup || !user) return;

    const topicMaterials = (selectedGroup.shared_materials || []).filter(m => m.topic === topicName);

    if (topicMaterials.length === 0) {
      alert("No materials in this topic to download.");
      return;
    }

    try {
      for (const material of topicMaterials) {
        await base44.entities.StudyMaterial.create({
          question: material.question,
          answer: material.answer,
          subject: selectedGroup.subject || "From Study Group",
          topic: topicName,
          contributed_by: material.contributed_by
        });
      }

      alert(`Downloaded ${topicMaterials.length} materials from "${topicName}" to your library!`);
    } catch (error) {
      console.error("Error downloading topic:", error);
      alert("Failed to download topic. Please try again.");
    }
  };

  const handleTakeTopicTest = async (topicName) => {
    if (!selectedGroup || !user) return;

    const topicMaterials = (selectedGroup.shared_materials || []).filter(m => m.topic === topicName);

    if (topicMaterials.length === 0) {
      alert("No materials in this topic to generate a test.");
      return;
    }

    setTopicForTest(topicName);
    setIsGeneratingTopicTest(true);

    try {
      const questionsList = topicMaterials.map(m => m.question).join("\n");

      const prompt = `Generate 10 short answer test questions based on these study materials:

${questionsList}

Create questions that test understanding of these topics. Include brief concept explanations.`;

      const schema = {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                question_type: { type: "string", enum: ["short_answer"] },
                concept_explanation: { type: "string" },
                correct_answer: { type: "string" }
              },
              required: ["question", "question_type", "concept_explanation", "correct_answer"]
            }
          }
        },
        required: ["questions"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: schema
      });

      if (!result || !result.questions || result.questions.length === 0) {
        throw new Error("Failed to generate questions");
      }

      // Create test session
      const testSession = await base44.entities.TestSession.create({
        title: `${selectedGroup.name} - ${topicName}`,
        subject: selectedGroup.subject || "Study Group",
        grade_level: "High School", // Default or determine dynamically
        topic: topicName,
        question_format: "short_answer",
        instant_feedback: false,
        questions: result.questions.map(q => ({
          question: q.question,
          question_type: "short_answer",
          concept_explanation: q.concept_explanation,
          correct_answer: q.correct_answer,
          choices: [],
          study_resources: [],
          user_answer: "",
          is_correct: null
        })),
        completed: false
      });

      setIsGeneratingTopicTest(false);
      window.location.href = createPageUrl(`TakeTest?id=${testSession.id}`);
    } catch (error) {
      console.error("Error generating topic test:", error);
      alert("Failed to generate test. Please try again.");
      setIsGeneratingTopicTest(false);
    }
  };

  const handleFactCheckTopic = async (topicName) => {
    if (!selectedGroup || !user) return;

    const topicMaterials = (selectedGroup.shared_materials || []).filter(m => m.topic === topicName);

    if (topicMaterials.length === 0) {
      alert("No materials in this topic to fact check.");
      return;
    }

    setSelectedTopicForFactCheck(topicName);
    setIsFactChecking(true);
    setFactCheckResults([]); // Clear previous results
    setShowFactCheckDialog(true);

    try {
      const materialsToCheck = topicMaterials.map((m, idx) => ({
        index: idx,
        question: m.question,
        answer: m.answer,
        contributed_by: m.contributed_by
      }));

      const prompt = `You are a fact-checking AI. Review these study materials and identify any that are incorrect, incomplete, or misleading.

Materials:
${materialsToCheck.map((m, i) => `${i + 1}. Question: ${m.question}\n   Answer: ${m.answer || "No answer provided"}`).join("\n\n")}

For each material that has issues, provide:
1. The material number
2. What's wrong or incomplete
3. The correct/complete answer
4. A brief explanation

Only include materials that need correction.`;

      const schema = {
        type: "object",
        properties: {
          corrections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                material_number: { type: "number" },
                issue_description: { type: "string" },
                corrected_answer: { type: "string" },
                explanation: { type: "string" }
              },
              required: ["material_number", "issue_description", "corrected_answer", "explanation"]
            }
          }
        },
        required: ["corrections"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: schema
      });

      if (result && result.corrections) {
        setFactCheckResults(result.corrections.map(c => ({
          ...c,
          materialIndex: c.material_number - 1,
          originalMaterial: materialsToCheck[c.material_number - 1]
        })));
      } else {
        setFactCheckResults([]);
      }
    } catch (error) {
      console.error("Error fact checking:", error);
      alert("Failed to fact check materials. Please try again.");
    } finally {
      setIsFactChecking(false);
    }
  };

  const handleApplyCorrection = async (correction) => {
    if (!selectedGroup || !user) return;

    try {
      const materialIndexInTopic = correction.materialIndex;
      const topicMaterials = (selectedGroup.shared_materials || []).filter(m => m.topic === selectedTopicForFactCheck);
      const allMaterials = selectedGroup.shared_materials || [];

      // Find the actual index in the full materials array
      const materialToUpdate = topicMaterials[materialIndexInTopic];
      const fullIndex = allMaterials.findIndex(m =>
        m.question === materialToUpdate.question &&
        m.topic === materialToUpdate.topic &&
        m.contributed_by === materialToUpdate.contributed_by
      );

      if (fullIndex === -1) {
        alert("Could not find material to update.");
        return;
      }

      // Update the material
      const updatedMaterials = [...allMaterials];
      updatedMaterials[fullIndex] = {
        ...updatedMaterials[fullIndex],
        answer: correction.corrected_answer,
        contributed_by: `${updatedMaterials[fullIndex].contributed_by} (AI corrected)`
      };

      await base44.entities.StudyGroup.update(selectedGroup.id, {
        shared_materials: updatedMaterials
      });

      setSelectedGroup({
        ...selectedGroup,
        shared_materials: updatedMaterials
      });

      await loadStudyGroups();

      // Remove this correction from the list after applying
      setFactCheckResults(prev => prev.filter(c => c.materialIndex !== correction.materialIndex));

      alert("Material corrected successfully!");
    } catch (error) {
      console.error("Error applying correction:", error);
      alert("Failed to apply correction. Please try again.");
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const myGroups = studyGroups.filter(g =>
    g.members && g.members.some(m => m.user_id === user?.id)
  );

  // Group materials by topic
  const groupedMaterials = (selectedGroup?.shared_materials || []).reduce((acc, material) => {
    const topic = material.topic || "General";
    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(material);
    return acc;
  }, {});

  // Filter topics based on search
  const filteredTopics = Object.keys(groupedMaterials).filter(topic =>
    topic.toLowerCase().includes(searchTopicQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Collaborate</h1>
                <p className="text-gray-400">Study together with friends and classmates</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddFriendDialog(true)}
              className="rounded-xl text-white shadow-lg"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add Friends
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 rounded-xl p-1 h-auto" style={{ backgroundColor: 'var(--sage-100)' }}>
            <TabsTrigger
              value="groups"
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'groups' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'groups' ? '#000000' : '#ffffff'
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Study Groups ({myGroups.length})
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'people' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'people' ? '#000000' : '#ffffff'
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Friends
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'leaderboard' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'leaderboard' ? '#000000' : '#ffffff'
              }}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Study Groups Tab */}
          <TabsContent value="groups" className="mt-0">
            <div className="flex gap-3 mb-6">
              <Button
                onClick={() => setShowCreateGroupDialog(true)}
                className="rounded-xl text-white flex-1"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Study Group
              </Button>
              <Button
                onClick={() => setShowJoinGroupDialog(true)}
                variant="outline"
                className="rounded-xl flex-1"
                style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Join with Code
              </Button>
            </div>

            {myGroups.length === 0 ? (
              <Card className="rounded-2xl p-12 text-center border" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}>
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-2xl font-bold text-white mb-2">No Study Groups Yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create or join a study group to collaborate with others, share materials, and chat together!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myGroups.map((group) => (
                  <Card
                    key={group.id}
                    className="rounded-2xl p-5 border hover:shadow-lg transition-all cursor-pointer"
                    style={{ borderColor: 'var(--sage-200)', backgroundColor: '#e2e8f0' }}
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowGroupDetailDialog(true);
                      setSelectedTopic(null);
                    }}
                  >
                    <div className="flex flex-col">
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#000000' }}>{group.name}</h3>
                      {group.description && (
                        <p className="text-sm mb-3" style={{ color: '#000000' }}>{group.description}</p>
                      )}
                      {group.subject && (
                        <Badge className="self-start" style={{ backgroundColor: 'var(--sage-600)', color: '#000000' }}>
                          {group.subject}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people" className="mt-0">
            <Card className="rounded-2xl p-12 text-center border" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}>
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-bold text-white mb-2">No Friends Yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Start building your study network! Add friends by username to connect and study together.
              </p>
              <Button
                onClick={() => setShowAddFriendDialog(true)}
                className="rounded-xl text-white"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add Your First Friend
              </Button>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-0">
            <div className="space-y-6">
              <h3 className="font-semibold text-white flex items-center gap-2 text-2xl">
                <Trophy className="w-6 h-6" />
                Leaderboard
              </h3>

              {/* Filter Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setLeaderboardFilter("friends")}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-105"
                  style={{
                    backgroundColor: leaderboardFilter === "friends" ? '#10b981' : '#e2e8f0',
                    color: leaderboardFilter === "friends" ? '#ffffff' : '#000000',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#10b981'
                  }}
                >
                  <Users className="w-3 h-3 inline mr-1" />
                  Friends
                </button>
                <button
                  onClick={() => setLeaderboardFilter("school")}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-105"
                  style={{
                    backgroundColor: leaderboardFilter === "school" ? '#10b981' : '#e2e8f0',
                    color: leaderboardFilter === "school" ? '#ffffff' : '#000000',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#10b981'
                  }}
                >
                  <GraduationCap className="w-3 h-3 inline mr-1" />
                  School
                </button>
                <button
                  onClick={() => setLeaderboardFilter("world")}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-105"
                  style={{
                    backgroundColor: leaderboardFilter === "world" ? '#10b981' : '#e2e8f0',
                    color: leaderboardFilter === "world" ? '#ffffff' : '#000000',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#10b981'
                  }}
                >
                  <Trophy className="w-3 h-3 inline mr-1" />
                  World
                </button>
              </div>

              {/* Placeholder for leaderboard list */}
              <Card className="rounded-2xl p-6 text-center border" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}>
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h4 className="text-xl font-bold text-white mb-2">Coming Soon!</h4>
                <p className="text-gray-400">Leaderboards for friends, school, and world ranks will be here shortly.</p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
        <DialogContent className="rounded-2xl" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              Add Friend
            </DialogTitle>
            <DialogDescription>
              Search for friends by their username
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search username..."
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            {friendUsername.length >= 3 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((foundUser) => (
                    <Card
                      key={foundUser.id}
                      className="p-4 rounded-xl border hover:border-sage-600 transition-all cursor-pointer"
                      onClick={() => handleAddFriend(foundUser)}
                      style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{foundUser.username}</p>
                          <p className="text-sm text-gray-400">{foundUser.full_name}</p>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-xl text-white"
                          style={{ backgroundColor: 'var(--sage-600)' }}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400">No users found</p>
                  </div>
                )}
              </div>
            )}

            {friendUsername.length < 3 && friendUsername.length > 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Type at least 3 characters to search
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddFriendDialog(false);
                setFriendUsername("");
                setSearchResults([]);
              }}
              className="rounded-xl"
              style={{ color: '#000000' }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent className="rounded-2xl" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Study Group</DialogTitle>
            <DialogDescription>
              Set up a new study group to collaborate with others
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Group Name *</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., AP Biology Study Group"
                className="rounded-xl"
                maxLength={50}
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Subject</Label>
              <Input
                value={newGroupSubject}
                onChange={(e) => setNewGroupSubject(e.target.value)}
                placeholder="e.g., AP Biology"
                className="rounded-xl"
                maxLength={50}
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Description</Label>
              <Textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="What will you study together?"
                className="rounded-xl"
                maxLength={200}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateGroupDialog(false);
                setNewGroupName("");
                setNewGroupDescription("");
                setNewGroupSubject("");
              }}
              className="rounded-xl"
              style={{ color: '#000000' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="rounded-xl text-white"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
        <DialogContent className="rounded-2xl" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Join Study Group</DialogTitle>
            <DialogDescription>
              Enter the invite code shared by a group member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Invite Code</Label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                className="rounded-xl uppercase"
                maxLength={6}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowJoinGroupDialog(false);
                setJoinCode("");
              }}
              className="rounded-xl"
              style={{ color: '#000000' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinGroup}
              disabled={!joinCode.trim() || joinCode.length < 6}
              className="rounded-xl text-white"
              style={{ backgroundColor: 'var(--sage-600)' }}
            >
              Join Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Detail Dialog - Full Screen with Chat on Right */}
      <Dialog open={showGroupDetailDialog} onOpenChange={setShowGroupDetailDialog}>
        <DialogContent className="rounded-none max-w-full w-screen h-screen flex flex-col p-0 m-0" style={{ backgroundColor: '#ffffff' }}>
          {selectedGroup && (
            <>
              <DialogHeader className="p-6 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}>
                <DialogTitle className="text-2xl flex items-center justify-between text-white">
                  <span>{selectedGroup.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyInviteCode(selectedGroup.invite_code)}
                      className="rounded-xl"
                      style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}
                    >
                      {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {selectedGroup.invite_code}
                    </Button>
                  </div>
                </DialogTitle>
                {selectedGroup.description && (
                  <DialogDescription className="text-gray-300">{selectedGroup.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="flex-1 overflow-hidden flex" style={{ backgroundColor: lightMode ? 'transparent' : '#000000' }}>
                {/* Left Section - Topics & Materials Only (approx 2/3) */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Topics & Materials Section */}
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2 mb-4 text-xl">
                        <BookOpen className="w-6 h-6" />
                        Topics & Materials
                      </h3>

                      {/* Search Topics */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            value={searchTopicQuery}
                            onChange={(e) => setSearchTopicQuery(e.target.value)}
                            placeholder="Search topics..."
                            className="pl-10 rounded-xl"
                            style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', color: '#ffffff', borderColor: 'var(--sage-600)' }}
                          />
                        </div>
                      </div>

                      {/* Add Topic */}
                      <div className="mb-6">
                        <div className="flex gap-2">
                          <Input
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            placeholder="New topic name..."
                            className="rounded-xl"
                            style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', color: '#ffffff', borderColor: 'var(--sage-600)' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddTopicToGroup();
                              }
                            }}
                          />
                          <Button
                            onClick={handleAddTopicToGroup}
                            disabled={!newTopicName.trim()}
                            className="rounded-xl text-white flex-shrink-0"
                            style={{ backgroundColor: 'var(--sage-600)' }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Topic
                          </Button>
                        </div>
                      </div>

                      {/* Topics List */}
                      {filteredTopics.length === 0 && !selectedTopic ? (
                        <Card className="p-8 text-center" style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', borderColor: 'var(--sage-200)' }}>
                          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-gray-400">
                            {searchTopicQuery ? "No topics found matching your search" : "No topics yet. Create one to get started!"}
                          </p>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {selectedTopic && !groupedMaterials[selectedTopic] && (
                            <Card className="rounded-xl overflow-hidden" style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', borderColor: 'var(--sage-200)' }}>
                              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--sage-200)' }}>
                                <div>
                                  <h4 className="font-semibold text-white">{selectedTopic}</h4>
                                  <p className="text-xs text-gray-400">0 questions</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setAddMaterialTab("manual");
                                      setShowAddQuestionDialog(true);
                                    }}
                                    className="rounded-xl"
                                    style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Material
                                  </Button>
                                </div>
                              </div>
                              <div className="p-4 text-center">
                                <p className="text-sm text-gray-400">No questions added yet</p>
                              </div>
                            </Card>
                          )}

                          {filteredTopics.map((topicName) => {
                            const materials = groupedMaterials[topicName];
                            return (
                              <Card key={topicName} className="rounded-xl overflow-hidden" style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', borderColor: 'var(--sage-200)' }}>
                                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--sage-200)' }}>
                                  <div>
                                    <h4 className="font-semibold text-white">{topicName}</h4>
                                    <p className="text-xs text-gray-400">{materials.length} questions</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleTakeTopicTest(topicName)}
                                      className="rounded-xl"
                                      style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}
                                      disabled={isGeneratingTopicTest && topicForTest === topicName}
                                    >
                                      {isGeneratingTopicTest && topicForTest === topicName ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <ClipboardList className="w-3 h-3 mr-1" />
                                      )}
                                      Take Test
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleFactCheckTopic(topicName)}
                                      className="rounded-xl"
                                      style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}
                                      disabled={isFactChecking && selectedTopicForFactCheck === topicName}
                                    >
                                      {isFactChecking && selectedTopicForFactCheck === topicName ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                      )}
                                      Fact Check
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedTopic(topicName);
                                        setAddMaterialTab("manual");
                                        setShowAddQuestionDialog(true);
                                      }}
                                      className="rounded-xl"
                                      style={{ borderColor: 'var(--sage-600)', color: '#ffffff' }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleDownloadTopicToLibrary(topicName)}
                                      className="rounded-xl text-white"
                                      style={{ backgroundColor: 'var(--sage-600)' }}
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                                <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                                  {materials.map((material, idx) => (
                                    <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: lightMode ? '#f3f4f6' : '#2a2a2a' }}>
                                      <p className="text-sm text-white mb-1">{material.question}</p>
                                      {material.answer && (
                                        <p className="text-xs text-gray-400">{material.answer}</p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-2">by {material.contributed_by}</p>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Chat (1/3) */}
                <div className="w-1/3 flex flex-col border-l" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#0a0a0a' }}>
                  <div className="p-4 border-b" style={{ borderColor: 'var(--sage-200)' }}>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Group Chat
                    </h3>
                  </div>

                  <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                    {selectedGroup.chat_messages && selectedGroup.chat_messages.length > 0 ? (
                      <div className="space-y-4">
                        {selectedGroup.chat_messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className="max-w-[85%] rounded-2xl px-4 py-2"
                              style={{
                                backgroundColor: msg.sender_id === user?.id ? 'var(--sage-600)' : '#2a2a2a',
                                color: '#ffffff'
                              }}
                            >
                              {msg.sender_id !== user?.id && (
                                <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_username}</p>
                              )}
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs opacity-50 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-400">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
                    <div className="flex gap-2">
                      <Input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="rounded-xl"
                        style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', color: '#ffffff', borderColor: 'var(--sage-600)' }}
                        disabled={isSendingMessage}
                        maxLength={500}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim() || isSendingMessage}
                        className="rounded-xl text-white flex-shrink-0"
                        style={{ backgroundColor: 'var(--sage-600)' }}
                      >
                        {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Messages are filtered for inappropriate content
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog - Now with full material creation options */}
      <Dialog open={showAddQuestionDialog} onOpenChange={setShowAddQuestionDialog}>
        <DialogContent className="rounded-2xl max-w-6xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Add Material to {selectedTopic}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Choose how you'd like to add study materials to this topic
            </DialogDescription>
          </DialogHeader>

          <Tabs value={addMaterialTab} onValueChange={setAddMaterialTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-4 mb-6 rounded-xl p-1 h-auto" style={{ backgroundColor: lightMode ? '#e5e7eb' : '#2a2a2a' }}>
              <TabsTrigger
                value="screenshot"
                className="rounded-lg py-3 transition-all duration-300"
                style={{
                  backgroundColor: addMaterialTab === 'screenshot' ? 'var(--sage-600)' : 'transparent',
                  color: addMaterialTab === 'screenshot' ? '#000000' : '#ffffff'
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Screenshot</span>
                <span className="sm:hidden">Photo</span>
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="rounded-lg py-3 transition-all duration-300"
                style={{
                  backgroundColor: addMaterialTab === 'manual' ? 'var(--sage-600)' : 'transparent',
                  color: addMaterialTab === 'manual' ? '#000000' : '#ffffff'
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Manual</span>
                <span className="sm:hidden">Type</span>
              </TabsTrigger>
              <TabsTrigger
                value="studyguide"
                className="rounded-lg py-3 transition-all duration-300"
                style={{
                  backgroundColor: addMaterialTab === 'studyguide' ? 'var(--sage-600)' : 'transparent',
                  color: addMaterialTab === 'studyguide' ? '#000000' : '#ffffff'
                }}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Study Guide</span>
                <span className="sm:hidden">Guide</span>
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="rounded-lg py-3 transition-all duration-300"
                style={{
                  backgroundColor: addMaterialTab === 'import' ? 'var(--sage-600)' : 'transparent',
                  color: addMaterialTab === 'import' ? '#000000' : '#ffffff'
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Library</span>
                <span className="sm:hidden">Import</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screenshot" className="mt-0">
              <ScreenshotUploadForGroup
                onMaterialCreated={handleMaterialCreated}
                selectedGroup={selectedGroup}
                selectedTopic={selectedTopic}
              />
            </TabsContent>

            <TabsContent value="manual" className="mt-0">
              <ManualEntryForGroup
                onMaterialCreated={(data) => {
                  handleMaterialCreated(data);
                  setShowAddQuestionDialog(false); // Close dialog after manual entry
                }}
                selectedGroup={selectedGroup}
                selectedTopic={selectedTopic}
              />
            </TabsContent>

            <TabsContent value="studyguide" className="mt-0">
              <StudyGuideForGroup
                onMaterialCreated={handleMaterialCreated}
                selectedGroup={selectedGroup}
                selectedTopic={selectedTopic}
              />
            </TabsContent>

            <TabsContent value="import" className="mt-0">
              <ImportFromLibrary
                onImport={async (materials) => {
                  setSelectedMaterials(materials); // Update main component's selectedMaterials state
                  await handleImportMaterials(); // Trigger main component's import handler
                  setShowAddQuestionDialog(false); // Close dialog after import
                }}
                userMaterials={userMaterials}
                loadUserMaterials={loadUserMaterials}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Fact Check Results Dialog */}
      <Dialog open={showFactCheckDialog} onOpenChange={setShowFactCheckDialog}>
        <DialogContent className="rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Fact Check Results for {selectedTopicForFactCheck}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {isFactChecking ? "AI is checking materials for accuracy..." :
               factCheckResults.length === 0 ? "All materials look accurate!" :
               `Found ${factCheckResults.length} material${factCheckResults.length !== 1 ? 's' : ''} that may need correction`}
            </DialogDescription>
          </DialogHeader>

          {isFactChecking ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-sage-600 mb-4" />
              <p className="text-white">Fact checking with AI...</p>
            </div>
          ) : factCheckResults.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-white font-semibold mb-2">All materials look good!</p>
              <p className="text-gray-400">No corrections needed at this time.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {factCheckResults.map((correction, idx) => (
                <Card key={idx} className="p-4 rounded-xl" style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', borderColor: '#ef4444' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ef444420' }}>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1">Original Question:</p>
                        <p className="text-sm text-white font-medium">{correction.originalMaterial.question}</p>
                        {correction.originalMaterial.answer && (
                          <>
                            <p className="text-xs text-gray-400 mt-2 mb-1">Original Answer:</p>
                            <p className="text-sm text-gray-300">{correction.originalMaterial.answer}</p>
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-2">Contributed by {correction.originalMaterial.contributed_by}</p>
                      </div>

                      <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#ef444410', borderColor: '#ef444430', borderWidth: '1px' }}>
                        <p className="text-xs text-red-400 mb-1">Issue:</p>
                        <p className="text-sm text-white">{correction.issue_description}</p>
                      </div>

                      <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#10b98110', borderColor: '#10b98130', borderWidth: '1px' }}>
                        <p className="text-xs text-green-400 mb-1">Corrected Answer:</p>
                        <p className="text-sm text-white font-medium">{correction.corrected_answer}</p>
                      </div>

                      <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#3b82f610', borderColor: '#3b82f630', borderWidth: '1px' }}>
                        <p className="text-xs text-blue-400 mb-1">Explanation:</p>
                        <p className="text-sm text-gray-300">{correction.explanation}</p>
                      </div>

                      <Button
                        onClick={() => handleApplyCorrection(correction)}
                        className="w-full rounded-xl text-white"
                        style={{ backgroundColor: 'var(--sage-600)' }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Apply This Correction
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowFactCheckDialog(false);
                setFactCheckResults([]);
                setSelectedTopicForFactCheck(null);
              }}
              className="rounded-xl"
              style={{ color: '#ffffff' }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Import Materials Dialog - Kept as per existing code instructions, though its functionality is mirrored in the new dialog */}
      <Dialog open={showImportMaterialsDialog} onOpenChange={setShowImportMaterialsDialog}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] flex flex-col" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Import Materials to {selectedTopic}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Select materials from your library to add to this topic
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {userMaterials.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">No materials in your library yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userMaterials.map((material, idx) => (
                  <Card
                    key={idx}
                    className="p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      backgroundColor: selectedMaterials.includes(material) ? (lightMode ? '#f3f4f6' : '#2a2a2a') : (lightMode ? 'transparent' : '#1a1a1a'),
                      borderColor: selectedMaterials.includes(material) ? 'var(--sage-600)' : 'var(--sage-200)',
                      borderWidth: '2px'
                    }}
                    onClick={() => {
                      if (selectedMaterials.includes(material)) {
                        setSelectedMaterials(selectedMaterials.filter(m => m !== material));
                      } else {
                        setSelectedMaterials([...selectedMaterials, material]);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={selectedMaterials.includes(material)}
                          onChange={() => {}}
                          className="w-5 h-5 rounded"
                          style={{ accentColor: 'var(--sage-600)' }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium mb-1">{material.question}</p>
                        {material.subject && (
                          <Badge className="text-xs mr-2" style={{ backgroundColor: 'var(--sage-600)', color: '#000000' }}>
                            {material.subject}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--sage-200)' }}>
            <p className="text-sm text-gray-400">
              {selectedMaterials.length} material{selectedMaterials.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportMaterialsDialog(false);
                  setSelectedMaterials([]);
                }}
                className="rounded-xl"
                style={{ color: '#ffffff' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportMaterials}
                disabled={selectedMaterials.length === 0}
                className="rounded-xl text-white"
                style={{ backgroundColor: 'var(--sage-600)' }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {selectedMaterials.length > 0 ? `(${selectedMaterials.length})` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper components for group material creation
function ScreenshotUploadForGroup({ onMaterialCreated, selectedGroup, selectedTopic }) {
  const [uploadedFile, setUploadedFile] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lightMode] = React.useState(() => localStorage.getItem('lightMode') === 'true');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractedData.status === "success" && extractedData.output?.questions) {
        for (const q of extractedData.output.questions) {
          await onMaterialCreated(q);
        }
        alert(`Successfully added ${extractedData.output.questions.length} questions!`);
      } else {
        alert("No questions could be extracted from the image.");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
      setUploadedFile(null); // Clear file input
      if (e.target) e.target.value = ''; // Reset input field to allow re-uploading same file
    }
  };

  return (
    <div className="p-6">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        id="group-screenshot-upload"
        disabled={isProcessing}
      />
      <label htmlFor="group-screenshot-upload">
        <div className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-sage-600 transition-all" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}>
          {isProcessing ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-sage-600" />
              <p className="text-white">Processing image...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-sage-600" />
              <p className="text-white font-semibold mb-2">Upload a screenshot or photo</p>
              <p className="text-gray-400 text-sm">Click to select an image with questions</p>
            </>
          )}
        </div>
      </label>
    </div>
  );
}

function ManualEntryForGroup({ onMaterialCreated, selectedGroup, selectedTopic }) {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [lightMode] = React.useState(() => localStorage.getItem('lightMode') === 'true');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSaving(true);
    await onMaterialCreated({ question: question.trim(), answer: answer.trim() });
    setQuestion("");
    setAnswer("");
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <Label className="text-white mb-2 block">Question *</Label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter the question..."
          className="rounded-xl"
          style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', color: '#ffffff', borderColor: 'var(--sage-600)' }}
          rows={3}
          required
        />
      </div>

      <div>
        <Label className="text-white mb-2 block">Answer (Optional)</Label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the answer..."
          className="rounded-xl"
          style={{ backgroundColor: lightMode ? 'transparent' : '#1a1a1a', color: '#ffffff', borderColor: 'var(--sage-600)' }}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={!question.trim() || isSaving}
        className="w-full rounded-xl text-white"
        style={{ backgroundColor: 'var(--sage-600)' }}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Add to Topic
          </>
        )}
      </Button>
    </form>
  );
}

function StudyGuideForGroup({ onMaterialCreated, selectedGroup, selectedTopic }) {
  const [uploadedFile, setUploadedFile] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lightMode] = React.useState(() => localStorage.getItem('lightMode') === 'true');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractedData.status === "success" && extractedData.output?.questions) {
        for (const q of extractedData.output.questions) {
          await onMaterialCreated(q);
        }
        alert(`Successfully added ${extractedData.output.questions.length} questions!`);
      } else {
        alert("No questions could be extracted from the study guide.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file. Please try again.");
    } finally {
      setIsProcessing(false);
      setUploadedFile(null); // Clear file input
      if (e.target) e.target.value = ''; // Reset input field to allow re-uploading same file
    }
  };

  return (
    <div className="p-6">
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
        id="group-studyguide-upload"
        disabled={isProcessing}
      />
      <label htmlFor="group-studyguide-upload">
        <div className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-sage-600 transition-all" style={{ borderColor: 'var(--sage-200)', backgroundColor: lightMode ? 'transparent' : '#1a1a1a' }}>
          {isProcessing ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-sage-600" />
              <p className="text-white">Processing study guide...</p>
            </>
          ) : (
            <>
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-sage-600" />
              <p className="text-white font-semibold mb-2">Upload a study guide</p>
              <p className="text-gray-400 text-sm">PDF, Word, or text files supported</p>
            </>
          )}
        </div>
      </label>
    </div>
  );
}

function ImportFromLibrary({ onImport, userMaterials, loadUserMaterials }) {
  const [localSelectedMaterials, setLocalSelectedMaterials] = React.useState([]);
  const [lightMode] = React.useState(() => localStorage.getItem('lightMode') === 'true');

  React.useEffect(() => {
    loadUserMaterials();
  }, []);

  return (
    <div className="p-6">
      <ScrollArea className="max-h-96">
        {userMaterials.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400">No materials in your library yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userMaterials.map((material, idx) => (
              <Card
                key={idx}
                className="p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  backgroundColor: localSelectedMaterials.includes(material) ? (lightMode ? '#f3f4f6' : '#2a2a2a') : (lightMode ? 'transparent' : '#1a1a1a'),
                  borderColor: localSelectedMaterials.includes(material) ? 'var(--sage-600)' : 'var(--sage-200)',
                  borderWidth: '2px'
                }}
                onClick={() => {
                  if (localSelectedMaterials.includes(material)) {
                    setLocalSelectedMaterials(localSelectedMaterials.filter(m => m !== material));
                  } else {
                    setLocalSelectedMaterials([...localSelectedMaterials, material]);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={localSelectedMaterials.includes(material)}
                      onChange={() => {}}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: 'var(--sage-600)' }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium mb-1">{material.question}</p>
                    {material.subject && (
                      <Badge className="text-xs mr-2" style={{ backgroundColor: 'var(--sage-600)', color: '#000000' }}>
                        {material.subject}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {localSelectedMaterials.length > 0 && (
        <div className="mt-4">
          <Button
            onClick={() => onImport(localSelectedMaterials)}
            className="w-full rounded-xl text-white"
            style={{ backgroundColor: 'var(--sage-600)' }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import {localSelectedMaterials.length} material{localSelectedMaterials.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}