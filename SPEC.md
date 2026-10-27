# 1. 요구사항

**서비스 이름:** TravelBack AI
**한 줄 소개:** 여행 준비 → 현금 확보 → 결제·환급 → 가계부를 한 흐름으로 잇고, 결제 수단 × 환급 방식 조합의 최종 원화 지출액을 비교하는 여행 금융 도우미

환율 · 수수료 · 환급률 · 장소 · 도보 시간은 모두 **시연 가정값**이며 실제 우리카드·우리은행 상품 조건이 아니다. 화면에는 항상 "계산 가정"임을 표시한다.

## 1.0 공통 규칙

**국가·통화**
| 국가 | 통화 | 기준환율(원/1단위) | ATM 운영사 수수료(현지통화) | 출국 공항 | 택스 리펀드 |
|---|---|---|---|---|---|
| FR | EUR € | 1,580 | 3 | CDG | 지원 |
| JP | JPY ¥ | 9.5 | 220 | HND | 미지원(준비 중) |
| TH | THB ฿ | 43 | 150 | BKK | 미지원(준비 중) |

**결제 수단**: travel 0% · standard 1.3% · cash 2% · none(보유 카드 없음, 결제 불가)

**돈 계산**
- C1. 원화를 계산하면, 시스템은 식 전체를 계산한 뒤 소수 첫째 자리에서 반올림(0.5 올림)해 정수 원으로 만든다. 중간값은 반올림하지 않는다.
- C2. 외화끼리 더하거나 빼면, 시스템은 결과를 소수 셋째 자리에서 반올림해 소수 둘째 자리로 만든다.
- C3. 비용을 계산하면, 시스템은 원금 = round(외화 × 기준환율), 수수료 = 비용 − 원금으로 정한다.

| 계산 | 결과 |
|---|---|
| 15.8원 | 16 |
| 15.5원 | 16 |
| 15.49원 | 15 |
| 7.50105 € | 7.5 |
| 0.005 € | 0.01 |
| 0.0049 € | 0 |

**범위 밖 (만들지 않는다)**: 실시간 환율, 실제 환전소·ATM 위치·길찾기·지도 API, 환율표 OCR, 영수증 PDF 인식(영수증 사진 인식은 R51), 생성형 AI 챗봇, 우리카드·우리은행 실제 상품·잔액·거래내역 조회, 외화계좌 자동 입금, 프랑스 외 택스 리펀드.

## 1.1 여행 정보 (1페이지)

**R1.** 여행 국가가 FR · JP · TH가 아니면, 시스템은 UNSUPPORTED_COUNTRY 오류를 던진다.
| 국가 | 결과 |
|---|---|
| FR / JP / TH | 허용 |
| US | UNSUPPORTED_COUNTRY |
| (빈 값) | UNSUPPORTED_COUNTRY |

**R2.** 도시명이 앞뒤 공백을 제거한 뒤 비어 있거나 40자를 넘으면, 시스템은 INVALID_CITY 오류를 던진다. 저장할 때는 앞뒤 공백을 제거한다.
| 도시명 | 결과 |
|---|---|
| "" / "   " | INVALID_CITY |
| " 파리 " | "파리"로 저장 |
| 40자 | 허용 |
| 41자 | INVALID_CITY (초과 시 코드) |

**R3.** 귀국일이 출발일보다 앞서면, 시스템은 INVALID_PERIOD 오류를 던진다. 아니면 여행 일수 = 귀국일 − 출발일 + 1을 계산한다.
| 출발일 | 귀국일 | 결과 |
|---|---|---|
| 2026-11-10 | 2026-11-09 | INVALID_PERIOD |
| 2026-11-10 | 2026-11-10 | 1일 |
| 2026-11-10 | 2026-11-16 | 7일 |
| 2026-12-30 | 2027-01-02 | 4일 |

**R4.** 여행 예산이 1 ~ 1,000,000,000원 정수가 아니거나, 보유 현금이 0 ~ 1,000,000,000(현지통화, 소수 둘째 자리까지)이 아니면, 시스템은 INVALID_AMOUNT 오류를 던진다.
| 항목 | 값 | 결과 |
|---|---|---|
| 예산 | 0 / 1.5 | INVALID_AMOUNT |
| 예산 | 1 / 1,000,000,000 | 허용 |
| 예산 | 1,000,000,001 | INVALID_AMOUNT |
| 보유 현금 | −0.01 | INVALID_AMOUNT |
| 보유 현금 | 0 / 1,000,000,000 | 허용 |
| 보유 현금 | 0.001 | INVALID_AMOUNT (셋째 자리 입력) |

**R5.** 보유 카드가 travel · standard · none이 아니면, 시스템은 INVALID_CARD (새 코드) 오류를 던진다. 외화계좌·충전 서비스 보유 여부는 true/false로 저장한다.
| 카드 | 결과 |
|---|---|
| travel / standard / none | 허용 |
| debit | INVALID_CARD |

**R6.** 사용자가 여행 국가를 바꾸면, 시스템은 저장된 현장 환율표(R19)를 지우고, 이미 기록한 거래는 기록 당시 국가·환율을 유지한다.
| 동작 | 환율표 | 기존 거래 |
|---|---|---|
| FR → JP | 삭제 | FR · 1,580 유지 |
| FR → FR (같은 값 다시 선택) | 유지 | 유지 |

**R7.** 여행 정보가 저장되면, 시스템은 카드 유형과 외화계좌 보유 여부에 따라 맞춤 안내 3줄을 보여 준다.
| 카드 | 외화계좌 | 1줄 | 2줄 | 3줄 |
|---|---|---|---|---|
| travel | true | 현지통화 결제·DCC 확인 | 카드 해외 사용 확인 | 외화계좌 충전 조건 확인 |
| standard | false | 현지통화 결제·DCC 확인 | 카드 해외 사용 확인 | 외화계좌 개설 가능 여부부터 |
| none | false | 현지통화 결제·DCC 확인 | 현금 준비부터 | 외화계좌 개설 가능 여부부터 |

## 1.2 결제 비용 (공통)

**R8.** 결제 비용을 계산하면, 시스템은 round(금액 × 기준환율 × (1 + 가산율))을 돌려준다.
**R9.** 금액이 0 미만이거나 숫자가 아니면 INVALID_AMOUNT, 환율이 0 이하면 INVALID_RATE 오류를 던진다. 금액 0은 비용 0이다.
| 금액 | 수단 | 환율 | 결과 |
|---|---|---|---|
| 420 | travel | 1580 | 663,600 |
| 420 | standard | 1580 | 672,227 (672,226.8) |
| 420 | cash | 1580 | 676,872 |
| 3000 | travel | 43 | 129,000 |
| 0.01 | travel | 1580 | 16 |
| 0 | travel | 1580 | 0 |
| −0.01 | travel | 1580 | INVALID_AMOUNT |
| "abc" | travel | 1580 | INVALID_AMOUNT |
| 1 | travel | 0 | INVALID_RATE |
| 1 | travel | 0.01 | 0 (0.01 → 0) |

## 1.3 현금 확보 비교 (2페이지)

기준 입력(이하 "기준"): 필요 €150, 보유 €80, 외화계좌 잔액 €250, 환율 1,580, 운영사수수료 3, 카드 travel, 외화계좌 true, 충전·ATM 지원 true, 최대 도보 15, 위치 오프셋 0, 보유 원화 현금 300,000, 환율표 없음.

**R10.** 부족분 = round2(필요 현금 − 보유 현금)이 0 이하이면, 시스템은 부족분 0과 빈 후보 목록을 돌려주고 "현금 준비 완료"로 안내한다.
| 필요 | 보유 | 결과 |
|---|---|---|
| 150 | 80 | 부족분 70 |
| 150 | 149.99 | 부족분 0.01 |
| 150 | 150 | 0, 후보 없음, 준비 완료 |
| 150 | 150.01 | 0, 후보 없음, 준비 완료 |

**R11.** 후보를 계산하면, 시스템은 모든 후보의 원금을 round(부족분 × 기준환율)로 같게 두고 총비용으로만 비교한다.
| 부족분 | 원금 |
|---|---|
| 70 (FR) | 110,600 |
| 3000 (TH) | 129,000 |

**R12.** 카드가 none이 아니면, 시스템은 후보 A(보유 카드 → 은행 ATM A, 기본 도보 4분)를 만든다. 수수료 = round(운영사수수료 × 환율 + S), S는 standard면 부족분 × 환율 × 1% + 3,000, travel이면 0. travel은 외화계좌 잔액 ≥ 부족분 + 운영사수수료일 때만 포함한다.
| 조건 | A |
|---|---|
| 기준 | 수수료 4,740, 총 115,340 |
| standard | 수수료 8,846, 총 119,446 |
| 잔액 72 (72 < 73) | 제외 |
| 잔액 73 (= 70 + 3) | 포함 |
| standard, 잔액 0 | 포함 (잔액 조건 없음) |
| none | 제외 |

**R13.** 카드가 none이 아니고 외화계좌가 있고 충전·ATM 지원을 확인했으면, 시스템은 후보 B(외화 충전 → 은행 ATM B, 기본 도보 8분)를 만든다. 수수료 = round(운영사수수료 × 환율 × 0.5 + 부족분 × 환율 × 0.2% + S).
| 조건 | B |
|---|---|
| 기준 | 수수료 2,591 (2,591.2), 총 113,191 |
| standard | 수수료 6,697, 총 117,297 |
| 외화계좌 false | 제외 |
| 지원 false | 제외 |
| none | 제외 |

**R14.** 보유 원화 현금(2페이지 입력, 0 ~ 1,000,000,000원 정수)이 총비용 이상이면, 시스템은 후보 C(원화 현금 → 환전소 C, 기본 도보 6분)를 만든다. 적용환율 = 환율표가 있으면 그 환율, 없으면 기준환율 × 1.025. 고정수수료 = 환율표가 있으면 그 수수료, 없으면 round(기준환율 × 0.5). 총비용 = round(부족분 × 적용환율) + 고정수수료. 카드가 없어도 만든다.
| 조건 | C |
|---|---|
| 기준 | 113,365 + 790 = 114,155 |
| 환율표 1,600 / 500원 | 112,000 + 500 = 112,500 |
| 원화 현금 114,154 | 제외 |
| 원화 현금 114,155 | 포함 |
| none | 포함 |

**R15.** 도보 시간(기본 도보 + 위치 오프셋: 시내 중심 0 · 관광지 3 · 숙소 6)이 최대 도보 시간(5 · 15 · 30분)을 넘으면, 시스템은 그 후보를 제외한다.
| 최대 | 오프셋 | 결과 |
|---|---|---|
| 5 | 0 | A만 (4 ≤ 5, C 6 > 5) |
| 5 | 3 | 없음 (A 7) |
| 15 | 6 | A 10 · B 14 · C 12 모두 |
| 15 | 0 | 모두 |

**R16.** 후보를 돌려주면, 시스템은 총비용 오름차순(동률이면 A·B·C 순)으로 정렬하고 최저 후보에 "비교 후보 중 최저", 요약에 "최고 − 최저 N원 차이"를 표시한다. 사용자가 "가까운 순"을 고르면 도보 오름차순으로 다시 정렬한다.
| 조건 | 순서 | 차이 |
|---|---|---|
| 기준 | B 113,191 → C 114,155 → A 115,340 | 2,149원 |
| 기준, 가까운 순 | A 4 → C 6 → B 8 | — |
| 후보 1개 | 그 후보가 최저 | 0원 |
| TH: 필요 3000, 보유 0, 잔액 5000, 환율 43, 운영사 150 | C 132,247 → B 132,483 → A 135,450 | 3,203원 |

**R17.** 필요 현금 · 보유 현금 · 잔액 · 운영사수수료 · 보유 원화 · 최대 도보 · 오프셋 중 하나라도 음수거나 숫자가 아니면 INVALID_CASH_INPUT, 환율이 0 이하면 INVALID_RATE 오류를 던진다.
| 입력 | 결과 |
|---|---|
| 필요 −1 | INVALID_CASH_INPUT |
| 보유 원화 −1 | INVALID_CASH_INPUT |
| 오프셋 "x" | INVALID_CASH_INPUT |
| 모든 값 0 | 허용 (부족분 0) |
| 환율 0 | INVALID_RATE |

**R18.** 자연어 문장에 숫자(쉼표·소수 허용)와 통화 표기(유로·EUR·€ / 엔·JPY·¥ / 바트·THB·฿, 앞뒤 어디든)가 붙어 있으면, 시스템은 그 숫자를 필요 현금으로 쓴다. 여행 국가와 다른 통화면 CURRENCY_MISMATCH, 금액이 없으면 AMOUNT_NOT_FOUND, 1,000,000을 넘으면 AMOUNT_OUT_OF_RANGE, 통화가 붙은 금액이 둘 이상이면 AMOUNT_AMBIGUOUS 오류를 돌려준다. 카드·잔액 등은 문장에서 뽑지 않는다.
| 문장 | 국가 | 결과 |
|---|---|---|
| "현금 3,000바트 필요해" | TH | 3000 |
| "€150 필요" | FR | 150 |
| "150.5 EUR 필요" | FR | 150.5 |
| "0유로" | FR | 0 (→ R10 준비 완료) |
| "1,000,000유로" | FR | 1000000 |
| "1,000,001유로" | FR | AMOUNT_OUT_OF_RANGE |
| "3000바트" | FR | CURRENCY_MISMATCH |
| "현금 150 필요해" | FR | AMOUNT_NOT_FOUND (통화 없음) |
| "100유로랑 50유로" | FR | AMOUNT_AMBIGUOUS |

**R19.** 사용자가 현장 환율표(1단위당 0.01 ~ 1,000,000원, 고정 수수료 0 ~ 10,000,000원 정수)를 입력하고 확인 체크를 하면, 시스템은 환율표를 저장하고 후보 C에만 적용하며 상세에 "직접 확인한 적용 환율"과 입력 시각(KST)을 표시한다. 체크가 없으면 BOARD_NOT_CONFIRMED, 환율 범위 밖이면 INVALID_RATE, 수수료 범위 밖이면 INVALID_AMOUNT 오류를 던진다.
| 환율 | 수수료 | 체크 | 결과 |
|---|---|---|---|
| 1600 | 500 | false | BOARD_NOT_CONFIRMED |
| 0.01 | 0 | true | 저장 |
| 0.009 | 0 | true | INVALID_RATE |
| 1,000,000 | 10,000,000 | true | 저장 |
| 1,000,000.01 | 0 | true | INVALID_RATE |
| 1600 | 10,000,001 | true | INVALID_AMOUNT |

