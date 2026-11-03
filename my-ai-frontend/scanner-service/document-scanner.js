
import fs from 'node:fs/promises'
import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
})

const asArray = value =>
  value == null ? [] : Array.isArray(value) ? value : [value]

// ============================================================
// COMMON RESULT FUNCTIONS
// ============================================================

function finding(
  status,
  title,
  description,
  fix = '',
  location = '',
  category = 'General',
  evidence = []
) {
  return {
    status,
    title,
    description,
    fix,
    location,
    category,
    evidence
  }
}

function resultFor(
  type,
  findings,
  tagTree,
  readingPreview,
  metadata = {}
) {
  const summary = {
    failed: findings.filter(x => x.status === 'failed').length,
    warnings: findings.filter(x => x.status === 'warning').length,
    manual: findings.filter(x => x.status === 'manual').length,
    passed: findings.filter(x => x.status === 'passed').length
  }

  return {
    type,
    documentType: type,
    metadata,
    summary,
    standard: type === 'pdf'
      ? 'PDF/UA-oriented preliminary checks'
      : 'DOCX accessibility preliminary checks',
    findings,
    results: findings,
    tagTree,
    readingPreview,
    preview: readingPreview
  }
}

// ============================================================
// PDF TEXT EXTRACTION
// ============================================================

function extractPdfLines(textContent) {
  const rawItems = Array.isArray(textContent?.items)
    ? textContent.items
    : []

  const items = rawItems
    .filter(item =>
      typeof item.str === 'string' &&
      item.str.trim() &&
      Array.isArray(item.transform) &&
      Number.isFinite(item.transform[4]) &&
      Number.isFinite(item.transform[5])
    )
    .map((item, index) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: Math.max(0, Number(item.width) || 0),
      height: Math.max(
        1,
        Math.abs(Number(item.height) || item.transform[3] || 10)
      ),
      hasEOL: Boolean(item.hasEOL),
      index
    }))

  if (!items.length) return ''

  const eolCount = items.filter(item => item.hasEOL).length

  if (eolCount >= Math.max(3, Math.ceil(items.length * 0.08))) {
    const lines = []
    let current = []

    for (const item of items) {
      current.push(item)

      if (item.hasEOL) {
        lines.push(current)
        current = []
      }
    }

    if (current.length) {
      lines.push(current)
    }

    return lines
      .map(joinPdfFragments)
      .filter(Boolean)
      .join('\n')
  }

  const sorted = [...items].sort(
    (a, b) => b.y - a.y || a.x - b.x
  )

  const rows = []

  for (const item of sorted) {
    const tolerance = Math.min(
      2.5,
      Math.max(0.8, item.height * 0.18)
    )

    const row = rows.find(
      existing => Math.abs(existing.y - item.y) <= tolerance
    )

    if (row) {
      row.items.push(item)

      row.y =
        (row.y * (row.items.length - 1) + item.y) /
        row.items.length
    } else {
      rows.push({
        y: item.y,
        items: [item]
      })
    }
  }

  rows.sort((a, b) => b.y - a.y)

  return rows
    .map(row => {
      row.items.sort((a, b) => a.x - b.x)
      return joinPdfFragments(row.items)
    })
    .filter(Boolean)
    .join('\n')
}

function joinPdfFragments(items) {
  let text = ''
  let rightEdge = null

  for (const item of items) {
    const fragment = item.text || ''

    const gap =
      rightEdge == null ? 0 : item.x - rightEdge

    const addSpace =
      text &&
      !/\s$/.test(text) &&
      !/^\s/.test(fragment) &&
      gap > Math.max(1.5, item.height * 0.12)

    if (addSpace) {
      text += ' '
    }

    text += fragment

    rightEdge = Math.max(
      rightEdge ?? -Infinity,
      item.x + item.width
    )
  }

  return text.replace(/[ \t]+/g, ' ').trim()
}


