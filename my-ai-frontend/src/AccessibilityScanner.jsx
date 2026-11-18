
import './AccessibilityScanner.css'
import { useEffect, useMemo, useState } from 'react'

const IMPACT_LEVELS = [
  'critical',
  'serious',
  'moderate',
  'minor',
  'unknown'
]



function getPdfAccessibilityExplanation(item) {
  const title = String(item.title || '')
  const description = String(item.description || '')
  const evidence = Array.isArray(item.evidence)
    ? item.evidence
    : []

  const clause = title.match(/PDF\/UA clause\s+([\d.]+)/i)?.[1]

  const pages = [...new Set(
    evidence
      .map(entry => Number(entry.page))
      .filter(page => Number.isInteger(page) && page > 0)
  )].sort((a, b) => a - b)

  const pageSummary = pages.length
    ? pages.map(page => {
        const count = evidence.filter(
          entry => Number(entry.page) === page
        ).length

        return `Page ${page}: ${count} affected element${count === 1 ? '' : 's'}`
      }).join('; ')
    : 'The issue affects the document or an element whose page could not be determined.'


if (title === 'Missing document title') {
  return {
    heading: 'Missing PDF Document Title',

    issue: 'The PDF does not contain a meaningful document title in its metadata.',

    reason: 'The accessibility scanner checked the PDF document properties and found that the document title was missing.',

    impact: 'Screen reader users may find it difficult to identify the document, especially when multiple PDFs are open.',

    steps: [
      'Open the PDF in an editor that supports document metadata.',
      'Open the document properties.',
      'Locate the Title field.',
      'Enter a meaningful document title.',
      'Ensure the title is also present in XMP dc:title metadata for PDF/UA compliance.',
      'Save the PDF and run the accessibility scan again.'
    ],

    verification: 'Check the document properties and confirm that a meaningful title is present. Run the accessibility scan again.',

    pageSummary: 'Document-level issue: PDF metadata. No individual page is associated with this failure.',

    affectedCount: evidence.length
  }
}



if (title === 'Alternative description missing for an annotation') {
  return {
    heading: 'Missing Accessible Descriptions for Link Annotations',

    issue: 'The PDF contains annotations that do not provide the alternate descriptions required by the accessibility check.',

    reason: `The accessibility scanner identified ${evidence.length} affected annotations without the required accessible descriptions.`,

    impact: 'People using screen readers may have difficulty understanding the purpose or destination of affected interactive elements.',

    steps: [
      'Open the PDF in an editor that supports accessibility remediation.',
      'Locate the affected annotations on the pages listed in the Affected pages section.',
      'Inspect the annotation properties and associated document tags.',
      'Add meaningful accessible descriptions using the PDF properties required by the reported rule.',
      'Ensure each description clearly communicates the purpose of the interactive element.',
      'Check that link annotations are correctly associated with their Link structure elements.',
      'Save the corrected PDF and run the accessibility scan again.'
    ],

    verification: 'Run the accessibility scan again and confirm that the annotation description finding is resolved. Test affected interactive elements with a screen reader.',

    pageSummary,
    affectedCount: evidence.length
  }
}


  if (clause === '7.18.1' && /Test 2/i.test(title)) {
    return {
      heading: 'Missing Accessible Link or Annotation Description',

      issue:
        'The document contains annotations, including links, that do not provide the accessible descriptions required by the PDF accessibility standard. These descriptions help assistive technologies communicate information about interactive document elements.',

      reason:
        'The affected annotations do not contain a meaningful description in their annotation properties or an alternative description in the associated document structure. As a result, the automated accessibility requirement was not satisfied.',

      impact:
        'People who use screen readers may not receive sufficient information about the affected interactive elements. This can make it more difficult to understand the purpose of a link or navigate the document confidently.',

      steps: [
        'Open the PDF in an editor that supports accessibility tagging.',
       'Locate the affected links and annotations on the pages identified in the Affected pages section.',
        'Inspect the accessibility properties and associated document tags.',
        'Ensure each affected annotation has an appropriate accessible description using the supported PDF accessibility properties.',
        'Make sure descriptions accurately communicate the purpose of the interactive element.',
        'Save the corrected document and run the accessibility scan again.'
      ],

      verification:
        'Run the accessibility scan again and confirm that this requirement no longer reports failures. Review the affected links with a screen reader to verify that their purpose is communicated clearly.',

      pageSummary,
      affectedCount: evidence.length
    }
  }



  if (clause === '5' && /Test 1/i.test(title)) {
    return {
      heading: 'Missing PDF/UA Identification Metadata',
      issue: 'The PDF does not contain the PDF/UA Identification Schema in its XMP metadata. This information identifies the PDF/UA standard and version that the document claims to conform to.',
      reason: 'The automated validator inspected the document metadata stream and could not find the required PDF/UA Identification Schema.',
      impact: 'Accessibility validation tools cannot confirm the document’s declared PDF/UA conformance from its metadata. This does not, by itself, establish that the document content is inaccessible, but it prevents this PDF/UA requirement from passing.',
      steps: [
        'Open the PDF in an editor or remediation tool that supports PDF/UA metadata.',
        'Inspect the document properties and XMP metadata.',
        'Determine the PDF/UA version that the document is intended to conform to.',
        'Remediate and validate the document against that version before declaring conformance.',
        'Add the appropriate PDF/UA Identification Schema and required identification properties using a compatible tool.',
        'Save the PDF and run the accessibility validation again.'
      ],
      verification: 'Inspect the XMP metadata and confirm that the appropriate PDF/UA Identification Schema is present. Run the validator again and confirm that Clause 5 — Test 1 passes. Verify all other applicable PDF/UA requirements before claiming full conformance.',
      pageSummary: 'Document-level issue: XMP metadata. No individual page is associated with this failure.',
      affectedCount: evidence.length
    }
  }

  if (clause === '7.1' && /Test 9/i.test(title)) {
    return {
      heading: 'Missing Document Title in XMP Metadata',
      issue: 'The PDF metadata stream does not contain the required Dublin Core dc:title entry. This entry should clearly identify the document.',
      reason: 'The automated validator inspected the XMP metadata and found that the dc:title property was missing.',
      impact: 'A missing metadata title can make it more difficult for users and assistive technologies to identify the document, especially when several PDF documents are open or being managed.',
      steps: [
        'Open the PDF in an editor that supports document properties and XMP metadata.',
        'Open the document properties or metadata settings.',
        'Enter a meaningful document title, such as "CareerOneStop References".',
        'Ensure the title is stored in the XMP Dublin Core dc:title property, not only in the PDF document information dictionary.',
        'Check that the title accurately describes the document.',
        'Save the PDF and run the accessibility validation again.'
      ],
      verification: 'Inspect the XMP metadata and confirm that dc:title contains a meaningful document title. Run the validator again and verify that Clause 7.1 — Test 9 passes.',
      pageSummary: 'Document-level issue: XMP metadata. No individual page is associated with this failure.',
      affectedCount: evidence.length
    }
  }

  if (clause === '7.18.5' && /Test 2/i.test(title)) {
    return {
      heading: 'Missing Alternate Descriptions for Links',
      issue: 'The document contains link annotations that do not provide alternate descriptions through their /Contents entries. These descriptions are required by the PDF/UA validation rule.',
reason: evidence.length > 0
  ? `The automated validator identified ${evidence.length} link annotation${evidence.length === 1 ? '' : 's'} whose /Contents ${evidence.length === 1 ? 'entry does' : 'entries do'} not contain the required alternate descriptions.`
  : 'The automated validator identified link annotations with missing required alternate descriptions in their /Contents entries.',      impact: 'People using assistive technologies may receive incomplete information about the purpose of affected links. This can make navigation and understanding linked resources more difficult.',
      steps: [
        'Open the PDF in an editor that supports link annotations and accessibility remediation.',
        'Locate the affected links on the pages identified in the Affected pages section.',
        'Inspect each link annotation and its accessibility properties.',
        'Provide a meaningful alternate description in the link annotation /Contents entry.',
        'Ensure each description communicates the destination or purpose of the link.',
        'Review the associated Link tags and confirm that the annotations are correctly associated with the document structure.',
        'Save the corrected PDF and run the accessibility validation again.'
      ],
      verification: 'Run the PDF/UA validator again and confirm that Clause 7.18.5 — Test 2 passes. Test the affected links with a screen reader and verify that their purposes are communicated clearly.',
      pageSummary,
      affectedCount: evidence.length
    }
  }


  // Other PDF/UA rules: preserve their actual validation
  // descriptions rather than inventing a specific diagnosis.
  return {
    heading: title.replace(
      /PDF\/UA clause/i,
      'PDF Accessibility Requirement'
    ),

    issue:
      description ||
      'The document contains an accessibility issue identified during automated PDF validation.',

    reason:
      evidence.find(entry => entry.issue)?.issue ||
      description ||
      'One or more document elements did not satisfy the applicable accessibility requirement.',

    impact:
      'This issue may affect how assistive technologies interpret or present the document. The exact impact depends on the failed requirement and the affected content.',

    steps: [
      'Review the accessibility requirement and the reported affected pages.',
      'Open the document in a PDF editor that supports accessibility remediation.',
      'Inspect the relevant document content and accessibility properties.',
      'Correct the underlying issue according to the reported requirement.',
      'Save the updated PDF and scan it again.'
    ],

    verification:
      'Repeat the accessibility validation and confirm that the reported requirement passes. Perform manual assistive technology testing where appropriate.',

    pageSummary,
    affectedCount: evidence.length
  }
}



