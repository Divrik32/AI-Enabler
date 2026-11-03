package com.myai.my_ai_assistant.Service;

import java.util.List;
import java.util.Optional;

import com.myai.my_ai_assistant.entity.ConversationImage;
import com.myai.my_ai_assistant.repository.ConversationImageRepository;



import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.Collections;

import com.myai.my_ai_assistant.ai.AiRequest;
import com.myai.my_ai_assistant.ai.AiService;
import com.myai.my_ai_assistant.entity.Conversation;
import com.myai.my_ai_assistant.entity.Message;
import com.myai.my_ai_assistant.entity.MessageRole;
import com.myai.my_ai_assistant.repository.MessageRepository;

import jakarta.persistence.EntityManager;
import com.myai.my_ai_assistant.entity.ConversationDocument;
import com.myai.my_ai_assistant.repository.ConversationDocumentRepository;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;
import java.util.HashSet;
@Service
public class MessageService {

	private final MessageRepository messageRepository;
	private final EntityManager entityManager;
	private final AiService aiService;
	private final ConversationDocumentRepository conversationDocumentRepository;
	private final ConversationImageRepository conversationImageRepository;

private List<String> splitDocumentIntoChunks(String documentText) {
	

    List<String> chunks = new ArrayList<>();

    if (documentText == null || documentText.isBlank()) {
        return chunks;
    }
    

    int chunkSize = 3000;
    int overlap = 300;
    int start = 0;

    while (start < documentText.length()) {

        int end = Math.min(
                start + chunkSize,
                documentText.length()
        );

        chunks.add(documentText.substring(start, end));

        if (end == documentText.length()) {
            break;
        }

        start = end - overlap;
    }

    return chunks;
}



private String findRelevantDocumentChunks(
        String documentText,
        String question) {

    List<String> chunks = splitDocumentIntoChunks(documentText);

    if (chunks.isEmpty()) {
        return "";
    }

    String normalizedQuestion = question == null
            ? ""
            : question.toLowerCase(Locale.ROOT).trim();

    // Preserve existing end-of-document retrieval.
    if (normalizedQuestion.contains("near the end")
            || normalizedQuestion.contains("at the end")
            || normalizedQuestion.contains("last section")
            || normalizedQuestion.contains("final section")
            || normalizedQuestion.contains("final line")
            || normalizedQuestion.contains("last line")
            || normalizedQuestion.contains("ending of")
            || normalizedQuestion.contains("end of the document")) {

        int start = Math.max(0, chunks.size() - 3);

        return String.join(
                "\n\n--- DOCUMENT CHUNK ---\n\n",
                chunks.subList(start, chunks.size())
        );
    }

    Set<String> stopWords = new HashSet<>(Arrays.asList(
            "what", "which", "where", "when", "why", "how",
            "the", "this", "that", "these", "those",
            "is", "are", "was", "were", "do", "does",
            "in", "on", "at", "to", "for", "from",
            "and", "or", "of", "a", "an", "about",
            "explain", "tell", "me", "please",
            "document", "uploaded", "file", "pdf",
            "according", "difference", "between"
    ));

    Set<String> keywords = new HashSet<>();

    for (String word : normalizedQuestion.split("[^\\p{L}\\p{N}]+")) {
        if (word.length() >= 3 && !stopWords.contains(word)) {
            keywords.add(word);
        }
    }

    if (keywords.isEmpty()) {
        return "";
    }

    List<Integer> indexes = new ArrayList<>();

    for (int i = 0; i < chunks.size(); i++) {
        indexes.add(i);
    }

    indexes.sort((a, b) -> {
        long scoreA = scoreDocumentChunk(chunks.get(a), keywords);
        long scoreB = scoreDocumentChunk(chunks.get(b), keywords);

        return Long.compare(scoreB, scoreA);
    });

    List<String> selectedChunks = new ArrayList<>();

    for (int index : indexes) {

        if (selectedChunks.size() >= 3) {
            break;
        }

        String chunk = chunks.get(index);

        if (scoreDocumentChunk(chunk, keywords) > 0) {
            selectedChunks.add(chunk);
        }
    }

    return String.join(
            "\n\n--- DOCUMENT CHUNK ---\n\n",
            selectedChunks
    );
}

private long scoreDocumentChunk(
        String chunk,
        Set<String> keywords) {

    String lowerChunk = chunk.toLowerCase(Locale.ROOT);

    long score = keywords.stream()
            .filter(lowerChunk::contains)
            .count() * 10L;

    // Table of Contents generally contains many dotted page references.
    long dottedLines = Arrays.stream(chunk.split("\\R"))
            .filter(line -> line.matches(".*\\.{5,}.*\\d+\\s*"))
            .count();

    if (dottedLines >= 3) {
        score -= 30;
    }

    // Prefer paragraphs containing explanatory language.
    if (lowerChunk.contains(" is ")
            || lowerChunk.contains(" are ")
            || lowerChunk.contains(" refers to ")
            || lowerChunk.contains(" means ")) {
        score += 5;
    }

    return score;
}


public MessageService(
        MessageRepository messageRepository,
        EntityManager entityManager,
        AiService aiService,
        ConversationDocumentRepository conversationDocumentRepository,
        ConversationImageRepository conversationImageRepository) {

    this.messageRepository = messageRepository;
    this.entityManager = entityManager;
    this.aiService = aiService;
    this.conversationDocumentRepository = conversationDocumentRepository;
    this.conversationImageRepository = conversationImageRepository;
}
	@Transactional
	public Message createUserMessage(Conversation conversation, String content) {

		Message message = new Message();

		message.setConversation(conversation);
		message.setRole(MessageRole.USER);
		message.setContent(content);

		Message savedMessage = messageRepository.save(message);

		entityManager.flush();
		entityManager.refresh(savedMessage);

		return savedMessage;
	}

