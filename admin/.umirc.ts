export default {
  routes: [
    { path: '/', component: 'index' },
    { path: '/login', component: 'Login' },
    { path: '/dashboard', component: 'Dashboard' },
  ],
  npmClient: 'npm',
  proxy: {
    '/api': {
      target: 'http://backend:8000',
      changeOrigin: true,
    },
  },
};
