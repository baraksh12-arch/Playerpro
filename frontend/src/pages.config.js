/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import App from './pages/App';
import appTsx from './pages/App.tsx';
import Home from './pages/Home';
import ManagementDashboard from './pages/ManagementDashboard';
import StudentBackingTrack from './pages/StudentBackingTrack';
import StudentChat from './pages/StudentChat';
import StudentCustomRoom from './pages/StudentCustomRoom';
import StudentDashboard from './pages/StudentDashboard';
import StudentDroneLab from './pages/StudentDroneLab';
import StudentEarTraining from './pages/StudentEarTraining';
import StudentGuitarFretboard from './pages/StudentGuitarFretboard';
import StudentLooper from './pages/StudentLooper';
import StudentMaterials from './pages/StudentMaterials';
import StudentMetronome from './pages/StudentMetronome';
import StudentPitchLab from './pages/StudentPitchLab';
import StudentPlasmaChords from './pages/StudentPlasmaChords';
import StudentPractice from './pages/StudentPractice';
import StudentPracticeRoom from './pages/StudentPracticeRoom';
import StudentProgress from './pages/StudentProgress';
import StudentRecorder from './pages/StudentRecorder';
import StudentRhythm from './pages/StudentRhythm';
import StudentSettings from './pages/StudentSettings';
import studentsettingsTsx from './pages/StudentSettings.tsx';
import StudentSightReading from './pages/StudentSightReading';
import StudentSmartProgressions from './pages/StudentSmartProgressions';
import StudentTasks from './pages/StudentTasks';
import StudentTheory from './pages/StudentTheory';
import StudentTimer from './pages/StudentTimer';
import StudentTranscribe from './pages/StudentTranscribe';
import StudentTuner from './pages/StudentTuner';
import TeacherCalendar from './pages/TeacherCalendar';
import TeacherChartFinder from './pages/TeacherChartFinder';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherMaterials from './pages/TeacherMaterials';
import TeacherPdfToWord from './pages/TeacherPdfToWord';
import TeacherRecommendations from './pages/TeacherRecommendations';
import TeacherScanner from './pages/TeacherScanner';
import TeacherSettings from './pages/TeacherSettings';
import TeacherStudentProfile from './pages/TeacherStudentProfile';
import TeacherStudents from './pages/TeacherStudents';
import TeacherTools from './pages/TeacherTools';
import __Layout from './Layout.jsx';


export const PAGES = {
    "App": App,
    "App.tsx": appTsx,
    "Home": Home,
    "ManagementDashboard": ManagementDashboard,
    "StudentBackingTrack": StudentBackingTrack,
    "StudentChat": StudentChat,
    "StudentCustomRoom": StudentCustomRoom,
    "StudentDashboard": StudentDashboard,
    "StudentDroneLab": StudentDroneLab,
    "StudentEarTraining": StudentEarTraining,
    "StudentGuitarFretboard": StudentGuitarFretboard,
    "StudentLooper": StudentLooper,
    "StudentMaterials": StudentMaterials,
    "StudentMetronome": StudentMetronome,
    "StudentPitchLab": StudentPitchLab,
    "StudentPlasmaChords": StudentPlasmaChords,
    "StudentPractice": StudentPractice,
    "StudentPracticeRoom": StudentPracticeRoom,
    "StudentProgress": StudentProgress,
    "StudentRecorder": StudentRecorder,
    "StudentRhythm": StudentRhythm,
    "StudentSettings": StudentSettings,
    "StudentSettings.tsx": studentsettingsTsx,
    "StudentSightReading": StudentSightReading,
    "StudentSmartProgressions": StudentSmartProgressions,
    "StudentTasks": StudentTasks,
    "StudentTheory": StudentTheory,
    "StudentTimer": StudentTimer,
    "StudentTranscribe": StudentTranscribe,
    "StudentTuner": StudentTuner,
    "TeacherCalendar": TeacherCalendar,
    "TeacherChartFinder": TeacherChartFinder,
    "TeacherDashboard": TeacherDashboard,
    "TeacherMaterials": TeacherMaterials,
    "TeacherPdfToWord": TeacherPdfToWord,
    "TeacherRecommendations": TeacherRecommendations,
    "TeacherScanner": TeacherScanner,
    "TeacherSettings": TeacherSettings,
    "TeacherStudentProfile": TeacherStudentProfile,
    "TeacherStudents": TeacherStudents,
    "TeacherTools": TeacherTools,
}

export const pagesConfig = {
    mainPage: "StudentDashboard",
    Pages: PAGES,
    Layout: __Layout,
};