
package com.myai.my_ai_assistant.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentTextExtractor {

    public String extractText(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a non-empty document."
            );
        }

        String filename = file.getOriginalFilename();

        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid document filename."
            );
        }

        String lowerName = filename.toLowerCase(Locale.ROOT);

        try {
            byte[] bytes = file.getBytes();
            String text;

            if (lowerName.endsWith(".pdf")) {

                try (var document = Loader.loadPDF(bytes)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    text = stripper.getText(document);
                }

            } else if (lowerName.endsWith(".docx")) {

                try (XWPFDocument document = new XWPFDocument(
                        new ByteArrayInputStream(bytes))) {

                    StringBuilder result = new StringBuilder();

                    document.getParagraphs().forEach(paragraph ->
                            result.append(paragraph.getText())
                                    .append("\n")
                    );

                    document.getTables().forEach(table ->
                            table.getRows().forEach(row ->
                                    row.getTableCells().forEach(cell ->
                                            result.append(cell.getText())
                                                    .append("\n")
                                    )
                            )
                    );

                    text = result.toString();
                }

            } else if (lowerName.endsWith(".txt")
                    || lowerName.endsWith(".csv")) {

                text = new String(bytes, StandardCharsets.UTF_8);

            } else {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unsupported document type. Use PDF, DOCX, TXT or CSV."
                );
            }

            if (text == null || text.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "No readable text found. Scanned documents may require OCR."
                );
            }

            return text.trim();

        } catch (IOException | RuntimeException ex) {

            if (ex instanceof ResponseStatusException responseException) {
                throw responseException;
            }

            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Unable to read the uploaded document.",
                    ex
            );
        }
    }
}
