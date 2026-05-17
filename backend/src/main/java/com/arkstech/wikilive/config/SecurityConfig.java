package com.arkstech.wikilive.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
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
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // чтение страниц
                        .requestMatchers(HttpMethod.GET, "/api/pages/**").permitAll()

                        // чтение комментариев
                        .requestMatchers(HttpMethod.GET, "/api/pages/*/comments/**").permitAll()

                        // запись комментариев
                        .requestMatchers(HttpMethod.POST, "/api/pages/*/comments/**").authenticated()

                        // все операции записи и удаления
                        .requestMatchers(HttpMethod.POST, "/api/pages/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/pages/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/pages/**").authenticated()

                        // вебсокет авторизованным
                        .requestMatchers("/ws/**").permitAll()

                        //остальное
                        .anyRequest().authenticated()
                )
                .httpBasic(basic -> basic.realmName("WikiLive API"));

        return http.build();
    }

    @Bean
    public UserDetailsService users(PasswordEncoder passwordEncoder) {
        String rootPass = passwordEncoder.encode("root");
        String demoPass = passwordEncoder.encode("123");

        UserDetails teammate = User.builder()
                .username("uskO2BIAF6jREwNMJr95MSQ")
                .password(rootPass)
                .roles("ADMIN")
                .build();

        UserDetails secondOwner = User.builder()
                .username("uskZXqR1in7JRVX5lGD3JdE")
                .password(rootPass)
                .roles("ADMIN")
                .build();

        UserDetails editor = User.builder()
                .username("demo_user_3")
                .password(rootPass)
                .roles("USER")
                .build();

        UserDetails editor2 = User.builder()
                .username("demo_user_4")
                .password(rootPass)
                .roles("USER")
                .build();

        UserDetails viewer = User.builder()
                .username("demo_user_2")
                .password(demoPass)
                .roles("USER")
                .build();

        return new InMemoryUserDetailsManager(
                teammate,
                secondOwner,
                editor,
                editor2,
                viewer
        );
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
