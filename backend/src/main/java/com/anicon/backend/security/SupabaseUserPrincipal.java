package com.anicon.backend.security;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import lombok.Getter;

@Getter
public class SupabaseUserPrincipal implements UserDetails {
    private final UUID userId;
    private final String email;
    private final Collection<? extends GrantedAuthority> authorities;

    public SupabaseUserPrincipal(UUID userId, String email, String role) {
        this.userId = userId;
        this.email = email;
        // Map Supabase "authenticated" role to a Spring Security authority
        this.authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    }

    @Override
    public String getPassword() {
        return null;
    } // No password needed for JWT auth

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}