package com.myai.my_ai_assistant.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myai.my_ai_assistant.Service.UserService;
import com.myai.my_ai_assistant.dto.UserCreateRequest;
import com.myai.my_ai_assistant.dto.UserResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public UserResponse createUser(
            @Valid @RequestBody UserCreateRequest request) {

        return userService.createUser(request);
    }

    @GetMapping
    public List<UserResponse> getAllUsers() {

        return userService.getAllUsers();
    }
}