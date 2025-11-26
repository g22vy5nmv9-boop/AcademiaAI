import Layout from "./Layout.jsx";

import Library from "./Library";

import AddMaterial from "./AddMaterial";

import GenerateTest from "./GenerateTest";

import TakeTest from "./TakeTest";

import TestResults from "./TestResults";

import Flashcards from "./Flashcards";

import StudyFlashcards from "./StudyFlashcards";

import Notes from "./Notes";

import LessonPlans from "./LessonPlans";

import TakeLessonPath from "./TakeLessonPath";

import LearnLesson from "./LearnLesson";

import TakeFinalTest from "./TakeFinalTest";

import Home from "./Home";

import Settings from "./Settings";

import Collaborate from "./Collaborate";

import SetupUsername from "./SetupUsername";

import Admin from "./Admin";

import Error from "./Error";

import Leaderboard from "./Leaderboard";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Library: Library,
    
    AddMaterial: AddMaterial,
    
    GenerateTest: GenerateTest,
    
    TakeTest: TakeTest,
    
    TestResults: TestResults,
    
    Flashcards: Flashcards,
    
    StudyFlashcards: StudyFlashcards,
    
    Notes: Notes,
    
    LessonPlans: LessonPlans,
    
    TakeLessonPath: TakeLessonPath,
    
    LearnLesson: LearnLesson,
    
    TakeFinalTest: TakeFinalTest,
    
    Home: Home,
    
    Settings: Settings,
    
    Collaborate: Collaborate,
    
    SetupUsername: SetupUsername,
    
    Admin: Admin,
    
    Error: Error,
    
    Leaderboard: Leaderboard,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Library />} />
                
                
                <Route path="/Library" element={<Library />} />
                
                <Route path="/AddMaterial" element={<AddMaterial />} />
                
                <Route path="/GenerateTest" element={<GenerateTest />} />
                
                <Route path="/TakeTest" element={<TakeTest />} />
                
                <Route path="/TestResults" element={<TestResults />} />
                
                <Route path="/Flashcards" element={<Flashcards />} />
                
                <Route path="/StudyFlashcards" element={<StudyFlashcards />} />
                
                <Route path="/Notes" element={<Notes />} />
                
                <Route path="/LessonPlans" element={<LessonPlans />} />
                
                <Route path="/TakeLessonPath" element={<TakeLessonPath />} />
                
                <Route path="/LearnLesson" element={<LearnLesson />} />
                
                <Route path="/TakeFinalTest" element={<TakeFinalTest />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Collaborate" element={<Collaborate />} />
                
                <Route path="/SetupUsername" element={<SetupUsername />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/Error" element={<Error />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}