function getDocumentFixSteps(item) {
  const name = [
    item.id,
    item.title,
    item.category
  ].filter(Boolean).join(' ').toLowerCase()

  if (/language/.test(name)) {
    return [
      'Open the PDF in Adobe Acrobat Pro.',
      'Go to File > Properties > Advanced.',
      'Check and correct the document language.',
      'Save the PDF and verify the language again.'
    ]
  }

  if (/reading order/.test(name)) {
    return [
      'Open the PDF in Adobe Acrobat Pro.',
      'Open the Reading Order and Tags tools.',
      'Check the sequence of headings, paragraphs and tables.',
      'Correct the reading order if necessary.',
      'Verify using a screen reader.'
    ]
  }

  if (/figure|image|alternative text|alt text/.test(name)) {
    return [
      'Open the PDF and inspect the image tags.',
      'Identify informative images missing alternative text.',
      'Add meaningful descriptions to those images.',
      'Mark decorative images appropriately.',
      'Run the accessibility check again.'
    ]
  }

  return [
    'Review the reported accessibility issue.',
    'Locate the affected content in the document.',
    'Verify the issue using an accessibility tool.',
    'Correct the issue if confirmed.',
    'Save the document and run the scan again.'
  ]
}
export default function AccessibilityScanner({
  onBack,
  onScanComplete,
  savedScan = null
}) {
  const [section, setSection] = useState('choose')

  // Website / HTML states
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [htmlFile, setHtmlFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState({})
  const [activeSummary, setActiveSummary] = useState(null)
  const [reportTab, setReportTab] = useState('accessibility')

  // PDF / DOCX states
  const [documentFile, setDocumentFile] = useState(null)
  const [documentReport, setDocumentReport] = useState(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const [documentTab, setDocumentTab] = useState('results')
  const [documentFilter, setDocumentFilter] = useState('all')

  // Restore saved Accessibility report from Recent Chats
  useEffect(() => {
    if (!savedScan) return

    if (savedScan.kind === 'website') {
      setSection('website')
      setMode(savedScan.mode === 'file' ? 'file' : 'url')
      setUrl(savedScan.sourceUrl || '')
      setHtmlFile(null)
      setReport(savedScan.report || null)
      setError('')
      setFilter('all')
      setExpanded({})
      setActiveSummary(null)
      setReportTab('accessibility')
    }

    if (savedScan.kind === 'document') {
      setSection('document')
      setDocumentFile(null)
      setDocumentReport(savedScan.report || null)
      setDocumentError('')
      setDocumentTab('results')
      setDocumentFilter('all')
    }
  }, [savedScan])

  const violations = Array.isArray(report?.violations)
    ? report.violations
    : []

  const counts = useMemo(() => {
    const result = Object.fromEntries(
      IMPACT_LEVELS.map(level => [level, 0])
    )

    violations.forEach(v => {
      const level = IMPACT_LEVELS.includes(v.impact)
        ? v.impact
        : 'unknown'

      result[level] += 1
    })

    return result
  }, [violations])

  const filteredViolations = filter === 'all'
    ? violations
    : violations.filter(v => {
        const level = IMPACT_LEVELS.includes(v.impact)
          ? v.impact
          : 'unknown'

        return level === filter
      })

  const affectedCount = violations.reduce(
    (total, v) =>
      total + (Array.isArray(v.nodes) ? v.nodes.length : 0),
    0
  )

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
    setReport(null)
    setFilter('all')
    setExpanded({})
    setActiveSummary(null)
    setReportTab('accessibility')
  }

  // Website / HTML accessibility scan
  async function scan() {
    if (loading) return

    setError('')
    setReport(null)
    setLoading(true)
    setFilter('all')
    setExpanded({})
    setActiveSummary(null)
    setReportTab('accessibility')

    try {
      const form = new FormData()

      form.append('mode', mode)

      if (mode === 'url') {
        const parsed = new URL(url.trim())

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Enter an HTTP/HTTPS URL.')
        }

        form.append('url', parsed.href)
      } else {
        if (!htmlFile) {
          throw new Error('Select an HTML file first.')
        }

        form.append('file', htmlFile)
      }

      const response = await fetch(
        'http://localhost:3101/api/accessibility/scan',
        {
          method: 'POST',
          body: form
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed.')
      }

      if (!Array.isArray(data.violations)) {
        throw new Error('Unexpected scanner response.')
      }

      setReport(data)

      // Send completed report to App.jsx for saving
      if (typeof onScanComplete === 'function') {
        try {
          await onScanComplete({
            kind: 'website',
            mode,
            sourceUrl: mode === 'url' ? url.trim() : '',
            filename:
              mode === 'file' ? htmlFile?.name || null : null,
            report: data
          })
       } catch (saveError) {
  console.error(
    'Could not save accessibility scan:',
    saveError
  )

  setError(
    'Scan completed, but Recent Chats save failed: ' +
    (saveError.message || 'Unknown error')
  )
}
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Scan failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  function selectHtmlFile(event) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setHtmlFile(null)
      return
    }

    if (!/\.html?$/i.test(file.name)) {
      event.target.value = ''
      setHtmlFile(null)
      setError('Please select a .html or .htm file.')
      return
    }

    setError('')
    setHtmlFile(file)
  }

  // Download Website Accessibility Report as JSON
  function downloadJson() {
    if (!report) return

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: 'application/json' }
    )

    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = objectUrl
    link.download =
      `accessibility-report-${new Date().toISOString().slice(0, 10)}.json`

    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 1000)
  }

  
  // Download Website Accessibility Report as Excel
  async function downloadExcel() {
    if (!report) return

    try {
      setError('')

      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()

      workbook.creator = 'MY AI Accessibility Scanner'
      workbook.created = new Date()

      // Prevent spreadsheet formula injection
      // from scanned website content.
      const safe = value => {
        const text = String(value ?? '')

        return /^[\s]*[=+@-]/.test(text)
          ? "'" + text
          : text
      }

      const addSheet = (name, headers, rows) => {
        const sheet = workbook.addWorksheet(name)

        sheet.addRow(headers)

        sheet.getRow(1).font = {
          bold: true,
          color: { argb: 'FFFFFFFF' }
        }

        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF17365D' }
        }

        sheet.getRow(1).alignment = {
          vertical: 'middle'
        }

        sheet.getRow(1).height = 24

        rows.forEach(row =>
          sheet.addRow(
            row.map(value =>
              typeof value === 'number'
                ? value
                : safe(value)
            )
          )
        )

        const columnWidths = {
  'Metric': 30,
  'Value': 65,
  'Rule ID': 25,
  'Rule name': 48,
  'Severity': 18,
  'Description': 65,
  'Selector': 48,
  'HTML': 65,
  'Fix / review guidance': 65,
  'Axe guidance URL': 65,
'Status': 20,
}

sheet.columns = headers.map(header => ({
  width: columnWidths[header] || 25
}))

        sheet.views = [
          { state: 'frozen', ySplit: 1 }
        ]

        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length }
        }


        const statusColumn = headers.indexOf('Status') + 1

