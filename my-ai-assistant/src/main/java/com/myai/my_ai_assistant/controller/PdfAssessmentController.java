
package com.myai.my_ai_assistant.controller;

import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionTemplate;
import com.myai.my_ai_assistant.Service.ConversationService;
import com.myai.my_ai_assistant.Service.MessageService;
import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.repository.UserRepository;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.myai.my_ai_assistant.Service.PdfAssessmentService;
import com.myai.my_ai_assistant.ai.AiRequest;
import com.myai.my_ai_assistant.ai.AiService;

@RestController
@RequestMapping("/api/assessments")
public class PdfAssessmentController {

    private final PdfAssessmentService pdfAssessmentService;
    private final AiService aiService;
    private final ConversationService conversationService;
    private final MessageService messageService;
    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;

    public record PdfAssessmentResult(Long conversationId, String assessment) {}


    private static final Pattern QUESTION_PATTERN =
        Pattern.compile("(?m)^\\s*\\*\\*(\\d+)\\.\\*\\*\\s+\\S");

    public PdfAssessmentController(
            PdfAssessmentService pdfAssessmentService,
            AiService aiService,
            ConversationService conversationService,
            MessageService messageService,
            UserRepository userRepository,
            TransactionTemplate transactionTemplate) {
        this.pdfAssessmentService = pdfAssessmentService;
        this.aiService = aiService;
        this.conversationService = conversationService;
        this.messageService = messageService;
        this.userRepository = userRepository;
        this.transactionTemplate = transactionTemplate;
    }

