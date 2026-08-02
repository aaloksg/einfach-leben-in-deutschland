/**
 * router/index.ts
 *
 * Manual routes for ./src/pages/*.vue
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import Index from '@/pages/index.vue'
import Quiz from '@/pages/quiz.vue'
import MockReports from '@/pages/mock-reports.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Index,
    },
    {
      path: '/quiz',
      component: Quiz,
    },
    {
      path: '/mock-reports',
      component: MockReports,
    },
  ],
})

export default router