if (statusColumn > 0) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const cell = row.getCell(statusColumn)
    const status = String(cell.value || '')

    let background = 'FFFFFFFF'
    let foreground = 'FF333333'

    if (status === 'Failed') {
      background = 'FFFCE8E6'
      foreground = 'FFB42318'
    } else if (status === 'Passed') {
      background = 'FFE6F4EA'
      foreground = 'FF137333'
    } else if (status === 'Requires Review') {
      background = 'FFFFF4CE'
      foreground = 'FF9A6700'
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: background }
    }

    cell.font = {
      bold: true,
      color: { argb: foreground }
    }

    cell.alignment = {
      vertical: 'top',
      horizontal: 'center',
      wrapText: true
    }
  })
}

       sheet.eachRow((row, index) => {
  if (index > 1) {
    row.alignment = {
      vertical: 'top',
      wrapText: true
    }

    const maxLines = Math.max(
      ...row.values.slice(1).map(value => {
        const text = String(value ?? '')
        return text.split('\n').reduce(
          (total, line) =>
            total + Math.max(1, Math.ceil(line.length / 55)),
          0
        )
      })
    )

    row.height = Math.min(180, Math.max(30, maxLines * 16))
  }
})

        return sheet
      }

      const rules = kind =>
        Array.isArray(report[kind])
          ? report[kind]
          : []

      
       const flattenRules = kind => {
  const status =
    kind === 'violations'
      ? 'Failed'
      : kind === 'passes'
        ? 'Passed'
        : kind === 'incomplete'
          ? 'Requires Review'
          : 'Unknown'

  return rules(kind).flatMap(rule => {
    const nodes = Array.isArray(rule.nodes)
      ? rule.nodes
      : []

    const makeRow = node => [
      rule.id,
      rule.help,
      status,
      rule.impact,
      rule.description,
      Array.isArray(node?.target)
        ? node.target.join(', ')
        : node?.target || '',
      node?.html || '',
      node?.failureSummary || '',
      rule.helpUrl
    ]

    return nodes.length
      ? nodes.map(makeRow)
      : [makeRow(null)]
  })
}
     