    @PostMapping(
        value = "/generate-from-pdf",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<PdfAssessmentResult> generateFromPdf(
        @RequestPart("file") MultipartFile file,
        @RequestParam("questionTypes") List<String> questionTypes,
        @RequestParam("questionCount") int questionCount,
        @RequestParam(value = "instructions",
                      required = false,
                      defaultValue = "") String instructions,
        Authentication authentication
    ) {

        if (questionTypes == null || questionTypes.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Select at least one question type."
            );
        }

        if (questionCount < 1 || questionCount > 50) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Question count must be between 1 and 50."
            );
        }

        if (questionTypes.size() > questionCount) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Question count must be at least the number of selected types."
            );
        }

        String pdfText = pdfAssessmentService.extractDocumentText(file);

        if (pdfText == null || pdfText.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No readable text found in the uploaded document."
            );
        }

        int MAX_PDF_TEXT_LENGTH = 18000;

        if (pdfText.length() > MAX_PDF_TEXT_LENGTH) {
            System.out.println(
                "PDF ASSESSMENT | Large document detected: "
                + pdfText.length()
                + " characters. Using first "
                + MAX_PDF_TEXT_LENGTH
                + " characters."
            );

            pdfText = pdfText.substring(0, MAX_PDF_TEXT_LENGTH);
        }

        String prompt = """
            Create ONE educational assessment based ONLY on
            the following uploaded PDF content.

            PDF CONTENT:
            %s

            SELECTED QUESTION TYPES:
            %s

            TOTAL QUESTIONS:
            %d

            ADDITIONAL REQUIREMENTS:
            %s

            CRITICAL QUESTION COUNT RULES:

            1. Generate EXACTLY %d top-level questions.
            2. Number questions sequentially from 1 to %d.
            3. Every top-level question MUST start with:
               **1.** Question text
               **2.** Question text
               and so on.
            4. Never skip, duplicate or restart question numbers.
            5. A complete Matching exercise counts as ONE question.
            6. Column A items are NOT additional questions.
            7. Every selected question type must appear at least once.
            8. Use ONLY selected question types.
            9. Group questions by type.
            10. Use ONLY information supported by the PDF.

            REQUIRED SECTION ORDER:

            ## Section A - Multiple Choice Questions (MCQ)
            ## Section B - Matching
            ## Section C - Fill in the Blanks
            ## Section D - True / False
            ## Section E - Short Answer
            ## Section F - Long Answer
            ## Section G - One Word Answer
            ## Section H - Practical / Coding

            Include ONLY sections corresponding to selected types.

            MATCHING FORMAT — STRICTLY REQUIRED:

            Every Matching exercise MUST have a top-level
            question number.

            Use this exact structural format:

            ## Section B - Matching

            **5.** Match the following items correctly.

            **Column A**

            1. First item
            2. Second item
            3. Third item

            **Column B**

            A) Answer for third item
            B) Answer for first item
            C) Answer for second item

            IMPORTANT MATCHING RULES:

            11. Column A uses numbers: 1., 2., 3.
            12. Column B uses letters: A), B), C).
            13. Use exactly one correct match per Column A item.
            14. Column B answers must be unique.
            15. Shuffle Column B.
            16. Never use identity matching such as 1-A, 2-B, 3-C.
            17. For 3 or more pairs, avoid placing any correct
                answer opposite its corresponding Column A item.
            18. Verify all matching pairs after shuffling.
            19. Write the matching answer under the numbered
                question in the Answer Key.
            20. Do NOT use Markdown tables.
            21. Write exactly **Column A** and **Column B**,
                without suffixes such as "(shuffled)".
            22. Put each Column A and Column B entry
                on its own line.
            23. Do not use backslashes for line breaks.

            OTHER QUESTION RULES:

            24. MCQs must have exactly four options:
                a), b), c), d).
            25. Each MCQ has exactly one correct answer.
            26. Fill in the Blanks must have visible blanks.
            27. True / False must have unambiguous statements.
            28. Short and Long Answers need correct model answers.
            29. Do not invent facts not present in the PDF.
            30. Do not include empty sections.

            OUTPUT FORMAT:

            ## Assessment Overview

            State the topic, total number of questions,
            and selected question types.

            ## Questions

            Use the required section headings.
            Every question must be sequentially numbered
            using bold numbering: **1.**, **2.**, etc.

            ## Answer Key

            Provide answers for EVERY numbered question.
            Matching answer format example:

            **5.** 1-B, 2-C, 3-A

            ## Scoring Guidelines

            Explain marks per question and total marks.
            Total marks must equal the sum of allocated marks.

            FINAL VALIDATION BEFORE RESPONDING:

            - Exactly %d numbered top-level questions.
            - Every question has a unique sequential number.
            - Every Matching exercise is numbered.
            - Matching Column A uses numbers.
            - Matching Column B uses letters.
            - Matching Column B is shuffled.
            - Answer Key covers all questions.
            - Marks calculation is correct.
            - No Markdown tables or HTML tags.
            - No backslash line breaks.
            """.formatted(
                pdfText,
                String.join(", ", questionTypes),
                questionCount,
                instructions == null || instructions.isBlank()
                    ? "None" : instructions,
                questionCount,
                questionCount,
                questionCount
            );

        for (int attempt = 1; attempt <= 2; attempt++) {

            System.out.println(
                "PDF ASSESSMENT | Generation attempt: " + attempt
            );

            String assessment =
                aiService.generateResponse(new AiRequest(prompt));

            boolean valid = isValidAssessment(
                assessment,
                questionCount,
                questionTypes
            );

            System.out.println(
                "PDF ASSESSMENT | Attempt: " + attempt
                + " | Response length: " + assessment.length()
                + " | Validation passed: " + valid
            );

            if (valid) {
                if (authentication == null || !authentication.isAuthenticated()) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
                }
                String username = authentication.getName();
                User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

                String fileName = file.getOriginalFilename();
                if (fileName == null || fileName.isBlank()) fileName = "Uploaded PDF";
                fileName = fileName.replaceAll("[\\r\\n\\t]", " ").trim();
                String title = "Document Assessment - " + fileName;
                if (title.length() > 200) title = title.substring(0, 200);
                final String savedTitle = title;
                final String userRequest =
                        "Generate assessment from document: " + fileName;

                Long conversationId = transactionTemplate.execute(status -> {
                    Conversation conversation = conversationService.createConversation(user, savedTitle);
                    messageService.createUserMessage(conversation, userRequest);
                    messageService.createAiMessage(conversation, assessment);
                    return conversation.getConversationId();
                });
                if (conversationId == null) {
                    throw new IllegalStateException("PDF assessment was not saved");
                }
                return ResponseEntity.ok(new PdfAssessmentResult(conversationId, assessment));
            }

            if (attempt == 1) {
                prompt += """

                    IMPORTANT: The generated assessment failed
                    structural validation.

                    Regenerate the COMPLETE assessment.

                    Requirements:
                    - Use exactly the requested number of questions.
                    - Number every top-level question sequentially.
                    - Use **1.**, **2.**, **3.** numbering.
                    - Every Matching exercise counts as ONE question.
                    - Matching must have Column A and Column B.
                    - Answer Key must cover every question.
                    - Preserve all required headings.
                    """;
            }
        }

        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY,
            "AI could not generate a correctly formatted assessment. Please retry."
        );
    }


