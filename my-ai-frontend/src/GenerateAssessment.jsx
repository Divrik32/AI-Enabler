import { useState } from 'react'
import './Assessment.css'

const gradeOptions = [
  'KG',
  ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`),
  'Higher Education',
  'Corporate',
  'Specific / Custom'
]

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const ALLOWED_DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx)$/i

const questionTypeOptions = [
  'Multiple Choice Questions (MCQ)',
  'Matching',
  'Fill in the Blanks',
  'True / False',
  'Short Answer',
  'Long Answer',
  'One Word Answer',
  'Practical / Coding'
]

function GenerateAssessment({
  onGenerate,
  onGenerateFromPdf,
  onBack
}) {
  const [mode, setMode] = useState(null)
  const [documentFile, setDocumentFile] = useState(null)
  const [selectedGrades, setSelectedGrades] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([])
  const [questionDropdownOpen, setQuestionDropdownOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState('')

  function toggleGrade(grade) {
    setSelectedGrades((current) =>
      current.includes(grade)
        ? current.filter((item) => item !== grade)
        : [...current, grade]
    )
    setError('')
  }

  function toggleQuestionType(type) {
    setSelectedQuestionTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    )
    setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (mode === 'pdf') {
      if (!documentFile) {
        setError('Please choose a PDF, DOC or DOCX file.')
        return
      }
      if (!ALLOWED_DOCUMENT_EXTENSIONS.test(documentFile.name)) {
        setError('Only PDF, DOC and DOCX files are supported.')
        return
      }
      if (documentFile.size === 0) {
        setError('The selected document is empty.')
        return
      }
      if (documentFile.size > MAX_DOCUMENT_SIZE) {
        setError('Document must be 10 MB or smaller.')
        return
      }
    }

    if (mode === 'manual' && selectedGrades.length === 0) {
      setError('Please select at least one grade or skill set.')
      return
    }

    if (selectedQuestionTypes.length === 0) {
      setError('Please select at least one question type.')
      return
    }

    const count = Number(questionCount)

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      setError('Please enter a question count between 1 and 50.')
      return
    }

    if (selectedQuestionTypes.length > count) {
      setError('The number of questions must be at least the number of selected question types.')
      return
    }


const prompt = `
Create ONE combined educational or skills assessment.

Selected Grade / Skill Set:
${selectedGrades.join(', ')}

Subject: ${subject.trim()}
Topic: ${topic.trim()}
Question Types: ${selectedQuestionTypes.join(', ')}
Total Number of Questions: ${count}

Additional Requirements:
${instructions.trim() || 'None'}

IMPORTANT ASSESSMENT RULES:

1. Generate exactly ${count} questions TOTAL.
2. Create ONE combined assessment for all selected grades.
3. Do NOT generate separate assessments for each grade.
4. Selected grades represent the intended audience.
5. Every question must be suitable for the lowest selected grade.
6. Do NOT mention individual grades beside questions.
7. Strictly follow the selected subject and topic.
8. Use age-appropriate vocabulary and difficulty.
9. For Mathematics, verify every calculation.
10. If the topic is Addition and Subtraction, use ONLY
    addition and subtraction.
11. Use ONLY the selected question types.
12. Include every selected question type at least once.
13. Distribute questions approximately evenly across types.
14. Number all questions sequentially from 1 to ${count}.
15. Count each matching exercise as ONE question.
16. Avoid duplicate or ambiguous questions.
17. Provide a correct Answer Key and Scoring Guidelines.
18. Do NOT use HTML tags or Markdown tables.
19. Do NOT add grade labels to individual questions.

QUESTION GROUPING RULES:

20. Group questions by question type.
21. Do NOT mix different question types together.
22. Create ONE section heading for each selected question type.
23. Include only sections selected by the user.
24. Follow this section order when those types are selected:

    ## Section A - Multiple Choice Questions (MCQ)
    ## Section B - Matching
    ## Section C - Fill in the Blanks
    ## Section D - True / False
    ## Section E - Short Answer
    ## Section F - Long Answer
    ## Section G - One Word Answer
    ## Section H - Practical / Coding

25. Under each section, include ALL questions of that type.
26. Do NOT write (MCQ), (Matching), (Fill in the Blanks),
    or (True / False) before individual questions.
27. Each question must have only its number and question text.
28. Do NOT restart numbering in each section.
29. Do NOT create empty sections.

MATCHING QUESTION RULES:

30. Every Matching question must contain Column A and Column B.
31. Column A contains questions, expressions, or terms.
32. Column B contains possible answers.
33. Each Column A item must match exactly one unique
    Column B answer.
34. All Column B answers must be distinct.
35. SHUFFLE Column B so correct answers do NOT appear
    directly opposite their corresponding Column A items.
36. NEVER generate an identity answer mapping such as
    1-A, 2-B, 3-C.
37. For a matching question with 3 or more pairs,
    use a non-identity permutation with no correct
    answer in the same row.
38. Verify every matching answer after shuffling.
39. The Answer Key must use the FINAL shuffled
    Column B labels.
40. Do not use Markdown tables for matching questions.

EXACT MATCHING FORMAT EXAMPLE:

**3.** Match each addition problem with its sum.

**Column A**

1. 1 + 2
2. 3 + 2
3. 4 + 3

**Column B**

A) 7
B) 3
C) 5

