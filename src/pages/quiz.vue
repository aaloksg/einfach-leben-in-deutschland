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

        <v-img
          v-if="currentEntry.questionImage"
          class="mb-4 mx-auto"
          max-width="500"
          :src="imageUrl"
        />

        <div class="d-flex align-start mb-1">
          <div class="text-h6 flex-grow-1">{{ currentEntry.question }}</div>

          <v-btn
            icon="mdi-translate"
            size="small"
            variant="text"
            @click="showQuestionTranslation = !showQuestionTranslation"
          />
        </div>

        <v-alert
          v-if="showQuestionTranslation"
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
                icon="mdi-translate"
                size="small"
                variant="text"
                @click="shownAnswerTranslations[letter] = !shownAnswerTranslations[letter]"
              />
            </div>

            <v-alert
              v-if="shownAnswerTranslations[letter]"
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
  </div>
</template>

<script lang="ts" setup>
import type { AnswerValue } from '../../types/question-answer-key'
import { computed, reactive, ref, watch } from 'vue'
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

const isOverview = computed(() => route.query.mode === 'overview')

const navigableQuestionNumbers = computed(() =>
  isOverview.value ? store.answeredQuestionNumbers : Array.from({ length: store.totalQuestions }, (_, i) => i + 1)
)

const currentQuestionNumber = computed<number>({
  get: () => {
    const n = Number(route.query.q)
    return Number.isInteger(n) && n >= 1 && n <= store.totalQuestions ? n : (navigableQuestionNumbers.value[0] ?? 1)
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
  router.push('/')
}

const selectedAnswer = computed(() => store.getAnswer(currentQuestionNumber.value))

function onSelect(value: unknown) {
  if (isOverview.value) return
  store.answerQuestion(currentQuestionNumber.value, value as AnswerValue)
}

function optionClass(letter: AnswerValue) {
  if (isOverview.value) {
    if (letter === currentEntry.value.answer) return 'bg-green-lighten-4'
    if (letter === selectedAnswer.value) return 'bg-red-lighten-4'
    return ''
  }
  if (letter === selectedAnswer.value) {
    return selectedAnswer.value === currentEntry.value.answer ? 'bg-green-lighten-4' : 'bg-red-lighten-4'
  }
  return ''
}

const imageUrl = computed(() => `${import.meta.env.BASE_URL}questions/${currentEntry.value.questionImage}`)

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
</script>
