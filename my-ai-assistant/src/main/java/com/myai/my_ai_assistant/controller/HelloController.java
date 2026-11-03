package com.myai.my_ai_assistant.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/")
    public String hello() {
        return "My AI Assistant is running!";
    }

    @GetMapping("/api/test")
    public String test() {
        return "API is working successfully!";
    }
}