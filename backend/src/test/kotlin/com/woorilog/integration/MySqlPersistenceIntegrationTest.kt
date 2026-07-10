package com.woorilog.integration

import com.woorilog.domain.CategoryType
import com.woorilog.domain.Ledger
import com.woorilog.domain.LedgerMember
import com.woorilog.domain.LedgerMemberRepository
import com.woorilog.domain.LedgerRepository
import com.woorilog.domain.LedgerRole
import com.woorilog.domain.LedgerType
import com.woorilog.domain.Transaction
import com.woorilog.domain.TransactionRepository
import com.woorilog.domain.User
import com.woorilog.domain.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.MySQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.time.LocalDate

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class MySqlPersistenceIntegrationTest {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var ledgerRepository: LedgerRepository

    @Autowired
    private lateinit var ledgerMemberRepository: LedgerMemberRepository

    @Autowired
    private lateinit var transactionRepository: TransactionRepository

    @Test
    fun should_PersistAndQueryTransactions_When_UsingMySql() {
        val user = userRepository.save(
            User("TEST", "mysql-user", "mysql@example.com", "MySQL 사용자")
        )
        val ledger = ledgerRepository.save(
            Ledger("MySQL 장부", LedgerType.PERSONAL, user.id!!)
        )
        ledgerMemberRepository.save(LedgerMember(ledger, user, LedgerRole.OWNER))
        transactionRepository.save(
            Transaction(
                ledger = ledger,
                category = null,
                payer = user,
                type = CategoryType.EXPENSE,
                amount = 12000,
                transactionDate = LocalDate.of(2026, 7, 10),
                memo = "MySQL 검증",
            )
        )

        val transactions = transactionRepository
            .findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
                ledger.id!!,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 31),
            )

        assertEquals(1, transactions.size)
        assertEquals(12000, transactions.single().amount)
    }

    companion object {
        @Container
        @JvmStatic
        val mysql = MySQLContainer("mysql:8.4")
            .withDatabaseName("woorilog_test")
            .withUsername("woorilog")
            .withPassword("woorilog_test_password")

        @DynamicPropertySource
        @JvmStatic
        fun configureDataSource(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", mysql::getJdbcUrl)
            registry.add("spring.datasource.username", mysql::getUsername)
            registry.add("spring.datasource.password", mysql::getPassword)
            registry.add("spring.datasource.driver-class-name", mysql::getDriverClassName)
            registry.add("spring.jpa.properties.hibernate.dialect") { "org.hibernate.dialect.MySQLDialect" }
        }
    }
}
