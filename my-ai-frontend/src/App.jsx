import { useEffect, useRef, useState } from 'react'







import ReactMarkdown from 'react-markdown'



import remarkGfm from 'remark-gfm'







// import { jsPDF } from 'jspdf'



// import html2canvas from 'html2canvas'







import './App.css'



import Login from './Login'



import Signup from './Signup'
import ForgotPassword from './ForgotPassword'


import GenerateAssessment from './GenerateAssessment'

import { downloadAssessmentDOCX } from './assessmentDocx'



import AccessibilityScanner from './AccessibilityScanner'
import ResetPassword from './ResetPassword'




const promptCards = [

  {

    icon: 'fa-solid fa-code',

    title: 'Generate Assessment',

    prompt:

      'Create a combined assessment for selected grades or skill sets.',

  },

  {

    icon: 'fa-regular fa-lightbulb',

    title: 'Accessibility',

    prompt:

      'Help me review a website for accessibility issues and suggest a practical testing checklist.',

  },

]











function AssessmentMarkdown({ content }) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let normalLines = []
  let i = 0

  const clean = (value) => String(value || '')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .trim()

  const isHeading = (line) => /^\s{0,3}#{1,6}\s+/.test(line)
  const isSection = (line) => /^Section\s+[A-Z]\s*[-–—:.]\s*/i.test(clean(line))
  const isQuestion = (line) => /^\d+\.\s+\S/.test(clean(line))
  const isColumnA = (line) => /^Column\s+A\s*:?$/i.test(clean(line))
  const isColumnB = (line) => /^Column\s+B\s*:?$/i.test(clean(line))
  const isBoundary = (line) =>
    isHeading(line) || isSection(line) ||
    /^(Answer Key|Scoring Guidelines)$/i.test(clean(line))
  const isColumnItem = (line) =>
    /^(?:\d+[.)]|[A-Za-z][.)])\s*\S/.test(clean(line))

  const flushNormal = () => {
    if (normalLines.length) {
      blocks.push({ type: 'markdown', text: normalLines.join('\n') })
      normalLines = []
    }
  }

  while (i < lines.length) {
    if (!isQuestion(lines[i])) {
      normalLines.push(lines[i])
      i++
      continue
    }

    // A matching exercise is identified by its own Column A / Column B
    // headings, not by the surrounding section's exact Markdown format.
    let aIndex = -1
    let bIndex = -1
    let j = i + 1
    while (j < lines.length && !isBoundary(lines[j]) && !isQuestion(lines[j])) {
      if (isColumnA(lines[j])) {
        aIndex = j
        break
      }
      j++
    }
    if (aIndex !== -1) {
      j = aIndex + 1
      while (j < lines.length && !isBoundary(lines[j])) {
        if (isColumnB(lines[j])) {
          bIndex = j
          break
        }
        j++
      }
    }

    if (bIndex === -1) {
      normalLines.push(lines[i])
      i++
      continue
    }

    const expectedItems = lines.slice(aIndex + 1, bIndex)
      .filter(isColumnItem).length
    let itemsRead = 0
    let endIndex = bIndex + 1
    while (endIndex < lines.length) {
      const line = lines[endIndex]
      if (isBoundary(line)) break
      // A new question starts only after the expected Column B items.
      if (isQuestion(line) && (expectedItems === 0 || itemsRead >= expectedItems)) break
      if (isColumnItem(line)) itemsRead++
      endIndex++
    }

    // If the output is malformed, retain it as Markdown rather than
    // accidentally swallowing all following assessment questions.
    if (expectedItems === 0 || itemsRead < expectedItems) {
      normalLines.push(lines[i])
      i++
      continue
    }

    flushNormal()
    blocks.push({
      type: 'matching',
      heading: lines.slice(i, aIndex).join('\n').trim(),
      columnA: lines.slice(aIndex, bIndex).join('\n').trim(),
      columnB: lines.slice(bIndex, endIndex).join('\n').trim()
    })
    i = endIndex
  }
  flushNormal()

  return (
    <div className="assessment-rendered">
      {blocks.map((block, index) => block.type === 'matching' ? (
        <div key={index} className="assessment-matching-question">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.heading}</ReactMarkdown>
          <div className="assessment-matching-columns" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'start',
            width: '100%'
          }}>
            <div className="assessment-matching-column">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.columnA}</ReactMarkdown>
            </div>
            <div className="assessment-matching-column">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.columnB}</ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
      ))}
    </div>
  )
}


function AssessmentRequestSummary({ content }) {



  const getValue = (label) => {

  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')



  const match = String(content || '').match(

    new RegExp(`^${escaped}:\\s*(.+)$`, 'mi')

  )



  return match?.[1]?.trim() || 'Not specified'

}





  return (



    <div className="assessment-request-summary">



      <strong>Generate Assessment</strong>



      <p><strong>Grade:</strong> {getValue('Selected Grade / Skill Set')}</p>



      <p><strong>Subject:</strong> {getValue('Subject')}</p>



      <p><strong>Topic:</strong> {getValue('Topic')}</p>



      <p><strong>Question Types:</strong> {getValue('Question Types')}</p>



      <p><strong>Total Questions:</strong> {getValue('Total Number of Questions')}</p>



    </div>



  )



}







// Sample "Recent" list shown in the design.



// TODO: replace with the conversation list returned by the Spring Boot API.



// const sampleRecentChats = [



//   // 'Explain this Code',



//   // 'Automation testing',



//   // 'Accessibility testing',



//   // 'Functional testing',



//   // 'How to save my cat safely',



// ]



function SelectedImagePreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  return previewUrl ? (
    <img
      src={previewUrl}
      alt={`Preview of ${file.name}`}
      className="selected-image-preview"
    />
  ) : null
}




// Image IDs are stored with the user message so history can load the exact image.
const SAVED_IMAGE_MARKER = /^\[(?:Attached|Generated) image ID:\s*(\d+)\]\s*(?:\r?\n)?/

