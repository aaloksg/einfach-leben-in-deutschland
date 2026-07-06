import { defineStore } from 'pinia'
import type { AnswerValue, AnsweredQuestion, LocalStorageLebenStatus } from '../../types/question-answer-key'
import questionAnswerKey from '@/data/question-answer-key'

const STATUS_STORAGE_KEY = 'einfach-leben-in-deutschland-status'
const LANGUAGE_STORAGE_KEY = 'einfach-leben-in-deutschland-target-language'

function loadStatus(): LocalStorageLebenStatus {
  const raw = localStorage.getItem(STATUS_STORAGE_KEY)
  if (!raw) return { answeredQuestions: [] }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.answeredQuestions)) return parsed
  } catch {
    // fall through to default below
  }
  return { answeredQuestions: [] }
}

export const useLebenStatusStore = defineStore('lebenStatus', {
  state: () => ({
    answeredQuestions: loadStatus().answeredQuestions as AnsweredQuestion[],
    targetLanguage: localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en',
  }),

  getters: {
    totalQuestions: () => questionAnswerKey.questions.length,

    answeredMap(state): Map<number, AnswerValue> {
      return new Map(state.answeredQuestions.map((a) => [a.questionNumber, a.answer]))
    },

    answeredQuestionNumbers(state): number[] {
      return [...state.answeredQuestions.map((a) => a.questionNumber)].sort((a, b) => a - b)
    },

    correctCount(state): number {
      return state.answeredQuestions.filter((a) => {
        const entry = questionAnswerKey.questions[a.questionNumber - 1]
        return entry?.answer === a.answer
      }).length
    },

    wrongCount(): number {
      return this.answeredQuestions.length - this.correctCount
    },

    hasProgress(state): boolean {
      return state.answeredQuestions.length > 0
    },
  },

  actions: {
    answerQuestion(questionNumber: number, answer: AnswerValue) {
      const existing = this.answeredQuestions.find((a) => a.questionNumber === questionNumber)
      if (existing) {
        existing.answer = answer
      } else {
        this.answeredQuestions.push({ questionNumber, answer })
      }
      this.persist()
    },

    isAnswered(questionNumber: number): boolean {
      return this.answeredMap.has(questionNumber)
    },

    getAnswer(questionNumber: number): AnswerValue | undefined {
      return this.answeredMap.get(questionNumber)
    },

    firstUnansweredQuestionNumber(): number {
      const answered = this.answeredMap
      for (let i = 1; i <= this.totalQuestions; i++) {
        if (!answered.has(i)) return i
      }
      return 1
    },

    setTargetLanguage(language: string) {
      this.targetLanguage = language
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    },

    startAfresh() {
      this.answeredQuestions = []
      this.persist()
    },

    persist() {
      const status: LocalStorageLebenStatus = { answeredQuestions: this.answeredQuestions }
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(status))
    },
  },
})
