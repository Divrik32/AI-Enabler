
import { useState } from 'react'
import './Assessment.css'

function SoftwareTestingAssessment({ onGenerate, onBack }) {
  const [projectName, setProjectName] = useState('')
  const [testingType, setTestingType] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [requirements, setRequirements] = useState('')
  const [instructions, setInstructions] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    if (
      !projectName.trim() ||
      !testingType ||
      !moduleName.trim() ||
      !requirements.trim()
    ) {
      return
    }
const testingInstructions = {
  'API Testing': `
Focus ONLY on API testing for the specified module.

Include:
- HTTP method and endpoint validation
- Request payload validation
- Response JSON validation
- Authentication and authorization
- Positive and negative API scenarios
- Missing and invalid request parameters
- Security-related API edge cases

Do not include registration, password reset, or other modules
unless explicitly requested.

Do not assume specific HTTP status codes or response fields.
Mark unspecified behavior as "To be confirmed".
`,

  'Functional Testing': `
Focus on functional workflows, input validation,
business rules, positive tests, and negative tests.
`,

  'Automation Testing': `
Focus on automation candidates, assertions,
test data, framework selection, and maintainability.
`,

  'Performance Testing': `
Focus on response time, throughput, concurrent users,
load conditions, and performance risks.
`,

  'Security Testing': `
Focus on authentication, authorization,
input validation, and sensitive data protection.
`,

  'Accessibility Testing': `
Focus on keyboard navigation, screen readers,
accessible labels, error messages, and WCAG criteria.
`,

  'Regression Testing': `
Focus on critical existing workflows, impacted modules,
regression coverage, and prioritization.
`,
}
    

const prompt = `
Act as a senior QA engineer.

Create a SOFTWARE TESTING ASSESSMENT.

Project: ${projectName.trim()}
Testing Type: ${testingType}
Module: ${moduleName.trim()}

Requirements:
${requirements.trim()}

Additional Instructions:
${instructions.trim() || 'None'}

TESTING FOCUS:
${testingInstructions[testingType]}

RULES:
- The only confirmed requirements are those explicitly
  supplied by the user.
- Testing activities are not confirmed product requirements.
- Identify missing API endpoint, HTTP method, request fields,
  response schema, status codes, and validation rules.
- Do not generate duplicate or overlapping test cases.
- Each test case must test one distinct condition.
- Use meaningful and verifiable expected results.
- If behavior is unspecified, write "To be confirmed".
- Do not assume usernames must be email addresses.
- Do not assume passwords must be numeric.
- Do not invent actual defects, vulnerabilities, or test results.

OUTPUT:

1. Assessment Overview
2. Scope and Objectives
3. Known Requirements, Missing Information and Assumptions
   Clearly separate:
   - Confirmed requirements supplied by the user
   - Missing API specifications
   - Proposed testing assumptions
4. Test Scenarios
   Include ID, description, positive/negative, priority.
5. Detailed Test Cases
   Include ID, preconditions, test data, steps,
   expected result, priority.
   Provide exactly 5 distinct test cases.
   Avoid overlapping test data and scenarios.
   Expected results must be verifiable or marked
   "To be confirmed" where requirements are missing.
6. ${testingType} Validations
7. Edge Cases
8. Risks and Recommendations
9. Assessment Summary

Keep the assessment focused and avoid repetition.
`.trim()


    onGenerate(prompt)
  }

  return (
    <div className="assessment-form">
      <h2>Software Testing Assessment</h2>
      <p>Provide your project details to generate an assessment.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="assessment-project">Project Name *</label>
        <input
          id="assessment-project"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. MY AI Assistant"
          required
        />

        <label htmlFor="assessment-type">Testing Type *</label>
        <select
          id="assessment-type"
          value={testingType}
          onChange={(e) => setTestingType(e.target.value)}
          required
        >
          <option value="">Select testing type</option>
          <option>Functional Testing</option>
          <option>API Testing</option>
          <option>Automation Testing</option>
          <option>Performance Testing</option>
          <option>Security Testing</option>
          <option>Accessibility Testing</option>
          <option>Regression Testing</option>
        </select>

        <label htmlFor="assessment-module">Module / Feature *</label>
        <input
          id="assessment-module"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          placeholder="e.g. Login and Registration"
          required
        />

        <label htmlFor="assessment-requirements">
          Requirements / Description *
        </label>
        <textarea
          id="assessment-requirements"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Describe the feature and its expected behavior..."
          rows={5}
          required
        />

        <label htmlFor="assessment-instructions">
          Additional Instructions (Optional)
        </label>
        <textarea
          id="assessment-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Include boundary values and negative cases"
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

export default SoftwareTestingAssessment
    