function buildMarkedContentTextMap(textContent) {
  const textMap = new Map()
  const activeIds = []

  for (const item of textContent?.items || []) {
    if (
      item.type === 'beginMarkedContentProps' ||
      item.type === 'beginMarkedContent'
    ) {
      activeIds.push(
        typeof item.id === 'string' ? item.id : null
      )
      continue
    }

    if (item.type === 'endMarkedContent') {
      if (activeIds.length > 0) {
        activeIds.pop()
      }
      continue
    }

    if (typeof item.str !== 'string') {
      continue
    }

    for (const id of new Set(activeIds.filter(Boolean))) {
      const previous = textMap.get(id) || ''
      const fragment = item.str

      const separator =
        previous &&
        fragment &&
        !/\s$/.test(previous) &&
        !/^\s/.test(fragment)
          ? ' '
          : ''

      textMap.set(
        id,
        previous + separator + fragment
      )
    }
  }

  return textMap
}


function attachTextToStructure(node, textMap) {
  if (!node || typeof node !== 'object') {
    return node
  }

  if (Array.isArray(node)) {
    return node.map(child =>
      attachTextToStructure(child, textMap)
    )
  }

  const result = { ...node }

  if (typeof result.id === 'string') {
    const text = textMap.get(result.id)

    if (text) {
      result.text = text.trim()
    }
  }

  if (Array.isArray(result.children)) {
    result.children = result.children.map(child =>
      attachTextToStructure(child, textMap)
    )
  }

  return result
}

// ============================================================
// PDF ACCESSIBILITY SCANNER
// ============================================================

