export type Lang = 'en' | 'he';

type TranslationDict = Record<string, string>;

const en: TranslationDict = {
  // App
  'app.title': 'Guitar Studio Hub',
  
  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.students': 'Students',
  'nav.materials': 'Materials',
  'nav.tasks': 'Tasks',
  'nav.practice': 'Practice',
  'nav.practiceRoom': 'Practice Room',
  'nav.progress': 'Progress',
  'nav.chat': 'Chat',
  'nav.settings': 'Settings',
  'nav.recommendations': 'Recommendations',
  'nav.logout': 'Logout',
  'nav.practiceTools': 'Practice Tools',
  
  // Auth
  'auth.login': 'Log in',
  'auth.email': 'Email',
  'auth.password': 'Password',
  
  // Dashboard
  'dashboard.hello': 'Hello',
  'dashboard.readyToMakeMusic': 'Ready to make some music today?',
  'dashboard.nextLesson': 'Next Lesson',
  'dashboard.practiceStreak': 'Practice Streak',
  'dashboard.thisWeek': 'This Week',
  'dashboard.todayLessons': "Today's Lessons",
  'dashboard.totalStudents': 'Total Students',
  'dashboard.recentMessages': 'Recent Messages',
  'dashboard.studentsOverview': 'Students Overview',
  'dashboard.activeTasks': 'Active Tasks',
  'dashboard.recommendations': 'Recommendations for You',
  
  // Practice
  'practice.studio': 'Practice Studio',
  'practice.metronome': 'Metronome',
  'practice.tuner': 'Tuner',
  'practice.timer': 'Practice Timer',
  'practice.recorder': 'Recorder',
  'practice.earTraining': 'Ear Training',
  'practice.rhythmTrainer': 'Rhythm Trainer',
  'practice.chooseYourTool': 'Choose your tool and start practicing',
  
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.back': 'Back',
  'common.loading': 'Loading...',
  'common.language': 'Language',
  'common.minutes': 'minutes',
  'common.days': 'days',
  'common.level': 'Level',
  'common.status': 'Status',
  'common.active': 'Active',
  
  // Materials
  'materials.library': 'Materials Library',
  'materials.myMaterials': 'My Materials',
  'materials.upload': 'Upload Material',
  'materials.assignMaterial': 'Assign Material',
  
  // Tasks
  'tasks.myTasks': 'My Tasks',
  'tasks.createTask': 'Create Task',
  'tasks.notStarted': 'Not Started',
  'tasks.inProgress': 'In Progress',
  'tasks.done': 'Done',
  'tasks.dueDate': 'Due Date',
  
  // Settings
  'settings.title': 'Settings',
  'settings.languageSettings': 'Language Settings',
  'settings.selectLanguage': 'Select Language',
  'settings.profileSettings': 'Profile Settings',
  'settings.fullName': 'Full Name',
  'settings.phone': 'Phone',
  'settings.mainStyle': 'Main Style',
  
  // Chat
  'chat.withTeacher': 'Chat with Teacher',
  'chat.typeMessage': 'Type a message...',
  'chat.noMessages': 'No messages yet. Start a conversation!',
  
  // Progress
  'progress.myProgress': 'My Progress',
  'progress.overview': 'Overview',
  'progress.statistics': 'Statistics',
  'progress.goals': 'Goals',
  'progress.achievements': 'Achievements',
};

const he: TranslationDict = {
  // App
  'app.title': 'Guitar Studio Hub',
  
  // Navigation
  'nav.dashboard': 'דשבורד',
  'nav.students': 'תלמידים',
  'nav.materials': 'חומרים',
  'nav.tasks': 'משימות',
  'nav.practice': 'תרגול',
  'nav.practiceRoom': 'חדר תרגול',
  'nav.progress': 'התקדמות',
  'nav.chat': 'צ\'אט',
  'nav.settings': 'הגדרות',
  'nav.recommendations': 'המלצות',
  'nav.logout': 'התנתק',
  'nav.practiceTools': 'כלי תרגול',
  
  // Auth
  'auth.login': 'התחברות',
  'auth.email': 'אימייל',
  'auth.password': 'סיסמה',
  
  // Dashboard
  'dashboard.hello': 'שלום',
  'dashboard.readyToMakeMusic': 'מוכן ליצור מוזיקה היום?',
  'dashboard.nextLesson': 'השיעור הבא',
  'dashboard.practiceStreak': 'רצף תרגול',
  'dashboard.thisWeek': 'השבוע',
  'dashboard.todayLessons': 'השיעורים היום',
  'dashboard.totalStudents': 'סך התלמידים',
  'dashboard.recentMessages': 'הודעות אחרונות',
  'dashboard.studentsOverview': 'סקירת תלמידים',
  'dashboard.activeTasks': 'משימות פעילות',
  'dashboard.recommendations': 'המלצות עבורך',
  
  // Practice
  'practice.studio': 'אולפן תרגול',
  'practice.metronome': 'מטרונום',
  'practice.tuner': 'טיונר',
  'practice.timer': 'טיימר תרגול',
  'practice.recorder': 'מקליט',
  'practice.earTraining': 'אימון אוזן',
  'practice.rhythmTrainer': 'מאמן קצב',
  'practice.chooseYourTool': 'בחר את הכלי שלך והתחל לתרגל',
  
  // Common
  'common.save': 'שמור',
  'common.cancel': 'בטל',
  'common.delete': 'מחק',
  'common.edit': 'ערוך',
  'common.add': 'הוסף',
  'common.back': 'חזור',
  'common.loading': 'טוען...',
  'common.language': 'שפה',
  'common.minutes': 'דקות',
  'common.days': 'ימים',
  'common.level': 'רמה',
  'common.status': 'סטטוס',
  'common.active': 'פעיל',
  
  // Materials
  'materials.library': 'ספריית חומרים',
  'materials.myMaterials': 'החומרים שלי',
  'materials.upload': 'העלה חומר',
  'materials.assignMaterial': 'הקצה חומר',
  
  // Tasks
  'tasks.myTasks': 'המשימות שלי',
  'tasks.createTask': 'צור משימה',
  'tasks.notStarted': 'לא התחיל',
  'tasks.inProgress': 'בתהליך',
  'tasks.done': 'הושלם',
  'tasks.dueDate': 'תאריך יעד',
  
  // Settings
  'settings.title': 'הגדרות',
  'settings.languageSettings': 'הגדרות שפה',
  'settings.selectLanguage': 'בחר שפה',
  'settings.profileSettings': 'הגדרות פרופיל',
  'settings.fullName': 'שם מלא',
  'settings.phone': 'טלפון',
  'settings.mainStyle': 'סגנון עיקרי',
  
  // Chat
  'chat.withTeacher': 'צ\'אט עם המורה',
  'chat.typeMessage': 'כתוב הודעה...',
  'chat.noMessages': 'אין הודעות עדיין. התחל שיחה!',
  
  // Progress
  'progress.myProgress': 'ההתקדמות שלי',
  'progress.overview': 'סקירה כללית',
  'progress.statistics': 'סטטיסטיקות',
  'progress.goals': 'מטרות',
  'progress.achievements': 'הישגים',
};

const translations: Record<Lang, TranslationDict> = { en, he };

export function translate(lang: Lang, key: string): string {
  const dict = translations[lang];
  if (dict && key in dict) return dict[key];

  const fallbackDict = translations.en;
  if (fallbackDict && key in fallbackDict) return fallbackDict[key];

  return key;
}