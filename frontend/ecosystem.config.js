module.exports = {
  apps: [
    {
      name: 'anicon-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/anicon/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
