
import { useState } from 'react'
import './Assessment.css'

function KnowledgeSkillsAssessment({ onGenerate, onBack }) {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [questionType, setQuestionType] = useState('Mixed')
  const [questionCount, setQuestionCount] = useState(10)
  const [instructions, setInstructions] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const prompt = `
Create a structured knowledge and skills assessment.

Topic / Subject: ${topic.trim()}
Target Audience: ${audience.trim()}
Difficulty Level: ${difficulty}
Question Type: ${questionType}
Number of Questions: ${questionCount}

Additional Instructions:
${instructions.trim() || 'None'}

Requirements:
1. Create exactly ${questionCount} questions.
2. Match the requested difficulty and target audience.
3. Number each question clearly.
4. For multiple-choice questions, provide four options (A, B, C, D).
5. Include a separate answer key.
6. Provide a short explanation for each answer.
7. Include marks and scoring guidelines.
8. For practical questions, include evaluation criteria.
9. Avoid duplicate or ambiguous questions.
10. Clearly state any assumptions.
    `.trim()

    onGenerate(prompt)
  }

  return (
    <div className="assessment-form">
      <h2>Knowledge / Skills Assessment</h2>
      <p>Configure the questions you want MY AI to generate.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="skills-topic">Topic / Subject *</label>
        <input
          id="skills-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Java, Selenium, SQL, API Testing"
          required
        />

        <label htmlFor="skills-audience">Target Audience *</label>
        <input
          id="skills-audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. QA Engineers with 2 years of experience"
          required
        />

        <label htmlFor="skills-difficulty">Difficulty Level *</label>
        <select
          id="skills-difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>

        <label htmlFor="skills-question-type">Question Type *</label>
        <select
          id="skills-question-type"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
        >
          <option>Mixed</option>
          <option>Multiple Choice</option>
          <option>Short Answer</option>
          <option>Practical / Coding</option>
        </select>

        <label htmlFor="skills-count">Number of Questions *</label>
        <input
          id="skills-count"
          type="number"
          min="1"
          max="50"
          value={questionCount}
          onChange={(e) => setQuestionCount(e.target.value)}
          required
        />

        <label htmlFor="skills-instructions">
          Additional Instructions (Optional)
        </label>
        <textarea
          id="skills-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Focus on real-world interview scenarios"
          rows={3}
        />

        <div className="assessment-actions">
          <button
            type="button"
            className="assessment-cancel"
            onClick={onBack}
          >
            Back
          </button>

          <button type="submit" className="assessment-generate">
            Generate Assessment
          </button>
        </div>
      </form>
    </div>
  )
}

export default KnowledgeSkillsAssessment
