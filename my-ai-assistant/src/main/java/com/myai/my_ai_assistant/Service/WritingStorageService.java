
package com.myai.my_ai_assistant.Service;

import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myai.my_ai_assistant.entity.WritingJob;
import com.myai.my_ai_assistant.entity.WritingJobStatus;
import com.myai.my_ai_assistant.entity.WritingPart;
import com.myai.my_ai_assistant.repository.WritingJobRepository;
import com.myai.my_ai_assistant.repository.WritingPartRepository;

@Service
public class WritingStorageService {

    private static final Pattern WORD_SPLITTER =
            Pattern.compile("\\s+");

    private final WritingJobRepository writingJobRepository;
    private final WritingPartRepository writingPartRepository;

    public WritingStorageService(
            WritingJobRepository writingJobRepository,
            WritingPartRepository writingPartRepository) {

        this.writingJobRepository = writingJobRepository;
        this.writingPartRepository = writingPartRepository;
    }

    @Transactional
    public void savePart(
            Long jobId,
            Integer partNumber,
            String content) {

        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException(
                    "Generated content cannot be empty");
        }

        WritingJob job = writingJobRepository
                .findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Writing job not found: " + jobId));

        if (job.getStatus() == WritingJobStatus.COMPLETED) {
            return;
        }

        boolean alreadyExists = writingPartRepository
                .existsByWritingJob_JobIdAndPartNumber(
                        jobId, partNumber);

        if (alreadyExists) {
            return;
        }

        int words = countWords(content);

        WritingPart part = new WritingPart();
        part.setWritingJob(job);
        part.setPartNumber(partNumber);
        part.setContent(content);
        part.setWordCount(words);

        writingPartRepository.save(part);

        job.setGeneratedWords(
                job.getGeneratedWords() + words);

        job.setCompletedParts(
                job.getCompletedParts() + 1);

        if (job.getGeneratedWords() >= job.getTargetWords()) {
            job.setStatus(WritingJobStatus.COMPLETED);
        } else {
            job.setStatus(WritingJobStatus.RUNNING);
        }

        job.setErrorMessage(null);

        writingJobRepository.save(job);
    }

    @Transactional
    public void updateStatus(
            Long jobId,
            WritingJobStatus status,
            String errorMessage) {

        WritingJob job = writingJobRepository
                .findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Writing job not found: " + jobId));

        job.setStatus(status);
        job.setErrorMessage(errorMessage);

        writingJobRepository.save(job);
    }

    public int countWords(String content) {

        if (content == null || content.isBlank()) {
            return 0;
        }

        return WORD_SPLITTER
                .split(content.trim())
                .length;
    }
}
