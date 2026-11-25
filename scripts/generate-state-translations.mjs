import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const RAW_PATH = path.join(__dirname, 'output/state-questions-raw.json')
const OUT_PATH = path.join(root, 'src/locales/en-state.ts')

const STATE_NAMES_EN = {
  'Baden-Württemberg': 'Baden-Wuerttemberg',
  Bayern: 'Bavaria',
  Berlin: 'Berlin',
  Brandenburg: 'Brandenburg',
  Bremen: 'Bremen',
  Hamburg: 'Hamburg',
  Hessen: 'Hesse',
  'Mecklenburg-Vorpommern': 'Mecklenburg-Western Pomerania',
  Niedersachsen: 'Lower Saxony',
  'Nordrhein-Westfalen': 'North Rhine-Westphalia',
  'Rheinland-Pfalz': 'Rhineland-Palatinate',
  Saarland: 'Saarland',
  Sachsen: 'Saxony',
  'Sachsen-Anhalt': 'Saxony-Anhalt',
  'Schleswig-Holstein': 'Schleswig-Holstein',
  Thüringen: 'Thuringia'
}

const OPTION_MAP = {
  'Bild 1': 'Image 1',
  'Bild 2': 'Image 2',
  'Bild 3': 'Image 3',
  'Bild 4': 'Image 4',
  'beim Ordnungsamt der Gemeinde': "at the municipality's public order office",
  'bei der Verbraucherzentrale': 'at the consumer advice center',
  'bei der Landeszentrale für politische Bildung': 'at the State Agency for Civic Education',
  'bei den Kirchen': 'at churches',
  'Erste Ministerin/Erster Minister': 'First Minister',
  'Premierministerin/Premierminister': 'Prime Minister',
  'Bürgermeisterin/Bürgermeister': 'Mayor',
  'Ministerpräsidentin/Ministerpräsident': 'Minister-President',
  'Finanzministerin/Finanzminister': 'Minister of Finance',
  'Justizministerin/Justizminister': 'Minister of Justice',
  'Innenministerin/Innenminister': 'Minister of the Interior',
  'Außenministerin/Außenminister': 'Minister of Foreign Affairs',
  'Oberbürgermeisterin/Oberbürgermeister': 'Lord Mayor',
  'Präsidentin/Präsident des Senates': 'President of the Senate',
  'Regierende Bürgermeisterin/Regierender Bürgermeister': 'Governing Mayor',
  'Finanzsenatorin/Finanzsenator': 'Senator for Finance',
  'Innensenatorin/Innensenator': 'Senator for the Interior',
  'Senatorin/Senator für Außenbeziehungen': 'Senator for Foreign Relations',
  'Justizsenatorin/Justizsenator': 'Senator for Justice',
  'Bürgermeisterin/Bürgermeister': 'Mayor',
  'Präsidentin/Präsident des Senats': 'President of the Senate',
  'Senatorin/Senator für Finanzen': 'Senator for Finance',
  'Senatorin/Senator für Inneres': 'Senator for the Interior',
  'Senatorin/Senator für Justiz': 'Senator for Justice',
  'Senatorin/Senator für Außenbeziehungen': 'Senator for Foreign Relations',
  14: '14',
  16: '16',
  18: '18',
  20: '20',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  'blau-weiß-rot': 'blue-white-red',
  'schwarz-gold': 'black-gold',
  'weiß-blau': 'white-blue',
  'grün-weiß-rot': 'green-white-red',
  'weiß-rot': 'white-red',
  'schwarz-gelb': 'black-yellow',
  'rot-weiß': 'red-white',
  'schwarz-rot-gold': 'black-red-gold',
  'rot-weiß-schwarz': 'red-white-black',
  'blau-weiß': 'blue-white',
  'schwarz-weiß': 'black-white'
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/B\s+ild/g, 'Bild')
    .trim()
}

function stateNameEn(stateLabel) {
  return STATE_NAMES_EN[stateLabel] ?? stateLabel
}

function translateQuestion(question, stateLabel, localQuestionNumber) {
  const state = stateNameEn(stateLabel)
  const q = cleanText(question)

  if (localQuestionNumber === 1) {
    return `Which coat of arms belongs to the state of ${state}?`
  }

  if (localQuestionNumber === 2) {
    if (q.includes('Bezirk von Berlin')) return 'Which is a district of Berlin?'
    if (q.includes('Bezirk von Hamburg')) return 'Which is a district of Hamburg?'
    if (q.includes('Stadtteil von Bremen')) return 'Which is a district of Bremen?'
    return `Which is a county in ${state}?`
  }

  if (localQuestionNumber === 3) {
    if (q.includes('Landesparlament')) {
      return `For how many years is the state parliament in ${state} elected?`
    }
    return `For how many years is the state parliament (Landtag) in ${state} elected?`
  }

  if (localQuestionNumber === 4) {
    if (q.includes('Wahl der Bezirksverordnetenversammlung')) {
      return 'From what age can people vote in local elections in Berlin (election of the district council assembly)?'
    }
    if (q.includes('Wahl der Bezirksversammlungen')) {
      return 'From what age can people vote in local elections in Hamburg (election of district assemblies)?'
    }
    if (q.includes('Wahlen zur Bürgerschaft')) {
      return 'From what age can people vote in Bremen in elections to the state parliament (Bürgerschaft)?'
    }
    return `From what age can people vote in local elections in ${state}?`
  }

  if (localQuestionNumber === 5) {
    return `What are the colors of the state flag of ${state}?`
  }

  if (localQuestionNumber === 6) {
    return `Where can you get information about political topics in ${state}?`
  }

  if (localQuestionNumber === 7) {
    if (q === 'Welches Bundesland ist ein Stadtstaat?') return 'Which state is a city-state?'
    if (q === 'Was ist ein deutscher Stadtstaat?') return 'Which is a German city-state?'
    return `The capital city of ${state} is ...`
  }

  if (localQuestionNumber === 8) {
    return `Which state is ${state}?`
  }

  if (localQuestionNumber === 9) {
    if (q.includes('Stadtstaates')) {
      return `What is the title of the head of government of the city-state ${state}?`
    }
    return `What is the title of the head of government in ${state}?`
  }

  if (localQuestionNumber === 10) {
    if (q.includes('Senatorin/welchen Senator')) {
      return `Which senator does ${state} not have?`
    }
    return `Which minister does ${state} not have?`
  }

  return q
}

function translateOption(option) {
  const cleaned = cleanText(option)
  if (OPTION_MAP[cleaned]) return OPTION_MAP[cleaned]

  return cleaned
    .replaceAll('Landeshauptstadt', 'state capital')
    .replaceAll('Freie Hansestadt', 'Free Hanseatic City')
    .replaceAll('Freien und Hansestadt', 'Free and Hanseatic City')
    .replaceAll('Freistaat', 'Free State')
}

function main() {
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))

  const questions = {}
  for (const q of raw.questions) {
    questions[`question_${q.questionNumber}`] = {
      question: translateQuestion(q.question, q.stateLabel, q.localQuestionNumber),
      answer_a: translateOption(q.options[0]),
      answer_b: translateOption(q.options[1]),
      answer_c: translateOption(q.options[2]),
      answer_d: translateOption(q.options[3])
    }
  }

  const content =
    `// Auto-generated by scripts/generate-state-translations.mjs from scripts/output/state-questions-raw.json.\n` +
    `export default ${JSON.stringify({ questions }, null, 2)}\n`

  fs.writeFileSync(OUT_PATH, content)
  console.log(`Wrote state EN translations to ${path.relative(root, OUT_PATH)}`)
}

main()
