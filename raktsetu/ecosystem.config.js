module.exports = {
  apps: [
    {
      name: 'raktsetu-backend',
      script: 'src/index.js',
      cwd: './server',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGO_URI: 'mongodb://localhost:27017/raktsetu',
        JWT_SECRET: 'raktsetu-super-secret-jwt-key'
      }
    },
    {
      name: 'raktsetu-ai',
      script: 'python',
      args: 'app/main.py',
      cwd: './ml-service',
      interpreter: 'none'
    },
    {
      name: 'raktsetu-analytics',
      script: 'java',
      args: '-jar target/analytics-service-0.0.1-SNAPSHOT.jar',
      cwd: './analytics-service'
    }
  ]
};
