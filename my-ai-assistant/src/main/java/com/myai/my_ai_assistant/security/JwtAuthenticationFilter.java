package com.myai.my_ai_assistant.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(
            JwtService jwtService) {

        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader("Authorization");
        System.out.println(
        	    "JWT DEBUG | URI: " + request.getRequestURI()
        	    + " | Method: " + request.getMethod()
        	    + " | Authorization header present: "
        	    + (authorizationHeader != null)
        	);

        if (authorizationHeader == null ||
                !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        String token =
                authorizationHeader.substring(7);

        boolean validToken = jwtService.isTokenValid(token);

        System.out.println(
            "JWT DEBUG | URI: " + request.getRequestURI()
            + " | Token valid: " + validToken
        );

        if (validToken) {

            String username =
                    jwtService.extractUsername(token);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            null
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource()
                            .buildDetails(request)
            );

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);
            System.out.println(
            	    "JWT DEBUG | Authentication set: "
            	    + SecurityContextHolder.getContext()
            	        .getAuthentication().isAuthenticated()
            	);
        }

        filterChain.doFilter(request, response);
    }
}