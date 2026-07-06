<template>
  <v-container
    class="fill-height"
    max-width="600"
  >
    <v-responsive
      class="mx-auto"
      max-width="600"
    >
      <v-card
        class="pa-4"
        elevation="2"
      >
        <v-card-title class="text-h5">Leben in Deutschland</v-card-title>
        <v-card-text>
          <p>
            Übe alle 300 Fragen des Einbürgerungstests „Leben in Deutschland“. Beantworte die Fragen der Reihe nach oder
            springe direkt zu einer bestimmten Frage. Dein Fortschritt wird automatisch auf diesem Gerät gespeichert.
          </p>

          <template v-if="store.hasProgress">
            <v-divider class="my-4" />
            <div class="text-body-1 mb-4">
              Fortschritt: {{ store.answeredQuestions.length }} von {{ store.totalQuestions }} beantwortet =
              <span class="text-green font-weight-bold">{{ store.correctCount }} richtig</span>
              /
              <span class="text-red font-weight-bold">{{ store.wrongCount }} falsch</span>
            </div>

            <v-btn
              block
              class="mb-3"
              color="primary"
              size="large"
              @click="continueTest"
            >
              Test fortsetzen
            </v-btn>
            <v-btn
              block
              class="mb-3"
              variant="tonal"
              @click="goToOverview"
            >
              Übersicht ansehen
            </v-btn>
            <v-btn
              block
              color="error"
              variant="outlined"
              @click="confirmStartAfresh"
            >
              Neu beginnen
            </v-btn>
          </template>

          <template v-else>
            <v-btn
              block
              color="primary"
              size="large"
              @click="continueTest"
            >
              Test beginnen
            </v-btn>
          </template>

          <v-divider class="my-6" />

          <v-select
            v-model="targetLanguage"
            density="comfortable"
            item-title="label"
            item-value="value"
            :items="languageOptions"
            label="Übersetzen nach"
            variant="outlined"
          />
        </v-card-text>
      </v-card>
    </v-responsive>

    <v-dialog
      v-model="confirmDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Neu beginnen?</v-card-title>
        <v-card-text>
          Dein gesamter Fortschritt wird gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmDialog = false">Abbrechen</v-btn>
          <v-btn
            color="error"
            @click="startAfresh"
            >Neu beginnen</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLebenStatusStore } from '@/stores/leben-status'

const router = useRouter()
const store = useLebenStatusStore()
const confirmDialog = ref(false)

const languageOptions = [{ label: 'Englisch', value: 'en' }]

const targetLanguage = computed({
  get: () => store.targetLanguage,
  set: (value: string) => store.setTargetLanguage(value)
})

function continueTest() {
  router.push({ path: '/quiz', query: { q: store.firstUnansweredQuestionNumber() } })
}

function goToOverview() {
  const first = store.answeredQuestionNumbers[0]
  router.push({ path: '/quiz', query: { q: first, mode: 'overview' } })
}

function confirmStartAfresh() {
  confirmDialog.value = true
}

function startAfresh() {
  store.startAfresh()
  confirmDialog.value = false
  router.push({ path: '/quiz', query: { q: 1 } })
}
</script>
