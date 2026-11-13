
package com.myai.my_ai_assistant.Service;

import java.util.List;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.myai.my_ai_assistant.ai.AiService;
import com.myai.my_ai_assistant.ai.AiRequest;
import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.WritingJob;
import com.myai.my_ai_assistant.entity.WritingJobStatus;
import com.myai.my_ai_assistant.entity.WritingPart;
import com.myai.my_ai_assistant.repository.WritingJobRepository;
import com.myai.my_ai_assistant.repository.WritingPartRepository;

@Service
public class LongFormWritingService {

    private static final int WORDS_PER_PAGE = 300;
    private static final int WORDS_PER_BATCH = 900;
    private static final int MAX_PAGES = 500;

    private final AiService aiService;
    private final WritingJobRepository jobRepository;
    private final WritingPartRepository partRepository;
    private final WritingStorageService storageService;

    private final AtomicBoolean processing =
            new AtomicBoolean(false);

    public LongFormWritingService(
            AiService aiService,
            WritingJobRepository jobRepository,
            WritingPartRepository partRepository,
            WritingStorageService storageService) {

        this.aiService = aiService;
        this.jobRepository = jobRepository;
        this.partRepository = partRepository;
        this.storageService = storageService;
    }

    public WritingJob startWriting(
            Conversation conversation,
            String topic,
            int pages) {

        if (conversation == null) {
            throw new IllegalArgumentException(
                    "Conversation is required");
        }

        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException(
                    "Writing topic cannot be empty");
        }

        if (pages < 1 || pages > MAX_PAGES) {
            throw new IllegalArgumentException(
                    "Pages must be between 1 and 500");
        }

        WritingJob job = new WritingJob();

        job.setConversation(conversation);
        job.setTopic(topic.trim());
        job.setRequestedPages(pages);
        job.setTargetWords(pages * WORDS_PER_PAGE);
        job.setGeneratedWords(0);
        job.setCompletedParts(0);
        job.setStatus(WritingJobStatus.PENDING);

        return jobRepository.save(job);
    }

    @Scheduled(fixedDelay = 10000)
    public void processWritingJobs() {

        if (!processing.compareAndSet(false, true)) {
            return;
        }

        try {
            List<WritingJob> jobs =
                    jobRepository.findByStatusInOrderByJobIdAsc(
                            List.of(
                                    WritingJobStatus.PENDING,
                                    WritingJobStatus.RUNNING
                            )
                    );

            if (jobs.isEmpty()) {
                return;
            }

            processSingleBatch(jobs.get(0));

        } finally {
            processing.set(false);
        }
    }

    private void processSingleBatch(WritingJob job) {

        Long jobId = job.getJobId();

        try {
            int remainingWords =
                    job.getTargetWords()
                            - job.getGeneratedWords();

            if (remainingWords <= 0) {
                storageService.updateStatus(
                        jobId,
                        WritingJobStatus.COMPLETED,
                        null
                );
                return;
            }

            int requestedWords =
                    Math.min(WORDS_PER_BATCH, remainingWords);

            Optional<WritingPart> lastPart =
                    partRepository
                            .findFirstByWritingJob_JobIdOrderByPartNumberDesc(
                                    jobId
                            );

            int nextPartNumber = lastPart
                    .map(part -> part.getPartNumber() + 1)
                    .orElse(1);

            String previousContext = lastPart
                    .map(WritingPart::getContent)
                    .orElse("");

            if (previousContext.length() > 1500) {
                previousContext = previousContext.substring(
                        previousContext.length() - 1500
                );
            }

            String prompt = buildPrompt(
                    job,
                    nextPartNumber,
                    requestedWords,
                    previousContext
            );

            storageService.updateStatus(
                    jobId,
                    WritingJobStatus.RUNNING,
                    null
            );

            String generatedContent =
                    aiService.generateResponse(
                            new AiRequest(prompt)
                    );

            if (generatedContent == null
                    || generatedContent.isBlank()) {

                throw new IllegalStateException(
                        "Groq returned empty content"
                );
            }

            storageService.savePart(
                    jobId,
                    nextPartNumber,
                    generatedContent
            );

        } catch (Exception exception) {

            storageService.updateStatus(
                    jobId,
                    WritingJobStatus.PAUSED,
                    exception.getMessage()
            );
        }
    }

    private String buildPrompt(
            WritingJob job,
            int partNumber,
            int requestedWords,
            String previousContext) {

        StringBuilder prompt = new StringBuilder();

        prompt.append("""
                You are a professional long-form writer.

                Write high-quality, original, well-structured
                content suitable for a complete book or report.

                IMPORTANT RULES:
                - Generate only the requested next section.
                - Do not restart the document.
                - Maintain continuity with previous content.
                - Use clear headings and paragraphs.
                - Avoid unnecessary repetition.
                - Do not add chatbot introductions.
                - Do not mention that you are an AI.
                - Output only the document content.

                """);

        prompt.append("\nDOCUMENT TOPIC:\n")
                .append(job.getTopic());

        prompt.append("\n\nTOTAL TARGET PAGES: ")
                .append(job.getRequestedPages());

        prompt.append("\nTOTAL TARGET WORDS: ")
                .append(job.getTargetWords());

        prompt.append("\nCURRENT PART NUMBER: ")
                .append(partNumber);

        prompt.append("\nWORDS ALREADY GENERATED: ")
                .append(job.getGeneratedWords());

        prompt.append("\nGENERATE APPROXIMATELY ")
                .append(requestedWords)
                .append(" NEW WORDS.\n");

        if (partNumber == 1) {

            prompt.append("""
                    
                    This is the beginning of the document.
                    Start with an appropriate title and
                    a concise table of contents.
                    Then begin the first section.
                    """);

        } else {

            prompt.append("""
                    
                    Continue the existing document naturally.
                    Do not repeat the title or table of contents.
                    Do not repeat previously written paragraphs.
                    """);

            prompt.append("\nPREVIOUS CONTENT CONTEXT:\n")
                    .append(previousContext);
        }

        return prompt.toString();
    }


public List<WritingJob> getJobsByConversation(Long conversationId) {

    if (conversationId == null) {
        throw new IllegalArgumentException(
                "Conversation ID is required");
    }

    return jobRepository
            .findByConversation_ConversationIdOrderByJobIdDesc(
                    conversationId
            );
}

    public WritingJob getJob(Long jobId) {

        return jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Writing job not found: " + jobId
                        )
                );
    }

    public List<WritingPart> getParts(Long jobId) {

        return partRepository
                .findByWritingJob_JobIdOrderByPartNumberAsc(
                        jobId
                );
    }

    public WritingJob resumeWriting(Long jobId) {

        WritingJob job = getJob(jobId);

        if (job.getStatus() != WritingJobStatus.PAUSED
                && job.getStatus() != WritingJobStatus.FAILED) {

            throw new IllegalStateException(
                    "Only paused or failed jobs can be resumed"
            );
        }

        job.setStatus(WritingJobStatus.PENDING);
        job.setErrorMessage(null);

        return jobRepository.save(job);
    }
}