private boolean isValidAssessment(
        String assessment,
        int expectedCount,
        List<String> questionTypes
) {
    if (assessment == null || assessment.isBlank()) {
        return validationFailed("Empty AI response");
    }

    String text = assessment.replace("\r\n", "\n");

    int questionsStart = text.indexOf("## Questions");
    int answerKeyStart = text.indexOf("## Answer Key");
    int scoringStart = text.indexOf("## Scoring Guidelines");

    if (questionsStart < 0 ||
            answerKeyStart <= questionsStart ||
            scoringStart <= answerKeyStart) {
        return validationFailed(
                "Missing or incorrectly ordered main headings"
        );
    }

    String questions = text.substring(
            questionsStart + "## Questions".length(),
            answerKeyStart
    );

    String answerKey = text.substring(
            answerKeyStart + "## Answer Key".length(),
            scoringStart
    );

    // Accept the existing required **1.** format.
    // Do not accidentally count Column A list items.
    Pattern questionPattern = Pattern.compile(
            "(?m)^\\h*\\*\\*(\\d+)\\.\\*\\*\\h+\\S"
    );

    Matcher questionMatcher = questionPattern.matcher(questions);

    int expectedNumber = 1;

    while (questionMatcher.find()) {
        int actualNumber =
                Integer.parseInt(questionMatcher.group(1));

        if (actualNumber != expectedNumber) {
            return validationFailed(
                    "Question numbering error. Expected " +
                    expectedNumber + ", found " + actualNumber
            );
        }

        expectedNumber++;
    }

    if (expectedNumber - 1 != expectedCount) {
        return validationFailed(
                "Question count mismatch. Expected " +
                expectedCount + ", found " + (expectedNumber - 1)
        );
    }

    // Validate each answer number.
    Matcher answerMatcher = questionPattern.matcher(answerKey);

    int expectedAnswer = 1;

    while (answerMatcher.find()) {
        int actualAnswer =
                Integer.parseInt(answerMatcher.group(1));

        if (actualAnswer != expectedAnswer) {
            return validationFailed(
                    "Answer Key numbering error. Expected " +
                    expectedAnswer + ", found " + actualAnswer
            );
        }

        expectedAnswer++;
    }

    if (expectedAnswer - 1 != expectedCount) {
        return validationFailed(
                "Answer Key count mismatch. Expected " +
                expectedCount + ", found " + (expectedAnswer - 1)
        );
    }

    boolean matchingSelected = questionTypes.stream()
            .anyMatch(type ->
                    type.equalsIgnoreCase("Matching")
            );

    if (matchingSelected) {

    	Pattern sectionPattern = Pattern.compile(
    		    "(?im)^#{2,3}\\h+(?:Section\\h+[A-H]\\h*[-–:]\\h*)?Matching(?:\\h+(?:Questions|Exercise|Exercises))?\\h*$"
    		);

        Matcher sectionMatcher = sectionPattern.matcher(questions);

        if (!sectionMatcher.find()) {
            return validationFailed(
                    "Matching section heading missing"
            );
        }

        int sectionStart = sectionMatcher.end();

        Matcher nextSectionMatcher = Pattern.compile(
        	    "(?im)^#{2,3}\\h+Section\\h+[A-H]\\h*[-–:]"
        	).matcher(questions);

        int sectionEnd = questions.length();

        if (nextSectionMatcher.find(sectionStart)) {
            sectionEnd = nextSectionMatcher.start();
        }

        String matchingSection =
                questions.substring(sectionStart, sectionEnd);

        Matcher matchingQuestionMatcher =
                questionPattern.matcher(matchingSection);

        java.util.List<Integer> starts =
                new java.util.ArrayList<>();

        while (matchingQuestionMatcher.find()) {
            starts.add(matchingQuestionMatcher.start());
        }

        if (starts.isEmpty()) {
            return validationFailed(
                    "Matching question is not numbered"
            );
        }

        for (int i = 0; i < starts.size(); i++) {

            int start = starts.get(i);
            int end = i + 1 < starts.size()
                    ? starts.get(i + 1)
                    : matchingSection.length();

            String block = matchingSection.substring(start, end);

            Matcher columnAMatcher = Pattern.compile(
                    "(?m)^\\h*\\*\\*Column A\\*\\*\\h*$"
            ).matcher(block);

            Matcher columnBMatcher = Pattern.compile(
                    "(?m)^\\h*\\*\\*Column B\\*\\*\\h*$"
            ).matcher(block);

            if (!columnAMatcher.find() ||
                    !columnBMatcher.find() ||
                    columnBMatcher.start() <= columnAMatcher.end()) {

                return validationFailed(
                        "Matching question " + (i + 1) +
                        ": Column A/B headings missing or misplaced"
                );
            }

            String columnA = block.substring(
                    columnAMatcher.end(),
                    columnBMatcher.start()
            );

            String columnB = block.substring(
                    columnBMatcher.end()
            );

            long aItems = columnA.lines()
                    .filter(line -> line.matches(
                            "\\s*\\d+\\.\\s+.+"
                    ))
                    .count();

            long bItems = columnB.lines()
                    .filter(line -> line.matches(
                            "\\s*[A-Z]\\)\\s+.+"
                    ))
                    .count();

            if (aItems < 2 || aItems != bItems) {
                return validationFailed(
                        "Matching question " + (i + 1) +
                        ": Column A items = " + aItems +
                        ", Column B items = " + bItems
                );
            }
        }
    }

    System.out.println(
            "PDF VALIDATION | Passed | Questions: " + expectedCount
    );

    return true;
}

private boolean validationFailed(String reason) {
    System.err.println("PDF VALIDATION FAILED | " + reason);
    return false;
}

}
