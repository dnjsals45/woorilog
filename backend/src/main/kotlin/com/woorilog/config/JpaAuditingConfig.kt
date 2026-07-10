package com.woorilog.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.auditing.DateTimeProvider
import org.springframework.data.jpa.repository.config.EnableJpaAuditing
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Instant
import java.time.temporal.TemporalAccessor
import java.util.Optional

@Configuration
@EnableJpaAuditing(dateTimeProviderRef = "clockDateTimeProvider")
class JpaAuditingConfig {

    @Bean
    fun clock(): Clock {
        return Clock.systemDefaultZone()
    }
}

@Component("clockDateTimeProvider")
class ClockDateTimeProvider(private val clock: Clock) : DateTimeProvider {
    override fun getNow(): Optional<TemporalAccessor> {
        return Optional.of(Instant.now(clock))
    }
}
