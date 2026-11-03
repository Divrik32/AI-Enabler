package com.myai.my_ai_assistant.security;

import java.util.List;
import jakarta.servlet.DispatcherType;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.Customizer;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
        .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

            	    .dispatcherTypeMatchers(
            	        DispatcherType.ERROR,
            	        DispatcherType.FORWARD
            	    ).permitAll()

            	    .requestMatchers("/api/auth/login")
            	    .permitAll()

            	    .requestMatchers(HttpMethod.POST, "/api/users")
            	    .permitAll()

            	    .requestMatchers(HttpMethod.GET, "/api/users")
            	    .authenticated()

            	    .anyRequest()
            	    .authenticated()
            	)

            // Return 401 when authentication is missing/invalid
            .exceptionHandling(exception ->
                exception.authenticationEntryPoint(
                    (request, response, authException) -> {

                        response.setStatus(
                            HttpStatus.UNAUTHORIZED.value()
                        );

                        response.setContentType(
                            "application/json"
                        );

                        response.getWriter().write(
                            "{\"status\":401,\"message\":\"Authentication required\"}"
                        );
                    }
                )
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}