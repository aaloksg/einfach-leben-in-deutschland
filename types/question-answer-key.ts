export type AnswerValue = 'a' | 'b' | 'c' | 'd'

export type GermanStateCode =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH'

export type AnswerOption = {
  value: AnswerValue
  text: string
}
export type QuestionAnswerEntry = {
  questionNumber: number
  question: string
  questionImage?: string
  answer: AnswerValue | null
  answerOptions: Record<AnswerValue, AnswerOption>
}

export type AnsweredQuestion = {
  questionNumber: number
  answer: AnswerValue
}

export type LocalStorageLebenStatus = { answeredQuestions: AnsweredQuestion[] }

export type MockTestResult = {
  startedAt: string
  stateCode: GermanStateCode
  questionNumbers: number[]
  results: LocalStorageLebenStatus
  isInProgress: boolean
  isComplete: boolean
  remainingSeconds: number
  timerEndsAt: number | null
}

export type QuestionAnswerKey = {
  questions: QuestionAnswerEntry[]
}
