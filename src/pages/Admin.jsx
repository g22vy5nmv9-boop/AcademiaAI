import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, Users, Search, Trophy, Target, Crown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function Admin() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Redirect non-admin users
      if (user.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      
      loadUsers();
    } catch (error) {
      console.error("Error checking access:", error);
      navigate(createPageUrl("Home"));
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const users = await base44.entities.User.list("-created_date");
      setAllUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await base44.entities.User.delete(userToDelete.id);
      await loadUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const filteredUsers = allUsers.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = allUsers.length;
  const adminUsers = allUsers.filter(u => u.role === 'admin').length;
  const regularUsers = allUsers.filter(u => u.role === 'user').length;
  const totalQuestionsAnswered = allUsers.reduce((sum, u) => sum + (u.total_questions_answered || 0), 0);

  // Don't render anything until we've verified admin access
  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Manage users and view platform statistics</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border-2 hover:scale-105 transition-transform shadow-lg" style={{ borderColor: '#3b82f6', backgroundColor: '#1e40af' }}>
            <div className="flex flex-col">
              <Users className="w-8 h-8 text-blue-400 mb-2" />
              <span className="text-3xl font-bold text-white mb-1">{totalUsers}</span>
              <span className="text-xs text-blue-300 uppercase tracking-wide">Total Users</span>
            </div>
          </Card>

          <Card className="p-5 border-2 hover:scale-105 transition-transform shadow-lg" style={{ borderColor: '#8b5cf6', backgroundColor: '#6d28d9' }}>
            <div className="flex flex-col">
              <Crown className="w-8 h-8 text-purple-400 mb-2" />
              <span className="text-3xl font-bold text-white mb-1">{adminUsers}</span>
              <span className="text-xs text-purple-300 uppercase tracking-wide">Admins</span>
            </div>
          </Card>

          <Card className="p-5 border-2 hover:scale-105 transition-transform shadow-lg" style={{ borderColor: '#10b981', backgroundColor: '#047857' }}>
            <div className="flex flex-col">
              <Users className="w-8 h-8 text-emerald-400 mb-2" />
              <span className="text-3xl font-bold text-white mb-1">{regularUsers}</span>
              <span className="text-xs text-emerald-300 uppercase tracking-wide">Regular Users</span>
            </div>
          </Card>

          <Card className="p-5 border-2 hover:scale-105 transition-transform shadow-lg" style={{ borderColor: '#f59e0b', backgroundColor: '#d97706' }}>
            <div className="flex flex-col">
              <Trophy className="w-8 h-8 text-amber-400 mb-2" />
              <span className="text-3xl font-bold text-white mb-1">{totalQuestionsAnswered}</span>
              <span className="text-xs text-amber-300 uppercase tracking-wide">Total Questions</span>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by username, email, or name..."
              className="pl-10 rounded-xl"
              style={{ backgroundColor: '#1a1a1a', color: '#ffffff', borderColor: 'var(--sage-600)' }}
            />
          </div>
        </div>

        {/* Users List */}
        <Card className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--sage-200)', backgroundColor: '#1a1a1a' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--sage-200)' }}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users ({filteredUsers.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">
                {searchQuery ? "No users found matching your search" : "No users yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--sage-200)' }}>
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: user.role === 'admin' ? '#8b5cf6' : 'var(--sage-600)' }}>
                      <span className="text-white text-lg font-bold">
                        {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white truncate">
                          {user.username || 'No username'}
                        </p>
                        {user.role === 'admin' && (
                          <Badge className="text-xs" style={{ backgroundColor: '#8b5cf6', color: '#ffffff' }}>
                            Admin
                          </Badge>
                        )}
                        {user.id === currentUser.id && (
                          <Badge className="text-xs" style={{ backgroundColor: 'var(--sage-600)', color: '#000000' }}>
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      {user.full_name && (
                        <p className="text-xs text-gray-500">{user.full_name}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 flex-shrink-0 items-center">
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{user.total_questions_answered || 0}</p>
                        <p className="text-xs text-gray-400">Questions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{user.total_tests_completed || 0}</p>
                        <p className="text-xs text-gray-400">Tests</p>
                      </div>
                      {user.id !== currentUser.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 hover:bg-red-900/20"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent style={{ backgroundColor: '#1a1a1a' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#ffffff' }}>Delete User?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#a3a3a3' }}>
              Are you sure you want to delete "{userToDelete?.username || userToDelete?.email}"? 
              This will permanently delete their account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} style={{ color: '#ffffff' }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700 text-white">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}