export async function scanPdf(filePath) {
  
  const pdfjs = await import(
    'pdfjs-dist/legacy/build/pdf.mjs'
  )

  const buffer = await fs.readFile(filePath)

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false
  })

  try {
    const pdf = await loadingTask.promise

    const findings = []
    const tagTree = []
    const readingPreview = []

    const metadata = await pdf
      .getMetadata()
      .catch(() => ({}))

    const info = metadata?.info || {}

    // --------------------------------------------------------
    // DOCUMENT TITLE
    // --------------------------------------------------------

    if (info.Title) {
      findings.push(finding(
        'passed',
        'Document title',
        'PDF contains a document title.',
        '',
        'Document metadata'
      ))
    } else {
      findings.push(finding(
        'failed',
        'Missing document title',
        'PDF metadata does not contain a title.',
        'Add a meaningful document title.',
        'Document metadata'
      ))
    }

    // --------------------------------------------------------
    // DOCUMENT LANGUAGE
    // --------------------------------------------------------

    findings.push(finding(
      'manual',
      'Document language',
      'Document language could not be reliably verified.',
      'Verify the PDF document language in an accessibility tool.',
      'Document'
    ))

    let pagesWithStructure = 0

    // --------------------------------------------------------
    // PAGE SCANNING
    // --------------------------------------------------------

    for (
      let pageNo = 1;
      pageNo <= pdf.numPages;
      pageNo++
    ) {
      const page = await pdf.getPage(pageNo)

      try {
        const textContent = await page.getTextContent({
          includeMarkedContent: true
        })

        const pageText = extractPdfLines(textContent)
        const markedContentTextMap =
  buildMarkedContentTextMap(textContent)
  
if (pageNo === 2) {
  console.log('\n========== PDF TAG DEBUG ==========')

  console.log(
    'Marked content items:',
    JSON.stringify(
      textContent.items
        .filter(item => item.type)
        .slice(0, 20),
      null,
      2
    )
  )

  console.log(
    'Text map entries:',
    Array.from(markedContentTextMap.entries())
      .slice(0, 20)
  )

  console.log('===================================\n')
}


        readingPreview.push({
          page: pageNo,
          text: pageText,
          hasText: Boolean(pageText.trim()),
          extractionMethod:
            'pdfjs-eol-with-coordinate-fallback',
          note:
            'Extracted text preview only; logical screen-reader reading order is not verified.'
        })

        // Retrieve original PDF structure tags.
        const pageTree =
          typeof page.getStructTree === 'function'
            ? await page
                .getStructTree()
                .catch(() => null)
            : null
            
if (pageNo === 2 && pageTree) {
  const contentIds = []

  const collectIds = node => {
    if (!node || typeof node !== 'object') return

    if (node.id) {
      contentIds.push(node.id)
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(collectIds)
    }
  }

  collectIds(pageTree)

  console.log(
    'Structure Tree Content IDs:',
    contentIds.slice(0, 20)
  )

  console.log(
    'Matching IDs:',
    contentIds.filter(id =>
      markedContentTextMap.has(id)
    ).length
  )
}


        

if (pageTree) {
  pagesWithStructure++

  const enrichedTree = attachTextToStructure(
    pageTree,
    markedContentTextMap
  )

  tagTree.push({
    page: pageNo,
    structure: enrichedTree
  })

  const structureIds = []

  function collectIds(node) {
    if (!node || typeof node !== 'object') {
      return
    }

    if (typeof node.id === 'string') {
      structureIds.push(node.id)
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(collectIds)
    }
  }

  collectIds(pageTree)

  const matchingIds = structureIds.filter(id =>
    markedContentTextMap.has(id)
  )

  console.log('[PDF TAG CHECK]', {
    page: pageNo,
    textItems: textContent.items.filter(
      item => typeof item.str === 'string'
    ).length,
    markedContentItems: textContent.items.filter(
      item => typeof item.type === 'string'
    ).length,
    mappedIds: markedContentTextMap.size,
    structureIds: structureIds.length,
    matchingIds: matchingIds.length,
    sampleTextMap: Array.from(
      markedContentTextMap.entries()
    ).slice(0, 3),
    sampleStructureIds: structureIds.slice(0, 3)
  })
}


      } finally {
        page.cleanup()
      }
    }

    // --------------------------------------------------------
    // PDF TAG STRUCTURE FINDINGS
    // --------------------------------------------------------

    if (pagesWithStructure > 0) {
      findings.push(finding(
        'passed',
        'PDF tag structure detected',
        `Structure information was detected on ${pagesWithStructure} of ${pdf.numPages} pages.`,
        '',
        'Document'
      ))
    } else {
      findings.push(finding(
        'warning',
        'No PDF tag structure detected',
        'PDF.js did not expose a structure tree for the document pages.',
        'Inspect the PDF using a dedicated PDF accessibility validator.',
        'Document'
      ))
    }

    // --------------------------------------------------------
    // READING ORDER
    // --------------------------------------------------------

    findings.push(finding(
      'manual',
      'Reading order verification',
      'Extracted text order may differ from screen reader reading order.',
      'Verify the logical reading order using an accessibility tool.',
      'All pages'
    ))

    // --------------------------------------------------------
    // FIGURES / ALT TEXT
    // --------------------------------------------------------

    findings.push(finding(
      'manual',
      'Images and alternative text',
      'Image descriptions require further accessibility inspection.',
      'Verify alternative text for meaningful images.',
      'All pages'
    ))

    // --------------------------------------------------------
    // HEADINGS / TABLES / LISTS
    // --------------------------------------------------------

    findings.push(finding(
      'manual',
      'Tables, headings and lists',
      'Semantic structure and correctness require further review.',
      'Inspect heading hierarchy, lists and table headers.',
      'All pages'
    ))

    const pdfCategories = {
      'Document title': 'Document properties',
      'Missing document title': 'Document properties',
      'Document language': 'Document properties',
      'PDF tag structure detected': 'Tags and structure',
      'No PDF tag structure detected': 'Tags and structure',
      'Reading order verification': 'Reading order',
      'Images and alternative text':
        'Figures and alternative text',
      'Tables, headings and lists':
        'Headings, tables and lists'
    }

    for (const item of findings) {
      item.category =
        pdfCategories[item.title] || 'General'
    }

    // --------------------------------------------------------
    // STANDARDS VERIFICATION
    // --------------------------------------------------------

    findings.push(finding(
      'manual',
      'PDF/UA conformance validation',
      'PDF.js extraction cannot validate the full PDF/UA specification.',
      'Run a dedicated PDF/UA validator and manually verify its results.',
      'Whole PDF',
      'Standards verification'
    ))

    // --------------------------------------------------------
    // RETURN PDF RESULT
    // --------------------------------------------------------

    return resultFor(
      'pdf',
      findings,
      tagTree,
      readingPreview,
      {
        title: info.Title || '',
        pages: pdf.numPages,
        language: ''
      }
    )
  } finally {
    await loadingTask.destroy()
  }
}



 // ============================================================
 // DOCX ACCESSIBILITY SCANNER
 // ============================================================