	public List<Message> getConversationMessages(Conversation conversation) {

		return messageRepository.findByConversationOrderByCreatedDateAscMessageIdAsc(conversation);
	}

	public String generateAiResponse(Conversation conversation, String userMessage) {

		List<Message> history = getConversationMessages(conversation);

		if (history.isEmpty()) {
			throw new IllegalStateException("No messages found in this conversation");
		}

		// The latest message should be the user's current message.
		int currentIndex = history.size() - 1;

		if (history.get(currentIndex).getRole() != MessageRole.USER) {
			throw new IllegalStateException("The latest message must be a user message");
		}

		// Always include the current user message.
		List<Message> selectedMessages = new ArrayList<>();
		selectedMessages.add(history.get(currentIndex));

		// Find up to three earlier complete user-AI exchanges.
		int i = currentIndex - 1;
		int exchanges = 0;

		while (i >= 0 && exchanges < 3) {

			// Find the most recent earlier AI response.
			while (i >= 0 && history.get(i).getRole() != MessageRole.AI) {
				i--;
			}

			if (i < 0) {
				break;
			}

			Message aiMessage = history.get(i);

			// Find the user message associated with that response.
			int userIndex = i - 1;

			while (userIndex >= 0 && history.get(userIndex).getRole() != MessageRole.USER) {
				userIndex--;
			}

			if (userIndex < 0) {
				break;
			}

			selectedMessages.add(aiMessage);
			selectedMessages.add(history.get(userIndex));

			exchanges++;

			// Continue looking before this exchange.
			i = userIndex - 1;
		}

		// We collected messages backwards; restore chronological order.
		Collections.reverse(selectedMessages);

		StringBuilder prompt = new StringBuilder();

		String documentContext = getLatestDocumentContext(conversation, userMessage);

if (!documentContext.isBlank()) {

    prompt.append("""
            You are MY AI, a helpful document assistant.

            The user has uploaded a document in this conversation.

            Instructions:
            - Use the saved document excerpt to answer document-related questions.
            - Use conversation history to understand follow-up questions.
            - For unrelated questions, respond normally.
            - If the requested information is not in the excerpt,
              clearly say it is not available in the provided excerpt.
            - Do not invent document facts.

            Saved document context:
            """);

    prompt.append(documentContext);
    prompt.append("\n\n");
}


		prompt.append("""
				You are a helpful, natural, and concise AI assistant.

				Instructions:
				- Answer the latest user message directly.
				- Use the conversation history to understand context and remember facts.
				- If asked about a fact the user shared, answer it directly.
				- Do not say that the user has asked the same question repeatedly.
				- Do not repeat the question in your answer.
				- Avoid unnecessary greetings, follow-up questions, and filler.
				- Do not invent facts that are not supported by the conversation.
				- Use a longer explanation only when the user asks for one.

				Conversation history:
				""");

		for (Message message : selectedMessages) {

			if (message.getRole() == MessageRole.USER) {
				prompt.append("User: ");
			} else {
				prompt.append("Assistant: ");
			}

			prompt.append(message.getContent());
			prompt.append("\n\n");
		}

		prompt.append("Assistant:");

		AiRequest request = new AiRequest(prompt.toString());

		return aiService.generateResponse(request);
	}

