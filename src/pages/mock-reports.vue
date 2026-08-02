<template>
  <v-container max-width="900">
    <v-card
      class="pa-4"
      elevation="2"
    >
      <v-card-title class="text-h5 d-flex align-center">
        Mock-Test-Berichte
        <v-spacer />
        <v-btn
          icon="mdi-home"
          variant="text"
          @click="goHome"
        />
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="!reports.length"
          density="comfortable"
          type="info"
          variant="tonal"
        >
          Es sind noch keine Mock-Test-Berichte vorhanden.
        </v-alert>

        <v-expansion-panels v-else>
          <v-expansion-panel
            v-for="report in reports"
            :key="report.startedAt"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center w-100">
                <div class="text-body-1 font-weight-medium">
                  {{ formatDateTime(report.startedAt) }}
                </div>
                <v-spacer />
                <v-chip
                  :color="report.isInProgress ? 'warning' : 'primary'"
                  size="small"
                  variant="flat"
                >
                  {{ report.isInProgress ? 'In Bearbeitung' : 'Beendet' }}
                </v-chip>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div class="mb-2">Bundesland: {{ stateLabel(report.stateCode) }}</div>
              <div class="mb-2">
                Beantwortet: {{ report.results.answeredQuestions.length }} / {{ report.questionNumbers.length }}
              </div>
              <div class="mb-2">
                Richtig: <span class="text-green font-weight-bold">{{ reportCorrectCount(report) }}</span> | Falsch:
                <span class="text-red font-weight-bold">{{ reportWrongCount(report) }}</span>
              </div>
              <div class="mb-2">Vollständig beantwortet: {{ report.isComplete ? 'Ja' : 'Nein' }}</div>
              <div class="mb-4 d-flex align-center ga-2">
                Ergebnisstatus:
                <v-chip
                  :color="reportResultColor(report)"
                  size="small"
                  variant="flat"
                >
                  {{ reportResultLabel(report) }}
                </v-chip>
                <span class="text-caption">(Bestehensgrenze: 15 / 33)</span>
              </div>

              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  v-if="report.isInProgress"
                  color="warning"
                  @click="continueInProgressTest()"
                >
                  Test fortsetzen
                </v-btn>

                <v-btn
                  :disabled="report.results.answeredQuestions.length === 0"
                  variant="tonal"
                  @click="openOverview(report.startedAt)"
                >
                  Übersicht öffnen
                </v-btn>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import type { MockTestResult } from '../../types/question-answer-key'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import questionAnswerKey from '@/data/question-answer-key'
import { useLebenStatusStore } from '@/stores/leben-status'

const router = useRouter()
const store = useLebenStatusStore()

const reports = computed(() => store.mockTestReports)

function reportCorrectCount(report: MockTestResult) {
  return report.results.answeredQuestions.filter((entry) => {
    const answer = questionAnswerKey.questions[entry.questionNumber - 1]?.answer
    if (!answer) return false
    return answer === entry.answer
  }).length
}

function reportWrongCount(report: MockTestResult) {
  const gradableAnsweredCount = report.results.answeredQuestions.filter((entry) => {
    const answer = questionAnswerKey.questions[entry.questionNumber - 1]?.answer
    return Boolean(answer)
  }).length
  return gradableAnsweredCount - reportCorrectCount(report)
}

function stateLabel(stateCode: MockTestResult['stateCode']) {
  return store.stateOptions.find((entry) => entry.code === stateCode)?.label ?? stateCode
}

function reportResultLabel(report: MockTestResult) {
  if (report.isInProgress) return 'In Bearbeitung'
  return reportCorrectCount(report) >= 15 ? 'Bestanden' : 'Nicht bestanden'
}

function reportResultColor(report: MockTestResult) {
  if (report.isInProgress) return 'warning'
  return reportCorrectCount(report) >= 15 ? 'success' : 'error'
}

function openOverview(startedAt: string) {
  const report = store.getMockReport(startedAt)
  if (!report) return

  const first = report.results.answeredQuestions.map((a) => a.questionNumber).sort((a, b) => a - b)[0]

  if (!first) return

  router.push({ path: '/quiz', query: { mode: 'overview', source: 'mock', report: startedAt, q: first } })
}

function continueInProgressTest() {
  const first = store.firstUnansweredMockQuestionNumber()
  store.resumeMockTestTimer()
  router.push({ path: '/quiz', query: { test: 'mock', q: first } })
}

function goHome() {
  router.push('/')
}

function formatDateTime(isoDateTime: string) {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return isoDateTime
  return date.toLocaleString('de-DE')
}
</script>