**R20.** 카드가 있고 부족분이 0보다 크면, 시스템은 후보 목록과 별도로 "부족분을 카드로 결제할 때 비용 = R8(부족분, 카드)" 문장을 보여 준다. 카드가 none이면 카드 발급·사용 가능 확인 안내만 한다.
| 카드 | 부족분 | 문장 |
|---|---|---|
| travel | 70 | 110,600원 |
| standard | 70 | 112,038원 (112,037.8) |
| none | 70 | 카드 발급·사용 확인 안내 |
| travel | 0 | 표시 안 함 |

**R21.** 간편 환율 계산기를 쓰면, 시스템은 현지통화 → 원화 round(금액 × 기준환율), 원화 → 현지통화 round2(원화 ÷ 기준환율)를 돌려주고 "내장 시연 데이터 · 실시간 조회 없음"과 시연 버전 날짜를 적는다.
| 입력 | 결과 |
|---|---|
| €100 → 원 (FR) | 158,000 |
| 100,000원 → € (FR) | 63.29 |
| 1원 → € (FR) | 0 (0.00063) |
| 1,000원 → ¥ (JP) | 105.26 |
| 0 | 0 |

**R22.** 후보가 있으면 시스템은 해당 가상 장소 상세를 보여 주고, 후보에서 빠진 장소는 "현재 조건에서 비교할 수 없는 가상 장소"로 안내한다. 실제 주소·길찾기는 연결하지 않는다.
| 조건 | 상세 | 비교 불가 |
|---|---|---|
| 기준 | A · B · C | 없음 |
| 카드 none | C | A · B |
| 부족분 0 | 없음 | A · B · C |

## 1.4 택스 리펀드 (3페이지, 프랑스 전용)

세관 절차는 PABLO 하나이고 환급은 판매자(환급 사업자)가 한다. 옵션은 "세관 확인 전(선환급) / 후" 기준으로 나눈다.

목표는 **원화 실지출을 가장 적게 만드는 것**이다. 시점별로 할 일은 다음과 같다.
① **구매 전**: 경로를 고른다 (R54)
② **구매 직후**: 영수증을 등록하고 서류를 챙긴다 (R24~R27, R52)
③ **출국**: 세관 확인을 받는다 (R36, R55)
④ **귀국 후**: 실제 수령액을 확인한다 (R53, R34, R45)

세관 확인 결과와 사업자 입금은 자동으로 확인하지 않는다. 사용자가 표시한 값으로 판정하며, 화면에 "세관 · 사업자 처리는 자동 확인되지 않아요"를 표시한다.

**금액 표시 규칙**: 모든 환급 금액 옆에 아래 넷 중 하나를 표시한다.

| 표시 | 뜻 |
|---|---|
| 추정 | R29 시연 환급률 |
| 현장 확인 필요 | 매장 지원 "모름" (R54) |
| 확인됨 | 등록한 BVE 금액 (R52) |
| 실제 | R45 수령액 |

**R23.** 여행 국가가 FR이 아니면, 시스템은 영수증 등록 시 UNSUPPORTED_COUNTRY 오류를 던지고 기존 프랑스 영수증은 별도 시연으로 계속 보여 준다.
| 국가 | 결과 |
|---|---|
| FR | 등록 |
| JP / TH | UNSUPPORTED_COUNTRY |

**R24.** 영수증을 등록하면, 시스템은 매장명(앞뒤 공백 제거, 1 ~ 80자, 위반 시 INVALID_STORE), 구매일, 금액(€0.01 ~ 1,000,000, 위반 시 INVALID_AMOUNT), 결제 수단(travel · standard · cash), VAT 번호(선택), 자격(비EU 거주 · 16세 이상 · 체류 6개월 미만 · 여권 제시), 즉시환급 지원, 시내 창구 지원을 저장한다. 서류 발급은 영수증이 아니라 R52 BVE 등록으로 확인한다. VAT 번호는 공백을 지우고 대문자로 바꾼 뒤 `FR` + 영숫자 2자 + 숫자 9자여야 하고, 아니면 INVALID_VAT 오류를 던진다. 첨부는 JPG · PNG · WebP · PDF 10MB 이하다. JPG · PNG · WebP 사진은 R51로 인식할 수 있고, PDF는 미리보기만 한다.
| 항목 | 값 | 결과 |
|---|---|---|
| VAT 번호 | 빈 값 | 허용 (없음) |
| VAT 번호 | "fr 12 345678901" | FR12345678901 |
| VAT 번호 | "FR12345" | INVALID_VAT |
| 매장명 | "   " | INVALID_STORE |
| 매장명 | 80자 / 81자 | 허용 / INVALID_STORE |
| 금액 | 0 / 0.01 | INVALID_AMOUNT / 허용 |
| 금액 | 1,000,000 / 1,000,000.01 | 허용 / INVALID_AMOUNT |
| 첨부 | PNG 10MB / 10MB + 1B / GIF | 허용 / 거부 / 거부 (화면 안내만) |

**R25.** 정규화(NFC → 앞뒤 공백 제거 → 소문자)한 매장명 · 구매일 · 금액이 모두 같은 영수증이 있으면, 시스템은 DUPLICATE_RECEIPT 오류를 던진다.
| 기존 | 새 영수증 | 결과 |
|---|---|---|
| 파리 백화점 / 11-12 / 420 | " 파리 백화점 " / 11-12 / 420 | DUPLICATE_RECEIPT |
| PARIS Store / 11-12 / 420 | paris store / 11-12 / 420 | DUPLICATE_RECEIPT |
| 파리 백화점 / 11-12 / 420 | 파리 백화점 / 11-12 / 420.01 | 등록 |
| 파리 백화점 / 11-12 / 420 | 파리 백화점 / 11-13 / 420 | 등록 |

**R26.** 시스템은 영수증을 다음 규칙으로 하나의 구매(묶음)로 합산한다(금액 round2, 자격 · 즉시 · 시내 플래그는 모두 참일 때만 참, 결제 수단이 섞이면 mixed).
- 합산 키는 VAT 번호이고, 없으면 정규화한 매장명이다. VAT가 있는 영수증과 없는 영수증은 매장명이 같아도 합치지 않는다.
- 같은 키의 영수증을 날짜순으로 놓고, 아직 묶이지 않은 가장 이른 구매일(시작일)부터 시작일 + 2일까지를 한 묶음으로 한다. 묶음 키는 `합산키|시작일`이다.
| 입력 (같은 키) | 결과 |
|---|---|
| " 파리 백화점 " 11-12 60.1 travel + "파리 백화점" 11-13 50.2 cash | 1묶음 €110.3, 11-12~11-13, 2장, mixed |
| 11-12 + 11-14 | 1묶음 (3일째) |
| 11-12 + 11-15 | 2묶음 |
| 11-12 · 11-14 · 11-15 | [11-12~11-14], [11-15] |
| 같은 VAT, 매장명 "Galeries Haussmann" · "Galeries Rivoli" 11-12 | 1묶음 |
| 같은 매장명, 한 장만 VAT 있음 | 2묶음 |
| 같은 매장·날짜 2장 모두 travel·플래그 T | 1묶음, travel, 플래그 T |

**R27.** 국가 FR · 자격 참 · 합산 금액 €100 초과가 모두 맞으면, 시스템은 환급 옵션(추정)을 만든다. 하나라도 아니면 빈 목록과 맞지 않은 사유를 모두(자격 → €100 순) 안내한다. 옵션이 있고 BVE(R52)가 등록되지 않았으면 "이 매장에서 택스리펀 서류(PABLO 바코드)를 요청하세요"를 알리고, 묶음이 여러 날에 걸치면 "여러 날 구매를 서류 1장으로 묶는 것은 매장이 허용할 때만 가능하고, 같은 도시 지점끼리만 묶을 수 있어요"를 덧붙인다.
| 조건 | 결과 |
|---|---|
| €100.01, 자격 참, BVE 없음 | 옵션 생성 · 서류 요청 알림 |
| €110.3, 2일에 걸침 | 옵션 생성 · 알림 + 여러 날 안내 |
| €100 | 없음 · €100 초과 확인 |
| eligible false | 없음 · 자격 확인 |
| eligible false, €20 | 없음 · 자격 + €100 사유 2개 (순서대로) |
| BVE 등록됨 | 옵션 생성 · 알림 없음 |
| 국가 JP | 없음 |

**R28.** 합산 묶음을 보여 주면, 시스템은 세관 확인 기한 = 묶음 시작일(첫 구매일)이 속한 달의 다음 달부터 세어 3번째 달의 말일을 계산하고, "서류 미확인 시 환급 불가, 전표의 사업자에게 직접 문의"를 안내한다.
| 구매일 | 기한 |
|---|---|
| 2026-11-12 | 2027-02-28 |
| 2026-11-30 | 2027-02-28 |
| 2026-12-01 | 2027-03-31 |
| 2027-11-12 | 2028-02-29 (윤년) |

**R29.** 환급 옵션을 만들면, 시스템은 아래 4종을 만든다(환급액 round2, 값은 시연 가정이며 화면에 "추정"으로 표시).
| 옵션 | 수령 | 환급액 | 환율 계수 | 수령 시점 | 선환급 | 포함 조건 |
|---|---|---|---|---|---|---|
| airport-card | 카드 | 금액 × 12% | 0.995 | 세관 확인 후 1~4주 | 아니오 | 항상 |
| airport-cash | 현금 | max(0, 금액 × 10.5% − 3) | 0.98 | 세관 확인 직후 | 아니오 | 항상 (현금 한도 €1,000은 안내만) |
| store | 구매 시 차감 | 금액 × 10% | 1 | 결제 시점 | 예 | 즉시환급 지원 |
| city | 카드 | max(0, 금액 × 11% − 2) | 0.995 | 신청 즉시 | 예 | 시내 창구 지원 |

| 금액 | 조건 | 결과 (€) |
|---|---|---|
| 420 | 모두 참 | card 50.4 · cash 41.1 · store 42 · city 44.2 |
| 100.01 | 모두 참 | card 12 · cash 7.5 · store 10 · city 9 |
| 420 | 즉시·시내 false | card · cash만 |
| 10,000 | 모두 참 | cash 1,047 (한도 넘어도 포함) |

**R30.** 선환급(store · city)을 고르면, 시스템은 반송 기한 = 환급일 + 21일, 미이행 시 청구 예상액 = round(환급 원화 × 1.15)를 보여 주고, 반송 기한과 R28 기한 중 이른 날을 실제 기한으로 쓴다. store 환급일은 구매일, city 환급일은 사용자가 입력하며, 환급일이 구매일보다 앞서면 INVALID_REFUND_DATE 오류를 던진다. 보증 카드(본인 명의, 6개월 이상 유효)와 21일 반송 조건을 안내한다. BVE(R52)가 등록된 묶음은 환급 원화 대신 BVE 예정 원화로 청구 예상액을 계산한다.
| 구매일 | 환급일 | 반송 기한 | 실제 기한 |
|---|---|---|---|
| 2026-11-12 | 2026-11-12 (store) | 2026-12-03 | 2026-12-03 |
| 2026-11-12 | 2026-11-14 (city) | 2026-12-05 | 2026-12-05 |
| 2026-12-10 | 2026-12-20 | 2027-01-10 | 2027-01-10 |
| 2026-11-30 | 2027-02-20 | 2027-03-13 | 2027-02-28 (세관 기한) |
| 2026-11-12 | 2026-11-11 | — | INVALID_REFUND_DATE |

| 조합 | 청구 예상액 |
|---|---|
| travel + store (66,360) | 76,314 |
| travel + city (69,487) | 79,910 (79,910.05) |
| airport 옵션 | 0 |

**R31.** 조합을 계산하면, 시스템은 travel · standard · cash 각각에 모든 옵션을 붙여 결제 원화 = R8(합산 금액, 수단), 환급 원화 = round(환급액 × 기준환율 × 환율 계수)(store는 결제 원화 − R8(round2(금액 − 환급액), 수단)), 최종 실지출액 = 결제 원화 − 환급 원화를 계산한다.
**R32.** 조합을 보여 주면, 시스템은 최종 실지출액 오름차순(같으면 선환급 아닌 쪽 먼저)으로 정렬하고 첫 행에 "최저", 요약에 최고 − 최저 차액, 선환급 행에 "21일 내 미확인 시 N원 청구"를 붙인다. 계산식 문구는 "결제금액 × 결제환율 + 결제수수료 − (수수료 차감 후 환급금 × 환급환율)".

€420, 환율 1,580, 모두 참 → 12행
| 순위 | 수단 | 옵션 | 결제 원화 | 환급 원화 | 실지출액 |
|---|---|---|---|---|---|
| 1 최저 | travel | airport-card | 663,600 | 79,234 | 584,366 |
| 2 | standard | airport-card | 672,227 | 79,234 | 592,993 |
| 3 | travel | city | 663,600 | 69,487 | 594,113 |
| 4 | travel | store | 663,600 | 66,360 | 597,240 |
| 5 | cash | airport-card | 676,872 | 79,234 | 597,638 |
| 6 | travel | airport-cash | 663,600 | 63,639 | 599,961 |
| 7 | standard | city | 672,227 | 69,487 | 602,740 |
| 8 | standard | store | 672,227 | 67,223 | 605,004 |
| 9 | cash | city | 676,872 | 69,487 | 607,385 |
| 10 | standard | airport-cash | 672,227 | 63,639 | 608,588 |
| 11 | cash | store | 676,872 | 67,687 | 609,185 |
| 12 최고 | cash | airport-cash | 676,872 | 63,639 | 613,233 |
- 차액 28,867원. city false면 9행, 즉시·시내 모두 false면 6행.

보여 주는 행은 상황에 따라 다르다. 구매 전 비교(R54)는 3수단 × 옵션 전부를 보여 준다. 등록한 묶음은 이미 결제했으므로 그 묶음의 결제 수단 행만 보여 주고, mixed면 전부 보여 주며 "결제 수단이 섞여 있어요"를 표시한다. BVE가 등록된 묶음은 경로가 확정됐으므로 BVE 수령 방식 1행만 "확인됨"으로 보여 준다.
| 상황 (€420, 모두 지원) | 보이는 행 |
|---|---|
| 구매 전 비교 | 12행 |
| 등록 묶음 travel | travel 4행, 1위 airport-card 584,366 |
| 등록 묶음 mixed | 12행 + 안내 |
| BVE airport-card €50.4 | 1행, 환급 원화 79,234 (확인됨) |