function ChatImageThumbnail({
  conversationId,
  imageId,
  token,
  localFile,
  isGenerated = false
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!localFile && (!conversationId || !imageId || !token)) return
    let cancelled = false
    let objectUrl = ''
    setUrl('')
    setError(false)

    async function loadImage() {
      try {
        if (localFile) {
          objectUrl = URL.createObjectURL(localFile)
        } else {
          const response = await fetch(
            `http://localhost:8080/api/conversations/${conversationId}/images/${imageId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (!response.ok) throw new Error(`Image request failed (${response.status})`)
          const blob = await response.blob()
          objectUrl = URL.createObjectURL(blob)
        }
        if (cancelled) URL.revokeObjectURL(objectUrl)
        else setUrl(objectUrl)
      } catch (err) {
        if (!cancelled) {
          console.error('Could not load chat image:', err)
          setError(true)
        }
      }
    }
    loadImage()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [conversationId, imageId, token, localFile])

  if (error) return <span className="chat-image-error">Image unavailable</span>
  if (!url) return <span className="chat-image-loading">Loading image...</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="chat-image-link" aria-label="View uploaded image">
      <img
  src={url}
  alt={isGenerated ? 'Generated image' : 'Uploaded image'}
  className={
    isGenerated
      ? 'chat-image-generated'
      : 'chat-image-thumbnail'
  }
/>
    </a>
  )
}

function UserChatMessage({ message, conversationId, token }) {
  const rawContent = String(message.content || '')
  const isGeneratedImage = /^\[Generated image ID:\s*\d+\]/.test(rawContent)
  const match = rawContent.match(SAVED_IMAGE_MARKER)
  const textContent = match ? rawContent.slice(match[0].length) : rawContent
  const displayText = textContent.trim()
  const hasImage = Boolean(match || message.pendingImageFile)
  return (
    <>
      {hasImage && (
        <ChatImageThumbnail

        isGenerated={isGeneratedImage}
          conversationId={conversationId}
          imageId={match?.[1]}
          token={token}
          localFile={message.pendingImageFile}
        />
      )}
     {displayText && <p>{displayText}</p>}
    </>
  )
}

// Detect explicit requests to generate a new image.
// Ordinary questions about images should continue through normal chat.

function isImageGenerationRequest(text) {
  const prompt = String(text || '').trim()

  if (!prompt) return false

  return (
    /^(?:please\s+)?(?:generate|create|draw|make|design)\b/i.test(prompt) ||
    /^(?:please\s+)?(?:show|paint|illustrate)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration)\b/i.test(prompt)
  )
}


// Keep the login active across refreshes in the same browser tab.
// Session storage is cleared when the tab session ends; never store passwords.
const AUTH_STORAGE_KEY = 'myai-auth-session'

function isAuthSessionValid(session) {
  if (!session || typeof session.token !== 'string' || !session.token.trim()) return false
  try {
    const payloadPart = session.token.split('.')[1]
    if (!payloadPart) return false
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function restoreAuthSession() {
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    const session = JSON.parse(stored)
    if (isAuthSessionValid(session)) return session
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to restore login session:', error)
  }
  return null
}

function App() {



  const [openChatMenuId, setOpenChatMenuId] = useState(null)

  // Close the Recent Chats options menu on outside click or Escape.
  useEffect(() => {
    if (openChatMenuId === null) return

    const handleOutsidePointerDown = (event) => {
      if (!event.target.closest?.('.chat-menu-wrapper')) {
        setOpenChatMenuId(null)
      }
    }

    const handleMenuEscape = (event) => {
      if (event.key === 'Escape') setOpenChatMenuId(null)
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    document.addEventListener('keydown', handleMenuEscape)

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
      document.removeEventListener('keydown', handleMenuEscape)
    }
  }, [openChatMenuId])

  const [chatModal, setChatModal] = useState(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

const [renameTitle, setRenameTitle] = useState('')



  const [authPage, setAuthPage] = useState(() =>
  window.location.pathname === '/reset-password'
    ? 'reset-password'
    : 'login'
)



  const [signupSuccess, setSignupSuccess] = useState(false)



  const [sendingMessage, setSendingMessage] = useState(false)



  const [creatingConversation, setCreatingConversation] = useState(false)



  const [activeConversationId, setActiveConversationId] = useState(null)



  const activeConversationIdRef = useRef(null)



  const [messagesLoading, setMessagesLoading] = useState(false)



  const [conversations, setConversations] = useState([])



  const [conversationsLoading, setConversationsLoading] = useState(false)



  const [auth, setAuth] = useState(restoreAuthSession)



  const [assessmentView, setAssessmentView] = useState(null)

  const [accessibilityView, setAccessibilityView] = useState(false)

  const [settingsView, setSettingsView] = useState(false)


const [isEditingProfile, setIsEditingProfile] = useState(false)
const [profileUsername, setProfileUsername] = useState('')
const [profileEmail, setProfileEmail] = useState('')
const [profileSaving, setProfileSaving] = useState(false)

const [helpView, setHelpView] = useState(false)

  const [theme, setTheme] = useState(() => {

  return localStorage.getItem('myai-theme') || 'light'

})

  const [savedAccessibilityScan, setSavedAccessibilityScan] = useState(null)

const [accessibilitySaving, setAccessibilitySaving] = useState(false)



  const [messages, setMessages] = useState([])

  // Cloudflare generated image state
const [generatedImage, setGeneratedImage] = useState(null)
const [generatingImage, setGeneratingImage] = useState(false)
const [imageGenerationError, setImageGenerationError] = useState('')

const [writingJob, setWritingJob] = useState(null)

const [writingParts, setWritingParts] = useState([])

const [writingLoading, setWritingLoading] = useState(false)

const [writingError, setWritingError] = useState('')


useEffect(() => {
  if (!auth?.token || !writingJob?.jobId || !activeConversationId) {
    return
  }

  if (
    writingJob.status === 'COMPLETED' ||
    writingJob.status === 'PAUSED' ||
    writingJob.status === 'FAILED'
  ) {
    return
  }

  let cancelled = false
  let requestInProgress = false

  const checkProgress = async () => {
    if (cancelled || requestInProgress) return

    requestInProgress = true

    try {
      const response = await fetch(
        `http://localhost:8080/api/conversations/${activeConversationId}/writing/${writingJob.jobId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            Accept: 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Progress check failed (${response.status})`)
      }

      const updatedJob = await response.json()

      if (!cancelled) {
        setWritingJob(updatedJob)
        setWritingError('')
      }
    } catch (error) {
      if (!cancelled) {
        console.error('Writing progress polling failed:', error)
        setWritingError(error.message || 'Unable to check progress.')
      }
    } finally {
      requestInProgress = false
    }
  }

  checkProgress()

  const intervalId = setInterval(checkProgress, 3000)

  return () => {
    cancelled = true
    clearInterval(intervalId)
  }
}, [
  auth?.token,
  activeConversationId,
  writingJob?.jobId,
  writingJob?.status
])





  const [input, setInput] = useState('')



  const [selectedFiles, setSelectedFiles] = useState([])

  const [imageFollowUpMode, setImageFollowUpMode] = useState(false)



  const [isListening, setIsListening] = useState(false)



  const [notice, setNotice] = useState('')



  const fileInputRef = useRef(null)



  const imageInputRef = useRef(null)



  const recognitionRef = useRef(null)



  const textareaRef = useRef(null)







  // Auto-grow the textarea so one line looks exactly like the design's input line





useEffect(() => {

  document.documentElement.setAttribute('data-theme', theme)

  localStorage.setItem('myai-theme', theme)

}, [theme])

useEffect(() => {



  if (!auth?.token) return







  const controller = new AbortController()







  async function loadConversations() {



    setConversationsLoading(true)







    try {



      const response = await fetch(



        'http://localhost:8080/api/conversations',



        {



          method: 'GET',



          headers: {



            Authorization: `Bearer ${auth.token}`,



            Accept: 'application/json',



          },



          signal: controller.signal,



        }



      )







      if (!response.ok) {



        throw new Error(`Could not load conversations (${response.status})`)



      }







     const data = await response.json()



const loadedConversations = Array.isArray(data) ? data : []



console.log('All conversations from backend:', loadedConversations)



console.log(

  'Accessibility conversations from backend:',

  loadedConversations.filter((conversation) =>

    conversation.title?.startsWith('Accessibility - ')

  )

)



setConversations(loadedConversations)



    } catch (error) {



      if (error.name !== 'AbortError') {



        console.error('Loading conversations failed:', error)



        setNotice(error.message || 'Could not load conversations.')



      }



    } finally {



      if (!controller.signal.aborted) {



        setConversationsLoading(false)



      }



    }



  }







  loadConversations()







  return () => controller.abort()



}, [auth?.token])













async function handleAccessibilityScanComplete(scanData) {

  if (!auth?.token) {

    throw new Error('Please log in again.')

  }



  setAccessibilitySaving(true)



  try {

    const title =

      scanData.kind === 'document'

        ? `Accessibility - ${scanData.filename || 'Document'}`

        : `Accessibility - ${

            scanData.sourceUrl ||

            scanData.filename ||

            'Website'

          }`



    const createResponse = await fetch(

      'http://localhost:8080/api/conversations',

      {

        method: 'POST',

        headers: {

          Authorization: `Bearer ${auth.token}`,

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          title: title.slice(0, 200)

        })

      }

    )



    if (!createResponse.ok) {

      throw new Error(

        `Could not create accessibility history (${createResponse.status})`

      )

    }



    const conversation = await createResponse.json()

    const conversationId = conversation.conversationId



    const saveResponse = await fetch(

      `http://localhost:8080/api/conversations/${conversationId}/accessibility-scan`,

      {

        method: 'POST',

        headers: {

          Authorization: `Bearer ${auth.token}`,

          'Content-Type': 'application/json'

        },

        body: JSON.stringify(scanData)

      }

    )



    if (!saveResponse.ok) {

      throw new Error(

        `Could not save accessibility report (${saveResponse.status})`

      )

    }



    activeConversationIdRef.current = conversationId

    setActiveConversationId(conversationId)

    setSavedAccessibilityScan(scanData)

    setMessages([])

    setConversations(current => [

      conversation,

      ...current.filter(

        item => item.conversationId !== conversationId

      )

    ])

    setNotice('Accessibility report saved in Recent Chats.')

  } catch (error) {

    console.error('Accessibility save failed:', error)

    setNotice(

      error.message || 'Could not save accessibility report.'

    )

    throw error

  } finally {

    setAccessibilitySaving(false)

  }

}




function handleEditProfile() {
  setProfileUsername(auth?.username || '')
  setProfileEmail(auth?.email || '')
  setIsEditingProfile(true)
}

function handleCancelProfileEdit() {
  setIsEditingProfile(false)
  setProfileUsername('')
  setProfileEmail('')
}


async function handleSaveProfile(event) {
  event?.preventDefault()

  if (profileSaving) return

  const username = profileUsername.trim()
  const email = profileEmail.trim()

  if (!username || !email) {
    setNotice('Username and email are required.')
    return
  }

  if (!auth?.token) {
    setNotice('Session expired. Please log in again.')
    return
  }

  setProfileSaving(true)
  setNotice('')

  try {
    const response = await fetch(
      'http://localhost:8080/api/auth/profile',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email })
      }
    )

    const data = await response.json()


    console.log('CONVERSATION MESSAGES:', data)

    
if (!response.ok) {
  if (response.status === 409) {
    throw new Error(
      'Username or email already exists. Please choose another.'
    )
  }

  throw new Error(
    data.message ||
    data.detail ||
    `Profile update failed (${response.status})`
  )
}

    if (!data.token || !data.username || !data.email) {
      throw new Error('Incomplete profile response from server.')
    }

    const updatedAuth = {
      ...auth,
      token: data.token,
      userId: data.userId,
      username: data.username,
      email: data.email
    }

    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(updatedAuth)
    )

    setAuth(updatedAuth)
    setIsEditingProfile(false)
    setProfileUsername('')
    setProfileEmail('')
    setNotice('Profile updated successfully.')
  } catch (error) {
    console.error('Profile update failed:', error)
    setNotice(error.message || 'Unable to update profile.')
  } finally {
    setProfileSaving(false)
  }
}



function startNewChat() {
  // A conversation is created by sendMessage only when the first message is sent.
  // Repeated clicks must not insert empty conversations into the database.
  activeConversationIdRef.current = null
  setActiveConversationId(null)
  setMessages([])
  // Clear generated image when starting a new chat
setGeneratedImage(null)
setGeneratingImage(false)
setImageGenerationError('')
  setInput('')
  setSelectedFiles([])
  setImageFollowUpMode(false)
  setAccessibilityView(false)
  setSavedAccessibilityScan(null)
  setAssessmentView(null)
  setSettingsView(false)
  setHelpView(false)
  setWritingJob(null)
  setWritingParts([])
  setWritingError('')
  setMessagesLoading(false)
  setNotice('')
}


function choosePrompt(prompt) {



    setInput(prompt)



    setNotice('Prompt added. Review it, then press Send.')



  }



















