import { defineStore } from 'pinia'
import type {
  AnswerValue,
  AnsweredQuestion,
  GermanStateCode,
  LocalStorageLebenStatus,
  MockTestResult,
} from '../../types/question-answer-key'
import questionAnswerKey from '@/data/question-answer-key'
import { GENERAL_QUESTION_RANGE, STATE_OPTION_ITEMS, STATE_QUESTION_RANGES } from '@/data/state-question-answer-key'

const STATUS_STORAGE_KEY = 'einfach-leben-in-deutschland-status'
const LANGUAGE_STORAGE_KEY = 'einfach-leben-in-deutschland-target-language'
const MOCK_TEST_RESULTS_STORAGE_KEY = 'einfach-leben-in-deutschland-mock-test-results'
const MOCK_TEST_STATE_STORAGE_KEY = 'einfach-leben-in-deutschland-mock-test-selected-state'

const MOCK_TEST_TOTAL_QUESTIONS = 33
const MOCK_TEST_GENERAL_QUESTIONS = 30
const MOCK_TEST_STATE_QUESTIONS = 3
const MOCK_TEST_DURATION_SECONDS = 60 * 60
const DEFAULT_STATE_CODE: GermanStateCode = 'TH'

function isGermanStateCode (value: unknown): value is GermanStateCode {
  return STATE_OPTION_ITEMS.some((item) => item.code === value)
}

function loadSelectedMockState (): GermanStateCode {
  const raw = localStorage.getItem(MOCK_TEST_STATE_STORAGE_KEY)
  return isGermanStateCode(raw) ? raw : DEFAULT_STATE_CODE
}

