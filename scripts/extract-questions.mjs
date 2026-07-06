// One-off data pipeline: pulls the 300 general questions out of the official
// PDF and turns them into a structured JSON file for manual review.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const PDF_PATH = path.join(root, 'online-resources/gesamtfragenkatalog-lebenindeutschland.pdf')
const OUT_DIR = path.join(__dirname, 'output')
const OUT_PATH = path.join(OUT_DIR, 'questions-raw.json')

const BULLET_1 = String.fromCodePoint(0xf0a3)
const BULLET_2 = '□' // □
const BULLETS = [BULLET_1, BULLET_2]

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

function endsWithSentencePunctuation(str) {
  return /[.?!]\s*$/.test(str)
}

async function main() {
  const buf = fs.readFileSync(PDF_PATH)
  const data = await pdfParse(buf)
  let text = data.text

  // Known PDF text-extraction artifact: "Aufgabe 15" gets split across a
  // line break inside the word "Aufgabe" itself.
  text = text.replace(/Auf\s*\n\s*gabe/g, 'Aufgabe')

  const teilTwoIdx = text.indexOf('Teil II')
  if (teilTwoIdx === -1) throw new Error('Could not find "Teil II" boundary')
  const teilEins = text.slice(0, teilTwoIdx)

  const lines = teilEins.split('\n')
  const blocks = []
  let current = null
  for (const rawLine of lines) {
    const m = rawLine.match(/^Aufgabe (\d+)\s*$/)
    if (m) {
      if (current) blocks.push(current)
      current = { questionNumber: Number(m[1]), lines: [] }
    } else if (current) {
      current.lines.push(rawLine)
    }
  }
  if (current) blocks.push(current)

  const questions = []
  const anomalies = []

  for (const block of blocks) {
    const cleanLines = block.lines.filter((l) => {
      if (/^Seite \d+ von \d+\s*$/.test(l)) return false
      if (l.trim().startsWith('©')) return false
      if (l.trim() === '') return false
      return true
    })

    const firstBulletIdx = cleanLines.findIndex((l) => isBulletLine(l))
    if (firstBulletIdx === -1) {
      anomalies.push({ questionNumber: block.questionNumber, reason: 'no bullets found', lines: cleanLines })
      continue
    }

    const questionLines = cleanLines.slice(0, firstBulletIdx)
    const question = collapseWhitespace(questionLines.join(' '))
    const optionLines = cleanLines.slice(firstBulletIdx)

    const bulletLines = optionLines.filter((l) => isBulletLine(l))
    const allBulletsEmpty = bulletLines.every((l) => stripBullet(l).trim() === '')

    let options = []

    if (allBulletsEmpty && bulletLines.length === 4) {
      // Rare layout: 4 empty bullet markers followed by 4 plain-text
      // paragraphs (order preserved), grouped by sentence-ending punctuation.
      const textLines = optionLines.filter((l) => !isBulletLine(l))
      let group = []
      for (const l of textLines) {
        group.push(l)
        if (endsWithSentencePunctuation(l)) {
          options.push(collapseWhitespace(group.join(' ')))
          group = []
        }
      }
      if (group.length) options.push(collapseWhitespace(group.join(' ')))
    } else {
      // Normal layout: each bullet line starts an option; subsequent
      // non-bullet lines are wrapped continuations of that option.
      let currentOption = null
      for (const l of optionLines) {
        if (isBulletLine(l)) {
          if (currentOption !== null) options.push(currentOption)
          currentOption = stripBullet(l)
        } else if (currentOption !== null) {
          currentOption += ' ' + l
        }
      }
      if (currentOption !== null) options.push(currentOption)
      options = options.map(collapseWhitespace)
    }

    if (options.length !== 4 || options.some((o) => o.length === 0)) {
      anomalies.push({
        questionNumber: block.questionNumber,
        reason: `expected 4 non-empty options, got ${options.length}`,
        question,
        options,
      })
      continue
    }

    questions.push({
      questionNumber: block.questionNumber,
      question,
      options, // positional a,b,c,d
    })
  }

  // Sanity: every number 1-300 present exactly once.
  const seen = new Set()
  for (const q of questions) {
    if (seen.has(q.questionNumber)) {
      anomalies.push({ questionNumber: q.questionNumber, reason: 'duplicate questionNumber' })
    }
    seen.add(q.questionNumber)
  }
  for (let i = 1; i <= 300; i++) {
    if (!seen.has(i)) anomalies.push({ questionNumber: i, reason: 'missing entirely' })
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify({ questions, anomalies }, null, 2))

  console.log(`Parsed ${questions.length} questions, ${anomalies.length} anomalies.`)
  if (anomalies.length) {
    console.log('Anomalies:', anomalies.map((a) => `q${a.questionNumber} (${a.reason})`).join(', '))
  }
}

main()