function downloadAssessmentPDF(messageId) {



  const element = document.getElementById(



    `assessment-message-${messageId}`



  )







  if (!element) {



    alert('Assessment content not found.')



    return



  }







  // Create a separate print window.



  const printWindow = window.open('', '_blank')







  if (!printWindow) {



    alert('Please allow pop-ups to download the assessment PDF.')



    return



  }







  // Copy rendered assessment content.



  const content = element.cloneNode(true)











  // Arrange Matching Column A and Column B side-by-side



  // Only in the PDF print copy, not in the chat UI.







  // const allNodes = Array.from(content.children)







  // for (const node of allNodes) {



  //   const headingText = node.textContent.trim()







  //   const isMatchingHeading =



  //     node.tagName === 'P' &&



  //     /^\d+\\.\s\*Matching\b/i.test(headingText)







  //   if (!isMatchingHeading) continue







  //   const matchingNodes = []



  //   let next = node.nextElementSibling







  //   // Collect everything until the next question or section.



  //   while (next) {



  //     const text = next.textContent.trim()







  //     const isNextQuestion =



  //       next.tagName === 'P' &&



  //       /^\d+\\.\s\*(MCQ|Matching|Fill in the Blanks|True\s\*\\\/\s\*False)/i.test(text)







  //     const isSectionHeading =



  //       /^H[1-6]$/.test(next.tagName)







  //     if (isNextQuestion || isSectionHeading) break







  //     matchingNodes.push(next)



  //     next = next.nextElementSibling



  //   }







  //   const columnAIndex = matchingNodes.findIndex(



  //     (item) => /^Column A$/i.test(item.textContent.trim())



  //   )







  //   const columnBIndex = matchingNodes.findIndex(



  //     (item) => /^Column B$/i.test(item.textContent.trim())



  //   )







  //   if (



  //     columnAIndex === -1 ||



  //     columnBIndex <= columnAIndex



  //   ) {



  //     continue



  //   }







  //   const columnANodes = matchingNodes.slice(



  //     columnAIndex,



  //     columnBIndex



  //   )







  //   const columnBNodes = matchingNodes.slice(



  //     columnBIndex



  //   )







  //   const columnsWrapper = document.createElement('div')



  //   columnsWrapper.className = 'assessment-matching-columns'







  //   const columnA = document.createElement('div')



  //   columnA.className = 'assessment-matching-column'







  //   const columnB = document.createElement('div')



  //   columnB.className = 'assessment-matching-column'







  //   columnANodes.forEach((item) => columnA.appendChild(item))



  //   columnBNodes.forEach((item) => columnB.appendChild(item))







  //   columnsWrapper.appendChild(columnA)



  //   columnsWrapper.appendChild(columnB)







  //   node.after(columnsWrapper)



  // }











  // Find the Questions heading.



  const headings = Array.from(



    content.querySelectorAll('h1, h2, h3')



  )







  const questionsHeading = headings.find(



    (heading) =>



      heading.textContent.trim().toLowerCase() === 'questions'



  )







  const answerKeyHeading = headings.find(



    (heading) =>



      heading.textContent.trim().toLowerCase() === 'answer key'



  )







  // Wrap each question into a separate printable block.



  if (questionsHeading && answerKeyHeading) {



    let current = questionsHeading.nextElementSibling



    let currentQuestion = null







    while (current && current !== answerKeyHeading) {



      const next = current.nextElementSibling







      const text = current.textContent.trim()







      // Example: "1. MCQ" or "5. Matching – Addition"



             const isQuestionHeading =

  current.tagName === 'P' &&

  /^\d+\.\s+\S/.test(text)



if (current.classList?.contains('assessment-matching-question')) {



  currentQuestion = null



  current = next



  continue



}



      if (isQuestionHeading) {



        currentQuestion = document.createElement('div')



        currentQuestion.className = 'assessment-print-question'







        current.parentNode.insertBefore(



          currentQuestion,



          current



        )



      }







      if (currentQuestion) {



        currentQuestion.appendChild(current)



      }







      current = next



    }



  }







  const printStyles = `



    @page {



      size: A4;



      margin: 15mm;



    }







    * {



      box-sizing: border-box;



    }







    body {



      margin: 0;



      padding: 0;



      background: white;



      color: #111;



      font-family: Arial, sans-serif;



      font-size: 11pt;



      line-height: 1.4;



    }







    h1, h2, h3 {



      margin: 12px 0 6px;



      break-after: avoid;



    }







    p {



      margin: 4px 0;



    }







    ul, ol {



      margin: 5px 0;



      padding-left: 24px;



    }







    li {



      margin: 3px 0;



    }







    .assessment-print-question {



      break-inside: avoid;



      page-break-inside: avoid;



      margin: 10px 0;



    }







    .assessment-print-question > p:first-child {



      font-weight: bold;



      margin-bottom: 4px;



    }







    table {



      width: 100%;



      border-collapse: collapse;



    }







    th, td {



      border: 1px solid #ddd;



      padding: 6px;



      text-align: left;



    }







    tr {



      break-inside: avoid;



    }







    hr {



      margin: 12px 0;



    }







.assessment-matching-columns {



  display: grid;



  grid-template-columns: 1fr 1fr;



  gap: 24px;



  margin: 8px 0 12px;



  break-inside: avoid;



  page-break-inside: avoid;



}



.assessment-rendered .assessment-matching-columns {

  display: grid !important;

  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;

  gap: 16px !important;

  align-items: start !important;

  width: 100% !important;

}



.assessment-rendered .assessment-matching-column {

  min-width: 0 !important;

  overflow-wrap: anywhere;

}







.assessment-matching-column {



  min-width: 0;



}







.assessment-matching-column p {



  margin: 3px 0;



}







.assessment-matching-column ol,



.assessment-matching-column ul {



  margin: 4px 0;



  padding-left: 24px;



}







.assessment-rendered {



  font-size: 11pt;



  line-height: 1.4;



}







.assessment-rendered p {



  margin: 3px 0;



  line-height: 1.4;



  white-space: normal;



}







.assessment-rendered ul,



.assessment-rendered ol {



  margin: 4px 0;



  padding-left: 22px;



}







.assessment-rendered li {



  margin: 2px 0;



  line-height: 1.4;



}







.assessment-rendered li p {



  margin: 0;



}







.assessment-matching-question {



  margin: 8px 0 12px;



  break-inside: avoid;



  page-break-inside: avoid;



}







.assessment-matching-columns {



  display: grid;



  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);



  gap: 24px;



  align-items: start;



  margin: 5px 0 8px;



}







.assessment-matching-column {



  min-width: 0;



}







.assessment-matching-column p {



  margin: 2px 0;



  line-height: 1.4;



}







.assessment-matching-column ol,



.assessment-matching-column ul {



  margin: 3px 0;



  padding-left: 20px;



}







.assessment-matching-column li {



  margin: 2px 0;



  line-height: 1.4;



}







  `







  printWindow.document.open()



  printWindow.document.write(`



    <!DOCTYPE html>



    <html>



      <head>



        <title>Enablr AI Assessment</title>



        <style>${printStyles}</style>



      </head>



      <body>



        ${content.innerHTML}



      </body>



    </html>
  `)



  printWindow.document.close()







  printWindow.addEventListener('load', () => {



    printWindow.focus()



    printWindow.print()



  })



}











async function handleDownloadDOCX(message) {

  try {

    await downloadAssessmentDOCX(

      message.content,

      `Enablr-AI-Assessment-${message.id}.docx`

    )

  } catch (error) {

    console.error('DOCX download failed:', error)

    setNotice(error.message || 'Unable to download DOCX.')

  }

}



async function generateAssessmentFromPdf({



  file,



  questionTypes,



  questionCount,



  instructions



}) {



  if (sendingMessage) return







if (!auth?.token) {



  setNotice('Session expired. Please log in again.')



  return



}



  if (sendingMessage) return







  setAssessmentView(null)
setSendingMessage(true)
setNotice('Generating assessment from document...')






  try {



    const formData = new FormData()







    formData.append('file', file)







    questionTypes.forEach((type) => {



      formData.append('questionTypes', type)



    })







    formData.append('questionCount', String(questionCount))



    formData.append('instructions', instructions || '')







    console.log('Document Auth Debug:', {



  authExists: !!auth,



  tokenExists: !!auth?.token,



  tokenType: typeof auth?.token,



  tokenLength: auth?.token?.length,



  tokenParts: auth?.token?.split('.').length



})







    const response = await fetch(



      'http://localhost:8080/api/assessments/generate-from-pdf',



      {



        method: 'POST',



        headers: {



          Authorization: `Bearer ${auth.token}`



        },



        body: formData



      }



    )







    if (!response.ok) {



  const errorText = await response.text()







  console.error('Document API Error:', {



    status: response.status,



    body: errorText



  })







  if (response.status === 401) {



    throw new Error(



      'Authentication failed. Please log in again.'



    )



  }







  if (response.status === 429) {



    throw new Error(



      'Groq AI rate limit reached. Please wait and retry.'



    )



  }







  let message = errorText







  try {



    const errorData = JSON.parse(errorText)



    message =



      errorData.message ||



      errorData.detail ||



      errorData.error ||



      errorText



  } catch {



    // Backend returned plain text.



  }







  throw new Error(



    message || `Document generation failed (${response.status})`



  )



}







   const result = await response.json()



const assessment = result.assessment



const conversationId = result.conversationId







if (!assessment?.trim() || !conversationId) {



  throw new Error('Document assessment response is incomplete.')



}







setAssessmentView(null)







activeConversationIdRef.current = conversationId



setActiveConversationId(conversationId)







// Reload saved user and AI messages from Oracle.



await openConversation(conversationId)







// Refresh Recent Chats.



const conversationsResponse = await fetch(



  'http://localhost:8080/api/conversations',



  {



    method: 'GET',



    headers: {



      Authorization: `Bearer ${auth.token}`,



      Accept: 'application/json'



    }



  }



)







if (!conversationsResponse.ok) {



  throw new Error(



    'Assessment saved, but Recent Chats could not be refreshed.'



  )



}







const updatedConversations =



  await conversationsResponse.json()







setConversations(



  Array.isArray(updatedConversations)



    ? updatedConversations



    : []



)



    setNotice('')







  } catch (error) {



    console.error('Document assessment generation failed:', error)



    setNotice(error.message || 'Unable to generate document assessment.')



  } finally {



    setSendingMessage(false)



  }



}