**R33.** 사용자가 묶음의 환급 옵션을 고르면, 시스템은 묶음별로 저장하고, 고른 적이 없으면 airport-card를 선택으로 본다. BVE가 등록되면 선택은 BVE 수령 방식으로 고정된다.
| 상태 | 선택 |
|---|---|
| 고른 적 없음 | airport-card |
| city 선택 후 다시 열기 | city |
| 옵션 없는 묶음 | 선택 없음 |

**R34.** 사용자가 묶음을 가계부에 연결하면, 시스템은 거래(카테고리 쇼핑, 결제 수단 = 묶음 수단)를 만든다. BVE(R52)가 등록돼 있으면 환급 원화(환급 예정 · 즉시 차감)로 BVE 예정 원화를 쓴다. 수단이 mixed면 MIXED_METHOD, 이미 연결된 묶음이면 ALREADY_LINKED 오류를 던진다. 이름 · 날짜가 같고 금액이 합산 금액 또는 (store면) 차감 후 금액과 같은 수동 구매 거래가 있으면 새로 만들지 않고 그 거래를 갱신한다.
- store: 금액 = round2(합산 − 환급액), 원화 비용 = 실지출액, 환급 예정 0, 실제 환급 0(확정), 즉시 차감액 = 환급 원화.
- 그 외: 금액 = 합산, 원화 비용 = 결제 원화, 환급 예정 = 환급 원화, 실제 환급 미기록.
- 선환급이면 반송 기한과 청구 예상액을 함께 저장한다. 비교 기록(선택 · 최저 · 같은 수단 store · 같은 수단 airport-card 실지출액)도 저장한다.

| 상황 (€420 travel) | 결과 |
|---|---|
| airport-card | 새 거래 420 · 663,600 · 수수료 0 · 예정 79,234 · 실제 미기록 |
| store, 2026-11-12 | 새 거래 378 · 597,240 · 예정 0 · 실제 0 · 즉시 차감 66,360 · 반송 2026-12-03 · 청구 76,314 |
| city, 2026-11-14 | 새 거래 420 · 663,600 · 예정 69,487 · 반송 2026-12-05 · 청구 79,910 |
| store, 수동 거래 "파리 백화점" 11-12 €420 | 수동 거래 갱신 (378로) |
| store, 수동 거래 €378 | 수동 거래 갱신 |
| airport-card, 수동 거래 €378 | 새 거래 생성 |
| mixed 묶음 | MIXED_METHOD |
| 두 번째 연결 | ALREADY_LINKED |
| store 연결 시 비교 기록 | 선택 597,240 · 최저 584,366 · 같은 수단 store 597,240 · 같은 수단 airport-card 584,366 |

**R35.** 사용자가 영수증 묶음을 삭제하면, 시스템은 연결된 가계부 거래를 남기고, 선택 중이던 묶음이면 선택을 비운다.
| 상황 | 결과 |
|---|---|
| 연결된 묶음 삭제 | 거래 남음 |
| 선택 중 묶음 삭제 | 선택 없음 |
| 다른 묶음 삭제 | 선택 유지 |

**R36.** 사용자가 출국 경로(공항 자유 입력, 기본 "파리 샤를드골 (CDG)" · 최종 EU 출국 국가 FR/다른 EU)를 저장하면, 시스템은 안내와 3단계 체크리스트(매장에서 / 출국 전 / 최종 EU 출국 시)를 R28 · R30 날짜로 채워 보여 주고, 프랑스 세관 공식 PABLO 페이지를 연결한다. 창구 위치는 공식 안내로 확인된 경우에만 표시한다.
| 시점 | 안내 |
|---|---|
| 매장에서 | 여권 제시 · 택스리펀 서류 요청 · 수령 방식 확인 · 선환급(store · city)이면 보증 카드(본인 명의, 6개월 이상 유효) |
| 출국 전 | 물건은 사용하지 않고 포장 그대로 · 서류와 여권 준비 · 실제 기한 D-day (선환급이면 반송 기한) |
| 최종 출국 FR | ① 체크인 · 짐 부치기 전에 PABLO 키오스크 ② 초록 화면이면 완료(화면 캡처 권장) ③ 빨간 화면 · 고장 · 바코드 없음이면 세관 창구 도장 → 서류를 사업자 봉투로 우편함 투함 ④ 그다음 보안검색(통과 후 되돌아올 수 없음) |
| 최종 출국 다른 EU | 그 나라 세관 도장 필요 · 서류 출력본 필요 · 프랑스 자동 완료 아님 · 판매자가 6개월 안에 전표 수령 |

| 출국 국가 | 선택 옵션 | 핵심 안내 |
|---|---|---|
| FR | airport-card | 짐 부치기 전 PABLO 키오스크 · 빨간 화면이면 창구 도장과 우편함 투함 · 출국 전: 물건·여권·서류 준비 |
| FR | store (2026-11-12) | 매장: 카드 보증 · 출국 전: 반송 기한 2026-12-03 D-day |
| 다른 EU | airport-card | 그 나라 세관 도장 필요, 프랑스 자동 완료 아님, 판매자가 6개월 안에 전표 수령 |
| 공항 빈 값 | — | 기본값 "파리 샤를드골 (CDG)" |

**R52.** 사용자가 묶음에 BVE(환급 서류)를 등록하면, 시스템은 아래를 검증해 저장하고 예정 원화를 계산한다. 다시 등록하면 덮어쓴다. 예정 원화는 airport-card · airport-cash · city면 round(예정액 × 기준환율 × R29 환율 계수), store면 R8(합계, 수단) − R8(round2(합계 − 예정액), 수단)이다.
| 항목 | 규칙 | 위반 시 |
|---|---|---|
| 환급사업자 | Global Blue · Planet · 매장 직접 · 기타(앞뒤 공백 제거 1~40자) | INVALID_BVE |
| 서류번호 | 선택, 1~40자 | INVALID_BVE |
| 발행일 | 묶음 시작일 이후 | INVALID_BVE_DATE |
| PABLO 바코드 | 기본값 참 | — |
| 수령 방식 | airport-card · airport-cash · store · city | — |
| 환급 예정액(€) | €0.01 이상, round2(합계 × 20 ÷ 120) 이하 | INVALID_REFUND_AMOUNT |

| 묶음 / 입력 | 결과 |
|---|---|
| €420 travel / airport-card €50.4 | 등록, 예정 원화 79,234 |
| €420 / €70 | 등록 (상한) |
| €420 / €70.01 | INVALID_REFUND_AMOUNT |
| €110.3 / €18.38 · €18.39 | 등록 · INVALID_REFUND_AMOUNT |
| 시작일 11-12, 발행 11-11 | INVALID_BVE_DATE |
| 사업자 "" | INVALID_BVE |

**R53.** 시스템은 묶음마다 오늘 날짜를 받아 환급 상태를 아래 표의 위에서부터 처음 맞는 것으로 판정한다. 실제 기한은 R30을 따른다(store · city는 반송 기한과 세관 기한 중 이른 날, 나머지는 R28 기한).
| 순서 | 상태 | 조건 |
|---|---|---|
| 1 | 완료 | 실제 수령액 기록됨(R45), 또는 store · city에서 세관 확인됨 |
| 2 | 입금 지연 | 세관 확인 후 오늘 > 확인일 + 42일(시연 가정). 오늘 > 발행일 + 6개월이면 "사업자 처리 기한 지남, 바로 문의"를 덧붙인다 |
| 3 | 환급 대기 | 세관 확인됨 |
| 4 | 기한 만료 | 세관 미확인 · 오늘 > 실제 기한. "환급 불가"를 표시하고, 선환급이면 청구 예상액을 표시한다 |
| 5 | 세관 확인 필요 | BVE 등록됨 |
| 6 | 서류 미발급 | R27 옵션 있음 · BVE 없음 |
| — | 해당 없음 | 나머지 |

| 묶음 (시작 2026-11-12, €420 travel, 세관 기한 2027-02-28) | 오늘 | 상태 |
|---|---|---|
| BVE 없음 | 2026-11-20 | 서류 미발급 |
| BVE airport-card 11-12, 미확인 | 2026-11-20 | 세관 확인 필요 |
| 같음 | 2027-03-01 | 기한 만료 |
| 확인 2026-11-25 | 2027-01-06 | 환급 대기 |
| 확인 2026-11-25 | 2027-01-07 | 입금 지연 |
| 확인 2026-11-25 | 2027-05-13 | 입금 지연 + 처리 기한 지남 |
| 확인 2026-11-25, 수령 기록 | — | 완료 |
| BVE store 11-12 €42, 미확인 | 2026-12-04 | 기한 만료 · 청구 예상 76,314 |
| BVE store, 확인 2026-11-20 | — | 완료 |
| €100 묶음 | — | 해당 없음 |

**R54.** 사용자가 구매 예정 금액(€0.01 ~ 1,000,000, 위반 시 INVALID_AMOUNT)과 매장 지원(즉시환급 · 시내 창구 각각 예 / 아니오 / 모름)을 입력하면, 시스템은 구매 전 비교를 보여 준다. 기본 결제 수단은 여행 정보의 보유 카드이고 none이면 cash다.
| 출력 | 내용 |
|---|---|
| 대상 여부 | €100 초과면 대상. 아니면 "€X 더 사면 대상 (같은 매장 3일 합산 가능)", X = round2(100.01 − 금액) |
| 조합 | R31 · R32로 3수단 전부. 지원 "아니오"는 제외, "모름"은 포함하되 "현장 확인 필요"로 표시 |
| 행마다 | 실지출 · 최저 대비 차이(+N원, 최저 행은 "최저") · 수령 시점과 편의 메모 · 매장에서 할 말 |
| 최저 | "현장 확인 필요"가 아닌 행 중 실지출이 가장 낮은 행. "최저" 배지만 붙이고 선택을 강제하지 않는다 |
| 절약액 | 기본(기본 수단 + airport-card) 실지출 − 최저 실지출. 0이면 "지금 계획이 이미 최저예요" |
| 선택 | 사용자가 행을 고르면 그 행의 "매장에서 할 말"을 보여 준다. 처음에는 최저 행이 선택돼 있다 |

| 옵션 | 수령 시점 | 편의 메모 | 매장에서 할 말 |
|---|---|---|---|
| airport-card | 세관 확인 후 1~4주 | 공항 키오스크 필요 · 카드로 입금 | "택스리펀 서류 발급해 주세요. 환급은 카드로 받을게요." / "Tax free form, please. Refund to my card." |
| airport-cash | 세관 확인 직후 | 공항 환급 창구 대기 · 현금으로 바로 받음 | "택스리펀 서류 발급해 주세요. 공항에서 현금으로 받을게요." / "Tax free form, please. Cash refund at the airport." |
| store | 결제 시점 | 바로 할인 · 21일 안에 세관 확인이 안 되면 카드로 청구 | "즉시 환급 되나요? 보증 카드 등록할게요." / "Immediate tax refund, please. I'll register my card." |
| city | 신청 즉시 | 시내 창구 방문 · 21일 안에 세관 확인이 안 되면 카드로 청구 | "택스리펀 서류 발급해 주세요. 시내 창구에서 받을게요." / "Tax free form, please. I'll claim at the city office." |

| 입력 | 결과 |
|---|---|
| €420, 카드 travel, 즉시 · 시내 예 | travel 행: airport-card 584,366 최저 · city 594,113 +9,747 · store 597,240 +12,874 · airport-cash 599,961 +15,595 |
| €420, 카드 travel, 즉시 예 · 시내 모름 | 12행(city 3행은 현장 확인 필요), 최저 travel + airport-card 584,366, 절약 0 · "지금 계획이 이미 최저예요" |
| €420, 카드 standard, 즉시 예 · 시내 아니오 | 9행, 최저 travel + airport-card 584,366, 절약 8,627원 |
| €420, 카드 none, 즉시 · 시내 아니오 | 6행, 기본 cash + airport-card 597,638, 절약 13,272원 |
| store 행 선택 | 매장에서 할 말 = store 문구 |
| €100 / €80 | 대상 아님, "€0.01 더 사면 대상" / "€20.01 더 사면 대상" |
| €0 | INVALID_AMOUNT |

**R55.** "세관 확인 필요" 묶음마다 시스템은 "세관 확인했어요" 버튼을 보여 준다(화면). 확인일 기본값은 오늘이며, 확인일이 BVE 발행일보다 앞서거나 오늘보다 뒤면 INVALID_CONFIRM_DATE 오류를 던진다. "빨간 화면이었어요"를 고르면 R36의 창구 · 투함 안내를 보여 주고 투함까지 체크해야 확인으로 표시한다. 오늘이 귀국일(R3) 이후인데 "세관 확인 필요" 묶음이 있으면 3페이지 상단에 "PABLO 초록 화면을 봤나요?" 배너를 띄운다.
| 상황 | 결과 |
|---|---|
| 발행 11-12, 확인 11-25, 오늘 11-30 | 확인 저장 → 환급 대기 |
| 발행 11-12, 확인 11-11 | INVALID_CONFIRM_DATE |
| 확인일이 오늘보다 뒤 | INVALID_CONFIRM_DATE |
| 오늘 ≥ 귀국일, 세관 확인 필요 1건 | 배너 표시 |

**R56.** (P1) 묶음마다 BVE · 키오스크 화면 · 우편 투함 사진을 각 1장씩 브라우저(IndexedDB)에만 보관하고 서버로 보내지 않는다.

**R57.** (P1) BVE 사진과 환급 입금 캡처를 R51 방식으로 읽어 R52 · R45 입력칸 초안을 채운다. 저장은 사용자가 확인한 뒤에만 한다.