export async function scanDocx(filePath) {
  const zip = await JSZip.loadAsync(
    await fs.readFile(filePath)
  )

  const getXml = async name =>
    zip.file(name)?.async('string') || ''

  const documentXml = await getXml('word/document.xml')

  if (!documentXml) {
    throw new Error(
      'Invalid DOCX: document.xml not found.'
    )
  }

  const doc = parser.parse(documentXml)
  const body = doc['w:document']?.['w:body']

  if (!body) {
    throw new Error(
      'Invalid DOCX document structure.'
    )
  }

  const findings = []
  const tagTree = []
  const readingPreview = []

  const add = (
    status,
    title,
    description,
    fix,
    location,
    category,
    evidence = []
  ) => {
    findings.push(
      finding(
        status,
        title,
        description,
        fix,
        location,
        category,
        evidence
      )
    )
  }

  // ----------------------------------------------------------
  // XML TREE HELPERS
  // ----------------------------------------------------------

  const walk = (node, fn) => {
    if (node == null) return

    if (Array.isArray(node)) {
      return node.forEach(n => walk(n, fn))
    }

    if (typeof node !== 'object') return

    for (const [key, value] of Object.entries(node)) {
      fn(key, value)

      if (value && typeof value === 'object') {
        walk(value, fn)
      }
    }
  }

  const extractText = node => {
    const parts = []

    walk(node, (key, value) => {
      if (key === 'w:t' || key === 'w:instrText') {
        if (typeof value === 'string') {
          parts.push(value)
        } else if (
          typeof value?.['#text'] === 'string'
        ) {
          parts.push(value['#text'])
        }
      }
    })

    return parts.join('')
  }

  // ----------------------------------------------------------
  // DOCUMENT PARAGRAPHS AND TABLES
  // ----------------------------------------------------------

  const paragraphs = asArray(body['w:p'])
  const tables = asArray(body['w:tbl'])

  let headingCount = 0
  let emptyHeadings = 0
  let skippedLevels = 0
  let previousLevel = 0

  const headingEvidence = []
  const emptyEvidence = []
  const skippedEvidence = []
  const linkEvidence = []
  const imageEvidence = []
  const tableEvidence = []

  let hyperlinkCount = 0
  let imageCount = 0
  let missingAlt = 0
  let tableHeaderCount = 0

  // ----------------------------------------------------------
  // HEADING AND PARAGRAPH ANALYSIS
  // ----------------------------------------------------------

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    const location = `Paragraph ${i + 1}`

    const style =
      p['w:pPr']?.['w:pStyle']?.['@_w:val'] || ''

    const text =
      extractText(p['w:r']) +
      extractText(p['w:hyperlink'])

    const match = /^heading\s*([1-9])$/i.exec(style)
    const level = match ? Number(match[1]) : null

    if (level !== null) {
      headingCount++

      headingEvidence.push({
        location,
        text: text.slice(0, 160),
        level
      })

      if (!text.trim()) {
        emptyHeadings++

        emptyEvidence.push({
          location,
          style
        })
      }

      if (level > previousLevel + 1) {
        skippedLevels++

        skippedEvidence.push({
          location,
          previousLevel,
          level,
          text: text.slice(0, 120)
        })
      }

      previousLevel = level
    }

    tagTree.push({
      type: level !== null
        ? 'heading'
        : 'paragraph',
      style,
      level,
      text
    })

    readingPreview.push({
      text
    })

    // --------------------------------------------------------
    // HYPERLINK ANALYSIS
    // --------------------------------------------------------

    const links = asArray(p['w:hyperlink'])

    for (const link of links) {
      hyperlinkCount++

      const linkText = extractText(link)

      if (!linkText.trim()) {
        linkEvidence.push({
          location,
          issue: 'Empty hyperlink text'
        })
      } else if (
        /^(click here|here|read more|link)$/i.test(
          linkText.trim()
        )
      ) {
        linkEvidence.push({
          location,
          issue: 'Non-descriptive hyperlink text',
          text: linkText
        })
      }
    }
  }

  // ----------------------------------------------------------
  // IMAGE ALTERNATIVE TEXT
  // ----------------------------------------------------------

  walk(body, (key, value) => {
    if (key !== 'wp:docPr') return

    for (const item of asArray(value)) {
      imageCount++

      const alt = String(
        item?.['@_descr'] ||
        item?.['@_title'] ||
        ''
      ).trim()

      if (!alt) {
        missingAlt++

        imageEvidence.push({
          location: 'Document image',
          name: item?.['@_name'] || '',
          id: item?.['@_id'] || ''
        })
      }
    }
  })

  // ----------------------------------------------------------
  // TABLE HEADER ANALYSIS
  // ----------------------------------------------------------

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    const rows = asArray(table['w:tr'])

    const headers = rows.filter(row => {
      const flag =
        row?.['w:trPr']?.['w:tblHeader']

      return (
        flag != null &&
        flag?.['@_w:val'] !== '0' &&
        flag?.['@_w:val'] !== 'false'
      )
    })

    tableHeaderCount += headers.length

    if (!headers.length) {
      tableEvidence.push({
        location: `Table ${i + 1}`,
        issue:
          'No repeating header row marker detected'
      })
    }
  }

  // ----------------------------------------------------------
  // DOCUMENT TITLE
  // ----------------------------------------------------------

  const coreXml = await getXml(
    'docProps/core.xml'
  )

  const core = coreXml
    ? parser.parse(coreXml)
    : {}

  const title = String(
    core['cp:coreProperties']?.['dc:title'] || ''
  ).trim()

  add(
    title ? 'passed' : 'warning',
    'Document title',
    title
      ? `Title: ${title}`
      : 'No document title found in core properties.',
    title
      ? ''
      : 'Set File > Info > Properties > Title in Word.',
    'Document properties',
    'Document properties'
  )

  // ----------------------------------------------------------
  // DOCUMENT LANGUAGE
  // ----------------------------------------------------------

  const stylesXml = await getXml(
    'word/styles.xml'
  )

  const styles = stylesXml
    ? parser.parse(stylesXml)
    : {}

  const defaultRPr =
    styles['w:styles']
      ?.['w:docDefaults']
      ?.['w:rPrDefault']
      ?.['w:rPr']

  const lang =
    defaultRPr?.['w:lang']?.['@_w:val'] || ''

  add(
    lang ? 'passed' : 'manual',
    'Document language',
    lang
      ? `Default language: ${lang}`
      : 'Default document language not found in styles.xml; language may be set elsewhere.',
    lang
      ? ''
      : 'Verify the document and individual language runs in Word.',
    'Document styles',
    'Document properties'
  )

  // ----------------------------------------------------------
  // RECOGNIZED HEADINGS
  // ----------------------------------------------------------

  add(
    headingCount ? 'passed' : 'warning',
    'Recognized headings',
    `${headingCount} built-in heading paragraphs detected.`,
    headingCount
      ? ''
      : 'Apply built-in Word Heading styles.',
    'Document headings',
    'Headings and structure',
    headingEvidence.slice(0, 50)
  )

  // ----------------------------------------------------------
  // EMPTY HEADINGS
  // ----------------------------------------------------------

  add(
    emptyHeadings
      ? 'failed'
      : headingCount
        ? 'passed'
        : 'manual',
    'Empty headings',
    `${emptyHeadings} empty heading(s) detected.`,
    'Remove empty headings or add meaningful text.',
    'Document headings',
    'Headings and structure',
    emptyEvidence
  )

  // ----------------------------------------------------------
  // HEADING LEVEL SEQUENCE
  // ----------------------------------------------------------

  add(
    skippedLevels
      ? 'warning'
      : headingCount
        ? 'passed'
        : 'manual',
    'Heading level sequence',
    `${skippedLevels} skipped heading-level transition(s) detected.`,
    'Review heading hierarchy in Word Navigation Pane.',
    'Document headings',
    'Headings and structure',
    skippedEvidence
  )

  // ----------------------------------------------------------
  // IMAGE ALT TEXT FINDINGS
  // ----------------------------------------------------------

  add(
    imageCount === 0
      ? 'passed'
      : missingAlt
        ? 'failed'
        : 'manual',
    'Image alternative text',
    `${imageCount} DrawingML image(s) detected; ${missingAlt} missing description/title. Other image formats and decorative intent require manual review.`,
    'Add meaningful alt text or mark decorative images appropriately; verify in Word Accessibility Checker.',
    'Document images',
    'Figures and alternative text',
    imageEvidence
  )

  // ----------------------------------------------------------
  // TABLE HEADER FINDINGS
  // ----------------------------------------------------------

  add(
    !tables.length
      ? 'passed'
      : tableEvidence.length
        ? 'warning'
        : 'manual',
    'Table header rows',
    `${tables.length} top-level table(s); ${tableHeaderCount} repeating header row(s); ${tableEvidence.length} table(s) without a detected repeating header marker.`,
    'Check table header rows, layout tables, merged cells and reading order manually.',
    'Document tables',
    'Tables',
    tableEvidence
  )

  // ----------------------------------------------------------
  // HYPERLINK TEXT FINDINGS
  // ----------------------------------------------------------

  add(
    !hyperlinkCount
      ? 'passed'
      : linkEvidence.length
        ? 'warning'
        : 'manual',
    'Hyperlink text',
    `${hyperlinkCount} paragraph hyperlink(s) detected; ${linkEvidence.length} need review.`,
    'Use descriptive link text; inspect links in tables, shapes and other content manually.',
    'Document hyperlinks',
    'Links',
    linkEvidence
  )

  // ----------------------------------------------------------
  // READING ORDER
  // ----------------------------------------------------------

  add(
    'manual',
    'Reading order and complex objects',
    'Text extraction does not prove assistive-technology reading order; text boxes, floating objects and nested tables may need review.',
    'Review the document using a screen reader and Word Accessibility Checker.',
    'Whole document',
    'Reading order'
  )

  // ----------------------------------------------------------
  // STANDARDS VERIFICATION
  // ----------------------------------------------------------

  add(
    'manual',
    'DOCX accessibility conformance',
    'These automated checks are not a complete WCAG or Microsoft Word accessibility certification.',
    'Complete manual accessibility testing.',
    'Whole document',
    'Standards verification'
  )

  // ----------------------------------------------------------
  // RETURN DOCX RESULT
  // ----------------------------------------------------------

  return resultFor(
    'docx',
    findings,
    tagTree,
    readingPreview,
    {
      paragraphs: paragraphs.length,
      tables: tables.length,
      headings: headingCount,
      emptyHeadings,
      skippedHeadingLevels: skippedLevels,
      images: imageCount,
      imagesMissingAlt: missingAlt,
      hyperlinks: hyperlinkCount,
      language: lang,
      title
    }
  )
}