async function startWritingJob(topic, pages, conversationId) {
  if (!auth?.token) {
    setWritingError('Please log in again.')
    return null
  }

  if (!conversationId) {
    setWritingError('Please select a conversation.')
    return null
  }

  setWritingLoading(true)
  setWritingError('')

  try {
    const response = await fetch(
      `http://localhost:8080/api/conversations/${conversationId}/writing`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic.trim(),
          pages: Number(pages)
        })
      }
    )

    if (!response.ok) {
      throw new Error(
        `Unable to start writing (${response.status})`
      )
    }

    const job = await response.json()

    setWritingJob(job)
    setWritingParts([])

    return job
  } catch (error) {
    console.error('Writing job creation failed:', error)
    setWritingError(error.message || 'Unable to start writing.')
    return null
  } finally {
    setWritingLoading(false)
  }
}


async function fetchWritingProgress(conversationId, jobId) {
  if (!auth?.token || !conversationId || !jobId) {
    return null
  }

  try {
    const response = await fetch(
      `http://localhost:8080/api/conversations/${conversationId}/writing/${jobId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(
        `Unable to fetch writing progress (${response.status})`
      )
    }

    const job = await response.json()

    setWritingJob(job)
    setWritingError('')

    return job
  } catch (error) {
    console.error('Writing progress fetch failed:', error)
    setWritingError(
      error.message || 'Unable to fetch writing progress.'
    )
    return null
  }
}


async function loadWritingHistory(conversationId) {
  if (!auth?.token || !conversationId) return

  try {
    const response = await fetch(
      `http://localhost:8080/api/conversations/${conversationId}/writing`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(
        `Writing history load failed (${response.status})`
      )
    }

    const jobs = await response.json()

    // Ignore an outdated response after conversation switching.
    if (
      String(activeConversationIdRef.current) !==
      String(conversationId)
    ) {
      return
    }

    const latestJob = Array.isArray(jobs) ? jobs[0] : null

    setWritingJob(latestJob)
    setWritingParts([])
    setWritingError('')

    if (!latestJob) return

    // Load existing content even if generation was paused.
    const partsResponse = await fetch(
      `http://localhost:8080/api/conversations/${conversationId}/writing/${latestJob.jobId}/parts`,
      {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json',
        },
      }
    )

    if (!partsResponse.ok) {
      throw new Error(
        `Writing parts load failed (${partsResponse.status})`
      )
    }

    const parts = await partsResponse.json()

    if (
      String(activeConversationIdRef.current) ===
      String(conversationId)
    ) {
      setWritingParts(
        Array.isArray(parts)
          ? [...parts].sort(
              (a, b) => a.partNumber - b.partNumber
            )
          : []
      )
    }
  } catch (error) {
    if (
      String(activeConversationIdRef.current) ===
      String(conversationId)
    ) {
      console.error('Writing history error:', error)
      setWritingError(
        error.message || 'Unable to restore writing.'
      )
    }
  }
}



async function fetchWritingParts(conversationId, jobId) {
  if (!auth?.token || !conversationId || !jobId) {
    return []
  }

  try {
    const response = await fetch(
      `http://localhost:8080/api/conversations/${conversationId}/writing/${jobId}/parts`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(
        `Unable to fetch writing content (${response.status})`
      )
    }

    const parts = await response.json()

    const sortedParts = Array.isArray(parts)
      ? [...parts].sort(
          (a, b) => a.partNumber - b.partNumber
        )
      : []

    setWritingParts(sortedParts)
    setWritingError('')

    return sortedParts
  } catch (error) {
    console.error('Writing content fetch failed:', error)

    setWritingError(
      error.message || 'Unable to load writing content.'
    )

    return []
  }
}





useEffect(() => {
  if (!auth?.token || !activeConversationId || !writingJob?.jobId) {
    return
  }

  if (writingJob.status !== 'COMPLETED') {
    return
  }

  const conversationId = activeConversationId
  const jobId = writingJob.jobId
  let cancelled = false

  async function loadCompletedWriting() {
    try {
      const response = await fetch(
        `http://localhost:8080/api/conversations/${conversationId}/writing/${jobId}/parts`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            Accept: 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(
          `Unable to load generated writing (${response.status})`
        )
      }

      const data = await response.json()

      if (!cancelled) {
        const sortedParts = Array.isArray(data)
          ? [...data].sort((a, b) => a.partNumber - b.partNumber)
          : []

        setWritingParts(sortedParts)
        setWritingError('')
      }
    } catch (error) {
      if (!cancelled) {
        console.error('Completed writing load failed:', error)
        setWritingError(
          error.message || 'Unable to load generated writing.'
        )
      }
    }
  }

  loadCompletedWriting()

  return () => {
    cancelled = true
  }
}, [
  auth?.token,
  activeConversationId,
  writingJob?.jobId,
  writingJob?.status
])

async function generateCloudflareImage(prompt) {
  if (!auth?.token) {
    throw new Error('Please log in again.')
  }

  const cleanPrompt = String(prompt || '').trim()

  if (!cleanPrompt) {
    throw new Error('Please enter an image description.')
  }

  const response = await fetch(
    'http://localhost:8080/api/images/generate',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
        Accept: 'image/png'
      },
      body: JSON.stringify({
        prompt: cleanPrompt
      })
    }
  )

  if (!response.ok) {
    throw new Error(
      `Image generation failed (${response.status})`
    )
  }

  const imageBlob = await response.blob()

  if (!imageBlob.size || imageBlob.type !== 'image/png') {
    throw new Error('Server returned an invalid PNG image.')
  }

  return imageBlob
}


async function saveGeneratedImage(
  conversationId,
  imageBlob,
  prompt
) {
  if (!conversationId) {
    throw new Error('Conversation ID is missing.')
  }

  if (!imageBlob || !imageBlob.size) {
    throw new Error('Generated image is empty.')
  }

  if (imageBlob.size > 4 * 1024 * 1024) {
    throw new Error(
      'Generated image exceeds the 4 MB storage limit.'
    )
  }

  const formData = new FormData()

  const imageFile = new File(
    [imageBlob],
    'generated-image.png',
    { type: 'image/png' }
  )

  formData.append('file', imageFile)
  formData.append('prompt', prompt)

  const response = await fetch(
    `http://localhost:8080/api/conversations/${conversationId}/images/generated`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`
      },
      body: formData
    }
  )

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(
      errorText || `Image save failed (${response.status})`
    )
  }

  return await response.json()
}

async function sendMessage(event, assessmentPrompt = null) {

  event?.preventDefault?.()

if (generatingImage || sendingMessage) {
  return
}


  const imagePrompt = String(assessmentPrompt ?? input ?? '').trim()

if (
  assessmentPrompt === null &&
  isImageGenerationRequest(imagePrompt) &&
  selectedFiles.length === 0
) {
  // Development mode: no Cloudflare API calls.
  const IMAGE_MOCK_MODE = false

  setImageGenerationError('')


  
 setInput('')
setGeneratingImage(true)

try {
  if (IMAGE_MOCK_MODE) {
  setGeneratedImage({
    url: null,
    prompt: imagePrompt,
    isMock: true
  })

  setInput('')
  setNotice('Image generation preview ready (mock mode).')
  return
}

let conversationId = activeConversationIdRef.current

if (!conversationId) {
  const createResponse = await fetch(
    'http://localhost:8080/api/conversations',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'New Chat' })
    }
  )

  if (!createResponse.ok) {
    throw new Error('Unable to create conversation.')
  }

  const conversation = await createResponse.json()

  conversationId = conversation.conversationId

  activeConversationIdRef.current = conversationId
  setActiveConversationId(conversationId)
  setConversations(current => [conversation, ...current])
  setImageFollowUpMode(false)
}

const imageBlob = await generateCloudflareImage(imagePrompt)

const savedMessage = await saveGeneratedImage(
  conversationId,
  imageBlob,
  imagePrompt
)

console.log('Generated Image Saved Response:', savedMessage)


const checkResponse = await fetch(
  `http://localhost:8080/api/conversations/${conversationId}/messages`,
  {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json'
    }
  }
)

if (checkResponse.ok) {
  const savedMessages = await checkResponse.json()
  console.log('IMAGE CHAT HISTORY:', savedMessages)
}


const imageUrl = URL.createObjectURL(imageBlob)

setGeneratedImage({
  url: imageUrl,
  prompt: imagePrompt,
  isMock: false
})

await openConversation(conversationId)
const conversationsResponse = await fetch(
  'http://localhost:8080/api/conversations',
  {
    headers: {
      Authorization: `Bearer ${auth.token}`
    }
  }
)

if (conversationsResponse.ok) {
  const updatedConversations = await conversationsResponse.json()
  setConversations(updatedConversations)
}

