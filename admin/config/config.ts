import { defineConfig } from "@umijs/max";

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: false,
  routes: [
    {
      path: '/login',
      component: './Login',
    },
    {
      path: '/',
      component: './index',
      routes: [
        {
          path: '/',
          redirect: '/dashboard',
        },
        {
          path: '/dashboard',
          name: 'Dashboard',
          icon: 'Dashboard',
          component: './Dashboard',
        },
        {
          path: '/users',
          name: 'Users',
          icon: 'User',
          routes: [
            {
              path: '/users/list',
              name: 'UserList',
              component: './Users/List',
            },
          ],
        },
        {
          path: '/orders',
          name: 'Orders',
          icon: 'ShoppingCart',
          routes: [
            {
              path: '/orders/list',
              name: 'OrderList',
              component: './Orders/List',
            },
          ],
        },
        {
          path: '/credits',
          name: 'Credits',
          icon: 'Coins',
          routes: [
            {
              path: '/credits/manage',
              name: 'CreditManagement',
              component: './Credits/Manage',
            },
          ],
        },
        {
          path: '/generations',
          name: 'Generations',
          icon: 'Picture',
          routes: [
            {
              path: '/generations/list',
              name: 'GenerationList',
              component: './Generations/List',
            },
          ],
        },
        {
          path: '/templates',
          name: 'Templates',
          icon: 'FileText',
          routes: [
            {
              path: '/templates/list',
              name: 'TemplateList',
              component: './Templates/List',
            },
          ],
        },
        {
          path: '/settings',
          name: 'Settings',
          icon: 'Setting',
          component: './Settings',
        },
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
});
