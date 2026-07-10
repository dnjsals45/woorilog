package com.woorilog.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import com.woorilog.domain.UserRepository

@Component
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider,
    private val userRepository: UserRepository
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val token = resolveToken(request)
        if (token != null) {
            val userId = jwtTokenProvider.getUserIdFromToken(token)
            if (userId != null) {
                val user = userRepository.findById(userId).orElse(null)
                if (user != null) {
                    val principal = UserPrincipal(user.id!!, user.nickname)
                    val authentication = UserAuthenticationToken(principal)
                    SecurityContextHolder.getContext().authentication = authentication
                }
            }
        }
        filterChain.doFilter(request, response)
    }

    private fun resolveToken(request: HttpServletRequest): String? {
        val bearerToken = request.getHeader(HttpHeaders.AUTHORIZATION)
        if (bearerToken != null && bearerToken.startsWith("Bearer ", ignoreCase = true)) {
            return bearerToken.substring(7).trim()
        }
        return null
    }
}
