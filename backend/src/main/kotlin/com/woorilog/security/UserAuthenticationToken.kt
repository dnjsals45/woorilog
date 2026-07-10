package com.woorilog.security

import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.core.GrantedAuthority

class UserAuthenticationToken(
    private val userPrincipal: UserPrincipal,
    authorities: Collection<GrantedAuthority> = emptyList()
) : AbstractAuthenticationToken(authorities) {
    init {
        isAuthenticated = true
    }
    override fun getCredentials(): Any? = null
    override fun getPrincipal(): UserPrincipal = userPrincipal
}
