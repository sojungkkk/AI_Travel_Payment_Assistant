package com.example.travelback.api;

import com.example.travelback.common.CardType;
import com.example.travelback.common.Country;
import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import com.example.travelback.refund.Bve;
import com.example.travelback.refund.BveRegistrar;
import com.example.travelback.refund.CombinationCalculator;
import com.example.travelback.refund.PlanRow;
import com.example.travelback.refund.PurchasePlan;
import com.example.travelback.refund.PurchasePlanner;
import com.example.travelback.refund.Receipt;
import com.example.travelback.refund.ReceiptGroup;
import com.example.travelback.refund.ReceiptGrouper;
import com.example.travelback.refund.RefundAnalysis;
import com.example.travelback.refund.RefundCombination;
import com.example.travelback.refund.RefundDeadlines;
import com.example.travelback.refund.RefundOptionId;
import com.example.travelback.refund.RefundOptionPolicy;
import com.example.travelback.refund.RefundStatusPolicy;
import com.example.travelback.refund.RefundStatusResult;
import com.example.travelback.refund.RegisteredBve;
import com.example.travelback.refund.Support;
import com.example.travelback.refund.VatNumber;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 3페이지 택스 리펀드 계산 API 21 · 22 · 23 (2.3). 상태가 없고, 화면이 저장한 값을 요청에 함께 보낸다. */
@RestController
public class RefundApiController {

    private static final Country COUNTRY = Country.FR;
    private static final String ESTIMATE = "추정";
    private static final String CONFIRMED = "확인됨";

    private final ReceiptGrouper grouper = new ReceiptGrouper();
    private final RefundOptionPolicy policy = new RefundOptionPolicy();
    private final CombinationCalculator calculator = new CombinationCalculator();
    private final RefundDeadlines deadlines = new RefundDeadlines();
    private final RefundStatusPolicy statusPolicy = new RefundStatusPolicy();
    private final BveRegistrar bveRegistrar = new BveRegistrar();
    private final PurchasePlanner planner = new PurchasePlanner();

    /** 영수증 묶음별 옵션 · 알림 · 기한 · 상태 · 보여 줄 조합 행 (API 21: R26~R28, R32, R52, R53) */
    @PostMapping("/api/refunds/tracker")
    public List<GroupView> tracker(@RequestBody TrackerRequest request) {
        List<ReceiptInput> inputs = request.receipts() == null ? List.of() : request.receipts();
        List<Receipt> receipts = inputs.stream().map(ReceiptInput::toReceipt).toList();
        Map<String, BveInput> bves = request.bves() == null ? Map.of() : request.bves();
        Map<String, LocalDate> confirmations = request.confirmations() == null ? Map.of() : request.confirmations();
        List<String> received = request.received() == null ? List.of() : request.received();
        LocalDate today = request.today() == null ? LocalDate.now(ZoneId.of("Asia/Seoul")) : request.today();
        BigDecimal rate = COUNTRY.baseRate();

        return grouper.group(receipts).stream().map(g -> {
            BveInput bveInput = bves.get(g.key());
            Bve bve = bveInput == null ? null : bveInput.toBve();
            RefundAnalysis analysis = policy.analyze(COUNTRY, g, bve != null);
            long bveKRW = bve == null ? 0
                    : bveRegistrar.expectedKRW(g.amount(), g.method(), bve.method(), bve.amount(), rate);
            RefundStatusResult status = statusPolicy.evaluate(g, !analysis.options().isEmpty(), bve, bveKRW,
                    confirmations.get(g.key()), received.contains(g.key()), today);
            List<RowView> rows = bve != null
                    ? List.of(RowView.of(calculator.confirmed(g.amount(), paymentOrTravel(g), bve.method(), bveKRW, rate), CONFIRMED))
                    : calculator.visible(g.method(), calculator.combine(g.amount(), analysis.options(), rate))
                            .stream().map(c -> RowView.of(c, ESTIMATE)).toList();
            List<String> ids = g.receiptIndexes().stream().map(i -> inputs.get(i).id()).toList();
            return new GroupView(g.key(), g.store(), g.vatNumber(), g.startDate(), g.endDate(), g.amount(), ids,
                    g.eligible(), g.instant(), g.city(), methodName(g.method()), g.multiDay(),
                    deadlines.customs(g.startDate()), status.effectiveDeadline(),
                    analysis.options().stream().map(o -> new OptionView(o.id().code(), o.refund(), o.id().early())).toList(),
                    analysis.reasons(), analysis.alert(), analysis.multiDayNote(),
                    status.status().name(), status.status().label(), status.note(), status.penaltyKRW(),
                    bve == null ? null : bveKRW, bve == null ? null : bve.method().code(),
                    rows, g.mixed() && bve == null && !rows.isEmpty() ? "결제 수단이 섞여 있어요" : null);
        }).toList();
    }

