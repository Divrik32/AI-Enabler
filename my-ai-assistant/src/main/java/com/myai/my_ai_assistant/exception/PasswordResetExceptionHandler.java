
package com.myai.my_ai_assistant.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.myai.my_ai_assistant.controller.AuthController;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class PasswordResetExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>>
            handleInvalidResetToken(IllegalArgumentException ex) {

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "message",
                        ex.getMessage() != null
                                ? ex.getMessage()
                                : "Invalid password reset request."
                ));
    }
}