function loadStatus (): LocalStorageLebenStatus {
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

function isAnswerValue (value: unknown): value is AnswerValue {
  return value === 'a' || value === 'b' || value === 'c' || value === 'd'
}

function normalizeMockResult (raw: unknown): MockTestResult | null {
  if (!raw || typeof raw !== 'object') return null

  const candidate = raw as Partial<MockTestResult>
  if (typeof candidate.startedAt !== 'string') return null
  const stateCode = isGermanStateCode(candidate.stateCode) ? candidate.stateCode : DEFAULT_STATE_CODE
  if (!Array.isArray(candidate.questionNumbers)) return null
  if (!candidate.questionNumbers.every((n) => Number.isInteger(n) && n >= 1)) return null
  if (!candidate.results || !Array.isArray(candidate.results.answeredQuestions)) return null

  const answeredQuestions: AnsweredQuestion[] = []
  for (const entry of candidate.results.answeredQuestions) {
    if (!entry || typeof entry !== 'object') return null
    if (!Number.isInteger(entry.questionNumber) || entry.questionNumber < 1) return null
    if (!isAnswerValue(entry.answer)) return null
    answeredQuestions.push({ questionNumber: entry.questionNumber, answer: entry.answer })
  }

  const isInProgress = Boolean(candidate.isInProgress)
  const isComplete = Boolean(candidate.isComplete)
  const remainingSeconds =
    typeof candidate.remainingSeconds === 'number' && Number.isFinite(candidate.remainingSeconds)
      ? Math.max(0, Math.floor(candidate.remainingSeconds))
      : MOCK_TEST_DURATION_SECONDS
  const timerEndsAt =
    typeof candidate.timerEndsAt === 'number' && Number.isFinite(candidate.timerEndsAt) ? candidate.timerEndsAt : null

  return {
    startedAt: candidate.startedAt,
    stateCode,
    questionNumbers: [...candidate.questionNumbers],
    results: { answeredQuestions },
    isInProgress,
    isComplete,
    remainingSeconds,
    timerEndsAt,
  }
}

function loadMockTestResults (): MockTestResult[] {
  const raw = localStorage.getItem(MOCK_TEST_RESULTS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const normalized: MockTestResult[] = []
    for (const entry of parsed) {
      const item = normalizeMockResult(entry)
      if (item) normalized.push(item)
    }
    return normalized
  } catch {
    return []
  }
}

function shuffleNumbers (values: number[]): number[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const useLebenStatusStore = defineStore('lebenStatus', {
  state: () => ({
    answeredQuestions: loadStatus().answeredQuestions as AnsweredQuestion[],
    targetLanguage: localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en',
    mockTestResults: loadMockTestResults() as MockTestResult[],
    selectedMockState: loadSelectedMockState() as GermanStateCode,
  }),

  getters: {
    totalQuestions: () => GENERAL_QUESTION_RANGE.end,

    stateOptions: () => STATE_OPTION_ITEMS,

    answeredMap (state): Map<number, AnswerValue> {
      return new Map(state.answeredQuestions.map((a) => [a.questionNumber, a.answer]))
    },

    answeredQuestionNumbers (state): number[] {
      return [...state.answeredQuestions.map((a) => a.questionNumber)].sort((a, b) => a - b)
    },

    correctCount (state): number {
      return state.answeredQuestions.filter((a) => {
        const entry = questionAnswerKey.questions[a.questionNumber - 1]
        return entry?.answer === a.answer
      }).length
    },

    wrongCount (): number {
      return this.answeredQuestions.length - this.correctCount
    },

    hasProgress (state): boolean {
      return state.answeredQuestions.length > 0
    },

    activeMockTest (state): MockTestResult | undefined {
      return state.mockTestResults.find((result) => result.isInProgress)
    },

    hasMockTestInProgress (): boolean {
      return Boolean(this.activeMockTest)
    },

    mockTestReports (state): MockTestResult[] {
      return [...state.mockTestResults].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },

    selectedMockStateName (state): string {
      return STATE_QUESTION_RANGES[state.selectedMockState].stateName
    },
  },

  actions: {
    answerQuestion (questionNumber: number, answer: AnswerValue) {
      const existing = this.answeredQuestions.find((a) => a.questionNumber === questionNumber)
      if (existing) {
        existing.answer = answer
      } else {
        this.answeredQuestions.push({ questionNumber, answer })
      }
      this.persist()
    },

    isAnswered (questionNumber: number): boolean {
      return this.answeredMap.has(questionNumber)
    },

    getAnswer (questionNumber: number): AnswerValue | undefined {
      return this.answeredMap.get(questionNumber)
    },

    firstUnansweredQuestionNumber (): number {
      const answered = this.answeredMap
      for (let i = GENERAL_QUESTION_RANGE.start; i <= GENERAL_QUESTION_RANGE.end; i++) {
        if (!answered.has(i)) return i
      }
      return GENERAL_QUESTION_RANGE.start
    },

    setTargetLanguage (language: string) {
      this.targetLanguage = language
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    },

    startAfresh () {
      this.answeredQuestions = []
      this.persist()
    },

    setSelectedMockState (stateCode: GermanStateCode) {
      this.selectedMockState = stateCode
      localStorage.setItem(MOCK_TEST_STATE_STORAGE_KEY, stateCode)
    },

    questionNumbersForRange (start: number, end: number): number[] {
      const result: number[] = []
      for (let i = start; i <= end; i++) {
        result.push(i)
      }
      return result
    },

    pickMockQuestionNumbers (total = MOCK_TEST_TOTAL_QUESTIONS): number[] {
      const generalPool = this.questionNumbersForRange(GENERAL_QUESTION_RANGE.start, GENERAL_QUESTION_RANGE.end)
      const stateRange = STATE_QUESTION_RANGES[this.selectedMockState]
      const statePool = this.questionNumbersForRange(stateRange.start, stateRange.end).filter((questionNumber) => {
        const entry = questionAnswerKey.questions[questionNumber - 1]
        return entry?.answer !== null
      })

      const selectedStateQuestions = shuffleNumbers(statePool).slice(0, Math.min(MOCK_TEST_STATE_QUESTIONS, total))
      const requiredGeneral = Math.max(0, Math.min(total, MOCK_TEST_GENERAL_QUESTIONS + (MOCK_TEST_STATE_QUESTIONS - selectedStateQuestions.length)))
      const selectedGeneralQuestions = shuffleNumbers(generalPool).slice(0, requiredGeneral)

      const selected = [...selectedGeneralQuestions, ...selectedStateQuestions]
      if (selected.length >= total) return selected.slice(0, total).sort((a, b) => a - b)

      const missing = total - selected.length
      const remainingGeneral = generalPool.filter((number) => !selectedGeneralQuestions.includes(number))
      const topUp = shuffleNumbers(remainingGeneral).slice(0, missing)
      return [...selected, ...topUp].sort((a, b) => a - b)
    },

    startNewMockTest (): MockTestResult {
      const current = this.activeMockTest
      if (current) {
        current.timerEndsAt = null
        current.isInProgress = false
        current.isComplete = current.results.answeredQuestions.length >= current.questionNumbers.length
      }

      const next: MockTestResult = {
        startedAt: new Date().toISOString(),
        stateCode: this.selectedMockState,
        questionNumbers: this.pickMockQuestionNumbers(),
        results: { answeredQuestions: [] },
        isInProgress: true,
        isComplete: false,
        remainingSeconds: MOCK_TEST_DURATION_SECONDS,
        timerEndsAt: Date.now() + MOCK_TEST_DURATION_SECONDS * 1000,
      }

      this.mockTestResults.unshift(next)
      this.persistMockTests()
      return next
    },

    pauseMockTestTimer () {
      const test = this.activeMockTest
      if (!test || test.timerEndsAt === null) return

      const remaining = Math.max(0, Math.ceil((test.timerEndsAt - Date.now()) / 1000))
      test.remainingSeconds = remaining
      test.timerEndsAt = null
      this.persistMockTests()
    },

    resumeMockTestTimer () {
      const test = this.activeMockTest
      if (!test || test.timerEndsAt !== null || !test.isInProgress) return

      if (test.remainingSeconds <= 0) {
        this.finishMockTest(false)
        return
      }

      test.timerEndsAt = Date.now() + test.remainingSeconds * 1000
      this.persistMockTests()
    },

    syncMockTestTimer () {
      const test = this.activeMockTest
      if (!test || test.timerEndsAt === null) return

      const remaining = Math.max(0, Math.ceil((test.timerEndsAt - Date.now()) / 1000))
      test.remainingSeconds = remaining
      if (remaining <= 0) {
        this.finishMockTest(false)
      } else {
        this.persistMockTests()
      }
    },

    finishMockTest (isComplete: boolean) {
      const test = this.activeMockTest
      if (!test) return

      test.timerEndsAt = null
      test.remainingSeconds = Math.max(0, test.remainingSeconds)
      test.isInProgress = false
      test.isComplete = isComplete
      this.persistMockTests()
    },

    answerMockQuestion (questionNumber: number, answer: AnswerValue) {
      const test = this.activeMockTest
      if (!test || !test.questionNumbers.includes(questionNumber)) return

      const existing = test.results.answeredQuestions.find((a) => a.questionNumber === questionNumber)
      if (existing) {
        existing.answer = answer
      } else {
        test.results.answeredQuestions.push({ questionNumber, answer })
      }
      this.persistMockTests()
    },

    getMockAnswer (questionNumber: number, reportStartedAt?: string): AnswerValue | undefined {
      const target = reportStartedAt
        ? this.mockTestResults.find((result) => result.startedAt === reportStartedAt)
        : this.activeMockTest

      return target?.results.answeredQuestions.find((a) => a.questionNumber === questionNumber)?.answer
    },

    firstUnansweredMockQuestionNumber (): number {
      const test = this.activeMockTest
      if (!test) return 1

      const answered = new Set(test.results.answeredQuestions.map((a) => a.questionNumber))
      for (const questionNumber of test.questionNumbers) {
        if (!answered.has(questionNumber)) return questionNumber
      }
      return test.questionNumbers[0] ?? 1
    },

    getMockReport (startedAt: string): MockTestResult | undefined {
      return this.mockTestResults.find((result) => result.startedAt === startedAt)
    },

    persist () {
      const status: LocalStorageLebenStatus = { answeredQuestions: this.answeredQuestions }
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(status))
    },

    persistMockTests () {
      localStorage.setItem(MOCK_TEST_RESULTS_STORAGE_KEY, JSON.stringify(this.mockTestResults))
    },
  },
})
