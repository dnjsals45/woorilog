package com.woorilog.service

import com.fasterxml.jackson.databind.JsonNode
import com.woorilog.exception.WoorilogException
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder

@Component
class KakaoOAuthClient(
    @Value("\${app.kakao.client-id:}") private val clientId: String,
    @Value("\${app.kakao.client-secret:}") private val clientSecret: String,
    @Value("\${app.kakao.redirect-uri:}") private val redirectUri: String,
) {
    private val restClient = RestClient.create()

    fun authorizationUrl(): String {
        requireConfigured()
        return UriComponentsBuilder.fromUriString("https://kauth.kakao.com/oauth/authorize")
            .queryParam("response_type", "code")
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .build()
            .encode()
            .toUriString()
    }

    fun getUser(code: String): KakaoUser {
        requireConfigured()
        val tokenRequest = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "authorization_code")
            add("client_id", clientId)
            add("client_secret", clientSecret)
            add("redirect_uri", redirectUri)
            add("code", code)
        }
        val tokenResponse = try {
            restClient.post()
                .uri("https://kauth.kakao.com/oauth/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(tokenRequest)
                .retrieve()
                .body(JsonNode::class.java)
        } catch (_: Exception) {
            throw WoorilogException("KAKAO_AUTH_FAILED", "카카오 인증에 실패했습니다.", HttpStatus.BAD_GATEWAY)
        }
        val accessToken = tokenResponse?.path("access_token")?.asText().orEmpty()
        if (accessToken.isBlank()) {
            throw WoorilogException("KAKAO_AUTH_FAILED", "카카오 인증에 실패했습니다.", HttpStatus.BAD_GATEWAY)
        }

        val userResponse = try {
            restClient.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header("Authorization", "Bearer $accessToken")
                .retrieve()
                .body(JsonNode::class.java)
        } catch (_: Exception) {
            throw WoorilogException("KAKAO_AUTH_FAILED", "카카오 사용자 정보를 불러오지 못했습니다.", HttpStatus.BAD_GATEWAY)
        }
        val providerUserId = userResponse?.path("id")?.asText().orEmpty()
        if (providerUserId.isBlank()) {
            throw WoorilogException("KAKAO_AUTH_FAILED", "카카오 사용자 정보를 불러오지 못했습니다.", HttpStatus.BAD_GATEWAY)
        }

        val account = userResponse?.path("kakao_account")
            ?: throw WoorilogException("KAKAO_AUTH_FAILED", "카카오 사용자 정보를 불러오지 못했습니다.", HttpStatus.BAD_GATEWAY)
        return KakaoUser(
            providerUserId = providerUserId,
            email = account.path("email").takeIf { !it.isMissingNode && !it.isNull }?.asText(),
            nickname = account.path("profile").path("nickname")
                .takeIf { !it.isMissingNode && !it.isNull }?.asText()?.takeIf { it.isNotBlank() }
                ?: "카카오 사용자",
        )
    }

    private fun requireConfigured() {
        if (clientId.isBlank() || clientSecret.isBlank() || redirectUri.isBlank()) {
            throw WoorilogException("NOT_CONFIGURED", "카카오 로그인 설정이 완료되지 않았습니다.", HttpStatus.NOT_IMPLEMENTED)
        }
    }
}

data class KakaoUser(
    val providerUserId: String,
    val email: String?,
    val nickname: String,
)
