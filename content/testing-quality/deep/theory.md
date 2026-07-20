---
id: testing-quality-deep-theory
track: theory
---

# Testing & Quality — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Testing

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Testing Pyramid

Unit Tests (~70%, base): test ONE class in isolation. Mock all dependencies. No Spring context, no DB.
Fast (<100ms each). Run on every save. Foundation.

Integration Tests (~20%, middle): test components working together (Service + DB, Controller + Service).
Slower (needs Spring context or embedded DB). Run before push / in CI.

E2E Tests (~10%, top): full system through API or UI. Slowest, most fragile, most realistic.
Run in CI on PR merge.

Anti-pattern — Ice Cream Cone (inverted pyramid): too many E2E, too few unit.
→ Slow feedback loop (30min CI), fragile tests, expensive maintenance.

Goal: fast feedback. Developers skip slow tests. Fast tests get run.

### JUnit 5 Essentials

Lifecycle: @BeforeEach → @Test → @AfterEach per method. @BeforeAll / @AfterAll once per class (must be static).

Core assertions:
assertEquals(expected, actual)
assertThrows(Exception.class, () -> method()) — test that exception IS thrown
assertAll("group", () -> assert1, () -> assert2) — ALL assertions run, collect ALL failures
assertNotNull / assertTrue / assertFalse / assertIterableEquals

Parameterized tests:
@ParameterizedTest + @CsvSource({"0,false", "1,true", "-1,false"}) — multiple inputs, one test method
@MethodSource("provideTestData") — method returns Stream<Arguments>

Organization: @DisplayName("human readable"), @Nested for grouping, @Disabled for skipping.

### Mockito — Isolation

@Mock: creates mock object. All methods return null/0/false by default.
@InjectMocks: creates class under test + injects @Mock fields automatically.
@Spy: partial mock — real implementation, stub specific methods + verify calls.
@Captor: capture arguments passed to mock for assertion.

Stubbing:
when(mock.method(any())).thenReturn(value)
when(mock.method(arg)).thenThrow(new RuntimeException())
doReturn(value).when(spy).method()  — use for spies (avoids calling real method)

Verification:
verify(mock).method(arg)              — called exactly once
verify(mock, times(2)).method(any())  — called exactly N times
verify(mock, never()).method(any())   — never called
verifyNoInteractions(mock)            — no methods called at all on this mock

### Spring Boot Test Slices

@SpringBootTest: loads full application context. Full-stack integration tests. Slowest.
@WebMvcTest(Controller.class): only web layer. Use MockMvc. Fast controller tests.
@DataJpaTest: only JPA layer + H2 in-memory. Fast repository/query tests.
Testcontainers: real PostgreSQL/Redis in Docker. Slower but authentic.

@Transactional on test class: DB changes rollback after each test — clean slate.
@Sql("/seed.sql"): run SQL scripts before/after test method.
@MockBean: replace Spring bean with Mockito mock (use in @WebMvcTest).

TDD — Red-Green-Refactor:
1. Write failing test (RED) — defines behavior before code
2. Minimum code to pass (GREEN) — just enough to pass
3. Refactor (REFACTOR) — clean up without breaking tests
Benefit: forces design thinking first. Tests become the living specification.

### From testing to TDD

The test pyramid tells you where tests live. TDD tells you when to write them — before the code, in a red→green→refactor loop.
Use TDD for domain rules; keep slice/integration tests for Spring wiring. See the TDD topic for the full practice cycle and legacy characterization techniques.

### Practical code

```
// Complete test suite for OrderService

// ── UNIT TEST (JUnit 5 + Mockito) ─────────────────────────
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private NotificationService notificationService;
    @InjectMocks private OrderService orderService; // mocks auto-injected

    @Test
    @DisplayName("Should persist order and send notification on success")
    void createOrder_ValidRequest_ShouldPersistAndNotify() {
        // Arrange
        var req = new CreateOrderRequest(1L, new BigDecimal("50.00"));
        var saved = Order.builder().id(100L).amount(new BigDecimal("50.00")).build();
        when(orderRepository.save(any(Order.class))).thenReturn(saved);

        // Act
        OrderDTO result = orderService.createOrder(req, "user@test.com");

        // Assert — assertAll runs ALL checks even if one fails
        assertAll("order creation",
            () -> assertNotNull(result),
            () -> assertEquals(100L, result.getId()),
            () -> assertEquals(new BigDecimal("50.00"), result.getAmount())
        );
        verify(orderRepository, times(1)).save(any(Order.class));
        verify(notificationService).notify(contains("100"));
    }

    @Test
    @DisplayName("Should throw and NOT call DB when amount is zero or negative")
    void createOrder_NegativeAmount_ShouldThrowWithoutPersisting() {
        var req = new CreateOrderRequest(1L, BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class,
            () -> orderService.createOrder(req, "user@test.com"));
        verifyNoInteractions(orderRepository); // DB must NOT be called on invalid input
    }

    @ParameterizedTest
    @CsvSource({"0.00,false", "0.01,true", "999.99,true", "-1.00,false"})
    void isValidAmount(BigDecimal amount, boolean expected) {
        assertEquals(expected, orderService.isValidAmount(amount));
    }
}

// ── CONTROLLER TEST (@WebMvcTest — web layer only) ────────
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean  OrderService orderService;

    @Test
    void createOrder_ValidRequest_Returns201WithLocation() throws Exception {
        var order = new OrderDTO(1L, new BigDecimal("50.00"), OrderStatus.PENDING);
        when(orderService.create(any(), any())).thenReturn(order);

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"userId":1,"amount":"50.00"}"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(header().exists("Location"));
    }
}
```

### Tips

- Test BEHAVIOR not implementation. Tests that know too much about internals (e.g., verify every internal method call) break on refactoring.
- @DataJpaTest is MUCH faster than @SpringBootTest for repository tests — loads only the JPA layer with H2. Use it aggressively.
- Test naming pattern: methodName_Condition_ExpectedBehavior. E.g.: createOrder_WhenAmountNegative_ShouldThrowAndNotPersist
- verifyNoInteractions(db) is powerful: assert that a validation failure never touches the database — confirms your business logic isolation
