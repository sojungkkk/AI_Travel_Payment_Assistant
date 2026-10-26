# SPEC.md — 이체 수수료 (다온뱅크, 가상)

## 1. 요구사항
- R1. 받는 계좌가 같은 은행이면, 시스템은 수수료 0원을 돌려준다.
- R2. 받는 계좌가 다른 은행이면, 시스템은 수수료 500원을 돌려준다.
- R3. 이체 금액이 0원 이하이면, 시스템은 INVALID_AMOUNT 오류를 던진다.
- R4. 이체 금액이 5,000,000원을 넘으면, 시스템은 LIMIT_PER_TX 오류를 던진다.

## 2. 계약
- 함수: transferFee(amount, sameBank) → 수수료(원, 정수)
- amount: 원 단위 정수 / sameBank: true 또는 false
- 오류: Error를 던지고, message가 오류 코드다.

## 3. 예시표
| amount | sameBank | 결과 |
|---|---|---|
| 10000 | true | 0 |
| 10000 | false | 500 |
| 5000000 | false | 500 (한도와 같은 금액) |
| 5000001 | false | LIMIT_PER_TX 오류 |
| 0 | true | INVALID_AMOUNT 오류 |
| -1000 | false | INVALID_AMOUNT 오류 |
