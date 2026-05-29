const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const buildGreetingMessage = (fullName) => {
  const greeting = getTimeBasedGreeting();
  const firstName = fullName?.split(' ')[0] || 'Lifesaver';
  return `${greeting}, ${firstName}! Welcome back to RaktSetu.`;
};

module.exports = { getTimeBasedGreeting, buildGreetingMessage };
