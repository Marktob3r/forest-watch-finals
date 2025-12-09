export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon?: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'new_member', title: 'New Member', description: 'Welcome to Forest Watch — you joined the community', icon: '🎉' },
  { id: 'first_report', title: 'First Report', description: 'Submitted your first report', icon: '📝' },
  { id: 'report_10', title: 'Reporter — 10', description: 'Submitted 10 reports', icon: '📈' },
  { id: 'report_50', title: 'Reporter — 50', description: 'Submitted 50 reports', icon: '🏆' },
  { id: 'community_builder', title: 'Community Builder', description: 'Followed 5 projects', icon: '🤝' },
  { id: 'early_adopter', title: 'Early Adopter', description: 'One of the first 100 users', icon: '🌟' },
  { id: 'report_champion', title: 'Report Champion', description: 'Submitted 20+ reports', icon: '🏅' },
  { id: 'community_leader', title: 'Community Leader', description: 'Active community member', icon: '👥' },
  { id: 'first_alert', title: 'First Alert', description: 'Received your first alert', icon: '🔔' },
  { id: 'shield_keeper', title: 'Privacy Advocate', description: 'Enabled all privacy settings', icon: '🛡️' },
  { id: 'two_factor', title: 'Secure Account', description: 'Enabled two-factor authentication', icon: '🔐' },
  { id: 'map_explorer', title: 'Map Explorer', description: 'Visited the Monitor map 10 times', icon: '🗺️' },
  { id: 'ndvi_tracker', title: 'NDVI Watcher', description: 'Viewed NDVI charts for 7 consecutive days', icon: '🌿' },
  { id: 'bug_reporter', title: 'Bug Reporter', description: 'Submitted a bug report that was fixed', icon: '🐞' },
  { id: 'mentor', title: 'Mentor', description: 'Helped onboard 5 users', icon: '🎓' },
  { id: 'sustainer', title: 'Sustainer', description: 'Contributed 100 edits', icon: '🌱' },
  { id: 'volunteer', title: 'Volunteer', description: 'Volunteered in a community project', icon: '🤲' },
  { id: 'long_time_user', title: 'One Year', description: 'Been on Forest Watch for 1 year', icon: '🎉' },
  { id: 'night_owl', title: 'Night Owl', description: 'Used the app between 2–4 AM 5 times', icon: '🌙' },
  { id: 'streak_7', title: '7-Day Streak', description: 'Logged in for 7 consecutive days', icon: '🔥' },
  { id: 'streak_30', title: '30-Day Streak', description: 'Logged in for 30 consecutive days', icon: '💪' },
  // Add more as needed
];

export function findAchievement(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}