const headers = [
  'Rule ID',
  'Rule name',
  'Status',
  'Severity',
  'Description',
  'Selector',
  'HTML',
  'Fix / review guidance',
  'Axe guidance URL'
]
      const violationRules = rules('violations')

      const affected = violationRules.reduce(
        (sum, rule) =>
          sum + (rule.nodes?.length || 0),
        0
      )

      addSheet(
        'Summary',
        ['Metric', 'Value'],
        [
          [
            'Scan source',
            mode === 'file'
              ? htmlFile?.name
              : url
          ],
          [
            'Scan date',
            new Date().toLocaleString()
          ],
          [
            'Violation rules',
            violationRules.length
          ],
          [
            'Affected elements shown',
            affected
          ],
          [
            'Checks passed',
            report.passesCount ??
              rules('passes').length
          ],
          [
            'Require review',
            report.incompleteCount ??
              rules('incomplete').length
          ],
          [
            'Note',
            report.note ||
              'Manual review is still required.'
          ]
        ]
      )

      addSheet(
        'Violations',
        headers,
        flattenRules('violations')
      )

      addSheet(
        'Affected Elements',
        headers,
       flattenRules('violations').filter(
  row => row[5]
)
      )

      addSheet(
        'Passed Checks',
        headers,
        flattenRules('passes')
      )

      addSheet(
        'Require Review',
        headers,
        flattenRules('incomplete')
      )

      const buffer = await workbook.xlsx.writeBuffer()

      const blob = new Blob(
        [buffer],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      )

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl

      link.download =
        `accessibility-report-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`

      document.body.appendChild(link)
      link.click()
      link.remove()

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)

    } catch (e) {
      setError(
        e instanceof Error
          ? `Excel download failed: ${e.message}`
          : 'Excel download failed.'
      )
    }
  }


  // Download VPAT-style WCAG PDF report
  async function downloadVpatPdf() {
    if (!report) return

    try {
      setError('')

      const { jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable =
        autoTableModule.default || autoTableModule.autoTable

      if (typeof autoTable !== 'function') {
        throw new Error('jspdf-autotable is not available.')
      }

      // WCAG success criteria grouped by level.
      const criteria = {
        A: [
          ['1.1.1', 'Non-text Content'],
          ['1.2.1', 'Audio-only and Video-only (Prerecorded)'],
          ['1.2.2', 'Captions (Prerecorded)'],
          ['1.2.3', 'Audio Description or Media Alternative (Prerecorded)'],
          ['1.3.1', 'Info and Relationships'],
          ['1.3.2', 'Meaningful Sequence'],
          ['1.3.3', 'Sensory Characteristics'],
          ['1.4.1', 'Use of Color'],
          ['1.4.2', 'Audio Control'],
          ['2.1.1', 'Keyboard'],
          ['2.1.2', 'No Keyboard Trap'],
          ['2.1.4', 'Character Key Shortcuts'],
          ['2.2.1', 'Timing Adjustable'],
          ['2.2.2', 'Pause, Stop, Hide'],
          ['2.3.1', 'Three Flashes or Below Threshold'],
          ['2.4.1', 'Bypass Blocks'],
          ['2.4.2', 'Page Titled'],
          ['2.4.3', 'Focus Order'],
          ['2.4.4', 'Link Purpose (In Context)'],
          ['2.5.1', 'Pointer Gestures'],
          ['2.5.2', 'Pointer Cancellation'],
          ['2.5.3', 'Label in Name'],
          ['2.5.4', 'Motion Actuation'],
          ['3.1.1', 'Language of Page'],
          ['3.2.1', 'On Focus'],
          ['3.2.2', 'On Input'],
          ['3.2.6', 'Consistent Help'],
          ['3.3.1', 'Error Identification'],
          ['3.3.2', 'Labels or Instructions'],
          ['3.3.7', 'Redundant Entry'],
          ['4.1.2', 'Name, Role, Value']
        ],
        AA: [
          ['1.2.4', 'Captions (Live)'],
          ['1.2.5', 'Audio Description (Prerecorded)'],
          ['1.3.4', 'Orientation'],
          ['1.3.5', 'Identify Input Purpose'],
          ['1.4.3', 'Contrast (Minimum)'],
          ['1.4.4', 'Resize Text'],
          ['1.4.5', 'Images of Text'],
          ['1.4.10', 'Reflow'],
          ['1.4.11', 'Non-text Contrast'],
          ['1.4.12', 'Text Spacing'],
          ['1.4.13', 'Content on Hover or Focus'],
          ['2.4.5', 'Multiple Ways'],
          ['2.4.6', 'Headings and Labels'],
          ['2.4.7', 'Focus Visible'],
          ['2.4.11', 'Focus Not Obscured (Minimum)'],
          ['2.5.7', 'Dragging Movements'],
          ['2.5.8', 'Target Size (Minimum)'],
          ['3.1.2', 'Language of Parts'],
          ['3.2.3', 'Consistent Navigation'],
          ['3.2.4', 'Consistent Identification'],
          ['3.3.3', 'Error Suggestion'],
          ['3.3.4', 'Error Prevention (Legal, Financial, Data)'],
          ['3.3.8', 'Accessible Authentication (Minimum)'],
          ['4.1.3', 'Status Messages']
        ],
        AAA: [
          ['1.2.6', 'Sign Language (Prerecorded)'],
          ['1.2.7', 'Extended Audio Description (Prerecorded)'],
          ['1.2.8', 'Media Alternative (Prerecorded)'],
          ['1.2.9', 'Audio-only (Live)'],
          ['1.3.6', 'Identify Purpose'],
          ['1.4.6', 'Contrast (Enhanced)'],
          ['1.4.7', 'Low or No Background Audio'],
          ['1.4.8', 'Visual Presentation'],
          ['1.4.9', 'Images of Text (No Exception)'],
          ['2.1.3', 'Keyboard (No Exception)'],
          ['2.2.3', 'No Timing'],
          ['2.2.4', 'Interruptions'],
          ['2.2.5', 'Re-authenticating'],
          ['2.2.6', 'Timeouts'],
          ['2.3.2', 'Three Flashes'],
          ['2.3.3', 'Animation from Interactions'],
          ['2.4.8', 'Location'],
          ['2.4.9', 'Link Purpose (Link Only)'],
          ['2.4.10', 'Section Headings'],
          ['2.4.12', 'Focus Not Obscured (Enhanced)'],
          ['2.4.13', 'Focus Appearance'],
          ['2.5.5', 'Target Size (Enhanced)'],
          ['2.5.6', 'Concurrent Input Mechanisms'],
          ['3.1.3', 'Unusual Words'],
          ['3.1.4', 'Abbreviations'],
          ['3.1.5', 'Reading Level'],
          ['3.1.6', 'Pronunciation'],
          ['3.2.5', 'Change on Request'],
          ['3.3.5', 'Help'],
          ['3.3.6', 'Error Prevention (All)'],
          ['3.3.9', 'Accessible Authentication (Enhanced)']
        ]
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 13

      const source = mode === 'file'
        ? htmlFile?.name
        : url

      const scanCriteria = Array.isArray(report.vpat?.criteria)
        ? report.vpat.criteria
        : []

      const evidenceMap = new Map(
        scanCriteria.map(item => [
          String(item.criterion),
          item
        ])
      )

      // jsPDF built-in font supports basic Latin characters.
      const clean = value =>
        String(value ?? '')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201c\u201d]/g, '"')
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[^\x20-\x7e\n]/g, '?')

      const makeRow = (criterion, name, level) => {
        const item = evidenceMap.get(criterion)

        const violations = Array.isArray(item?.violations)
          ? item.violations
          : []

        const passed = Array.isArray(item?.passedChecks)
          ? item.passedChecks
          : []

        const review = Array.isArray(item?.manualReview)
          ? item.manualReview
          : []

        const evidenceSummary = item
          ? `Automated findings: ${violations.length} violation(s), ${passed.length} passed check(s), ${review.length} check(s) requiring review.`
          : 'No criterion-specific automated evidence recorded. Manual evaluation required.'

        const remarks = [
          item?.remarks || '',
          evidenceSummary
        ].filter(Boolean).join(' ')

        return [
          clean(`${criterion} ${name} (Level ${level})`),
          'Not Evaluated',
          clean(remarks)
        ]
      }

      // First page header
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text('WCAG 2.x Report', margin, 17)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)

      const sourceLines = pdf.splitTextToSize(
        `Course / Website Link: ${clean(source || 'Not provided')}`,
        pageWidth - margin * 2
      )

      pdf.text(sourceLines, margin, 25)

      pdf.text(
        `Evaluation Date: ${new Date().toLocaleDateString()}`,
        margin,
        35
      )

      pdf.setFontSize(8)
      pdf.text(
        'VPAT-style automated evidence draft. Manual verification is required before determining conformance.',
        margin,
        42
      )

      const levels = ['A', 'AA', 'AAA']

      levels.forEach((level, index) => {
        if (index > 0) {
          pdf.addPage()
        }

        const headingY = index === 0 ? 52 : 20

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13)

        pdf.text(
          `Table ${index + 1}: Success Criteria, Level ${level}`,
          margin,
          headingY
        )

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)

        pdf.text(
          'Note: Automated checks alone do not establish full conformance.',
          margin,
          headingY + 6
        )

        autoTable(pdf, {
          startY: headingY + 11,
          head: [[
            'Criteria',
            'Conformance Level',
            'Remarks and Explanations'
          ]],
          body: criteria[level].map(([id, name]) =>
            makeRow(id, name, level)
          ),
          theme: 'grid',
          margin: {
            left: margin,
            right: margin,
            top: 19,
            bottom: 17
          },
          tableWidth: pageWidth - margin * 2,
          columnStyles: {
            0: { cellWidth: 115 },
            1: { cellWidth: 43 },
            2: { cellWidth: 'auto' }
          },
          styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2.4,
            lineColor: [80, 80, 80],
            lineWidth: 0.2,
            overflow: 'linebreak',
            valign: 'top',
            textColor: [30, 30, 30]
          },
          headStyles: {
            fillColor: [215, 215, 215],
            textColor: [15, 15, 15],
            fontStyle: 'bold',
            halign: 'center'
          },
          showHead: 'everyPage'
        })
      })

      // Appendix containing detailed rule evidence
      pdf.addPage()
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)

      pdf.text(
        'Appendix: Detailed Automated Rule Evidence',
        margin,
        20
      )

      const detailRows = scanCriteria.flatMap(item =>
        [
          ['Violation', item.violations],
          ['Passed Check', item.passedChecks],
          ['Manual Review', item.manualReview]
        ].flatMap(([type, items]) =>
          (Array.isArray(items) ? items : []).map(rule => [
            clean(item.criterion),
            type,
            clean(rule.ruleId || ''),
            clean(rule.description || ''),
            clean(rule.impact || ''),
            clean(rule.affectedElements ?? '')
          ])
        )
      )

      autoTable(pdf, {
        startY: 27,
        head: [[
          'WCAG',
          'Evidence Type',
          'Rule ID',
          'Description',
          'Impact',
          'Elements'
        ]],
        body: detailRows.length
          ? detailRows
          : [['', 'No mapped evidence', '', '', '', '']],
        theme: 'grid',
        margin: {
          left: margin,
          right: margin,
          top: 19,
          bottom: 17
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.2,
          overflow: 'linebreak',
          lineColor: [80, 80, 80],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [215, 215, 215],
          textColor: [15, 15, 15],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 30 },
          2: { cellWidth: 37 },
          4: { cellWidth: 23 },
          5: { cellWidth: 23 }
        }
      })

      // Page numbering
      const totalPages = pdf.getNumberOfPages()

      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(75, 75, 75)

        pdf.text(
          `Page ${page} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        )

        pdf.text(
          'MY AI | VPAT-style evidence draft',
          margin,
          pageHeight - 8
        )
      }

      pdf.save(
        `MY-AI-VPAT-Report-${new Date().toISOString().slice(0, 10)}.pdf`
      )

    } catch (e) {
      setError(
        e instanceof Error
          ? `VPAT PDF download failed: ${e.message}`
          : 'VPAT PDF download failed.'
      )
    }
  }


  // PDF / DOCX file selection
  function selectDocumentFile(event) {
    const file = event.target.files?.[0] ?? null

    setDocumentFile(file)
    setDocumentReport(null)
    setDocumentError('')
    setDocumentTab('results')

    if (file && !/\.(pdf|docx)$/i.test(file.name)) {
      setDocumentFile(null)
      setDocumentError('Select a PDF or DOCX file.')
      event.target.value = ''
    }
  }

  // PDF / DOCX accessibility scan
  async function scanDocument() {
    if (!documentFile || documentLoading) return

    setDocumentLoading(true)
    setDocumentError('')
    setDocumentReport(null)

    try {
      const form = new FormData()
      form.append('file', documentFile)

      const response = await fetch(
        'http://127.0.0.1:3101/api/accessibility/document/scan',
        {
          method: 'POST',
          body: form
        }
      )

      const contentType =
        response.headers.get('content-type') || ''

      if (!contentType.toLowerCase().includes('application/json')) {
        const responseText = await response.text()
        const preview = responseText
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160)

        throw new Error(
          `Document scanner returned HTTP ${response.status} instead of JSON. ` +
          (preview || 'Check scanner-service.')
        )
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
          `Document scan failed (HTTP ${response.status}).`
        )
      }

      const rawFindings = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.findings)
          ? data.findings
          : null

      if (!rawFindings) {
        throw new Error(
          'Document scanner returned JSON without a results/findings array.'
        )
      }

      const findings = rawFindings.map((item, index) => ({
        ...item,
        id: item.id || item.title || `Check ${index + 1}`,
        guidance: item.guidance || item.fix || ''
      }))

      const documentType =
        data.documentType ||
        data.type ||
        (documentFile.name.toLowerCase().endsWith('.pdf')
          ? 'pdf'
          : 'docx')

      const rawTagTree = Array.isArray(data.tagTree)
        ? data.tagTree
        : []

      const rawPreview = Array.isArray(data.preview)
        ? data.preview
        : Array.isArray(data.readingPreview)
          ? data.readingPreview
          : []

      const preview = documentType === 'pdf'
        ? rawPreview.map((item, index) => ({
            page: item.page ?? index + 1,
            text: typeof item.text === 'string'
              ? item.text
              : '',
            hasText: item.hasText ??
              Boolean(item.text?.trim()),
            extractionMethod:
              item.extractionMethod || 'unspecified'
          }))
        : rawPreview
            .map((item, index) => ({
              paragraph: item.paragraph ?? index + 1,
              text: typeof item.text === 'string'
                ? item.text
                : ''
            }))
            .filter(item => item.text.trim().length > 0)

      const normalizedReport = {
        ...data,
        filename: data.filename || documentFile.name,
        results: findings,
        documentType,
        pageCount:
          data.pageCount || data.metadata?.pages || null,
        preview,
        structure: data.structure || (
          documentType === 'docx'
            ? {
                headings: rawTagTree
                  .map((item, index) => ({
                    ...item,
                    paragraph: index + 1
                  }))
                  .filter(item => item.type === 'heading')
                  .map(item => ({
                    style: item.style || 'Heading',
                    level: item.level ?? null,
                    text: item.text || '',
                    path: `Paragraph ${item.paragraph}`
                  })),
                images: data.metadata?.images ?? 0,
                tables: data.metadata?.tables ?? 0,
                links: data.metadata?.links ?? 0
              }
            : undefined
        )
      }

      // Display normalized report
      setDocumentReport(normalizedReport)
      setDocumentTab('results')
      setDocumentFilter('all')

      // Send report to App.jsx for Recent Chats saving
      if (typeof onScanComplete === 'function') {
        try {
          await onScanComplete({
            kind: 'document',
            filename: documentFile.name,
            documentType,
            report: normalizedReport
          })
        } catch (saveError) {
          console.error(
            'Document scan history save failed:',
            saveError
          )
        }
      }

    } catch (e) {
      setDocumentError(
        e instanceof Error
          ? e.message
          : 'Document scan failed. Is the backend running?'
      )
    } finally {
      setDocumentLoading(false)
    }
  }

  // Download PDF / DOCX report JSON
  function downloadDocumentJson() {
    if (!documentReport) return

    const blob = new Blob(
      [JSON.stringify(documentReport, null, 2)],
      { type: 'application/json' }
    )

    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = objectUrl
    link.download =
      `MY-AI-Document-Accessibility-${new Date()
        .toISOString()
        .slice(0, 10)}.json`

    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  function toggleSummary(sectionName) {
    setActiveSummary(current =>
      current === sectionName ? null : sectionName
    )
  }

  function toggleDetails(id) {
    setExpanded(previous => ({
      ...previous,
      [id]: !previous[id]
    }))
  }

  function renderSummaryRules(rules, kind) {
    if (!Array.isArray(rules)) {
      return <p>Detailed results unavailable.</p>
    }

    if (rules.length === 0) {
      return <p>No results in this category.</p>
    }

    return rules.map(rule => (
      <article
        className="a11y-summary-rule"
        key={`${kind}-${rule.id}`}
      >
        <strong>{rule.help || rule.id}</strong>

        <p>
          <code>{rule.id}</code>
          {rule.impact ? ` · ${rule.impact}` : ''}
          {' · '}
          {rule.nodes?.length ?? 0} elements
        </p>

        <p>{rule.description}</p>

        {(rule.nodes || []).map((node, index) => (
          <div className="a11y-node" key={index}>
            <p>
              <strong>Selector: </strong>
              <code>
                {Array.isArray(node.target)
                  ? node.target.join(', ')
                  : String(node.target || '')}
              </code>
            </p>

            {node.failureSummary && (
  <p>
    <strong>Details: </strong>
    {String(node.failureSummary)
      .split(/<[^>]+>/g)
      .map(text => text.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')}
  </p>
)}

{node.html && (
  <details className="a11y-technical-html">
    <summary>View Technical HTML</summary>

    <pre>
      <code>{node.html}</code>
    </pre>
  </details>
)}
          </div>
        ))}

       <div className="a11y-fix-actions">
  <details className="a11y-fix-guide">
    <summary>How can it fix ?</summary>

    <div className="a11y-fix-content">
      <p>
        <strong>Recommended action</strong>
      </p>

      <p>
        {rule.help ||
          rule.description ||
          'Review the affected elements and correct the accessibility issue.'}
      </p>

      {rule.description && (
        <p>{rule.description}</p>
      )}

      {(rule.nodes || []).map((node, index) => (
        <div className="a11y-fix-step" key={index}>
          <strong>Affected element {index + 1}</strong>

          {node.target && (
            <p>
              <strong>Selector: </strong>
              <code>
                {Array.isArray(node.target)
                  ? node.target.join(', ')
                  : String(node.target)}
              </code>
            </p>
          )}

          {node.failureSummary && (
            <pre className="a11y-fix-instructions">
              {node.failureSummary}
            </pre>
          )}
        </div>
      ))}

      {/* <p className="a11y-fix-note">
        Apply the suggested correction, then run the
        accessibility scan again to verify the result.
      </p> */}
    </div>
  </details>

  {rule.helpUrl && (
    <a
      className="a11y-guidance-link"
      href={rule.helpUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Accessibility guidance ↗
    </a>
  )}
</div>
      </article>
    ))
  }

  return (
    <section
      className="a11y-screen"
      aria-labelledby="a11y-heading"
    >
      <div className="a11y-heading-row">
        <div>
          <h2 id="a11y-heading">
            Accessibility Scanner
          </h2>
          <p className="a11y-description">
            Check accessibility issues in websites,
            HTML files, PDF and DOCX documents.
          </p>
        </div>
      </div>

      {section === 'choose' ? (
        <div className="a11y-options">
          <button
            type="button"
            className="a11y-option"
            onClick={() => setSection('website')}
          >
            <span
              className="a11y-option-icon"
              aria-hidden="true"
            >
              🌐
            </span>
            <strong>Website / HTML</strong>
            <span>
              Scan a website URL or upload an HTML file.
            </span>
          </button>

          <button
            type="button"
            className="a11y-option"
            onClick={() => {
              setSection('document')
              setDocumentError('')
            }}
          >
            <span
              className="a11y-option-icon"
              aria-hidden="true"
            >
              📄
            </span>
            <strong>PDF / DOCX</strong>
            <span>
              Check document accessibility and
              preview reading content.
            </span>
          </button>
        </div>
      ) : section === 'document' ? (
        <div className="a11y-form-card a11y-document-module">
          <div className="a11y-doc-heading">
            <div>
              <h3>PDF / DOCX Accessibility Checker</h3>
            </div>
          </div>

          <div className="a11y-doc-upload">
            {!documentFile ? (
              <>
                <div
                  className="a11y-doc-upload-icon"
                  aria-hidden="true"
                >
                  📄
                </div>

                <h4 className="a11y-doc-upload-title">
                  Upload your PDF or DOCX
                </h4>

                <p className="a11y-doc-upload-desc">
                  Select a document to check accessibility,
                  document structure and reading content.
                </p>

                <input
                  id="a11y-document-file"
                  className="a11y-doc-file-input"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={selectDocumentFile}
                  disabled={documentLoading}
                />

                <label
                  htmlFor="a11y-document-file"
                  className="a11y-doc-choose"
                >
                  Choose PDF or DOCX
                </label>
              </>
            ) : (
              <>
                <div
                  className="a11y-doc-upload-icon"
                  aria-hidden="true"
                >
                  ✓
                </div>

                <h4 className="a11y-doc-upload-title">
                  Document ready to scan
                </h4>

                <div className="a11y-doc-selected">
                  <div className="a11y-doc-selected-icon">
                    📄
                  </div>

                  <div className="a11y-doc-selected-info">
                    <strong>{documentFile.name}</strong>
                    <span>
                      {(documentFile.size / (1024 * 1024))
                        .toFixed(2)} MB
                      {' · '}
                      {documentFile.name
                        .toLowerCase()
                        .endsWith('.pdf')
                        ? 'PDF document'
                        : 'Word document'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="a11y-doc-remove"
                    disabled={documentLoading}
                    onClick={() => {
                      setDocumentFile(null)
                      setDocumentReport(null)
                      setDocumentError('')
                    }}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="a11y-scan-button"
            disabled={!documentFile || documentLoading}
            onClick={scanDocument}
          >
            {documentLoading
              ? 'Analyzing document…'
              : 'Scan Document Accessibility'}
          </button>

          {documentLoading && (
            <p className="a11y-help" role="status">
              Document uploaded for analysis.
              Please wait; large files may take time.
            </p>
          )}

          {documentError && (
            <p className="a11y-error" role="alert">
              {documentError}
            </p>
          )}

          {documentReport && (() => {
            const findings = Array.isArray(
              documentReport.results
            )
              ? documentReport.results
              : []

            const statuses = [
              'failed',
              'warning',
              'manual',
              'passed',
              'not-applicable'
            ]

            const counts = Object.fromEntries(
              statuses.map(status => [
                status,
                findings.filter(
                  item => item.status === status
                ).length
              ])
            )

            const shown = documentFilter === 'all'
              ? findings
              : findings.filter(
                  item => item.status === documentFilter
                )

            const categories = [
              ...new Set(
                shown.map(
                  item => item.category || 'General'
                )
              )
            ]

            return (
              <section
                className="a11y-results"
                aria-label="Document accessibility results"
              >
                <div className="a11y-report-heading">
                  <div>
                    <h3>Document Accessibility Report</h3>
                    <p className="a11y-help">
                      {documentReport.filename ||
                        documentFile?.name}
                      {documentReport.pageCount
                        ? ` · ${documentReport.pageCount} pages`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="a11y-download"
                    onClick={downloadDocumentJson}
                  >
                    ↓ Download JSON
                  </button>
                </div>

                <div className="a11y-doc-stats">
                  {[
                    ['failed', 'Failed'],
                    ['warning', 'Warnings'],
                    ['manual', 'Manual Review'],
                    ['passed', 'Passed']
                  ].map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      className={`a11y-doc-stat a11y-doc-${status}`}
                      onClick={() => {
                        setDocumentTab('results')
                        setDocumentFilter(status)
                      }}
                    >
                      <strong>{counts[status]}</strong>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <div
                  className="a11y-report-tabs"
                  role="group"
                  aria-label="Document report view"
                >
                  {[
  ['results', 'Accessibility Results'],
  ['pdf-report', 'PDF Report'],
  ['detail', 'Results in Detail'],
  ['preview', 'Screen Reader Preview']
].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`a11y-mode ${
                        documentTab === id ? 'active' : ''
                      }`}
                      aria-pressed={documentTab === id}
                      onClick={() => setDocumentTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>


                {documentTab === 'pdf-report' && (
  <div className="a11y-pac-groups">
    <h3>PDF Accessibility Report</h3>

    <p>
      <strong>Document:</strong>{' '}
      {documentReport.filename}
    </p>

    <p>
      <strong>Pages:</strong>{' '}
      {documentReport.pageCount ?? 'Not available'}
    </p>

    <p>
      <strong>Assessment:</strong>{' '}
      {counts.failed > 0
        ? 'Accessibility issues detected'
        : 'No automated failures detected'}
    </p>

    <p>
      Results are based on Enablr AI accessibility checks.
      They do not establish PAC or PDF/UA certification.
    </p>

    <table className="a11y-report-table">
      <thead>
        <tr>
          <th>Checkpoint</th>
          <th>Passed</th>
          <th>Warnings</th>
          <th>Failed</th>
          <th>Manual Review</th>
        </tr>
      </thead>

      <tbody>
        {[...new Set(
          findings.map(item => item.category || 'General')
        )].map(category => {
          const items = findings.filter(
            item => (item.category || 'General') === category
          )

          return (
            <tr key={category}>
              <td>{category}</td>
              <td>{items.filter(item => item.status === 'passed').length}</td>
              <td>{items.filter(item => item.status === 'warning').length}</td>
              <td>{items.filter(item => item.status === 'failed').length}</td>
              <td>{items.filter(item => item.status === 'manual').length}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}


{documentTab === 'detail' && (
  <div className="a11y-pac-groups">
    <h3>Results in Detail</h3>

    <p className="a11y-help">
      Expand a checkpoint to review its accessibility
      findings and supporting evidence.
    </p>

    {[...new Set(
      findings.map(item => item.category || 'General')
    )].map(category => {
      const items = findings.filter(
        item => (item.category || 'General') === category
      )

      return (
        <details
          key={category}
          className="a11y-pac-group"
          open
        >
          <summary>
            <strong>{category}</strong>
            <span>{items.length} checks</span>
          </summary>

          {items.map((item, index) => {
            const explanation =
              documentReport.documentType === 'pdf' &&
              item.status === 'failed'
                ? getPdfAccessibilityExplanation(item)
                : null

            const evidence = Array.isArray(item.evidence)
              ? item.evidence
              : []

            const pages = [...new Set(
              evidence
                .map(entry => Number(entry.page))
                .filter(page =>
                  Number.isInteger(page) && page > 0
                )
            )].sort((a, b) => a - b)

            return (
              <details
                key={`${item.id || item.title}-${index}`}
                className="a11y-pac-check"
              >
                <summary>
                  <span>{item.title || item.id}</span>
                  <span className="a11y-doc-status">
                    {item.status}
                  </span>
                </summary>

                <div className="a11y-pac-detail">
                  <p>
                    <strong>Description:</strong>{' '}
                    {explanation?.issue ||
                      item.description ||
                      'No description available.'}
                  </p>

                  {explanation?.reason && (
                    <p>
                      <strong>Why this failed:</strong>{' '}
                      {explanation.reason}
                    </p>
                  )}

                  <p>
                    <strong>Affected pages:</strong>{' '}
                    {pages.length
                      ? pages.join(', ')
                      : 'Not specified'}
                  </p>

                  {evidence.length > 0 && (
                    <p>
                      <strong>Evidence:</strong>{' '}
                      {evidence.length} reported item(s)
                    </p>
                  )}

                  {explanation?.steps?.length > 0 && (
                    <div>
                      <strong>How to fix:</strong>
                      <ol>
                        {explanation.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {explanation?.verification && (
                    <p>
                      <strong>Verification:</strong>{' '}
                      {explanation.verification}
                    </p>
                  )}

                  {!explanation && item.guidance && (
                    <p>
                      <strong>Guidance:</strong>{' '}
                      {item.guidance}
                    </p>
                  )}
                </div>
              </details>
            )
          })}
        </details>
      )
    })}
  </div>
)}

                {documentTab === 'results' && (
                  <>
                    <div
                      className="a11y-filters"
                      role="group"
                      aria-label="Filter document findings"
                    >
                      {['all', ...statuses].map(status => (
                        <button
                          key={status}
                          type="button"
                          className={`a11y-filter ${
                            documentFilter === status
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            setDocumentFilter(status)
                          }
                        >
                          {status === 'all'
                            ? 'All'
                            : status.replace('-', ' ')}
                          {' '}
                          <span>
                            {status === 'all'
                              ? findings.length
                              : counts[status]}
                          </span>
                        </button>
                      ))}
                    </div>

                    {shown.length === 0 && (
                      <p className="a11y-empty">
                        No findings in this category.
                      </p>
                    )}

                    <div className="a11y-pac-groups">
                      {categories.map(category => {
                        const checks = shown.filter(
                          item =>
                            (item.category || 'General') ===
                            category
                        )

                        return (
                          <details
                            className="a11y-pac-group"
                            key={category}
                            open
                          >
                            <summary>
                              <strong>{category}</strong>
                              <span>
                                {checks.length} checks
                              </span>
                            </summary>

                            {checks.map((item, index) => (
                              <details
                                className="a11y-pac-check"
                                key={`${item.id || item.title}-${index}`}
                              >
                                <summary>
                                  <span
                                    className={`a11y-pac-indicator a11y-pac-${item.status}`}
                                    aria-hidden="true"
                                  >
                                    {item.status === 'passed'
                                      ? '✓'
                                      : item.status === 'failed'
                                        ? '✕'
                                        : item.status === 'warning'
                                          ? '!'
                                          : 'i'}
                                  </span>

                                  <span>
                                    {item.title || item.id}
                                  </span>

                                  <span className="a11y-doc-status">
                                    {item.status}
                                  </span>
                                </summary>

                                <div className="a11y-pac-detail">


{documentReport.documentType === 'pdf' &&
  item.status === 'failed' &&
  
(
  item.title?.startsWith('PDF/UA clause') ||
  item.title === 'Missing document title' ||
  item.title === 'Alternative description missing for an annotation'
) && (() => {

    const explanation = getPdfAccessibilityExplanation(item)

    return (
      <div className="a11y-pdf-explanation">
        <h4>{explanation.heading}</h4>

        <p>
          <strong>What is the issue?</strong>
        </p>
        <p>{explanation.issue}</p>

        <p>
          <strong>Why did this fail?</strong>
        </p>
        <p>{explanation.reason}</p>

        <p>
          <strong>Accessibility impact</strong>
        </p>
        <p>{explanation.impact}</p>

        <p>
          <strong>Affected pages</strong>
        </p>
        <p>{explanation.pageSummary}</p>

        <details className="a11y-fix-steps">
          <summary>How to fix — Step by Step</summary>
          <ol>
            {explanation.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </details>

        <p>
          <strong>How to verify the fix</strong>
        </p>
        <p>{explanation.verification}</p>
      </div>
    )
  })()}
                    

                                

{!(
  documentReport.documentType === 'pdf' &&
  item.status === 'failed' &&
  (
    item.title?.startsWith('PDF/UA clause') ||
    item.title === 'Missing document title' ||
    item.title === 'Alternative description missing for an annotation'
  )
) && (

  <>
    <p>{item.description}</p>

    <p>
      <strong>Location: </strong>
      {item.location || 'Document'}
    </p>

    {(item.fix || item.guidance) && (
      <p>
        <strong>Recommended fix: </strong>
        {item.fix || item.guidance}
      </p>
    )}

    {['failed', 'warning', 'manual'].includes(item.status) && (
      <details className="a11y-fix-steps">
        <summary>How to fix — Step by Step</summary>

        <ol>
          {getDocumentFixSteps(item).map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </details>
    )}
  </>
)}

{Array.isArray(item.evidence) &&
  item.evidence.length > 0 &&
  
!(
  documentReport.documentType === 'pdf' &&
  item.status === 'failed' &&
  (
    item.title?.startsWith('PDF/UA clause') ||
    item.title === 'Missing document title' ||
    item.title === 'Alternative description missing for an annotation'
  )
) && (

    <>
      <strong>
        Affected elements ({item.evidence.length})
      </strong>

      <ul>
        {item.evidence.slice(0, 100).map((e, i) => (
          <li key={i}>
            <strong>
              {e.page != null
                ? `Page ${e.page}`
                : 'Document'}
            </strong>

            <p>
              {e.issue ||
                e.text ||
                e.name ||
                'Accessibility issue detected.'}
            </p>
          </li>
        ))}
      </ul>
    </>
  )}

</div>

                              </details>
                            ))}
                          </details>
                        )
                      })}
                    </div>
                  </>
                )}

                {documentTab === 'preview' && (
                  <div className="a11y-doc-content">
                    <h4>
                      {documentReport.documentType === 'pdf'
                        ? 'PDF Text Reading Preview'
                        : 'DOCX Reading Preview'}
                    </h4>

                    <p className="a11y-help">
                      Extracted text is displayed with
                      available line breaks. This is not
                      a verified screen-reader reading order.
                    </p>

                    {Array.isArray(documentReport.preview) &&
                    documentReport.preview.length > 0 ? (
                      documentReport.preview.map(
                        (item, index) => {
                          const isPdf =
                            documentReport.documentType ===
                            'pdf'

                          const text =
                            typeof item.text === 'string'
                              ? item.text
                              : ''

                          return (
                            <details
                              key={index}
                              className="a11y-doc-page"
                            >
                              <summary>
                                {isPdf
                                  ? `Page ${item.page ?? index + 1}`
                                  : `Paragraph ${
                                      item.paragraph ?? index + 1
                                    }`}
                              </summary>

                              {text.trim() ? (
                                <div className="document-screen-reader-text">
                                  {text}
                                </div>
                              ) : (
                                <p className="a11y-help">
                                  {isPdf
                                    ? 'No extractable text on this page. It may contain images or other non-text content.'
                                    : 'No readable paragraph text available.'}
                                </p>
                              )}
                            </details>
                          )
                        }
                      )
                    ) : (
                      <p className="a11y-empty">
                        Reading preview is not available
                        for this document. Use a screen
                        reader for manual testing.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )
          })()}
        </div>
      ) : (
        <div className="a11y-form-card">
          <h3>Website / HTML</h3>

          <div
            className="a11y-mode-group"
            role="group"
            aria-label="Choose scan source"
          >
            <button
              type="button"
              aria-pressed={mode === 'url'}
              className={`a11y-mode ${
                mode === 'url' ? 'active' : ''
              }`}
              onClick={() => changeMode('url')}
            >
              Website URL
            </button>

            <button
              type="button"
              aria-pressed={mode === 'file'}
              className={`a11y-mode ${
                mode === 'file' ? 'active' : ''
              }`}
              onClick={() => changeMode('file')}
            >
              HTML File
            </button>
          </div>

          {mode === 'url' ? (
            <div className="a11y-field">
              <label htmlFor="a11y-url">
                Website URL
              </label>

              <input
                id="a11y-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                autoComplete="url"
              />
            </div>
          ) : (
            <div className="a11y-field">
              <label htmlFor="a11y-html-file">
                Upload HTML file
              </label>

              <input
                id="a11y-html-file"
                type="file"
                accept=".html,.htm,text/html"
                onChange={selectHtmlFile}
              />

              {htmlFile && (
                <p className="a11y-file-name">
                  Selected: {htmlFile.name}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="a11y-scan-button"
            disabled={
              loading ||
              (mode === 'file'
                ? !htmlFile
                : !url.trim())
            }
            onClick={scan}
          >
            {loading ? 'Scanning…' : 'Scan Accessibility'}
          </button>

          {loading && (
            <p role="status" className="a11y-help">
              Running accessibility checks.
              This may take a moment.
            </p>
          )}

          {error && (
            <p role="alert" className="a11y-error">
              {error}
            </p>
          )}

          {report && (
            <section
              aria-label="Accessibility results"
              className="a11y-results"
            >
              <div className="a11y-report-heading">
                <div>
                  <h3>Accessibility Report</h3>

                  <p className="a11y-help">
                    {mode === 'file'
                      ? htmlFile?.name ||
                        savedScan?.filename ||
                        report.filename ||
                        'HTML file'
                      : url}
                  </p>
                </div>

                <div className="a11y-download-actions">
                  <button
                    type="button"
                    className="a11y-download"
                    onClick={downloadJson}
                  >
                    ↓ Download JSON
                  </button>

                  <button
                    type="button"
                    className="a11y-download"
                    onClick={downloadExcel}
                  >
                    ↓ Download Excel
                  </button>
                </div>
              </div>

              <div
                className="a11y-report-tabs"
                role="group"
                aria-label="Choose report view"
              >
                <button
                  type="button"
                  className={`a11y-mode ${
                    reportTab === 'accessibility'
                      ? 'active'
                      : ''
                  }`}
                  aria-pressed={
                    reportTab === 'accessibility'
                  }
                  onClick={() =>
                    setReportTab('accessibility')
                  }
                >
                  Accessibility Results
                </button>

                <button
                  type="button"
                  className={`a11y-mode ${
                    reportTab === 'vpat'
                      ? 'active'
                      : ''
                  }`}
                  aria-pressed={reportTab === 'vpat'}
                  onClick={() => setReportTab('vpat')}
                >
                  VPAT Report
                </button>
              </div>

              {reportTab === 'accessibility' && (
                <>
                  <div
                    className="a11y-summary"
                    aria-label="Scan summary"
                  >
                    {[
                      [
                        'violations',
                        violations.length,
                        'Violation rules'
                      ],
                      [
                        'affected',
                        affectedCount,
                        'Affected elements shown'
                      ],
                      [
                        'passes',
                        report.passesCount ?? 0,
                        'Checks passed'
                      ],
                      [
                        'incomplete',
                        report.incompleteCount ?? 0,
                        'Require review'
                      ]
                    ].map(([key, count, label]) => (
                     <button
  key={key}
  type="button"
  className={`a11y-summary-item ${
    activeSummary === key ? 'selected' : ''
  }`}
  aria-pressed={activeSummary === key}
  onClick={() => toggleSummary(key)}
>
                        <strong>{count}</strong>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {activeSummary === 'violations' &&
                    renderSummaryRules(
                      report.violations,
                      'violations'
                    )}

                  {activeSummary === 'passes' &&
                    renderSummaryRules(
                      report.passes,
                      'passes'
                    )}

                  {activeSummary === 'incomplete' &&
                    renderSummaryRules(
                      report.incomplete,
                      'incomplete'
                    )}

                  {activeSummary === 'affected' && (
                    <p className="a11y-help">
                      {affectedCount} affected elements
                      across {violations.length} violation rules.
                    </p>
                  )}

                  <div
                    className="a11y-filters"
                    role="group"
                    aria-label="Filter violations"
                  >
                    {['all', ...IMPACT_LEVELS].map(level => (
                      <button
                        key={level}
                        type="button"
                        className={`a11y-filter ${
                          filter === level ? 'active' : ''
                        }`}
                        onClick={() => setFilter(level)}
                      >
                        {level === 'all'
                          ? 'All'
                          : level}
                        {' '}
                        <span>
                          {level === 'all'
                            ? violations.length
                            : counts[level]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {filteredViolations.length === 0 && (
                    <p className="a11y-empty">
                      No violations in this category.
                    </p>
                  )}

                  {filteredViolations.map(
                    (violation, index) => {
                      const id = `${violation.id}-${index}`

                      return (
                       <article
  className="a11y-summary-rule a11y-violation-card"
  key={id}
>
                          <button
                            type="button"
                            className="a11y-violation-toggle"
                            onClick={() =>
                              toggleDetails(id)
                            }
                          >
                            {violation.help ||
                              violation.id}
                            {' · '}
                            {violation.impact || 'unknown'}
                            {' · '}
                            {violation.nodes?.length ?? 0}
                            {' elements'}
                          </button>

                          {expanded[id] && (
                            <div>
                              <p>
                                {violation.description}
                              </p>

                              {renderSummaryRules(
                                [violation],
                                'violation-detail'
                              )}
                            </div>
                          )}
                        </article>
                      )
                    }
                  )}
                </>
              )}

              {reportTab === 'vpat' && (
                <div className="a11y-doc-content">
                  <div className="a11y-download-actions">
                    <button
                      type="button"
                      className="a11y-download"
                      onClick={downloadVpatPdf}
                    >
                      ↓ Download VPAT PDF
                    </button>
                  </div>

                  <h4>WCAG Conformance Evidence</h4>

                  <p className="a11y-help">
                    Automated checks provide preliminary
                    evidence only. Manual verification
                    is required to establish conformance.
                  </p>

                  {Array.isArray(report.vpat?.criteria) &&
                  report.vpat.criteria.length > 0 ? (
                    <div className="a11y-doc-content a11y-vpat-table-scroll">
  <table className="a11y-vpat-table">
                        <thead>
                          <tr>
                            <th scope="col">
                              WCAG Criterion
                            </th>
                            <th scope="col">
                              Conformance
                            </th>
                            <th scope="col">
                              Violations
                            </th>
                            <th scope="col">
                              Passed Checks
                            </th>
                            <th scope="col">
                              Manual Review
                            </th>
                            <th scope="col">
                              Remarks
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {report.vpat.criteria.map(item => (
                            <tr key={item.criterion}>
                              <td>{item.criterion}</td>
                              <td>
                                {item.conformanceLevel}
                              </td>
                              <td>
                                {item.violations?.length ?? 0}
                              </td>
                              <td>
                                {item.passedChecks?.length ?? 0}
                              </td>
                              <td>
                                {item.manualReview?.length ?? 0}
                              </td>
                              <td>{item.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="a11y-empty">
                      No criterion-specific VPAT evidence
                      was returned by the scanner.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <div className="a11y-bottom-actions">
        <button
          type="button"
          className="a11y-bottom-back"
          onClick={
            section === 'choose'
              ? onBack
              : () => setSection('choose')
          }
        >
          Back
        </button>
      </div>
    </section>
  )
}



