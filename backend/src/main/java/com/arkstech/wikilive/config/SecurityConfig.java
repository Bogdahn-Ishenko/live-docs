package com.arkstech.wikilive.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/pages", "/api/pages/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/pages/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/pages/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/pages/**").authenticated()
                        .requestMatchers("/ws/**").permitAll() //ВЕБСОКЕТ
                        .anyRequest().authenticated()
                )
                .httpBasic(basic -> basic.realmName("WikiLive API"));

        return http.build();
    }

    @Bean
    public UserDetailsService users(PasswordEncoder passwordEncoder) {
        //пароль для всех пререндеренных пользователей
        String encodedPassword = passwordEncoder.encode("123");

        // ============================================================
        // ЗАГЛУШКА 3х ПОЛЬЗОВАТЕЛЕЙ
        // ============================================================
        // логин- uskO2BIAF6jREwNMJr95MSQ   пароль- 123
        UserDetails teammate = User.builder()
                .username("uskO2BIAF6jREwNMJr95MSQ")
                .password(encodedPassword)
                .roles("USER")
                .build();

        //пользователь 2
        UserDetails demo2 = User.builder()
                .username("demo_user_2")
                .password(encodedPassword)
                .roles("USER")
                .build();

        //пользователь 3
        UserDetails demo3 = User.builder()
                .username("demo_user_3")
                .password(encodedPassword)
                .roles("USER")
                .build();


        return new InMemoryUserDetailsManager(teammate, demo2, demo3);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}