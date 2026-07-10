package com.woorilog.security

import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

class UserPrincipal(
    val userId: Long,
    val nickname: String
) : UserDetails {
    override fun getAuthorities(): Collection<GrantedAuthority> = emptyList()
    override fun getPassword(): String? = null
    override fun getUsername(): String = userId.toString()
    override fun isAccountNonExpired(): Boolean = true
    override fun isAccountNonLocked(): Boolean = true
    override fun isCredentialsNonExpired(): Boolean = true
    override fun isEnabled(): Boolean = true
}
