package com.woorilog.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.LocalDate

class TransactionImportTextParserTest {

    private val fallbackDate = LocalDate.of(2026, 7, 21)

    @Test
    fun should_ParseDarkKakaoPayHistory_When_HangulMerchantIsMisrecognizedAsLatin() {
        val text = """
            10:44 \                                  al T (18
            <                        이용 내역               내역 선택
            간편결제 내역 자세히 보려면?            상세 정보 보기 >
            최근순 고액순                                     = Q
            26. 7. 12 (일)
            바오                                                25,000원
            일시불ㆍ7 work Edition2
            26. 7. 11(토)
            쿠우쿠우화정점                                    95,700원
            일시불ㆍ7 work Edition2
            ZIAEIPC                                            9,000
            일시불ㆍ7 work Edition2
            ZIAEIPC                                            5,000&
            일시불ㆍ7 work Edition2
            ZIAEIPC                                            3,000
            일시불ㆍ7 work Edition2
            26. 7. 8 (수)
        """.trimIndent()

        val result = TransactionImportTextParser.parse(text, fallbackDate)

        assertEquals(
            listOf(
                ExpectedCandidate("바오", 25_000, "2026-07-12"),
                ExpectedCandidate("쿠우쿠우화정점", 95_700, "2026-07-11"),
                ExpectedCandidate("긱스타PC", 9_000, "2026-07-11"),
                ExpectedCandidate("긱스타PC", 5_000, "2026-07-11"),
                ExpectedCandidate("긱스타PC", 3_000, "2026-07-11"),
            ),
            result.toExpectedCandidates(),
        )
    }

    @Test
    fun should_JoinWrappedCorporateMerchant_When_CardHistoryRowsSpanMultipleLines() {
        val text = """
            3102 표                              al 56 @
            <                 카드이용내역                =
            ~ 주식회사 우아한형제들띠 _ 70,000 원
            26.07.17 19:18 | 일시불                          4
            수, (주씨앤에스자산관리           4,300 원
            26.07.17 17:57 | 일시불                          4
            ~ 주식회사 노량진형제코퍼레 110,000 원
            이션 띠                              ~
            26.07.17 17:44 | 일시불                           a
            n    남산베이스                     5,500 원
            26.07.17 16:01 | 일시불                          4
            ~ 나이스인프라 주식회사        15,000 원
            26.07.17 15:11 | 일시불                           4
            "  남영돈                      201,000 원
            26.07.17 15:05 | 일시불                          4
        """.trimIndent()

        val result = TransactionImportTextParser.parse(text, fallbackDate)

        assertEquals(
            listOf(
                ExpectedCandidate("주식회사 우아한형제들", 70_000, "2026-07-17"),
                ExpectedCandidate("(주)씨앤에스자산관리", 4_300, "2026-07-17"),
                ExpectedCandidate("주식회사 노량진형제코퍼레이션", 110_000, "2026-07-17"),
                ExpectedCandidate("남산베이스", 5_500, "2026-07-17"),
                ExpectedCandidate("나이스인프라 주식회사", 15_000, "2026-07-17"),
                ExpectedCandidate("남영돈", 201_000, "2026-07-17"),
            ),
            result.toExpectedCandidates(),
        )
    }

    @Test
    fun should_JoinWrappedMallAndBranchNames_When_ScrollArtifactsSplitMerchantText() {
        val text = """
            3:02 표                              all 56 @
            <                    카드이용내역                  =
            7월 18일 토요일
             (주)신세계프라퍼티 코엑스 194,000 원
            =                                         i
            =                                           들
            26.07.18 14:16 | 일시불                            이
            ..… 、 주식회사 서북                     4,000 원
            26.07.18 12:16 | 일시불                          4
            6   네이버페이 미              127,200 원
            26.07.18 11:47 | 일시불                          4
            7월 17일 금요일
            °    주식회사 우아한형제들 @      35,000 원
            26.07.17 21:12 | 일시불                         4
            Fa    지에스 더프레시 신촌숲아이 39,280 원
            파크점                                    -,
            26.07.17 19:31 | 일시불                            이
        """.trimIndent()

        val result = TransactionImportTextParser.parse(text, fallbackDate)

        assertEquals(
            listOf(
                ExpectedCandidate("(주)신세계프라퍼티 코엑스몰", 194_000, "2026-07-18"),
                ExpectedCandidate("주식회사 서북", 4_000, "2026-07-18"),
                ExpectedCandidate("네이버페이", 127_200, "2026-07-18"),
                ExpectedCandidate("주식회사 우아한형제들", 35_000, "2026-07-17"),
                ExpectedCandidate("지에스 더프레시 신촌숲아이파크점", 39_280, "2026-07-17"),
            ),
            result.toExpectedCandidates(),
        )
    }

    @Test
    fun should_IgnoreStatusBarNumbers_When_NoCurrencyOrGroupedAmountExists() {
        val result = TransactionImportTextParser.parse(
            """
                3:02 표 all 56 @
                10:44 폭 all © 098
            """.trimIndent(),
            fallbackDate,
        )

        assertEquals(emptyList<ParsedTransactionImportLine>(), result.candidates)
    }