	@Transactional
	public Message createAiMessage(Conversation conversation, String content) {

		Message message = new Message();

		message.setConversation(conversation);
		message.setRole(MessageRole.AI);
		message.setContent(content);

		Message savedMessage = messageRepository.save(message);

		entityManager.flush();
		entityManager.refresh(savedMessage);

		return savedMessage;
	}

@Transactional
public ConversationDocument saveConversationDocument(
        Conversation conversation,
        String fileName,
        String documentText) {

    if (documentText == null || documentText.isBlank()) {
        throw new IllegalArgumentException(
                "Cannot save an empty document."
        );
    }

    ConversationDocument document = new ConversationDocument();

    document.setConversation(conversation);
    document.setFileName(fileName);
    document.setDocumentText(documentText);

    return conversationDocumentRepository.save(document);
}




public String getLatestDocumentContext(
        Conversation conversation,
        String question) {

    List<ConversationDocument> documents =
            conversationDocumentRepository
                    .findByConversationOrderByDocumentIdDesc(conversation);

    if (documents.isEmpty()) {
        return "";
    }

    StringBuilder context = new StringBuilder();

    int maxTotalCharacters = 12000;
    int maxDocuments = 5;
    int includedDocuments = 0;

    for (ConversationDocument document : documents) {

        if (includedDocuments >= maxDocuments
                || context.length() >= maxTotalCharacters) {
            break;
        }

        String documentText = document.getDocumentText();

        if (documentText == null || documentText.isBlank()) {
            continue;
        }

        String relevantText = findRelevantDocumentChunks(
                documentText,
                question
        );

        if (relevantText.isBlank()) {
            continue;
        }

        String documentHeader =
                "\n\n--- DOCUMENT: "
                + document.getFileName()
                + " ---\n\n";

        int remainingCharacters =
                maxTotalCharacters
                - context.length()
                - documentHeader.length();

        if (remainingCharacters <= 0) {
            break;
        }

        context.append(documentHeader);

        context.append(
                relevantText.substring(
                        0,
                        Math.min(
                                relevantText.length(),
                                remainingCharacters
                        )
                )
        );

        includedDocuments++;
    }

    return context.toString();
}


	public String generateDocumentResponse(String documentText, String question) {

		if (documentText == null || documentText.isBlank()) {
			throw new IllegalArgumentException("Document text cannot be empty.");
		}

		String userQuestion = question == null || question.isBlank() ? "Summarize this document." : question.trim();

		// Temporary character limit for Groq free-tier testing.
		int maxCharacters = 12000;

		String limitedText = documentText.length() > maxCharacters ? documentText.substring(0, maxCharacters)
				: documentText;

		String prompt = """
				You are MY AI, a helpful document assistant.

				Answer the user's question using the provided document excerpt.

				Instructions:
				- Use the excerpt as the primary source.
				- If the answer is not present in the excerpt,
				  clearly say that the provided excerpt does not contain it.
				- Do not invent information.
				- Give a clear and useful answer.

				Document excerpt:
				""" + limitedText + """


				User question:
				""" + userQuestion;

		return aiService.generateResponse(new AiRequest(prompt));
	}

@Transactional
public ConversationImage saveConversationImage(
        Conversation conversation,
        String fileName,
        String mimeType,
        byte[] imageBytes) {

    if (conversation == null) {
        throw new IllegalArgumentException(
                "Conversation cannot be null."
        );
    }

    if (imageBytes == null || imageBytes.length == 0) {
        throw new IllegalArgumentException(
                "Cannot save an empty image."
        );
    }

    if (fileName == null || fileName.isBlank()) {
        throw new IllegalArgumentException(
                "Image filename cannot be empty."
        );
    }

    if (mimeType == null || !java.util.Set.of(
            "image/jpeg", "image/png", "image/webp"
        ).contains(mimeType.toLowerCase(java.util.Locale.ROOT))) {
        throw new IllegalArgumentException(
                "Unsupported image MIME type."
        );
    }

    if (imageBytes.length > 4 * 1024 * 1024) {
        throw new IllegalArgumentException(
                "Image size cannot exceed 4 MB."
        );
    }

    ConversationImage image = new ConversationImage();

    image.setConversation(conversation);
    image.setFileName(fileName);
    image.setMimeType(mimeType);
    image.setImageData(imageBytes);

    return conversationImageRepository.save(image);
}

@Transactional(readOnly = true)
public Optional<ConversationImage> getLatestConversationImage(
        Conversation conversation) {

    return conversationImageRepository
            .findFirstByConversationOrderByImageIdDesc(conversation);
}

}