    /** 구매 전 비교 (API 22: R54) */
    @PostMapping("/api/refunds/plan")
    public PlanView plan(@RequestBody PlanRequest request) {
        PurchasePlan plan = planner.plan(request.amount(), card(request.card()), support(request.instant()),
                support(request.city()), COUNTRY.baseRate());
        return new PlanView(plan.eligible(), plan.shortBy(), plan.rows().stream().map(PlanRowView::of).toList(),
                plan.baseline() == null ? null : PlanRowView.of(plan.baseline()), plan.saving(), plan.savingMessage());
    }

    /** BVE 검증 · 예정 원화 (API 23: R52) */
    @PostMapping("/api/refunds/bve")
    public BveView bve(@RequestBody BveRequest request) {
        GroupInput group = request.group();
        if (group == null || group.startDate() == null || group.amount() == null || request.bve() == null) {
            throw new DomainException(ErrorCode.INVALID_BVE);
        }
        RegisteredBve registered = bveRegistrar.register(group.startDate(), group.amount(), paymentMethod(group.method()),
                request.bve().toBve(), COUNTRY.baseRate());
        Bve bve = registered.bve();
        return new BveView(new BveInput(bve.operator(), bve.number(), bve.issuedOn(), bve.pablo(),
                bve.method().code(), bve.amount()), registered.expectedKRW());
    }

    private static PaymentMethod paymentOrTravel(ReceiptGroup g) {
        return g.method() == null ? PaymentMethod.TRAVEL : g.method();
    }

    private static String methodName(PaymentMethod method) {
        return method == null ? "mixed" : method.name().toLowerCase(Locale.ROOT);
    }

    /** "travel" · "standard" · "cash"를 결제 수단으로, "mixed" · 빈 값은 null로 읽는다. */
    private static PaymentMethod paymentMethod(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("mixed")) {
            return null;
        }
        try {
            return PaymentMethod.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_REQUEST);
        }
    }

    private static CardType card(String value) {
        try {
            return value == null ? CardType.NONE : CardType.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_CARD);
        }
    }

    private static Support support(String value) {
        try {
            return value == null ? Support.UNKNOWN : Support.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_REQUEST);
        }
    }

    public record TrackerRequest(List<ReceiptInput> receipts, Map<String, BveInput> bves,
            Map<String, LocalDate> confirmations, List<String> received, LocalDate today) {
    }

    public record ReceiptInput(String id, String store, LocalDate date, BigDecimal amount, String method,
            String vatNumber, boolean eligible, boolean instant, boolean city) {

        Receipt toReceipt() {
            if (store == null || date == null || amount == null) {
                throw new DomainException(ErrorCode.INVALID_REQUEST);
            }
            return new Receipt(store, date, amount, paymentMethod(method), VatNumber.normalize(vatNumber),
                    eligible, instant, city);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record BveInput(String operator, String number, LocalDate issuedOn, Boolean pablo, String method,
            BigDecimal amount) {

        Bve toBve() {
            return new Bve(operator, number, issuedOn, pablo == null || pablo, RefundOptionId.fromCode(method), amount);
        }
    }

    public record GroupInput(LocalDate startDate, BigDecimal amount, String method) {
    }

    public record BveRequest(GroupInput group, BveInput bve) {
    }

    public record BveView(BveInput bve, long expectedKRW) {
    }

    public record PlanRequest(BigDecimal amount, String card, String instant, String city) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PlanView(boolean eligible, BigDecimal shortBy, List<PlanRowView> rows, PlanRowView baseline,
            long saving, String savingMessage) {
    }

    public record Phrase(String ko, String en) {
    }

    public record PlanRowView(String method, String id, long gross, long refundKRW, long net, long diff,
            boolean lowest, boolean unknown, String receiveTime, String note, Phrase phrase) {

        static PlanRowView of(PlanRow r) {
            RefundOptionId o = r.option();
            return new PlanRowView(methodName(r.method()), o.code(), r.gross(), r.refundKRW(), r.net(), r.diff(),
                    r.lowest(), r.unknown(), o.receiveTime(), o.note(), new Phrase(o.phraseKo(), o.phraseEn()));
        }
    }

    public record OptionView(String id, BigDecimal refund, boolean early) {
    }

    public record RowView(String method, String id, long gross, long refundKRW, long net, long penaltyKRW,
            String label, String receiveTime, String note) {

        static RowView of(RefundCombination c, String label) {
            return new RowView(methodName(c.method()), c.option().code(), c.gross(), c.refundKRW(), c.net(),
                    c.penaltyKRW(), label, c.option().receiveTime(), c.option().note());
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record GroupView(String key, String store, String vatNumber, LocalDate startDate, LocalDate endDate,
            BigDecimal amount, List<String> ids, boolean eligible, boolean instant, boolean city, String method,
            boolean multiDay, LocalDate customsDeadline, LocalDate effectiveDeadline, List<OptionView> options,
            List<String> reasons, String alert, String multiDayNote, String status, String statusLabel,
            String statusNote, long penaltyKRW, Long bveKRW, String bveMethod, List<RowView> rows, String rowsNote) {
    }
}
