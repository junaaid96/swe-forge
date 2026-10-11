# Product Management: Delivery, Metrics, Roadmaps and Stakeholders

Discovery decides *what* is worth building. Delivery turns it into working software in customers' hands, then measures whether it worked. This guide covers writing requirements that engineers love, agile delivery, product analytics and experimentation, roadmaps that don't lie, launches, and the stakeholder management that takes up a large share of a PM's week.

## 1. Requirements that create shared understanding

Long specifications rarely get read. Short, clear documents plus conversation work better.

### A one-page product brief (PRD-lite)

```markdown
# Proactive delay notifications

## Problem
Customers aren't told when orders run late; 42 "where is my order?" contacts per 1,000 orders
in Chattogram. Interviews: surprise is worse than the delay itself.

## Outcome / success metrics
- WISMO contacts per 1,000 orders: 42 → ≤ 25 (primary)
- 30-day repeat rate: +2 pts in test group
- Guardrail: notification opt-out rate < 2%; no increase in cancellations

## Users & scenarios
Customers with an active order whose ETA slips by more than 5 minutes.

## Scope (v1)
- Push + in-app banner when ETA slips > 5 min, with reason category and new ETA
- Max 2 delay notifications per order
Out of scope: SMS, compensation vouchers (v2 candidate)

## Open questions
- Reason accuracy: can we tell "restaurant busy" from "rider delayed"? (Eng spike, 2 days)

## Rollout
Feature flag → 10% Chattogram → A/B 2 weeks → decision
```

### User stories and acceptance criteria

```text
As a customer waiting for my order,
I want to be told promptly when it will be late and why,
so that I can plan and don't need to contact support.

Acceptance criteria:
- Given an active order whose predicted arrival moves more than 5 minutes later
  When the new ETA is calculated
  Then the customer receives one push notification within 60 seconds with the new time and a reason category
- Given a customer has already received 2 delay notifications for an order
  Then no further delay push is sent (the in-app banner still updates)
```

Good stories follow **INVEST**: independent, negotiable, valuable, estimable, small, testable. Slice **vertically** (a thin end-to-end piece of value) rather than by layer ("backend first, UI later").

## 2. Agile delivery

- **Scrum:** fixed sprints (1–2 weeks), sprint planning, daily stand-up, review (demo to stakeholders) and retrospective. Roles are product owner, scrum master and developers.
- **Kanban:** continuous flow with work-in-progress (WIP) limits, which suits teams with unpredictable incoming work (platform, support).
- Whatever the framework, the essentials are the same: **small batches, frequent releases, fast feedback, and working software as the measure of progress.**

The PM's role in delivery: keep the backlog ordered and refined (the next 1–2 sprints' stories ready), answer questions quickly, make scope trade-offs when reality hits ("the reason category is unreliable, so ship v1 without reasons and add them in v1.1"), and protect the team from random interruptions.

**Feature flags** separate *deploy* from *release*. Code ships to production switched off, then is enabled for internal users, a percentage of customers or a single city, which allows safe experiments and instant rollback.

## 3. Product analytics

### Instrumentation

Define events deliberately, with consistent names and properties, in a **tracking plan**:

| Event | Properties | Question it answers |
|---|---|---|
| `order_placed` | order_id, city, value, payment_method, is_scheduled | Conversion, AOV |
| `eta_delay_notified` | order_id, delay_min, reason, notification_index | Exposure to the feature |
| `support_contact_started` | order_id, topic | WISMO contacts |
| `notification_opened` | type, order_id | Engagement |

### Funnels, cohorts and retention

- **Funnels** show where users drop off (app open → restaurant view → add to cart → checkout → order placed).
- **Cohort retention** shows whether new customers keep ordering, and whether recent cohorts retain better than older ones (did the product improve?).
- **Segmentation** by city, platform, new vs returning and acquisition channel reveals where problems and opportunities concentrate.

```sql
-- WISMO contacts per 1,000 orders by experiment group
SELECT e.variant,
       count(DISTINCT o.order_id) AS orders,
       1000.0 * count(DISTINCT s.order_id) FILTER (WHERE s.topic = 'where_is_my_order')
              / count(DISTINCT o.order_id) AS wismo_per_1000
FROM experiment_assignments e
JOIN orders o ON o.customer_id = e.customer_id AND o.placed_at >= e.assigned_at
LEFT JOIN support_contacts s ON s.order_id = o.order_id
WHERE e.experiment = 'delay_notifications_v1'
GROUP BY e.variant;
```

### Experimentation

