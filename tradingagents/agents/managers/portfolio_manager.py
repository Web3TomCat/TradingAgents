"""Portfolio Manager: synthesises the risk-analyst debate into the final decision.

Uses LangChain's ``with_structured_output`` so the LLM produces a typed
``PortfolioDecision`` directly, in a single call.  The result is rendered
back to markdown for storage in ``final_trade_decision`` so memory log,
CLI display, and saved reports continue to consume the same shape they do
today.  When a provider does not expose structured output, the agent falls
back gracefully to free-text generation.
"""

from __future__ import annotations

from tradingagents.agents.schemas import PortfolioDecision, render_pm_decision
from tradingagents.agents.utils.agent_utils import (
    build_instrument_context,
    get_language_instruction,
)
from tradingagents.agents.utils.structured import (
    bind_structured,
    invoke_structured_or_freetext,
)


def create_portfolio_manager(llm):
    structured_llm = bind_structured(llm, PortfolioDecision, "Portfolio Manager")

    def portfolio_manager_node(state) -> dict:
        instrument_context = build_instrument_context(state["company_of_interest"])

        history = state["risk_debate_state"]["history"]
        risk_debate_state = state["risk_debate_state"]
        research_plan = state["investment_plan"]
        trader_plan = state["trader_investment_plan"]

        past_context = state.get("past_context", "")
        lessons_line = (
            f"- Lessons from prior decisions and outcomes:\n{past_context}\n"
            if past_context
            else ""
        )

        prompt = f"""
        Statistical integrity rule:
Do not cite statistical probabilities, historical win rates, backtest results, or phrases like "90% of cases" unless those numbers are explicitly provided in the input data.
If you are making a qualitative judgment, label it as qualitative judgment, not as a quantified statistic.
Do not invent empirical probabilities.
Use qualitative language such as "elevated risk", "material risk", "low confidence", or "high uncertainty" instead of fabricated percentages.

You are the Portfolio Manager. Your job is to synthesize the full debate and make the final trading decision.

Think like a professional portfolio manager managing real capital.

Do not simply average the bull and bear arguments. Decide which side has better evidence, better timing, and better risk/reward.

{instrument_context}

---

## Rating Scale
Use exactly one:

- Buy: Strong conviction to enter or add now
- Overweight: Favorable setup, increase exposure gradually
- Hold: No clear edge, maintain current position or wait
- Underweight: Reduce exposure or take partial profits
- Sell: Exit, avoid, or consider short exposure

---

## Required Decision Framework

You must address:

1. What is the market currently pricing in?
2. Is there a meaningful consensus gap?
3. Is the dominant narrative strengthening or weakening?
4. What are the next 1–8 week catalysts?
5. What is the asymmetric risk/reward?
6. What would invalidate the decision?
7. What position sizing or risk posture is appropriate?

---

## Context

Research Manager's investment plan:
{research_plan}

Trader's transaction proposal:
{trader_plan}

{lessons_line}

Risk Analysts Debate History:
{history}

---

## Output Requirements

Be decisive. Avoid generic language.

Your final answer must include:

## Final Rating
Choose one from: Buy / Overweight / Hold / Underweight / Sell

## Core Reason
One concise paragraph explaining the decision.

## Market Expectations
Explain what is likely priced in.

## Variant View
Explain the key expectation gap, if any.

## Catalysts
List the most important near-term catalysts.

## Risk/Reward
Explain upside, downside, and asymmetry.

## Invalidation
State what would prove this decision wrong.

## Positioning Guidance
Explain whether to enter now, wait, add gradually, reduce, or avoid.

{get_language_instruction()}
"""

        final_trade_decision = invoke_structured_or_freetext(
            structured_llm,
            llm,
            prompt,
            render_pm_decision,
            "Portfolio Manager",
        )

        new_risk_debate_state = {
            "judge_decision": final_trade_decision,
            "history": risk_debate_state["history"],
            "aggressive_history": risk_debate_state["aggressive_history"],
            "conservative_history": risk_debate_state["conservative_history"],
            "neutral_history": risk_debate_state["neutral_history"],
            "latest_speaker": "Judge",
            "current_aggressive_response": risk_debate_state["current_aggressive_response"],
            "current_conservative_response": risk_debate_state["current_conservative_response"],
            "current_neutral_response": risk_debate_state["current_neutral_response"],
            "count": risk_debate_state["count"],
        }

        return {
            "risk_debate_state": new_risk_debate_state,
            "final_trade_decision": final_trade_decision,
        }

    return portfolio_manager_node
