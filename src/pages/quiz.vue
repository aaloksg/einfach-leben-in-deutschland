<template>
  <div
    class="d-flex flex-column"
    style="min-height: 100vh"
  >
    <v-toolbar
      color="primary"
      density="comfortable"
    >
      <v-btn
        :disabled="!canGoPrev"
        icon="mdi-chevron-left"
        @click="goPrev"
      />

      <v-select
        v-model="currentQuestionNumber"
        density="compact"
        hide-details
        item-title="label"
        item-value="value"
        :items="questionSelectItems"
        style="max-width: 240px"
        variant="solo-filled"
      />

      <v-spacer />

      <v-btn
        :disabled="!canGoNext"
        icon="mdi-chevron-right"
        @click="goNext"
      />
    </v-toolbar>

    <v-main class="flex-grow-1">
      <v-container style="max-width: 700px">
        <v-chip
          v-if="isOverview"
          class="mb-4"
          color="secondary"
          variant="flat"
        >
          Übersichtsmodus
        </v-chip>

        <v-chip
          v-if="isMockTest"
          class="mb-4 ml-2"
          color="warning"
          variant="flat"
        >
          Mock-Test
        </v-chip>

        <v-img
          v-if="currentEntry.questionImage"
          class="mb-4 mx-auto"
          max-width="500"
          :src="imageUrl"
        />

        <div class="d-flex align-start mb-1">
          <div class="text-h6 flex-grow-1">{{ currentEntry.question }}</div>

          <v-btn
            v-if="!isMockTest"
            icon="mdi-translate"
            size="small"
            variant="text"
            @click="showQuestionTranslation = !showQuestionTranslation"
          />
        </div>

        <v-alert
          v-if="showQuestionTranslation && !isMockTest"
          class="mb-4"
          density="compact"
          type="info"
          variant="tonal"
        >
          {{ translatedQuestion }}
        </v-alert>

        <v-radio-group
          hide-details
          :model-value="selectedAnswer"
          @update:model-value="onSelect"
        >
          <div
            v-for="letter in letters"
            :key="letter"
            class="mb-1"
          >
            <div
              class="d-flex align-center pa-2 rounded"
              :class="optionClass(letter)"
            >
              <v-radio
                :disabled="isOverview"
                :label="currentEntry.answerOptions[letter].text"
                :value="letter"
              />

              <v-btn
                v-if="!isMockTest"
                icon="mdi-translate"
                size="small"
                variant="text"
                @click="shownAnswerTranslations[letter] = !shownAnswerTranslations[letter]"
              />
            </div>

            <v-alert
              v-if="shownAnswerTranslations[letter] && !isMockTest"
              class="mb-2 ml-8"
              density="compact"
              type="info"
              variant="tonal"
            >
              {{ translatedAnswer(letter) }}
            </v-alert>
          </div>
        </v-radio-group>
      </v-container>
    </v-main>

    <v-toolbar density="comfortable">
      <v-btn
        :disabled="!canGoPrev"
        @click="goPrev"
      >
        Zurück
      </v-btn>

      <v-spacer />

      <v-btn
        icon="mdi-home"
        @click="goHome"
      />

      <v-spacer />

      <v-btn
        :disabled="!canGoNext"
        @click="goNext"
      >
        Weiter
      </v-btn>
    </v-toolbar>

    <v-toolbar
      v-if="showMockTimerBar"
      class="px-4"
      color="warning"
      density="comfortable"
    >
      <div class="d-flex flex-column flex-grow-1 mr-4">
        <div class="text-body-2 font-weight-medium mb-1">
          Fortschritt: {{ mockAnsweredCount }} / {{ mockTotalCount }} beantwortet
        </div>
        <v-progress-linear
          color="success"
          height="8"
          :model-value="mockProgressPercent"
          rounded
        />
      </div>

      <div class="text-body-1 font-weight-bold mr-4">Verbleibende Zeit: {{ formattedMockRemaining }}</div>

      <v-btn
        color="error"
        variant="flat"
        @click="finishMockTest"
      >
        Test beenden
      </v-btn>
    </v-toolbar>
  </div>
</template>

<script lang="ts" setup>
import type { AnswerValue } from '../../types/question-answer-key'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import questionAnswerKey from '@/data/question-answer-key'
import de from '@/locales/de'
import en from '@/locales/en'
import { useLebenStatusStore } from '@/stores/leben-status'

const letters: AnswerValue[] = ['a', 'b', 'c', 'd']

const localeMessages: Record<string, typeof de> = { de, en }

const route = useRoute()
const router = useRouter()
const store = useLebenStatusStore()
let timerInterval: ReturnType<typeof setInterval> | undefined

const isOverview = computed(() => route.query.mode === 'overview')
const isMockTest = computed(() => route.query.test === 'mock' || route.query.source === 'mock')
const reportId = computed(() => (typeof route.query.report === 'string' ? route.query.report : ''))
const overviewMockReport = computed(() => (reportId.value ? store.getMockReport(reportId.value) : undefined))

const activeMockQuestionNumbers = computed(() => store.activeMockTest?.questionNumbers ?? [])
const overviewMockQuestionNumbers = computed(() => {
  const report = overviewMockReport.value
  if (!report) return []

  const answeredSet = new Set(report.results.answeredQuestions.map((a) => a.questionNumber))
  return report.questionNumbers.filter((n) => answeredSet.has(n))
})

const navigableQuestionNumbers = computed(() => {
  if (isMockTest.value && !isOverview.value) return activeMockQuestionNumbers.value
  if (isMockTest.value && isOverview.value) return overviewMockQuestionNumbers.value
  if (isOverview.value) return store.answeredQuestionNumbers
  return Array.from({ length: store.totalQuestions }, (_, i) => i + 1)
})

