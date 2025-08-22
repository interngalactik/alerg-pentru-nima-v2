// Admin configuration
// Change these values as needed

export const ADMIN_CONFIG = {
  // Session duration in hours
  SESSION_DURATION_HOURS: 24,
  
  // Warning threshold for session expiration (in hours)
  SESSION_WARNING_HOURS: 1,
  
  // Maximum login attempts before temporary lockout
  MAX_LOGIN_ATTEMPTS: 5,
  
  // Lockout duration in minutes
  LOCKOUT_DURATION_MINUTES: 15
};

// Admin users configuration
export const ADMIN_USERS = [
  {
    username: 'admin',
    password: 'via-transilvanica-2024', // CHANGE THIS PASSWORD
    role: 'super_admin',
    displayName: 'Administrator Principal'
  },
  {
    username: 'moderator',
    password: 'moderator-2024', // CHANGE THIS PASSWORD
    role: 'moderator',
    displayName: 'Moderator'
  }
];