Correct Answer Key:
3. 1-B, 2-C, 3-A

This is only an example.
Generate questions using the actual selected topic.

MCQ RULES:

41. Every MCQ must contain clear answer options.
42. Use a), b), c), d) for options.
43. Place each option on a separate line.
44. Only one option should be correct.
45. Keep options compact without unnecessary blank lines.

OTHER QUESTION RULES:

46. Fill in the Blanks must include a visible blank.
47. True / False must contain a clear statement.
48. Short Answer questions must have concise expected answers.
49. Long Answer questions must have suitable model answers.
50. Practical / Coding questions must have appropriate solutions.
51. For primary-school English poem assessments,
    provide a short age-appropriate poem before the questions.

OUTPUT FORMAT:

## Assessment Overview
- Subject
- Topic
- Total Questions
- Question Types

## Questions

Use the section headings described above.
Number all questions sequentially.

## Answer Key

Provide correct answers for all ${count} questions.
For Matching, use correct shuffled mappings.
Verify all answers against the actual questions.

## Scoring Guidelines

State the total marks and explain how marks are awarded.

FINAL VALIDATION:

- Exactly ${count} numbered questions.
- Every selected question type is included.
- Questions are grouped under section headings.
- No individual question type labels.
- Matching answers are shuffled and correct.
- No incorrect or duplicate matching answers.
- Answer Key matches every question.
- Clean Markdown formatting.
- No HTML tags.
- No Markdown tables.
`.trim()
    setError('')

if (mode === 'pdf') {
  onGenerateFromPdf({
    file: documentFile,
    questionTypes: selectedQuestionTypes,
    questionCount: count,
    instructions: instructions
  })
  return
}

onGenerate(prompt)
  }

  if (mode === null) {
    return (
      <div className="assessment-selection assessment-mode-picker">
        <h2>Generate Assessment</h2>
        <p>Choose how you want to create your assessment.</p>
        <div className="assessment-mode-grid">
          <button type="button" onClick={() => { setMode('manual'); setError('') }}>
            <span className="assessment-mode-icon">✎</span>
            <strong>Generate through AI</strong>
            <span>Select subject, topic, grades and question types.</span>
          </button>
          <button type="button" onClick={() => { setMode('pdf'); setError('') }}>
            <span className="assessment-mode-icon">▤</span>
            <strong>Generate through PDF / DOC / DOCX</strong>
            <span>Generate questions based on an uploaded PDF, DOC or DOCX.</span>
          </button>
        </div>
        <div className="assessment-actions">
          <button type="button" className="assessment-cancel" onClick={onBack}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="assessment-form">
      <h2>{mode === 'pdf' ? 'Generate Assessment from Document' : 'Generate Assessment'}</h2>
      <p>{mode === 'pdf' ? 'Upload a PDF, DOC or DOCX file and choose the question types and number of questions.' : 'Select one or more grades or skill sets to create a combined assessment.'}</p>

      <form onSubmit={handleSubmit}>
        {mode === 'pdf' && (
          <>
            <label htmlFor="assessment-pdf-file">Upload PDF / DOC / DOCX *</label>
            <input
              id="assessment-pdf-file"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                setDocumentFile(event.target.files?.[0] || null)
                setError('')
              }}
              required
            />
            {documentFile && <p className="assessment-file-name">Selected: {documentFile.name}</p>}
          </>
        )}
        {/* Grade selection stays unchanged for Create Manually only. */}
        {mode === 'manual' && (
          <>
        <label>Grade / Skill Set *</label>
        <div className="grade-multiselect">
          <button
            type="button"
            className="grade-dropdown-trigger"
            aria-expanded={dropdownOpen}
            onClick={() => {
              setDropdownOpen((open) => !open)
              setQuestionDropdownOpen(false)
            }}
          >
            {selectedGrades.length > 0
              ? `${selectedGrades.length} selected`
              : 'Select one or more grades'}
            <span>▾</span>
          </button>

          {dropdownOpen && (
            <div className="grade-dropdown-options">
              {gradeOptions.map((grade) => (
                <label key={grade} className="grade-checkbox-option">
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(grade)}
                    onChange={() => toggleGrade(grade)}
                  />
                  <span>{grade}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedGrades.length > 0 && (
          <div className="selected-grades">
            {selectedGrades.map((grade) => (
              <span className="grade-tag" key={grade}>
                {grade}
                <button type="button" aria-label={`Remove ${grade}`} onClick={() => toggleGrade(grade)}>
                  ×
                </button>
              </span>
            ))}
            <button type="button" className="grade-clear" onClick={() => setSelectedGrades([])}>
              Clear All
            </button>
          </div>
        )}

          </>
        )}

        <label>Question Type *</label>
        <div className="grade-multiselect">
          <button
            type="button"
            className="grade-dropdown-trigger"
            aria-expanded={questionDropdownOpen}
            onClick={() => {
              setQuestionDropdownOpen((open) => !open)
              setDropdownOpen(false)
            }}
          >
            {selectedQuestionTypes.length > 0
              ? `${selectedQuestionTypes.length} selected`
              : 'Select one or more question types'}
            <span>▾</span>
          </button>

          {questionDropdownOpen && (
            <div className="grade-dropdown-options">
              {questionTypeOptions.map((type) => (
                <label key={type} className="grade-checkbox-option">
                  <input
                    type="checkbox"
                    checked={selectedQuestionTypes.includes(type)}
                    onChange={() => toggleQuestionType(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedQuestionTypes.length > 0 && (
          <div className="selected-grades">
            {selectedQuestionTypes.map((type) => (
              <span className="grade-tag" key={type}>
                {type}
                <button type="button" aria-label={`Remove ${type}`} onClick={() => toggleQuestionType(type)}>
                  ×
                </button>
              </span>
            ))}
            <button type="button" className="grade-clear" onClick={() => setSelectedQuestionTypes([])}>
              Clear All
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <>
        <label htmlFor="assessment-subject">Subject / Skill Area *</label>
        <input
          id="assessment-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. Mathematics, Java, Communication"
          required
        />

        <label htmlFor="assessment-topic">Topic *</label>
        <input
          id="assessment-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. Addition, OOP, Leadership"
          required
        />

          </>
        )}

        <label htmlFor="assessment-count">Total Number of Questions *</label>
        <input
          id="assessment-count"
          type="number"
          min="1"
          max="50"
          value={questionCount}
          onChange={(event) => setQuestionCount(event.target.value)}
          required
        />

        <label htmlFor="assessment-instructions">Additional Requirements (Optional)</label>
        <textarea
          id="assessment-instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="e.g. Include real-world examples"
          rows={3}
        />

        {error && <p role="alert" className="assessment-error">{error}</p>}

        <div className="assessment-actions">
          <button type="button" className="assessment-cancel" onClick={() => { setMode(null); setError('') }}>
            Back
          </button>
          <button type="submit" className="assessment-generate">
            {mode === 'pdf' ? 'Generate from Document' : 'Generate Assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default GenerateAssessment
