const getTimeBasedGreeting = () => {
  const utcDate = new Date();
  // Convert to Indian Standard Time (IST, UTC+5:30) mathematically
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcDate.getTime() + istOffsetMs);
  const hour = istDate.getUTCHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const buildGreetingMessage = (fullName) => {
  const greeting = getTimeBasedGreeting();
  const firstName = fullName?.split(' ')[0] || 'Lifesaver';
  return `${greeting}, ${firstName}! Welcome back to ONEDROP.`;
};

module.exports = { getTimeBasedGreeting, buildGreetingMessage };
