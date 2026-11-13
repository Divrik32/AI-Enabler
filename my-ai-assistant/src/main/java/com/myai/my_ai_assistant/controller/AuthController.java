
package com.myai.my_ai_assistant.controller;

import com.myai.my_ai_assistant.Service.AuthService;

import com.myai.my_ai_assistant.Service.PasswordResetService;
import com.myai.my_ai_assistant.dto.ForgotPasswordRequest;
import com.myai.my_ai_assistant.dto.ResetPasswordRequest;
import com.myai.my_ai_assistant.dto.LoginRequest;
import com.myai.my_ai_assistant.dto.LoginResponse;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.security.JwtService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import com.myai.my_ai_assistant.Service.ProfileService;
import com.myai.my_ai_assistant.dto.ProfileUpdateRequest;
import org.springframework.security.core.Authentication;

import com.myai.my_ai_assistant.Service.ProfileService;
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;
    private final ProfileService profileService;

    public AuthController(
            AuthService authService,
            JwtService jwtService,
            PasswordResetService passwordResetService,
            ProfileService profileService) {

        this.authService = authService;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
        this.profileService = profileService;
    }
    // Existing Login API
    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request) {

        User user = authService.authenticate(
                request.getUsername(),
                request.getPassword()
        );

        String token = jwtService.generateToken(
                user.getUserId(),
                user.getUsername()
        );

        return new LoginResponse(
                token,
                user.getUserId(),
                user.getUsername(),
                user.getEmail()
        );
    }

    // Forgot Password API
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        passwordResetService.requestPasswordReset(
                request.getEmail()
        );

        return ResponseEntity.ok(
                Map.of(
                    "message",
                    "If an account exists with this email, "
                    + "a password reset link has been sent."
                )
        );
    }

    // Reset Password API
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        passwordResetService.resetPassword(
                request.getToken(),
                request.getNewPassword()
        );

        return ResponseEntity.ok(
                Map.of(
                    "message",
                    "Password reset successfully. Please sign in."
                )
        );
    }
    

    // Get logged-in user's profile
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(
            Authentication authentication) {

        User user = profileService.getProfile(
                authentication.getName()
        );

        return ResponseEntity.ok(
                Map.of(
                    "userId", user.getUserId(),
                    "username", user.getUsername(),
                    "email", user.getEmail()
                )
        );
    }

    // Update logged-in user's profile
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request) {

        User user = profileService.updateProfile(
                authentication.getName(),
                request
        );

        String newToken = jwtService.generateToken(
                user.getUserId(),
                user.getUsername()
        );

        return ResponseEntity.ok(
                Map.of(
                    "token", newToken,
                    "userId", user.getUserId(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "message", "Profile updated successfully"
                )
        );
    }

}
