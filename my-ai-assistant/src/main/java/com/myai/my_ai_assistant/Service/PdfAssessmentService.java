
package com.myai.my_ai_assistant.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfAssessmentService {

    private static final long MAX_FILE_SIZE =
            10L * 1024 * 1024;

    // Existing method preserved for compatibility.
    public String extractPdfText(MultipartFile file) {
        return extractDocumentText(file);
    }

    // Supports PDF, DOC and DOCX.
    public String extractDocumentText(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Please upload a PDF, DOC or DOCX file."
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "File must be 10 MB or smaller."
            );
        }

        String fileName = file.getOriginalFilename();

        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException(
                    "Invalid uploaded file name."
            );
        }

        String extension =
                fileName.toLowerCase(Locale.ROOT);

        String extractedText;

        try {

            if (extension.endsWith(".pdf")) {

                extractedText = extractFromPdf(file);

            } else if (extension.endsWith(".docx")) {

                extractedText = extractFromDocx(file);

            } else if (extension.endsWith(".doc")) {

                extractedText = extractFromDoc(file);

            } else {

                throw new IllegalArgumentException(
                        "Only PDF, DOC and DOCX files are allowed."
                );
            }

        } catch (IOException e) {

            throw new IllegalArgumentException(
                    "Unable to read the uploaded document.",
                    e
            );

        } catch (org.apache.poi.openxml4j.exceptions.OpenXML4JRuntimeException e) {

            throw new IllegalArgumentException(
                    "Invalid or corrupted Word document.",
                    e
            );
        }

        if (extractedText == null || extractedText.isBlank()) {
            throw new IllegalArgumentException(
                    "No readable text found in the document. " +
                    "Scanned documents are not supported yet."
            );
        }

        return extractedText.trim();
    }

    private String extractFromPdf(MultipartFile file)
            throws IOException {

        try (PDDocument document =
                     Loader.loadPDF(file.getBytes())) {

            if (document.isEncrypted()) {
                throw new IllegalArgumentException(
                        "Password-protected PDFs are not supported."
                );
            }

            PDFTextStripper stripper =
                    new PDFTextStripper();

            return stripper.getText(document);
        }
    }

    private String extractFromDocx(MultipartFile file)
            throws IOException {

        try (InputStream inputStream = file.getInputStream();
             XWPFDocument document =
                     new XWPFDocument(inputStream);
             XWPFWordExtractor extractor =
                     new XWPFWordExtractor(document)) {

            return extractor.getText();
        }
    }

    private String extractFromDoc(MultipartFile file)
            throws IOException {

        try (InputStream inputStream = file.getInputStream();
             HWPFDocument document =
                     new HWPFDocument(inputStream);
             WordExtractor extractor =
                     new WordExtractor(document)) {

            return extractor.getText();
        }
    }
}
