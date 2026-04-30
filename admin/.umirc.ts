export default {
  routes: [
    { path: '/login', component: './Login' },
    {
      path: '/',
      component: './AppLayout',
      routes: [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', component: './Dashboard' },
        { path: '/users/list', component: './Users/List' },
        { path: '/orders/list', component: './Orders/List' },
        { path: '/credits/manage', component: './Credits/Manage' },
        { path: '/generations/list', component: './Generations/List' },
        { path: '/templates/list', component: './Templates/List' },
        { path: '/settings', component: './Settings' },
      ],
    },
  ],
  npmClient: 'npm',
  proxy: {
    '/api': {
      target: 'http://backend:8000',
      changeOrigin: true,
    },
  },
};