**R51.** 사용자가 영수증 사진(JPG · PNG · WebP, 10MB 이하)을 올리면, 시스템은 Anthropic Claude `claude-haiku-5-5`로 매장명 · 구매일 · 금액(€) · 결제 수단을 읽어 입력칸 초안으로 돌려준다. 초안은 저장하지 않으며, 사용자가 확인 · 수정 후 "등록"을 눌러야 R23~R25 검증을 거쳐 등록된다. 결제 수단은 현금이면 cash, 카드면 트래블 · 일반을 알 수 없으므로 비워 둔다. 자격 · 즉시환급 · 시내 창구는 사진에서 읽지 않는다. 읽지 못한 항목은 비워 두고, 금액은 소수 둘째 자리로 반올림한다(C2). 카드번호는 돌려주지 않는다. 화면에는 "사진이 Claude로 전송된다"는 안내를 표시하고, 서버는 사진을 저장하지 않는다. 파일 형식 · 크기가 맞지 않으면 INVALID_FILE, API 키(`ANTHROPIC_API_KEY`)가 없으면 OCR_UNAVAILABLE, 호출 실패 · 30초 초과 · 응답 형식 오류면 OCR_FAILED 오류를 돌려주고, 화면은 빈 입력칸(수동 입력)을 보여 준다.
| 상황 | 결과 |
|---|---|
| 인식 `{store:"Galeries Paris", date:"2026-11-12", amount:420.00, payment:"card"}` | 초안 Galeries Paris · 2026-11-12 · 420 · 결제 수단 비움 |
| payment "cash" | 결제 수단 cash |
| amount 420.005 | 420.01 |
| date null (읽지 못함) | 구매일 비움, 나머지 채움 |
| PNG 10MB / 10MB + 1B | 인식 / INVALID_FILE |
| GIF · PDF | INVALID_FILE |
| `ANTHROPIC_API_KEY` 없음 | OCR_UNAVAILABLE |
| 응답 JSON 깨짐 · 30초 초과 | OCR_FAILED |
| 인식 요청 1건(성공 · 실패 모두) | MySQL `ocr_history`에 1행: 요청 시각 · 모델 · 파일 형식 · 크기 · 결과 코드(OK 또는 오류 코드) · 인식한 매장명 · 구매일 · 금액 · 결제 수단. 사진과 카드번호는 저장하지 않는다 |
| 이력 저장 실패(DB 끊김 등) | 인식 결과는 그대로 돌려주고 서버 로그에 WARN만 남긴다 |

## 1.5 여행 가계부 (4페이지)

**R37.** 거래를 기록하면, 시스템은 유형(purchase · atm · topup), 카테고리(음식 · 쇼핑 · 교통 · 숙박 · 관광 · 기타), 결제 수단(travel · standard · cash), 항목명(1 ~ 80자), 금액(0.01 ~ 1,000,000 현지통화)과 기록 당시 국가·환율을 저장한다. 금액이 범위 밖이면 INVALID_AMOUNT, 항목명이 범위 밖이면 INVALID_NAME (새 코드) 오류를 던진다.
| 항목 | 값 | 결과 |
|---|---|---|
| 금액 | 0 / 0.01 / 1,000,000 / 1,000,000.01 | 오류 / 허용 / 허용 / 오류 |
| 항목명 | 80자 / 81자 | 허용 / INVALID_NAME |

**R38.** purchase를 기록하면, 시스템은 원화 비용 = R8(금액, 수단), 수수료 = 원화 비용 − round(금액 × 기준환율)로 계산한다.
**R39.** atm을 기록하면 원화 비용 = round(금액 × 환율), 수수료 = round(운영사수수료 × 환율), topup이면 원화 비용 = round(금액 × 환율), 수수료 = round(금액 × 환율 × 0.2%)로 계산하고, 둘 다 소비 합계에는 수수료만 넣는다.
| 유형 | 금액 | 수단 | 원화 비용 | 수수료 | 합계 반영 |
|---|---|---|---|---|---|
| purchase | 48 | cash | 77,357 | 1,517 | 77,357 |
| purchase | 85 | travel | 134,300 | 0 | 134,300 |
| purchase | 0.01 | standard | 16 | 0 | 16 |
| atm | 100 | travel | 158,000 | 4,740 | 4,740 |
| topup | 100 | travel | 158,000 | 316 | 316 |
| topup | 0.01 | travel | 16 | 0 (0.0316) | 0 |

**R40.** 정규화한 항목명 · 금액 · 날짜 · 국가 · 유형이 모두 같은 거래가 있으면, 시스템은 DUPLICATE_EXPENSE 오류를 던진다.
| 기존 | 새 거래 | 결과 |
|---|---|---|
| 카페 / 48 / 11-12 / FR / purchase | " 카페 " / 48 / 11-12 / FR / purchase | DUPLICATE_EXPENSE |
| 같음 | 유형만 atm | 기록 |
| 같음 | 금액 48.01 | 기록 |

**R41.** 항목명을 입력하면, 시스템은 키워드로 카테고리를 추천하고 사용자가 바꿀 수 있게 한다(음식 → 숙박 → 교통 → 쇼핑 → 관광 순으로 먼저 맞는 것).
| 항목명 | 추천 |
|---|---|
| 동네 카페에서 아침 | 음식 |
| 센 강 근처의 숙소 | 숙박 |
| 공항에서 숙소까지 | 숙박 (숙소·공항 둘 다 → 순서상 숙박) |
| 지하철 | 교통 |
| 마레 지구 기념품 | 쇼핑 |
| 미술관 관람 | 관광 |
| 우산 | 기타 |

