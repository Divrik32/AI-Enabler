
const WCAG_TAG_PATTERN = /^wcag(\d)(\d)(\d+)$/i;

function getCriteria(rule) {
  return [...new Set(
    (rule.tags || [])
      .map(tag => {
        const match = tag.match(WCAG_TAG_PATTERN);
        if (!match) return null;

        return `${match[1]}.${match[2]}.${Number(match[3])}`;
      })
      .filter(Boolean)
  )];
}

export function createVpatEvidence(scanResult) {
  const criteria = new Map();

  function addRules(rules, category) {
    for (const rule of rules || []) {
      for (const criterion of getCriteria(rule)) {
        if (!criteria.has(criterion)) {
          criteria.set(criterion, {
            criterion,
            conformanceLevel: "Not Evaluated",
            violations: [],
            passedChecks: [],
            manualReview: [],
            remarks: ""
          });
        }

        const item = criteria.get(criterion);

        const evidence = {
          ruleId: rule.id,
          description: rule.help || rule.description,
          impact: rule.impact || null,
          affectedElements: rule.nodes?.length || 0,
          helpUrl: rule.helpUrl || null
        };

        if (category === "violations") {
          item.violations.push(evidence);
        } else if (category === "passes") {
          item.passedChecks.push(evidence);
        } else {
          item.manualReview.push(evidence);
        }
      }
    }
  }

  addRules(scanResult.violations, "violations");
  addRules(scanResult.passes, "passes");
  addRules(scanResult.incomplete, "incomplete");

  const rows = [...criteria.values()]
    .sort((a, b) =>
      a.criterion.localeCompare(b.criterion, undefined, {
        numeric: true
      })
    )
    .map(item => {
      if (item.violations.length > 0) {
        item.remarks =
          "Automated accessibility violations detected. " +
          "Review the evidence and determine conformance.";
      } else if (item.manualReview.length > 0) {
        item.remarks =
          "Automated checks require additional review.";
      } else {
        item.remarks =
          "No violation detected by the executed automated checks. " +
          "Manual verification is still required.";
      }

      return item;
    });

  return {
    standard: "WCAG 2.2 AA",
    reportType: "VPAT-style evidence draft",
    criteria: rows,
    note:
      "This is automated testing evidence, not a completed VPAT/ACR. " +
      "Conformance must be determined through additional manual testing."
  };
}