setInput('')
setNotice('')
  } catch (error) {
    console.error('Image generation failed:', error)
    setImageGenerationError(
      error.message || 'Unable to generate image.'
    )
  } finally {
    setGeneratingImage(false)
  }

  return
}






  event?.preventDefault?.()







  const content = (



    assessmentPrompt ?? input



  ).trim()

  const filesToSend = [...selectedFiles]







  if ((!content && selectedFiles.length === 0) || sendingMessage) return







  // if (!activeConversationId) {



  //   setNotice('Please create or select a conversation first.')



  //   return



  // }







  // Files are not yet supported by the message API.



  // if (selectedFiles.length > 0) {



  //   setNotice('File uploads are not connected yet. Remove the attachments before sending.')



  //   return



  // }







  let conversationId = activeConversationIdRef.current







setMessages(current => [
  ...current,
  { id: `pending-${Date.now()}`, role: 'user', content, pendingImageFile: filesToSend.length === 1 && /\.(jpg|jpeg|png|webp)$/i.test(filesToSend[0].name) ? filesToSend[0] : null }
])

setSendingMessage(true)
setInput('')
setSelectedFiles([])
setNotice('')







try {



  // Automatically create a conversation if none is selected.



  if (!conversationId) {



    const createResponse = await fetch(



      'http://localhost:8080/api/conversations',



      {



        method: 'POST',



        headers: {



          Authorization: `Bearer ${auth.token}`,



          'Content-Type': 'application/json',



        },



        body: JSON.stringify({



          title: 'New Chat',



        }),



      }



    )







    if (!createResponse.ok) {



      throw new Error(



        `Failed to create conversation (${createResponse.status})`



      )



    }







    const conversation = await createResponse.json()







    conversationId = conversation.conversationId







    activeConversationIdRef.current = conversationId



    setActiveConversationId(conversationId)







    setConversations((current) => [



      conversation,



      ...current,



    ])







    setImageFollowUpMode(false)



  }





    // Detect explicit long-form writing requests.
    const writingMatch = filesToSend.length === 0
      ? content.match(
          /^(?:please\s+)?(?:write|create|generate|draft)\s+(?:me\s+)?(?:a\s+|an\s+)?(\d{1,3})[\s-]+pages?\s+(?:book|document|article|report|essay|guide|story|content)?\s*(?:about|on|regarding|of)?\s*(.+)$/i
        )
      : null

    if (writingMatch) {
      const pages = Number(writingMatch[1])
      const topic = writingMatch[2].trim()

      if (pages < 1 || pages > 500) {
        throw new Error('Please request between 1 and 500 pages.')
      }

      if (!topic) {
        throw new Error('Please provide a writing topic.')
      }

      const job = await startWritingJob(
        topic,
        pages,
        conversationId
      )

      
if (!job) {
  throw new Error('Unable to start long-form writing.')
}

// Update the title of a writing-only conversation.
const currentConversation = conversations.find(
  (item) =>
    String(item.conversationId) === String(conversationId)
)

if (
  !currentConversation ||
  currentConversation.title === 'New Chat'
) {
  const title = `Writing - ${topic}`.slice(0, 200)

  try {
    const titleResponse = await fetch(
      `http://localhost:8080/api/conversations/${conversationId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    )

    if (!titleResponse.ok) {
      throw new Error(
        `Title update failed (${titleResponse.status})`
      )
    }

    setConversations((current) =>
      current.map((item) =>
        String(item.conversationId) === String(conversationId)
          ? { ...item, title }
          : item
      )
    )
  } catch (error) {
    console.error('Writing title update failed:', error)
    setNotice('Writing started, but title could not be updated.')
    return
  }
}

setNotice('')
return

    }



  // try {





const isImageUpload =

  filesToSend.length === 1 &&

  /\.(jpg|jpeg|png|webp)$/i.test(filesToSend[0].name)



const isDocumentUpload =

  filesToSend.length > 0 && !isImageUpload

  console.log('Enablr AI Upload Debug:', {

  filesToSend: filesToSend.map(file => ({

    name: file.name,

    type: file.type,

    size: file.size

  })),

  isImageUpload,

  isDocumentUpload

})



if (isDocumentUpload && filesToSend.length !== 1) {

  throw new Error('Please attach only one document at a time.')

}



if (

  isDocumentUpload &&

  !/\.(pdf|docx|txt|csv)$/i.test(filesToSend[0].name)

) {

  throw new Error('Only PDF, DOCX, TXT and CSV files are supported right now.')

}

if (isImageUpload && filesToSend[0].size > 4 * 1024 * 1024) {

  throw new Error('Image must not exceed 4 MB.')

}



let response



if (isImageUpload) {

  const formData = new FormData()



  formData.append('file', filesToSend[0])

  formData.append('question', content)



  response = await fetch(

   `http://localhost:8080/api/conversations/${conversationId}/images/ask`,

    {

      method: 'POST',

      headers: {

        Authorization: `Bearer ${auth.token}`,

      },

      body: formData,

    }

  )

} else if (isDocumentUpload) {

  const formData = new FormData()



  formData.append('file', filesToSend[0])

  formData.append('question', content)



  response = await fetch(

    `http://localhost:8080/api/conversations/${conversationId}/attachments/ask`,

    {

      method: 'POST',

      headers: {

        Authorization: `Bearer ${auth.token}`,

      },

      body: formData,

    }

  )





} else if (imageFollowUpMode && content) {



  response = await fetch(

    `http://localhost:8080/api/conversations/${conversationId}/images/follow-up`,

    {

      method: 'POST',

      headers: {

        Authorization: `Bearer ${auth.token}`,

        'Content-Type': 'application/json',

      },

      body: JSON.stringify({ content }),

    }

  )



} else {



  response = await fetch(

    `http://localhost:8080/api/conversations/${conversationId}/messages`,

    {

      method: 'POST',

      headers: {

        Authorization: `Bearer ${auth.token}`,

        'Content-Type': 'application/json',

      },

      body: JSON.stringify({ content }),

    }

  )



}









    if (!response.ok) {



      throw new Error(`Failed to send message (${response.status})`)



    }







    // The backend returns the AI message.

    if (isImageUpload) {

  setImageFollowUpMode(true)

}



    await response.json()

    setSelectedFiles([])







    // Reload both saved user and AI messages from Oracle.



    // This prevents the user message from appearing twice.







if (activeConversationIdRef.current === conversationId) {



  await openConversation(conversationId)







  // Reload conversation titles from Spring Boot.



  const conversationsResponse = await fetch(



    'http://localhost:8080/api/conversations',



    {



      method: 'GET',



      headers: {



        Authorization: `Bearer ${auth.token}`,



        Accept: 'application/json',



      },



    }



  )







  if (!conversationsResponse.ok) {



    throw new Error('Failed to refresh conversation titles')



  }







  const updatedConversations = await conversationsResponse.json()







  setConversations(updatedConversations)







  setInput('')



  setNotice('')



}







  } catch (error) {



    console.error('Error sending message:', error)



    setNotice(



      error.message ||



      'Unable to send message. Please try again.'



    )



  } finally {



    setSendingMessage(false)



  }



}











  function handleKeyDown(event) {



    if (event.key === 'Enter' && !event.shiftKey) {



      event.preventDefault()



      sendMessage(event)



    }



  }







  async function copyChatMessage(message) {
    const text = String(message.content || '').replace(SAVED_IMAGE_MARKER, '').trim()
    if (!text) {
      setNotice('This message has no text to copy.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Message copied to clipboard.')
    } catch (error) {
      console.error('Copy message failed:', error)
      setNotice('Could not copy message. Please allow clipboard access.')
    }
  }

  function handleChatPaste(event) {
    const clipboardItems = Array.from(event.clipboardData?.items || [])
    const imageItem = clipboardItems.find(
      (item) => item.kind === 'file' && /^image\/(png|jpeg|webp)$/i.test(item.type)
    )

    // Keep normal text copy/paste working as usual.
    if (!imageItem) return

    event.preventDefault()
    const image = imageItem.getAsFile()
    if (!image) {
      setNotice('Unable to read the pasted image. Please try again.')
      return
    }
    if (image.size > 4 * 1024 * 1024) {
      setNotice('Image must not exceed 4 MB.')
      return
    }

    // The existing image-question API supports one image per request.
    const extension = image.type === 'image/jpeg' ? 'jpg' :
      image.type === 'image/webp' ? 'webp' : 'png'
    const pastedFile = new File([image], `pasted-image-${Date.now()}.${extension}`, {
      type: image.type,
      lastModified: Date.now()
    })
    setSelectedFiles([pastedFile])
    setImageFollowUpMode(false)
    setNotice('Image pasted. Add a question and press Send.')
  }

  function handleChatDragOver(event) {
    // Allow files to be dropped into the chat composer instead of opening in the browser.
    if (Array.from(event.dataTransfer?.types || []).includes('Files')) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleChatDrop(event) {
    event.preventDefault()
    const files = Array.from(event.dataTransfer?.files || [])
    if (!files.length) return

    // Image questions currently support exactly one image, up to 4 MB.
    if (files.length !== 1 || !/\.(png|jpe?g|webp)$/i.test(files[0].name)) {
      setNotice('Drop one PNG, JPG or WebP image at a time.')
      return
    }
    if (files[0].size > 4 * 1024 * 1024) {
      setNotice('Image must not exceed 4 MB.')
      return
    }

    setSelectedFiles([files[0]])
    setImageFollowUpMode(false)
    setNotice('Image attached. Add a question and press Send.')
  }

  function handleFiles(event) {



    const files = Array.from(event.target.files || [])



    if (files.length) {



      setSelectedFiles((current) => [...current, ...files])



      setNotice(`${files.length} file${files.length === 1 ? '' : 's'} selected. Press Send to upload.`)



    }



    event.target.value = ''



  }







  function toggleMicrophone() {



    if (isListening) {



      recognitionRef.current?.stop()



      setIsListening(false)



      return



    }







    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition



    if (!SpeechRecognition) {



      setNotice('Voice input is not supported by this browser. You can type your message instead.')



      return



    }







    const recognition = new SpeechRecognition()



    recognition.lang = 'en-IN'



    recognition.interimResults = true



    recognition.continuous = false



    recognitionRef.current = recognition



    recognition.onresult = (event) => {



      const transcript = Array.from(event.results)



        .map((result) => result[0].transcript)



        .join('')



      setInput(transcript)



    }



    recognition.onerror = () => {



      setNotice('Voice input stopped. You can try again or type your message.')



      setIsListening(false)



    }



    recognition.onend = () => setIsListening(false)



    recognition.start()



    setIsListening(true)



    setNotice('Listening… speak clearly into your microphone.')



  }







  const hasContent = input.trim().length > 0 || selectedFiles.length > 0



  const currentChatTitle = messages.length



    ? messages[0].content.replace(/\s+/g, ' ').slice(0, 34) || 'New conversation'



    : null



  const recentChats = conversations



 
if (!auth) {

if (authPage === 'reset-password') {
  return (
    <ResetPassword
      onBackToLogin={() => {
        window.history.replaceState({}, '', '/')
        setAuthPage('login')
      }}
    />
  )
}

  if (authPage === 'signup') {
    return (
      <Signup
        onBackToLogin={(success) => {
          setSignupSuccess(success)
          setAuthPage('login')
        }}
      />
    )
  }

  if (authPage === 'forgot-password') {
    return (
      <ForgotPassword
        onBackToLogin={() => {
          setAuthPage('login')
        }}
      />
    )
  }

  return (
    <Login
      onLogin={(data) => {
        setAssessmentView(null)
        if (isAuthSessionValid(data)) {
          try {
            sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
          } catch (error) {
            console.warn('Unable to save login session:', error)
          }
        }
        setAuth(data)
      }}
      onSignup={() => {
        setSignupSuccess(false)
        setAuthPage('signup')
      }}
      onForgotPassword={() => {
        setSignupSuccess(false)
        setAuthPage('forgot-password')
      }}
      signupSuccess={signupSuccess}
    />
  )
}


async function openAccessibilityConversation(conversationId) {

  setSettingsView(false)
    setHelpView(false)

  if (!auth?.token) return



  setNotice('')

  setMessagesLoading(true)



  try {

    const response = await fetch(

      `http://localhost:8080/api/conversations/${conversationId}/accessibility-scan`,

      {

        method: 'GET',

        headers: {

          Authorization: `Bearer ${auth.token}`,

          Accept: 'application/json'

        }

      }

    )



    if (!response.ok) {

      throw new Error(

        `Could not load accessibility report (${response.status})`

      )

    }



    const savedScan = await response.json()



    activeConversationIdRef.current = conversationId

    setActiveConversationId(conversationId)

    setSavedAccessibilityScan(savedScan)

    setAccessibilityView(true)

    setAssessmentView(null)

    setMessages([])

  } catch (error) {

    console.error('Accessibility report load failed:', error)

    setNotice(error.message || 'Unable to open report.')

  } finally {

    setMessagesLoading(false)

  }

}





async function openConversation(conversationId) {

  setGeneratedImage(null)
setGeneratingImage(false)
setImageGenerationError('')


   setAccessibilityView(false)

setSavedAccessibilityScan(null)

setAssessmentView(null)

  activeConversationIdRef.current = conversationId



  setActiveConversationId(conversationId)
  setWritingJob(null)
setWritingParts([])
setWritingError('')

void loadWritingHistory(conversationId)



  setMessages([])



  setMessagesLoading(true)



  setNotice('')







  try {


  

    const response = await fetch(



      `http://localhost:8080/api/conversations/${conversationId}/messages`,



      {



        method: 'GET',



        headers: {



          Authorization: `Bearer ${auth.token}`,



          Accept: 'application/json',



        },



      }



    )







    if (!response.ok) {



      throw new Error(



        `Failed to load messages (${response.status})`



      )



    }







    const data = await response.json()

  



const imageCheckResponse = await fetch(

  `http://localhost:8080/api/conversations/${conversationId}/images/exists`,

  {

    method: 'GET',

    headers: {

      Authorization: `Bearer ${auth.token}`,

      Accept: 'application/json',

    },

  }

)



if (!imageCheckResponse.ok) {

  throw new Error(

    `Failed to check saved image (${imageCheckResponse.status})`

  )

}



const hasSavedImage = await imageCheckResponse.json()



if (activeConversationIdRef.current !== conversationId) {

  return

}



const hasUploadedImage = data.some(
  (message) =>
    String(message.role).toUpperCase() === 'USER' &&
    /^\[Attached image ID:\s*\d+\]/.test(
      String(message.content || '')
    )
)

setImageFollowUpMode(hasUploadedImage)









    // Ignore results from conversations no longer selected.



    if (activeConversationIdRef.current !== conversationId) {



      return



    }

    
setMessages(
  data.map((message) => ({
    id: message.messageId,
    role: /^\[Generated image ID:\s*\d+\]/.test(
      String(message.content || '')
    )
      ? 'assistant'
      : message.role,
    content: message.content,
  }))
)



  } catch (error) {



    if (activeConversationIdRef.current === conversationId) {



      console.error('Error loading messages:', error)



      setNotice(error.message || 'Unable to load messages.')



    }



  } finally {



    if (activeConversationIdRef.current === conversationId) {



      setMessagesLoading(false)



    }



  }



}











async function renameChat(conversation) {





 const title = renameTitle.trim()







  if (!title) {



    setNotice('Conversation title cannot be empty.')



    return



  }







  if (title.length > 200) {



    setNotice('Conversation title cannot exceed 200 characters.')



    return



  }







  if (title === conversation.title) return







  try {



    const response = await fetch(



      `http://localhost:8080/api/conversations/${conversation.conversationId}`,



      {



        method: 'PUT',



        headers: {



          Authorization: `Bearer ${auth.token}`,



          'Content-Type': 'application/json',



        },



        body: JSON.stringify({ title }),



      }



    )







    if (!response.ok) {



      throw new Error(`Failed to rename chat (${response.status})`)



    }







    const updatedConversation = await response.json()







    setConversations((current) =>



      current.map((chat) =>



        chat.conversationId === updatedConversation.conversationId



          ? updatedConversation



          : chat



      )



    )





setChatModal(null)

setRenameTitle('')

    setNotice('Conversation renamed successfully.')



  } catch (error) {



    console.error('Rename chat failed:', error)



    setNotice(error.message || 'Unable to rename conversation.')



  }



}











async function deleteChat(conversation) {





  try {



    const response = await fetch(



      `http://localhost:8080/api/conversations/${conversation.conversationId}`,



      {



        method: 'DELETE',



        headers: {



          Authorization: `Bearer ${auth.token}`,



        },



      }



    )







    if (!response.ok) {



      throw new Error(`Failed to delete chat (${response.status})`)



    }







    setConversations((current) =>



      current.filter(



        (chat) => chat.conversationId !== conversation.conversationId



      )



    )







    if (activeConversationIdRef.current === conversation.conversationId) {



      activeConversationIdRef.current = null



      setActiveConversationId(null)



      setMessages([])



      setInput('')



      setSelectedFiles([])



      setMessagesLoading(false)



    }





setChatModal(null)

    setNotice('Conversation deleted successfully.')



  } catch (error) {



    console.error('Delete chat failed:', error)



    setNotice(error.message || 'Unable to delete conversation.')



  }



}











  // Logout function



  function handleLogout() {
    setLogoutConfirmOpen(false)
    // Reset the Settings screen before the next login.
    setSettingsView(false)
    setHelpView(false)



    setAccessibilityView(false)

setSavedAccessibilityScan(null)



    recognitionRef.current?.stop()







    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (error) {
      console.warn('Unable to clear login session:', error)
    }
    setAuth(null)



    activeConversationIdRef.current = null



 setAssessmentView(null)



    setActiveConversationId(null)



    setConversations([])



    setMessages([])



    setInput('')



    setSelectedFiles([])



    setNotice('')



    setIsListening(false)



  }



  return (





    <div className="app-frame">



      {logoutConfirmOpen && (
        <div className="chat-modal-overlay">
          <div
            className="chat-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <h2 id="logout-modal-title">Confirm Logout</h2>
            <p>Are you sure you want to log out?</p>
            <div className="chat-modal-actions">
              <button
                type="button"
                className="chat-modal-cancel"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chat-modal-confirm"
                onClick={handleLogout}
                autoFocus
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {chatModal && (

        <div className="chat-modal-overlay">

          <div

            className="chat-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="chat-modal-title"

          >

            <h2 id="chat-modal-title">

              {chatModal.type === 'rename'

                ? 'Rename Conversation'

                : 'Delete Conversation'}

            </h2>



            {chatModal.type === 'rename' ? (

              <form

                onSubmit={(event) => {

                  event.preventDefault()

                  renameChat(chatModal.conversation)

                }}

              >

                <p>Enter a new conversation title:</p>



                <input

                  type="text"

                  className="chat-modal-input"

                  value={renameTitle}

                  onChange={(event) =>

                    setRenameTitle(event.target.value)

                  }

                  maxLength={200}

                  required

                  autoFocus

                />



                <div className="chat-modal-actions">

                  <button

                    type="button"

                    className="chat-modal-cancel"

                    onClick={() => setChatModal(null)}

                  >

                    Cancel

                  </button>



                  <button

                    type="submit"

                    className="chat-modal-confirm"

                    disabled={!renameTitle.trim()}

                  >

                    Save Changes

                  </button>

                </div>

              </form>

            ) : (

              <>

                <p>

                  Are you sure you want to delete

                  <strong>

                    {' "' + chatModal.conversation.title + '"'}

                  </strong>

                  ?

                </p>



                <p className="chat-modal-warning">

                  This will permanently delete the

                  conversation and its messages.

                </p>



                <div className="chat-modal-actions">

                  <button

                    type="button"

                    className="chat-modal-cancel"

                    onClick={() => setChatModal(null)}

                  >

                    Cancel

                  </button>



                  <button

                    type="button"

                    className="chat-modal-delete"

                    onClick={() =>

                      deleteChat(chatModal.conversation)

                    }

                  >

                    Delete Conversation

                  </button>

                </div>

              </>

            )}

          </div>

        </div>

      )}



      <aside className="sidebar">



        <div className="logo-wrap">



  
<img
  className="logo-image"
  src="/enablr-ai-logo.png"
  alt="Enablr AI logo"
/>




        </div>







        <button



  className="new-chat"



  type="button"



  onClick={startNewChat}



  disabled={creatingConversation}



>



          <i className="fa-regular fa-comment" aria-hidden="true" />



          <span>New Chat</span>



        </button>







        <section className="recent">



          <div className="section-title">



            <i className="fa-regular fa-clock" aria-hidden="true" />



            Recent



          </div>



          <div className="chat-list">







{conversationsLoading && (



  <p className="chat-item">Loading conversations...</p>



)}







{!conversationsLoading && recentChats.length === 0 && (



  <p className="chat-item">No conversations yet</p>



)}















{recentChats.map((conversation) => (



  <div



    className="chat-row"



    key={conversation.conversationId}



  >



    <button



      className={`chat-item ${



        activeConversationId === conversation.conversationId



          ? 'selected'



          : ''



      }`}



      type="button"





onClick={() => {

  setOpenChatMenuId(null)



  if (conversation.title?.startsWith('Accessibility - ')) {

    openAccessibilityConversation(conversation.conversationId)

  } else {

    openConversation(conversation.conversationId)

  }

}}





    >



      {conversation.title || 'New conversation'}



    </button>







    <div className="chat-menu-wrapper">



      <button



        className="chat-menu-trigger"



        type="button"



        aria-label={`Options for ${conversation.title}`}



        aria-expanded={openChatMenuId === conversation.conversationId}



        onClick={() =>



          setOpenChatMenuId((current) =>



            current === conversation.conversationId



              ? null



              : conversation.conversationId



          )



        }



      >



        <i className="fa-solid fa-ellipsis" aria-hidden="true" />



      </button>







      {openChatMenuId === conversation.conversationId && (



        <div className="chat-dropdown">



          <button



            type="button"





onClick={() => {

  setOpenChatMenuId(null)

  setRenameTitle(conversation.title || '')

  setChatModal({

    type: 'rename',

    conversation: conversation

  })

}}





          >



            <i className="fa-solid fa-pen" aria-hidden="true" />



            Rename



          </button>







          <button



            type="button"



            className="delete-option"





onClick={() => {

  setOpenChatMenuId(null)

  setChatModal({

    type: 'delete',

    conversation: conversation

  })

}}





          >



            <i className="fa-regular fa-trash-can" aria-hidden="true" />



            Delete



          </button>



        </div>



      )}



    </div>



  </div>



))}















            {/* <button className="more" type="button" onClick={() => setNotice('More conversations will appear once the backend is connected.')}>



              More <i className="fa-solid fa-chevron-down" aria-hidden="true" />



            </button> */}



          </div>



        </section>







        <nav className="sidebar-links" aria-label="Sidebar">





<button

  className="sidebar-link"

  type="button"

  onClick={() => {

    setSettingsView(true)
    setHelpView(false)

    setAccessibilityView(false)

    setAssessmentView(null)

    setNotice('')

  }}

>

  <i className="fa-solid fa-gear" aria-hidden="true" />

  Settings

</button>





          <button
  className="sidebar-link"
  type="button"
  onClick={() => {
    setHelpView(true)
    setSettingsView(false)
    setAccessibilityView(false)
    setAssessmentView(null)
    setNotice('')
  }}
>
  <i className="fa-regular fa-circle-question" aria-hidden="true" /> Help &amp; Updates
</button>



        </nav>







        <div className="user-profile">



          <div className="user-info">



  <div className="user-name">{auth.username}</div>



  <div className="email">{auth.email}</div>



</div>



          <button



  className="user-arrow logout-button"



  type="button"



  onClick={() => setLogoutConfirmOpen(true)}



  title="Logout"



  aria-label="Logout"



>



  <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />



</button>



        </div>



      </aside>







      <main className="main-panel">



        <header className="topbar">



         <div className="model">
  Enablr AI
</div>



          {/* <button className="dots" type="button" aria-label="More options" onClick={() => setNotice('More options will be added later.')}>



            <i className="fa-solid fa-ellipsis" aria-hidden="true" />



          </button> */}



        </header>







        <section className={`conversation-area ${messages.length ? 'has-messages' : ''}`}>



          {messagesLoading && (
            <p className="messages-loading">Loading messages...</p>
          )}

         {(helpView ? (
  <div className="settings-page help-page">
    <div className="settings-page-header">
      <h1>Help &amp; Updates</h1>
      <p>Learn how to use Enablr AI and find answers to common questions.</p>
    </div>

    <section className="settings-section">
      <h2>Getting Started</h2>
      <p>Select New Chat, type your question and press Send. Your saved conversations appear under Recent.</p>
    </section>

    <section className="settings-section">
      <h2>Features Guide</h2>
      <div className="help-entry"><strong>AI Chat</strong><p>Ask questions and continue conversations from Recent Chats.</p></div>
      <div className="help-entry"><strong>Generate Assessment</strong><p>Create assessments with selected grades, topics and question types. Export supported results as PDF or DOCX.</p></div>
      <div className="help-entry"><strong>Accessibility Scanner</strong><p>Review supported websites or documents and save reports to Recent Chats.</p></div>
      <div className="help-entry"><strong>Images and Documents</strong><p>Attach an image or supported document to ask questions about its contents.</p></div>
    </section>

    <section className="settings-section">
      <h2>Frequently Asked Questions</h2>
      <div className="help-entry"><strong>Where are my previous chats?</strong><p>Open a conversation from the Recent section in the sidebar.</p></div>
      <div className="help-entry"><strong>How can I rename or delete a chat?</strong><p>Use the three-dot menu beside that conversation in Recent.</p></div>
      <div className="help-entry"><strong>How do I change the theme?</strong><p>Open Settings and select Light or Dark under Appearance.</p></div>
    </section>

    <section className="settings-section">
      <h2>What's New</h2>
      <p>Recent improvements include a Settings page, Light/Dark appearance options and conversation management controls.</p>
    </section>

    <section className="settings-section">
      <h2>Support &amp; Troubleshooting</h2>
      <p>If a request fails, check your connection, verify that the Enablr AI backend is running and try again. For sign-in issues, log out and sign in again.</p>
    </section>

    <button
      type="button"
      className="settings-back-button"
      onClick={() => {
        setHelpView(false)
        setSettingsView(false)
        setAccessibilityView(false)
        setAssessmentView(null)
        setSavedAccessibilityScan(null)
        activeConversationIdRef.current = null
        setActiveConversationId(null)
        setMessages([])
        setInput('')
        setSelectedFiles([])
        setImageFollowUpMode(false)
        setNotice('')
      }}
    >
      <i className="fa-solid fa-arrow-left" aria-hidden="true" />
      Back to Chat
    </button>
  </div>
) : settingsView ? (

  <div className="settings-page">

    <div className="settings-page-header">



      <h1>Settings</h1>

      <p>Manage your Enablr AI preferences and account information.</p>

    </div>



    
<section className="settings-section">

  <h2>Profile Information</h2>

  {!isEditingProfile ? (
    <>
      <div className="settings-detail">
        <span>Username</span>
        <strong>{auth.username}</strong>
      </div>

      <div className="settings-detail">
        <span>Email Address</span>
        <strong>{auth.email}</strong>
      </div>

      <button
        type="button"
        onClick={handleEditProfile}
        className="settings-profile-button"
      >
        Edit Profile
      </button>
    </>
  ) : (
    <form onSubmit={handleSaveProfile} className="settings-profile-form">

      <label htmlFor="profile-username">
        Username
      </label>

      <input
        id="profile-username"
        type="text"
        value={profileUsername}
        onChange={(event) => setProfileUsername(event.target.value)}
        maxLength={100}
        required
        disabled={profileSaving}
      />

      <label htmlFor="profile-email">
        Email Address
      </label>

      <input
        id="profile-email"
        type="email"
        value={profileEmail}
        onChange={(event) => setProfileEmail(event.target.value)}
        required
        disabled={profileSaving}
      />

      <div className="settings-profile-actions">
        <button
          type="submit"
          className="settings-profile-button"
          disabled={profileSaving}
        >
          {profileSaving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          className="settings-profile-cancel"
          onClick={handleCancelProfileEdit}
          disabled={profileSaving}
        >
          Cancel
        </button>
      </div>

    </form>
  )}

</section>




    <section className="settings-section">

      <h2>Appearance</h2>

      {/* <p>Customize how Enablr AI looks.</p> */}



<div className="settings-detail">

  <span>Theme</span>



  <select

    className="settings-theme-select"

    value={theme}

    onChange={(event) => setTheme(event.target.value)}

    aria-label="Choose appearance theme"

  >

    <option value="light">Light</option>

    <option value="dark">Dark</option>

  </select>

</div>



    </section>



    <section className="settings-section">

      <h2>Account</h2>

      <button

        type="button"

        className="settings-logout"

        onClick={() => setLogoutConfirmOpen(true)}

      >

        <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />

        Logout

      </button>

    </section>



<button

  type="button"

  className="settings-back-button"

  onClick={() => {

    setSettingsView(false)
    setHelpView(false)

    setAccessibilityView(false)

    setAssessmentView(null)

    setSavedAccessibilityScan(null)



    activeConversationIdRef.current = null

    setActiveConversationId(null)



    setMessages([])

    setInput('')

    setSelectedFiles([])

    setImageFollowUpMode(false)

    setNotice('')

  }}

>

  <i className="fa-solid fa-arrow-left" aria-hidden="true" />

  Back to Chat

</button>

  </div>

) : accessibilityView ? (



<AccessibilityScanner

  onBack={() => {

    setAccessibilityView(false)

    setSavedAccessibilityScan(null)

  }}

  onScanComplete={handleAccessibilityScanComplete}

  savedScan={savedAccessibilityScan}

/>



) : assessmentView === 'generate' ? (







<GenerateAssessment



  onGenerate={(prompt) => {



    setAssessmentView(null)



    sendMessage(null, prompt)



  }}



  onGenerateFromPdf={generateAssessmentFromPdf}



  onBack={() => setAssessmentView(null)}
  



/>







  ) : messages.length === 0 && !sendingMessage && !generatingImage && !writingJob ? (



    <div className="hero">



              {/* <div className="ai-orb" aria-hidden="true" /> */}



              <div className="logo-wrap">



          
<img
  src="/my-ai-logo.png"
  alt="AI Assistant"
  className="hero-logo"
/>




        </div>



              <h1 className="sr-only">How can I help Today!</h1>



              <p className="hero-subtitle">


<img
  src="/enablr-ai-logo.png"
  alt="Enablr AI"
  className="enablr-center-logo"
/>


                I am your AI. You can ask me to write, code, plan, or explore any idea.



              </p>



              <div className="cards">



                {promptCards.map((card) => (



                  <button className="card" type="button" key={card.title} onClick={() => {



  if (card.title === 'Generate Assessment') {



    activeConversationIdRef.current = null



    setActiveConversationId(null)



    setMessages([])



    setSelectedFiles([])



    setNotice('')



    setAssessmentView('generate')



 } else if (card.title === 'Accessibility') {

  activeConversationIdRef.current = null

  setActiveConversationId(null)

  setSavedAccessibilityScan(null)

  setMessages([])

  setAccessibilityView(true)

  setAssessmentView(null)

  setNotice('')

} else {

  choosePrompt(card.prompt)

}



}}>



                    <span className="card-icon"><i className={card.icon} aria-hidden="true" /></span>



                    <span className="card-title">{card.title}</span>



                  </button>



                ))}



              </div>



            </div>





          ) : (
















<div className="message-list" aria-live="polite">
  {messages.map((message) => (
    <article
      className={`message-row ${message.role?.toLowerCase()}`}
      key={message.id}
    >
      <div className="message-label">
        {message.role?.toLowerCase() === 'user' ? 'You' : 'Enablr AI'}
      </div>

      <div className="message-content">
        {message.role?.toLowerCase() === 'user' ? (
          String(message.content || '').includes(
            'Create ONE combined educational or skills assessment.'
          ) ? (
            <AssessmentRequestSummary content={message.content} />
          ) : (
            <UserChatMessage
              message={message}
              conversationId={activeConversationId}
              token={auth?.token}
            />
          )
        ) : (
          <>
            {String(message.content || '').startsWith('[Generated image ID:') ? (
              <UserChatMessage
                message={message}
                conversationId={activeConversationId}
                token={auth?.token}
              />
            ) : (
              <div id={`assessment-message-${message.id}`}>
                <AssessmentMarkdown content={message.content} />
              </div>
            )}

            {String(message.content || '').includes('Assessment Overview') && (
              <div className="assessment-download-actions">
                <button
                  type="button"
                  className="assessment-pdf-button"
                  onClick={() => downloadAssessmentPDF(message.id)}
                >
                  Download PDF
                </button>

                <button
                  type="button"
                  className="assessment-pdf-button"
                  onClick={() => handleDownloadDOCX(message)}
                >
                  Download DOCX
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => copyChatMessage(message)}
        aria-label={`Copy ${message.role?.toLowerCase() === 'user' ? 'your' : 'AI'} message`}
        title="Copy message"
        style={{
          alignSelf: 'flex-start',
          marginTop: '6px',
          padding: '4px 10px',
          cursor: 'pointer'
        }}
      >
        <i className="fa-regular fa-copy" aria-hidden="true" /> Copy
      </button>
    </article>
  ))}

  {generatingImage && (
    <article className="message-row assistant">
      <div className="message-label">Enablr AI</div>
      <div className="message-content">
        <p className="image-generation-status" role="status">
          <span
            className="image-generation-spinner"
            aria-hidden="true"
          />
          Enablr AI is generating image...
        </p>
      </div>
    </article>
  )}




{writingJob && activeConversationId && (
  <article className="message-row assistant">
    <div className="message-label">Enablr AI — Long Writing</div>

    <div className="message-content">
      <h3>{writingJob.topic || 'Long-Form Writing'}</h3>

      <p>
        <strong>Status:</strong> {writingJob.status || 'PENDING'}
      </p>

      <p>
        <strong>Generated Words:</strong>{' '}
        {writingJob.generatedWords ?? 0}
      </p>

      {writingJob.status === 'RUNNING' && (
        <p role="status">Generating your document...</p>
      )}

      {writingJob.status === 'PAUSED' && (
        <p>Writing paused. Resume support will be added next.</p>
      )}

      {writingJob.status === 'FAILED' && (
        <p>Writing generation failed.</p>
      )}

      {writingLoading && <p>Loading writing job...</p>}

      {writingError && (
        <p role="alert">{writingError}</p>
      )}

      {writingParts.map((part, index) => (
        <div
          className="writing-part"
          key={`${writingJob.jobId}-${part.partNumber ?? index}`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {part.content || ''}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  </article>
)}

  {sendingMessage && (
    <article className="message-row assistant enablr-chat-loading" role="status" aria-live="polite">
      <div className="message-label">Enablr AI</div>
      <div className="message-content">
        <div className="enablr-loading-text" aria-label="Enablr AI is generating a response">
          {'LOADING...'.split('').map((letter, index) => (
            <span key={index} aria-hidden="true" style={{ animationDelay: `${index * 0.15}s` }}>
              {letter}
            </span>
          ))}
        </div>
      </div>
    </article>
  )}
  
{imageGenerationError && (
  <p className="generated-image-error" role="alert">
    {imageGenerationError}
  </p>
)}

</div>
))}
</section>






{!accessibilityView && !settingsView && !helpView && (

  <form className="chat-box" onSubmit={sendMessage} onDragOver={handleChatDragOver} onDrop={handleChatDrop}>



          {selectedFiles.length > 0 && (
  <div className="selected-files">
    {selectedFiles.map((file, index) => {
      const isImage =
        file.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp)$/i.test(file.name)

      return (
        <div className="file-chip" key={`${file.name}-${index}`}>
          {isImage ? (
            <SelectedImagePreview file={file} />
          ) : (
            <i className="fa-regular fa-file" aria-hidden="true" />
          )}

          <span className="selected-file-name">{file.name}</span>

          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={() =>
              setSelectedFiles((current) =>
                current.filter((_, i) => i !== index)
              )
            }
          >
            ×
          </button>
        </div>
      )
    })}
  </div>
)}

          <textarea



            ref={textareaRef}



            className="message-input"



            value={input}



            onChange={(event) => setInput(event.target.value)}



            onKeyDown={handleKeyDown}
            onPaste={handleChatPaste}



            placeholder="How can I help Today!"



            rows={1}



            aria-label="Write your message"

          />



          <div className="input-bottom">



            <div className="input-tools">



              <button className="tool-btn" type="button" onClick={() => fileInputRef.current?.click()}>



                <i className="fa-solid fa-paperclip" aria-hidden="true" /> <span>Files</span>



              </button>



              <button className="tool-btn" type="button" onClick={() => imageInputRef.current?.click()}>



                <i className="fa-regular fa-image" aria-hidden="true" /> <span>Images</span>



              </button>



            </div>



            <button className={`mic ${isListening ? 'listening' : ''}`} type="button" onClick={toggleMicrophone} aria-label={isListening ? 'Stop voice input' : 'Start voice input'} title={isListening ? 'Stop listening' : 'Voice input'}>



              <i className="fa-solid fa-microphone" aria-hidden="true" />



            </button>



            <button



  className="send"



  type="submit"



 disabled={

  sendingMessage ||

  (!input.trim() && selectedFiles.length === 0)

}



  aria-label="Send message"



  title="Send message"



>



              <i className="fa-solid fa-paper-plane" aria-hidden="true" />



            </button>



          </div>



          <input ref={fileInputRef} className="hidden-input" type="file" multiple onChange={handleFiles} />



          <input ref={imageInputRef} className="hidden-input" type="file" accept="image/*" multiple onChange={handleFiles} />



        </form>

        )}



        {notice && (



          <div className="bottom-note" role="status">



            {notice}



          </div>



        )}



      </main>



    </div>



  )



}







export default App
