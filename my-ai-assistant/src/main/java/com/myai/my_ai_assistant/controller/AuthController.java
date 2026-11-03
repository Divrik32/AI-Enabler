package com.myai.my_ai_assistant.controller;

import com.myai.my_ai_assistant.Service.AuthService;
import com.myai.my_ai_assistant.dto.LoginRequest;
import com.myai.my_ai_assistant.dto.LoginResponse;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.security.JwtService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(
            AuthService authService,
            JwtService jwtService) {

        this.authService = authService;
        this.jwtService = jwtService;
    }

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
}