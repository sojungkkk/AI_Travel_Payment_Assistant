package com.example.travelback.refund;

/** 검증 · 정규화한 BVE와 예정 원화 (R52). */
public record RegisteredBve(Bve bve, long expectedKRW) {
}
