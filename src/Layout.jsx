import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.js';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  Music,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Star,
  TrendingUp,
  Globe,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ===== INLINE I18N WITH 4 LANGUAGES: EN / HE / RU / FR =====
const TRANSLATIONS = {
  en: {
    // App
    "app.title": "Guitar Studio Hub",
    "app.subtitle": "Learn & Practice",
    
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.students": "Students",
    "nav.materials": "Materials",
    "nav.tasks": "Tasks",
    "nav.practice": "Practice", // kept for compatibility in some spots if not fully replaced
    "nav.practiceRoom": "Practice Room",
    "nav.progress": "Progress",
    "nav.chat": "Chat",
    "nav.settings": "Settings",
    "nav.recommendations": "Recommendations",
    "nav.logout": "Logout",
    "nav.practiceTools": "Practice Tools",
    "nav.tools": "Tools",
    "nav.calendar": "Calendar",
    
    // Common
    "common.language": "Language",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.loading": "Loading...",
    "common.back": "Back",
    
    // User roles
    "role.teacher": "Teacher",
    "role.student": "Student",

    // Dashboard
    "page.dashboard.greeting": "Hello, {name}!",
    "page.dashboard.subtitle": "Ready to make some music today?",
    "page.dashboard.thisWeek": "This Week",
    "page.dashboard.practiceStreak": "Practice Streak",
    "page.dashboard.nextLesson": "Next Lesson",
    "page.dashboard.minutes": "minutes",
    "page.dashboard.days": "days",
    "page.dashboard.noLesson": "No upcoming lesson",
    "page.dashboard.startPracticing": "Start practicing today!",
    "page.dashboard.progress": "My Progress",
    "page.dashboard.progressDesc": "Track your improvement",
    "page.dashboard.chat": "Chat with Teacher",
    "page.dashboard.chatDesc": "Message your teacher",
    "page.dashboard.materials": "My Materials",
    "page.dashboard.materialsDesc": "View your lesson materials",
    "page.dashboard.practice": "Start Practice",
    "page.dashboard.practiceDesc": "Metronome, tuner, timer & recorder",

    // Practice Studio / Tools
    "page.practice.title": "Tools",
    "page.practice.subtitle": "Choose your tool and start practicing",
    "page.practice.timer": "Timer",
    "page.practice.tuner": "Tuner",
    "page.practice.metronome": "Metronome",
    "page.practice.rhythm": "Rhythm Trainer",
    "page.practice.ear": "Ear Training",
    "page.practice.recorder": "Recorder",
    "page.practice.theory": "Theory & Techniques",
    "page.practice.custom": "Custom Room",
    "page.practice.routines": "Practice Routines",

    // Progress
    "page.progress.title": "My Progress",
    "page.progress.subtitle": "Track your musical journey",
    "page.progress.overview": "Overview",
    "page.progress.statistics": "Statistics",
    "page.progress.goals": "Goals",
    "page.progress.achievements": "Achievements",
    "page.progress.currentStreak": "Current Streak",
    "page.progress.totalTime": "Total Practice Time",
    "page.progress.achievementPoints": "Achievement Points",
    "page.progress.totalBadges": "Total Badges",
    "page.progress.thisWeek": "This Week",
    "page.progress.avgSession": "Avg. Session",
    "page.progress.longestStreak": "Longest Streak",
    "page.progress.recentSessions": "Recent Practice Sessions",

    // Practice Room
    "page.room.title": "Practice Room",
    "page.room.subtitle": "Create custom routines and arrange your practice tools",
    "page.room.myRoutines": "My Routines",
    "page.room.buildRoutine": "Build Routine",
    "page.room.customLayout": "Custom Layout",
    "page.room.exercises": "Exercises",
    "page.room.total": "Total",
    "page.room.minutes": "minutes",
    "page.room.start": "Start",
    "page.room.addWidget": "Add Widget",
    "page.room.widgets": "Widgets",
    "page.room.noRoutines": "No Routines Yet",
    "page.room.noRoutinesDesc": "Create your first practice routine to get started",
    "page.room.createRoutine": "Create Routine",
    "page.room.deleteConfirm": "Are you sure you want to delete this routine?",

    // Materials
    "page.materials.title": "My Materials",
    "page.materials.all": "All",
    "page.materials.songs": "Songs",
    "page.materials.scales": "Scales",
    "page.materials.backing": "Backing Tracks",
    "page.materials.theory": "Theory",
    "page.materials.teacherNote": "Teacher's Note",
    "page.materials.noMaterials": "No materials assigned yet",
    "page.materials.openFullSize": "Open Full Size",
    "page.materials.openNewTab": "Open in New Tab",
    "page.materials.view": "View",
    "page.materials.download": "Download",

    // Tasks
    "page.tasks.title": "My Tasks",
    "page.tasks.completed": "Completed ({count})",
    "page.tasks.comment": "Your comment",
    "page.tasks.success": "Well done!",
    "page.tasks.noTasks": "No tasks assigned yet",
    "page.tasks.notStarted": "Not Started",
    "page.tasks.inProgress": "In Progress",
    "page.tasks.startTask": "Start Task",
    "page.tasks.markDone": "Mark as Done",
    "page.tasks.due": "Due",
    "page.tasks.commentPrompt": "Add a comment about your progress (optional)",
    "page.tasks.commentPlaceholder": "e.g., Practiced for 30 minutes, got it up to 100 BPM!",

    // Settings
    "page.settings.title": "Settings",
    "page.settings.subtitle": "Manage your profile and preferences",
    "page.settings.profileInfo": "Profile Information",
    "page.settings.fullName": "Full Name",
    "page.settings.fullNamePlaceholder": "Enter your full name",
    "page.settings.email": "Email",
    "page.settings.emailNote": "Email cannot be changed",
    "page.settings.phone": "Phone Number",
    "page.settings.phonePlaceholder": "+1 234 567 890",
    "page.settings.musicalPreferences": "Musical Preferences",
    "page.settings.skillLevel": "Skill Level",
    "page.settings.beginner": "Beginner",
    "page.settings.intermediate": "Intermediate",
    "page.settings.advanced": "Advanced",
    "page.settings.mainStyle": "Main Musical Style",
    "page.settings.instrumentType": "Instrument Type",
    "page.settings.languageSettings": "Language Settings",
    "page.settings.logoutTitle": "Logout from Account",
    "page.settings.logoutDesc": "You'll be redirected to the login page",
    "page.settings.aboutApp": "About the App",
    "page.settings.aboutDesc": "A comprehensive guitar learning platform for students and teachers. Track your progress, practice with advanced tools, and communicate with your teacher.",
    "page.settings.saveSuccess": "Profile updated successfully!",

    // Teacher Dashboard
    "page.teacherDashboard.title": "Teacher Dashboard",
    "page.teacherDashboard.totalStudents": "Total Students",
    "page.teacherDashboard.todaysLessons": "Today's Lessons",
    "page.teacherDashboard.unreadMessages": "Unread Messages",
    "page.teacherDashboard.noLessonsToday": "No lessons scheduled for today",
    "page.teacherDashboard.studentsOverview": "Students Overview",
    "page.teacherDashboard.name": "Name",
    "page.teacherDashboard.level": "Level",
    "page.teacherDashboard.nextLesson": "Next Lesson",
    "page.teacherDashboard.lastPractice": "Last Practice",
    "page.teacherDashboard.streak": "Streak",
    "page.teacherDashboard.notScheduled": "Not scheduled",
    "page.teacherDashboard.noData": "No data",
    "page.teacherDashboard.studentMessages": "Student Messages",
    "page.teacherDashboard.noMessagesYet": "No messages yet",
    "page.teacherDashboard.you": "You: ",
    "page.teacherDashboard.news": "NEWS",
    "page.teacherDashboard.updatesForTeachers": "Updates for Teachers",
    "page.teacherDashboard.moreInfo": "More Info",
    "page.teacherDashboard.viewFiles": "View Files",
    "page.teacherDashboard.download": "Download",
    "page.teacherDashboard.openLink": "Open Link",
    "page.teacherDashboard.whatsappButton": "Chat on WhatsApp",
    "page.teacherDashboard.scanDocument": "Scan Document",

    // Scanner
    "scanner.title": "Document Scanner (A4)",
    "scanner.capture": "Capture",
    "scanner.recapture": "Recapture",
    "scanner.enhance": "Enhance with AI",
    "scanner.enhancing": "Enhancing...",
    "scanner.save": "Save to Materials",
    "scanner.saving": "Saving...",
    "scanner.cancel": "Cancel",
    "scanner.cameraError": "Camera access denied",
    "scanner.processing": "Processing...",
    "scanner.success": "Document saved successfully!",
    "scanner.materialTitle": "Material Title",
    "scanner.materialTitlePlaceholder": "e.g., Lesson Notes",
    "scanner.description": "Description (optional)",
    "scanner.descriptionPlaceholder": "Add description...",

    // Teacher Students
    "page.teacherStudents.title": "My Students",
    "page.teacherStudents.searchPlaceholder": "Search students...",
    "page.teacherStudents.filterByLevel": "Filter by level",
    "page.teacherStudents.allLevels": "All Levels",
    "page.teacherStudents.exportCSV": "Export CSV",
    "page.teacherStudents.phone": "Phone",
    "page.teacherStudents.style": "Style",
    "page.teacherStudents.missedLessons": "Missed Lessons",
    "page.teacherStudents.actions": "Actions",
    "page.teacherStudents.edit": "Edit",
    "page.teacherStudents.save": "Save",
    "page.teacherStudents.cancel": "Cancel",
    "page.teacherStudents.students": "students",
    "page.teacherStudents.student": "student",

    // Teacher Recommendations
    "page.teacherRecommendations.title": "Music Recommendations",
    "page.teacherRecommendations.addRecommendation": "Add Recommendation",
    "page.teacherRecommendations.global": "Global Recommendations",
    "page.teacherRecommendations.globalDesc": "Visible to all students",
    "page.teacherRecommendations.studentSpecific": "Student-Specific Recommendations",
    "page.teacherRecommendations.noRecommendations": "No recommendations yet",
    "page.teacherRecommendations.watch": "Watch",
    "page.teacherRecommendations.dialogTitle": "Add Music Recommendation",
    "page.teacherRecommendations.songTitle": "Song Title",
    "page.teacherRecommendations.songTitlePlaceholder": "e.g., Stairway to Heaven",
    "page.teacherRecommendations.artist": "Artist/Band Name",
    "page.teacherRecommendations.artistPlaceholder": "e.g., Led Zeppelin",
    "page.teacherRecommendations.youtubeUrl": "YouTube URL",
    "page.teacherRecommendations.youtubeUrlPlaceholder": "https://www.youtube.com/watch?v=...",
    "page.teacherRecommendations.note": "Note (optional)",
    "page.teacherRecommendations.notePlaceholder": "Why you recommend this...",
    "page.teacherRecommendations.student": "Student (optional)",
    "page.teacherRecommendations.studentPlaceholder": "Leave empty for all students",
    "page.teacherRecommendations.creating": "Creating...",
    "page.teacherRecommendations.create": "Create Recommendation",

    // Teacher Materials
    "page.teacherMaterials.title": "Teaching Materials",
    "page.teacherMaterials.uploadMaterial": "Upload Material",
    "page.teacherMaterials.searchPlaceholder": "Search materials...",
    "page.teacherMaterials.sortBy": "Sort by",
    "page.teacherMaterials.newest": "Newest",
    "page.teacherMaterials.oldest": "Oldest",
    "page.teacherMaterials.nameAZ": "Name A-Z",
    "page.teacherMaterials.noMaterials": "No materials yet",
    "page.teacherMaterials.uploadFirst": "Upload your first material to get started",
    "page.teacherMaterials.viewMaterial": "View Material",
    "page.teacherMaterials.dialogUploadTitle": "Upload New Material",
    "page.teacherMaterials.materialTitle": "Material Title",
    "page.teacherMaterials.materialTitlePlaceholder": "e.g., Blues Scale in A",
    "page.teacherMaterials.description": "Description",
    "page.teacherMaterials.descriptionPlaceholder": "What this material covers...",
    "page.teacherMaterials.type": "Material Type",
    "page.teacherMaterials.typePDF": "PDF Document",
    "page.teacherMaterials.typeAudio": "Audio File",
    "page.teacherMaterials.typeVideo": "Video",
    "page.teacherMaterials.typeNote": "Text Note",
    "page.teacherMaterials.typeImage": "Image",
    "page.teacherMaterials.uploadFile": "Upload File",
    "page.teacherMaterials.videoUrl": "YouTube/Video URL",
    "page.teacherMaterials.videoUrlPlaceholder": "https://www.youtube.com/...",
    "page.teacherMaterials.textContent": "Text Content",
    "page.teacherMaterials.textContentPlaceholder": "Enter your notes here...",
    "page.teacherMaterials.tags": "Tags",
    "page.teacherMaterials.tagsPlaceholder": "beginner, scales, blues",
    "page.teacherMaterials.targetLevel": "Target Level",
    "page.teacherMaterials.allLevels": "All Levels",
    "page.teacherMaterials.targetInstrument": "Target Instrument",
    "page.teacherMaterials.allInstruments": "All Instruments",
    "page.teacherMaterials.private": "Private",
    "page.teacherMaterials.privateDesc": "Only you and assigned students can see this",
    "page.teacherMaterials.uploading": "Uploading...",
    "page.teacherMaterials.upload": "Upload Material",
    "page.teacherMaterials.closePreview": "Close Preview",

    // Weekly Calendar
    "calendar.weeklySchedule": "Weekly Schedule",
    "calendar.today": "Today",
    "calendar.bookLesson": "Book Lesson",
    "calendar.selectStudent": "Select Student",
    "calendar.duration": "Duration",
    "calendar.minutes": "minutes",
    "calendar.deleteLesson": "Delete Lesson",
    "calendar.with": "with",

    // Teacher Settings
    "page.teacherSettings.title": "Settings",
    "page.teacherSettings.inviteStudent": "Invite New Student",
    "page.teacherSettings.studentEmail": "Student Email",
    "page.teacherSettings.studentName": "Student Name",
    "page.teacherSettings.skillLevel": "Skill Level",
    "page.teacherSettings.beginner": "Beginner",
    "page.teacherSettings.intermediate": "Intermediate",
    "page.teacherSettings.advanced": "Advanced",
    "page.teacherSettings.musicStyle": "Music Style",
    "page.teacherSettings.musicStylePlaceholder": "Rock, Jazz, Blues, etc.",
    "page.teacherSettings.phoneOptional": "Phone (optional)",
    "page.teacherSettings.phonePlaceholder": "+1 234 567 8900",
    "page.teacherSettings.sendingInvitation": "Sending Invitation...",
    "page.teacherSettings.sendInvitation": "Send Invitation",
    "page.teacherSettings.invitationNote": "The student will receive an email invitation to join the platform. They'll need to register using the same email address.",
    "page.teacherSettings.invitationSuccess": "Invitation sent successfully! The student will receive an email with instructions.",
    "page.teacherSettings.invitationError": "Failed to send invitation",
    "page.teacherSettings.fillEmailName": "Please fill in email and name",
    "page.teacherSettings.profileInfo": "Profile Information",
    "page.teacherSettings.name": "Name",
    "page.teacherSettings.email": "Email",
    "page.teacherSettings.phone": "Phone",
    "page.teacherSettings.saveChanges": "Save Changes",
    "page.teacherSettings.profileUpdated": "Profile updated successfully!",
    "page.teacherSettings.aboutTitle": "About Guitar Studio Hub",
    "page.teacherSettings.aboutDesc": "Manage your guitar students with ease. Track their practice, assign materials and tasks, and communicate seamlessly.",
    "page.teacherSettings.aboutVersion": "Version 1.0.0 • Built with ❤️ for guitar teachers",
    "page.teacherSettings.managementAccess": "Management Access",
    "page.teacherSettings.managementDesc": "Enter management code to access advanced management features",
    "page.teacherSettings.managementCodePlaceholder": "Enter management code",
    "page.teacherSettings.access": "Access",
    "page.teacherSettings.invalidCode": "Invalid management code",
    },

  he: {
    // App
    "app.title": "Guitar Studio Hub",
    "app.subtitle": "למד ותרגל",
    
    // Navigation
    "nav.dashboard": "דשבורד",
    "nav.students": "תלמידים",
    "nav.materials": "חומרים",
    "nav.tasks": "משימות",
    "nav.practice": "תרגול",
    "nav.practiceRoom": "חדר תרגול",
    "nav.progress": "התקדמות",
    "nav.chat": "צ'אט",
    "nav.settings": "הגדרות",
    "nav.recommendations": "המלצות",
    "nav.logout": "התנתק",
    "nav.practiceTools": "כלי תרגול",
    "nav.tools": "כלים",
    "nav.calendar": "לוח שנה",
    
    // Common
    "common.language": "שפה",
    "common.save": "שמור",
    "common.cancel": "בטל",
    "common.delete": "מחק",
    "common.edit": "ערוך",
    "common.add": "הוסף",
    "common.loading": "טוען...",
    "common.back": "חזור",
    
    // User roles
    "role.teacher": "מורה",
    "role.student": "תלמיד",

    // Dashboard
    "page.dashboard.greeting": "שלום, {name}!",
    "page.dashboard.subtitle": "מוכן ליצור קצת מוזיקה היום?",
    "page.dashboard.thisWeek": "השבוע",
    "page.dashboard.practiceStreak": "רצף תרגול",
    "page.dashboard.nextLesson": "השיעור הבא",
    "page.dashboard.minutes": "דקות",
    "page.dashboard.days": "ימים",
    "page.dashboard.noLesson": "אין שיעורים קרובים",
    "page.dashboard.startPracticing": "התחל לתרגל היום!",
    "page.dashboard.progress": "ההתקדמות שלי",
    "page.dashboard.progressDesc": "עקוב אחרי השיפור שלך",
    "page.dashboard.chat": "צ'אט עם המורה",
    "page.dashboard.chatDesc": "שלח הודעה למורה שלך",
    "page.dashboard.materials": "החומרים שלי",
    "page.dashboard.materialsDesc": "צפה בחומרי השיעור שלך",
    "page.dashboard.practice": "התחל תרגול",
    "page.dashboard.practiceDesc": "מטרונום, טיונר, טיימר והקלטה",

    // Practice Studio / Tools
    "page.practice.title": "כלים",
    "page.practice.subtitle": "בחר כלי והתחל לתרגל",
    "page.practice.timer": "טיימר",
    "page.practice.tuner": "טיונר",
    "page.practice.metronome": "מטרונום",
    "page.practice.rhythm": "מאמן קצב",
    "page.practice.ear": "אימון שמיעה",
    "page.practice.recorder": "מקליט",
    "page.practice.theory": "תיאוריה וטכניקות",
    "page.practice.custom": "חדר מותאם אישית",
    "page.practice.routines": "שגרות תרגול",

    // Progress
    "page.progress.title": "ההתקדמות שלי",
    "page.progress.subtitle": "עקוב אחר המסע המוזיקלי שלך",
    "page.progress.overview": "סקירה כללית",
    "page.progress.statistics": "סטטיסטיקות",
    "page.progress.goals": "מטרות",
    "page.progress.achievements": "הישגים",
    "page.progress.currentStreak": "רצף נוכחי",
    "page.progress.totalTime": "סה״כ זמן תרגול",
    "page.progress.achievementPoints": "נקודות הישג",
    "page.progress.totalBadges": "תגים כוללים",
    "page.progress.thisWeek": "השבוע",
    "page.progress.avgSession": "ממוצע סשן",
    "page.progress.longestStreak": "הרצף הארוך ביותר",
    "page.progress.recentSessions": "סשני תרגול אחרונים",

    // Practice Room
    "page.room.title": "חדר תרגול",
    "page.room.subtitle": "צור שגרות מותאמות אישית וסדר את כלי התרגול שלך",
    "page.room.myRoutines": "השגרות שלי",
    "page.room.buildRoutine": "בנה שגרה",
    "page.room.customLayout": "פריסה מותאמת",
    "page.room.exercises": "תרגילים",
    "page.room.total": "סה״כ",
    "page.room.minutes": "דקות",
    "page.room.start": "התחל",
    "page.room.addWidget": "הוסף וידג'ט",
    "page.room.widgets": "וידג'טים",
    "page.room.noRoutines": "עדיין אין שגרות",
    "page.room.noRoutinesDesc": "צור את השגרה הראשונה שלך כדי להתחיל",
    "page.room.createRoutine": "צור שגרה",
    "page.room.deleteConfirm": "האם אתה בטוח שברצונך למחוק את השגרה הזו?",

    // Materials
    "page.materials.title": "החומרים שלי",
    "page.materials.all": "הכל",
    "page.materials.songs": "שירים",
    "page.materials.scales": "סולמות",
    "page.materials.backing": "רצועות ליווי",
    "page.materials.theory": "תיאוריה",
    "page.materials.teacherNote": "הערת המורה",
    "page.materials.noMaterials": "עדיין לא הוקצו חומרים",
    "page.materials.openFullSize": "פתח בגודל מלא",
    "page.materials.openNewTab": "פתח בכרטיסייה חדשה",
    "page.materials.view": "צפה",
    "page.materials.download": "הורד",

    // Tasks
    "page.tasks.title": "המשימות שלי",
    "page.tasks.completed": "הושלם ({count})",
    "page.tasks.comment": "ההערה שלך",
    "page.tasks.success": "כל הכבוד!",
    "page.tasks.noTasks": "עדיין לא הוקצו משימות",
    "page.tasks.notStarted": "לא התחיל",
    "page.tasks.inProgress": "בתהליך",
    "page.tasks.startTask": "התחל משימה",
    "page.tasks.markDone": "סמן כהושלם",
    "page.tasks.due": "תאריך יעד",
    "page.tasks.commentPrompt": "הוסף הערה על ההתקדמות שלך (אופציונלי)",
    "page.tasks.commentPlaceholder": "למשל: תרגלתי 30 דקות, הגעתי ל-100 BPM!",

    // Settings
    "page.settings.title": "הגדרות",
    "page.settings.subtitle": "נהל את הפרופיל וההעדפות שלך",
    "page.settings.profileInfo": "מידע אישי",
    "page.settings.fullName": "שם מלא",
    "page.settings.fullNamePlaceholder": "הזן את שמך המלא",
    "page.settings.email": "אימייל",
    "page.settings.emailNote": "לא ניתן לשנות את האימייל",
    "page.settings.phone": "מספר טלפון",
    "page.settings.phonePlaceholder": "+972 50 123 4567",
    "page.settings.musicalPreferences": "העדפות מוזיקליות",
    "page.settings.skillLevel": "רמת מיומנות",
    "page.settings.beginner": "מתחיל",
    "page.settings.intermediate": "בינוני",
    "page.settings.advanced": "מתקדם",
    "page.settings.mainStyle": "סגנון מוזיקלי עיקרי",
    "page.settings.instrumentType": "סוג כלי נגינה",
    "page.settings.languageSettings": "הגדרות שפה",
    "page.settings.logoutTitle": "התנתק מהחשבון",
    "page.settings.logoutDesc": "תועבר לדף ההתחברות",
    "page.settings.aboutApp": "אודות האפליקציה",
    "page.settings.aboutDesc": "פלטפורמת לימוד גיטרה מקיפה לתלמידים ומורים. עקוב אחר ההתקדמות שלך, תרגל עם כלים מתקדמים ותקשר עם המורה שלך.",
    "page.settings.saveSuccess": "הפרופיל עודכן בהצלחה!",

    // Teacher Dashboard
    "page.teacherDashboard.title": "דשבורד מורה",
    "page.teacherDashboard.totalStudents": "סה״כ תלמידים",
    "page.teacherDashboard.todaysLessons": "שיעורי היום",
    "page.teacherDashboard.unreadMessages": "הודעות שלא נקראו",
    "page.teacherDashboard.noLessonsToday": "אין שיעורים מתוכננים להיום",
    "page.teacherDashboard.studentsOverview": "סקירת תלמידים",
    "page.teacherDashboard.name": "שם",
    "page.teacherDashboard.level": "רמה",
    "page.teacherDashboard.nextLesson": "השיעור הבא",
    "page.teacherDashboard.lastPractice": "תרגול אחרון",
    "page.teacherDashboard.streak": "רצף",
    "page.teacherDashboard.notScheduled": "לא מתוכנן",
    "page.teacherDashboard.noData": "אין נתונים",
    "page.teacherDashboard.studentMessages": "הודעות תלמידים",
    "page.teacherDashboard.noMessagesYet": "עדיין אין הודעות",
    "page.teacherDashboard.you": "אתה: ",
    "page.teacherDashboard.news": "חדשות",
    "page.teacherDashboard.updatesForTeachers": "עדכונים למורים",
    "page.teacherDashboard.moreInfo": "מידע נוסף",
    "page.teacherDashboard.viewFiles": "צפה בקבצים",
    "page.teacherDashboard.download": "הורד",
    "page.teacherDashboard.openLink": "פתח קישור",
    "page.teacherDashboard.whatsappButton": "שוחח ב-WhatsApp",
    "page.teacherDashboard.scanDocument": "סרוק מסמך",

    // Scanner
    "scanner.title": "סורק מסמכים (A4)",
    "scanner.capture": "צלם",
    "scanner.recapture": "צלם מחדש",
    "scanner.enhance": "שפר עם AI",
    "scanner.enhancing": "משפר...",
    "scanner.save": "שמור לחומרים",
    "scanner.saving": "שומר...",
    "scanner.cancel": "ביטול",
    "scanner.cameraError": "הגישה למצלמה נדחתה",
    "scanner.processing": "מעבד...",
    "scanner.success": "המסמך נשמר בהצלחה!",
    "scanner.materialTitle": "כותרת חומר",
    "scanner.materialTitlePlaceholder": "לדוגמה: רישומי שיעור",
    "scanner.description": "תיאור (אופציונלי)",
    "scanner.descriptionPlaceholder": "הוסף תיאור...",

    // Teacher Students
    "page.teacherStudents.title": "התלמידים שלי",
    "page.teacherStudents.searchPlaceholder": "חפש תלמידים...",
    "page.teacherStudents.filterByLevel": "סנן לפי רמה",
    "page.teacherStudents.allLevels": "כל הרמות",
    "page.teacherStudents.exportCSV": "ייצא CSV",
    "page.teacherStudents.phone": "טלפון",
    "page.teacherStudents.style": "סגנון",
    "page.teacherStudents.missedLessons": "שיעורים שהוחמצו",
    "page.teacherStudents.actions": "פעולות",
    "page.teacherStudents.edit": "ערוך",
    "page.teacherStudents.save": "שמור",
    "page.teacherStudents.cancel": "בטל",
    "page.teacherStudents.students": "תלמידים",
    "page.teacherStudents.student": "תלמיד",

    // Teacher Recommendations
    "page.teacherRecommendations.title": "המלצות מוזיקליות",
    "page.teacherRecommendations.addRecommendation": "הוסף המלצה",
    "page.teacherRecommendations.global": "המלצות כלליות",
    "page.teacherRecommendations.globalDesc": "גלוי לכל התלמידים",
    "page.teacherRecommendations.studentSpecific": "המלצות ספציפיות לתלמיד",
    "page.teacherRecommendations.noRecommendations": "עדיין אין המלצות",
    "page.teacherRecommendations.watch": "צפה",
    "page.teacherRecommendations.dialogTitle": "הוסף המלצה מוזיקלית",
    "page.teacherRecommendations.songTitle": "שם השיר",
    "page.teacherRecommendations.songTitlePlaceholder": "לדוגמה: Stairway to Heaven",
    "page.teacherRecommendations.artist": "שם האמן/להקה",
    "page.teacherRecommendations.artistPlaceholder": "לדוגמה: Led Zeppelin",
    "page.teacherRecommendations.youtubeUrl": "קישור YouTube",
    "page.teacherRecommendations.youtubeUrlPlaceholder": "https://www.youtube.com/watch?v=...",
    "page.teacherRecommendations.note": "הערה (אופציונלי)",
    "page.teacherRecommendations.notePlaceholder": "למה אתה ממליץ על זה...",
    "page.teacherRecommendations.student": "תלמיד (אופציונלי)",
    "page.teacherRecommendations.studentPlaceholder": "השאר ריק עבור כל התלמידים",
    "page.teacherRecommendations.creating": "יוצר...",
    "page.teacherRecommendations.create": "צור המלצה",

    // Teacher Materials
    "page.teacherMaterials.title": "חומרי הוראה",
    "page.teacherMaterials.uploadMaterial": "העלה חומר",
    "page.teacherMaterials.searchPlaceholder": "חפש חומרים...",
    "page.teacherMaterials.sortBy": "מיין לפי",
    "page.teacherMaterials.newest": "חדש ביותר",
    "page.teacherMaterials.oldest": "ישן ביותר",
    "page.teacherMaterials.nameAZ": "שם א-ת",
    "page.teacherMaterials.noMaterials": "עדיין אין חומרים",
    "page.teacherMaterials.uploadFirst": "העלה את החומר הראשון שלך כדי להתחיל",
    "page.teacherMaterials.viewMaterial": "צפה בחומר",
    "page.teacherMaterials.dialogUploadTitle": "העלה חומר חדש",
    "page.teacherMaterials.materialTitle": "כותרת חומר",
    "page.teacherMaterials.materialTitlePlaceholder": "לדוגמה: סולם בלוז ב-A",
    "page.teacherMaterials.description": "תיאור",
    "page.teacherMaterials.descriptionPlaceholder": "מה מכסה החומר הזה...",
    "page.teacherMaterials.type": "סוג חומר",
    "page.teacherMaterials.typePDF": "מסמך PDF",
    "page.teacherMaterials.typeAudio": "קובץ אודיו",
    "page.teacherMaterials.typeVideo": "וידאו",
    "page.teacherMaterials.typeNote": "הערת טקסט",
    "page.teacherMaterials.typeImage": "תמונה",
    "page.teacherMaterials.uploadFile": "העלה קובץ",
    "page.teacherMaterials.videoUrl": "קישור YouTube/וידאו",
    "page.teacherMaterials.videoUrlPlaceholder": "https://www.youtube.com/...",
    "page.teacherMaterials.textContent": "תוכן טקסט",
    "page.teacherMaterials.textContentPlaceholder": "הזן את ההערות שלך כאן...",
    "page.teacherMaterials.tags": "תגיות",
    "page.teacherMaterials.tagsPlaceholder": "מתחילים, סולמות, בלוז",
    "page.teacherMaterials.targetLevel": "רמת יעד",
    "page.teacherMaterials.allLevels": "כל הרמות",
    "page.teacherMaterials.targetInstrument": "כלי נגינה יעד",
    "page.teacherMaterials.allInstruments": "כל הכלים",
    "page.teacherMaterials.private": "פרטי",
    "page.teacherMaterials.privateDesc": "רק אתה ותלמידים מוקצים יכולים לראות את זה",
    "page.teacherMaterials.uploading": "מעלה...",
    "page.teacherMaterials.upload": "העלה חומר",
    "page.teacherMaterials.closePreview": "סגור תצוגה מקדימה",

    // Weekly Calendar
    "calendar.weeklySchedule": "לוח שבועי",
    "calendar.today": "היום",
    "calendar.bookLesson": "קבע שיעור",
    "calendar.selectStudent": "בחר תלמיד",
    "calendar.duration": "משך",
    "calendar.minutes": "דקות",
    "calendar.deleteLesson": "מחק שיעור",
    "calendar.with": "עם",

    // Teacher Settings
    "page.teacherSettings.title": "הגדרות",
    "page.teacherSettings.inviteStudent": "הזמן תלמיד חדש",
    "page.teacherSettings.studentEmail": "אימייל תלמיד",
    "page.teacherSettings.studentName": "שם תלמיד",
    "page.teacherSettings.skillLevel": "רמת מיומנות",
    "page.teacherSettings.beginner": "מתחיל",
    "page.teacherSettings.intermediate": "בינוני",
    "page.teacherSettings.advanced": "מתקדם",
    "page.teacherSettings.musicStyle": "סגנון מוזיקלי",
    "page.teacherSettings.musicStylePlaceholder": "רוק, ג'אז, בלוז, וכו'",
    "page.teacherSettings.phoneOptional": "טלפון (אופציונלי)",
    "page.teacherSettings.phonePlaceholder": "+972 50 123 4567",
    "page.teacherSettings.sendingInvitation": "שולח הזמנה...",
    "page.teacherSettings.sendInvitation": "שלח הזמנה",
    "page.teacherSettings.invitationNote": "התלמיד יקבל הזמנה במייל להצטרף לפלטפורמה. הם יצטרכו להירשם באמצעות אותה כתובת מייל.",
    "page.teacherSettings.invitationSuccess": "ההזמנה נשלחה בהצלחה! התלמיד יקבל מייל עם הוראות.",
    "page.teacherSettings.invitationError": "שליחת ההזמנה נכשלה",
    "page.teacherSettings.fillEmailName": "אנא מלא אימייל ושם",
    "page.teacherSettings.profileInfo": "מידע פרופיל",
    "page.teacherSettings.name": "שם",
    "page.teacherSettings.email": "אימייל",
    "page.teacherSettings.phone": "טלפון",
    "page.teacherSettings.saveChanges": "שמור שינויים",
    "page.teacherSettings.profileUpdated": "הפרופיל עודכן בהצלחה!",
    "page.teacherSettings.aboutTitle": "אודות Guitar Studio Hub",
    "page.teacherSettings.aboutDesc": "נהל את תלמידי הגיטרה שלך בקלות. עקוב אחר התרגול שלהם, הקצה חומרים ומשימות, ותקשר בצורה חלקה.",
    "page.teacherSettings.aboutVersion": "גרסה 1.0.0 • נבנה באהבה ❤️ למורי גיטרה",
    "page.teacherSettings.managementAccess": "גישת ניהול",
    "page.teacherSettings.managementDesc": "הזן קוד ניהול כדי לגשת לתכונות ניהול מתקדמות",
    "page.teacherSettings.managementCodePlaceholder": "הזן קוד ניהול",
    "page.teacherSettings.access": "גישה",
    "page.teacherSettings.invalidCode": "קוד ניהול לא תקין",
    },
  
  ru: {
    // App
    "app.title": "Guitar Studio Hub",
    "app.subtitle": "Учись и практикуйся",
    
    // Navigation
    "nav.dashboard": "Панель управления",
    "nav.students": "Ученики",
    "nav.materials": "Материалы",
    "nav.tasks": "Задания",
    "nav.practice": "Практика", // kept for compatibility in some spots if not fully replaced
    "nav.practiceRoom": "Комната практики",
    "nav.progress": "Прогресс",
    "nav.chat": "Чат",
    "nav.settings": "Настройки",
    "nav.recommendations": "Рекомендации",
    "nav.logout": "Выход",
    "nav.practiceTools": "Инструменты практики",
    "nav.tools": "Инструменты",
    "nav.calendar": "Календарь",
    
    // Common
    "common.language": "Язык",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.delete": "Удалить",
    "common.edit": "Редактировать",
    "common.add": "Добавить",
    "common.loading": "Загрузка...",
    "common.back": "Назад",
    
    // User roles
    "role.teacher": "Преподаватель",
    "role.student": "Ученик",

    // Dashboard
    "page.dashboard.greeting": "Привет, {name}!",
    "page.dashboard.subtitle": "Готов сыграть сегодня?",
    "page.dashboard.thisWeek": "Эта неделя",
    "page.dashboard.practiceStreak": "Серия практик",
    "page.dashboard.nextLesson": "Следующий урок",
    "page.dashboard.minutes": "минут",
    "page.dashboard.days": "дней",
    "page.dashboard.noLesson": "Нет предстоящих уроков",
    "page.dashboard.startPracticing": "Начни практиковаться сегодня!",
    "page.dashboard.progress": "Мой прогресс",
    "page.dashboard.progressDesc": "Отслеживай свои улучшения",
    "page.dashboard.chat": "Чат с преподавателем",
    "page.dashboard.chatDesc": "Напиши своему учителю",
    "page.dashboard.materials": "Мои материалы",
    "page.dashboard.materialsDesc": "Просмотр учебных материалов",
    "page.dashboard.practice": "Начать практику",
    "page.dashboard.practiceDesc": "Метроном, тюнер, таймер и запись",

    // Practice Studio / Tools
    "page.practice.title": "Инструменты",
    "page.practice.subtitle": "Выбери инструмент и начни практиковаться",
    "page.practice.timer": "Таймер",
    "page.practice.tuner": "Тюнер",
    "page.practice.metronome": "Метроном",
    "page.practice.rhythm": "Тренер ритма",
    "page.practice.ear": "Тренировка слуха",
    "page.practice.recorder": "Рекордер",
    "page.practice.theory": "Теория и техники",
    "page.practice.custom": "Своя комната",
    "page.practice.routines": "Программы практики",

    // Progress
    "page.progress.title": "Мой прогресс",
    "page.progress.subtitle": "Отслеживай свой музыкальный путь",
    "page.progress.overview": "Обзор",
    "page.progress.statistics": "Статистика",
    "page.progress.goals": "Цели",
    "page.progress.achievements": "Достижения",
    "page.progress.currentStreak": "Текущая серия",
    "page.progress.totalTime": "Общее время практики",
    "page.progress.achievementPoints": "Очки достижений",
    "page.progress.totalBadges": "Всего значков",
    "page.progress.thisWeek": "Эта неделя",
    "page.progress.avgSession": "Средняя сессия",
    "page.progress.longestStreak": "Самая длинная серия",
    "page.progress.recentSessions": "Недавние сессии практики",

    // Practice Room
    "page.room.title": "Комната практики",
    "page.room.subtitle": "Создай свои программы и расположи инструменты практики",
    "page.room.myRoutines": "Мои программы",
    "page.room.buildRoutine": "Создать программу",
    "page.room.customLayout": "Своя раскладка",
    "page.room.exercises": "Упражнения",
    "page.room.total": "Всего",
    "page.room.minutes": "минут",
    "page.room.start": "Начать",
    "page.room.addWidget": "Добавить виджет",
    "page.room.widgets": "Виджеты",
    "page.room.noRoutines": "Программ пока нет",
    "page.room.noRoutinesDesc": "Создай свою первую программу практики",
    "page.room.createRoutine": "Создать программу",
    "page.room.deleteConfirm": "Вы уверены, что хотите удалить эту программу?",

    // Materials
    "page.materials.title": "Мои материалы",
    "page.materials.all": "Все",
    "page.materials.songs": "Песни",
    "page.materials.scales": "Гаммы",
    "page.materials.backing": "Минусовки",
    "page.materials.theory": "Теория",
    "page.materials.teacherNote": "Заметка учителя",
    "page.materials.noMaterials": "Материалов пока нет",
    "page.materials.openFullSize": "Открыть полный размер",
    "page.materials.openNewTab": "Открыть в новой вкладке",
    "page.materials.view": "Просмотр",
    "page.materials.download": "Скачать",

    // Tasks
    "page.tasks.title": "Мои задания",
    "page.tasks.completed": "Выполнено ({count})",
    "page.tasks.comment": "Твой комментарий",
    "page.tasks.success": "Отлично!",
    "page.tasks.noTasks": "Заданий пока нет",
    "page.tasks.notStarted": "Не начато",
    "page.tasks.inProgress": "В процессе",
    "page.tasks.startTask": "Начать задание",
    "page.tasks.markDone": "Отметить выполненным",
    "page.tasks.due": "Срок",
    "page.tasks.commentPrompt": "Добавь комментарий о своем прогрессе (необязательно)",
    "page.tasks.commentPlaceholder": "Например: Практиковал 30 минут, достиг 100 BPM!",

    // Settings
    "page.settings.title": "Настройки",
    "page.settings.subtitle": "Управляй своим профилем и предпочтениями",
    "page.settings.profileInfo": "Информация профиля",
    "page.settings.fullName": "Полное имя",
    "page.settings.fullNamePlaceholder": "Введи свое полное имя",
    "page.settings.email": "Email",
    "page.settings.emailNote": "Email нельзя изменить",
    "page.settings.phone": "Номер телефона",
    "page.settings.phonePlaceholder": "+7 900 123 4567",
    "page.settings.musicalPreferences": "Музыкальные предпочтения",
    "page.settings.skillLevel": "Уровень навыков",
    "page.settings.beginner": "Начинающий",
    "page.settings.intermediate": "Средний",
    "page.settings.advanced": "Продвинутый",
    "page.settings.mainStyle": "Основной музыкальный стиль",
    "page.settings.instrumentType": "Тип инструмента",
    "page.settings.languageSettings": "Настройки языка",
    "page.settings.logoutTitle": "Выход из аккаунта",
    "page.settings.logoutDesc": "Вы будете перенаправлены на страницу входа",
    "page.settings.aboutApp": "О приложении",
    "page.settings.aboutDesc": "Комплексная платформа для обучения гитаре для учеников и учителей. Отслеживай прогресс, практикуйся с продвинутыми инструментами и общайся с учителем.",
    "page.settings.saveSuccess": "Профиль успешно обновлен!",
  },
  
  fr: {
    // App
    "app.title": "Guitar Studio Hub",
    "app.subtitle": "Apprends et pratique",
    
    // Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.students": "Élèves",
    "nav.materials": "Supports",
    "nav.tasks": "Tâches",
    "nav.practice": "Pratique", // kept for compatibility in some spots if not fully replaced
    "nav.practiceRoom": "Salle de pratique",
    "nav.progress": "Progrès",
    "nav.chat": "Chat",
    "nav.settings": "Paramètres",
    "nav.recommendations": "Recommandations",
    "nav.logout": "Déconnexion",
    "nav.practiceTools": "Outils de pratique",
    "nav.tools": "Outils",
    "nav.calendar": "Calendrier",
    
    // Common
    "common.language": "Langue",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.add": "Ajouter",
    "common.loading": "Chargement...",
    "common.back": "Retour",
    
    // User roles
    "role.teacher": "Professeur",
    "role.student": "Élève",

    // Dashboard
    "page.dashboard.greeting": "Bonjour, {name} !",
    "page.dashboard.subtitle": "Prêt à faire de la musique aujourd'hui ?",
    "page.dashboard.thisWeek": "Cette semaine",
    "page.dashboard.practiceStreak": "Série d'entraînement",
    "page.dashboard.nextLesson": "Prochain cours",
    "page.dashboard.minutes": "minutes",
    "page.dashboard.days": "jours",
    "page.dashboard.noLesson": "Aucun cours à venir",
    "page.dashboard.startPracticing": "Commence à t'exercer aujourd'hui !",
    "page.dashboard.progress": "Ma progression",
    "page.dashboard.progressDesc": "Suis tes progrès",
    "page.dashboard.chat": "Chat avec le professeur",
    "page.dashboard.chatDesc": "Envoie un message à ton enseignant",
    "page.dashboard.materials": "Mes supports",
    "page.dashboard.materialsDesc": "Voir les matériaux du cours",
    "page.dashboard.practice": "Commencer la pratique",
    "page.dashboard.practiceDesc": "Métronome, accordeur, minuteur et enregistreur",

    // Practice Studio / Tools
    "page.practice.title": "Outils",
    "page.practice.subtitle": "Choisis ton outil et commence à pratiquer",
    "page.practice.timer": "Minuteur",
    "page.practice.tuner": "Accordeur",
    "page.practice.metronome": "Métronome",
    "page.practice.rhythm": "Entraîneur de rythme",
    "page.practice.ear": "Entraînement auditif",
    "page.practice.recorder": "Enregistreur",
    "page.practice.theory": "Théorie et techniques",
    "page.practice.custom": "Salle personnalisée",
    "page.practice.routines": "Routines de pratique",

    // Progress
    "page.progress.title": "Ma progression",
    "page.progress.subtitle": "Suis ton parcours musical",
    "page.progress.overview": "Vue d'ensemble",
    "page.progress.statistics": "Statistiques",
    "page.progress.goals": "Objectifs",
    "page.progress.achievements": "Réalisations",
    "page.progress.currentStreak": "Série actuelle",
    "page.progress.totalTime": "Temps total de pratique",
    "page.progress.achievementPoints": "Points de réussite",
    "page.progress.totalBadges": "Total de badges",
    "page.progress.thisWeek": "Cette semaine",
    "page.progress.avgSession": "Session moyenne",
    "page.progress.longestStreak": "Plus longue série",
    "page.progress.recentSessions": "Sessions récentes",

    // Practice Room
    "page.room.title": "Salle de pratique",
    "page.room.subtitle": "Crée des routines personnalisées et arrange tes outils",
    "page.room.myRoutines": "Mes routines",
    "page.room.buildRoutine": "Créer une routine",
    "page.room.customLayout": "Disposition personnalisée",
    "page.room.exercises": "Exercices",
    "page.room.total": "Total",
    "page.room.minutes": "minutes",
    "page.room.start": "Commencer",
    "page.room.addWidget": "Ajouter un widget",
    "page.room.widgets": "Widgets",
    "page.room.noRoutines": "Pas encore de routines",
    "page.room.noRoutinesDesc": "Crée ta première routine de pratique",
    "page.room.createRoutine": "Créer une routine",
    "page.room.deleteConfirm": "Es-tu sûr de vouloir supprimer cette routine ?",

    // Materials
    "page.materials.title": "Mes supports",
    "page.materials.all": "Tous",
    "page.materials.songs": "Chansons",
    "page.materials.scales": "Gammes",
    "page.materials.backing": "Pistes d'accompagnement",
    "page.materials.theory": "Théorie",
    "page.materials.teacherNote": "Note du professeur",
    "page.materials.noMaterials": "Aucun support assigné",
    "page.materials.openFullSize": "Ouvrir en taille réelle",
    "page.materials.openNewTab": "Ouvrir dans un nouvel onglet",
    "page.materials.view": "Voir",
    "page.materials.download": "Télécharger",

    // Tasks
    "page.tasks.title": "Mes tâches",
    "page.tasks.completed": "Terminé ({count})",
    "page.tasks.comment": "Ton commentaire",
    "page.tasks.success": "Bien joué !",
    "page.tasks.noTasks": "Aucune tâche assignée",
    "page.tasks.notStarted": "Pas commencé",
    "page.tasks.inProgress": "En cours",
    "page.tasks.startTask": "Commencer la tâche",
    "page.tasks.markDone": "Marquer comme terminé",
    "page.tasks.due": "Échéance",
    "page.tasks.commentPrompt": "Ajoute un commentaire sur ta progression (facultatif)",
    "page.tasks.commentPlaceholder": "Par exemple : Pratiqué 30 minutes, atteint 100 BPM !",

    // Settings
    "page.settings.title": "Paramètres",
    "page.settings.subtitle": "Gère ton profil et tes préférences",
    "page.settings.profileInfo": "Informations du profil",
    "page.settings.fullName": "Nom complet",
    "page.settings.fullNamePlaceholder": "Entre ton nom complet",
    "page.settings.email": "Email",
    "page.settings.emailNote": "L'email ne peut pas être modifié",
    "page.settings.phone": "Numéro de téléphone",
    "page.settings.phonePlaceholder": "+33 6 12 34 56 78",
    "page.settings.musicalPreferences": "Préférences musicales",
    "page.settings.skillLevel": "Niveau de compétence",
    "page.settings.beginner": "Débutant",
    "page.settings.intermediate": "Intermédiaire",
    "page.settings.advanced": "Avancé",
    "page.settings.mainStyle": "Style musical principal",
    "page.settings.instrumentType": "Type d'instrument",
    "page.settings.languageSettings": "Paramètres de langue",
    "page.settings.logoutTitle": "Déconnexion du compte",
    "page.settings.logoutDesc": "Tu seras redirigé vers la page de connexion",
    "page.settings.aboutApp": "À propos de l'app",
    "page.settings.aboutDesc": "Une plateforme d'apprentissage de guitare complète pour les élèves et les enseignants. Suis ta progression, pratique avec des outils avancés et communique avec ton professeur.",
    "page.settings.saveSuccess": "Profil mis à jour avec succès !",
  },
};