**R42.** 가계부 요약을 보여 주면, 시스템은 금융 비용 = Σ수수료, 총 기록 비용 = Σ(purchase 원화 비용) + Σ(atm·topup 수수료), 실제 환급 = Σ실제 환급(미기록 0, 0원은 기록으로 봄), 환급 예정 = Σ(실제 미기록 거래의 환급 예정액), 현재 실지출액 = 총 기록 비용 − 실제 환급, 예정 반영 예상액 = 현재 실지출액 − 환급 예정을 계산한다.
| 거래 (유형 / 비용 / 수수료 / 예정 / 실제) | fees | gross | actual | pending | net | projected |
|---|---|---|---|---|---|---|
| purchase 100,000/1,000/12,000/미기록 · atm 200,000/3,000 · topup 100,000/200 | 4,200 | 103,200 | 0 | 12,000 | 103,200 | 91,200 |
| purchase 10,000/0/1,000/**0** · purchase 20,000/0/2,000/1,800 | 0 | 30,000 | 1,800 | 0 | 28,200 | 28,200 |
| 거래 없음 | 0 | 0 | 0 | 0 | 0 | 0 |

**R43.** 예산 사용률 = 총 기록 비용 ÷ 예산 × 100(소수 첫째 자리 반올림)이 100%를 넘으면 시스템은 "예산 초과 N원", 아니면 "남은 예산 N원"을 보여 준다(N은 원 단위 차액).
| 예산 | gross | 결과 |
|---|---|---|
| 3,000,000 | 663,600 | 22.1% · 남은 예산 2,336,400원 |
| 663,600 | 663,600 | 100.0% · 남은 예산 0원 |
| 663,599 | 663,600 | 100.0% · 예산 초과 1원 (표시 % 아닌 금액으로 판단) |
| 3,000,000 | 0 | 0.0% · 남은 예산 3,000,000원 |

**R44.** 카테고리 비율과 현금·카드 비율을 보여 주면, 시스템은 purchase 원화 비용을 기준으로 하고 합계가 0이면 차트를 비운다.
| 거래 | 결과 |
|---|---|
| purchase 음식 77,357(cash) · 쇼핑 134,300(travel) | 음식 36.5% · 쇼핑 63.5% / 현금 36.5% · 카드 63.5% (비율 소수 1자리) |
| atm만 있음 | 차트 비움 |

**R45.** 사용자가 실제 환급 수령액(0 ~ 1,000,000,000원 정수)을 기록·수정하면, 시스템은 이후 리포트에 예정액 대신 실제액을 쓴다. 범위 밖이면 INVALID_AMOUNT, store로 연결된 거래면 REFUND_ALREADY_APPLIED 오류를 던진다.
| 거래 | 수령액 | 결과 |
|---|---|---|
| airport-card 연결 | 0 | 기록 (실제 0원) |
| airport-card 연결 | 1,000,000,000 | 기록 |
| airport-card 연결 | −1 / 1.5 / 1,000,000,001 | INVALID_AMOUNT |
| store 연결 | 66,360 | REFUND_ALREADY_APPLIED |

**R46.** AI 리포트를 만들면, 시스템은 총 기록 비용 · 현재 실지출액 · (예정 있으면) 예정 반영 예상액 · 최다 카테고리 · 외화카드 결제 절감액(travel purchase마다 max(0, R8(금액, cash, 기록 환율) − 원화 비용)의 합) · 연결된 영수증마다 선택 방식과 (같은 수단의 store · airport-card가 둘 다 있으면) 두 실지출액 차이를 쓴다. 확인되지 않은 대안의 절감액은 쓰지 않는다.
| 거래 | 절감액 |
|---|---|
| travel purchase 85 | 2,686 (136,986 − 134,300) |
| cash purchase 48만 | 0 |
| €420 travel, store·airport-card 둘 다 | 차이 12,874원 |
| €420 travel, store 미지원 | 차이 문장 없음 |

**R47.** 사용자가 거래를 삭제하면 시스템은 영수증 원본을 남기고, 리포트를 내려받으면 요약과 거래 목록을 담은 UTF-8(BOM) 텍스트 파일을 만든다.
| 동작 | 결과 |
|---|---|
| 연결 거래 삭제 | 영수증 · 묶음 남음 |
| 리포트 내려받기 | 파일 첫 3바이트 EF BB BF |
| 거래 0건 내려받기 | 요약 0원 + 빈 목록 |

**R48.** 데이터가 바뀌면, 시스템은 여행 정보 · 영수증 · 거래 · 선택 · 환율표 · 출국 경로를 localStorage `travelback-finance-v2`에 저장한다. 저장에 실패하면 한 번만 안내하고 화면에만 반영하며, 읽은 데이터 형식이 맞지 않으면 시연 기본값을 쓴다.
| 상황 | 결과 |
|---|---|
| 정상 | 저장 후 새로고침해도 유지 |
| 저장 실패 2번 | 안내 1번 |
| 깨진 JSON | 시연 기본값 |
| 키 없음 | 시연 기본값 |

## 1.6 규칙 기반 챗봇 (전 페이지)

**R49.** 질문에 키워드가 있으면, 시스템은 아래 규칙으로 답하고 둘 이상 맞으면 아래쪽 규칙을 쓴다.
1. 기본: 결제·환전·영수증·환급·예산을 돕는다는 안내
2. 카드|결제|수수료 → 보유 수단, 현지통화 결제·DCC, 시연 가산율 0% / 1.3%, 공식 채널 확인
3. 현금|ATM|환전|인출 → 현재 최저 후보 이름·총비용, 없으면 조건 확인 안내
4. 환급|택스|영수증 → 영수증 없음 / 옵션 없음(사유) / 선택 묶음 공항 카드 환급액과 (store 있으면) 실지출액 차이
5. 우리카드|우리은행|외화계좌 + 환급 → 4의 답 + "사업자 지원·카드 매칭 확인 필요, 외화계좌 자동 입금 미보장"
6. 예산|가계부|지출 → R42 요약

**R50.** 답할 때마다 시스템은 "시연 조건" 또는 "확인 필요"를 밝히고, 확인되지 않은 정보를 단정하지 않으며, 참조 문맥(도시 · 통화 · 카드 · 선택 영수증)을 채팅 상단에 보여 준다.

| 질문 | 규칙 | 답의 핵심 |
|---|---|---|
| 내 카드 수수료 얼마야? | 2 | 보유 수단, 0% · 1.3% 시연 가정, 공식 채널 확인 |
| ATM과 환전소 중 어디가 유리해? | 3 | 기준이면 "외화 충전 → 은행 ATM B 113,191원 최저" |
| (부족분 0일 때) 현금 어디서 뽑아? | 3 | 조건 확인 안내 |
| 이 영수증, 공항에서 환급받아야 해? | 4 | 공항 카드 79,234원, 매장 즉시환급보다 12,874원 낮음 |
| 환급금을 우리카드로 받으면? | 4+5 | 4 + 사업자·카드 매칭 확인, 자동 입금 미보장 |
| 우리카드 혜택 알려줘 | 2 | (환급 없음 → 5 아님) |
| 카드 수수료랑 환급 둘 다 | 4 | 환급 답만 |
| 지금까지 얼마 썼어? | 6 | 총 기록 비용 · 실제 환급 · 실지출액 · 환급 예정 |
| 안녕 | 1 | 기본 안내 |


# 2. 설계

## 2.1 기술과 구성

| 항목 | 선택 | 근거 |
|---|---|---|
| Java | **21** | AGENTS.md의 "Java 21 이상" 규칙, LTS |
| Spring Boot | **4.1.2** | 이전 조회 기록: Context7은 4.1.1 · Java 17~26을 반환했고, 연결된 공식 원문([System Requirements](https://docs.spring.io/spring-boot/system-requirements.html))을 직접 확인한 결과는 4.1.2 · Java 17~27이었다. 공식 원문 확인 결과를 따른다. |
| Gradle | **Wrapper 8.14.3** | 공식 문서의 "Gradle 8.14 이상" 조건 |
| 테스트 | **JUnit 6.0.3** (spring-boot-starter-webmvc-test) | Spring Boot 4.1.2가 관리하는 버전(`spring-boot-dependencies-4.1.2.pom`의 `junit-jupiter.version`). 작성 방식(`@Test`, `assertThrows`)은 JUnit 5와 같다. |
| OCR | **Spring AI 2.0.1** (`spring-ai-bom`, `spring-ai-starter-model-anthropic`), 모델 `claude-haiku-5-5` | 2026-10-27 AGENTS.md 참고 저장소(WONIT-A/05_springAI)의 Spring AI BOM 버전에 맞춤. R51 영수증 사진 인식에만 쓴다. 키는 환경 변수 `ANTHROPIC_API_KEY`. |
| DB | **MySQL 8** (`spring-boot-starter-data-jpa`, `mysql-connector-j`), 테스트는 **H2** 메모리 DB | 2026-10-27 OCR 인식 이력(R51) 저장용. 참고 저장소(WONIT-A/05_springAI)의 JPA · MySQL 구성을 따른다. 접속 정보는 `.env`의 `DB_URL` · `DB_USERNAME` · `DB_PASSWORD` |

- Spring MVC 서버 하나가 정적 화면 4페이지(HTML·CSS·JS)와 챗봇, **상태 없는 계산 API**를 함께 제공한다.
- 데이터 저장은 R48대로 브라우저 localStorage(`travelback-finance-v2`)에 둔다. 예외로 OCR 인식 이력(R51)만 서버 MySQL `ocr_history`에 쌓는다. 중복 검사·연결 여부 확인이 필요한 API는 화면이 기존 목록을 요청에 함께 보낸다. DB는 쓰지 않는다.
- R6(국가 변경 시 환율표 삭제), R33(선택 저장), R35(삭제), R48(localStorage)은 화면(JS) 상태 관리로 처리한다.
- 화면은 팀 React·Vite 앱(`frontend/`)이 기준이다. 개발 서버(5173)는 `/api` 요청을 Spring 서버(`http://localhost:8080`, 환경 변수 `API_TARGET`으로 바꿀 수 있음)로 넘긴다(Vite `server.proxy`). Spring 정적 화면(`src/main/resources/static`)은 예비 시연용으로 남긴다.
- 3페이지: R26 합산 · R27 알림 · R28/R30 기한 · R52 BVE · R53 상태 · R54 구매 전 비교는 서버 도메인(JUnit)으로 만들고, 3페이지(`RefundPage.jsx`)는 API 20(사진 인식)과 API 21~23을 호출해 결과를 쓴다. 서버가 꺼져 있으면 3페이지에만 "서버 연결이 필요해요" 안내를 띄우고 다른 페이지는 그대로 동작한다. BVE · 세관 확인일 · 상태 기준일은 기존 localStorage 상태(`travelback-finance-v2`)에 함께 저장하고 요청에 보낸다(R55는 화면 처리).
- 라이브러리는 Boot web · test 스타터(`spring-boot-starter-webmvc`, `spring-boot-starter-webmvc-test` — Boot 4.1.2 POM에서 `spring-boot-starter-web`은 deprecated로 확인)와 Spring AI Anthropic 스타터만 쓴다. 검증은 도메인에서 직접 한다.
- 업로드 한도는 `application.properties`의 `spring.servlet.multipart.max-file-size=10MB`(기본 1MB)로 맞춘다.

## 2.2 도메인 객체와 맡은 일

기본 패키지 `com.example.travelback`. 도메인 객체는 HTTP를 모르고, 오류는 `DomainException(ErrorCode)`로 던진다.

| 패키지 | 객체 | 맡은 일 (요구사항) |
|---|---|---|
| common | `Country` (FR/JP/TH) | 통화 · 기준환율 · ATM 운영사 수수료 · 출국 공항 · 택스 리펀드 지원 (1.0) |
| | `PaymentMethod` (TRAVEL/STANDARD/CASH), `CardType` (TRAVEL/STANDARD/NONE) | 가산율 0 / 0.013 / 0.02 (1.0) |
| | `Money` | 원 정수 HALF_UP, 외화 round2 HALF_UP (C1~C3) |
| | `ErrorCode`, `DomainException` | 오류 코드 |
| | `DemoClock` | KST 시각 · 날짜 (`Clock` 주입) |
| trip | `TripInfo`, `TripGuide` | 여행 정보 검증 · 여행 일수 · 맞춤 안내 (R1~R5, R7) |
| payment | `PaymentCostCalculator` | 결제 원화 비용 · 원금 · 수수료 (R8, R9) |
| cash | `CashInput`, `CashCandidateCalculator`, `CashCandidate`, `CashComparison` | 부족분 · 후보 A·B·C · 도보 필터 · 정렬 · 최저 · 차액 (R10~R17) |
| | `CashTextParser` | 자연어 금액 추출 (R18) |
| | `RateBoard` | 현장 환율표 (R19) |
| | `CardPaymentAlternative`, `QuickConverter`, `PlaceGuide` | 카드 대안 · 환율 계산기 · 가상 장소 안내 (R20~R22) |
| refund | `Receipt`, `ReceiptRegistrar`, `VatNumber` | 영수증 검증 · 정규화 · 중복 · VAT 번호 (R23~R25) |
| | `ReceiptGroup`, `ReceiptGrouper` | VAT(없으면 매장명) · 3일 합산 (R26) |
| | `RefundOption`, `RefundOptionPolicy` | 옵션 4종 · 생성 조건 · 미충족 사유 · 서류 요청 알림 · 여러 날 안내 (R27, R29) |
| | `RefundDeadlines` | 세관 기한 · 반송 기한 · 실제 기한 · 환급일 검증 (R28, R30) |
| | `RefundCombination`, `CombinationCalculator` | 결제 × 환급 조합 · 정렬 · 청구 예상액 · 차액 · 보여 줄 행 (R30~R32) |
| | `Bve`, `BveRegistrar` | BVE 검증 · 예정 원화 (R52) |
| | `RefundStatus`, `RefundStatusPolicy` | 환급 상태 판정 · 세관 확인일 검증 (R53, R55) |
| | `PurchasePlanner` | 구매 전 비교 · 최저 대비 차이 · 편의 메모 · 절약액 · 매장에서 할 말 (R54) |
| | `ExitRouteGuide` | 출국 경로 안내 · 3단계 체크리스트 · 키오스크 분기 (R36) |
| | `ReceiptDraft`, `ReceiptReader`(인터페이스), `ReceiptDraftMapper` | 사진 인식 초안 · 파일 검증 · 반올림 · 결제 수단 정리 (R51) |
| ocr | `ClaudeReceiptReader` | `ReceiptReader` 구현, Claude 호출 · 키 확인 · 30초 제한 (R51) |
| | `OcrHistory`(JPA 엔티티), `OcrHistoryRepository`, `OcrHistoryRecorder` | 인식 이력 저장, 저장 실패는 WARN 로그만 (R51) |
| ledger | `Expense`, `ExpenseType`, `Category`, `ExpenseRecorder` | 거래 기록 · 중복 (R37~R40) |
| | `CategorySuggester` | 카테고리 추천 (R41) |
| | `ReceiptLinker` | 영수증 묶음 → 가계부 거래 연결 (R34) |
| | `LedgerSummaryCalculator`, `LedgerSummary` | 요약 · 예산 사용률 · 비율 (R42~R44) |
| | `RefundRecord`, `LedgerReport` | 실제 환급 기록 · 리포트 (R45~R47) |
| chat | `ChatbotResponder` | 규칙 기반 답변 (R49, R50) |

## 2.3 API 계약

- 요청 · 응답은 `application/json`(리포트 다운로드 제외). 계산 API는 상태가 없으므로 `POST`.
- 기준환율은 요청에 받지 않고 `country`로 서버가 찾는다. 기록된 거래는 저장된 `rate`를 쓴다.
- 원화는 JSON 정수, 외화 · 환율은 JSON 숫자이며 서버는 `BigDecimal`로 읽는다(`USE_BIG_DECIMAL_FOR_FLOATS`).

| # | 메서드 · 경로 | 요청 (주요 필드) | 응답 (주요 필드) | 오류 코드 |
|---|---|---|---|---|
| 1 | `GET /api/countries` | — | `[{code, currency, symbol, baseRate, operatorFee, airport, taxRefund}]` | — |
| 2 | `POST /api/trips/validate` | `country, city, departDate, returnDate, budget, cash, card, account` | `{days, guide[3]}` | UNSUPPORTED_COUNTRY, INVALID_CITY, INVALID_PERIOD, INVALID_AMOUNT, INVALID_CARD |
| 3 | `POST /api/payments/cost` | `country, amount, method` | `{principal, fee, cost}` | INVALID_AMOUNT, INVALID_RATE |
| 4 | `POST /api/cash/candidates` | `country, needed, cash, balance, card, account, supported, maxWalk, offset, cashKrw(2페이지 입력, 0~1,000,000,000 정수), board?{rate, fee}, sort: COST\|WALK` | `{shortage, principal, candidates[{id, name, walk, amount, principal, fee, cost, detail, lowest}], spread, cardAlternative, unavailablePlaces[]}` | INVALID_CASH_INPUT, INVALID_RATE |
| 5 | `POST /api/cash/parse` | `text, country` | `{amount}` | CURRENCY_MISMATCH, AMOUNT_NOT_FOUND, AMOUNT_OUT_OF_RANGE, AMOUNT_AMBIGUOUS |
| 6 | `POST /api/cash/boards` | `country, rate, fee, confirmed` | `{rate, fee, country, updatedAt(KST ISO-8601)}` | BOARD_NOT_CONFIRMED, INVALID_RATE, INVALID_AMOUNT |
| 7 | `POST /api/cash/convert` | `country, direction: TO_KRW\|FROM_KRW, amount` | `{result, source, dataVersion}` | INVALID_AMOUNT |
| 8 | `POST /api/receipts` | `country, receipt{store, date, amount, method, vatNumber?, eligible, instant, city}, existing[]` | `{id, ...정규화된 receipt}` | UNSUPPORTED_COUNTRY, INVALID_STORE, INVALID_AMOUNT, INVALID_VAT, DUPLICATE_RECEIPT |
| 9 | `POST /api/receipts/groups` | `receipts[]` | `[{key, store, date, amount, ids, eligible, docs, instant, city, method, country, customsDeadline}]` | — |
| 10 | `POST /api/refunds/analysis` | `group, refundDate?` | `{options[{id, place, receive, refund, fxFactor, early, receiveTime}], reasons[], combinations[{method, id, place, receive, early, gross, refundKRW, net, penaltyKRW, earlyDeadline?, effectiveDeadline}], spread}` | INVALID_REFUND_DATE |
| 11 | `POST /api/refunds/exit-guide` | `exitCountry: FR\|OTHER_EU, airport, group, optionId, refundDate?` | `{airport, guide, checklist{atStore[], beforeDeparture[], atExit[]}, customsLink}` | INVALID_REFUND_DATE |
| 12 | `POST /api/ledger/expenses` | `country, expense{name, amount, type, method, date, category}, existing[]` | `{id, name, amount, type, method, date, category, country, rate, cost, fee, expectedRefund, actualRefund}` | INVALID_AMOUNT, INVALID_NAME, DUPLICATE_EXPENSE |
| 13 | `GET /api/ledger/categories/suggest?name=` | — | `{category}` | — |
| 14 | `POST /api/ledger/links` | `group, optionId, refundDate?, expenses[], linkedKeys[]` | `{mode: CREATED\|UPDATED, expense{... + instantDeduction, earlyDeadline?, penaltyKRW?, comparison{selected, lowest, store, airportCard}}}` | MIXED_METHOD, ALREADY_LINKED, INVALID_REFUND_DATE |
| 15 | `POST /api/ledger/refund-record` | `expense, actualRefund` | 갱신된 거래 | INVALID_AMOUNT, REFUND_ALREADY_APPLIED |
| 16 | `POST /api/ledger/summary` | `expenses[], budget` | `{fees, gross, actual, pending, net, projected, budgetRate, budgetMessage, categoryShares[], methodShares[]}` | — |
| 17 | `POST /api/ledger/report` | `trip, expenses[]` | `{lines[]}` | — |
| 18 | `POST /api/ledger/report/download` | 17과 같음 | `text/plain; charset=UTF-8`, BOM, `Content-Disposition: attachment` | — |
| 19 | `POST /api/chat` | `question, context{city, currency, card, cashComparison?, selectedGroup?, ledger?}` | `{answer, rule}` | — |
| 20 | `POST /api/receipts/ocr` | `multipart/form-data`, 필드 `file` | `{store?, date?, amount?, method?}` | INVALID_FILE, OCR_UNAVAILABLE, OCR_FAILED |
| 21 | `POST /api/refunds/tracker` | `receipts[], bves{groupKey: bve}, confirmations{groupKey: date}, received[groupKey], today` | `[{key, store, startDate, endDate, amount, ids, eligible, instant, city, method, multiDay, customsDeadline, effectiveDeadline, options[], reasons[], alert?, multiDayNote?, status, statusNote?, penaltyKRW?, bveKRW?}]` | INVALID_VAT, INVALID_CONFIRM_DATE |
| 22 | `POST /api/refunds/plan` | `amount, card, instant: YES\|NO\|UNKNOWN, city: YES\|NO\|UNKNOWN` | `{eligible, shortBy?, rows[{method, id, gross, refundKRW, net, diff, lowest, unknown, receiveTime, note, phrase{ko, en}}], baseline, saving}` | INVALID_AMOUNT |
| 23 | `POST /api/refunds/bve` | `group{startDate, amount, method}, bve{operator, number?, issuedOn, pablo, method, amount}` | `{bve, expectedKRW}` | INVALID_BVE, INVALID_BVE_DATE, INVALID_REFUND_AMOUNT |

**선환급일(`refundDate`, API 10 · 11 · 14)**: store는 요청 값을 무시하고 구매일을 쓴다. city는 필수이며, 없거나 구매일보다 앞서면 INVALID_REFUND_DATE. 공항 옵션은 쓰지 않는다.
**수동 거래 매칭(API 14)**: 이름 · 날짜가 같고 금액이 합산 금액 또는 (store면) 차감 후 금액인 purchase 거래를 갱신한다.

**오류 응답**
```json
{ "errors": [ { "field": "amount", "code": "INVALID_AMOUNT", "message": "금액은 0 이상이어야 합니다." } ] }
```
| HTTP | 경우 |
|---|---|
| 400 | 입력 검증 오류: INVALID_*, UNSUPPORTED_COUNTRY, BOARD_NOT_CONFIRMED, CURRENCY_MISMATCH, AMOUNT_*, MIXED_METHOD, INVALID_REFUND_DATE, INVALID_FILE / JSON 문법 오류는 INVALID_REQUEST(field null) |
| 409 | 상태 충돌: DUPLICATE_RECEIPT, DUPLICATE_EXPENSE, ALREADY_LINKED, REFUND_ALREADY_APPLIED |
| 502 | OCR_FAILED (Claude 호출 실패 · 30초 초과 · 응답 형식 오류) |
| 503 | OCR_UNAVAILABLE (`ANTHROPIC_API_KEY` 없음) |
| 500 | INTERNAL_ERROR (내부 정보 미포함) |

도메인은 첫 오류에서 멈추므로 `errors`는 항목 1개다. `field`는 INVALID_FILE이면 `"file"`, OCR_UNAVAILABLE · OCR_FAILED · INVALID_REQUEST · INTERNAL_ERROR면 `null`이다. 서버 업로드 한도 초과도 400 INVALID_FILE로 돌려준다. 예상하지 못한 오류는 500 INTERNAL_ERROR이며 예외 메시지 · 스택 같은 내부 정보는 응답에 넣지 않는다.

## 2.4 금액 타입과 반올림 규칙

| 대상 | 타입 | 규칙 |
|---|---|---|
| 원화 | `long` | 식 끝에서 한 번 `BigDecimal.setScale(0, HALF_UP).longValueExact()` |
| 외화 | `BigDecimal` scale 2 | 외화끼리 더하고 뺀 결과는 `setScale(2, HALF_UP)` |
| 환율 · 비율 | `BigDecimal` | 문자열 상수(`new BigDecimal("0.013")`), `double` 생성자 금지 |
| 예산 사용률 · 비율 | `BigDecimal` scale 1 | HALF_UP |
| 날짜 · 시각 | `LocalDate`, `ZonedDateTime(Asia/Seoul)` | 세관 기한은 `YearMonth`로 계산 |

- 중간값은 반올림하지 않는다. 예: R13은 `round(운영사수수료×환율×0.5 + 부족분×환율×0.002 + S)`를 한 번에 계산해 2,591.2 → 2,591.
- 수수료는 따로 반올림하지 않고 `비용 − 원금`(원금 = `round(금액×기준환율)`)으로 구한다.
- 나눗셈(R21 원화 → 외화, R43 · R44 비율)은 scale과 HALF_UP을 지정한다.
- 금액 범위(최대 1,000,000,000)를 먼저 확인한 뒤 `long`으로 바꾼다.
- `double`과 `float`은 서버 · 테스트 어디에서도 쓰지 않는다.

## 2.5 패키지 구조

```text
com.example.travelback
├── TravelBackApplication
├── common    Country, PaymentMethod, CardType, Money, ErrorCode, DomainException, DemoClock
├── trip      TripInfo, TripGuide
├── payment   PaymentCostCalculator
├── cash      CashInput, CashCandidateCalculator, CashCandidate, CashComparison,
│             CashTextParser, RateBoard, CardPaymentAlternative, QuickConverter, PlaceGuide
├── refund    Receipt, ReceiptRegistrar, ReceiptGroup, ReceiptGrouper, RefundOption,
│             RefundOptionPolicy, RefundDeadlines, RefundCombination,
│             CombinationCalculator, ExitRouteGuide, ReceiptDraft, ReceiptReader, ReceiptDraftMapper
├── ocr       ClaudeReceiptReader
├── ledger    Expense, ExpenseType, Category, ExpenseRecorder, CategorySuggester,
│             ReceiptLinker, LedgerSummaryCalculator, LedgerSummary, RefundRecord, LedgerReport
├── chat      ChatbotResponder
└── api       TripController, PaymentController, CashController, RefundController,
              LedgerController, ChatController, 요청 · 응답 record, ApiErrorResponse, ApiExceptionHandler
```

- 정적 화면: `src/main/resources/static/` (`index.html`, 4페이지, `js/api.js`, `js/storage.js`). 우선 목업(`dist/`의 `index.html` · `style.css` · `core.js` · `app.js`)을 복사해 쓰고 `dist/`는 고치지 않는다. 영수증 사진 인식은 별도 파일 `ocr.js`가 `/api/receipts/ocr`에 연결한다(R51). 환급 계산 · 목록 · 가계부는 백엔드 API가 생길 때까지 목업 JS로 동작한다.
- 테스트: `src/test/java` 아래 같은 패키지 구조. 도메인 테스트는 1장 예시표 행을 그대로 옮기고, API 테스트는 MockMvc로 상태 코드와 오류 형식을 확인한다.
- 서비스 · 저장소 계층은 두지 않고 컨트롤러가 도메인 객체를 바로 부른다.

# 3. 테스트 목록

- 예시표 한 행 = 테스트 하나. 한 행에 값이 둘("0 / 0.01")이면 한 테스트 안에서 둘 다 확인한다.
- 페이지별 절로 나누고, 각 담당자가 자기 절을 채운다. 번호는 절 안에서 이어 쓴다.

## 3.0 공통 (C1~C3, R8 · R9)

`common/MoneyTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T01 | 원화_15점8은_16원으로_반올림된다 | 15.8원 | 원화 반올림 | 16 | C1 |
| T02 | 원화_15점5는_16원으로_올림된다 | 15.5원 | 원화 반올림 | 16 | C1 |
| T03 | 원화_15점49는_15원으로_내림된다 | 15.49원 | 원화 반올림 | 15 | C1 |
| T04 | 외화_7점50105는_7점5가_된다 | €7.50105 | round2 | 7.50 | C2 |
| T05 | 외화_0점005는_0점01이_된다 | €0.005 | round2 | 0.01 | C2 |
| T06 | 외화_0점0049는_0이_된다 | €0.0049 | round2 | 0.00 | C2 |

`payment/PaymentCostCalculatorTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T07 | 결제비용_420유로_트래블카드는_663600원이다 | €420, travel, 1580 | 결제 비용 계산 | 663,600 | R8 |
| T08 | 결제비용_420유로_일반카드는_672227원이다 | €420, standard, 1580 | 결제 비용 계산 | 672,227 | R8 |
| T09 | 결제비용_420유로_현금은_676872원이다 | €420, cash, 1580 | 결제 비용 계산 | 676,872 | R8 |
| T10 | 결제비용_3000바트_트래블카드는_129000원이다 | ฿3000, travel, 43 | 결제 비용 계산 | 129,000 | R8 |
| T11 | 결제비용_0점01유로는_16원이다 | €0.01, travel, 1580 | 결제 비용 계산 | 16 | R8, C1 |
| T12 | 결제비용_0유로는_0원이다 | €0, travel, 1580 | 결제 비용 계산 | 0 | R9 |
| T13 | 결제비용_음수금액은_INVALID_AMOUNT다 | €−0.01, travel, 1580 | 결제 비용 계산 | INVALID_AMOUNT | R9 |
| T14 | 결제비용_환율0은_INVALID_RATE다 | €1, travel, 환율 0 | 결제 비용 계산 | INVALID_RATE | R9 |
| T15 | 결제비용_환율0점01이면_0원이다 | €1, travel, 0.01 | 결제 비용 계산 | 0 | R8 |

R9의 `"abc"` 행은 API 테스트 T86이 맡는다.

## 3.1 여행 정보 (1페이지)

담당자 작성 예정.

## 3.2 현금 확보 비교 (2페이지)

담당자 작성 예정.

## 3.3 택스 리펀드 (3페이지)

`refund/ReceiptRegistrarTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T16 | 영수증등록_프랑스면_등록된다 | 국가 FR, 정상 영수증 | 등록 | 등록된 영수증 | R23 |
| T17 | 영수증등록_일본이나_태국이면_UNSUPPORTED_COUNTRY다 | 국가 JP / TH | 등록 | UNSUPPORTED_COUNTRY | R23 |
| T18 | 영수증등록_공백만있는_매장명은_INVALID_STORE다 | 매장명 "   " | 등록 | INVALID_STORE | R24 |
| T19 | 영수증등록_매장명_80자는_허용되고_81자는_INVALID_STORE다 | 매장명 80자 / 81자 | 등록 | 등록 / INVALID_STORE | R24 |
| T20 | 영수증등록_금액0은_오류이고_0점01은_허용된다 | €0 / €0.01 | 등록 | INVALID_AMOUNT / 등록 | R24 |
| T21 | 영수증등록_금액100만은_허용되고_100만0점01은_오류다 | €1,000,000 / €1,000,000.01 | 등록 | 등록 / INVALID_AMOUNT | R24 |
| T22 | 영수증중복_앞뒤공백만_다르면_DUPLICATE_RECEIPT다 | 기존 "파리 백화점"/11-12/420 | " 파리 백화점 "/11-12/420 등록 | DUPLICATE_RECEIPT | R25 |
| T23 | 영수증중복_대소문자만_다르면_DUPLICATE_RECEIPT다 | 기존 "PARIS Store"/11-12/420 | "paris store"/11-12/420 등록 | DUPLICATE_RECEIPT | R25 |
| T24 | 영수증중복_금액이_다르면_등록된다 | 기존 "파리 백화점"/11-12/420 | 같은 매장 · 날짜, 420.01 등록 | 등록 | R25 |
| T25 | 영수증중복_구매일이_다르면_등록된다 | 기존 "파리 백화점"/11-12/420 | 같은 매장, 11-13, 420 등록 | 등록 | R25 |

`refund/ReceiptGrouperTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T110 | 합산_같은키_이틀이면_한묶음이고_수단이_섞이면_mixed다 | " 파리 백화점 " 11-12 60.1 travel + "파리 백화점" 11-13 50.2 cash | 합산 | 1묶음 110.3, 11-12~11-13, 2장, mixed, multiDay | R26 |
| T27 | 영수증합산_수단과_플래그가_모두_같으면_그대로_유지된다 | 같은 매장 · 날짜 2장, 둘 다 travel, 플래그 모두 T | 합산 | 1묶음, travel, 플래그 모두 T | R26 |
| T111 | 합산_3일째까지_한묶음이다 | 같은 키 11-12 + 11-14 | 합산 | 1묶음 | R26 |
| T112 | 합산_4일째는_새묶음이다 | 같은 키 11-12 + 11-15 | 합산 | 2묶음 | R26 |
| T113 | 합산_12_14_15일은_두묶음이다 | 같은 키 11-12 · 11-14 · 11-15 | 합산 | [11-12~11-14], [11-15] | R26 |
| T114 | 합산_같은VAT_다른매장명도_합친다 | VAT FR12345678901, "Galeries Haussmann" · "Galeries Rivoli" 11-12 | 합산 | 1묶음 | R26 |
| T115 | 합산_VAT유무가_다르면_합치지_않는다 | 같은 매장명, 한 장만 VAT | 합산 | 2묶음 | R26 |
| T108 | VAT번호_공백과_소문자를_정규화한다 | "fr 12 345678901" / 빈 값 | VAT 정규화 | FR12345678901 / 없음 | R24 |
| T109 | VAT번호_형식이_틀리면_INVALID_VAT다 | "FR12345" | VAT 정규화 | INVALID_VAT | R24 |

`refund/RefundOptionPolicyTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T116 | 환급옵션_100점01유로_자격참이면_생성되고_서류요청알림이_나온다 | FR, €100.01, 자격 T, BVE 없음 | 옵션 생성 | 옵션 있음, 사유 없음, 알림 있음 | R27 |
| T117 | 환급옵션_여러날_묶음은_여러날_안내를_덧붙인다 | €110.3, 11-12~11-13 | 옵션 생성 | 알림 + 여러 날 안내 | R27 |
| T118 | 환급옵션_100유로면_없고_100유로초과_사유가_나온다 | FR, €100, 자격 T | 옵션 생성 | 빈 목록, 사유 [€100 초과 확인] | R27 |
| T31 | 환급옵션_자격이_없으면_없고_자격_사유가_나온다 | €420, eligible F | 옵션 생성 | 빈 목록, 사유 [자격 확인] | R27 |
| T119 | 환급옵션_자격없고_20유로면_사유가_자격_100유로_순서다 | €20, eligible F | 옵션 생성 | 사유 [자격, €100] 순서 | R27 |
| T120 | 환급옵션_BVE가_있으면_알림이_없다 | €420, BVE 등록됨 | 옵션 생성 | 옵션 있음, 알림 없음 | R27 |
| T33 | 환급옵션_국가가_일본이면_없다 | 국가 JP, €420, 모두 T | 옵션 생성 | 빈 목록 | R27 |
| T34 | 환급옵션_420유로는_4종_환급액이_맞다 | €420, 모두 T | 옵션 생성 | card 50.4 · cash 41.1 · store 42 · city 44.2 | R29 |
| T35 | 환급옵션_100점01유로는_4종_환급액이_맞다 | €100.01, 모두 T | 옵션 생성 | card 12 · cash 7.5 · store 10 · city 9 | R29, C2 |
| T36 | 환급옵션_즉시와_시내를_지원하지_않으면_공항_2종만_나온다 | €420, instant F, city F | 옵션 생성 | airport-card, airport-cash | R29 |
| T37 | 환급옵션_1만유로도_공항현금을_포함한다 | €10,000, 모두 T | 옵션 생성 | airport-cash 1,047 포함 | R29 |

`refund/RefundDeadlinesTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T38 | 세관기한_11월12일_구매는_2월28일이다 | 구매 2026-11-12 | 세관 기한 계산 | 2027-02-28 | R28 |
| T39 | 세관기한_월말인_11월30일_구매도_2월28일이다 | 구매 2026-11-30 | 세관 기한 계산 | 2027-02-28 | R28 |
| T40 | 세관기한_12월1일_구매는_3월31일이다 | 구매 2026-12-01 | 세관 기한 계산 | 2027-03-31 | R28 |
| T41 | 세관기한_윤년이면_2월29일이다 | 구매 2027-11-12 | 세관 기한 계산 | 2028-02-29 | R28 |
| T42 | 반송기한_store는_구매일부터_21일_뒤다 | 구매 · 환급 2026-11-12 | 반송 · 실제 기한 계산 | 2026-12-03 / 2026-12-03 | R30 |
| T43 | 반송기한_city_11월14일_환급은_12월5일이다 | 구매 11-12, 환급 2026-11-14 | 반송 · 실제 기한 계산 | 2026-12-05 / 2026-12-05 | R30 |
| T44 | 반송기한_해를_넘기면_1월10일이다 | 구매 12-10, 환급 2026-12-20 | 반송 · 실제 기한 계산 | 2027-01-10 / 2027-01-10 | R30 |
| T45 | 실제기한_세관기한이_더_이르면_세관기한이다 | 구매 2026-11-30, 환급 2027-02-20 | 반송 · 실제 기한 계산 | 반송 2027-03-13, 실제 2027-02-28 | R30 |
| T46 | 선환급일이_구매일보다_앞서면_INVALID_REFUND_DATE다 | 구매 11-12, 환급 2026-11-11 | 반송 기한 계산 | INVALID_REFUND_DATE | R30 |

`refund/CombinationCalculatorTest` — Given은 모두 **€420 묶음, 환율 1,580, 자격 · 즉시 · 시내 T**(이하 "기본 묶음"), When은 **조합 계산**
| # | 메서드 | Given | Then (결제 원화 / 환급 원화 / 실지출액) | R |
|---|---|---|---|---|
| T47 | 조합_1위는_트래블_공항카드_584366원이다 | 기본 묶음 | 1위 travel · airport-card 663,600 / 79,234 / 584,366 | R31, R32 |
| T48 | 조합_2위는_일반_공항카드_592993원이다 | 기본 묶음 | 2위 672,227 / 79,234 / 592,993 | R31, R32 |
| T49 | 조합_3위는_트래블_시내_594113원이다 | 기본 묶음 | 3위 663,600 / 69,487 / 594,113 | R31, R32 |
| T50 | 조합_4위는_트래블_매장_597240원이다 | 기본 묶음 | 4위 663,600 / 66,360 / 597,240 | R31, R32 |
| T51 | 조합_5위는_현금_공항카드_597638원이다 | 기본 묶음 | 5위 676,872 / 79,234 / 597,638 | R31, R32 |
| T52 | 조합_6위는_트래블_공항현금_599961원이다 | 기본 묶음 | 6위 663,600 / 63,639 / 599,961 | R31, R32 |
| T53 | 조합_7위는_일반_시내_602740원이다 | 기본 묶음 | 7위 672,227 / 69,487 / 602,740 | R31, R32 |
| T54 | 조합_8위는_일반_매장_605004원이다 | 기본 묶음 | 8위 672,227 / 67,223 / 605,004 | R31, R32 |
| T55 | 조합_9위는_현금_시내_607385원이다 | 기본 묶음 | 9위 676,872 / 69,487 / 607,385 | R31, R32 |
| T56 | 조합_10위는_일반_공항현금_608588원이다 | 기본 묶음 | 10위 672,227 / 63,639 / 608,588 | R31, R32 |
| T57 | 조합_11위는_현금_매장_609185원이다 | 기본 묶음 | 11위 676,872 / 67,687 / 609,185 | R31, R32 |
| T58 | 조합_12위는_현금_공항현금_613233원이다 | 기본 묶음 | 12위 676,872 / 63,639 / 613,233 | R31, R32 |
| T59 | 조합_최고와_최저_차액은_28867원이다 | 기본 묶음 | spread 28,867 | R32 |
| T60 | 조합_시내를_지원하지_않으면_9행이다 | 기본 묶음, city F | 9행 | R31 |
| T61 | 조합_즉시와_시내를_모두_지원하지_않으면_6행이다 | 기본 묶음, instant F, city F | 6행 | R31 |
| T62 | 청구예상액_트래블_매장은_76314원이다 | 기본 묶음 | travel · store penaltyKRW 76,314 | R30 |
| T63 | 청구예상액_트래블_시내는_79910원이다 | 기본 묶음 | travel · city penaltyKRW 79,910 | R30 |
| T64 | 청구예상액_공항옵션은_0원이다 | 기본 묶음 | airport-card · airport-cash 행 penaltyKRW 0 | R30 |
| T122 | 조합_등록묶음_travel이면_travel_4행만_보인다 | 기본 묶음(travel), 등록 묶음 보기 | travel 4행, 1위 airport-card 584,366 | R32 |
| T123 | 조합_BVE가_있으면_확인된_1행만_보인다 | 기본 묶음, BVE airport-card €50.4 | 1행, 환급 원화 79,234, 확인됨 | R32, R52 |

`refund/BveRegistrarTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T124 | BVE_공항카드_50점4유로는_79234원이다 | €420 travel 묶음, airport-card €50.4 | 등록 | 예정 원화 79,234 | R52 |
| T125 | BVE_예정액_상한은_합계의_20나누기120이다 | €420 / €70 · €70.01, €110.3 / €18.38 · €18.39 | 등록 | 등록 · INVALID_REFUND_AMOUNT · 등록 · INVALID_REFUND_AMOUNT | R52 |
| T126 | BVE_발행일이_시작일보다_앞서면_INVALID_BVE_DATE다 | 시작 11-12, 발행 11-11 | 등록 | INVALID_BVE_DATE | R52 |
| T127 | BVE_사업자가_비면_INVALID_BVE다 | 사업자 "" | 등록 | INVALID_BVE | R52 |

`refund/RefundStatusPolicyTest` — Given 묶음은 **시작 2026-11-12, €420 travel, 세관 기한 2027-02-28**
| # | 메서드 | Given | When(오늘) | Then | R |
|---|---|---|---|---|---|
| T128 | 상태_BVE없으면_서류미발급이다 | BVE 없음 | 2026-11-20 | 서류 미발급 | R53 |
| T129 | 상태_BVE있고_미확인이면_세관확인필요다 | BVE airport-card 11-12 | 2026-11-20 | 세관 확인 필요 | R53 |
| T130 | 상태_기한지나고_미확인이면_기한만료다 | 같음 | 2027-03-01 | 기한 만료 | R53 |
| T131 | 상태_확인후_42일째는_환급대기이고_43일째는_입금지연이다 | 확인 2026-11-25 | 2027-01-06 / 2027-01-07 | 환급 대기 / 입금 지연 | R53 |
| T132 | 상태_발행6개월_지나면_처리기한지남을_덧붙인다 | 확인 2026-11-25 | 2027-05-13 | 입금 지연 + 처리 기한 지남 | R53 |
| T133 | 상태_수령기록이_있으면_완료다 | 확인 2026-11-25, 수령 기록 | 2027-01-20 | 완료 | R53 |
| T134 | 상태_매장선환급_반송기한지나면_기한만료와_청구예상액이다 | BVE store €42, 미확인 | 2026-12-04 | 기한 만료, 청구 예상 76,314 | R53, R30 |
| T135 | 상태_매장선환급_확인되면_완료다 | BVE store, 확인 2026-11-20 | 2026-11-30 | 완료 | R53 |
| T136 | 상태_확인일이_발행일보다_앞서거나_오늘보다_뒤면_INVALID_CONFIRM_DATE다 | 발행 11-12, 확인 11-11 / 확인 > 오늘 | 2026-11-30 | INVALID_CONFIRM_DATE | R55 |
| T148 | 상태_100유로_묶음은_해당없음이다 | €100 묶음 | 2026-11-20 | 해당 없음 | R53 |

`refund/PurchasePlannerTest` — 환율 1,580
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T147 | 구매전_행마다_최저대비_차이와_수령시점_편의메모가_나온다 | €420, travel, 즉시 · 시내 예 | 비교 | travel 행: airport-card 최저 · city +9,747 · store +12,874 · airport-cash +15,595, 수령 시점 · 메모 표대로 | R54 |
| T137 | 구매전_travel이면_최저가_같고_절약0원이다 | €420, travel, 즉시 예 · 시내 모름 | 비교 | 12행, 최저 travel airport-card 584,366, 절약 0, "지금 계획이 이미 최저예요" | R54 |
| T138 | 구매전_standard면_travel공항카드가_최저이고_8627원_절약이다 | €420, standard, 즉시 예 · 시내 아니오 | 비교 | 9행, 절약 8,627 | R54 |
| T139 | 구매전_카드없으면_현금기준_13272원_절약이다 | €420, none, 즉시 · 시내 아니오 | 비교 | 6행, 기본 597,638, 절약 13,272 | R54 |
| T140 | 구매전_모름_옵션은_현장확인필요로_표시되고_최저에서_빠진다 | €420, travel, 시내 모름 | 비교 | city 3행 unknown, lowest 아님 | R54 |
| T141 | 구매전_100유로_이하면_더살_금액을_알려준다 | €100 / €80 | 비교 | 대상 아님, shortBy 0.01 / 20.01 | R54 |
| T142 | 구매전_옵션마다_매장에서_할말이_나온다 | €420, travel, 모두 예 | 비교 | 4옵션 문구가 표대로 | R54 |

`ledger/ReceiptLinkerTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T65 | 가계부연결_공항카드는_새거래에_환급예정을_기록한다 | €420 travel 묶음, 거래 없음 | airport-card로 연결 | CREATED: 420 · 663,600 · 수수료 0 · 예정 79,234 · 실제 미기록 | R34 |
| T66 | 가계부연결_매장은_차감후_금액과_즉시차감을_기록한다 | €420 travel 묶음, 구매 11-12 | store로 연결 | 378 · 597,240 · 예정 0 · 실제 0 · 즉시 차감 66,360 · 반송 12-03 · 청구 76,314 | R34, R30 |
| T67 | 가계부연결_시내는_반송기한과_청구예상액을_기록한다 | €420 travel 묶음 | city, 환급일 11-14로 연결 | 420 · 663,600 · 예정 69,487 · 반송 12-05 · 청구 79,910 | R34, R30 |
| T68 | 가계부연결_매장_수동거래가_420유로면_그거래를_갱신한다 | 수동 거래 "파리 백화점"/11-12/€420 | store로 연결 | UPDATED, 금액 378 | R34 |
| T69 | 가계부연결_매장_수동거래가_378유로면_그거래를_갱신한다 | 수동 거래 "파리 백화점"/11-12/€378 | store로 연결 | UPDATED | R34 |
| T70 | 가계부연결_공항카드_수동거래가_378유로면_새거래를_만든다 | 수동 거래 "파리 백화점"/11-12/€378 | airport-card로 연결 | CREATED, 거래 2건 | R34 |
| T71 | 가계부연결_혼합수단_묶음은_MIXED_METHOD다 | method mixed 묶음 | 연결 | MIXED_METHOD | R34 |
| T72 | 가계부연결_두번째_연결은_ALREADY_LINKED다 | 이미 연결된 묶음 key | 다시 연결 | ALREADY_LINKED | R34 |
| T73 | 가계부연결_비교기록을_함께_저장한다 | €420 travel 묶음 | store로 연결 | comparison: 선택 597,240 · 최저 584,366 · store 597,240 · airport-card 584,366 | R34 |

`refund/ExitRouteGuideTest`
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T74 | 출국안내_프랑스_공항카드는_PABLO단말과_준비물을_안내한다 | 출국 FR, airport-card | 안내 생성 | "짐 부치기 전 PABLO 키오스크", 출국 전: 물건 · 여권 · 서류 | R36 |
| T143 | 출국안내_프랑스는_빨간화면이면_창구도장과_우편함투함을_안내한다 | 출국 FR, airport-card | 안내 생성 | atExit에 초록 화면 완료 · 빨간 화면 창구 도장 · 우편함 투함 · 보안검색은 그다음 | R36 |
| T75 | 출국안내_프랑스_매장은_카드보증과_반송기한_D데이를_안내한다 | 출국 FR, store, 환급 2026-11-12 | 안내 생성 | 매장: 카드 보증, 출국 전: 2026-12-03 D-day | R36, R30 |
| T76 | 출국안내_다른EU국가는_그나라_세관도장을_안내한다 | 출국 OTHER_EU, airport-card | 안내 생성 | 그 나라 세관 도장, 프랑스 자동 완료 아님, 6개월 | R36 |
| T77 | 출국안내_공항이_비면_샤를드골이_기본값이다 | 공항 "" | 안내 생성 | 공항 "파리 샤를드골 (CDG)" | R36 |

`api/RefundControllerTest`, `api/PaymentControllerTest` (MockMvc, 2.3)
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T80 | API_영수증등록_정상이면_200과_영수증을_돌려준다 | FR, 정상 영수증 | `POST /api/receipts` | 200, id 포함 | R23, 2.3 |
| T81 | API_영수증등록_일본이면_400_UNSUPPORTED_COUNTRY다 | JP | `POST /api/receipts` | 400, `errors[0].code` UNSUPPORTED_COUNTRY | R23, 2.3 |
| T82 | API_영수증등록_중복이면_409_DUPLICATE_RECEIPT다 | existing에 같은 영수증 | `POST /api/receipts` | 409, DUPLICATE_RECEIPT | R25, 2.3 |
| T83 | API_영수증묶음은_세관기한을_포함한다 | 11-12 영수증 1장 | `POST /api/receipts/groups` | customsDeadline 2027-02-28 | R26, R28 |
| T84 | API_환급분석_조건미충족이면_200과_빈목록과_사유다 | €100 묶음 | `POST /api/refunds/analysis` | 200, options [], reasons 1개 | R27 |
| T85 | API_환급분석_매장은_요청환급일_대신_구매일을_쓴다 | store 묶음(구매 11-12), refundDate 11-20 | `POST /api/refunds/analysis` | store earlyDeadline 2026-12-03 | R30, 2.3 |
| T86 | API_결제비용_숫자가아닌_금액은_400_INVALID_AMOUNT다 | amount "abc" | `POST /api/payments/cost` | 400, INVALID_AMOUNT | R9 |
| T87 | API_환급분석_시내_환급일이_없으면_400_INVALID_REFUND_DATE다 | city 묶음, refundDate 없음 | `POST /api/refunds/analysis` | 400, INVALID_REFUND_DATE | R30, 2.3 |
| T88 | API_가계부연결_이미연결이면_409_ALREADY_LINKED다 | linkedKeys에 그 묶음 | `POST /api/ledger/links` | 409, ALREADY_LINKED | R34 |
| T89 | API_잘못된_JSON은_400_INVALID_REQUEST다 | 본문 `{` | `POST /api/receipts` | 400, INVALID_REQUEST, field null | 2.3 |
| T90 | API_출국안내는_체크리스트_3단계를_돌려준다 | FR, store | `POST /api/refunds/exit-guide` | atStore · beforeDeparture · atExit 3개 | R36 |
| T144 | API_트래커는_묶음별_상태와_기한을_돌려준다 | 11-12 €420 travel 영수증 1장, BVE 없음, today 2026-11-20 | `POST /api/refunds/tracker` | 200, status 서류 미발급, customsDeadline 2027-02-28, alert 있음 | R26~R28, R53, 2.3 |
| T145 | API_구매전비교_금액0이면_400_INVALID_AMOUNT다 | amount 0 | `POST /api/refunds/plan` | 400, INVALID_AMOUNT | R54, 2.3 |
| T146 | API_BVE_상한초과면_400_INVALID_REFUND_AMOUNT다 | €420 묶음, 예정액 €70.01 | `POST /api/refunds/bve` | 400, INVALID_REFUND_AMOUNT | R52, 2.3 |

`refund/ReceiptDraftMapperTest`, `ocr/ClaudeReceiptReaderTest`, `api/ReceiptOcrControllerTest` — 실제 Claude는 부르지 않는다(가짜 `ReceiptReader` 사용)
| # | 메서드 | Given | When | Then | R |
|---|---|---|---|---|---|
| T91 | 사진인식_카드결제는_결제수단을_비운_초안이다 | 인식 결과 Galeries Paris · 2026-11-12 · 420.00 · card | 초안 변환 | Galeries Paris · 2026-11-12 · 420 · method 없음 | R51 |
| T92 | 사진인식_현금결제는_결제수단이_cash다 | 인식 결과 payment "cash" | 초안 변환 | method CASH | R51 |
| T93 | 사진인식_금액420점005는_420점01이다 | 인식 결과 amount 420.005 | 초안 변환 | 420.01 | R51, C2 |
| T94 | 사진인식_날짜를_못읽으면_구매일만_비운다 | 인식 결과 date null | 초안 변환 | date 없음, 나머지 채움 | R51 |
| T95 | 사진인식_PNG_10MB는_허용되고_1바이트넘으면_INVALID_FILE다 | PNG 10MB / 10MB + 1B | 파일 검증 | 통과 / INVALID_FILE | R51 |
| T96 | 사진인식_GIF나_PDF는_INVALID_FILE다 | image/gif / application/pdf | 파일 검증 | INVALID_FILE | R51 |
| T97 | 사진인식_API키가_없으면_OCR_UNAVAILABLE다 | `ANTHROPIC_API_KEY` 없음 | ClaudeReceiptReader 호출 | OCR_UNAVAILABLE | R51 |
| T98 | 사진인식_응답이_깨지거나_시간초과면_OCR_FAILED다 | 인식 결과 JSON 깨짐 / 시간 초과 | 초안 변환 | OCR_FAILED | R51 |
| T99 | API_영수증사진_인식하면_200과_초안을_돌려준다 | 가짜 ReceiptReader, PNG 1장 | `POST /api/receipts/ocr` | 200, store · date · amount | R51, 2.3 |
| T100 | API_영수증사진_GIF면_400_INVALID_FILE다 | GIF 파일 | `POST /api/receipts/ocr` | 400, `errors[0]` = {field "file", code INVALID_FILE} | R51, 2.3 |
| T101 | API_업로드한도를_넘으면_400_INVALID_FILE다 | 서버 업로드 한도 초과 예외 | 오류 처리기(`api/ApiExceptionHandlerTest`) | 400, INVALID_FILE | R51, 2.3 |
| T102 | API_API키가_없으면_503_OCR_UNAVAILABLE다 | 가짜 ReceiptReader가 OCR_UNAVAILABLE | `POST /api/receipts/ocr` | 503, field null | R51, 2.3 |
| T103 | API_인식에_실패하면_502_OCR_FAILED다 | 가짜 ReceiptReader가 시간 초과 예외 | `POST /api/receipts/ocr` | 502, field null | R51, 2.3 |
| T105 | 사진인식_성공하면_인식결과를_이력에_남긴다 | 초안 G7 · 2023-12-13 · 18.20, PNG 3B | `OcrHistoryRecorder` 저장 (H2) | 1행, result OK · store G7 · amount 18.20 · fileType image/png · fileSize 3 | R51 |
| T106 | 사진인식_실패하면_오류코드를_이력에_남긴다 | OCR_FAILED | `OcrHistoryRecorder` 저장 (H2) | 1행, result OCR_FAILED · store 없음 | R51 |
| T107 | API_영수증사진_인식하면_성공과_실패를_이력에_남긴다 | 가짜 ReceiptReader 성공 / OCR_FAILED | `POST /api/receipts/ocr` | 성공 기록 1번 / 실패 기록 1번, 응답은 200 / 502 그대로 | R51 |
| T104 | 정적화면_목업과_사진인식_스크립트를_제공한다 | 앱 실행 (`api/StaticPageTest`) | `GET /` | 200, 3페이지 화면 · `ocr.js` 포함, `GET /ocr.js` 200 | R51, 2.5 |

## 3.4 여행 가계부 (4페이지)

담당자 작성 예정.

## 3.5 챗봇

담당자 작성 예정.

## 3.6 백엔드 테스트에서 제외한 행

- R24 첨부 파일 행: 화면 미리보기 전용 → 화면 담당.
- R33 선택 저장 3행, R35 삭제 3행: 2.1에서 화면 상태 관리로 정함 → 화면 담당.

# 4. 작업 목록

- 위에서부터 하나씩 한다. 작업마다 적힌 테스트를 먼저 쓰고 실패를 확인한 뒤 코드를 쓰며, 괄호 안 테스트를 이어서 쓴다.
- 페이지별 절로 나누고, 각 담당자가 자기 절을 채운다.

## 4.0 공통

- [x] 0. Gradle 프로젝트 뼈대(Java 21, Spring Boot 4.1.2, Gradle Wrapper 8.14.3, web 스타터 이름 확인) — 먼저 쓸 테스트: `애플리케이션_컨텍스트가_뜬다` (이미 있으면 건너뜀)
- [ ] 1. `Money` 원화 반올림 — T01 `원화_15점8은_16원으로_반올림된다` (T02, T03)
- [ ] 2. `Money` 외화 round2 — T04 `외화_7점50105는_7점5가_된다` (T05, T06)
- [ ] 3. `ErrorCode` · `DomainException` · `PaymentMethod` 가산율 — T13 `결제비용_음수금액은_INVALID_AMOUNT다`
- [ ] 4. `PaymentCostCalculator` 계산 — T07 `결제비용_420유로_트래블카드는_663600원이다` (T08~T12, T14, T15)

## 4.1 여행 정보 (1페이지)

담당자 작성 예정.

## 4.2 현금 확보 비교 (2페이지)

담당자 작성 예정.

## 4.3 택스 리펀드 (3페이지)

- [x] 5. 영수증 국가 검증 — T17 `영수증등록_일본이나_태국이면_UNSUPPORTED_COUNTRY다` (T16)
- [ ] 6. 매장명 검증(공백 제거, 1~80자) — T18 `영수증등록_공백만있는_매장명은_INVALID_STORE다` (T19)
- [ ] 7. 영수증 금액 검증(€0.01~1,000,000) — T20 `영수증등록_금액0은_오류이고_0점01은_허용된다` (T21)
- [ ] 8. 정규화와 중복 검사 — T22 `영수증중복_앞뒤공백만_다르면_DUPLICATE_RECEIPT다` (T23~T25)
- [ ] ~~9. 같은 매장 · 같은 날 합산 — T27 `영수증합산_수단과_플래그가_모두_같으면_그대로_유지된다`~~ → 46~55로 대체
- [ ] ~~10. 합산 시 플래그 AND · mixed · 날짜 분리 — T26 `영수증합산_같은매장_같은날만_합치고_플래그와_수단을_합친다`~~ → 46~55로 대체
- [ ] ~~11. 옵션 생성 조건 — T28 `환급옵션_100점01유로_조건이_모두_참이면_생성된다` (T29, T33)~~ → 46~55로 대체
- [ ] ~~12. 미충족 사유 목록과 순서 — T30 `환급옵션_서류가_없으면_없고_서류_사유가_나온다` (T31, T32)~~ → 46~55로 대체
- [ ] ~~13. 옵션 4종 환급액 — T34 `환급옵션_420유로는_4종_환급액이_맞다` (T35, T37)~~ → 46~55로 대체
- [ ] ~~14. 즉시 · 시내 지원에 따른 포함 여부 — T36 `환급옵션_즉시와_시내를_지원하지_않으면_공항_2종만_나온다`~~ → 46~55로 대체
- [ ] ~~15. 세관 확인 기한 — T38 `세관기한_11월12일_구매는_2월28일이다` (T39~T41)~~ → 46~55로 대체
- [ ] ~~16. 반송 기한(+21일) — T42 `반송기한_store는_구매일부터_21일_뒤다` (T43, T44)~~ → 46~55로 대체
- [ ] ~~17. 실제 기한(둘 중 이른 날) — T45 `실제기한_세관기한이_더_이르면_세관기한이다`~~ → 46~55로 대체
- [ ] ~~18. 환급일 검증 — T46 `선환급일이_구매일보다_앞서면_INVALID_REFUND_DATE다`~~ → 46~55로 대체
- [ ] ~~19. 공항 · 시내 조합의 환급 원화와 실지출액 — T47 `조합_1위는_트래블_공항카드_584366원이다` (T48, T49, T51~T53, T55, T56, T58)~~ → 46~55로 대체
- [ ] ~~20. 매장(store) 조합: 결제 금액 차감 방식 — T50 `조합_4위는_트래블_매장_597240원이다` (T54, T57)~~ → 46~55로 대체
- [ ] ~~21. 정렬(동률이면 선환급 아닌 쪽 먼저)과 차액 — T59 `조합_최고와_최저_차액은_28867원이다`~~ → 46~55로 대체
- [ ] ~~22. 옵션 수에 따른 행 수 — T60 `조합_시내를_지원하지_않으면_9행이다` (T61)~~ → 46~55로 대체
- [ ] ~~23. 미이행 시 청구 예상액 — T62 `청구예상액_트래블_매장은_76314원이다` (T63, T64)~~ → 46~55로 대체
- [ ] 24. 공항카드 연결로 새 거래 만들기 (4페이지 담당과 `Expense` 형태 먼저 합의) — T65 `가계부연결_공항카드는_새거래에_환급예정을_기록한다`
- [ ] 25. 매장 연결(차감 후 금액 · 즉시 차감 · 기한) — T66 `가계부연결_매장은_차감후_금액과_즉시차감을_기록한다`
- [ ] 26. 시내 연결(반송 기한 · 청구 예상액) — T67 `가계부연결_시내는_반송기한과_청구예상액을_기록한다`
- [ ] 27. 수동 거래 매칭(합산 금액 또는 차감 후 금액) — T68 `가계부연결_매장_수동거래가_420유로면_그거래를_갱신한다` (T69, T70)
- [ ] 28. 연결 오류 — T71 `가계부연결_혼합수단_묶음은_MIXED_METHOD다` (T72)
- [ ] 29. 비교 기록 저장 — T73 `가계부연결_비교기록을_함께_저장한다`
- [ ] ~~30. 프랑스 출국 안내 — T74 `출국안내_프랑스_공항카드는_PABLO단말과_준비물을_안내한다` (T75)~~ → 46~55로 대체
- [ ] ~~31. 다른 EU 출국 안내와 공항 기본값 — T76 `출국안내_다른EU국가는_그나라_세관도장을_안내한다` (T77)~~ → 46~55로 대체
- [x] 32. 오류 응답 형식(`ApiExceptionHandler`, 400 · 409 · 502 · 503 · 500) — T100 `API_영수증사진_GIF면_400_INVALID_FILE다` (T101~T103)
- [ ] 33. `POST /api/receipts` — T80 `API_영수증등록_정상이면_200과_영수증을_돌려준다` (T81, T82, T89)
- [ ] ~~34. `POST /api/receipts/groups` — T83 `API_영수증묶음은_세관기한을_포함한다`~~ → 46~55로 대체
- [ ] ~~35. `POST /api/refunds/analysis` — T84 `API_환급분석_조건미충족이면_200과_빈목록과_사유다` (T85, T87)~~ → 46~55로 대체
- [ ] ~~36. `POST /api/refunds/exit-guide` — T90 `API_출국안내는_체크리스트_3단계를_돌려준다`~~ → 46~55로 대체
- [ ] 37. `POST /api/ledger/links` — T88 `API_가계부연결_이미연결이면_409_ALREADY_LINKED다`
- [ ] 38. `POST /api/payments/cost` (공통 담당이 따로 없을 때) — T86 `API_결제비용_숫자가아닌_금액은_400_INVALID_AMOUNT다`
- [x] 39. 사진 인식 초안 변환(결제 수단 · 반올림 · 빈 항목) — T91 `사진인식_카드결제는_결제수단을_비운_초안이다` (T92~T94)
- [x] 40. 사진 파일 검증(형식 · 10MB) — T95 `사진인식_PNG_10MB는_허용되고_1바이트넘으면_INVALID_FILE다` (T96)
- [x] 41. 인식 응답 오류 처리 — T98 `사진인식_응답이_깨지거나_시간초과면_OCR_FAILED다`
- [x] 42. Claude 어댑터(Spring AI ChatClient, 키 확인, 30초 제한) — T97 `사진인식_API키가_없으면_OCR_UNAVAILABLE다`
- [x] 43. `POST /api/receipts/ocr`(업로드 한도 10MB 설정 포함) — T99 `API_영수증사진_인식하면_200과_초안을_돌려준다`
- [x] 45. OCR 인식 이력 MySQL 저장(JPA, 테스트는 H2) — T105 `사진인식_성공하면_인식결과를_이력에_남긴다` (T106, T107)
- [x] 44. 목업 화면을 static으로 복사하고 영수증 사진 선택 시 OCR로 입력칸 채우기(`ocr.js`, 문구 2곳) — T104 `정적화면_목업과_사진인식_스크립트를_제공한다`
- [x] 46. VAT 번호 검증 — T109 `VAT번호_형식이_틀리면_INVALID_VAT다` (T108)
- [x] 47. VAT · 3일 합산 — T112 `합산_4일째는_새묶음이다` (T110, T111, T113~T115, T27)
- [x] 48. 옵션 조건 · 사유 · 서류 요청 알림과 옵션 4종 — T116 `환급옵션_100점01유로_자격참이면_생성되고_서류요청알림이_나온다` (T117~T120, T31, T33, T34~T37)
- [x] 49. 세관 · 반송 · 실제 기한 — T38 `세관기한_11월12일_구매는_2월28일이다` (T39~T46)
- [x] 50. 조합 · 정렬 · 차액 · 청구 예상액 · 보여 줄 행 — T47 `조합_1위는_트래블_공항카드_584366원이다` (T48~T64, T122, T123)
- [x] 51. BVE 등록 — T124 `BVE_공항카드_50점4유로는_79234원이다` (T125~T127)
- [x] 52. 환급 상태 판정 — T128 `상태_BVE없으면_서류미발급이다` (T129~T136, T148)
- [x] 53. 구매 전 비교 — T147 `구매전_행마다_최저대비_차이와_수령시점_편의메모가_나온다` (T137~T142)
- [x] 54. 출국 체크리스트 분기 — T143 `출국안내_프랑스는_빨간화면이면_창구도장과_우편함투함을_안내한다` (T74~T77)
- [x] 55. API 21 · 22 · 23 — T144 `API_트래커는_묶음별_상태와_기한을_돌려준다` (T145, T146)
- [x] 56. 화면: 구매 전 비교 카드 · BVE 등록 폼 · 상태 배지 · 세관 확인 버튼과 배너(R55) · 체크리스트 · 금액 표시 라벨 · 가계부 연결에 BVE 금액 — T104 `정적화면_목업과_사진인식_스크립트를_제공한다` 확장
- [ ] 57. (P1) 증빙 보관 R56 · BVE 사진 인식 R57
- [x] 58. React 3페이지 이식(구매 전 비교 · VAT · 3일 합산 · 환급 진행과 세관 확인 · BVE 등록 · 체크리스트 · 사진 인식 · 가계부 연결)과 Vite `/api` 프록시 — 확인: 헤드리스 브라우저 시나리오(Spring 화면 12개 항목 + 사진 인식 칸 채우기), 팀 기존 `npm test` 통과

## 4.4 여행 가계부 (4페이지)

담당자 작성 예정.

## 4.5 챗봇

담당자 작성 예정.