A/B tests establish causation. PM essentials: one primary metric plus guardrails chosen in advance, sample size from a power analysis, no stopping early because it "looks significant", sample-ratio checks, and novelty effects in mind. See the statistics guide for the details. Not everything needs an A/B test. Use one when the decision is reversible, the effect is uncertain and you have enough traffic.

## 4. Roadmaps that don't lie

Date-and-feature roadmaps promise certainty that doesn't exist, and they turn into broken commitments. **Outcome-based Now / Next / Later** roadmaps communicate direction honestly:

| Now (this quarter, committed problems) | Next (likely, being explored) | Later (directional) |
|---|---|---|
| **Reliable ETAs in Chattogram:** delay notifications, ETA ranges | **Faster reorder:** one-tap reorder, favourites | **Office lunch:** group ordering |
| **Payment success:** bKash retry flow | **Rider retention:** earnings transparency | **Subscriptions** (pending pricing test) |

Each item is a problem or outcome with a confidence level, not a fixed feature spec. Where real deadlines exist (a contract, a regulation, a seasonal event), state them explicitly and protect them.

## 5. Launching

A launch is more than flipping a flag:

- **Readiness:** support scripts and FAQs, a sales and marketing brief, legal or compliance review if needed, monitoring dashboards, a rollback plan.
- **Staged rollout:** internal users → 5% → 25% → 100%, watching the guardrail metrics and errors at each step.
- **Communicate:** release notes for customers in plain language, and internal announcements explaining *why* it matters.
- **Follow up:** review the metrics at 2 weeks and 6 weeks against the success criteria. Iterate, double down, or remove it. Removing features that didn't work is a sign of a healthy product culture.

## 6. Stakeholder management

PMs lead without authority, so influence comes from clarity, trust and evidence.

- **Map stakeholders** by influence and interest: manage closely (the CEO, head of operations), keep satisfied, keep informed, monitor.
- **Bring stakeholders into discovery,** not just the final presentation. People support what they help create.
- **Say no with reasons and alternatives:** "Not this quarter. It doesn't move our reliability goal, and here's the opportunity cost. Here's what we can do instead for the client, and when we'll revisit."
- **Communicate regularly:** a short weekly or bi-weekly update with progress on outcomes, learnings, decisions needed and risks.
- **Disagree and commit.** Debate openly with data, decide, then support the decision fully.

### Working with engineering

- Share the *why* and the outcome, and invite engineers into problem-solving. The best solutions often come from them.
- Respect technical health. Agree on a sustainable share of capacity for tech debt, reliability and platform work, and explain its business value.
- Don't change sprint scope casually, and make trade-offs explicit when you have to.

## 7. Real-world case: the roadmap that rebuilt trust

A PM inherited a roadmap with 23 features and dates. 70% of them had slipped the previous year, and sales had stopped believing any date. The PM replaced it with a Now/Next/Later outcome roadmap, ran a monthly review with sales and operations that showed metrics and learnings, and kept three hard commitments (a bank-integration deadline, the Eid campaign and a compliance change) delivered with buffers. Stakeholders gained more influence over *problems*, through monthly input sessions, and less over *specifications*. Within two quarters, sales leaders were quoting outcome metrics to clients instead of feature dates, and escalations to the CEO about priorities dropped to almost none.

## 8. Hands-on exercise

1. Write a one-page brief for a feature with problem, outcomes, guardrails, scope and out-of-scope, open questions and rollout.
2. Split it into 5 vertical user stories with acceptance criteria.
3. Write a tracking plan with 6 events and the questions they answer.
4. Convert a feature-and-date roadmap into a Now/Next/Later outcome roadmap.
5. Draft a respectful "no" to a stakeholder request with the reasoning and an alternative.

## 9. Checklist

- [ ] I write concise briefs and INVEST user stories with clear acceptance criteria, sliced vertically.
- [ ] I support agile delivery: backlog refinement, scope trade-offs and feature flags.
- [ ] I instrument products with a tracking plan and use funnels, cohorts, segments and A/B tests.
- [ ] I build outcome-based Now/Next/Later roadmaps and run staged launches with follow-up reviews.
- [ ] I manage stakeholders through mapping, inclusion, regular communication and well-reasoned "no"s.

## 10. Interview angle

> **Asked as:** "Your feature launched but the metric didn't move. What now?"

Check the instrumentation and exposure (did users actually see it?), segment the results, review the qualitative feedback, and revisit the assumption that linked the feature to the outcome. Then iterate, try another solution for the same opportunity, or remove the feature, and share what was learned.

> **Asked as:** "How do you handle conflicting stakeholder priorities?"

Bring them back to the shared goals and strategy, quantify the options (impact, cost, cost of delay), make the trade-offs visible, decide or escalate with a clear recommendation, and communicate the reasoning, including what we won't do and when we'll revisit it.
