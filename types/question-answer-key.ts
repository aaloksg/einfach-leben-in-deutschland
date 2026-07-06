export type AnswerValue = 'a' | 'b' | 'c' | 'd'

export type AnswerOption = {
  value: AnswerValue
  text: string
}
export type QuestionAnswerEntry = {
  questionNumber: number
  question: string
  questionImage?: string
  answer: AnswerValue
  answerOptions: Record<AnswerValue, AnswerOption>
}

export type AnsweredQuestion = {
  questionNumber: number
  answer: AnswerValue
}

export type LocalStorageLebenStatus = { answeredQuestions: AnsweredQuestion[] }

export type QuestionAnswerKey = {
  questions: QuestionAnswerEntry[]
}
