module.exports = {
  apps: [
    {
      name: 'onedrop-backend',
      script: 'src/index.js',
      cwd: './server',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGO_URI: 'mongodb://localhost:27017/onedrop',
        JWT_SECRET: 'onedrop-super-secret-jwt-key'
      }
    },
    {
      name: 'onedrop-ai',
      script: 'python',
      args: 'app/main.py',
      cwd: './ml-service',
      interpreter: 'none'
    },
    {
      name: 'onedrop-analytics',
      script: 'java',
      args: '-jar target/analytics-service-0.0.1-SNAPSHOT.jar',
      cwd: './analytics-service'
    }
  ]
};
