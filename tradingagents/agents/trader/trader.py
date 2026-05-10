"""Trader: turns the Research Manager's investment plan into a concrete transaction proposal."""

from __future__ import annotations

import functools

from langchain_core.messages import AIMessage

from tradingagents.agents.schemas import TraderProposal, render_trader_proposal
from tradingagents.agents.utils.agent_utils import build_instrument_context
from tradingagents.agents.utils.structured import (
    bind_structured,
    invoke_structured_or_freetext,
)


def create_trader(llm):
    structured_llm = bind_structured(llm, TraderProposal, "Trader")

    def trader_node(state, name):
        company_name = state["company_of_interest"]
        instrument_context = build_instrument_context(company_name)
        investment_plan = state["investment_plan"]

        messages = [
            {
                "role": "system",
                "content": (
    "You are a professional trading strategist. "
    "Your job is to convert the Research Manager's investment plan into a concrete, risk-controlled trading proposal. "
    "The investment plan below is available and must be treated as the primary source. "
    "Do not say that no investment plan was provided. "
    "The final action must be consistent with the Research Manager's investment plan. "
    "If the investment plan says Buy, Overweight, Hold, Underweight, or Sell, your action must use the same rating unless you explicitly explain why you downgrade or upgrade it. "
    "Do not weaken Underweight or Sell into Hold without a clear reason. "
    "Do not strengthen Hold into Buy without a clear reason. "
    "Focus on market expectations, positioning, narrative strength, catalyst timing, consensus gap, and asymmetric risk/reward. "
    "Avoid generic advice and avoid textbook indicator summaries. "
    "You must clearly identify: what is priced in, what could surprise the market, the next catalyst, the invalidation signal, and the appropriate action."
),
            },
            {
                "role": "user",
                "content": (
    f"You are given a completed investment plan for {company_name}. {instrument_context}\n\n"
    f"IMPORTANT: The investment plan below is available and must be treated as the primary source. "
    f"Do not say that no investment plan was provided. "
    f"If the plan has weaknesses, analyze those weaknesses directly.\n\n"
    f"Investment Plan:\n{investment_plan}\n\n"
    f"Your task:\n"
    f"1. Convert this plan into a concrete trading proposal.\n"
    f"2. Identify what is already priced in.\n"
    f"3. Identify the next 1-8 week catalyst.\n"
    f"4. Define the invalidation condition.\n"
    f"5. Give a final action that is consistent with the investment plan rating: Buy / Overweight / Hold / Underweight / Sell.\n"
)
            },
        ]

        trader_plan = invoke_structured_or_freetext(
            structured_llm,
            llm,
            messages,
            render_trader_proposal,
            "Trader",
        )

        return {
            "messages": [AIMessage(content=trader_plan)],
            "trader_investment_plan": trader_plan,
            "sender": name,
        }

    return functools.partial(trader_node, name="Trader")
