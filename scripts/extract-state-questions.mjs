import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const PDF_PATH = path.join(root, 'online-resources/gesamtfragenkatalog-lebenindeutschland.pdf')
const OUT_DIR = path.join(__dirname, 'output')
const OUT_PATH = path.join(OUT_DIR, 'state-questions-raw.json')

const BULLET_1 = String.fromCodePoint(0xf0a3)
const BULLET_2 = '□'
const BULLETS = [BULLET_1, BULLET_2]

const STATE_SPECS = [
  { code: 'BW', label: 'Baden-Württemberg', imageFolder: 'Baden-Wuerttemberg' },
  { code: 'BY', label: 'Bayern', imageFolder: 'Bayern' },
  { code: 'BE', label: 'Berlin', imageFolder: 'Berlin' },
  { code: 'BB', label: 'Brandenburg', imageFolder: 'Brandenburg' },
  { code: 'HB', label: 'Bremen', imageFolder: 'Bremen' },
  { code: 'HH', label: 'Hamburg', imageFolder: 'Hamburg' },
  { code: 'HE', label: 'Hessen', imageFolder: 'Hessen' },
  { code: 'MV', label: 'Mecklenburg-Vorpommern', imageFolder: 'Mecklenburg-Vorpommern' },
  { code: 'NI', label: 'Niedersachsen', imageFolder: 'Niedersachsen' },
  { code: 'NW', label: 'Nordrhein-Westfalen', imageFolder: 'Nordrhein-Westfalen' },
  { code: 'RP', label: 'Rheinland-Pfalz', imageFolder: 'Rheinland-Pfalz' },
  { code: 'SL', label: 'Saarland', imageFolder: 'Saarland' },
  { code: 'SN', label: 'Sachsen', imageFolder: 'Sachsen' },
  { code: 'ST', label: 'Sachsen-Anhalt', imageFolder: 'Sachsen-Anhalt' },
  { code: 'SH', label: 'Schleswig-Holstein', imageFolder: 'Schleswig-Holstein' },
  { code: 'TH', label: 'Thüringen', imageFolder: 'Thueringen' }
]

function isBulletLine(line) {
  return BULLETS.some((b) => line.startsWith(b))
}

function stripBullet(line) {
  for (const b of BULLETS) {
    if (line.startsWith(b)) return line.slice(b.length)
  }
  return line
}

function collapseWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim()
}

function sanitizeQuestionText(text) {
  return collapseWhitespace(text).replace(/\s*Bild 1 Bild 2 Bild 3 Bild 4\s*$/, '')
}

function sanitizeOptionText(text) {
  return collapseWhitespace(text).replace(/\s*Teil II\s*$/, '')
}

function normalizeTextArtifacts(text) {
  let value = text
  value = value.replace(/Auf\s*\n\s*gabe/g, 'Aufgabe')
  return value
}

function dropNoiseLine(line) {
  if (!line) return true
  if (/^Seite \d+ von \d+\s*$/.test(line)) return true
  if (line.trim().startsWith('©')) return true
  return false
}

function parseBlocks(lines) {
  const blocks = []
  let current = null

  for (const rawLine of lines) {
    const stateMatch = rawLine.match(/^Fragen für das (?:Bundesland|Land) (.+)$/)
    if (stateMatch) {
      if (current) blocks.push(current)
      current = { stateLabel: stateMatch[1].trim(), questionBlocks: [] }
      continue
    }

    const freeStateMatch = rawLine.match(/^Fragen für den Freistaat (.+)$/)
    if (freeStateMatch) {
      if (current) blocks.push(current)
      current = { stateLabel: freeStateMatch[1].trim(), questionBlocks: [] }
      continue
    }

    const qMatch = rawLine.match(/^Aufgabe\s+(\d+)\s*$/)
    if (qMatch && current) {
      current.questionBlocks.push({ localQuestionNumber: Number(qMatch[1]), lines: [] })
      continue
    }

    if (current && current.questionBlocks.length > 0) {
      current.questionBlocks[current.questionBlocks.length - 1].lines.push(rawLine)
    }
  }

  if (current) blocks.push(current)
  return blocks
}

function parseQuestion(questionBlock, stateSpec, stateStartNumber) {
  const lines = questionBlock.lines.filter((line) => !dropNoiseLine(line))
  const firstBullet = lines.findIndex((line) => isBulletLine(line))
  if (firstBullet < 0) {
    throw new Error(
      `State ${stateSpec.label} question ${questionBlock.localQuestionNumber}: missing answer bullets after question text`
    )
  }

  const question = sanitizeQuestionText(lines.slice(0, firstBullet).join(' '))
  const optionLines = lines.slice(firstBullet)

  const options = []
  let currentOption = null
  for (const line of optionLines) {
    if (isBulletLine(line)) {
      if (currentOption !== null) options.push(sanitizeOptionText(currentOption))
      currentOption = stripBullet(line)
    } else if (currentOption !== null) {
      currentOption += ` ${line}`
    }
  }
  if (currentOption !== null) options.push(sanitizeOptionText(currentOption))

  if (options.length !== 4) {
    throw new Error(
      `State ${stateSpec.label} question ${questionBlock.localQuestionNumber}: expected 4 options, got ${options.length}`
    )
  }

  const questionNumber = stateStartNumber + (questionBlock.localQuestionNumber - 1)
  const hasImage = questionBlock.localQuestionNumber === 1 || questionBlock.localQuestionNumber === 8
  const questionImage = hasImage ? `${stateSpec.imageFolder}/${questionBlock.localQuestionNumber}.png` : undefined

  return {
    questionNumber,
    localQuestionNumber: questionBlock.localQuestionNumber,
    stateCode: stateSpec.code,
    stateLabel: stateSpec.label,
    question,
    options,
    questionImage
  }
}

async function main() {
  const pdfBuffer = fs.readFileSync(PDF_PATH)
  const data = await pdfParse(pdfBuffer)
  const text = normalizeTextArtifacts(data.text)

  const teilTwoIdx = text.indexOf('Teil II')
  if (teilTwoIdx < 0) throw new Error('Could not find Teil II section in PDF')

  const teilTwo = text.slice(teilTwoIdx)
  const lines = teilTwo.split('\n').map((line) => line.trim())
  const stateBlocks = parseBlocks(lines)

  const blocksByLabel = new Map(stateBlocks.map((b) => [b.stateLabel, b]))
  const questions = []
  const stateRanges = {}

  let nextQuestionNumber = 301

  for (const spec of STATE_SPECS) {
    const block = blocksByLabel.get(spec.label)
    if (!block) throw new Error(`Missing section for state ${spec.label}`)

    const start = nextQuestionNumber
    const orderedQuestionBlocks = [...block.questionBlocks].sort(
      (a, b) => a.localQuestionNumber - b.localQuestionNumber
    )

    if (orderedQuestionBlocks.length !== 10) {
      throw new Error(`State ${spec.label}: expected 10 questions, got ${orderedQuestionBlocks.length}`)
    }

    for (const questionBlock of orderedQuestionBlocks) {
      const parsed = parseQuestion(questionBlock, spec, start)
      questions.push(parsed)
      nextQuestionNumber += 1
    }

    stateRanges[spec.code] = {
      stateName: spec.label,
      start,
      end: nextQuestionNumber - 1,
      imageFolder: spec.imageFolder
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        stateRanges,
        questions
      },
      null,
      2
    )
  )

  console.log(`Parsed ${questions.length} state questions across ${Object.keys(stateRanges).length} states.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
