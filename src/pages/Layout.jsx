
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Library, ClipboardList, Brain, FileText, Home, Settings, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProfessorRichard from "@/components/ProfessorRichard";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [checkingUsername, setCheckingUsername] = React.useState(true);
  const [lightMode, setLightMode] = React.useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if user is authenticated
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          // Redirect to login with current URL as next page
          await base44.auth.redirectToLogin(window.location.pathname + window.location.search);
          return;
        }

        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.deletion_scheduled_date) {
          const scheduledDate = new Date(currentUser.deletion_scheduled_date);
          const deletionDate = new Date(scheduledDate.getTime() + (10 * 24 * 60 * 60 * 1000));
          const now = new Date();
          
          if (now >= deletionDate) {
            alert("Your account deletion period has expired. Your account has been deleted.");
            await base44.auth.redirectToLogin();
            return;
          }
        }
        
        if (!currentUser.username && location.pathname !== createPageUrl("SetupUsername")) {
          window.location.href = createPageUrl("SetupUsername");
        }
      } catch (error) {
        console.error("Authentication failed:", error);
        await base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      } finally {
        setCheckingUsername(false);
      }
    };

    loadUser();
  }, [location.pathname]);

  // Listen for light mode changes
  React.useEffect(() => {
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

  if (checkingUsername) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--sage-600)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: lightMode ? '#000000' : '#ffffff' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home
  },
  {
    title: "Library",
    url: createPageUrl("Library"),
    icon: Library
  },
  {
    title: "Tests",
    url: createPageUrl("GenerateTest"),
    icon: ClipboardList
  },
  {
    title: "Flashcards",
    url: createPageUrl("Flashcards"),
    icon: Brain
  },
  {
    title: "Notes",
    url: createPageUrl("Notes"),
    icon: FileText
  },
  {
    title: "Collaborate",
    url: createPageUrl("Collaborate"),
    icon: Users
  },
  {
    title: "Lesson Plans",
    url: createPageUrl("LessonPlans"),
    icon: BookOpen,
    adminOnly: true
  },
  {
    title: "Admin",
    url: createPageUrl("Admin"),
    icon: Settings,
    adminOnly: true
  }];

  const visibleNavItems = navigationItems.filter((item) => {
    if (item.adminOnly) {
      return user?.role === 'admin';
    }
    return true;
  });

  // Color scheme based on mode
  const bgMain = lightMode ? '#ffffff' : '#000000';
  const bgBox = lightMode ? '#ffffff' : '#000000';
  const bgSidebar = lightMode ? '#ffffff' : '#000000';
  const bgInput = lightMode ? '#e2e8f0' : '#000000';
  const textMain = lightMode ? '#000000' : '#ffffff';
  const textSecondary = lightMode ? '#666666' : '#a3a3a3';

  return (
    <SidebarProvider>
      <style>{`
        /* ============================================
             DESKTOP STYLES - THEME DEPENDENT
             ============================================ */
          @media (min-width: 769px) {
            :root {
              --sage-50: ${lightMode ? '#f0fdf4' : '#000000'};
              --sage-100: ${lightMode ? '#dcfce7' : '#000000'};
              --sage-200: #15803d;
              --sage-300: #166534;
              --sage-500: #15803d;
              --sage-600: #15803d;
              --sage-700: #14532d;
              --cream: ${bgMain};
              --box-gray: ${bgBox};
              --input-bg: ${bgInput};
              --text-main: ${textMain};
              --text-secondary: ${textSecondary};
            }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: ${lightMode ? '#ffffff' : '#000000'} !important;
            color: ${textMain};
          }

          /* Force all page containers to have black background in dark mode */
          main, main > div, [class*="min-h-screen"] {
            background-color: ${lightMode ? 'transparent' : '#000000'} !important;
          }

          /* Force all white backgrounds to black in dark mode */
          ${!lightMode ? `
          [style*="background-color: #ffffff"],
          [style*="backgroundColor: '#ffffff'"],
          [style*="background-color:#ffffff"],
          [style*="backgroundColor: #ffffff"],
          .bg-white {
            background-color: #000000 !important;
          }
          ` : ''}

          /* Force sidebar background */
          [data-sidebar] {
            background-color: ${bgSidebar} !important;
          }

          /* Ensure all borders are green */
          * {
            border-color: var(--sage-600) !important;
          }

          /* Button active/click effect - grow slightly */
          button:active, .button:active, [role="button"]:active {
            transform: scale(1.05);
            transition: transform 0.1s ease;
          }

          /* Light mode: Add light green background on click */
          ${lightMode ? `
          button:active, .button:active, [role="button"]:active,
          [role="tab"]:active, [role="menuitem"]:active,
          a:active, input[type="button"]:active, input[type="submit"]:active {
            background-color: #bbf7d0 !important;
          }
          ` : ''}

          /* Subtle green tint for elements with green borders */
          [style*="border-color: #15803d"],
          [style*="borderColor: '#15803d'"],
          [style*="border-color: var(--sage-600)"],
          [style*="borderColor: 'var(--sage-600')"] {
            background-color: ${lightMode ? 'rgba(21, 128, 61, 0.02)' : 'rgba(21, 128, 61, 0.05)'} !important;
          }

          /* Force text colors based on light mode */
          ${lightMode ? `
            /* Light Mode: Black text, White backgrounds */
            p, span, div, label, button, h1, h2, h3, h4, h5, h6 {
              color: #000000 !important;
            }
            
            /* Input fields */
            input:not([type="checkbox"]):not([type="radio"]), 
            textarea, 
            select {
              color: #000000 !important;
              background-color: ${bgInput} !important;
            }
            
            input::placeholder, textarea::placeholder {
              color: #999999 !important;
            }
            
            a {
              color: #000000 !important;
            }
          ` : `
            /* Dark Mode: White text, Black backgrounds */
            p, span, div, label, button, h1, h2, h3, h4, h5, h6 {
              color: #ffffff !important;
            }
            
            /* Input fields */
            input:not([type="checkbox"]):not([type="radio"]), 
            textarea, 
            select {
              color: #ffffff !important;
              background-color: ${bgInput} !important;
            }
            
            input::placeholder, textarea::placeholder {
              color: #a3a3a3 !important;
            }
            
            a {
              color: #ffffff !important;
            }
          `}

          /* Background colors - black in dark mode, white in light mode */
          .bg-gray-100, .bg-gray-200, .bg-sage-50 {
            background-color: ${lightMode ? '#f3f4f6' : '#000000'} !important;
          }

          .bg-cream, .bg-\\[var\\(--cream\\)\\] {
            background-color: ${lightMode ? '#ffffff' : '#000000'} !important;
          }

          /* Hover effects */
          .hover\\:bg-gray-100:hover, .hover\\:bg-gray-50:hover, .hover\\:bg-gray-800:hover, .hover\\:bg-sage-50:hover {
            background-color: ${lightMode ? 'rgba(0, 0, 0, 0.05)' : '#000000'} !important;
          }

          /* Cards - black in dark mode */
          [class*="rounded-2xl"], [class*="rounded-xl"] {
            background-color: ${lightMode ? 'transparent' : '#000000'} !important;
          }

          /* Sage colors - KEEP THESE */
          .bg-\\[var\\(--sage-600\\)\\] {
            background-color: var(--sage-600) !important;
          }
          .hover\\:bg-\\[var\\(--sage-700\\)\\]:hover {
            background-color: var(--sage-700) !important;
          }

          /* Checkboxes */
          input[type="checkbox"]:checked, [data-state="checked"] {
            background-color: var(--sage-600) !important;
            border-color: var(--sage-600) !important;
          }

          /* Force input backgrounds */
          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="search"],
          input[type="number"],
          input[type="tel"],
          input[type="url"],
          textarea,
          select,
          .bg-gray-900 input,
          .bg-slate-900 input,
          [class*="bg-gray"] input {
            background-color: ${bgInput} !important;
            color: ${textMain} !important;
          }
        }

        /* ============================================
           MOBILE STYLES - SAME AS DESKTOP
           Mobile now respects light/dark mode
           ============================================ */
        @media (max-width: 768px) {
          /* Remove all positioning on mobile */
          header {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            z-index: auto !important;
          }

          .sticky {
            position: relative !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'transparent' }}>
        <Sidebar className="border-r" style={{ backgroundColor: bgSidebar, borderColor: 'var(--sage-600)' }}>
          <SidebarHeader className="p-4 flex flex-col gap-2 border-b sticky top-0 z-50" style={{ backgroundColor: bgSidebar, borderColor: 'var(--sage-600)' }}>
            <div className="flex items-center gap-3" style={{ backgroundColor: 'transparent' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                <BookOpen className="w-5 h-5" style={{ color: '#ffffff' }} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: textMain }}>AcademiaAI</h2>
                <p className="text-xs" style={{ color: 'var(--sage-600)' }}>Study Smarter</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3 flex min-h-0 flex-1 flex-col gap-2 overflow-auto" style={{ backgroundColor: 'transparent' }}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleNavItems.map((item) =>
                  <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                      asChild
                      className="rounded-lg mb-1 transition-all"
                      style={{
                        backgroundColor: location.pathname === item.url ? 'var(--sage-600)' : 'transparent',
                        color: textMain
                      }}>
                        <Link
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: location.pathname === item.url ? 'var(--sage-600)' : 'transparent',
                          color: textMain
                        }}>
                          <item.icon className="w-5 h-5" style={{ color: textMain }} />
                          <span style={{ color: textMain }}>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4" style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent' }}>
            <Link to={createPageUrl("AddMaterial")}>
              <button className="w-full bg-[var(--sage-600)] hover:bg-[var(--sage-700)] rounded-lg px-4 py-2 flex items-center justify-center gap-2 transition-colors" style={{ color: textMain }}>
                <Plus className="w-4 h-4" style={{ color: textMain }} />
                <span className="font-medium" style={{ color: textMain }}>Add Material</span>
              </button>
            </Link>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="px-4 py-4 md:px-6" style={{ backgroundColor: bgMain }}>
            <div className="flex items-center gap-3" style={{ position: 'relative', zIndex: 1 }}>
              <SidebarTrigger className="p-2 rounded-lg" style={{ color: textMain }} />
              {user &&
              <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm" style={{ color: textSecondary }}>{user.username}</span>
                  <Link to={createPageUrl("Settings")}>
                    <button className="p-2 rounded-lg transition-colors" style={{ color: textSecondary }}>
                      <Settings className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              }
            </div>
          </header>

          <div className="flex-1 overflow-auto" style={{ backgroundColor: 'transparent' }}>
            {children}
          </div>
        </main>

        <ProfessorRichard lightMode={lightMode} />
      </div>
    </SidebarProvider>
  );
}
