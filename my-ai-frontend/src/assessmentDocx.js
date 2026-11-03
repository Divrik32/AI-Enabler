
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx'

// Clean Markdown formatting
function cleanText(value = '') {
  return String(value)
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .trim()
}

// Identify headings
function getHeadingLevel(line) {
  const text = cleanText(line).toLowerCase()

  if (
    text === 'assessment overview' ||
    text === 'questions' ||
    text === 'answer key' ||
    text === 'scoring guidelines'
  ) {
    return HeadingLevel.HEADING_1
  }

  if (/^section\s+[a-z]\s*[-:.–—]/i.test(text)) {
    return HeadingLevel.HEADING_2
  }

  const markdownHeading = line.match(/^\s{0,3}(#{1,6})\s+/)

  if (markdownHeading) {
    return markdownHeading[1].length === 1
      ? HeadingLevel.HEADING_1
      : HeadingLevel.HEADING_2
  }

  return null
}

// Create normal paragraph or heading
function createParagraph(line) {
  const text = cleanText(line)
  const heading = getHeadingLevel(line)

  if (heading) {
    return new Paragraph({
      heading,
      children: [
        new TextRun({
          text,
          bold: true
        })
      ],
      spacing: {
        before: 220,
        after: 120
      }
    })
  }

  const question = text.match(/^(\d+)\.\s+(.+)$/)

  if (question) {
    return new Paragraph({
      children: [
        new TextRun({
          text: `${question[1]}. `,
          bold: true
        }),
        new TextRun({
          text: question[2]
        })
      ],
      spacing: {
        before: 80,
        after: 100
      }
    })
  }

  return new Paragraph({
    children: [
      new TextRun({ text })
    ],
    spacing: {
      after: 80
    }
  })
}

// Detect Matching column headings
function isMatchingColumn(line, letter) {
  const text = cleanText(line)

  return new RegExp(
    `^Column\\s+${letter}\\s*:?$`,
    'i'
  ).test(text)
}

// Detect separator lines
function isSeparator(line) {
  return /^[-*_]{3,}$/.test(line.trim())
}

// Detect next question or section
function isBoundary(line) {
  const text = cleanText(line)

  return (
    /^\d+\.\s+\S/.test(text) ||
    /^Section\s+[A-Z]\s*[-:.–—]/i.test(text) ||
    /^(Assessment Overview|Questions|Answer Key|Scoring Guidelines)$/i.test(text) ||
    /^#{1,6}\s+/.test(line.trim()) ||
    isSeparator(line)
  )
}

// Create Matching table
function createMatchingTable(columnA, columnB) {
  const left = columnA.map(cleanText).filter(Boolean)
  const right = columnB.map(cleanText).filter(Boolean)

  const makeCell = (text, bold = false) => {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold
            })
          ],
          spacing: {
            after: 60
          }
        })
      ]
    })
  }

  const rows = [
    new TableRow({
      children: [
        makeCell('Column A', true),
        makeCell('Column B', true)
      ]
    })
  ]

  const rowCount = Math.max(left.length, right.length)

  for (let i = 0; i < rowCount; i++) {
    rows.push(
      new TableRow({
        children: [
          makeCell(left[i] || ''),
          makeCell(right[i] || '')
        ]
      })
    )
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  })
}

// Build complete assessment

function buildAssessmentParagraphs(markdown) {
  const lines = String(markdown)
    .replace(/\r\n?/g, '\n')
    .split('\n')

  const children = []

  const isNextQuestion = line => {
    const text = cleanText(line)

    // A new assessment question has a number AND a question sentence.
    // Matching items like "1. Village life" should not end a table.
    return /^\d+\.\s+(?:Match|Which|What|Who|When|Where|Why|How|Choose|Select|Fill|State|Explain|Describe|Identify|Write|Read|Complete|Tick|Circle|True|False)\b/i.test(text)
  }

  const isSectionBoundary = line => {
    const text = cleanText(line)

    return (
      /^Section\s+[A-Z]\s*[-:.–—]/i.test(text) ||
      /^(Assessment Overview|Questions|Answer Key|Scoring Guidelines)$/i.test(text) ||
      /^#{1,6}\s+/.test(line.trim()) ||
      isSeparator(line)
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line || isSeparator(line)) continue

    if (isMatchingColumn(line, 'A')) {
      const columnA = []
      const columnB = []

      let j = i + 1

      // Read Column A items until Column B
      while (j < lines.length) {
        const current = lines[j].trim()

        if (isMatchingColumn(current, 'B')) break

        if (
          isSectionBoundary(current) ||
          isNextQuestion(current)
        ) {
          break
        }

        if (current) columnA.push(current)

        j++
      }

      if (
        j < lines.length &&
        isMatchingColumn(lines[j].trim(), 'B')
      ) {
        j++

        // Read Column B items until next assessment question
        while (j < lines.length) {
          const current = lines[j].trim()

          if (
            isSectionBoundary(current) ||
            isNextQuestion(current) ||
            isMatchingColumn(current, 'A')
          ) {
            break
          }

          if (current) columnB.push(current)

          j++
        }

        children.push(
          createMatchingTable(columnA, columnB)
        )

        children.push(
          new Paragraph({
            text: '',
            spacing: { after: 120 }
          })
        )

        i = j - 1
        continue
      }
    }

    children.push(createParagraph(line))
  }

  return children.length
    ? children
    : [new Paragraph({ text: 'No assessment content.' })]
}


// Download DOCX
export async function downloadAssessmentDOCX(
  markdown,
  fileName = 'MY-AI-Assessment.docx'
) {
  if (
    typeof markdown !== 'string' ||
    !markdown.trim()
  ) {
    throw new Error('Assessment content not found.')
  }

  const documentFile = new Document({
    creator: 'MY AI',
    title: 'MY AI Assessment',
    description: 'Editable assessment generated by MY AI',
    sections: [
      {
        children: buildAssessmentParagraphs(markdown)
      }
    ]
  })

  const blob = await Packer.toBlob(documentFile)

  if (!blob || blob.size === 0) {
    throw new Error('DOCX generation failed.')
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url

  link.download = fileName.toLowerCase().endsWith('.docx')
    ? fileName
    : `${fileName}.docx`

  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 60000)
}