function translate(lang, key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
    return dict[key];
  }
  const fallback = TRANSLATIONS.en;
  if (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) {
    return fallback[key];
  }
  return key;
}

// ==== I18n Context ====
const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

// Hook for pages/components to use
export function useI18n() {
  return useContext(I18nContext);
}

function LanguageSwitcher({ lang, setLang, t }) {
  const [open, setOpen] = useState(false);

  const languages = [
    { code: 'en', flag: '🇺🇸', name: 'English' },
    { code: 'he', flag: '🇮🇱', name: 'עברית' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
  ];

  const currentLanguage = languages.find(l => l.code === lang) || languages[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-2 hover:bg-gray-50"
        >
          <span className="text-2xl">{currentLanguage.flag}</span>
          <span className="font-medium">{currentLanguage.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                setLang(language.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                lang === language.code
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-2xl">{language.flag}</span>
              <span className="font-medium">{language.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
// ===== END INLINE I18N =====

export default function Layout({ children, currentPageName }) {
  const [lang, setLangState] = useState('en');
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const isRTL = lang === 'he';

  // Load language from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('guitarStudioHub.lang');
      if (['en', 'he', 'ru', 'fr'].includes(stored)) {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save language to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('guitarStudioHub.lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const t = useCallback((key, params) => {
    let translatedText = translate(lang, key);
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translatedText = translatedText.replace(`{${paramKey}}`, paramValue);
      }
    }
    return translatedText;
  }, [lang]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const currentUser = await base44.auth.me();
        console.log('Layout loaded user:', currentUser?.email, 'role:', currentUser?.role, 'app_role:', currentUser?.app_role);
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
    }, []);

    const handleLogout = async () => {
    await base44.auth.logout();
    window.location.reload();
    };

    // Check if user is a teacher:
    // - Platform admin (role === 'admin') = full teacher + management access
    // - app_role === 'teacher' = teacher features only (no management access)
    // Also check account_status - frozen/cancelled teachers should see student view
    const accountStatus = user?.account_status || 'active';
    const isAccountActive = accountStatus === 'active';
    // Platform admins always have teacher access regardless of account_status
    // app_role teachers only have access if account is active
    const isTeacher = user?.role === 'admin' || (user?.app_role === 'teacher' && isAccountActive);

  const teacherNav = [
    { name: t('nav.dashboard'), path: 'TeacherDashboard', icon: LayoutDashboard },
    { name: t('nav.calendar'), path: 'TeacherCalendar', icon: Calendar },
    { name: t('nav.students'), path: 'TeacherStudents', icon: Users },
    { name: t('nav.materials'), path: 'TeacherMaterials', icon: FileText },
    { name: t('nav.tools'), path: 'TeacherTools', icon: Music },
    { name: t('nav.recommendations'), path: 'TeacherRecommendations', icon: Star },
  ];

  // Check if student has a teacher assigned
  const hasTeacher = !isTeacher && !!user?.assigned_teacher_id;

  // Build student navigation - hide teacher-dependent items if no teacher
  const studentNav = [
    { name: t('nav.dashboard'), path: 'StudentDashboard', icon: LayoutDashboard },
    { name: t('nav.tools'), path: 'StudentPractice', icon: Music },
    { name: t('nav.progress'), path: 'StudentProgress', icon: TrendingUp },
    // Only show these if student has a teacher assigned
    ...(hasTeacher ? [
      { name: t('nav.practiceRoom'), path: 'StudentPracticeRoom', icon: Star },
      { name: t('nav.materials'), path: 'StudentMaterials', icon: FileText },
      { name: t('nav.tasks'), path: 'StudentTasks', icon: CheckSquare },
      { name: t('nav.chat'), path: 'StudentChat', icon: MessageSquare },
    ] : []),
  ];
  
  // Settings always at the bottom (added separately in navigation render)
  const settingsItem = { name: t('nav.settings'), path: isTeacher ? 'TeacherSettings' : 'StudentSettings', icon: Settings };

  const navigation = isTeacher ? teacherNav : studentNav;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse">
          <Music className="w-12 h-12 text-blue-600" />
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-red-500">
        Authentication failed or user not found. Please log in.
      </div>
    );
  }

  // Wrap everything with I18nContext.Provider
  return (
    <I18nContext.Provider value={{ lang, setLang: setLangState, t }}>
      <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Mobile Header */}
        {!sidebarOpen && (
          <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-semibold text-gray-900">Virtual Practice Room</span>
              <div className="w-10" />
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} bottom-0 w-72 bg-white/80 backdrop-blur-xl ${isRTL ? 'border-l' : 'border-r'} border-gray-200 transform transition-transform duration-300 z-40 lg:translate-x-0 flex flex-col ${
            sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full mb-3 transition-transform duration-300 hover:scale-110 cursor-pointer">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691c576097028ab2df3b3f2d/60e42b72d_IMG_1251.PNG" 
                  alt="VPR Logo" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h2 className="font-bold text-gray-900 text-2xl">VPR</h2>
              <p className="text-xs text-gray-500 leading-tight">Raanana Pais Music Center</p>
            </div>

            {/* User Info */}
            <div className="mt-3 px-2 py-2 rounded-2xl bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-gray-500">{isTeacher ? t('role.teacher') : t('role.student')}</p>
                </div>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="mt-2">
              <LanguageSwitcher lang={lang} setLang={setLangState} t={t} />
            </div>
            </div>

            {/* Navigation */}
            <nav className="px-4 flex-1 overflow-y-auto pb-4 flex flex-col">
            <ul className="space-y-2 flex-1">
              {navigation.map((item) => {
                const isActive = location.pathname === createPageUrl(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={createPageUrl(item.path)}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Settings at bottom */}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Link
                to={createPageUrl(settingsItem.path)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  location.pathname === createPageUrl(settingsItem.path)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <settingsItem.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{settingsItem.name}</span>
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start gap-2 rounded-2xl border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </Button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`${isRTL ? 'lg:mr-72' : 'lg:ml-72'} pt-20 lg:pt-0 min-h-screen`}>
          {children}
        </main>
      </div>
    </I18nContext.Provider>
  );
}