const currentQuestionNumber = computed<number>({
  get: () => {
    const n = Number(route.query.q)
    if (!Number.isInteger(n)) return navigableQuestionNumbers.value[0] ?? 1
    if (!navigableQuestionNumbers.value.includes(n)) return navigableQuestionNumbers.value[0] ?? 1
    return n
  },
  set: (value: number) => {
    router.replace({ path: '/quiz', query: { ...route.query, q: value } })
  }
})

const currentEntry = computed(() => questionAnswerKey.questions[currentQuestionNumber.value - 1])

const questionSelectItems = computed(() =>
  navigableQuestionNumbers.value.map((n) => ({ label: `Frage ${n}`, value: n }))
)

const currentIndexInNavigable = computed(() => navigableQuestionNumbers.value.indexOf(currentQuestionNumber.value))
const canGoPrev = computed(() => currentIndexInNavigable.value > 0)
const canGoNext = computed(
  () =>
    currentIndexInNavigable.value !== -1 && currentIndexInNavigable.value < navigableQuestionNumbers.value.length - 1
)

function goPrev() {
  if (canGoPrev.value) currentQuestionNumber.value = navigableQuestionNumbers.value[currentIndexInNavigable.value - 1]
}
function goNext() {
  if (canGoNext.value) currentQuestionNumber.value = navigableQuestionNumbers.value[currentIndexInNavigable.value + 1]
}
function goHome() {
  if (isMockTest.value && !isOverview.value) {
    store.pauseMockTestTimer()
  }
  router.push('/')
}

const selectedAnswer = computed(() => {
  if (isMockTest.value && isOverview.value) {
    return store.getMockAnswer(currentQuestionNumber.value, reportId.value)
  }
  if (isMockTest.value) {
    return store.getMockAnswer(currentQuestionNumber.value)
  }
  return store.getAnswer(currentQuestionNumber.value)
})

function onSelect(value: unknown) {
  if (isOverview.value) return
  if (isMockTest.value) {
    store.answerMockQuestion(currentQuestionNumber.value, value as AnswerValue)
    return
  }
  store.answerQuestion(currentQuestionNumber.value, value as AnswerValue)
}

function optionClass(letter: AnswerValue) {
  if (isMockTest.value && !isOverview.value) {
    return letter === selectedAnswer.value ? 'bg-blue-lighten-5' : ''
  }

  const expectedAnswer = currentEntry.value.answer
  if (!expectedAnswer) {
    return letter === selectedAnswer.value ? 'bg-blue-lighten-5' : ''
  }

  if (isOverview.value) {
    if (letter === expectedAnswer) return 'bg-green-lighten-4'
    if (letter === selectedAnswer.value) return 'bg-red-lighten-4'
    return ''
  }
  if (letter === selectedAnswer.value) {
    return selectedAnswer.value === expectedAnswer ? 'bg-green-lighten-4' : 'bg-red-lighten-4'
  }
  return ''
}

const imageUrl = computed(() => {
  const image = currentEntry.value.questionImage
  if (!image) return ''

  const resolved = currentQuestionNumber.value > 300 && !image.startsWith('states/') ? `states/${image}` : image
  return `${import.meta.env.BASE_URL}questions/${resolved}`
})

const showQuestionTranslation = ref(false)
const shownAnswerTranslations = reactive<Record<AnswerValue, boolean>>({ a: false, b: false, c: false, d: false })

watch(currentQuestionNumber, () => {
  showQuestionTranslation.value = false
  for (const letter of letters) shownAnswerTranslations[letter] = false
})

const translatedEntry = computed(() => {
  const messages = localeMessages[store.targetLanguage] ?? en
  return messages.questions[`question_${currentQuestionNumber.value}` as keyof typeof messages.questions]
})
const translatedQuestion = computed(() => translatedEntry.value?.question ?? '')
function translatedAnswer(letter: AnswerValue) {
  return translatedEntry.value?.[`answer_${letter}`] ?? ''
}

const showMockTimerBar = computed(() => isMockTest.value && !isOverview.value && Boolean(store.activeMockTest))
const mockRemainingSeconds = computed(() => store.activeMockTest?.remainingSeconds ?? 0)
const mockAnsweredCount = computed(() => store.activeMockTest?.results.answeredQuestions.length ?? 0)
const mockTotalCount = computed(() => store.activeMockTest?.questionNumbers.length ?? 0)
const mockProgressPercent = computed(() => {
  if (mockTotalCount.value === 0) return 0
  return (mockAnsweredCount.value / mockTotalCount.value) * 100
})

const formattedMockRemaining = computed(() => {
  const total = Math.max(0, mockRemainingSeconds.value)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function finishMockTest() {
  const active = store.activeMockTest
  if (!active) return

  const isComplete = active.results.answeredQuestions.length >= active.questionNumbers.length
  store.finishMockTest(isComplete)
  router.push('/mock-reports')
}

watch(
  () => [isMockTest.value, isOverview.value] as const,
  ([mockMode, overview]) => {
    if (!mockMode || overview) return
    store.resumeMockTestTimer()
  },
  { immediate: true }
)

watch(
  () => store.activeMockTest?.isInProgress,
  (inProgress) => {
    if (isMockTest.value && !isOverview.value && inProgress === false) {
      router.push('/mock-reports')
    }
  }
)

onMounted(() => {
  timerInterval = setInterval(() => {
    if (isMockTest.value && !isOverview.value) {
      store.syncMockTestTimer()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>
