# Leben in Deutschland - Einfach zu lernen version

The leben in deutschland is test/exam with 300 questions - each question has 4 answer options, with only one correct answer.

## Data

The images for some questions are in einfach-leben-in-deutschland\online-resources\images\questions\[question-number]
The answer-key is a Map<number, string>, provided in einfach-leben-in-deutschland\src\answer-key.ts.
The answer option values are 'a' | 'b' | 'c' | 'd'

### Prerequisite TODOs

Questions and Answer options - Need to be extracted from einfach-leben-in-deutschland\online-resources\gesamtfragenkatalog-lebenindeutschland.pdf.
Once they are extracted, create translation files for DE and EN structured as follows in each translation file -

- Parent all question-answer translations under questions object.
- Translations for the question will be structured as follows -

```
questions: {
  question_[question-number(1-300)]: {
    question: '.....',
    answer_[answer-value(a,b,c,d)]: '....'
  }
}
```

Once the questions are extracted, we need to create a JSON file that holds the questions, answers, locale-keys, image name if available - QuestionAnswerKey in einfach-leben-in-deutschland\types\question-answer-key.ts. The text of the question and answers in the JSON will be the actual DE question and answers -> the same ones that will in the de translation file

## Task

Create a simpler user interface, mainly for mobile for learning the Leben in Deutschland question and answers, with UI for easy translations to EN(for now, but potentially extensible to many more languages). The translation must be available inline with the click of a button for each individual question each and individual answer option.

### Technical

- Use latest version of Vuetify
- moment.js ("moment": "^2.29.4") for time stuff
- I plan to host this as a github.io project similar to fingerprint-viz-aqi
- The data for each system using the website will stored on the local storage of the client

### UI

#### Start page:

Comes with an introductory note.
If local storage is found,

- Shows the current progress of the test -> shows [number of attempted questions] = [number of correct answers](in green)/[number of wrong answers](in red)
- shows a button to continue the test
- shows a button to look at an overview of the test so far -> goes to overview mode.
  A 'Start afresh' button
  A v-select at the bottom to choose the language to translate to. Language options other than DE (the default language) are hown here

#### Question and answers options page

##### Top bar:

1. `Previous question` button aligned to the left
2. A dropdown v-select component to go to a particular question
3. `Next question` button

##### Q/A panel

- The Q/A panel is between the top and bottom bars.
- If the question has an image, display the image at the top of the Q/A panel.
- Then comes the question - in DE
- Answer options as radio buttons - in DE
- Each question and answer have a small toggle button with translate icon next to them -> when clicked, they show/hide the translation text right below -> only for the clicked button.
- When an answer is selected, the status is immedicately saved in the local storage
- When an option is selected, it is highlighted in red if the wrong option is selected, and highlighted in green if the correct option is selected.

##### Bottom bar:

1. `Previous question` button aligned to the left
2. `Home` button to go to the start page
3. `Next question` button

#### Overview mode

In overview mode, we can navigate between only the questions that we have attempted.
The question and answers page is shown with one difference - no selection can be made here.
The correct choice is highlighted in green
If we have answered incorrectly, the incorrect options is also highlighted in red
The next and previous buttons navigate to the next and previous questions that were answered
To exit overview mode, we click on the home button in the bottom bar.

### Data caching and storage

Each answered question will be stored in local storage immedicately -> this should also cause the overall progress to be updated
The status of answered questions will be stored as a stringified LocalStorageLebenStatus object.
Choose an appropriate local storage key, maybe - `einfach-leben-in-deutschland-status`