    @Test
    fun should_IgnoreTossBalanceRows_When_MetadataAndBalanceShareALine() {
        val result = TransactionImportTextParser.parse(
            """
                3194                  all = 023
                삼성카드                    -34,508원
                18:28 #자동이체                     0원
                아이파크몰(주)                  -8,500원
                17:28 #체크카드                  34,508원
                아이파크몰(주)                 -31,600원
                17:10 #체크카드                  43,008원
                07.19
                지에스더프레시 신촌                        -29,160원
                17:17 #체크카드                   74,608원
                이마트 신촌점                                      -26,420원
                16:10 #체크카드                  103,768원
                07.18
                (주)우아한형제들                -31,600원
                18:40 #체크카드                 130,188원
                (주)신세계프라퍼티               -8,900원
                13:28 #체크카드                  161,788원
                으
                12:54 #체크카드                  170,688원
            """.trimIndent(),
            fallbackDate,
        )

        assertEquals(
            listOf(
                ExpectedCandidate("삼성카드", 34_508, "2026-07-21"),
                ExpectedCandidate("아이파크몰(주)", 8_500, "2026-07-21"),
                ExpectedCandidate("아이파크몰(주)", 31_600, "2026-07-21"),
                ExpectedCandidate("지에스더프레시 신촌", 29_160, "2026-07-19"),
                ExpectedCandidate("이마트 신촌점", 26_420, "2026-07-19"),
                ExpectedCandidate("(주)우아한형제들", 31_600, "2026-07-18"),
                ExpectedCandidate("(주)신세계프라퍼티", 8_900, "2026-07-18"),
            ),
            result.toExpectedCandidates(),
        )
    }

    @Test
    fun should_AssociateStandaloneAmountsWithPrecedingMerchants_AndIgnoreSplitBalanceRows() {
        val result = TransactionImportTextParser.parse(
            """
                31199
                삼성카드
                -34,508%
                18:28 #자동이체
                0원
                아이파크몰(주)
                -8,500%
                17:28 #체크카드
                34,508%
                아이파크몰(주)
                -31,600운
                17:10 #체크카드
                43,008운
                07.19
                지에스더프레시
                신
                -29,160%
                17:17 #체크카드
                74,608운
                이마트
                A=
                -26,420%
                16:10 #체크카드
                103,768운
                07.18
                으
                (주)우아한형제들
                -31,600
                18:40 #체크카드
                130,188운
                으
                (주)신세계프라퍼티
                -8,900
                13:28 #체크카드
                161,788원
                으
                아성다이소
                맨 위로
                -8,200
                12:54 #체크카드
                170,688원
            """.trimIndent(),
            fallbackDate,
        )

        assertEquals(
            listOf(
                ExpectedCandidate("삼성카드", 34_508, "2026-07-21"),
                ExpectedCandidate("아이파크몰(주)", 8_500, "2026-07-21"),
                ExpectedCandidate("아이파크몰(주)", 31_600, "2026-07-21"),
                ExpectedCandidate("지에스더프레시", 29_160, "2026-07-19"),
                ExpectedCandidate("이마트", 26_420, "2026-07-19"),
                ExpectedCandidate("(주)우아한형제들", 31_600, "2026-07-18"),
                ExpectedCandidate("(주)신세계프라퍼티", 8_900, "2026-07-18"),
                ExpectedCandidate("아성다이소", 8_200, "2026-07-18"),
            ),
            result.toExpectedCandidates(),
        )
    }

    @Test
    fun should_RemoveDetachedLeadingIconsAndKeepWrappedHangulSuffix() {
        val result = TransactionImportTextParser.parse(
            """
                의    남산베이스 5,500원
                26.07.17 16:01 | 일시불
                (내  남영돈 201,000원
                26.07.17 15:05 | 일시불
                (주)신세계프라퍼티 코엑스 194,000원
                몰 “a
                26.07.18 14:16 | 일시불
            """.trimIndent(),
            fallbackDate,
        )

        assertEquals(
            listOf(
                ExpectedCandidate("남산베이스", 5_500, "2026-07-17"),
                ExpectedCandidate("남영돈", 201_000, "2026-07-17"),
                ExpectedCandidate("(주)신세계프라퍼티 코엑스몰", 194_000, "2026-07-18"),
            ),
            result.toExpectedCandidates(),
        )
    }

    @Test
    fun should_ParseTrailingPlainAmount_When_ManuallyEnteredWithoutCurrencySymbol() {
        val result = TransactionImportTextParser.parse("점심 12000", fallbackDate)

        assertEquals(
            listOf(ExpectedCandidate("점심", 12_000, "2026-07-21")),
            result.toExpectedCandidates(),
        )
    }

    private fun TransactionImportParseResult.toExpectedCandidates(): List<ExpectedCandidate> = candidates.map {
        ExpectedCandidate(it.memo, it.amount, it.transactionDate.toString())
    }

    private data class ExpectedCandidate(
        val merchant: String,
        val amount: Long,
        val transactionDate: String,
    )
}
