import { createVpatEvidence } from './vpat-report.js'
import express from 'express'
import multer from 'multer'
import { chromium } from 'playwright'
import { PlaywrightAxeTester } from 'axe-testing-library/playwright'
import { lookup } from 'node:dns/promises'
import net from 'node:net'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { scanPdf, scanDocx } from './document-scanner.js'

const app = express()
const PORT = Number(process.env.SCANNER_PORT || 3101)
const FRONTEND = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })
// PDF / DOCX document upload — separate from HTML scanner
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      cb(null, `my-ai-${crypto.randomUUID()}.tmp`)
    }
  }),
  limits: {
    files: 1
  }
})

// PDF / DOCX Accessibility Scanner API
app.post(
  '/api/accessibility/document/scan',
  documentUpload.single('file'),
  async (req, res) => {
    const filePath = req.file?.path

    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Please upload a PDF or DOCX file.'
        })
      }

      const extension = path.extname(
        req.file.originalname
      ).toLowerCase()

      if (!['.pdf', '.docx'].includes(extension)) {
        return res.status(400).json({
          error: 'Only PDF and DOCX files are supported.'
        })
      }

      const result = extension === '.pdf'
        ? await scanPdf(filePath)
        : await scanDocx(filePath)

      return res.json({
        filename: req.file.originalname,
        ...result
      })
    } catch (error) {
      console.error('Document scan failed:', error)

      return res.status(400).json({
        error: error?.message || 'Document scan failed.'
      })
    } finally {
      if (filePath) {
        await fs.unlink(filePath).catch(() => {})
      }
    }
  }
)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

function publicIp(ip) {
  if (net.isIP(ip) === 4) {
    const p = ip.split('.').map(Number)
    if (p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
        (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
        (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
        (p[0] === 192 && p[1] === 0) || (p[0] === 198 && (p[1] === 18 || p[1] === 19)) ||
        (p[0] === 198 && p[1] === 51 && p[2] === 100) ||
        (p[0] === 203 && p[1] === 0 && p[2] === 113)) return false
    return true
  }
  if (net.isIP(ip) === 6) {
    const s = ip.toLowerCase()
    if (s === '::1' || s === '::' || s.startsWith('fe80:') || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('ff')) return false
    if (s.startsWith('::ffff:')) return publicIp(s.slice(7))
    if (s.startsWith('2001:db8:')) return false
    return true
  }
  return false
}

async function validateUrl(value) {
  const u = new URL(value)
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password ||
      (u.port && !['80', '443'].includes(u.port))) throw new Error('Only public HTTP/HTTPS websites on standard ports are supported.')
  const host = u.hostname.replace(/\.$/, '').toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('Local or internal addresses are blocked.')
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addresses.length || addresses.some(({ address }) => !publicIp(address))) throw new Error('Private or reserved network addresses are blocked.')
  return u.href
}


function toReport(result) {
  const mapRules = (rules) => rules.map(v => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags,
    nodes: v.nodes.map(n => ({
      target: n.target,
      html: n.html,
      failureSummary: n.failureSummary
    }))
  }))

  return {
    passed: result.passed,
    severityScore: result.severityScore,
    violations: mapRules(result.violations),
    passes: mapRules(result.passes),
    incomplete: mapRules(result.incomplete),
    passesCount: result.passes.length,
    incompleteCount: result.incomplete.length,
      vpat: createVpatEvidence(result)

  }
}

app.post('/api/accessibility/scan', upload.single('file'), async (req, res) => {
  let browser
  try {
    const mode = req.body.mode
    if (!['url', 'file'].includes(mode)) return res.status(400).json({ error: 'Invalid scan mode.' })
    let target
    if (mode === 'url') {
      if (!req.body.url || req.body.url.length > 2048) return res.status(400).json({ error: 'Enter a valid website URL.' })
      target = await validateUrl(req.body.url)  
    } else {
      if (!req.file || !/\.html?$/i.test(req.file.originalname)) return res.status(400).json({ error: 'Upload an HTML (.html/.htm) file.' })
      target = req.file.buffer.toString('utf8')
    }
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false })
    await context.route('**/*', async route => {
      // Uploaded HTML is offline-only. URL scans allow validated public HTTP(S) resources.
      if (mode === 'file') return route.abort()
      try {
        await validateUrl(route.request().url())
        return route.continue()
      } catch { return route.abort() }
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    if (mode === 'file') {
      await page.setContent(target, { waitUntil: 'domcontentloaded', timeout: 15000 })
    } else {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 })
    }
    const tester = new PlaywrightAxeTester()
    const result = await tester.test(page)
    res.json(toReport(result))
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Accessibility scan failed.' })
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
})

app.use((error, req, res, next) => {
  res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Maximum HTML file size is 2 MB.' : 'Invalid upload.' })
})

app.listen(PORT, '127.0.0.1', () => console.log(`Accessibility scanner listening on http://127.0.0.1:${PORT}`))
